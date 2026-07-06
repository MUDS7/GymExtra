const cloud = require("wx-server-sdk");
const crypto = require("crypto");

const db = cloud.database();
const COLLECTION = "trainings";

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时继续写入。
  }
}

function createUuid() {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseTimerSeconds(value) {
  const timer = String(value || "00:00").trim();
  const parts = timer.split(":").map(Number);

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
  }

  const minutes = Number(timer);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes * 60)) : 0;
}

function normalizeSet(set, index) {
  return {
    order: index + 1,
    weight: toOptionalNumber(set && set.weight),
    reps: toOptionalNumber(set && set.reps),
    completed: Boolean(set && set.completed)
  };
}

function normalizeAction(action, index) {
  const categoryId = String((action && action.categoryId) || "").slice(0, 50);
  const durationValue = toOptionalNumber(action && action.durationMinutes);
  const durationMinutes = categoryId === "cardio" && durationValue !== null
    ? Math.min(1439, Math.max(0, Math.floor(durationValue)))
    : null;
  const sets = Array.isArray(action && action.sets)
    ? action.sets.slice(0, 100).map(normalizeSet)
    : [];
  const plannedVolume = sets.reduce(
    (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
    0
  );
  const completedVolume = sets.reduce(
    (sum, set) => sum + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0),
    0
  );

  return {
    actionId: action && action.id !== undefined ? action.id : null,
    categoryId,
    durationMinutes,
    name: String((action && action.name) || "未命名动作").trim().slice(0, 100),
    iconPath: String((action && action.iconPath) || "").slice(0, 500),
    order: index + 1,
    setsCount: sets.length,
    completedSets: sets.filter((set) => set.completed).length,
    plannedVolume,
    completedVolume,
    sets
  };
}

function getCategoryPresentation(categoryId) {
  const categories = {
    cardio: { name: "有氧", tagClass: "blue" },
    stretch: { name: "拉伸", tagClass: "purple" },
    strength: { name: "力量", tagClass: "orange" }
  };
  return categories[categoryId] || { name: "训练", tagClass: "orange" };
}

async function publishGroupActivity(training) {
  if (!training.groupId || !training.sharedToGroup) return;

  try {
    await db.createCollection("group_daily_activities");
  } catch (error) {
    // 集合已经存在时继续写入。
  }

  let profile = null;
  try {
    profile = (await db.collection("users").doc(training.userId).get()).data;
  } catch (error) {
    // 用户资料缺失时仍可发布训练，页面显示默认昵称。
  }

  const primaryCategory = training.categoryIds[0] || "";
  const category = getCategoryPresentation(primaryCategory);
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  await db.collection("group_daily_activities").doc(training.uuid).set({
    data: {
      groupId: training.groupId,
      userId: training.userId,
      activityDate: now,
      activityDateKey: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      displayOrder: 0,
      profileSnapshot: {
        nickname: profile && profile.nickname ? profile.nickname : "群成员",
        avatarUrl: profile && profile.avatarUrl ? profile.avatarUrl : ""
      },
      trainingId: training.uuid,
      trainingTitle: training.title,
      durationMinutes: training.durationMinutes,
      categoryId: primaryCategory,
      categoryName: category.name,
      tagClass: category.tagClass,
      checkInStatus: "done",
      stateText: "已完成",
      sharedToGroup: true,
      createdAt: now
    }
  });
}

async function saveTraining(event) {
  try {
    await ensureCollection();

    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new Error("无法获取当前用户身份");
    }

    const sourceActions = Array.isArray(event.actions) ? event.actions : [];
    if (sourceActions.length > 100) {
      throw new Error("单次训练最多保存 100 个动作");
    }

    const actions = sourceActions.map(normalizeAction);
    const setsCount = actions.reduce((sum, action) => sum + action.setsCount, 0);
    const completedSets = actions.reduce((sum, action) => sum + action.completedSets, 0);
    const plannedVolume = actions.reduce((sum, action) => sum + action.plannedVolume, 0);
    const completedVolume = actions.reduce((sum, action) => sum + action.completedVolume, 0);
    const timer = String(event.timer || "00:00").trim().slice(0, 20);
    const durationSeconds = parseTimerSeconds(timer);
    const groupId = String(event.groupId || "").trim().slice(0, 100) || null;
    const id = createUuid();
    const data = {
      uuid: id,
      userId: OPENID,
      _openid: OPENID,
      groupId,
      title: String(event.title || "").trim().slice(0, 100) || "未命名训练",
      timer,
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      categoryIds: [...new Set(actions.map((action) => action.categoryId).filter(Boolean))],
      status: "completed",
      sharedToGroup: Boolean(groupId && event.sharedToGroup),
      actionsCount: actions.length,
      setsCount,
      completedSets,
      plannedVolume,
      completedVolume,
      actions,
      createdAt: db.serverDate(),
      completedAt: db.serverDate()
    };

    await db.collection(COLLECTION).doc(id).set({ data });

    try {
      await publishGroupActivity(data);
    } catch (error) {
      console.error("同步群组训练墙失败", error);
    }

    return {
      success: true,
      trainingId: id,
      data: {
        uuid: id,
        userId: OPENID
      }
    };
  } catch (error) {
    console.error("保存训练记录失败", error);
    return {
      success: false,
      message: error.message || "保存训练记录失败"
    };
  }
}

async function getRecentTrainings() {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new Error("无法获取当前用户身份");
    }

    const result = await db.collection(COLLECTION)
      .aggregate()
      .match({ userId: OPENID })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({
        uuid: 1,
        title: 1,
        timer: 1,
        groupId: 1,
        durationMinutes: 1,
        categoryIds: 1,
        actionsCount: 1,
        actionCategories: "$actions.categoryId",
        actionNames: "$actions.name",
        setsCount: 1,
        createdAt: 1
      })
      .end();

    return {
      success: true,
      data: result.list
    };
  } catch (error) {
    console.error("获取最近训练记录失败", error);
    return {
      success: false,
      message: error.message || "获取最近训练记录失败"
    };
  }
}

async function getAllTrainings(event) {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new Error("无法获取当前用户身份");
    }

    const page = Math.max(0, Math.floor(Number(event.page) || 0));
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(event.pageSize) || 20)));
    const result = await db.collection(COLLECTION)
      .aggregate()
      .match({ userId: OPENID })
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize + 1)
      .project({
        uuid: 1,
        title: 1,
        timer: 1,
        groupId: 1,
        durationMinutes: 1,
        categoryIds: 1,
        actionsCount: 1,
        actionCategories: "$actions.categoryId",
        actionNames: "$actions.name",
        setsCount: 1,
        createdAt: 1
      })
      .end();
    const list = result.list || [];

    return {
      success: true,
      data: list.slice(0, pageSize),
      hasMore: list.length > pageSize
    };
  } catch (error) {
    console.error("获取全部训练记录失败", error);
    return {
      success: false,
      message: error.message || "获取全部训练记录失败"
    };
  }
}

async function getTrainingDetail(event) {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new Error("无法获取当前用户身份");
    }

    const trainingId = String(event.trainingId || "").trim();
    if (!trainingId) {
      throw new Error("缺少训练记录 ID");
    }

    const result = await db.collection(COLLECTION).doc(trainingId).get();
    const training = result.data;

    if (!training || training.userId !== OPENID) {
      throw new Error("训练记录不存在");
    }

    return {
      success: true,
      data: training
    };
  } catch (error) {
    console.error("获取训练详情失败", error);
    return {
      success: false,
      message: error.message || "获取训练详情失败"
    };
  }
}

async function getWeeklyTrainings(event) {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      throw new Error("无法获取当前用户身份");
    }

    const weekStart = new Date(event.weekStart);
    const weekEnd = new Date(event.weekEnd);

    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime()) || weekStart >= weekEnd) {
      throw new Error("本周时间范围无效");
    }

    const _ = db.command;
    const result = await db.collection(COLLECTION)
      .aggregate()
      .match({
        userId: OPENID,
        createdAt: _.gte(weekStart).lt(weekEnd)
      })
      .sort({ createdAt: 1 })
      .project({
        uuid: 1,
        timer: 1,
        groupId: 1,
        durationMinutes: 1,
        createdAt: 1
      })
      .end();

    return {
      success: true,
      data: result.list
    };
  } catch (error) {
    console.error("获取本周训练记录失败", error);
    return {
      success: false,
      message: error.message || "获取本周训练记录失败"
    };
  }
}

module.exports = { saveTraining, getRecentTrainings, getAllTrainings, getTrainingDetail, getWeeklyTrainings };

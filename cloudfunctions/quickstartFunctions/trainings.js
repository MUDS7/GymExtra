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

function normalizeSet(set, index) {
  return {
    order: index + 1,
    weight: toOptionalNumber(set && set.weight),
    reps: toOptionalNumber(set && set.reps),
    completed: Boolean(set && set.completed)
  };
}

function normalizeAction(action, index) {
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
    const id = createUuid();
    const data = {
      uuid: id,
      userId: OPENID,
      _openid: OPENID,
      title: String(event.title || "").trim().slice(0, 100) || "未命名训练",
      timer: String(event.timer || "00:00").trim().slice(0, 20),
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

module.exports = { saveTraining, getRecentTrainings };

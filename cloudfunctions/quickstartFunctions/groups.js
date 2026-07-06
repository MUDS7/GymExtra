const cloud = require("wx-server-sdk");
const crypto = require("crypto");

const db = cloud.database();
const COLLECTIONS = [
  "groups",
  "group_members",
  "group_applications",
  "group_goals",
  "group_daily_activities",
  "group_challenges",
  "challenge_progress",
  "training_templates",
  "group_stat_snapshots"
];

const GROUPS = [
  {
    _id: "1",
    name: "力量训练精英组",
    description: "一起完成力量训练，记录每一次进步。",
    ownerId: "demo-owner",
    avatarUrl: "",
    coverUrl: "",
    theme: "energy",
    status: "active",
    visibility: "public",
    memberCount: 128,
    maxMembers: 500,
    todayCheckInCount: 36,
    badge: "今日打卡 · 36人",
    badgeType: "checkin",
    sortOrder: 1
  },
  {
    _id: "2",
    name: "早起跑步打卡",
    description: "用清晨的一次奔跑开启新的一天。",
    ownerId: "demo-owner",
    avatarUrl: "",
    coverUrl: "",
    theme: "cool",
    status: "active",
    visibility: "public",
    memberCount: 253,
    maxMembers: 500,
    todayCheckInCount: 42,
    badge: "连续 12 天",
    badgeType: "streak",
    sortOrder: 2
  },
  {
    _id: "3",
    name: "减脂百天计划",
    description: "用一百天建立稳定、可持续的运动习惯。",
    ownerId: "demo-owner",
    avatarUrl: "",
    coverUrl: "",
    theme: "vital",
    status: "active",
    visibility: "public",
    memberCount: 87,
    maxMembers: 300,
    todayCheckInCount: 15,
    badge: "活动进行中",
    badgeType: "challenge",
    sortOrder: 3
  }
];

const MEMBER_PROFILES = [
  { userId: "demo-member-1", displayName: "小鹿爱健身", checkedInToday: true },
  { userId: "demo-member-2", displayName: "晨光微汗", checkedInToday: true },
  { userId: "demo-member-3", displayName: "阿哲", checkedInToday: true },
  { userId: "demo-member-4", displayName: "可乐不加冰", checkedInToday: true },
  { userId: "demo-member-5", displayName: "柠檬不酸", checkedInToday: true },
  { userId: "demo-member-6", displayName: "向阳而生", checkedInToday: false },
  { userId: "demo-member-7", displayName: "山风", checkedInToday: false },
  { userId: "demo-member-8", displayName: "青禾", checkedInToday: false }
];

const DAILY_ACTIVITIES = [
  { userId: "demo-member-1", name: "小鹿爱健身", training: "哑铃全身", duration: 45, categoryId: "strength", tag: "力量", tagClass: "orange", state: "已完成", stateClass: "done" },
  { userId: "demo-member-2", name: "晨光微汗", training: "HIIT 跑", duration: 30, categoryId: "cardio", tag: "有氧", tagClass: "blue", state: "已完成", stateClass: "done" },
  { userId: "demo-member-3", name: "阿哲", training: "胸背训练", duration: 60, categoryId: "strength", tag: "力量", tagClass: "orange", state: "已完成", stateClass: "done" },
  { userId: "demo-member-4", name: "可乐不加冰", training: "瑜伽拉伸", duration: 20, categoryId: "stretch", tag: "拉伸", tagClass: "purple", state: "休息", stateClass: "rest" },
  { userId: "demo-member-5", name: "柠檬不酸", training: "腿部塑形", duration: 40, categoryId: "strength", tag: "力量", tagClass: "orange", state: "未打卡", stateClass: "missed" }
];

const TEMPLATES = [
  { key: "fat-burn", name: "新手燃脂模板", durationMinutes: 30, focusType: "cardio", focus: "有氧为主", usedCount: 1286 },
  { key: "legs", name: "臀腿训练模板", durationMinutes: 45, focusType: "strength", focus: "力量为主", usedCount: 987 },
  { key: "core", name: "核心激活模板", durationMinutes: 25, focusType: "core", focus: "核心为主", usedCount: 764 },
  { key: "stretch", name: "全身拉伸模板", durationMinutes: 20, focusType: "stretch", focus: "拉伸为主", usedCount: 642 }
];

let collectionsReady;

function getIdentity() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error("无法获取当前用户身份");
  return OPENID;
}

function safeId(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}

function getGroup(groupId) {
  return GROUPS.find((item) => item._id === groupId);
}

function getWeekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function dayKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function ensureCollections() {
  if (!collectionsReady) {
    collectionsReady = Promise.all(COLLECTIONS.map(async (name) => {
      try {
        await db.createCollection(name);
      } catch (error) {
        // 集合已经存在时无需处理。
      }
    }));
  }
  return collectionsReady;
}

async function createIfMissing(collection, id, data) {
  try {
    await db.collection(collection).doc(id).get();
  } catch (error) {
    await db.collection(collection).doc(id).set({ data });
  }
}

async function seedBaseData(userId) {
  await ensureCollections();
  const now = new Date();
  const userKey = safeId(userId);

  await Promise.all(GROUPS.flatMap((group) => [
    createIfMissing("groups", group._id, {
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      avatarUrl: group.avatarUrl,
      coverUrl: group.coverUrl,
      theme: group.theme,
      status: group.status,
      visibility: group.visibility,
      memberCount: group.memberCount,
      maxMembers: group.maxMembers,
      todayCheckInCount: group.todayCheckInCount,
      badge: group.badge,
      badgeType: group.badgeType,
      sortOrder: group.sortOrder,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    }),
    createIfMissing("group_members", `${group._id}-user-${userKey}`, {
      groupId: group._id,
      userId,
      role: "member",
      status: "active",
      profileSnapshot: null,
      joinedAt: now,
      lastActiveAt: now,
      lastCheckInAt: null,
      continuousCheckInDays: 0,
      isDemoMembership: true
    })
  ]));
}

async function seedGroupDetail(groupId, userId) {
  const group = getGroup(groupId);
  if (!group) throw new Error("群组不存在");

  const now = new Date();
  const { start, end } = getWeekRange(now);
  const challengeStart = new Date(now);
  challengeStart.setDate(challengeStart.getDate() - 3);
  challengeStart.setHours(0, 0, 0, 0);
  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 7);
  const challengeId = `${groupId}-checkin-7-days-${dayKey(start)}`;
  const userKey = safeId(userId);

  const records = [
    createIfMissing("group_goals", `${groupId}-${dayKey(start)}`, {
      groupId,
      title: "本周群目标",
      slogan: "团结就是力量",
      metricType: "exercise_minutes",
      targetValue: 1000,
      currentValue: 620,
      unit: "分钟",
      checkedInMemberCount: 5,
      eligibleMemberCount: 8,
      periodStart: start,
      periodEnd: end,
      status: "active",
      updatedAt: now
    }),
    createIfMissing("group_challenges", challengeId, {
      groupId,
      title: "7天打卡挑战 💪",
      description: "连续七天完成训练打卡",
      metricType: "checkin_days",
      targetValue: 7,
      startAt: challengeStart,
      endAt: challengeEnd,
      status: "active",
      createdBy: group.ownerId,
      createdAt: now,
      updatedAt: now
    }),
    createIfMissing("challenge_progress", `${challengeId}-user-${userKey}`, {
      challengeId,
      groupId,
      userId,
      currentValue: 5,
      checkInDates: [0, 1, 2, 3, 4].map((offset) => {
        const date = new Date(challengeStart);
        date.setDate(date.getDate() + offset);
        return date;
      }),
      completed: false,
      completedAt: null,
      updatedAt: now
    }),
    createIfMissing("group_stat_snapshots", `${groupId}-${dayKey(start)}`, {
      groupId,
      periodType: "week",
      periodStart: start,
      periodEnd: end,
      activeMemberCount: 15,
      participationRate: 88,
      streakLeader: { userId: "demo-member-1", name: "小鹿爱健身", value: 8, unit: "天" },
      progressLeader: { userId: "demo-member-2", name: "晨光微汗", value: 120, unit: "分钟" },
      generatedAt: now
    })
  ];

  MEMBER_PROFILES.forEach((member, index) => {
    records.push(createIfMissing("group_members", `${groupId}-${member.userId}`, {
      groupId,
      userId: member.userId,
      role: index === 0 ? "admin" : "member",
      status: "active",
      profileSnapshot: { nickname: member.displayName, avatarUrl: "" },
      checkedInToday: member.checkedInToday,
      displayOrder: index + 1,
      joinedAt: now,
      lastActiveAt: now,
      lastCheckInAt: member.checkedInToday ? now : null,
      continuousCheckInDays: index === 0 ? 8 : 0,
      isDemoMember: true
    }));
  });

  DAILY_ACTIVITIES.forEach((activity, index) => {
    records.push(createIfMissing("group_daily_activities", `${groupId}-${activity.userId}`, {
      groupId,
      userId: activity.userId,
      activityDate: now,
      activityDateKey: dayKey(now),
      displayOrder: index + 1,
      profileSnapshot: { nickname: activity.name, avatarUrl: "" },
      trainingId: null,
      trainingTitle: activity.training,
      durationMinutes: activity.duration,
      categoryId: activity.categoryId,
      categoryName: activity.tag,
      tagClass: activity.tagClass,
      checkInStatus: activity.stateClass,
      stateText: activity.state,
      sharedToGroup: true,
      createdAt: now
    }));
  });

  TEMPLATES.forEach((template, index) => {
    records.push(createIfMissing("training_templates", `${groupId}-${template.key}`, {
      groupId,
      name: template.name,
      imageUrl: "",
      durationMinutes: template.durationMinutes,
      focusType: template.focusType,
      focusText: template.focus,
      description: "",
      actions: [],
      creatorId: group.ownerId,
      status: "active",
      usedCount: template.usedCount,
      displayOrder: index + 1,
      createdAt: now,
      updatedAt: now
    }));
  });

  await Promise.all(records);
}

async function getMyGroups() {
  try {
    const userId = getIdentity();
    await seedBaseData(userId);

    const memberships = await db.collection("group_members")
      .where({ userId })
      .limit(100)
      .get();
    const groupIds = [...new Set(memberships.data
      .filter((item) => item.status === "active")
      .map((item) => item.groupId))];
    const groups = await Promise.all(groupIds.map(async (id) => {
      try {
        return (await db.collection("groups").doc(id).get()).data;
      } catch (error) {
        return null;
      }
    }));

    return {
      success: true,
      data: groups.filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder).map((group) => ({
        id: group._id,
        name: group.name,
        description: group.description,
        members: group.memberCount,
        active: group.badgeType !== "streak",
        badge: group.badge,
        tone: group.theme
      }))
    };
  } catch (error) {
    console.error("获取群组列表失败", error);
    return { success: false, message: error.message || "获取群组列表失败" };
  }
}

async function searchGroups(event) {
  try {
    const userId = getIdentity();
    const keyword = String(event.keyword || "").trim().toLowerCase();
    if (!keyword) throw new Error("请输入群组名称或群号");

    await seedBaseData(userId);
    const [result, membershipResult, applicationResult] = await Promise.all([
      db.collection("groups").limit(100).get(),
      db.collection("group_members").where({ userId }).limit(100).get(),
      db.collection("group_applications").where({ userId }).limit(100).get()
    ]);
    const joinedGroupIds = new Set(membershipResult.data
      .filter((item) => item.status === "active")
      .map((item) => item.groupId));
    const appliedGroupIds = new Set(applicationResult.data
      .filter((item) => item.status === "pending" || item.status === "approved")
      .map((item) => item.groupId));
    const groups = result.data
      .filter((group) => group.status === "active" && group.visibility === "public")
      .filter((group) => {
        const groupNo = String(group.groupNo || group._id || "").toLowerCase();
        const name = String(group.name || "").toLowerCase();
        return groupNo.includes(keyword) || name.includes(keyword);
      })
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .slice(0, 20)
      .map((group) => ({
        id: group._id,
        groupNo: String(group.groupNo || group._id),
        name: group.name,
        relationStatus: joinedGroupIds.has(group._id)
          ? "joined"
          : (appliedGroupIds.has(group._id) ? "applied" : ""),
        actionText: joinedGroupIds.has(group._id)
          ? "已加入"
          : (appliedGroupIds.has(group._id) ? "已申请" : "申请")
      }));

    return { success: true, data: groups };
  } catch (error) {
    console.error("搜索群组失败", error);
    return { success: false, message: error.message || "搜索群组失败" };
  }
}

async function applyToGroup(event) {
  try {
    const userId = getIdentity();
    const groupId = String(event.groupId || "").trim();
    if (!groupId) throw new Error("缺少群组 ID");

    await ensureCollections();
    const [groupResult, membershipResult] = await Promise.all([
      db.collection("groups").doc(groupId).get(),
      db.collection("group_members").where({ userId }).limit(100).get()
    ]);
    const group = groupResult.data;
    if (!group || group.status !== "active" || group.visibility !== "public") {
      throw new Error("群组不存在或暂不可申请");
    }

    const joined = membershipResult.data.some((item) => (
      item.groupId === groupId && item.status === "active"
    ));
    if (joined) {
      return { success: true, data: { status: "joined", actionText: "已加入" } };
    }

    const applicationId = `${groupId}-user-${safeId(userId)}`;
    const applicationRef = db.collection("group_applications").doc(applicationId);
    try {
      const existing = (await applicationRef.get()).data;
      if (existing && (existing.status === "pending" || existing.status === "approved")) {
        return { success: true, data: { status: "applied", actionText: "已申请" } };
      }
    } catch (error) {
      // 没有历史申请时继续创建。
    }

    const now = new Date();
    await applicationRef.set({
      data: {
        groupId,
        groupName: group.name,
        userId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        reviewedAt: null,
        reviewedBy: null
      }
    });

    return { success: true, data: { status: "applied", actionText: "已申请" } };
  } catch (error) {
    console.error("申请加入群组失败", error);
    return { success: false, message: error.message || "申请加入群组失败" };
  }
}

function formatChallengeDate(endAt) {
  const end = new Date(endAt);
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  return {
    remainingDays,
    text: `结束于 ${end.getMonth() + 1}月${end.getDate()}日（还有 ${remainingDays} 天）`
  };
}

async function getGroupDetail(event) {
  try {
    const userId = getIdentity();
    const groupId = String(event.groupId || "").trim();
    if (!groupId) throw new Error("缺少群组 ID");

    await seedBaseData(userId);
    await seedGroupDetail(groupId, userId);

    const groupResult = await db.collection("groups").doc(groupId).get();
    const [goalResult, memberResult, activityResult, challengeResult, templateResult, snapshotResult] = await Promise.all([
      db.collection("group_goals").where({ groupId }).limit(100).get(),
      db.collection("group_members").where({ groupId }).limit(100).get(),
      db.collection("group_daily_activities").where({ groupId }).limit(100).get(),
      db.collection("group_challenges").where({ groupId }).limit(100).get(),
      db.collection("training_templates").where({ groupId }).limit(100).get(),
      db.collection("group_stat_snapshots").where({ groupId }).limit(100).get()
    ]);

    const goals = goalResult.data.filter((item) => item.status === "active").sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
    const members = memberResult.data.filter((item) => item.status === "active" && item.isDemoMember).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 8);
    const activities = activityResult.data.filter((item) => item.sharedToGroup).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 20);
    const challenges = challengeResult.data.filter((item) => item.status === "active").sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    const templates = templateResult.data.filter((item) => item.status === "active").sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 20);
    const snapshots = snapshotResult.data.filter((item) => item.periodType === "week").sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
    const goal = goals[0] || null;
    const challenge = challenges[0] || null;
    const snapshot = snapshots[0] || null;
    let progress = null;

    if (challenge) {
      const progressResult = await db.collection("challenge_progress")
        .where({ challengeId: challenge._id })
        .limit(100)
        .get();
      progress = progressResult.data.find((item) => item.userId === userId) || null;
    }

    const challengeDate = challenge ? formatChallengeDate(challenge.endAt) : null;
    const progressValue = progress ? progress.currentValue : 0;
    const targetValue = challenge ? challenge.targetValue : 0;

    return {
      success: true,
      data: {
        group: groupResult.data,
        goal: goal ? {
          title: goal.title,
          slogan: goal.slogan,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          unit: goal.unit,
          percent: Math.min(100, Math.round(goal.currentValue / goal.targetValue * 100)),
          checkedInMemberCount: goal.checkedInMemberCount,
          eligibleMemberCount: goal.eligibleMemberCount
        } : null,
        attendance: members.map((member) => Boolean(member.checkedInToday)),
        members: activities.map((activity) => ({
          name: activity.profileSnapshot.nickname,
          avatarUrl: activity.profileSnapshot.avatarUrl,
          training: activity.trainingTitle,
          duration: activity.durationMinutes,
          tag: activity.categoryName,
          tagClass: activity.tagClass,
          state: activity.stateText,
          stateClass: activity.checkInStatus
        })),
        rankings: snapshot ? {
          streak: snapshot.streakLeader,
          activity: { value: snapshot.activeMemberCount, rate: snapshot.participationRate },
          progress: snapshot.progressLeader
        } : null,
        challenge: challenge ? {
          id: challenge._id,
          title: challenge.title,
          statusText: "进行中",
          dateText: challengeDate.text,
          remainingDays: challengeDate.remainingDays,
          currentValue: progressValue,
          targetValue,
          progressDots: Array.from({ length: targetValue }, (_, index) => index < progressValue)
        } : null,
        templates: templates.map((template) => ({
          id: template._id,
          name: template.name,
          imageUrl: template.imageUrl,
          duration: template.durationMinutes,
          focus: template.focusText,
          used: template.usedCount
        }))
      }
    };
  } catch (error) {
    console.error("获取群组详情失败", error);
    return { success: false, message: error.message || "获取群组详情失败" };
  }
}

module.exports = { getMyGroups, getGroupDetail, searchGroups, applyToGroup };

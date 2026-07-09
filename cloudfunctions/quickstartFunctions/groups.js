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
  "trainings",
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

const TEST_MEMBERS = [
  { key: "member-1", name: "测试有氧 1" },
  { key: "member-2", name: "测试有氧 2" },
  { key: "member-3", name: "测试有氧 3" }
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

function dayKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromDayKey(value) {
  const parts = String(value || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
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

function toValidDate(value, fallback) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : fallback;
}

function isSameDay(value, target = new Date()) {
  if (!value) return false;
  return dayKey(new Date(value)) === dayKey(target);
}

function getProfileName(snapshot, fallback = "群成员") {
  return (snapshot && (snapshot.nickname || snapshot.name)) || fallback;
}

function getCategoryTone(categoryId) {
  const tones = {
    cardio: "blue",
    stretch: "purple",
    yoga: "purple",
    strength: "orange",
    core: "orange"
  };
  return tones[categoryId] || "orange";
}

function getCheckInText(status) {
  const texts = {
    done: "已完成",
    rest: "休息",
    missed: "未打卡"
  };
  return texts[status] || "已完成";
}

function normalizeLeader(leader, fallbackUnit) {
  return {
    name: (leader && leader.name) || "暂无",
    value: leader && Number.isFinite(Number(leader.value)) ? Number(leader.value) : 0,
    unit: (leader && leader.unit) || fallbackUnit
  };
}

function isSeedUserId(userId) {
  const value = String(userId || "");
  return value.startsWith("demo-") || value.startsWith("test-");
}

function isSeedRecord(record) {
  return Boolean(
    record && (
      record.isDemoMember
      || record.isDemoMembership
      || record.isDemoActivity
      || record.isTestMember
      || record.isTestActivity
      || isSeedUserId(record.userId)
    )
  );
}

function isSeedChallenge(challenge) {
  const id = String((challenge && challenge._id) || "");
  return Boolean(
    challenge && (
      challenge.isDemoChallenge
      || challenge.isTestChallenge
      || (challenge.createdBy === "demo-owner" && id.includes("-checkin-7-days-"))
    )
  );
}

function isRealActivity(activity) {
  return activity
    && activity.sharedToGroup
    && activity.checkInStatus === "done"
    && !isSeedRecord(activity);
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

async function setTestRecord(collection, id, data) {
  await db.collection(collection).doc(id).set({ data });
}

function atTrainingTime(date, memberIndex) {
  const value = new Date(date);
  value.setHours(7 + memberIndex, 30, 0, 0);
  return value;
}

function buildCardioAction() {
  return {
    actionId: "test-cardio-30",
    categoryId: "cardio",
    durationMinutes: 30,
    name: "有氧训练",
    iconPath: "",
    order: 1,
    setsCount: 0,
    completedSets: 0,
    plannedVolume: 0,
    completedVolume: 0,
    sets: []
  };
}

function buildDefaultChallenge(group, now = new Date()) {
  if (!group || group.badgeType !== "challenge") return null;

  const { start, end } = getWeekRange(now);
  return {
    id: `${group._id}-checkin-7-days-${dayKey(start)}`,
    data: {
      groupId: group._id,
      title: "7 天群打卡挑战",
      description: "完成本周连续打卡，和群友一起把节奏稳住。",
      metricType: "checkin_days",
      targetValue: 7,
      currentValue: 0,
      unit: "天",
      startAt: start,
      endAt: end,
      status: "active",
      createdBy: "demo-owner",
      isDemoChallenge: true,
      createdAt: now,
      updatedAt: now
    }
  };
}

async function seedGroupTestData(group, now = new Date()) {
  const { start, end } = getWeekRange(now);
  const today = new Date(now);
  const targetValue = TEST_MEMBERS.length * 30;
  const records = [
    setTestRecord("group_goals", `${group._id}-${dayKey(start)}`, {
      groupId: group._id,
      title: "本周群目标",
      slogan: "每天 30 分钟有氧",
      metricType: "exercise_minutes",
      targetValue,
      currentValue: 0,
      unit: "分钟",
      checkedInMemberCount: 0,
      eligibleMemberCount: TEST_MEMBERS.length,
      periodStart: start,
      periodEnd: end,
      status: "active",
      isTestGoal: true,
      updatedAt: now
    })
  ];

  TEST_MEMBERS.forEach((member, memberIndex) => {
    const userId = `test-${group._id}-${member.key}`;
    const profileSnapshot = { nickname: member.name, avatarUrl: "" };
    const displayOrder = memberIndex - TEST_MEMBERS.length;

    records.push(setTestRecord("group_members", `${group._id}-${userId}`, {
      groupId: group._id,
      userId,
      role: "member",
      status: "active",
      profileSnapshot,
      checkedInToday: true,
      displayOrder,
      joinedAt: start,
      lastActiveAt: now,
      lastCheckInAt: now,
      lastCheckInDateKey: dayKey(today),
      continuousCheckInDays: 1,
      isTestMember: true
    }));

    const activityDateKey = dayKey(today);
    const trainingTime = atTrainingTime(today, memberIndex);
    const trainingId = `${group._id}-${userId}-${activityDateKey}-cardio-30`;

    records.push(setTestRecord("trainings", trainingId, {
      uuid: trainingId,
      userId,
      _openid: userId,
      groupId: group._id,
      title: "有氧 30 分钟",
      timer: "30:00",
      durationSeconds: 1800,
      durationMinutes: 30,
      categoryIds: ["cardio"],
      status: "completed",
      sharedToGroup: true,
      actionsCount: 1,
      setsCount: 0,
      completedSets: 0,
      plannedVolume: 0,
      completedVolume: 0,
      actions: [buildCardioAction()],
      createdAt: trainingTime,
      completedAt: trainingTime
    }));

    records.push(setTestRecord("group_daily_activities", trainingId, {
      groupId: group._id,
      userId,
      activityDate: trainingTime,
      activityDateKey,
      displayOrder,
      profileSnapshot,
      trainingId,
      trainingTitle: "有氧 30 分钟",
      durationMinutes: 30,
      categoryId: "cardio",
      categoryName: "有氧",
      tagClass: "blue",
      checkInStatus: "done",
      sharedToGroup: true,
      isTestActivity: true,
      stateText: "已完成",
      createdAt: trainingTime
    }));
  });

  await Promise.all(records);
}

async function seedBaseData(userId) {
  await ensureCollections();
  const now = new Date();
  const userKey = safeId(userId);

  await Promise.all(GROUPS.flatMap((group) => {
    const records = [
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
    ];
    const challenge = buildDefaultChallenge(group, now);
    if (challenge) {
      records.push(createIfMissing("group_challenges", challenge.id, challenge.data));
    }
    return records;
  }));

  // 榜单和训练墙读取真实数据库记录，不再为详情页写入测试打卡数据。
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
  if (Number.isNaN(end.getTime())) {
    return { remainingDays: 0, text: "暂无结束时间" };
  }

  const remainingDays = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  return {
    remainingDays,
    text: `结束于 ${end.getMonth() + 1}月${end.getDate()}日（还有 ${remainingDays} 天）`
  };
}

async function getActiveMembership(groupId, userId) {
  const result = await db.collection("group_members")
    .where({ groupId, userId, status: "active" })
    .limit(1)
    .get();
  return result.data[0] || null;
}

async function queryCurrentGoal(groupId) {
  const result = await db.collection("group_goals")
    .where({ groupId, status: "active" })
    .orderBy("periodStart", "desc")
    .limit(1)
    .get();
  return result.data[0] || null;
}

async function queryGoalStats(groupId, goal) {
  const _ = db.command;
  const $ = db.command.aggregate;
  const weekRange = getWeekRange();
  const periodStart = toValidDate(goal && goal.periodStart, weekRange.start);
  const periodEnd = toValidDate(goal && goal.periodEnd, weekRange.end);
  const todayKey = dayKey();
  const periodStartKey = dayKey(periodStart);
  const periodEndKey = dayKey(periodEnd);
  const currentValueQuery = db.collection("group_daily_activities")
    .aggregate()
    .match({
      groupId,
      activityDateKey: _.gte(periodStartKey).lt(periodEndKey),
      sharedToGroup: true,
      checkInStatus: "done"
    })
    .group({
      _id: null,
      totalMinutes: $.sum("$durationMinutes")
    })
    .end();

  const [currentValueResult, checkInResult, memberCountResult] = await Promise.all([
    currentValueQuery,
    db.collection("group_daily_activities")
      .aggregate()
      .match({
        groupId,
        activityDateKey: todayKey,
        sharedToGroup: true,
        checkInStatus: "done"
      })
      .group({
        _id: "$userId"
      })
      .end(),
    db.collection("group_members")
      .where({ groupId, status: "active" })
      .count()
  ]);

  const valueStats = currentValueResult.list && currentValueResult.list[0];
  const checkedInUsers = checkInResult.list || [];

  return {
    currentValue: Number(valueStats && valueStats.totalMinutes) || 0,
    checkedInMemberCount: checkedInUsers.length,
    eligibleMemberCount: Number(memberCountResult.total) || 0
  };
}

async function queryAttendanceMembers(groupId) {
  const todayKey = dayKey();
  const [memberResult, checkInResult] = await Promise.all([
    db.collection("group_members")
      .where({ groupId, status: "active" })
      .orderBy("displayOrder", "asc")
      .limit(100)
      .get(),
    db.collection("group_daily_activities")
      .aggregate()
      .match({
        groupId,
        activityDateKey: todayKey,
        sharedToGroup: true,
        checkInStatus: "done"
      })
      .group({
        _id: "$userId"
      })
      .end()
  ]);

  const today = new Date();
  const checkedInUserIds = new Set((checkInResult.list || []).map((item) => item._id));
  return memberResult.data
    .map((member) => ({
      ...member,
      checkedInToday: Boolean(
        checkedInUserIds.has(member.userId)
        || member.lastCheckInDateKey === todayKey
        || isSameDay(member.lastCheckInAt, today)
      )
    }))
    .sort((a, b) => {
      if (Boolean(a.checkedInToday) !== Boolean(b.checkedInToday)) {
        return a.checkedInToday ? -1 : 1;
      }
      return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
    })
    .slice(0, 8);
}

async function queryTodayActivities(groupId) {
  const result = await db.collection("group_daily_activities")
    .where({ groupId, activityDateKey: dayKey(), sharedToGroup: true })
    .orderBy("displayOrder", "asc")
    .limit(20)
    .get();
  return result.data.sort((a, b) => {
    if (Boolean(a.isTestActivity) !== Boolean(b.isTestActivity)) {
      return a.isTestActivity ? -1 : 1;
    }
    return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
  });
}

async function queryActiveChallenge(groupId) {
  const result = await db.collection("group_challenges")
    .where({ groupId, status: "active" })
    .orderBy("startAt", "desc")
    .limit(20)
    .get();
  const activeChallenges = result.data || [];
  return activeChallenges.find((challenge) => !isSeedChallenge(challenge))
    || activeChallenges[0]
    || null;
}

async function queryChallengeProgress(challenge, userId) {
  if (!challenge || !userId) return { currentValue: 0, progressDots: [] };

  const start = toValidDate(challenge.startAt, new Date());
  const end = toValidDate(challenge.endAt, new Date());
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const result = await db.collection("group_daily_activities")
    .where({
      groupId: challenge.groupId,
      userId,
      sharedToGroup: true,
      checkInStatus: "done"
    })
    .orderBy("activityDateKey", "desc")
    .limit(1000)
    .get();
  const activities = result.data
    .filter(isRealActivity)
    .filter((activity) => (
      activity.activityDateKey >= startKey
      && (!endKey || activity.activityDateKey < endKey)
    ));
  const metricType = challenge.metricType || "checkin_days";
  const currentValue = metricType === "exercise_minutes"
    ? activities.reduce((sum, activity) => sum + (Number(activity.durationMinutes) || 0), 0)
    : new Set(activities.map((activity) => activity.activityDateKey).filter(Boolean)).size;
  const targetValue = Math.max(0, Number(challenge.targetValue) || 0);
  const dotCount = metricType === "checkin_days" ? Math.min(targetValue, 31) : 0;

  return {
    currentValue,
    progressDots: Array.from({ length: dotCount }, (_, index) => index < currentValue)
  };
}

async function queryTrainingTemplates(groupId) {
  const result = await db.collection("training_templates")
    .where({ groupId, status: "active" })
    .orderBy("displayOrder", "asc")
    .limit(20)
    .get();
  return result.data;
}

async function queryRankingActivities(groupId) {
  const result = await db.collection("group_daily_activities")
    .where({ groupId, sharedToGroup: true, checkInStatus: "done" })
    .orderBy("activityDateKey", "desc")
    .limit(1000)
    .get();
  return result.data.filter(isRealActivity);
}

function countContinuousDays(dateKeys, todayKey) {
  const checkedDates = new Set(dateKeys);
  const cursor = dateFromDayKey(todayKey);
  let count = 0;

  while (checkedDates.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

async function queryStreakLeader(groupId, activities) {
  const todayKey = dayKey();
  const users = new Map();

  activities.forEach((activity) => {
    const userId = activity.userId;
    if (!userId || !activity.activityDateKey) return;
    const current = users.get(userId) || {
      name: getProfileName(activity.profileSnapshot),
      dateKeys: new Set()
    };
    current.dateKeys.add(activity.activityDateKey);
    if (current.name === "群成员") {
      current.name = getProfileName(activity.profileSnapshot);
    }
    users.set(userId, current);
  });

  const leader = Array.from(users.values())
    .map((user) => ({
      name: user.name,
      value: countContinuousDays(user.dateKeys, todayKey)
    }))
    .filter((user) => user.value > 0)
    .sort((a, b) => b.value - a.value)[0];

  return normalizeLeader(leader ? {
    name: leader.name,
    value: leader.value,
    unit: "天"
  } : null, "天");
}

async function queryWeeklyActivity(groupId, activities) {
  const { start, end } = getWeekRange();
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const memberResult = await db.collection("group_members")
    .where({ groupId, status: "active" })
    .limit(1000)
    .get();
  const activeUserIds = new Set(activities
    .filter((activity) => activity.activityDateKey >= startKey && activity.activityDateKey < endKey)
    .map((activity) => activity.userId)
    .filter(Boolean));
  const realMemberCount = memberResult.data.filter((member) => !isSeedRecord(member)).length;
  const memberCount = realMemberCount || activeUserIds.size;

  return {
    value: activeUserIds.size,
    rate: memberCount ? Math.round(activeUserIds.size / memberCount * 100) : 0
  };
}

async function queryTodayProgressLeader(groupId, activities) {
  const todayKey = dayKey();
  const users = new Map();
  const todayActivities = activities
    .filter((activity) => activity.activityDateKey === todayKey);

  todayActivities.forEach((activity) => {
    const userId = activity.userId;
    if (!userId) return;
    const current = users.get(userId) || {
      name: getProfileName(activity.profileSnapshot),
      totalMinutes: 0
    };
    current.totalMinutes += Number(activity.durationMinutes) || 0;
    if (current.name === "群成员") {
      current.name = getProfileName(activity.profileSnapshot);
    }
    users.set(userId, current);
  });

  const leader = Array.from(users.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes)[0];

  return normalizeLeader({
    name: leader && leader.name,
    value: leader && leader.totalMinutes,
    unit: "分钟"
  }, "分钟");
}

async function queryRankings(groupId) {
  const activities = await queryRankingActivities(groupId);
  const [streak, activity, progress] = await Promise.all([
    queryStreakLeader(groupId, activities),
    queryWeeklyActivity(groupId, activities),
    queryTodayProgressLeader(groupId, activities)
  ]);

  return { streak, activity, progress };
}

async function getGroupDetail(event) {
  try {
    const userId = getIdentity();
    const groupId = String(event.groupId || "").trim();
    if (!groupId) throw new Error("缺少群组 ID");

    await seedBaseData(userId);

    const groupResult = await db.collection("groups").doc(groupId).get();
    const group = groupResult.data;
    if (!group || group.status !== "active") {
      throw new Error("群组不存在或已停用");
    }

    const membership = await getActiveMembership(groupId, userId);
    if (!membership) throw new Error("请先加入该群组");

    const [
      goal,
      members,
      activities,
      challenge,
      templates,
      rankings
    ] = await Promise.all([
      queryCurrentGoal(groupId),
      queryAttendanceMembers(groupId),
      queryTodayActivities(groupId),
      queryActiveChallenge(groupId),
      queryTrainingTemplates(groupId),
      queryRankings(groupId)
    ]);
    const goalStats = await queryGoalStats(groupId, goal);
    const progress = await queryChallengeProgress(challenge, userId);
    const challengeDate = challenge ? formatChallengeDate(challenge.endAt) : null;
    const progressValue = Number(progress && progress.currentValue) || 0;
    const targetValue = challenge ? Number(challenge.targetValue) || 0 : 0;

    return {
      success: true,
      data: {
        group,
        goal: goal ? {
          title: goal.title,
          slogan: goal.slogan,
          targetValue: Number(goal.targetValue) || 0,
          currentValue: goalStats.currentValue,
          unit: goal.unit,
          percent: Number(goal.targetValue) ? Math.min(100, Math.round(goalStats.currentValue / Number(goal.targetValue) * 100)) : 0,
          checkedInMemberCount: goalStats.checkedInMemberCount,
          eligibleMemberCount: goalStats.eligibleMemberCount
        } : null,
        attendance: members.map((member) => Boolean(member.checkedInToday)),
        members: activities.map((activity) => ({
          id: activity._id,
          name: getProfileName(activity.profileSnapshot),
          avatarUrl: activity.profileSnapshot && activity.profileSnapshot.avatarUrl,
          training: activity.trainingTitle || "未命名训练",
          duration: Number(activity.durationMinutes) || 0,
          tag: activity.categoryName || "训练",
          tagClass: activity.tagClass || getCategoryTone(activity.categoryId),
          state: activity.stateText || getCheckInText(activity.checkInStatus),
          stateClass: activity.checkInStatus || "done"
        })),
        rankings,
        challenge: challenge ? {
          id: challenge._id,
          title: challenge.title || "群挑战",
          statusText: "进行中",
          dateText: challengeDate.text,
          remainingDays: challengeDate.remainingDays,
          currentValue: progressValue,
          targetValue,
          unit: challenge.unit || (challenge.metricType === "exercise_minutes" ? "分钟" : "天"),
          progressDots: progress.progressDots
        } : null,
        templates: templates.map((template) => ({
          id: template._id,
          name: template.name || "未命名模板",
          imageUrl: template.imageUrl || "",
          duration: Number(template.durationMinutes) || 0,
          focus: template.focusText || "综合训练",
          used: Number(template.usedCount) || 0
        }))
      }
    };
  } catch (error) {
    console.error("获取群组详情失败", error);
    return { success: false, message: error.message || "获取群组详情失败" };
  }
}

module.exports = { getMyGroups, getGroupDetail, searchGroups, applyToGroup };

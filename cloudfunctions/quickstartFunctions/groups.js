const cloud = require("wx-server-sdk");
const crypto = require("crypto");

const db = cloud.database();
const DEFAULT_WEEKLY_GOAL_MINUTES = 1000;
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

const LEADERBOARD_META = {
  today: {
    type: "today",
    title: "今日训练榜",
    subtitle: "今日训练墙 · 总运动时长",
    scoreIcon: "🔥",
    scoreLabel: "总运动时长",
    emptyTitle: "暂无今日排名",
    emptyCopy: "完成并分享到群组的训练会出现在这里"
  },
  streak: {
    type: "streak",
    title: "连续打卡榜",
    subtitle: "连续打卡 · 当前连续天数",
    scoreIcon: "🔥",
    scoreLabel: "连续打卡",
    emptyTitle: "暂无连续打卡排名",
    emptyCopy: "连续完成并分享到群组的训练会出现在这里"
  },
  activity: {
    type: "activity",
    title: "本周活跃榜",
    subtitle: "本周活跃 · 打卡天数",
    scoreIcon: "📈",
    scoreLabel: "本周打卡",
    emptyTitle: "暂无本周活跃排名",
    emptyCopy: "本周完成并分享到群组的训练会出现在这里"
  },
  progress: {
    type: "progress",
    title: "进步榜",
    subtitle: "今日进步 · 运动时长",
    scoreIcon: "🏆",
    scoreLabel: "今日运动",
    emptyTitle: "暂无进步排名",
    emptyCopy: "今日完成并分享到群组的训练会出现在这里"
  }
};

function getLeaderboardType(value) {
  const type = String(value || "today").trim();
  const aliases = {
    checkin: "streak",
    weekly: "activity",
    active: "activity"
  };
  return LEADERBOARD_META[type] ? type : (aliases[type] || "today");
}

function getLeaderboardMeta(type) {
  return LEADERBOARD_META[type] || LEADERBOARD_META.today;
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
      || record.isTestGoal
      || isSeedUserId(record.userId)
    )
  );
}

function isTestRecord(record) {
  const userId = String((record && record.userId) || "");
  return Boolean(
    record && (
      record.isTestMember
      || record.isTestActivity
      || record.isTestGoal
      || userId.startsWith("test-")
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
    && !isTestRecord(activity)
    && !activity.isDemoActivity;
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

function buildDefaultChallenge(group, now = new Date()) {
  if (!group) return null;

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

function isWeeklyCheckInChallenge(challenge) {
  return Boolean(
    challenge
    && (challenge.metricType || "checkin_days") === "checkin_days"
    && Number(challenge.targetValue) === 7
  );
}

function getChallengePeriod(challenge, now = new Date()) {
  if (isWeeklyCheckInChallenge(challenge)) {
    return getWeekRange(now);
  }

  return {
    start: toValidDate(challenge && challenge.startAt, now),
    end: toValidDate(challenge && challenge.endAt, now)
  };
}

function buildDefaultGroupGoal(groupId, now = new Date()) {
  const { start, end } = getWeekRange(now);
  return {
    _id: `default-weekly-goal-${groupId}-${dayKey(start)}`,
    groupId,
    title: "本周群目标",
    slogan: "一起动起来",
    targetValue: DEFAULT_WEEKLY_GOAL_MINUTES,
    unit: "分钟",
    periodStart: start,
    periodEnd: end,
    status: "active",
    isDefaultGoal: true
  };
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
    const activeGroups = groups.filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder);
    const memberCounts = await Promise.all(activeGroups.map(async (group) => {
      const result = await db.collection("group_members")
        .where({ groupId: group._id, status: "active" })
        .count();
      return Number(result.total) || 0;
    }));

    return {
      success: true,
      data: activeGroups.map((group, index) => ({
        id: group._id,
        name: group.name,
        description: group.description,
        members: memberCounts[index],
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
    .limit(20)
    .get();
  return (result.data || []).find((goal) => !isSeedRecord(goal))
    || buildDefaultGroupGoal(groupId);
}

async function queryGoalPeriodActivities(groupId, periodStartKey, periodEndKey) {
  const pageSize = 1000;
  const _ = db.command;
  let offset = 0;
  let activities = [];

  while (true) {
    const result = await db.collection("group_daily_activities")
      .where({
        groupId,
        sharedToGroup: true,
        checkInStatus: "done",
        activityDateKey: _.gte(periodStartKey).lt(periodEndKey)
      })
      .orderBy("activityDateKey", "desc")
      .skip(offset)
      .limit(pageSize)
      .get();
    const page = result.data || [];
    activities = activities.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return activities;
}

async function queryGoalStats(groupId, goal) {
  const weekRange = getWeekRange();
  const periodStart = toValidDate(goal && goal.periodStart, weekRange.start);
  const periodEnd = toValidDate(goal && goal.periodEnd, weekRange.end);
  const todayKey = dayKey();
  const periodStartKey = dayKey(periodStart);
  const periodEndKey = dayKey(periodEnd);

  const [activities, memberResult] = await Promise.all([
    queryGoalPeriodActivities(groupId, periodStartKey, periodEndKey),
    db.collection("group_members")
      .where({ groupId, status: "active" })
      .limit(1000)
      .get()
  ]);

  const realMembers = (memberResult.data || [])
    .filter((member) => !isTestRecord(member) && member.userId);
  const uniqueMembers = Array.from(new Map(
    realMembers.map((member) => [member.userId, member])
  ).values());
  const activeMemberIds = new Set(uniqueMembers.map((member) => member.userId));
  const periodActivities = activities.filter((activity) => (
    isRealActivity(activity)
    && activeMemberIds.has(activity.userId)
  ));
  const checkedInUsers = new Set(periodActivities
    .filter((activity) => activity.activityDateKey === todayKey)
    .map((activity) => activity.userId)
    .filter(Boolean));

  return {
    currentValue: periodActivities.reduce((sum, activity) => sum + (Number(activity.durationMinutes) || 0), 0),
    checkedInMemberCount: checkedInUsers.size,
    eligibleMemberCount: uniqueMembers.length,
    attendance: uniqueMembers
      .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
      .slice(0, 8)
      .map((member) => checkedInUsers.has(member.userId))
  };
}

async function queryMemberProfiles(memberIds) {
  const userIds = [...new Set(memberIds.filter(Boolean))];
  const profiles = new Map();
  const batchSize = 20;

  try {
    for (let index = 0; index < userIds.length; index += batchSize) {
      const ids = userIds.slice(index, index + batchSize);
      const result = await db.collection("users")
        .where({ _id: db.command.in(ids) })
        .limit(batchSize)
        .get();
      (result.data || []).forEach((profile) => profiles.set(profile._id, profile));
    }
  } catch (error) {
    // 用户资料缺失时，训练墙仍可使用成员快照或默认昵称展示。
    console.error("查询群成员资料失败", error);
  }

  return profiles;
}

function getWallMemberIdentity(member, profile) {
  const snapshot = (member && member.profileSnapshot) || {};
  const user = profile || {};
  return {
    name: getProfileName(snapshot, getProfileName(user)),
    avatarUrl: snapshot.avatarUrl || user.avatarUrl || ""
  };
}

async function queryTodayWallMembers(groupId) {
  const todayKey = dayKey();
  const [activityResult, memberResult] = await Promise.all([
    db.collection("group_daily_activities")
      .where({ groupId, activityDateKey: todayKey, sharedToGroup: true })
      .limit(1000)
      .get(),
    db.collection("group_members")
      .where({ groupId, status: "active" })
      .limit(1000)
      .get()
  ]);
  const members = Array.from(new Map((memberResult.data || [])
    .filter((member) => !isTestRecord(member) && member.userId)
    .map((member) => [member.userId, member]))
    .values());
  const membersByUserId = new Map(members.map((member) => [member.userId, member]));
  const profiles = await queryMemberProfiles(members.map((member) => member.userId));
  const activities = (activityResult.data || [])
    .filter((activity) => isRealActivity(activity) && membersByUserId.has(activity.userId))
    .sort((a, b) => (
      getActivityTimestamp(a) - getActivityTimestamp(b)
      || Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
      || String(a._id || "").localeCompare(String(b._id || ""))
    ));
  const checkedInUserIds = new Set(activities.map((activity) => activity.userId));

  const checkedInRows = activities.map((activity) => {
    const member = membersByUserId.get(activity.userId);
    const identity = getWallMemberIdentity(member, profiles.get(activity.userId));
    const activityProfile = activity.profileSnapshot || {};
    return {
      id: activity._id,
      name: getProfileName(activityProfile, identity.name),
      avatarUrl: activityProfile.avatarUrl || identity.avatarUrl,
      training: activity.trainingTitle || "未命名训练",
      duration: Number(activity.durationMinutes) || 0,
      categoryId: activity.categoryId || "",
      tag: activity.categoryName || "训练",
      tagClass: activity.tagClass || getCategoryTone(activity.categoryId),
      state: activity.stateText || getCheckInText(activity.checkInStatus),
      stateClass: activity.checkInStatus || "done",
      checkedIn: true
    };
  });
  const missedRows = members
    .filter((member) => !checkedInUserIds.has(member.userId))
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
    .map((member) => {
      const identity = getWallMemberIdentity(member, profiles.get(member.userId));
      return {
        id: `missed-${member._id || member.userId}`,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
        training: "今日尚未训练",
        duration: 0,
        categoryId: "",
        tag: "未打卡",
        tagClass: "missed",
        state: getCheckInText("missed"),
        stateClass: "missed",
        checkedIn: false
      };
    });

  return checkedInRows.concat(missedRows);
}

async function queryActiveChallenge(groupId) {
  const result = await db.collection("group_challenges")
    .where({ groupId, status: "active" })
    .orderBy("startAt", "desc")
    .limit(20)
    .get();
  const now = new Date();
  const activeChallenges = (result.data || []).filter((challenge) => {
    const start = toValidDate(challenge.startAt, null);
    const end = toValidDate(challenge.endAt, null);
    return (!start || start <= now) && (!end || now < end);
  });
  return activeChallenges.find((challenge) => !isSeedChallenge(challenge))
    || activeChallenges[0]
    || null;
}

async function queryChallengeProgress(challenge, userId) {
  if (!challenge || !userId) return { currentValue: 0, progressDots: [] };

  const { start, end } = getChallengePeriod(challenge);
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const _ = db.command;
  const result = await db.collection("group_daily_activities")
    .where({
      groupId: challenge.groupId,
      userId,
      sharedToGroup: true,
      checkInStatus: "done",
      activityDateKey: _.gte(startKey).lt(endKey)
    })
    .orderBy("activityDateKey", "desc")
    .limit(1000)
    .get();
  const activities = result.data.filter(isRealActivity);
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

async function queryTodayLeaderboard(groupId) {
  const result = await db.collection("group_daily_activities")
    .where({
      groupId,
      activityDateKey: dayKey(),
      sharedToGroup: true
    })
    .orderBy("displayOrder", "asc")
    .limit(1000)
    .get();
  const users = new Map();

  (result.data || [])
    .filter(isRealActivity)
    .forEach((activity) => {
      const userId = activity.userId;
      if (!userId) return;

      const current = users.get(userId) || {
        id: userId,
        name: getProfileName(activity.profileSnapshot),
        avatarUrl: activity.profileSnapshot && activity.profileSnapshot.avatarUrl,
        value: 0,
        trainingCount: 0,
        latestTraining: activity.trainingTitle || "未命名训练",
        tag: activity.categoryName || "训练",
        tagClass: activity.tagClass || getCategoryTone(activity.categoryId),
        displayOrder: Number(activity.displayOrder || 0)
      };

      current.value += Number(activity.durationMinutes) || 0;
      current.trainingCount += 1;
      if (activity.activityDate && (!current.latestAt || new Date(activity.activityDate) > current.latestAt)) {
        current.latestAt = new Date(activity.activityDate);
        current.latestTraining = activity.trainingTitle || current.latestTraining;
        current.tag = activity.categoryName || current.tag;
        current.tagClass = activity.tagClass || current.tagClass;
      }
      if (current.name === "群成员") {
        current.name = getProfileName(activity.profileSnapshot);
      }
      if (!current.avatarUrl && activity.profileSnapshot && activity.profileSnapshot.avatarUrl) {
        current.avatarUrl = activity.profileSnapshot.avatarUrl;
      }

      users.set(userId, current);
    });

  return Array.from(users.values())
    .sort((a, b) => (
      b.value - a.value
      || b.trainingCount - a.trainingCount
      || a.displayOrder - b.displayOrder
    ))
    .map((user, index) => ({
      id: user.id,
      rank: index + 1,
      name: user.name,
      avatarUrl: user.avatarUrl || "",
      value: Math.round(user.value),
      unit: "分钟",
      trainingCount: user.trainingCount,
      latestTraining: user.latestTraining,
      tag: user.tag,
      tagClass: user.tagClass
    }));
}

function getActivityTimestamp(activity) {
  const dateValue = activity && (activity.activityDate || activity.createdAt);
  const date = dateValue ? new Date(dateValue) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function createLeaderboardUser(activity) {
  return {
    id: activity.userId,
    name: getProfileName(activity.profileSnapshot),
    avatarUrl: activity.profileSnapshot && activity.profileSnapshot.avatarUrl,
    displayOrder: Number(activity.displayOrder || 0),
    latestAt: 0,
    latestTraining: activity.trainingTitle || "未命名训练",
    tag: activity.categoryName || "训练",
    tagClass: activity.tagClass || getCategoryTone(activity.categoryId),
    trainingCount: 0,
    totalMinutes: 0,
    dateKeys: new Set()
  };
}

function mergeLeaderboardActivity(users, activity) {
  const userId = activity.userId;
  if (!userId) return null;

  const current = users.get(userId) || createLeaderboardUser(activity);
  const activityTime = getActivityTimestamp(activity);
  current.trainingCount += 1;
  current.totalMinutes += Number(activity.durationMinutes) || 0;
  if (activity.activityDateKey) current.dateKeys.add(activity.activityDateKey);
  if (activityTime >= current.latestAt) {
    current.latestAt = activityTime;
    current.latestTraining = activity.trainingTitle || current.latestTraining;
    current.tag = activity.categoryName || current.tag;
    current.tagClass = activity.tagClass || current.tagClass;
  }
  if (current.name === "群成员") {
    current.name = getProfileName(activity.profileSnapshot);
  }
  if (!current.avatarUrl && activity.profileSnapshot && activity.profileSnapshot.avatarUrl) {
    current.avatarUrl = activity.profileSnapshot.avatarUrl;
  }

  users.set(userId, current);
  return current;
}

function toLeaderboardRows(users, getValue, getExtra = () => ({})) {
  return Array.from(users.values())
    .map((user) => ({
      ...user,
      value: getValue(user)
    }))
    .filter((user) => user.value > 0)
    .sort((a, b) => (
      b.value - a.value
      || b.totalMinutes - a.totalMinutes
      || b.trainingCount - a.trainingCount
      || b.latestAt - a.latestAt
      || a.displayOrder - b.displayOrder
    ))
    .map((user, index) => ({
      id: user.id,
      rank: index + 1,
      name: user.name,
      avatarUrl: user.avatarUrl || "",
      value: Math.round(user.value),
      trainingCount: user.trainingCount,
      latestTraining: user.latestTraining,
      tag: user.tag,
      tagClass: user.tagClass,
      ...getExtra(user)
    }));
}

function queryStreakLeaderboard(activities) {
  const todayKey = dayKey();
  const users = new Map();

  activities.forEach((activity) => mergeLeaderboardActivity(users, activity));

  return toLeaderboardRows(
    users,
    (user) => countContinuousDays(user.dateKeys, todayKey),
    (user) => ({
      unit: "天",
      latestTraining: "连续打卡",
      tag: "打卡",
      tagClass: "orange",
      trainingCountText: `累计 ${user.dateKeys.size} 天`
    })
  );
}

function queryWeeklyActivityLeaderboard(activities) {
  const { start, end } = getWeekRange();
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const users = new Map();

  activities
    .filter((activity) => activity.activityDateKey >= startKey && activity.activityDateKey < endKey)
    .forEach((activity) => mergeLeaderboardActivity(users, activity));

  return toLeaderboardRows(
    users,
    (user) => user.dateKeys.size,
    (user) => ({
      unit: "天",
      latestTraining: `${Math.round(user.totalMinutes)} 分钟`,
      tag: "本周",
      tagClass: "blue",
      trainingCountText: `共 ${user.trainingCount} 次`
    })
  );
}

function queryProgressLeaderboard(activities) {
  const todayKey = dayKey();
  const users = new Map();

  activities
    .filter((activity) => activity.activityDateKey === todayKey)
    .forEach((activity) => mergeLeaderboardActivity(users, activity));

  return toLeaderboardRows(
    users,
    (user) => user.totalMinutes,
    () => ({
      unit: "分钟",
      tag: "今日",
      tagClass: "purple"
    })
  );
}

async function queryLeaderboardByType(groupId, type) {
  if (type === "today") {
    return queryTodayLeaderboard(groupId);
  }

  const activities = await queryRankingActivities(groupId);
  if (type === "streak") return queryStreakLeaderboard(activities);
  if (type === "activity") return queryWeeklyActivityLeaderboard(activities);
  if (type === "progress") return queryProgressLeaderboard(activities);
  return queryTodayLeaderboard(groupId);
}

async function getGroupLeaderboard(event) {
  try {
    const userId = getIdentity();
    const groupId = String(event.groupId || "").trim();
    const leaderboardType = getLeaderboardType(event.leaderboardType || event.rankType);
    if (!groupId) throw new Error("缺少群组 ID");

    await seedBaseData(userId);

    const groupResult = await db.collection("groups").doc(groupId).get();
    const group = groupResult.data;
    if (!group || group.status !== "active") {
      throw new Error("群组不存在或已停用");
    }

    const membership = await getActiveMembership(groupId, userId);
    if (!membership) throw new Error("请先加入该群组");

    const rankings = await queryLeaderboardByType(groupId, leaderboardType);

    return {
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name
        },
        leaderboard: getLeaderboardMeta(leaderboardType),
        rankings,
        updatedText: "每5分钟更新一次数据"
      }
    };
  } catch (error) {
    console.error("获取群组排行榜失败", error);
    return { success: false, message: error.message || "获取群组排行榜失败" };
  }
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
      challenge,
      templates,
      rankings
    ] = await Promise.all([
      queryCurrentGoal(groupId),
      queryTodayWallMembers(groupId),
      queryActiveChallenge(groupId),
      queryTrainingTemplates(groupId),
      queryRankings(groupId)
    ]);
    const goalStats = await queryGoalStats(groupId, goal);
    const progress = await queryChallengeProgress(challenge, userId);
    const challengeDate = challenge ? formatChallengeDate(getChallengePeriod(challenge).end) : null;
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
        attendance: goalStats.attendance,
        members,
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

module.exports = { getMyGroups, getGroupDetail, getGroupLeaderboard, searchGroups, applyToGroup };

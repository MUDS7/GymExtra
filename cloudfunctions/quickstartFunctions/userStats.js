const cloud = require("wx-server-sdk");

const db = cloud.database();
const COLLECTION = "user_stats";
const TRAININGS_COLLECTION = "trainings";

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时继续使用。
  }
}

function getIdentity() {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    throw new Error("无法获取当前用户身份");
  }

  return OPENID;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date = new Date()) {
  const value = toDate(date) || new Date();
  const pad = (part) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function addDays(date, offset) {
  const value = new Date(date);
  value.setDate(value.getDate() + offset);
  return value;
}

function getComparableToday() {
  const now = new Date();
  return {
    todayKey: dayKey(now),
    yesterdayKey: dayKey(addDays(now, -1))
  };
}

function getTrainingDurationSeconds(training) {
  const durationSeconds = Number(training && training.durationSeconds);
  const durationMinutes = Number(training && training.durationMinutes);
  const timerSeconds = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  const minuteSeconds = Number.isFinite(durationMinutes) ? Math.max(0, durationMinutes * 60) : 0;

  return Math.max(timerSeconds, minuteSeconds);
}

function getNextStreak(currentStats, trainingDateKey) {
  const currentDays = Number(currentStats && currentStats.continuousCheckInDays) || 0;
  const lastKey = currentStats && currentStats.lastTrainingDateKey;
  const trainingDate = new Date(`${trainingDateKey}T00:00:00`);
  const yesterdayKey = dayKey(addDays(trainingDate, -1));

  if (lastKey === trainingDateKey) return Math.max(currentDays, 1);
  if (lastKey === yesterdayKey) return currentDays + 1;
  return 1;
}

function calculateStreak(dateKeys) {
  const uniqueKeys = Array.from(new Set(dateKeys)).sort().reverse();
  if (!uniqueKeys.length) return 0;

  const { todayKey, yesterdayKey } = getComparableToday();
  if (uniqueKeys[0] !== todayKey && uniqueKeys[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  let cursor = new Date(`${uniqueKeys[0]}T00:00:00`);

  for (let index = 1; index < uniqueKeys.length; index += 1) {
    cursor = addDays(cursor, -1);
    if (uniqueKeys[index] !== dayKey(cursor)) break;
    streak += 1;
  }

  return streak;
}

function normalizeStats(record) {
  const { todayKey, yesterdayKey } = getComparableToday();
  const lastKey = record && record.lastTrainingDateKey;
  const continuousCheckInDays = lastKey === todayKey || lastKey === yesterdayKey
    ? Number(record.continuousCheckInDays) || 0
    : 0;

  return {
    totalTrainingCount: Number(record && record.totalTrainingCount) || 0,
    continuousCheckInDays,
    totalDurationSeconds: Number(record && record.totalDurationSeconds) || 0,
    lastTrainingAt: record && record.lastTrainingAt ? record.lastTrainingAt : null,
    lastTrainingDateKey: lastKey || "",
    updatedAt: record && record.updatedAt ? record.updatedAt : null,
    extraData: record && record.extraData && typeof record.extraData === "object" ? record.extraData : {}
  };
}

async function getExistingStats(userId) {
  try {
    const result = await db.collection(COLLECTION).doc(userId).get();
    return result.data || null;
  } catch (error) {
    return null;
  }
}

async function fetchUserTrainings(userId) {
  const pageSize = 100;
  let page = 0;
  let all = [];

  while (page < 50) {
    let result;
    try {
      result = await db.collection(TRAININGS_COLLECTION)
        .where({ userId })
        .orderBy("completedAt", "desc")
        .skip(page * pageSize)
        .limit(pageSize)
        .get();
    } catch (error) {
      return all;
    }

    const data = result.data || [];
    all = all.concat(data.filter((training) => !training.status || training.status === "completed"));

    if (data.length < pageSize) break;
    page += 1;
  }

  return all;
}

async function rebuildStatsForUser(userId) {
  await ensureCollection();

  const existing = await getExistingStats(userId);
  const trainings = await fetchUserTrainings(userId);
  const dateKeys = [];
  let totalDurationSeconds = 0;
  let lastTrainingAt = null;

  trainings.forEach((training) => {
    const completedAt = toDate(training.completedAt) || toDate(training.createdAt);
    totalDurationSeconds += getTrainingDurationSeconds(training);

    if (!completedAt) return;
    dateKeys.push(dayKey(completedAt));
    if (!lastTrainingAt || completedAt > lastTrainingAt) {
      lastTrainingAt = completedAt;
    }
  });

  const data = {
    userId,
    _openid: userId,
    totalTrainingCount: trainings.length,
    continuousCheckInDays: calculateStreak(dateKeys),
    totalDurationSeconds,
    lastTrainingAt,
    lastTrainingDateKey: lastTrainingAt ? dayKey(lastTrainingAt) : "",
    extraData: existing && existing.extraData && typeof existing.extraData === "object" ? existing.extraData : {},
    createdAt: existing && existing.createdAt ? existing.createdAt : db.serverDate(),
    updatedAt: db.serverDate()
  };

  await db.collection(COLLECTION).doc(userId).set({ data });
  return normalizeStats(data);
}

async function getUserStats() {
  try {
    await ensureCollection();

    const userId = getIdentity();
    const record = await getExistingStats(userId);
    if (!record) {
      return {
        success: true,
        data: await rebuildStatsForUser(userId)
      };
    }

    const stats = normalizeStats(record);
    if (stats.continuousCheckInDays !== (Number(record.continuousCheckInDays) || 0)) {
      await db.collection(COLLECTION).doc(userId).update({
        data: {
          continuousCheckInDays: stats.continuousCheckInDays,
          updatedAt: db.serverDate()
        }
      });
    }

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error("获取用户统计失败", error);
    return {
      success: false,
      message: error.message || "获取用户统计失败"
    };
  }
}

async function syncAfterTrainingSaved(training, completedAt = new Date()) {
  await ensureCollection();

  const userId = training.userId;
  const existing = await getExistingStats(userId);
  if (!existing) {
    return rebuildStatsForUser(userId);
  }

  const completedDate = toDate(completedAt) || new Date();
  const completedDateKey = dayKey(completedDate);
  const data = {
    totalTrainingCount: (Number(existing.totalTrainingCount) || 0) + 1,
    continuousCheckInDays: getNextStreak(existing, completedDateKey),
    totalDurationSeconds: (Number(existing.totalDurationSeconds) || 0) + getTrainingDurationSeconds(training),
    lastTrainingAt: completedDate,
    lastTrainingDateKey: completedDateKey,
    updatedAt: db.serverDate()
  };

  await db.collection(COLLECTION).doc(userId).update({ data });
  return normalizeStats({ ...existing, ...data });
}

async function syncAfterTrainingDeleted(userId) {
  return rebuildStatsForUser(userId);
}

module.exports = {
  getUserStats,
  syncAfterTrainingSaved,
  syncAfterTrainingDeleted,
  rebuildStatsForUser
};

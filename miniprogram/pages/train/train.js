const trainingService = require("../../services/trainings");
const { getTrainingTags } = require("../../utils/training-tags");
const { getTrainingDrafts } = require("../../utils/training-drafts");

function formatTrainingDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (daysAgo === 0) return "今天";
  if (daysAgo === 1) return "昨天";
  if (daysAgo > 1 && daysAgo < 7) return `${daysAgo} 天前`;

  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function formatDuration(value) {
  const timer = String(value || "00:00").trim();
  const parts = timer.split(":").map(Number);

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    const minutes = parts[0] + parts[1] / 60;
    return `${Math.max(0, Math.ceil(minutes))} 分钟`;
  }

  const minutes = Number(timer);
  return Number.isFinite(minutes) ? `${Math.max(0, Math.ceil(minutes))} 分钟` : timer;
}

function getCurrentWeekRange() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);

  return { weekStart, weekEnd };
}

function parseDurationSeconds(value) {
  const timer = String(value || "00:00").trim();
  const parts = timer.split(":").map(Number);

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return Math.max(0, parts[0] * 60 + parts[1]);
  }

  const minutes = Number(timer);
  return Number.isFinite(minutes) ? Math.max(0, minutes * 60) : 0;
}

function buildWeeklyDashboard(trainings, weekStart) {
  const activeDays = new Set();
  let totalSeconds = 0;

  trainings.forEach((training) => {
    const createdAt = new Date(training.createdAt);

    if (!Number.isNaN(createdAt.getTime())) {
      const dayStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const dayIndex = Math.floor((dayStart.getTime() - weekStart.getTime()) / 86400000);

      if (dayIndex >= 0 && dayIndex < 7) {
        activeDays.add(dayIndex);
      }
    }

    totalSeconds += parseDurationSeconds(training.timer);
  });

  const labels = ["一", "二", "三", "四", "五", "六", "日"];

  return {
    weekDays: labels.map((label, index) => ({ label, active: activeDays.has(index) })),
    trainedDays: activeDays.size,
    stats: [
      { label: "本周训练", value: String(trainings.length), unit: "次", tone: "energy", icon: "icon-zap" },
      { label: "累计时长", value: String(Math.ceil(totalSeconds / 60)), unit: "分钟", tone: "cool", icon: "icon-clock" },
      { label: "消耗热量", value: "0", unit: "千卡", tone: "power", icon: "icon-flame" }
    ]
  };
}

function toWorkout(training) {
  const tags = getTrainingTags(training);

  return {
    id: training.uuid || training._id,
    draftId: training.draftId || "",
    name: training.title || "未命名训练",
    date: formatTrainingDate(training.createdAt),
    duration: formatDuration(training.timer),
    sets: Number(training.setsCount || 0),
    tags,
    tone: training.status === "incomplete" ? "incomplete" : (tags.length === 1 ? tags[0].tone : "energy")
  };
}

Page({
  data: {
    weekDays: [
      { label: "一", active: false },
      { label: "二", active: false },
      { label: "三", active: false },
      { label: "四", active: false },
      { label: "五", active: false },
      { label: "六", active: false },
      { label: "日", active: false }
    ],
    trainedDays: 0,
    stats: [
      { label: "本周训练", value: "0", unit: "次", tone: "energy", icon: "icon-zap" },
      { label: "累计时长", value: "0", unit: "分钟", tone: "cool", icon: "icon-clock" },
      { label: "消耗热量", value: "0", unit: "千卡", tone: "power", icon: "icon-flame" }
    ],
    recentWorkouts: []
  },

  onShow() {
    this.loadRecentWorkouts();
  },

  async loadRecentWorkouts() {
    try {
      const app = getApp();
      const loginResult = await app.login();

      if (!loginResult.registered) {
        return;
      }

      const { weekStart, weekEnd } = getCurrentWeekRange();
      const [recentTrainings, weeklyTrainings] = await Promise.all([
        trainingService.getRecentTrainings(),
        trainingService.getWeeklyTrainings(weekStart, weekEnd)
      ]);
      const weeklyDashboard = buildWeeklyDashboard(weeklyTrainings, weekStart);

      this.setData({
        recentWorkouts: getTrainingDrafts()
          .concat(recentTrainings)
          .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime())
          .slice(0, 5)
          .map(toWorkout),
        ...weeklyDashboard
      });
    } catch (error) {
      console.error("加载最近训练记录失败", error);
      wx.showToast({
        title: error.message || "最近记录加载失败",
        icon: "none"
      });
    }
  },

  onActionTap(event) {
    const { action, name, trainingId, draftId } = event.currentTarget.dataset;

    if (action === "viewTraining" && draftId) {
      wx.navigateTo({
        url: `/pages/new-training/new-training?mode=draft&draftId=${encodeURIComponent(draftId)}`
      });
      return;
    }

    if (action === "viewTraining" && trainingId) {
      wx.navigateTo({
        url: `/pages/new-training/new-training?mode=readonly&id=${encodeURIComponent(trainingId)}`
      });
      return;
    }

    if (action === "newTraining") {
      if (getTrainingDrafts().length > 0) {
        wx.showToast({
          title: "有未完成记录，请先完成未完成记录",
          icon: "none"
        });
        return;
      }

      wx.navigateTo({
        url: "/pages/new-training/new-training"
      });
      return;
    }

    if (action === "allTrainings") {
      wx.navigateTo({
        url: "/pages/training-records/training-records"
      });
      return;
    }

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

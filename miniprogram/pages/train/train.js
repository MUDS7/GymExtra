const trainingService = require("../../services/trainings");

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

function toWorkout(training) {
  return {
    id: training.uuid || training._id,
    name: training.title || "未命名训练",
    date: formatTrainingDate(training.createdAt),
    duration: formatDuration(training.timer),
    sets: Number(training.setsCount || 0),
    tag: "力量",
    tone: "energy"
  };
}

Page({
  data: {
    weekDays: [
      { label: "一", active: true },
      { label: "二", active: true },
      { label: "三", active: false },
      { label: "四", active: true },
      { label: "五", active: true },
      { label: "六", active: false },
      { label: "日", active: false }
    ],
    stats: [
      { label: "本周训练", value: "4", unit: "次", tone: "energy", icon: "icon-zap" },
      { label: "累计时长", value: "180", unit: "分钟", tone: "cool", icon: "icon-clock" },
      { label: "消耗热量", value: "1,240", unit: "千卡", tone: "power", icon: "icon-flame" }
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

      const trainings = await trainingService.getRecentTrainings();
      this.setData({ recentWorkouts: trainings.map(toWorkout) });
    } catch (error) {
      console.error("加载最近训练记录失败", error);
      wx.showToast({
        title: error.message || "最近记录加载失败",
        icon: "none"
      });
    }
  },

  onActionTap(event) {
    const { action, name } = event.currentTarget.dataset;

    if (action === "newTraining") {
      wx.navigateTo({
        url: "/pages/new-training/new-training"
      });
      return;
    }

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

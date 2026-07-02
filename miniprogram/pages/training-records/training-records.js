const trainingService = require("../../services/trainings");
const { getTrainingTags } = require("../../utils/training-tags");

const PAGE_SIZE = 20;

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayLabel(date) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((todayStart.getTime() - dateStart.getTime()) / 86400000);

  if (daysAgo === 0) return "今天";
  if (daysAgo === 1) return "昨天";

  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

function formatTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDuration(value) {
  const timer = String(value || "00:00").trim();
  const parts = timer.split(":").map(Number);

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return `${Math.max(0, Math.ceil(parts[0] + parts[1] / 60))} 分钟`;
  }

  const minutes = Number(timer);
  return Number.isFinite(minutes) ? `${Math.max(0, Math.ceil(minutes))} 分钟` : timer;
}

function groupTrainings(trainings) {
  const groups = [];

  trainings.forEach((training) => {
    const date = parseDate(training.createdAt);
    if (!date) return;

    const dayKey = getDayKey(date);
    let group = groups[groups.length - 1];

    if (!group || group.key !== dayKey) {
      group = { key: dayKey, label: formatDayLabel(date), records: [] };
      groups.push(group);
    }

    const tags = getTrainingTags(training);

    group.records.push({
      id: training.uuid || training._id,
      name: training.title || "未命名训练",
      time: formatTime(date),
      duration: formatDuration(training.timer),
      sets: Number(training.setsCount || 0),
      tags,
      tone: tags.length === 1 ? tags[0].tone : "energy"
    });
  });

  return groups;
}

Page({
  data: {
    groups: [],
    loading: false,
    hasMore: true
  },

  trainings: [],
  page: 0,

  onLoad() {
    this.loadRecords(true);
  },

  onReachBottom() {
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadRecords(true);
  },

  async loadRecords(reset = false) {
    if (this.data.loading || (!reset && !this.data.hasMore)) return;

    if (reset) {
      this.page = 0;
      this.trainings = [];
      this.setData({ hasMore: true });
    }

    this.setData({ loading: true });

    try {
      const app = getApp();
      const loginResult = await app.login();

      if (!loginResult.registered) {
        this.setData({ loading: false });
        return;
      }

      const result = await trainingService.getAllTrainings(this.page, PAGE_SIZE);
      this.trainings = this.trainings.concat(result.list);
      this.page += 1;
      this.setData({
        groups: groupTrainings(this.trainings),
        hasMore: result.hasMore,
        loading: false
      });
    } catch (error) {
      console.error("加载全部训练记录失败", error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "记录加载失败",
        icon: "none"
      });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onRecordTap(event) {
    const { trainingId } = event.currentTarget.dataset;
    if (!trainingId) return;

    wx.navigateTo({
      url: `/pages/new-training/new-training?mode=readonly&id=${encodeURIComponent(trainingId)}`
    });
  }
});

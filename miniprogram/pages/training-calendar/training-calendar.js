const trainingService = require("../../services/trainings");
const { getTrainingTags } = require("../../utils/training-tags");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toDayKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function getTrainingTone(training) {
  const tags = getTrainingTags(training);
  const tones = tags.map((tag) => tag.tone);

  if (tones.includes("energy") && tones.includes("cool")) return "mixed";
  if (tones.includes("cool")) return "cool";
  return "energy";
}

function buildCalendar(month, trainings) {
  const trainingDays = {};

  trainings.forEach((training) => {
    const date = new Date(training.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key = toDayKey(date);
    const tone = getTrainingTone(training);
    if (!trainingDays[key]) trainingDays[key] = [];
    if (!trainingDays[key].includes(tone)) trainingDays[key].push(tone);
  });

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `empty-${index}`, empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDayKey(new Date(month.getFullYear(), month.getMonth(), day));
    const tones = trainingDays[key] || [];
    cells.push({
      key,
      day,
      hasTraining: tones.length > 0,
      tone: tones.includes("mixed") || (tones.includes("energy") && tones.includes("cool"))
        ? "mixed"
        : (tones[0] || "")
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-${cells.length}`, empty: true });
  }

  return cells;
}

Page({
  data: {
    navTop: 24,
    navBarHeight: 32,
    navHeight: 64,
    weekdays: WEEKDAYS,
    monthLabel: "",
    calendarDays: [],
    loading: true,
    canGoNext: false
  },

  currentMonth: normalizeMonth(new Date()),
  isChangingMonth: false,

  onLoad() {
    this.setNavMetrics();
    this.loadMonth();
  },

  onShow() {
    const app = getApp();
    if (app.globalData.trainingRecordsChanged) {
      app.globalData.trainingRecordsChanged = false;
      this.loadMonth();
    }
  },

  setNavMetrics() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const navTop = menuButton.top || systemInfo.statusBarHeight || 24;
    const navBarHeight = menuButton.height || 32;

    this.setData({
      navTop,
      navBarHeight,
      navHeight: navTop + navBarHeight + 12
    });
  },

  async loadMonth() {
    const month = this.currentMonth;
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    this.setData({ loading: true });
    try {
      const trainings = await trainingService.getMonthlyTrainings(month.toISOString(), monthEnd.toISOString());
      const todayMonth = normalizeMonth(new Date());
      this.setData({
        monthLabel: `${month.getFullYear()}年${month.getMonth() + 1}月`,
        calendarDays: buildCalendar(month, trainings),
        canGoNext: !isSameMonth(month, todayMonth),
        loading: false
      });
    } catch (error) {
      console.error("加载训练日历失败", error);
      this.setData({
        monthLabel: `${month.getFullYear()}年${month.getMonth() + 1}月`,
        calendarDays: buildCalendar(month, []),
        canGoNext: !isSameMonth(month, normalizeMonth(new Date())),
        loading: false
      });
      wx.showToast({ title: "训练日历加载失败", icon: "none" });
    }
  },

  async onPreviousMonth() {
    if (this.data.loading || this.isChangingMonth) return;

    this.isChangingMonth = true;
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    try {
      await this.loadMonth();
    } finally {
      this.isChangingMonth = false;
    }
  },

  async onNextMonth() {
    const todayMonth = normalizeMonth(new Date());
    if (this.data.loading || this.isChangingMonth || isSameMonth(this.currentMonth, todayMonth)) return;

    this.isChangingMonth = true;
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    try {
      await this.loadMonth();
    } finally {
      this.isChangingMonth = false;
    }
  },

  onDateTap(event) {
    const { date, hasTraining } = event.currentTarget.dataset;
    if (!hasTraining || !date) return;

    wx.navigateTo({
      url: `/pages/training-records/training-records?date=${encodeURIComponent(date)}`
    });
  },

  onBackTap() {
    wx.navigateBack();
  }
});

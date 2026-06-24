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
    recentWorkouts: [
      {
        id: 1,
        name: "胸肌 + 三头",
        date: "今天",
        duration: "52 分钟",
        sets: 18,
        tag: "力量",
        tone: "energy"
      },
      {
        id: 2,
        name: "背部 + 二头",
        date: "昨天",
        duration: "48 分钟",
        sets: 16,
        tag: "力量",
        tone: "energy"
      },
      {
        id: 3,
        name: "有氧间歇跑",
        date: "3 天前",
        duration: "35 分钟",
        sets: 6,
        tag: "有氧",
        tone: "cool"
      },
      {
        id: 4,
        name: "肩部 + 核心",
        date: "4 天前",
        duration: "45 分钟",
        sets: 14,
        tag: "力量",
        tone: "energy"
      }
    ]
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

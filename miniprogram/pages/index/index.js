Page({
  data: {
    groups: [
      {
        id: 1,
        name: "力量训练精英组",
        members: 128,
        active: true,
        badge: "今日打卡 · 36人",
        tone: "energy"
      },
      {
        id: 2,
        name: "早起跑步打卡",
        members: 253,
        active: false,
        badge: "连续 12 天",
        tone: "cool"
      },
      {
        id: 3,
        name: "减脂百天计划",
        members: 87,
        active: true,
        badge: "活动进行中",
        tone: "vital"
      }
    ]
  },

  onGroupTap(event) {
    const { id, name } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/group-detail/group-detail?id=${id}&name=${encodeURIComponent(name)}`
    });
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

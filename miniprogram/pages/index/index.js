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
    ],
    rankList: [
      { rank: 1, name: "Chen Wei", score: "3,480", streak: 28, avatar: "C", medal: "gold" },
      { rank: 2, name: "Liu Yang", score: "3,210", streak: 21, avatar: "L", medal: "silver" },
      { rank: 3, name: "Zhang Hao", score: "2,980", streak: 18, avatar: "Z", medal: "bronze" },
      { rank: 4, name: "我", score: "2,640", streak: 14, avatar: "我", isMe: true },
      { rank: 5, name: "Wang Fang", score: "2,400", streak: 12, avatar: "W" }
    ]
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

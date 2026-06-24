Page({
  data: {
    user: {
      nickname: "Alex Zhang",
      id: "fitlog_0421",
      level: "Lv.8 精英训练者",
      avatar: "A"
    },
    stats: [
      { label: "累计训练", value: "86", unit: "次", tone: "energy" },
      { label: "连续打卡", value: "14", unit: "天", tone: "vital" },
      { label: "累计时长", value: "72", unit: "小时", tone: "cool" }
    ],
    achievements: [
      { name: "初心者", earned: true, tone: "energy" },
      { name: "坚持一周", earned: true, tone: "vital" },
      { name: "百次勇士", earned: false, tone: "muted" },
      { name: "马拉松级", earned: false, tone: "muted" }
    ],
    menuGroups: [
      {
        group: "健康数据",
        items: [
          { label: "训练趋势", desc: "查看你的进步曲线", icon: "icon-trending-up", tone: "energy" },
          { label: "训练日历", desc: "按月查看打卡记录", icon: "icon-calendar", tone: "cool" },
          { label: "我的成就", desc: "已获得 2 / 10 枚", icon: "icon-award", tone: "gold" }
        ]
      },
      {
        group: "设置",
        items: [
          { label: "提醒设置", desc: "打卡提醒与通知", icon: "icon-bell", tone: "power" },
          { label: "隐私与安全", desc: "", icon: "icon-shield", tone: "vital" },
          { label: "帮助与反馈", desc: "", icon: "icon-help-circle", tone: "muted" }
        ]
      }
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

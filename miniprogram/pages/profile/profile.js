const { getUserStats } = require("../../services/user-stats");

function formatStats(stats = {}) {
  const totalTrainingCount = Number(stats.totalTrainingCount) || 0;
  const continuousCheckInDays = Number(stats.continuousCheckInDays) || 0;
  const totalDurationSeconds = Number(stats.totalDurationSeconds) || 0;
  const totalHours = Math.ceil(totalDurationSeconds / 3600);

  return [
    { label: "累计训练", value: String(totalTrainingCount), unit: "次", tone: "energy" },
    { label: "连续打卡", value: String(continuousCheckInDays), unit: "天", tone: "vital" },
    { label: "累计时长", value: String(totalHours), unit: "小时", tone: "cool" }
  ];
}

Page({
  data: {
    user: {
      nickname: "Alex Zhang",
      id: "fitlog_0421",
      level: "Lv.8 精英训练者",
      avatar: "A"
    },
    stats: formatStats(),
    templates: [
      { name: "力量模板", icon: "icon-zap", tone: "energy" },
      { name: "燃脂模板", icon: "icon-flame", tone: "power" },
      { name: "打卡模板", icon: "icon-calendar", tone: "cool" },
      { name: "进阶模板", icon: "icon-trophy", tone: "gold" }
    ],
    menuGroups: [
      {
        group: "健康数据",
        items: [
          { label: "训练趋势", desc: "查看你的进步曲线", icon: "icon-trending-up", tone: "energy" },
          { label: "训练日历", desc: "按月查看打卡记录", icon: "icon-calendar", tone: "cool" },
          { label: "我的群组", desc: "管理我创建的群组", icon: "icon-users", tone: "gold" }
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

  onShow() {
    const app = getApp();
    const cachedUser = app.globalData.userInfo || wx.getStorageSync("userInfo");

    if (cachedUser) {
      this.showUser(cachedUser);
      this.loadUserStats();
      return;
    }

    app.login({ redirectToRegister: false }).then((result) => {
      if (!result.registered) {
        wx.reLaunch({ url: "/pages/login/login" });
        return;
      }
      this.showUser(result.user);
      this.loadUserStats();
    }).catch(() => {
      wx.showToast({ title: "用户信息加载失败", icon: "none" });
    });
  },

  showUser(user) {
    this.setData({
      user: {
        nickname: user.nickname,
        id: user.id,
        level: "GymExtra 会员",
        avatar: user.nickname.slice(0, 1).toUpperCase(),
        avatarUrl: user.avatarUrl
      }
    });
  },

  loadUserStats() {
    getUserStats().then((stats) => {
      this.setData({ stats: formatStats(stats) });
    }).catch((error) => {
      console.error("用户统计加载失败", error);
      wx.showToast({ title: "统计数据加载失败", icon: "none" });
    });
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;

    if (name === "训练趋势") {
      wx.navigateTo({ url: "/pages/action-picker/action-picker?mode=trainingTrend" });
      return;
    }

    if (name === "训练日历") {
      wx.navigateTo({ url: "/pages/training-calendar/training-calendar" });
      return;
    }

    if (name === "我的群组") {
      wx.navigateTo({ url: "/pages/group-management/group-management" });
      return;
    }

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

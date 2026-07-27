const { getUserStats } = require("../../services/user-stats");
const { getUserTemplates } = require("../../services/user-templates");

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
    isGuest: true,
    user: {
      nickname: "登录 / 注册",
      id: "登录后同步你的训练数据",
      level: "体验模式",
      avatar: "G"
    },
    stats: formatStats(),
    templates: [],
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
    app.login({ redirectToRegister: false }).then((result) => {
      if (!result.registered) {
        this.showGuest();
        return;
      }
      this.showUser(result.user);
      this.loadUserStats();
      this.loadUserTemplates(result.user.id);
    }).catch(() => {
      this.showGuest();
    });
  },

  showGuest() {
    this.setData({
      isGuest: true,
      user: {
        nickname: "登录 / 注册",
        id: "登录后同步你的训练数据",
        level: "体验模式",
        avatar: "G",
        avatarUrl: ""
      },
      stats: formatStats(),
      templates: []
    });
  },

  showUser(user) {
    this.setData({
      isGuest: false,
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

  loadUserTemplates(userId) {
    this.setData({ templates: getUserTemplates(userId).slice(0, 4) });
  },

  onActionTap(event) {
    const { name, templateId } = event.currentTarget.dataset;

    if (this.data.isGuest) {
      wx.showToast({ title: "请先点击上方信息框登录", icon: "none" });
      return;
    }

    if (templateId) {
      wx.navigateTo({
        url: `/pages/new-training/new-training?mode=templateDetail&id=${encodeURIComponent(templateId)}`
      });
      return;
    }

    if (name === "全部模板") {
      wx.navigateTo({ url: "/pages/templates/templates" });
      return;
    }

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
  },

  onProfileTap() {
    if (this.data.isGuest) {
      wx.navigateTo({ url: "/pages/login/login" });
      return;
    }

    this.onActionTap({ currentTarget: { dataset: { name: "编辑资料" } } });
  }
});

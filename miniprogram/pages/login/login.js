const app = getApp();
const auth = require("../../services/auth");

Page({
  data: {
    avatarUrl: "/images/avatar.png",
    nickname: "",
    avatarSelected: false,
    checking: true,
    submitting: false
  },

  onLoad() {
    app.login({ redirectToRegister: false, force: true }).then((result) => {
      if (result.registered) {
        app.exitExperienceMode();
        wx.switchTab({ url: "/pages/train/train" });
        return;
      }
      this.setData({ checking: false });
    }).catch(() => {
      this.setData({ checking: false });
      wx.showToast({ title: "登录失败，请检查云开发配置", icon: "none" });
    });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: "未能读取头像，可跳过后继续注册", icon: "none" });
      return;
    }

    this.setData({
      avatarUrl,
      avatarSelected: true
    });
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  async onSubmit(event) {
    // iOS 上昵称输入框的 bindinput 偶尔不会在点击按钮前同步，
    // 优先读取 form submit 携带的原生输入值。
    const formNickname = event && event.detail && event.detail.value
      ? event.detail.value.nickname
      : "";
    const nickname = String(formNickname || this.data.nickname || "").trim();
    if (!nickname) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "正在注册", mask: true });

    try {
      if (!app.globalData.userId) {
        await app.login({ redirectToRegister: false, force: true });
      }
      let avatarUrl = "/images/avatar.png";
      if (this.data.avatarSelected) {
        const upload = await auth.uploadAvatar(this.data.avatarUrl, app.globalData.userId);
        avatarUrl = upload.fileID;
      }
      const result = await auth.registerUser({
        nickname,
        avatarUrl
      });
      app.setUser(result.user);
      wx.hideLoading();
      wx.showToast({ title: "注册成功", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/train/train" }), 500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: error.message || "注册失败，请重试", icon: "none" });
    }
  }
});

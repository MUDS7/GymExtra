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
    app.login({ redirectToRegister: false }).then((result) => {
      if (result.registered) {
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
    this.setData({
      avatarUrl: event.detail.avatarUrl,
      avatarSelected: true
    });
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  async onSubmit() {
    const nickname = this.data.nickname.trim();
    if (!this.data.avatarSelected) {
      wx.showToast({ title: "请先选择微信头像", icon: "none" });
      return;
    }
    if (!nickname) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "正在注册", mask: true });

    try {
      const upload = await auth.uploadAvatar(this.data.avatarUrl, app.globalData.userId);
      const result = await auth.registerUser({
        nickname,
        avatarUrl: upload.fileID
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

const { getUserTemplates } = require("../../services/user-templates");

Page({
  data: {
    templates: []
  },

  onShow() {
    const app = getApp();
    const cachedUser = app.globalData.userInfo || wx.getStorageSync("userInfo");

    if (cachedUser) {
      this.setData({ templates: getUserTemplates(cachedUser.id) });
      return;
    }

    app.login({ redirectToRegister: false }).then((result) => {
      if (result.registered) {
        this.setData({ templates: getUserTemplates(result.user.id) });
      }
    }).catch((error) => {
      console.error("模板加载失败", error);
      wx.showToast({ title: "模板加载失败", icon: "none" });
    });
  },

  onAddTemplateTap() {
    wx.navigateTo({ url: "/pages/new-training/new-training?mode=template" });
  },

  onTemplateTap(event) {
    const { id } = event.currentTarget.dataset;

    if (!id) return;

    wx.navigateTo({
      url: `/pages/new-training/new-training?mode=templateDetail&id=${encodeURIComponent(id)}`
    });
  }
});

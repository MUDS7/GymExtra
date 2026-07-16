const { getUserTemplates } = require("../../services/user-templates");
const groupService = require("../../services/groups");

Page({
  data: {
    templates: [],
    uploadGroupId: "",
    uploadGroupName: "",
    uploading: false
  },

  onLoad(options) {
    const uploadGroupId = options.uploadGroupId ? decodeURIComponent(options.uploadGroupId) : "";
    const uploadGroupName = options.uploadGroupName ? decodeURIComponent(options.uploadGroupName) : "";
    this.setData({ uploadGroupId, uploadGroupName });
    if (uploadGroupId) {
      wx.setNavigationBarTitle({ title: "我的模板" });
    }
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

    if (this.data.uploadGroupId) {
      this.uploadTemplateToGroup(id);
      return;
    }

    wx.navigateTo({
      url: `/pages/new-training/new-training?mode=templateDetail&id=${encodeURIComponent(id)}`
    });
  },

  uploadTemplateToGroup(templateId) {
    if (this.data.uploading) return;

    const template = this.data.templates.find((item) => item.id === templateId);
    if (!template) return;

    wx.showModal({
      title: "上传模板",
      content: `确定上传「${template.name}」到${this.data.uploadGroupName || "当前群组"}吗？`,
      confirmText: "上传",
      success: async (result) => {
        if (!result.confirm) return;

        this.setData({ uploading: true });
        wx.showLoading({ title: "上传中", mask: true });
        try {
          await groupService.uploadGroupTemplate(this.data.uploadGroupId, template);
          wx.hideLoading();
          wx.showToast({ title: "模板已上传", icon: "success" });
          setTimeout(() => wx.navigateBack(), 400);
        } catch (error) {
          wx.hideLoading();
          this.setData({ uploading: false });
          wx.showToast({ title: error.message || "上传失败", icon: "none" });
        }
      }
    });
  }
});

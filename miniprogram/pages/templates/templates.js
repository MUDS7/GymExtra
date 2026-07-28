const { getUserTemplates, deleteUserTemplate } = require("../../services/user-templates");
const groupService = require("../../services/groups");

Page({
  data: {
    templates: [],
    userId: "",
    uploadGroupId: "",
    uploadGroupName: "",
    uploading: false,
    deletingTemplateId: ""
  },

  onLoad(options) {
    const uploadGroupId = options.uploadGroupId ? decodeURIComponent(options.uploadGroupId) : "";
    const uploadGroupName = options.uploadGroupName ? decodeURIComponent(options.uploadGroupName) : "";
    this.setData({ uploadGroupId, uploadGroupName });
    if (uploadGroupId) {
      wx.setNavigationBarTitle({ title: "我的模板" });
    }
  },

  async onShow() {
    const app = getApp();
    const cachedUser = app.globalData.userInfo || wx.getStorageSync("userInfo");

    if (cachedUser) {
      try {
        this.setData({ userId: cachedUser.id, templates: await getUserTemplates(cachedUser.id) });
      } catch (error) {
        console.error("模板加载失败", error);
        wx.showToast({ title: error.message || "模板加载失败", icon: "none" });
      }
      return;
    }

    app.login({ redirectToRegister: false }).then(async (result) => {
      if (result.registered) {
        this.setData({ userId: result.user.id, templates: await getUserTemplates(result.user.id) });
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

    if (this.suppressTemplateTapId === id) {
      this.suppressTemplateTapId = "";
      return;
    }

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
  },

  onTemplateTouchStart(event) {
    if (this.data.uploadGroupId || this.data.deletingTemplateId) return;
    const { id } = event.currentTarget.dataset;
    if (!id) return;

    this.clearTemplateLongPressTimer();
    this.templateLongPressTimer = setTimeout(() => {
      this.templateLongPressTimer = null;
      this.suppressTemplateTapId = id;
      this.confirmDeleteTemplate(id);
    }, 1000);
  },

  onTemplateTouchEnd() {
    this.clearTemplateLongPressTimer();
    if (this.suppressTemplateTapId) {
      setTimeout(() => {
        this.suppressTemplateTapId = "";
      }, 200);
    }
  },

  onTemplateTouchCancel() {
    this.clearTemplateLongPressTimer();
    this.suppressTemplateTapId = "";
  },

  clearTemplateLongPressTimer() {
    if (this.templateLongPressTimer) {
      clearTimeout(this.templateLongPressTimer);
      this.templateLongPressTimer = null;
    }
  },

  confirmDeleteTemplate(templateId) {
    const template = this.data.templates.find((item) => item.id === templateId);
    if (!template || !this.data.userId) return;

    wx.showModal({
      title: "删除模板",
      content: `确定删除“${template.name}”吗？删除后不可恢复。`,
      confirmText: "删除",
      confirmColor: "#E54D4D",
      success: async ({ confirm }) => {
        if (!confirm) return;

        this.setData({ deletingTemplateId: templateId });
        try {
          await deleteUserTemplate(this.data.userId, templateId);
          this.setData({ templates: this.data.templates.filter((item) => item.id !== templateId) });
          wx.showToast({ title: "模板已删除", icon: "success" });
        } catch (error) {
          wx.showToast({ title: error.message || "删除失败，请重试", icon: "none" });
        } finally {
          this.setData({ deletingTemplateId: "" });
        }
      }
    });
  },

  onUnload() {
    this.clearTemplateLongPressTimer();
  }
});

const groupService = require("../../services/groups");

const TEMPLATE_APPEARANCES = [
  { icon: "icon-zap", tone: "energy" },
  { icon: "icon-flame", tone: "power" },
  { icon: "icon-calendar", tone: "cool" },
  { icon: "icon-trophy", tone: "gold" },
  { icon: "icon-zap", tone: "vital" }
];

Page({
  data: {
    groupId: "",
    groupName: "群组",
    templates: [],
    loading: true,
    managementMode: false,
    deletingTemplateId: ""
  },

  onLoad(options) {
    const groupId = options.groupId ? decodeURIComponent(options.groupId) : "";
    const groupName = options.groupName ? decodeURIComponent(options.groupName) : "群组";
    const managementMode = String(options.manage || "") === "1";
    this.setData({ groupId, groupName, managementMode });
    if (managementMode) {
      wx.setNavigationBarTitle({ title: "全部模板" });
    }
    if (!groupId) {
      this.setData({ loading: false });
      return;
    }
    this.loadTemplates();
  },

  async loadTemplates() {
    this.setData({ loading: true });
    try {
      const templates = await groupService.getGroupTemplates(this.data.groupId);
      this.setData({
        templates: templates.map((template, index) => ({
          ...TEMPLATE_APPEARANCES[index % TEMPLATE_APPEARANCES.length],
          ...template
        })),
        loading: false
      });
      this.templatesLoaded = true;
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "模板加载失败", icon: "none" });
    }
  },

  onShow() {
    if (this.templatesLoaded) {
      this.loadTemplates();
    }
  },

  onUploadTemplateTap() {
    wx.navigateTo({
      url: `/pages/templates/templates?uploadGroupId=${encodeURIComponent(this.data.groupId)}&uploadGroupName=${encodeURIComponent(this.data.groupName)}`
    });
  },

  onTemplateTap(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) return;

    if (this.suppressTemplateTapId === id) {
      this.suppressTemplateTapId = "";
      return;
    }

    wx.navigateTo({
      url: `/pages/new-training/new-training?mode=groupTemplateDetail&groupId=${encodeURIComponent(this.data.groupId)}&id=${encodeURIComponent(id)}`
    });
  },

  onTemplateTouchStart(event) {
    if (!this.data.managementMode || this.data.deletingTemplateId) return;
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
    if (!template) return;

    wx.showModal({
      title: "删除模板",
      content: `确定删除“${template.name}”吗？删除后不可恢复。`,
      confirmText: "删除",
      confirmColor: "#E54D4D",
      success: async ({ confirm }) => {
        if (!confirm) return;

        this.setData({ deletingTemplateId: templateId });
        try {
          await groupService.deleteGroupTemplate(this.data.groupId, templateId);
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

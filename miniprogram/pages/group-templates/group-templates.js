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
    loading: true
  },

  onLoad(options) {
    const groupId = options.groupId ? decodeURIComponent(options.groupId) : "";
    const groupName = options.groupName ? decodeURIComponent(options.groupName) : "群组";
    this.setData({ groupId, groupName });
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

    wx.navigateTo({
      url: `/pages/new-training/new-training?mode=groupTemplateDetail&groupId=${encodeURIComponent(this.data.groupId)}&id=${encodeURIComponent(id)}`
    });
  }
});

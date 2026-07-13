const groupService = require("../../services/groups");

Page({
  data: {
    groupId: "",
    groupName: "群组管理",
    activeTab: "goals",
    goalPresets: [],
    members: [],
    applications: [],
    loading: true,
    settingGoalId: ""
  },

  onLoad(options) {
    this.setData({
      groupId: String(options.id || ""),
      groupName: options.name ? decodeURIComponent(options.name) : "群组管理"
    });
  },

  onShow() {
    if (this.data.groupId) this.loadDetail();
  },

  async loadDetail() {
    if (!this.data.groupId) return;
    this.setData({ loading: true });
    try {
      const detail = await groupService.getManagedGroupDetail(this.data.groupId);
      const members = Array.isArray(detail.members) ? detail.members : [];
      const applications = Array.isArray(detail.applications) ? detail.applications : [];
      this.setData({
        groupName: (detail.group && detail.group.name) || this.data.groupName,
        goalPresets: Array.isArray(detail.goalPresets) ? detail.goalPresets : [],
        members,
        applications,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "群组数据加载失败", icon: "none" });
    }
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => wx.stopPullDownRefresh());
  },

  onTabTap(event) {
    const { tab } = event.currentTarget.dataset;
    if (tab) this.setData({ activeTab: tab });
  },

  async onSetGoal(event) {
    const { presetId, configured } = event.currentTarget.dataset;
    if (!presetId || configured || this.data.settingGoalId) return;
    this.setData({ settingGoalId: presetId });
    try {
      await groupService.setManagedGroupGoal(this.data.groupId, presetId);
      wx.showToast({ title: "群目标已设置", icon: "success" });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({ title: error.message || "设置失败", icon: "none" });
    } finally {
      this.setData({ settingGoalId: "" });
    }
  },

});

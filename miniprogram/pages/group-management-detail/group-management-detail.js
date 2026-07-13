const groupService = require("../../services/groups");

function formatGroupId(groupId) {
  const id = String(groupId || "");
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

Page({
  data: {
    groupId: "",
    groupIdDisplay: "",
    groupName: "群组管理",
    activeTab: "goals",
    goalPresets: [],
    members: [],
    applications: [],
    loading: true,
    settingGoalId: "",
    approvingApplicationId: ""
  },

  onLoad(options) {
    const groupId = String(options.id || "");
    this.setData({
      groupId,
      groupIdDisplay: formatGroupId(groupId),
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
      const groupId = (detail.group && detail.group.id) || this.data.groupId;
      this.setData({
        groupId,
        groupIdDisplay: formatGroupId(groupId),
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

  onCopyGroupId() {
    if (!this.data.groupId) return;
    wx.setClipboardData({
      data: this.data.groupId,
      success: () => wx.showToast({ title: "群号已复制", icon: "success" }),
      fail: () => wx.showToast({ title: "复制失败，请重试", icon: "none" })
    });
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

  async onApproveApplication(event) {
    const { applicationId } = event.currentTarget.dataset;
    if (!applicationId || this.data.approvingApplicationId) return;

    this.setData({ approvingApplicationId: applicationId });
    try {
      await groupService.approveGroupApplication(this.data.groupId, applicationId);
      wx.showToast({ title: "已同意申请", icon: "success" });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({ title: error.message || "操作失败", icon: "none" });
    } finally {
      this.setData({ approvingApplicationId: "" });
    }
  },

});

const groupService = require("../../services/groups");

Page({
  data: {
    groups: [],
    loading: true,
    showCreateModal: false,
    newGroupName: "",
    creating: false
  },

  onShow() {
    this.loadManagedGroups();
  },

  async loadManagedGroups() {
    if (this.data.loading === false) {
      this.setData({ loading: true });
    }

    try {
      const groups = await groupService.getManagedGroups();
      this.setData({ groups, loading: false });
    } catch (error) {
      console.error("加载我创建的群组失败", error);
      this.setData({ groups: [], loading: false });
      wx.showToast({ title: error.message || "群组加载失败", icon: "none" });
    }
  },

  onPullDownRefresh() {
    this.loadManagedGroups().finally(() => wx.stopPullDownRefresh());
  },

  onGroupTap(event) {
    const { id, name } = event.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/group-management-detail/group-management-detail?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name || "")}`
    });
  },

  openCreateModal() {
    this.setData({ showCreateModal: true, newGroupName: "", creating: false });
  },

  closeCreateModal() {
    if (this.data.creating) return;
    this.setData({ showCreateModal: false, newGroupName: "" });
  },

  onGroupNameInput(event) {
    this.setData({ newGroupName: event.detail.value });
  },

  async confirmCreateGroup() {
    const name = this.data.newGroupName.trim();
    if (!name) {
      wx.showToast({ title: "请输入群组名", icon: "none" });
      return;
    }
    if (this.data.creating) return;

    this.setData({ creating: true });
    try {
      await groupService.createGroup(name);
      this.setData({ showCreateModal: false, newGroupName: "", creating: false });
      wx.showToast({ title: "群组创建成功", icon: "success" });
      await this.loadManagedGroups();
    } catch (error) {
      this.setData({ creating: false });
      wx.showModal({
        title: "提示",
        content: error.message || "创建群组失败",
        showCancel: false,
        confirmText: "知道了"
      });
    }
  }
});

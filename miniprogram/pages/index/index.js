const groupService = require("../../services/groups");

Page({
  data: {
    groups: [],
    loading: false
  },

  onShow() {
    this.loadGroups();
  },

  async loadGroups() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const groups = await groupService.getMyGroups();
      this.setData({ groups, loading: false });
    } catch (error) {
      console.error("群组列表加载失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "群组加载失败", icon: "none" });
    }
  },

  onGroupTap(event) {
    const { id, name } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/group-detail/group-detail?id=${id}&name=${encodeURIComponent(name)}`
    });
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  }
});

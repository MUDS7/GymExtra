const groupService = require("../../services/groups");

Page({
  data: {
    groupId: "1",
    groupName: "群组详情",
    headerTop: 64,
    members: [],
    templates: [],
    attendance: [],
    goal: null,
    rankings: null,
    challenge: null,
    loading: true
  },

  onLoad(options) {
    const name = options.name ? decodeURIComponent(options.name) : "群组详情";
    const groupId = String(options.id || "1");
    const menuButton = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;

    this.setData({
      groupId,
      groupName: name,
      headerTop: menuButton && menuButton.bottom ? menuButton.bottom + 8 : 64
    });

    this.loadGroupDetail(groupId);
  },

  async loadGroupDetail(groupId) {
    try {
      const detail = await groupService.getGroupDetail(groupId);
      this.setData({
        groupName: detail.group.name,
        goal: detail.goal,
        attendance: detail.attendance || [],
        members: detail.members || [],
        rankings: detail.rankings,
        challenge: detail.challenge,
        templates: detail.templates || [],
        loading: false
      });
    } catch (error) {
      console.error("群组详情加载失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "详情加载失败", icon: "none" });
    }
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;
    wx.showToast({ title: `${name} 待接入`, icon: "none" });
  },

  onTabTap(event) {
    wx.switchTab({ url: event.currentTarget.dataset.url });
  }
});

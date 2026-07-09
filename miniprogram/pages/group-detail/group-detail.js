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

  onShow() {
    if (this.detailLoaded && this.data.groupId) {
      this.loadGroupDetail(this.data.groupId, { silent: true });
    }
  },

  async loadGroupDetail(groupId, options = {}) {
    if (!options.silent) {
      this.setData({ loading: true });
    }

    try {
      const detail = await groupService.getGroupDetail(groupId);
      const challenge = detail.challenge || (
        options.silent && this.pendingCheckInRefresh ? this.data.challenge : null
      );
      this.detailLoaded = true;
      this.pendingCheckInRefresh = false;
      this.setData({
        groupName: detail.group.name,
        goal: detail.goal,
        attendance: detail.attendance || [],
        members: detail.members || [],
        rankings: detail.rankings,
        challenge,
        templates: detail.templates || [],
        loading: false
      });
    } catch (error) {
      console.error("群组详情加载失败", error);
      this.detailLoaded = true;
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "详情加载失败", icon: "none" });
    }
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onActionTap(event) {
    const { action, name } = event.currentTarget.dataset;

    if (action === "checkIn") {
      this.pendingCheckInRefresh = true;
      wx.navigateTo({
        url: `/pages/new-training/new-training?groupId=${encodeURIComponent(this.data.groupId)}&groupName=${encodeURIComponent(this.data.groupName)}&sharedToGroup=1`
      });
      return;
    }

    wx.showToast({ title: `${name} 待接入`, icon: "none" });
  },

  onTabTap(event) {
    wx.switchTab({ url: event.currentTarget.dataset.url });
  }
});

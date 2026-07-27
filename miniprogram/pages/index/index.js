const groupService = require("../../services/groups");

Page({
  data: {
    groups: [],
    loading: false,
    isGuest: true,
    showDiscoverModal: false,
    discoverKeyword: "",
    searchResults: [],
    searchLoading: false,
    hasSearched: false
  },

  onShow() {
    this.loadGroups();
  },

  async loadGroups() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const loginResult = await getApp().login({ redirectToRegister: false });
      if (!loginResult.registered) {
        this.setData({ groups: [], loading: false, isGuest: true });
        return;
      }

      const groups = await groupService.getMyGroups();
      this.setData({ groups, loading: false, isGuest: false });
    } catch (error) {
      console.error("群组列表加载失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "群组加载失败", icon: "none" });
    }
  },

  onGroupTap(event) {
    if (this.data.isGuest) {
      this.showGuestNotice();
      return;
    }

    const { id, name } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/group-detail/group-detail?id=${id}&name=${encodeURIComponent(name)}`
    });
  },

  onActionTap(event) {
    if (this.data.isGuest) {
      this.showGuestNotice();
      return;
    }

    const { name } = event.currentTarget.dataset;

    wx.showToast({
      title: `${name} 待接入`,
      icon: "none"
    });
  },

  openDiscoverModal() {
    if (this.data.isGuest) {
      this.showGuestNotice();
      return;
    }

    this.setData({
      showDiscoverModal: true,
      discoverKeyword: "",
      searchResults: [],
      searchLoading: false,
      hasSearched: false
    });
  },

  onDiscoverInput(event) {
    this.setData({
      discoverKeyword: event.detail.value,
      searchResults: [],
      hasSearched: false
    });
  },

  closeDiscoverModal() {
    this.setData({
      showDiscoverModal: false,
      discoverKeyword: "",
      searchResults: [],
      searchLoading: false,
      hasSearched: false
    });
  },

  async searchDiscoverGroups() {
    if (this.data.isGuest) {
      this.showGuestNotice();
      return;
    }

    const keyword = this.data.discoverKeyword.trim();

    if (!keyword) {
      wx.showToast({ title: "请输入群组名称或群号", icon: "none" });
      return;
    }

    if (this.data.searchLoading) return;
    this.setData({ searchLoading: true, hasSearched: false });

    try {
      const searchResults = await groupService.searchGroups(keyword);
      this.setData({ searchResults, searchLoading: false, hasSearched: true });
    } catch (error) {
      console.error("搜索群组失败", error);
      this.setData({ searchResults: [], searchLoading: false, hasSearched: true });
      wx.showToast({ title: error.message || "搜索群组失败", icon: "none" });
    }
  },

  async applyToGroup(event) {
    if (this.data.isGuest) {
      this.showGuestNotice();
      return;
    }

    const { id } = event.currentTarget.dataset;
    if (!id) return;

    try {
      const result = await groupService.applyToGroup(id);
      const searchResults = this.data.searchResults.map((item) => (
        item.id === id
          ? { ...item, relationStatus: result.status, actionText: result.actionText }
          : item
      ));
      this.setData({ searchResults });
      wx.showToast({
        title: result.status === "joined" ? "您已加入该群组" : "申请已提交",
        icon: result.status === "joined" ? "none" : "success"
      });
    } catch (error) {
      console.error("申请加入群组失败", error);
      wx.showToast({ title: error.message || "申请失败", icon: "none" });
    }
  },

  showGuestNotice() {
    wx.showToast({ title: "登录后即可使用群组功能", icon: "none" });
  }
});

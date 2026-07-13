const groupService = require("../../services/groups");
const TODAY_WALL_DISPLAY_LIMIT = 5;

function getTrainingTags(member) {
  const categoryIds = Array.isArray(member.categoryIds) && member.categoryIds.length
    ? member.categoryIds
    : [member.categoryId];
  const categories = categoryIds.filter(Boolean);
  const hasCardio = categories.includes("cardio");
  const hasStrength = categories.some((categoryId) => categoryId !== "cardio") || !hasCardio;
  const tags = [];

  if (hasStrength) tags.push({ label: "力量", tone: "energy" });
  if (hasCardio) tags.push({ label: "有氧", tone: "cool" });

  return tags;
}

function normalizeWallMembers(members) {
  const source = Array.isArray(members) ? members : [];
  return source.slice(0, TODAY_WALL_DISPLAY_LIMIT).map((member) => {
    const tags = member.checkedIn
      ? (Array.isArray(member.tags) && member.tags.length ? member.tags : getTrainingTags(member))
      : [{ label: member.tag || "未打卡", tone: "incomplete" }];
    return {
      ...member,
      tags,
      state: member.state || "已完成",
      stateClass: member.stateClass || "done"
    };
  });
}

function buildWallState(members, loading) {
  const wallMembers = normalizeWallMembers(members);
  const hasWallMembers = wallMembers.length > 0;
  return {
    members: wallMembers,
    hasWallMembers,
    showWallSkeleton: Boolean(loading && !hasWallMembers),
    showWallPlaceholder: Boolean(!loading && !hasWallMembers)
  };
}

Page({
  data: {
    groupId: "1",
    groupName: "群组详情",
    headerTop: 64,
    members: [],
    hasWallMembers: false,
    showWallSkeleton: true,
    showWallPlaceholder: false,
    templates: [],
    attendance: [],
    goal: null,
    rankings: null,
    challenge: null,
    placeholderAttendance: [1, 2, 3, 4, 5, 6],
    placeholderMembers: [1, 2, 3],
    placeholderRankings: [1, 2, 3],
    placeholderTemplates: [1, 2],
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
      this.setData({
        loading: true,
        showWallSkeleton: !this.data.hasWallMembers,
        showWallPlaceholder: false
      });
    }

    try {
      const detail = await groupService.getGroupDetail(groupId);
      const challenge = detail.challenge || (
        options.silent && this.pendingCheckInRefresh ? this.data.challenge : null
      );
      const wallState = buildWallState(detail.members, false);
      this.detailLoaded = true;
      this.pendingCheckInRefresh = false;
      this.setData({
        groupName: detail.group && detail.group.name ? detail.group.name : this.data.groupName,
        goal: detail.goal || null,
        attendance: detail.attendance || [],
        ...wallState,
        rankings: detail.rankings,
        challenge,
        templates: detail.templates || [],
        loading: false
      });
    } catch (error) {
      console.error("群组详情加载失败", error);
      this.detailLoaded = true;
      const wallState = buildWallState(this.data.members, false);
      this.setData({
        ...wallState,
        loading: false
      });
      wx.showToast({ title: error.message || "详情加载失败", icon: "none" });
    }
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onActionTap(event) {
    const { action, name, rankType } = event.currentTarget.dataset;

    if (action === "checkIn") {
      this.pendingCheckInRefresh = true;
      wx.navigateTo({
        url: `/pages/new-training/new-training?groupId=${encodeURIComponent(this.data.groupId)}&groupName=${encodeURIComponent(this.data.groupName)}&sharedToGroup=1`
      });
      return;
    }

    if (action === "leaderboard") {
      wx.navigateTo({
        url: `/pages/group-leaderboard/group-leaderboard?groupId=${encodeURIComponent(this.data.groupId)}&groupName=${encodeURIComponent(this.data.groupName)}&leaderboardType=${encodeURIComponent(rankType || "today")}`
      });
      return;
    }

    wx.showToast({ title: `${name} 待接入`, icon: "none" });
  },

  onTabTap(event) {
    wx.switchTab({ url: event.currentTarget.dataset.url });
  }
});

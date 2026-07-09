const groupService = require("../../services/groups");

function formatNumber(value) {
  return String(Math.max(0, Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getInitial(name) {
  return String(name || "群成员").trim().slice(0, 1) || "群";
}

function buildEmptyRank(rank) {
  return {
    id: `empty-${rank}`,
    rank,
    rankClass: rank === 1 ? "first" : rank === 2 ? "second" : "third",
    empty: true,
    name: "暂无",
    avatarUrl: "",
    initial: "—",
    valueText: "0",
    unit: "分钟",
    tag: "待上榜",
    tagClass: "orange",
    latestTraining: "完成训练后点亮榜单",
    trainingCountText: ""
  };
}

function normalizeRank(item, index) {
  const rank = Number(item.rank || index + 1);
  const trainingCount = Number(item.trainingCount || 0);

  return {
    id: item.id || `rank-${rank}`,
    rank,
    rankClass: rank === 1 ? "first" : rank === 2 ? "second" : "third",
    empty: false,
    name: item.name || "群成员",
    avatarUrl: item.avatarUrl || "",
    initial: getInitial(item.name),
    value: Number(item.value || 0),
    valueText: formatNumber(item.value),
    unit: item.unit || "分钟",
    tag: item.tag || "训练",
    tagClass: item.tagClass || "orange",
    latestTraining: item.latestTraining || "今日训练",
    trainingCountText: item.trainingCountText || (trainingCount > 1 ? `共 ${trainingCount} 次` : "今日完成")
  };
}

function buildPodium(rankings) {
  const byRank = rankings.reduce((result, item) => {
    if (item.rank <= 3) result[item.rank] = item;
    return result;
  }, {});

  return [2, 1, 3].map((rank) => byRank[rank] || buildEmptyRank(rank));
}

Page({
  data: {
    navTop: 24,
    navBarHeight: 32,
    navHeight: 64,
    groupId: "",
    groupName: "群组",
    leaderboardType: "today",
    leaderboardTitle: "今日训练榜",
    leaderboardSubtitle: "今日训练墙 · 总运动时长",
    scoreIcon: "🔥",
    scoreLabel: "总运动时长",
    emptyTitle: "暂无今日排名",
    emptyCopy: "完成并分享到群组的训练会出现在这里",
    podium: buildPodium([]),
    rankings: [],
    remainingRankings: [],
    placeholderRows: [1, 2, 3, 4, 5],
    updatedText: "每5分钟更新一次数据",
    loading: true
  },

  onLoad(options) {
    const groupId = String(options.groupId || options.id || "1");
    const groupName = options.groupName ? decodeURIComponent(options.groupName) : "群组";
    const leaderboardType = String(options.leaderboardType || options.rankType || "today");

    this.setNavMetrics();
    this.setData({ groupId, groupName, leaderboardType });
    this.loadLeaderboard();
  },

  onPullDownRefresh() {
    this.loadLeaderboard({ silent: true });
  },

  setNavMetrics() {
    const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 24;
    const navTop = menuButton && menuButton.top ? menuButton.top : statusBarHeight + 6;
    const navBarHeight = menuButton && menuButton.height ? menuButton.height : 32;

    this.setData({
      navTop,
      navBarHeight,
      navHeight: navTop + navBarHeight + 8
    });
  },

  async loadLeaderboard(options = {}) {
    if (!options.silent) {
      this.setData({ loading: true });
    }

    try {
      const app = getApp();
      await app.login();

      const detail = await groupService.getGroupLeaderboard(this.data.groupId, this.data.leaderboardType);
      const rankings = (detail.rankings || []).map(normalizeRank);
      const leaderboard = detail.leaderboard || {};

      this.setData({
        groupName: detail.group && detail.group.name ? detail.group.name : this.data.groupName,
        leaderboardType: leaderboard.type || this.data.leaderboardType,
        leaderboardTitle: leaderboard.title || this.data.leaderboardTitle,
        leaderboardSubtitle: leaderboard.subtitle || this.data.leaderboardSubtitle,
        scoreIcon: leaderboard.scoreIcon || this.data.scoreIcon,
        scoreLabel: leaderboard.scoreLabel || this.data.scoreLabel,
        emptyTitle: leaderboard.emptyTitle || this.data.emptyTitle,
        emptyCopy: leaderboard.emptyCopy || this.data.emptyCopy,
        podium: buildPodium(rankings),
        rankings,
        remainingRankings: rankings.filter((item) => item.rank > 3),
        updatedText: detail.updatedText || "每5分钟更新一次数据",
        loading: false
      });
    } catch (error) {
      console.error("排行榜加载失败", error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "排行榜加载失败", icon: "none" });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onBackTap() {
    const pages = getCurrentPages();

    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }

    wx.switchTab({ url: "/pages/index/index" });
  }
});

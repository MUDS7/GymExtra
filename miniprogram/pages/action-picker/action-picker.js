const { ACTION_TABLE } = require("../../data/actions");
const actionService = require("../../services/actions");

let actionTable = ACTION_TABLE;

const categories = [
  { id: "chest", name: "胸" },
  { id: "back", name: "背" },
  { id: "legs", name: "腿" },
  { id: "shoulders", name: "肩" },
  { id: "biceps", name: "二头" },
  { id: "triceps", name: "三头" },
  { id: "glutes", name: "臀部" },
  { id: "core", name: "核心" },
  { id: "cardio", name: "有氧运动" }
];

function buildActions(categoryId, keyword = "") {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return actionTable.filter((action) => {
    const matchesCategory = normalizedKeyword || action.categoryId === categoryId;
    const matchesKeyword = !normalizedKeyword || action.name.toLowerCase().includes(normalizedKeyword);
    return matchesCategory && matchesKeyword;
  });
}

Page({
  data: {
    categories,
    activeCategory: "chest",
    activeCategoryName: "胸",
    keyword: "",
    actions: buildActions("chest"),
    headerHeight: 128,
    toolbarTop: 76
  },

  onLoad() {
    this.setHeaderMetrics();
    this.loadActions();
  },

  loadActions() {
    actionService.getActions().then((actions) => {
      actionTable = actions;
      this.setData({
        actions: buildActions(this.data.activeCategory, this.data.keyword)
      });
    });
  },

  setHeaderMetrics() {
    const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 24;
    const toolbarHeight = 38;
    const toolbarTop = menuButton && menuButton.bottom ? menuButton.bottom + 14 : statusBarHeight + 56;

    this.setData({
      toolbarTop,
      headerHeight: toolbarTop + toolbarHeight + 20
    });
  },

  onCloseTap() {
    wx.navigateBack();
  },

  onCategoryTap(event) {
    const { id, name } = event.currentTarget.dataset;

    this.setData({
      activeCategory: id,
      activeCategoryName: name,
      actions: buildActions(id, this.data.keyword)
    });
  },

  onSearchInput(event) {
    const keyword = event.detail.value;

    this.setData({
      keyword,
      actions: buildActions(this.data.activeCategory, keyword)
    });
  },

  onActionTap(event) {
    const id = Number(event.currentTarget.dataset.id);
    const selectedAction = this.data.actions.find((item) => item.id === id);
    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;

    if (selectedAction && previousPage && typeof previousPage.addTrainingAction === "function") {
      previousPage.addTrainingAction(selectedAction);
    }

    wx.navigateBack();
  }
});

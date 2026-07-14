const { ACTION_TABLE } = require("../../data/actions");
const actionService = require("../../services/actions");
const customActionService = require("../../services/custom-actions");

let actionTable = ACTION_TABLE;
let customActionTable = [];

const categories = [
  { id: "chest", name: "胸" },
  { id: "back", name: "背" },
  { id: "legs", name: "腿" },
  { id: "shoulders", name: "肩" },
  { id: "biceps", name: "二头" },
  { id: "triceps", name: "三头" },
  { id: "glutes", name: "臀部" },
  { id: "core", name: "核心" },
  { id: "cardio", name: "有氧运动" },
  { id: "custom", name: "自定义" }
];

function buildActions(categoryId, keyword = "") {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const source = categoryId === "custom" ? customActionTable : actionTable;

  return source.filter((action) => {
    const matchesCategory = categoryId === "custom" || normalizedKeyword || action.categoryId === categoryId;
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
    toolbarTop: 76,
    showCustomActionDialog: false,
    customActionName: "",
    customActionCategory: "strength",
    creatingCustomAction: false
  },

  onLoad() {
    this.setHeaderMetrics();
    this.loadActions();
    this.loadCustomActions();
  },

  loadActions() {
    actionService.getActions().then((actions) => {
      actionTable = actions;
      this.refreshActions();
    });
  },

  loadCustomActions() {
    return customActionService.getCustomActions().then((actions) => {
      customActionTable = actions;
      this.refreshActions();
    });
  },

  refreshActions() {
    this.setData({
      actions: buildActions(this.data.activeCategory, this.data.keyword)
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
    const id = String(event.currentTarget.dataset.id);
    const selectedAction = this.data.actions.find((item) => String(item.id) === id);
    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;

    if (selectedAction && previousPage && typeof previousPage.addTrainingAction === "function") {
      previousPage.addTrainingAction(selectedAction);
    }

    wx.navigateBack();
  },

  onOpenCustomActionDialog() {
    this.setData({ showCustomActionDialog: true });
  },

  onCloseCustomActionDialog() {
    if (this.data.creatingCustomAction) return;
    this.setData({ showCustomActionDialog: false });
  },

  onCustomActionDialogTap() {},

  onCustomActionNameInput(event) {
    this.setData({ customActionName: event.detail.value });
  },

  onCustomActionCategoryTap(event) {
    this.setData({ customActionCategory: event.currentTarget.dataset.category });
  },

  onCreateCustomAction() {
    const name = this.data.customActionName.trim();
    if (!name) {
      wx.showToast({ title: "请输入动作名称", icon: "none" });
      return;
    }

    this.setData({ creatingCustomAction: true });
    customActionService.createCustomAction({
      name,
      categoryId: this.data.customActionCategory
    }).then((action) => {
      customActionTable = [action].concat(customActionTable.filter((item) => item.id !== action.id));
      this.setData({
        showCustomActionDialog: false,
        customActionName: "",
        customActionCategory: "strength",
        actions: buildActions(this.data.activeCategory, this.data.keyword)
      });
      wx.showToast({ title: "添加成功", icon: "success" });
    }).catch((error) => {
      wx.showToast({ title: error.message || "添加失败，请重试", icon: "none" });
    }).finally(() => {
      this.setData({ creatingCustomAction: false });
    });
  }
});

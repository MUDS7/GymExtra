const { ACTION_TABLE } = require("../../data/actions");
const actionService = require("../../services/actions");
const customActionService = require("../../services/custom-actions");
const { cacheActionIcons } = require("../../services/action-icon-cache");

let actionTable = ACTION_TABLE;
let customActionTable = [];
const pendingCategoryIconLoads = Object.create(null);
const iconBatchStates = Object.create(null);
const ICON_BATCH_SIZE = 6;

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

function getBackActionGroup(action) {
  if (/(下拉|引体向上|直臂下压|面拉|哑铃后拉|哑铃上拉)/.test(action.name)) {
    return "pull";
  }

  if (action.name.includes("划船")) {
    return "row";
  }

  return "other";
}

function buildBackActionGroups(actions) {
  const groups = [
    { id: "pull", title: "拉类", actions: [] },
    { id: "row", title: "划类", actions: [] },
    { id: "other", title: "其他", actions: [] }
  ];

  const groupById = groups.reduce((result, group) => {
    result[group.id] = group;
    return result;
  }, {});

  actions.forEach((action) => {
    groupById[getBackActionGroup(action)].actions.push(action);
  });

  return groups.filter((group) => group.actions.length);
}

function buildActionData(categoryId, keyword = "") {
  const actions = buildActions(categoryId, keyword).map((action) => ({
    ...action,
    // 未请求的卡片保持空白，避免 image 组件自行触发下载。
    displayIconPath: action.iconCached ? action.iconPath : ""
  }));

  return {
    actions,
    actionGroups: categoryId === "back" ? buildBackActionGroups(actions) : []
  };
}

Page({
  data: {
    categories,
    activeCategory: "chest",
    activeCategoryName: "胸",
    keyword: "",
    ...buildActionData("chest"),
    headerHeight: 128,
    toolbarTop: 76,
    showCustomActionDialog: false,
    customActionName: "",
    customActionCategory: "strength",
    creatingCustomAction: false,
    deletingCustomAction: false
  },

  onLoad(options = {}) {
    this.pickerMode = options.mode || "";
    this.setHeaderMetrics();
    this.loadActions();
    this.loadCustomActions();
  },

  loadActions() {
    actionService.getActions().then((actions) => {
      actionTable = actions;
      Object.keys(iconBatchStates).forEach((key) => delete iconBatchStates[key]);
      this.refreshActions();
      this.loadNextIconBatch();
    });
  },

  loadCustomActions() {
    return customActionService.getCustomActions().then((actions) => {
      customActionTable = actions;
      this.refreshActions();
    });
  },

  refreshActions() {
    this.setData(buildActionData(this.data.activeCategory, this.data.keyword));
  },

  getIconBatchKey() {
    const { activeCategory, keyword } = this.data;
    return keyword ? `search:${keyword.trim().toLowerCase()}` : `category:${activeCategory}`;
  },

  loadNextIconBatch() {
    const { activeCategory, keyword } = this.data;

    if (activeCategory === "custom") return Promise.resolve();

    const actions = buildActions(activeCategory, keyword);
    const cacheKey = this.getIconBatchKey();
    const state = iconBatchStates[cacheKey] || { offset: 0, loading: false, completed: false };
    iconBatchStates[cacheKey] = state;

    if (!actions.length || state.loading || state.completed) {
      return Promise.resolve();
    }

    const batch = actions.slice(state.offset, state.offset + ICON_BATCH_SIZE);
    if (!batch.length) {
      state.completed = true;
      return Promise.resolve();
    }

    state.loading = true;
    let batchSucceeded = false;

    pendingCategoryIconLoads[cacheKey] = actionService.ensureActionIcons(batch.map((action) => action.id))
      .then((syncedActions) => {
        const syncedById = new Map(syncedActions.map((action) => [String(action.id), action]));
        return cacheActionIcons(batch.map((action) => syncedById.get(String(action.id)) || action));
      })
      .then((cachedActions) => {
        const cachedById = new Map(cachedActions.map((action) => [String(action.id), action]));
        actionTable = actionTable.map((action) => cachedById.get(String(action.id)) || action);
        state.offset += batch.length;
        state.completed = state.offset >= actions.length;
        batchSucceeded = true;

        // 下载完成时仅刷新当前可见列表，避免切换分类后用旧请求覆盖新视图。
        this.refreshActions();
      })
      .catch((error) => {
        console.warn("动作图标懒加载失败", error);
      })
      .finally(() => {
        state.loading = false;
        delete pendingCategoryIconLoads[cacheKey];

        // 当前批次完成后立即串行请求下一批，每次仍不超过 6 张。
        if (batchSucceeded && !state.completed && this.getIconBatchKey() === cacheKey) {
          setTimeout(() => this.loadNextIconBatch(), 0);
        }
      });

    return pendingCategoryIconLoads[cacheKey];
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
      ...buildActionData(id, this.data.keyword)
    });
    this.loadNextIconBatch();
  },

  onSearchInput(event) {
    const keyword = event.detail.value;

    this.setData({
      keyword,
      ...buildActionData(this.data.activeCategory, keyword)
    });
    this.loadNextIconBatch();
  },

  onActionTap(event) {
    const id = String(event.currentTarget.dataset.id);

    if (Date.now() < (this.suppressActionTapUntil || 0)) return;

    const selectedAction = this.data.actions.find((item) => String(item.id) === id);
    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;

    if (selectedAction && this.pickerMode === "trainingTrend") {
      const query = [
        `actionId=${encodeURIComponent(selectedAction.id)}`,
        `actionName=${encodeURIComponent(selectedAction.name)}`,
        `categoryId=${encodeURIComponent(selectedAction.categoryId || "")}`
      ].join("&");

      wx.redirectTo({ url: `/pages/training-trend/training-trend?${query}` });
      return;
    }

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

  clearCustomActionLongPress() {
    if (this.customActionLongPressTimer) {
      clearTimeout(this.customActionLongPressTimer);
      this.customActionLongPressTimer = null;
    }
  },

  onCustomActionTouchStart(event) {
    if (this.data.activeCategory !== "custom" || this.data.deletingCustomAction) return;

    const { id, name } = event.currentTarget.dataset;
    this.clearCustomActionLongPress();
    this.customActionLongPressTimer = setTimeout(() => {
      this.customActionLongPressTimer = null;
      this.suppressActionTapUntil = Date.now() + 500;
      this.confirmDeleteCustomAction(String(id), String(name || "该动作"));
    }, 2000);
  },

  onCustomActionTouchEnd() {
    this.clearCustomActionLongPress();
  },

  confirmDeleteCustomAction(id, name) {
    wx.showModal({
      title: "删除自定义动作",
      content: `确定删除“${name}”吗？`,
      confirmText: "删除",
      confirmColor: "#e5484d",
      success: ({ confirm }) => {
        if (confirm) this.deleteCustomAction(id);
      }
    });
  },

  deleteCustomAction(id) {
    this.setData({ deletingCustomAction: true });
    customActionService.deleteCustomAction(id).then(() => {
      customActionTable = customActionTable.filter((item) => String(item.id) !== id);
      this.refreshActions();
      wx.showToast({ title: "已删除", icon: "success" });
    }).catch((error) => {
      wx.showToast({ title: error.message || "删除失败，请重试", icon: "none" });
    }).finally(() => {
      this.setData({ deletingCustomAction: false });
    });
  },

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
        ...buildActionData(this.data.activeCategory, this.data.keyword)
      });
      wx.showToast({ title: "添加成功", icon: "success" });
    }).catch((error) => {
      wx.showToast({ title: error.message || "添加失败，请重试", icon: "none" });
    }).finally(() => {
      this.setData({ creatingCustomAction: false });
    });
  },

  onUnload() {
    this.clearCustomActionLongPress();
  }
});

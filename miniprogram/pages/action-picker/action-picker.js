const { ACTION_TABLE, ACTION_CATEGORIES, DEFAULT_ACTION_ICON_PATH } = require("../../data/actions");
const actionService = require("../../services/actions");
const customActionService = require("../../services/custom-actions");
const { cacheActionIcons } = require("../../services/action-icon-cache");

let actionTable = ACTION_TABLE;
let customActionTable = [];
const pendingCategoryIconLoads = Object.create(null);
const iconBatchStates = Object.create(null);
const ICON_BATCH_SIZE = 6;
const EQUIPMENT_GROUP_ORDER = ["杠铃", "哑铃", "器械", "史密斯机", "绳索", "悍马机", "自重"];

const categories = ACTION_CATEGORIES
  .map((category) => ({ ...category, isLong: category.name.length > 3 }))
  .concat({ id: "custom", name: "自定义", isLong: false });

function buildActions(categoryId, keyword = "") {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const source = categoryId === "custom" ? customActionTable : actionTable;

  return source.filter((action) => {
    const matchesCategory = categoryId === "custom" || normalizedKeyword || action.categoryId === categoryId;
    const matchesKeyword = !normalizedKeyword || action.name.toLowerCase().includes(normalizedKeyword);
    return matchesCategory && matchesKeyword;
  });
}

function buildEquipmentGroups(actions) {
  const groups = [];
  const groupByTitle = new Map();

  actions.forEach((action) => {
    const title = action.equipmentCategory || "其他";
    let group = groupByTitle.get(title);

    if (!group) {
      group = { id: `equipment:${title}`, title, actions: [] };
      groupByTitle.set(title, group);
      groups.push(group);
    }

    group.actions.push(action);
  });

  const priorityByTitle = new Map(
    EQUIPMENT_GROUP_ORDER.map((title, index) => [title, index])
  );

  return groups
    .map((group, sourceOrder) => ({ ...group, sourceOrder }))
    .sort((first, second) => {
      if (first.title === "其他") return second.title === "其他" ? 0 : 1;
      if (second.title === "其他") return -1;

      const firstPriority = priorityByTitle.has(first.title)
        ? priorityByTitle.get(first.title)
        : EQUIPMENT_GROUP_ORDER.length;
      const secondPriority = priorityByTitle.has(second.title)
        ? priorityByTitle.get(second.title)
        : EQUIPMENT_GROUP_ORDER.length;

      return firstPriority - secondPriority || first.sourceOrder - second.sourceOrder;
    })
    .map(({ sourceOrder, ...group }) => group);
}

function buildActionData(categoryId, keyword = "") {
  const actions = buildActions(categoryId, keyword).map((action) => ({
    ...action,
    // 云端图片完成缓存前先显示统一默认图，避免卡片区域闪空。
    displayIconPath: action.iconCached ? action.iconPath : DEFAULT_ACTION_ICON_PATH
  }));

  return {
    actions,
    actionGroups: categoryId === "custom" ? [] : buildEquipmentGroups(actions)
  };
}

Page({
  data: {
    categories,
    activeCategory: ACTION_CATEGORIES[0].id,
    activeCategoryName: ACTION_CATEGORIES[0].name,
    keyword: "",
    ...buildActionData(ACTION_CATEGORIES[0].id),
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

    const actions = buildActions(activeCategory, keyword).filter((action) => !action.iconCached);
    const cacheKey = this.getIconBatchKey();
    const state = iconBatchStates[cacheKey] || { loading: false, completed: false };
    iconBatchStates[cacheKey] = state;

    if (!actions.length || state.loading || state.completed) {
      return Promise.resolve();
    }

    const batch = actions.slice(0, ICON_BATCH_SIZE);
    if (!batch.length) {
      state.completed = true;
      return Promise.resolve();
    }

    state.loading = true;
    let batchSucceeded = false;

    pendingCategoryIconLoads[cacheKey] = actionService.ensureActionIcons(batch.map((action) => action.id))
      .then((syncedActions) => {
        const syncedById = new Map(syncedActions.map((action) => [String(action.id), action]));
        const availableCloudIcons = batch
          .map((action) => syncedById.get(String(action.id)))
          .filter((action) => action && action.iconFileID);
        return availableCloudIcons.length ? cacheActionIcons(availableCloudIcons) : [];
      })
      .then((cachedActions) => {
        const cachedById = new Map(cachedActions.map((action) => [String(action.id), action]));
        actionTable = actionTable.map((action) => cachedById.get(String(action.id)) || action);
        state.completed = !cachedActions.length || actions.length <= batch.length;
        batchSucceeded = cachedActions.length > 0;

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

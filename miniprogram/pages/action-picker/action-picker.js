const PLACEHOLDER_IMAGE = "/assets/500px-Bench-press-1.png";

const CATEGORY_ACTIONS = {
  chest: [
    "杠铃卧推",
    "暂停卧推",
    "宽距杠铃卧推",
    "上斜杠铃卧推",
    "下斜杠铃卧推",
    "杠铃片夹胸",
    "抬腿杠铃卧推"
  ],
  back: ["高位下拉", "坐姿划船", "杠铃划船", "引体向上"],
  legs: ["深蹲", "腿举", "弓步蹲", "腿屈伸"],
  shoulders: ["肩推", "侧平举", "俯身飞鸟", "前平举"],
  biceps: ["杠铃弯举", "哑铃弯举", "锤式弯举", "牧师凳弯举"],
  triceps: ["绳索下压", "窄距卧推", "臂屈伸", "仰卧臂屈伸"],
  glutes: ["臀桥", "臀推", "绳索后踢腿", "保加利亚分腿蹲"],
  core: ["卷腹", "平板支撑", "俄罗斯转体", "悬垂举腿"]
};

const categories = [
  { id: "chest", name: "胸" },
  { id: "back", name: "背" },
  { id: "legs", name: "腿" },
  { id: "shoulders", name: "肩" },
  { id: "biceps", name: "二头" },
  { id: "triceps", name: "三头" },
  { id: "glutes", name: "臀部" },
  { id: "core", name: "核心" }
];

function buildActions(categoryId, keyword = "") {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const actionGroups = normalizedKeyword
    ? Object.entries(CATEGORY_ACTIONS)
    : [[categoryId, CATEGORY_ACTIONS[categoryId] || []]];

  const actions = [];

  actionGroups.forEach(([groupId, actionNames]) => {
    actionNames.forEach((name, index) => {
      if (!normalizedKeyword || name.toLowerCase().includes(normalizedKeyword)) {
        actions.push({
          id: `${groupId}-${index}`,
          name,
          image: PLACEHOLDER_IMAGE
        });
      }
    });
  });

  return actions;
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
    const { id } = event.currentTarget.dataset;
    const selectedAction = this.data.actions.find((item) => item.id === id);
    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;

    if (selectedAction && previousPage && typeof previousPage.addTrainingAction === "function") {
      previousPage.addTrainingAction(selectedAction);
    }

    wx.navigateBack();
  }
});

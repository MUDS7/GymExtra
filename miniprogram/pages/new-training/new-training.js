const DEFAULT_ACTION_IMAGE = "/assets/500px-Bench-press-1.png";

function formatVolume(value) {
  return Number(value || 0).toFixed(1);
}

function createTrainingAction(action) {
  const setsCount = action.setsCount || 0;
  const weight = action.weight || 0;
  const completedSets = action.completedSets || 0;
  const completedVolume = action.completedVolume || 0;
  const plannedVolume = action.plannedVolume || 0;

  return {
    uid: `${action.id || "action"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    id: action.id,
    name: action.name || "未命名动作",
    image: action.image || DEFAULT_ACTION_IMAGE,
    setsCount,
    weight,
    completedSets,
    setText: `${setsCount}组`,
    metaText: `组数：${setsCount}  重量：${weight}`,
    volumeText: `${formatVolume(completedVolume)}/${formatVolume(plannedVolume)}`,
    completedVolume,
    plannedVolume
  };
}

function buildSummary(actions) {
  const totalSets = actions.reduce((sum, item) => sum + item.setsCount, 0);
  const completedSets = actions.reduce((sum, item) => sum + item.completedSets, 0);
  const completedVolume = actions.reduce((sum, item) => sum + item.completedVolume, 0);
  const plannedVolume = actions.reduce((sum, item) => sum + item.plannedVolume, 0);

  return {
    setText: `${completedSets}/${totalSets}组`,
    actionText: `${actions.length}/${actions.length}动作`,
    volumeText: `${formatVolume(completedVolume)}/${formatVolume(plannedVolume)}容量`
  };
}

Page({
  data: {
    timer: "00:00",
    title: "",
    actions: [],
    summary: buildSummary([])
  },

  onTimerInput(event) {
    this.setData({
      timer: event.detail.value
    });
  },

  onTitleInput(event) {
    this.setData({
      title: event.detail.value
    });
  },

  onFinishTap() {
    const pages = getCurrentPages();

    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/train/train"
    });
  },

  addTrainingAction(action) {
    const actions = this.data.actions.concat(createTrainingAction(action));

    this.setData({
      actions,
      summary: buildSummary(actions)
    });
  },

  onAddActionTap() {
    wx.navigateTo({
      url: "/pages/action-picker/action-picker"
    });
  },

  onActionDeleteTap(event) {
    const { index, name } = event.currentTarget.dataset;
    const deleteIndex = Number(index);

    if (!Number.isInteger(deleteIndex) || deleteIndex < 0 || deleteIndex >= this.data.actions.length) {
      return;
    }

    wx.showModal({
      title: "删除动作",
      content: `确定删除「${name}」吗？`,
      confirmText: "删除",
      confirmColor: "#D93025",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const actions = this.data.actions.slice();
        actions.splice(deleteIndex, 1);

        this.setData({
          actions,
          summary: buildSummary(actions)
        });
      }
    });
  }
});

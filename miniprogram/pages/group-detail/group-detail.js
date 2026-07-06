const members = [
  { name: "小鹿爱健身", training: "哑铃全身", duration: 45, tag: "力量", tagClass: "orange", state: "已完成", stateClass: "done" },
  { name: "晨光微汗", training: "HIIT 跑", duration: 30, tag: "有氧", tagClass: "blue", state: "已完成", stateClass: "done" },
  { name: "阿哲", training: "胸背训练", duration: 60, tag: "力量", tagClass: "orange", state: "已完成", stateClass: "done" },
  { name: "可乐不加冰", training: "瑜伽拉伸", duration: 20, tag: "拉伸", tagClass: "purple", state: "休息", stateClass: "rest" },
  { name: "柠檬不酸", training: "腿部塑形", duration: 40, tag: "力量", tagClass: "orange", state: "未打卡", stateClass: "missed" }
];

const templates = [
  { name: "新手燃脂模板", duration: 30, focus: "有氧为主", used: 1286 },
  { name: "臀腿训练模板", duration: 45, focus: "力量为主", used: 987 },
  { name: "核心激活模板", duration: 25, focus: "核心为主", used: 764 },
  { name: "全身拉伸模板", duration: 20, focus: "拉伸为主", used: 642 }
];

Page({
  data: {
    groupId: 1,
    groupName: "燃脂打卡营",
    headerTop: 64,
    members,
    templates,
    attendance: [true, true, true, true, true, false, false, false]
  },

  onLoad(options) {
    const name = options.name ? decodeURIComponent(options.name) : "燃脂打卡营";
    const menuButton = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;

    this.setData({
      groupId: Number(options.id) || 1,
      groupName: name,
      headerTop: menuButton && menuButton.bottom ? menuButton.bottom + 8 : 64
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onActionTap(event) {
    const { name } = event.currentTarget.dataset;
    wx.showToast({ title: `${name} 待接入`, icon: "none" });
  },

  onTabTap(event) {
    wx.switchTab({ url: event.currentTarget.dataset.url });
  }
});

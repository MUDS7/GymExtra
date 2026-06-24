Page({
  data: {
    title: ""
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

  onAddActionTap() {
    wx.showToast({
      title: "添加动作待接入",
      icon: "none"
    });
  }
});

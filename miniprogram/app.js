App({
  globalData: {
    env: "",
    userInfo: null
  },

  onLaunch() {
    this.initCloud();
  },

  initCloud() {
    const { env } = this.globalData;

    if (!wx.cloud || !env) {
      return;
    }

    wx.cloud.init({
      env,
      traceUser: true
    });
  }
});

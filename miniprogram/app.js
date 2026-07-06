const { cloudEnvId } = require("./config/env.local");
const { callCloudFunction } = require("./services/network");

App({
  globalData: {
    env: cloudEnvId,
    userInfo: null,
    userId: ""
  },

  onLaunch() {
    this.initCloud();
    this.login().catch(() => { });
  },

  initCloud() {
    const { env } = this.globalData;

    if (!wx.cloud) {
      return;
    }

    const options = { traceUser: true };
    if (env) options.env = env;
    wx.cloud.init(options);
  },

  login(options = {}) {
    const { redirectToRegister = true, force = false } = options;

    if (!wx.cloud) {
      return Promise.reject(new Error("当前基础库不支持云开发"));
    }

    if (this.loginPromise && !force) {
      return this.loginPromise;
    }

    this.loginPromise = callCloudFunction({
      name: "quickstartFunctions",
      data: { type: "login" }
    }).then(({ result }) => {
      if (!result || !result.success) {
        throw new Error((result && result.message) || "登录失败");
      }

      this.globalData.userId = result.userId;
      this.globalData.userInfo = result.user || null;
      wx.setStorageSync("userInfo", result.user || null);

      if (!result.registered && redirectToRegister) {
        const pages = getCurrentPages();
        const current = pages.length ? pages[pages.length - 1].route : "";
        if (current !== "pages/login/login") {
          wx.reLaunch({ url: "/pages/login/login" });
        }
      }

      return result;
    }).catch((error) => {
      this.loginPromise = null;
      console.error("自动登录失败", error);
      return Promise.reject(error);
    });

    return this.loginPromise;
  },

  setUser(user) {
    this.globalData.userId = user.id;
    this.globalData.userInfo = user;
    this.loginPromise = Promise.resolve({
      success: true,
      registered: true,
      userId: user.id,
      user
    });
    wx.setStorageSync("userInfo", user);
  }
});

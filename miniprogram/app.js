const { cloudEnvId } = require("./config/env.local");
const { callCloudFunction } = require("./services/network");

App({
  globalData: {
    env: cloudEnvId,
    userInfo: null,
    userId: "",
    isRegistered: false,
    isExperienceMode: true
  },

  onLaunch() {
    this.restoreCachedSession();
    this.initCloud();
    const initialAuthPromise = this.login({
      redirectToRegister: false,
      force: true,
      fallbackToExperience: true
    })
      .catch(() => {
        this.globalData.isRegistered = false;
        this.globalData.isExperienceMode = true;
        return {
          success: false,
          registered: false,
          userId: "",
          user: null
        };
      });

    // Tab 页首次展示时复用这次身份识别，避免已注册用户被短暂当成体验用户。
    this.initialAuthPromise = initialAuthPromise;
    initialAuthPromise.then(() => {
      this.initialAuthPromise = null;
    });
  },

  restoreCachedSession() {
    try {
      const user = wx.getStorageSync("userInfo");
      if (!user || !user.id) return;

      this.globalData.userId = user.id;
      this.globalData.userInfo = user;
      this.globalData.isRegistered = true;
      this.globalData.isExperienceMode = false;
    } catch (error) {
      console.warn("读取本地登录缓存失败", error);
    }
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
    const { redirectToRegister = true, force = false, fallbackToExperience = false } = options;

    if (this.initialAuthPromise && !force) {
      return this.initialAuthPromise;
    }

    if (this.globalData.isExperienceMode && !force) {
      return Promise.resolve({
        success: true,
        registered: false,
        userId: "",
        user: null
      });
    }

    if (!wx.cloud) {
      return Promise.reject(new Error("当前基础库不支持云开发"));
    }

    if (this.loginPromise && !force) {
      return this.loginPromise;
    }

    this.loginPromise = callCloudFunction({
      name: "authFunctions",
      data: { type: "login" }
    })
      .then(({ result }) => {
      if (!result || !result.success) {
        throw new Error((result && result.message) || "登录失败");
      }

      this.globalData.userId = result.userId;
      this.globalData.userInfo = result.user || null;
      this.globalData.isRegistered = Boolean(result.registered);
      this.globalData.isExperienceMode = !result.registered;

      if (result.registered) {
        wx.setStorageSync("userInfo", result.user);
      } else {
        wx.removeStorageSync("userInfo");
      }

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

      if (fallbackToExperience) {
        this.globalData.userId = "";
        this.globalData.userInfo = null;
        this.globalData.isRegistered = false;
        this.globalData.isExperienceMode = true;
        wx.removeStorageSync("userInfo");
        return {
          success: false,
          registered: false,
          userId: "",
          user: null
        };
      }

      console.error("自动登录失败", error);
      return Promise.reject(error);
    });

    return this.loginPromise;
  },

  setUser(user) {
    this.globalData.userId = user.id;
    this.globalData.userInfo = user;
    this.globalData.isRegistered = true;
    this.globalData.isExperienceMode = false;
    this.loginPromise = Promise.resolve({
      success: true,
      registered: true,
      userId: user.id,
      user
    });
    wx.setStorageSync("userInfo", user);
  },

  exitExperienceMode() {
    this.globalData.isExperienceMode = false;
  }
});

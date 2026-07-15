const { cloudEnvId } = require("./config/env.local");
const { callCloudFunction } = require("./services/network");

// Temporary: keep the test-user entry hidden and use the current WeChat account.
const ENABLE_TEST_USER_SELECTOR = false;

App({
  globalData: {
    env: cloudEnvId,
    userInfo: null,
    userId: "",
    testUserId: ""
  },

  testUserSelectionPromise: null,

  onLaunch() {
    this.initCloud();
    this.testUserSelectionPromise = ENABLE_TEST_USER_SELECTOR
      ? this.selectTestUser()
      : Promise.resolve();
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

    this.loginPromise = Promise.resolve(this.testUserSelectionPromise)
      .catch(() => null)
      .then(() => callCloudFunction({
        name: "quickstartFunctions",
        data: { type: "login" }
      }))
      .then(({ result }) => {
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

  selectTestUser() {
    if (!wx.cloud) return Promise.resolve();

    return callCloudFunction({
      name: "quickstartFunctions",
      data: { type: "listTestUsers" }
    }).then(({ result }) => {
      const users = result && result.success && Array.isArray(result.data) ? result.data : [];
      if (!users.length) return null;

      const labels = ["当前微信账号"].concat(users.map((user) => {
        const nickname = String(user.nickname || "未命名用户").slice(0, 14);
        const suffix = String(user.id || "").slice(-6);
        return suffix ? `${nickname} · ${suffix}` : nickname;
      }));
      return new Promise((resolve) => {
        wx.showActionSheet({
          alertText: "测试功能：选择进入小程序的人员",
          itemList: labels,
          success: ({ tapIndex }) => {
            const selected = users[tapIndex - 1];
            if (selected) this.globalData.testUserId = selected.id;
            resolve();
          },
          fail: resolve
        });
      });
    }).catch(() => null);
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

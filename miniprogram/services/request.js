const config = require("../config/index");

function request(options) {
  const { url, ...rest } = options;

  return new Promise((resolve, reject) => {
    wx.request({
      ...rest,
      url: `${config.apiBaseUrl}${url}`,
      success: resolve,
      fail: reject
    });
  });
}

module.exports = {
  request
};

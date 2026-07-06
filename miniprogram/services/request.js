const config = require("../config/index");
const {
  NETWORK_TIMEOUT,
  createTimeoutError,
  showTimeoutModal
} = require("./network");

function request(options) {
  const { url, ...rest } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    let requestTask;
    const timer = setTimeout(() => {
      if (settled) return;

      settled = true;
      if (requestTask) requestTask.abort();
      showTimeoutModal();
      reject(createTimeoutError());
    }, NETWORK_TIMEOUT);

    requestTask = wx.request({
      ...rest,
      url: `${config.apiBaseUrl}${url}`,
      timeout: NETWORK_TIMEOUT,
      success(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      },
      fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (error && /timeout/i.test(error.errMsg || "")) {
          showTimeoutModal();
          reject(createTimeoutError());
          return;
        }

        reject(error);
      }
    });
  });
}

module.exports = {
  request
};

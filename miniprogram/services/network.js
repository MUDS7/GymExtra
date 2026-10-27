const NETWORK_TIMEOUT = 10000;

let timeoutModalVisible = false;

function createTimeoutError() {
  const error = new Error("网络请求超时，请检查网络后重试");
  error.code = "NETWORK_TIMEOUT";
  error.isTimeout = true;
  return error;
}

function showTimeoutModal(timeoutMs = NETWORK_TIMEOUT) {
  if (timeoutModalVisible) return;

  const timeoutSeconds = Math.ceil(timeoutMs / 1000);
  timeoutModalVisible = true;
  wx.showModal({
    title: "网络超时",
    content: `网络请求超过 ${timeoutSeconds} 秒，请检查网络后重试。`,
    showCancel: false,
    confirmText: "知道了",
    complete() {
      timeoutModalVisible = false;
    }
  });
}

function withTimeout(request, abort, timeoutMs = NETWORK_TIMEOUT) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;

      settled = true;
      if (typeof abort === "function") abort();
      showTimeoutModal(timeoutMs);
      reject(createTimeoutError());
    }, timeoutMs);

    Promise.resolve(request).then((result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }).catch((error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

function callCloudFunction(options, timeoutMs = NETWORK_TIMEOUT) {
  return withTimeout(wx.cloud.callFunction(options), null, timeoutMs);
}

function uploadCloudFile(options) {
  const uploadTask = wx.cloud.uploadFile(options);
  const abort = uploadTask && typeof uploadTask.abort === "function"
    ? () => uploadTask.abort()
    : null;
  return withTimeout(uploadTask, abort);
}

module.exports = {
  NETWORK_TIMEOUT,
  callCloudFunction,
  createTimeoutError,
  showTimeoutModal,
  uploadCloudFile,
  withTimeout
};

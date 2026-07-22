const { callCloudFunction } = require("./network");

function getUserStats() {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "statsFunctions",
    data: { type: "getUserStats" }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取用户统计失败");
    }

    return result.data || {};
  });
}

module.exports = { getUserStats };

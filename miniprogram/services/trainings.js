function saveTraining(data) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return wx.cloud.callFunction({
    name: "quickstartFunctions",
    data: {
      type: "saveTraining",
      ...data
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "保存训练记录失败");
    }

    return result;
  });
}

function getRecentTrainings() {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return wx.cloud.callFunction({
    name: "quickstartFunctions",
    data: { type: "getRecentTrainings" }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取最近训练记录失败");
    }

    return Array.isArray(result.data) ? result.data : [];
  });
}

module.exports = { saveTraining, getRecentTrainings };

const { callCloudFunction } = require("./network");

function callGroupFunction(type, data = {}) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "quickstartFunctions",
    data: { type, ...data }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "群组数据加载失败");
    }
    return result.data;
  });
}

function getMyGroups() {
  return callGroupFunction("getMyGroups").then((data) => Array.isArray(data) ? data : []);
}

function getGroupDetail(groupId) {
  return callGroupFunction("getGroupDetail", { groupId });
}

module.exports = { getMyGroups, getGroupDetail };

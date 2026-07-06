const { ACTION_TABLE } = require("../data/actions");
const { cacheActionIcons } = require("./action-icon-cache");
const { callCloudFunction } = require("./network");

function getActions() {
  if (!wx.cloud) {
    return Promise.resolve(ACTION_TABLE);
  }

  return callCloudFunction({
    name: "quickstartFunctions",
    data: { type: "getActions" }
  }).then(({ result }) => {
    if (!result || !result.success || !Array.isArray(result.data)) {
      throw new Error((result && result.message) || "云端动作表读取失败");
    }

    return cacheActionIcons(result.data);
  }).catch((error) => {
    console.warn("云端动作表不可用，使用本地动作表", error);
    return ACTION_TABLE;
  });
}

module.exports = {
  getActions
};

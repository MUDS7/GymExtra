const { ACTION_TABLE } = require("../data/actions");
const { cacheActionIcons } = require("./action-icon-cache");
const { callCloudFunction } = require("./network");

function findBundledAction(action) {
  return ACTION_TABLE.find((item) => item.id === action.id || item.name === action.name);
}

function preferCloudIcons(actions) {
  return actions.map((action) => {
    const bundledAction = findBundledAction(action);
    const fallbackIconPath = (bundledAction && bundledAction.iconPath) || action.iconPath;
    const cloudIconPath = action && action.iconFileID;

    return {
      ...action,
      // 云端图片会被下载并缓存到本地文件系统；不再覆盖为小程序包内资源。
      iconPath: cloudIconPath || fallbackIconPath,
      iconDownloadPath: cloudIconPath || fallbackIconPath
    };
  });
}

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

    return cacheActionIcons(preferCloudIcons(result.data));
  }).catch((error) => {
    console.warn("云端动作表不可用，使用本地动作表", error);
    return ACTION_TABLE;
  });
}

module.exports = {
  getActions
};

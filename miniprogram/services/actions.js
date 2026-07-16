const { ACTION_TABLE } = require("../data/actions");
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

    // 只返回动作元数据。图标由动作选择页在切换到对应分类时再按需下载。
    return preferCloudIcons(result.data);
  }).catch((error) => {
    console.warn("云端动作表不可用，使用本地动作表", error);
    return ACTION_TABLE;
  });
}

function ensureActionIcons(actionIds) {
  if (!wx.cloud) {
    return Promise.resolve([]);
  }

  const uniqueActionIds = Array.from(new Set(
    (Array.isArray(actionIds) ? actionIds : [actionIds])
      .filter((actionId) => actionId !== undefined && actionId !== null)
  ));

  if (!uniqueActionIds.length) {
    return Promise.resolve([]);
  }

  return callCloudFunction({
    name: "quickstartFunctions",
    // 云端也会强制限制为 6 个，防止单次请求上传过多图片。
    data: { type: "ensureActionIcons", actionIds: uniqueActionIds.slice(0, 6) }
  }).then(({ result }) => {
    if (!result || !result.success || !Array.isArray(result.data)) {
      throw new Error((result && result.message) || "动作图标同步失败");
    }

    return preferCloudIcons(result.data);
  });
}

module.exports = {
  getActions,
  ensureActionIcons
};

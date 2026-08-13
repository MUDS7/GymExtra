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
  // 工作簿生成的本地目录是动作元数据的唯一来源，避免旧云函数覆盖新动作库。
  // 云端仅在 ensureActionIcons 中负责已有图片的上传与缓存。
  return Promise.resolve(ACTION_TABLE);
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
    name: "actionFunctions",
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

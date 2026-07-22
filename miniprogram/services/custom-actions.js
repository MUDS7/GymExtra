const { DEFAULT_ACTION_ICON_PATH } = require("../data/actions");
const { callCloudFunction } = require("./network");

const STORAGE_KEY_PREFIX = "gymextra-custom-actions";

function getStorageKey() {
  try {
    const app = getApp();
    const userId = app && app.globalData && app.globalData.userId;
    return userId ? `${STORAGE_KEY_PREFIX}:${encodeURIComponent(String(userId))}` : "";
  } catch (error) {
    return "";
  }
}

function getCachedCustomActions() {
  const storageKey = getStorageKey();
  if (!storageKey) return [];

  try {
    const actions = wx.getStorageSync(storageKey);
    return Array.isArray(actions) ? actions : [];
  } catch (error) {
    return [];
  }
}

function cacheCustomActions(actions) {
  const storageKey = getStorageKey();
  if (!storageKey) return;
  wx.setStorageSync(storageKey, Array.isArray(actions) ? actions : []);
}

function normalizeAction(action) {
  return {
    ...action,
    id: action.id,
    name: String(action.name || "").trim(),
    categoryId: action.categoryId === "cardio" ? "cardio" : "strength",
    iconPath: action.iconPath || DEFAULT_ACTION_ICON_PATH,
    isCustom: true
  };
}

function getCustomActions() {
  if (!wx.cloud) return Promise.resolve(getCachedCustomActions());

  return callCloudFunction({
    name: "actionFunctions",
    data: { type: "getCustomActions" }
  }).then(({ result }) => {
    if (!result || !result.success || !Array.isArray(result.data)) {
      throw new Error((result && result.message) || "读取自定义动作失败");
    }

    const actions = result.data.map(normalizeAction);
    cacheCustomActions(actions);
    return actions;
  }).catch((error) => {
    console.warn("云端自定义动作不可用，使用本机缓存", error);
    return getCachedCustomActions();
  });
}

function createCustomAction(values) {
  const name = String(values && values.name || "").trim();
  const categoryId = values && values.categoryId === "cardio" ? "cardio" : "strength";

  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "actionFunctions",
    data: { type: "createCustomAction", name, categoryId }
  }).then(({ result }) => {
    if (!result || !result.success || !result.data) {
      throw new Error((result && result.message) || "创建自定义动作失败");
    }

    const action = normalizeAction(result.data);
    cacheCustomActions([action].concat(getCachedCustomActions().filter((item) => item.id !== action.id)));
    return action;
  });
}

function deleteCustomAction(actionId) {
  const id = String(actionId || "").trim();

  if (!id) {
    return Promise.reject(new Error("未找到要删除的自定义动作"));
  }

  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "actionFunctions",
    data: { type: "deleteCustomAction", actionId: id }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "删除自定义动作失败");
    }

    cacheCustomActions(getCachedCustomActions().filter((item) => String(item.id) !== id));
  });
}

module.exports = { getCustomActions, createCustomAction, deleteCustomAction };

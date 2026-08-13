const cloud = require("wx-server-sdk");
const fs = require("fs");
const path = require("path");
const { ACTION_TABLE } = require("./actionCatalog");

const db = cloud.database();
const COLLECTION = "actions";
const ICON_BATCH_SIZE = 6;

function normalizeList(value) {
  return (Array.isArray(value) ? value : [value])
    .filter((item) => item !== undefined && item !== null && item !== "")
    .map(String);
}

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时继续执行。
  }
}

async function syncActions() {
  await ensureCollection();
  return { success: true, actionCount: ACTION_TABLE.length };
}

function getActionIconLocalPath(iconPath) {
  return path.join(__dirname, "assets", "action-icons", path.basename(iconPath));
}

async function uploadActionIcon(action) {
  const localPath = getActionIconLocalPath(action.iconPath);
  if (!fs.existsSync(localPath)) {
    throw new Error(`动作图片源文件不存在：${localPath}`);
  }

  const result = await cloud.uploadFile({
    cloudPath: `actions/icons/${path.basename(localPath)}`,
    fileContent: fs.readFileSync(localPath)
  });
  if (!result.fileID) {
    throw new Error(`动作图片上传失败：${action.name}`);
  }

  return result.fileID;
}

async function ensureActionIcons({ categoryIds, actionIds } = {}) {
  await ensureCollection();

  const requestedCategories = new Set(normalizeList(categoryIds));
  const requestedActionIds = new Set(normalizeList(actionIds));
  const actions = ACTION_TABLE.filter((action) => (
    action.hasCustomIcon && (
      requestedActionIds.size
        ? requestedActionIds.has(String(action.id))
        : requestedCategories.has(action.categoryId)
    )
  )).slice(0, ICON_BATCH_SIZE);

  const resolvedActions = await Promise.all(actions.map(async (action) => {
    let iconFileID = "";
    try {
      const result = await db.collection(COLLECTION).doc(String(action.id)).get();
      iconFileID = result.data && result.data.iconFileID;
    } catch (error) {
      // 首次请求该图片时记录尚不存在。
    }

    if (!iconFileID) {
      iconFileID = await uploadActionIcon(action);
      await db.collection(COLLECTION).doc(String(action.id)).set({
        data: { ...action, iconFileID }
      });
    }

    return { ...action, iconFileID, iconCached: true };
  }));

  return { success: true, data: resolvedActions };
}

async function getActions() {
  return {
    success: true,
    data: ACTION_TABLE.map(({ type, ...action }) => action)
  };
}

module.exports = {
  getActions,
  syncActions,
  ensureActionIcons
};

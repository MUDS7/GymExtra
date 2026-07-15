const cloud = require("wx-server-sdk");
const identity = require("./identity");

const db = cloud.database();
const COLLECTION = "custom_actions";
const DEFAULT_ACTION_ICON_PATH = "/assets/default-action.png";
const VALID_CATEGORIES = new Set(["strength", "cardio"]);

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时可以直接继续使用。
  }
}

function toClientAction(record) {
  return {
    id: record._id,
    name: record.name,
    categoryId: record.categoryId,
    iconPath: DEFAULT_ACTION_ICON_PATH,
    isCustom: true
  };
}

async function getCustomActions(event = {}) {
  try {
    await ensureCollection();
    const ownerId = identity.getUserId(event);
    const result = await db.collection(COLLECTION)
      .where({ ownerId })
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return { success: true, data: (result.data || []).map(toClientAction) };
  } catch (error) {
    console.error("读取自定义动作失败", error);
    return { success: false, message: error.message || "读取自定义动作失败" };
  }
}

async function createCustomAction(event = {}) {
  try {
    await ensureCollection();
    const ownerId = identity.getUserId(event);
    const name = String(event.name || "").trim().slice(0, 100);
    const categoryId = String(event.categoryId || "").trim();

    if (!name) return { success: false, message: "请填写动作名称" };
    if (!VALID_CATEGORIES.has(categoryId)) return { success: false, message: "请选择动作类型" };

    const existing = await db.collection(COLLECTION).where({ ownerId, name }).limit(1).get();
    if (existing.data && existing.data.length) {
      return { success: false, message: "该自定义动作已存在" };
    }

    const createdAt = new Date();
    const result = await db.collection(COLLECTION).add({
      data: { ownerId, name, categoryId, createdAt }
    });
    const action = toClientAction({ _id: result._id, name, categoryId });
    return { success: true, data: action };
  } catch (error) {
    console.error("创建自定义动作失败", error);
    return { success: false, message: error.message || "创建自定义动作失败" };
  }
}

module.exports = { getCustomActions, createCustomAction };

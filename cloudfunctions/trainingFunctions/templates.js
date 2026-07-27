const cloud = require("wx-server-sdk");
const identity = require("./identity");

const db = cloud.database();
const COLLECTION = "user_templates";
const MAX_TEMPLATES = 100;
const MAX_ACTIONS = 100;

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时继续执行。
  }
}

function normalizeName(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function serializeTemplate(template) {
  return {
    id: template._id,
    name: template.name || "未命名模板",
    icon: template.icon || "",
    tone: template.tone || "",
    actions: Array.isArray(template.actions) ? template.actions : []
  };
}

function normalizeTemplate(event = {}, existing = {}) {
  const source = event.template || event;
  const name = String(source.name || "").trim().slice(0, 50);
  const actions = Array.isArray(source.actions) ? source.actions.slice(0, MAX_ACTIONS) : [];

  if (!name) throw new Error("请输入模板名称");
  if (!actions.length) throw new Error("模板至少需要一个动作");

  return {
    name,
    icon: String(source.icon === undefined ? existing.icon || "" : source.icon).slice(0, 50),
    tone: String(source.tone === undefined ? existing.tone || "" : source.tone).slice(0, 50),
    actions
  };
}

async function getTemplatesForUser(userId) {
  const result = await db.collection(COLLECTION).where({ userId }).limit(MAX_TEMPLATES).get();
  return (result.data || []).sort((first, second) => (
    new Date(second.updatedAt || second.createdAt || 0) - new Date(first.updatedAt || first.createdAt || 0)
  ));
}

async function ensureNoDuplicateName(userId, name, excludeId = "") {
  const templates = await getTemplatesForUser(userId);
  const duplicate = templates.find((template) => (
    template._id !== excludeId && normalizeName(template.name) === normalizeName(name)
  ));

  if (duplicate) throw new Error("模板名称已存在，请重命名");
}

async function getUserTemplates() {
  try {
    await ensureCollection();
    const userId = identity.getUserId();
    const templates = await getTemplatesForUser(userId);
    return { success: true, data: templates.map(serializeTemplate) };
  } catch (error) {
    console.error("获取用户模板失败", error);
    return { success: false, message: error.message || "获取用户模板失败" };
  }
}

async function saveUserTemplate(event = {}) {
  try {
    await ensureCollection();
    const userId = identity.getUserId();
    const template = normalizeTemplate(event);
    await ensureNoDuplicateName(userId, template.name);

    const now = new Date();
    const result = await db.collection(COLLECTION).add({
      data: { ...template, userId, createdAt: now, updatedAt: now }
    });

    return { success: true, data: serializeTemplate({ ...template, _id: result._id }) };
  } catch (error) {
    console.error("保存用户模板失败", error);
    return { success: false, message: error.message || "保存用户模板失败" };
  }
}

async function updateUserTemplate(event = {}) {
  try {
    await ensureCollection();
    const userId = identity.getUserId();
    const templateId = String(event.templateId || "").trim();
    if (!templateId) throw new Error("缺少模板信息");

    const existing = await db.collection(COLLECTION).doc(templateId).get();
    if (!existing.data || existing.data.userId !== userId) throw new Error("模板不存在或已删除");

    const template = normalizeTemplate(event, existing.data);
    await ensureNoDuplicateName(userId, template.name, templateId);
    await db.collection(COLLECTION).doc(templateId).update({
      data: { ...template, updatedAt: new Date() }
    });

    return { success: true, data: serializeTemplate({ ...existing.data, ...template, _id: templateId }) };
  } catch (error) {
    console.error("更新用户模板失败", error);
    return { success: false, message: error.message || "更新用户模板失败" };
  }
}

async function deleteUserTemplate(event = {}) {
  try {
    await ensureCollection();
    const userId = identity.getUserId();
    const templateId = String(event.templateId || "").trim();
    if (!templateId) throw new Error("缺少模板信息");

    const existing = await db.collection(COLLECTION).doc(templateId).get();
    if (!existing.data || existing.data.userId !== userId) throw new Error("模板不存在或已删除");

    await db.collection(COLLECTION).doc(templateId).remove();
    return { success: true };
  } catch (error) {
    console.error("删除用户模板失败", error);
    return { success: false, message: error.message || "删除用户模板失败" };
  }
}

module.exports = { getUserTemplates, saveUserTemplate, updateUserTemplate, deleteUserTemplate };

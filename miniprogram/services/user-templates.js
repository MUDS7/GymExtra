const { callCloudFunction } = require("./network");

const STORAGE_KEY_PREFIX = "userTemplates:";
const LEGACY_DEFAULT_TEMPLATE_IDS = new Set(["strength", "fat-loss", "check-in", "advanced"]);
const TEMPLATE_APPEARANCES = [
  { icon: "icon-zap", tone: "energy" },
  { icon: "icon-flame", tone: "power" },
  { icon: "icon-calendar", tone: "cool" },
  { icon: "icon-trophy", tone: "gold" },
  { icon: "icon-zap", tone: "vital" }
];

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId || "default"}`;
}

function cloneTemplates(templates) {
  return templates.map((template) => ({ ...template }));
}

function getCachedUserTemplates(userId) {
  const key = getStorageKey(userId);
  const templates = wx.getStorageSync(key);
  const savedTemplates = Array.isArray(templates)
    ? templates.filter((template) => !LEGACY_DEFAULT_TEMPLATE_IDS.has(template.id))
    : [];

  if (Array.isArray(templates) && savedTemplates.length !== templates.length) {
    wx.setStorageSync(key, savedTemplates);
  }

  return cloneTemplates(savedTemplates);
}

function setCachedUserTemplates(userId, templates) {
  const safeTemplates = Array.isArray(templates) ? cloneTemplates(templates) : [];
  wx.setStorageSync(getStorageKey(userId), safeTemplates);
  return safeTemplates;
}

function callTemplateFunction(type, data = {}) {
  if (!wx.cloud) return Promise.reject(new Error("当前基础库不支持云开发"));

  return callCloudFunction({
    name: "trainingFunctions",
    data: { type, ...data }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "模板数据加载失败");
    }
    return result.data;
  });
}

async function getUserTemplates(userId) {
  const localTemplates = getCachedUserTemplates(userId);
  let templates;
  try {
    templates = await callTemplateFunction("getUserTemplates");
  } catch (error) {
    if (localTemplates.length) return localTemplates;
    throw error;
  }
  templates = Array.isArray(templates) ? templates : [];

  // 将旧版仅存于本机的模板一次性迁移到云端，避免升级后已有模板丢失。
  if (!templates.length && localTemplates.length) {
    await Promise.all(localTemplates.map((template) => (
      callTemplateFunction("saveUserTemplate", { template })
    )));
    templates = await callTemplateFunction("getUserTemplates");
    templates = Array.isArray(templates) ? templates : [];
  }

  return setCachedUserTemplates(userId, templates);
}

async function getUserTemplate(userId, templateId) {
  const templates = await getUserTemplates(userId);
  return templates.find((template) => template.id === templateId) || null;
}

async function saveUserTemplate(userId, data = {}) {
  const templates = getCachedUserTemplates(userId);
  const appearance = TEMPLATE_APPEARANCES[templates.length % TEMPLATE_APPEARANCES.length];
  const template = await callTemplateFunction("saveUserTemplate", {
    template: { ...appearance, ...data }
  });
  setCachedUserTemplates(userId, [template, ...templates]);
  return { ...template };
}

async function updateUserTemplate(userId, templateId, data = {}) {
  const template = await callTemplateFunction("updateUserTemplate", { templateId, template: data });
  const templates = getCachedUserTemplates(userId).map((item) => (
    item.id === templateId ? template : item
  ));
  setCachedUserTemplates(userId, templates);
  return { ...template };
}

async function deleteUserTemplate(userId, templateId) {
  await callTemplateFunction("deleteUserTemplate", { templateId });
  setCachedUserTemplates(userId, getCachedUserTemplates(userId).filter((item) => item.id !== templateId));
}

module.exports = {
  getCachedUserTemplates,
  getUserTemplates,
  getUserTemplate,
  saveUserTemplate,
  updateUserTemplate,
  deleteUserTemplate
};

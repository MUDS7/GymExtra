const STORAGE_KEY_PREFIX = "userTemplates:";

const LEGACY_DEFAULT_TEMPLATE_IDS = new Set([
  "strength",
  "fat-loss",
  "check-in",
  "advanced"
]);

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

function normalizeTemplateName(name) {
  return String(name || "").trim().toLocaleLowerCase();
}

function getUserTemplates(userId) {
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

function hasUserTemplateName(userId, name, excludeTemplateId = "") {
  const normalizedName = normalizeTemplateName(name);
  return Boolean(normalizedName) && getUserTemplates(userId).some(
    (template) => template.id !== excludeTemplateId && normalizeTemplateName(template.name) === normalizedName
  );
}

function getUserTemplate(userId, templateId) {
  return getUserTemplates(userId).find((template) => template.id === templateId) || null;
}

function saveUserTemplate(userId, data = {}) {
  if (hasUserTemplateName(userId, data.name)) {
    throw new Error("模板名称已存在，请重命名");
  }

  const templates = getUserTemplates(userId);
  const appearance = TEMPLATE_APPEARANCES[templates.length % TEMPLATE_APPEARANCES.length];
  const template = {
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(data.name || "未命名模板").trim() || "未命名模板",
    icon: appearance.icon,
    tone: appearance.tone,
    actions: Array.isArray(data.actions) ? data.actions : []
  };

  wx.setStorageSync(getStorageKey(userId), templates.concat(template));
  return { ...template };
}

function updateUserTemplate(userId, templateId, data = {}) {
  const templates = getUserTemplates(userId);
  const index = templates.findIndex((template) => template.id === templateId);

  if (index < 0) {
    throw new Error("模板不存在或已删除");
  }

  if (hasUserTemplateName(userId, data.name, templateId)) {
    throw new Error("模板名称已存在，请重命名");
  }

  const template = {
    ...templates[index],
    name: String(data.name || "未命名模板").trim() || "未命名模板",
    actions: Array.isArray(data.actions) ? data.actions : []
  };
  const updatedTemplates = templates.slice();
  updatedTemplates[index] = template;
  wx.setStorageSync(getStorageKey(userId), updatedTemplates);

  return { ...template };
}

function deleteUserTemplate(userId, templateId) {
  const templates = getUserTemplates(userId);
  const updatedTemplates = templates.filter((template) => template.id !== templateId);

  if (updatedTemplates.length === templates.length) {
    throw new Error("模板不存在或已删除");
  }

  wx.setStorageSync(getStorageKey(userId), updatedTemplates);
}

module.exports = {
  getUserTemplates,
  getUserTemplate,
  hasUserTemplateName,
  saveUserTemplate,
  updateUserTemplate,
  deleteUserTemplate
};

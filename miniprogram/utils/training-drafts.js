const STORAGE_KEY_PREFIX = "gymextra-training-drafts";

function getCurrentUserId() {
  try {
    const app = getApp();
    const userId = app && app.globalData && app.globalData.userId;
    return userId ? String(userId) : "";
  } catch (error) {
    return "";
  }
}

function getStorageKey(userId = getCurrentUserId()) {
  return userId ? `${STORAGE_KEY_PREFIX}:${encodeURIComponent(userId)}` : "";
}

function getTrainingDrafts() {
  const userId = getCurrentUserId();
  const storageKey = getStorageKey(userId);

  if (!storageKey) {
    return [];
  }

  try {
    const drafts = wx.getStorageSync(storageKey);
    return Array.isArray(drafts)
      ? drafts.filter((draft) => draft && draft.userId === userId)
      : [];
  } catch (error) {
    console.error("读取训练暂存失败", error);
    return [];
  }
}

function getTrainingDraft(draftId) {
  return getTrainingDrafts().find((draft) => draft && draft.draftId === draftId) || null;
}

function saveTrainingDraft(draft) {
  const userId = getCurrentUserId();
  const storageKey = getStorageKey(userId);

  if (!storageKey) {
    console.warn("未登录用户，跳过训练暂存");
    return null;
  }

  const drafts = getTrainingDrafts();
  const draftId = draft.draftId || `draft-${Date.now()}`;
  const now = Date.now();
  const actions = Array.isArray(draft.actions) ? draft.actions : [];
  const nextDraft = {
    ...draft,
    userId,
    draftId,
    uuid: draftId,
    status: "incomplete",
    createdAt: draft.createdAt || now,
    updatedAt: now,
    actions,
    actionsCount: actions.length,
    setsCount: actions.reduce((sum, action) => sum + (Array.isArray(action.sets) ? action.sets.length : 0), 0),
    actionCategories: actions.map((action) => action.categoryId).filter(Boolean),
    actionNames: actions.map((action) => action.name).filter(Boolean)
  };
  const index = drafts.findIndex((item) => item && item.draftId === draftId);

  if (index >= 0) {
    drafts[index] = nextDraft;
  } else {
    drafts.unshift(nextDraft);
  }

  wx.setStorageSync(storageKey, drafts.slice(0, 20));
  return nextDraft;
}

function removeTrainingDraft(draftId) {
  if (!draftId) return;
  const storageKey = getStorageKey();

  if (!storageKey) return;

  wx.setStorageSync(storageKey, getTrainingDrafts().filter((draft) => draft && draft.draftId !== draftId));
}

module.exports = { getTrainingDrafts, getTrainingDraft, saveTrainingDraft, removeTrainingDraft };

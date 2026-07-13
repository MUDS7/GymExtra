const STORAGE_KEY = "gymextra-training-drafts";

function getTrainingDrafts() {
  try {
    const drafts = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(drafts) ? drafts : [];
  } catch (error) {
    console.error("读取训练暂存失败", error);
    return [];
  }
}

function getTrainingDraft(draftId) {
  return getTrainingDrafts().find((draft) => draft && draft.draftId === draftId) || null;
}

function saveTrainingDraft(draft) {
  const drafts = getTrainingDrafts();
  const draftId = draft.draftId || `draft-${Date.now()}`;
  const now = Date.now();
  const actions = Array.isArray(draft.actions) ? draft.actions : [];
  const nextDraft = {
    ...draft,
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

  wx.setStorageSync(STORAGE_KEY, drafts.slice(0, 20));
  return nextDraft;
}

function removeTrainingDraft(draftId) {
  if (!draftId) return;
  wx.setStorageSync(STORAGE_KEY, getTrainingDrafts().filter((draft) => draft && draft.draftId !== draftId));
}

module.exports = { getTrainingDrafts, getTrainingDraft, saveTrainingDraft, removeTrainingDraft };

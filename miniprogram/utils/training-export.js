const { ACTION_TABLE } = require("../data/actions");
const englishNames = require("../data/action-english-names");

const actionsById = new Map(ACTION_TABLE.map((action) => [String(action.id), action]));
const actionsByName = new Map();
ACTION_TABLE.forEach((action) => {
  const matches = actionsByName.get(action.name) || [];
  matches.push(action);
  actionsByName.set(action.name, matches);
});

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatRecordTime(value) {
  if (value === null || value === undefined || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function exportAction(action) {
  // Saved records predate English names; resolve the original catalog item by ID.
  let catalogAction = actionsById.get(String(action.actionId ?? action.id));
  if (!catalogAction && !action.isCustom) {
    const matches = (actionsByName.get(action.name) || [])
      .filter((item) => !action.categoryId || item.categoryId === action.categoryId);
    if (matches.length === 1) catalogAction = matches[0];
  }
  const sets = Array.isArray(action.sets) ? action.sets : [];
  return {
    "中文名称": action.name || (catalogAction && catalogAction.name) || "未命名动作",
    "英文名称": action.englishName || (catalogAction && englishNames[catalogAction.sourceId]) || "",
    "组数": sets.length,
    "每组": sets.map((set, index) => ({
      "组序号": index + 1,
      "重量": optionalNumber(set.weight),
      "次数": optionalNumber(set.reps),
      "已完成": Boolean(set.completed)
    }))
  };
}

function buildTrainingExport(trainings) {
  return trainings.map((training) => ({
    "记录时间": formatRecordTime(training.createdAt),
    "标题": training.title || "未命名训练",
    "重量单位": "kg",
    "动作": (Array.isArray(training.actions) ? training.actions : []).map(exportAction)
  }));
}

module.exports = { buildTrainingExport };

const { ACTION_TABLE } = require("../data/actions");

const CARDIO_ACTION_NAMES = new Set(
  ACTION_TABLE
    .filter((action) => action.categoryId === "cardio")
    .map((action) => action.name)
);

function getTrainingTags(training) {
  const isIncomplete = training && training.status === "incomplete";

  if (isIncomplete) {
    return [{ label: "未完成", tone: "incomplete" }];
  }

  const categories = Array.isArray(training.actionCategories) ? training.actionCategories : [];
  const actionNames = Array.isArray(training.actionNames) ? training.actionNames : [];
  const cardioCategoryCount = categories.filter((categoryId) => categoryId === "cardio").length;
  const cardioNameCount = actionNames.filter((name) => CARDIO_ACTION_NAMES.has(name)).length;
  const cardioCount = Math.max(cardioCategoryCount, cardioNameCount);
  const actionsCount = Math.max(
    Number(training.actionsCount || 0),
    categories.length,
    actionNames.length
  );
  const hasCardio = cardioCount > 0;
  const hasStrength = !hasCardio || actionsCount > cardioCount;
  const tags = [];

  if (hasStrength) {
    tags.push({ label: "力量", tone: "energy" });
  }

  if (hasCardio) {
    tags.push({ label: "有氧", tone: "cool" });
  }

  return tags;
}

module.exports = { getTrainingTags };

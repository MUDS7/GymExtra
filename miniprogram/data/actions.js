const catalog = require("./action-catalog");

const LEGACY_ICON_ROOT = "cloud://cloud1-d0g045i05d14e02d0/actions/icons";

// These illustrations were already uploaded before the workbook-based action
// catalog was introduced. Keep using them when a catalog item has no newer
// generated illustration, otherwise existing actions regress to the default
// bench-press image.
const LEGACY_ICON_FILENAMES = {
  "侧平举": "shoulders-lateral-raise.png",
  "超人式": "back-superman.png",
  "锤式弯举": "biceps-hammer-curl.png",
  "俄罗斯转体": "core-russian-twist.png",
  "俯身飞鸟": "shoulders-bent-over-fly.png",
  "俯卧撑": "chest-push-up.png",
  "俯卧杠铃划船": "back-prone-barbell-row.png",
  "俯卧哑铃划船": "back-prone-dumbbell-row.png",
  "杠铃划船": "back-barbell-row.png",
  "杠铃片夹胸": "chest-plate-squeeze.png",
  "杠铃耸肩": "back-barbell-shrug.png",
  "杠铃弯举": "biceps-barbell-curl.png",
  "杠铃卧推": "chest-bench-press.png",
  "划船机": "cardio-rowing-machine.png",
  "集中弯举": "biceps-concentration-curl.png",
  "卷腹": "core-crunch.png",
  "快走": "cardio-brisk-walking.png",
  "宽距杠铃卧推": "chest-wide-grip-bench-press.png",
  "宽握引体向上": "back-wide-grip-pull-up.png",
  "罗马尼亚硬拉": "legs-romanian-deadlift.png",
  "面拉": "back-face-pull.png",
  "牧师凳弯举": "biceps-preacher-curl.png",
  "鸟狗式": "core-bird-dog.png",
  "潘德雷划船": "back-pendlay-row.png",
  "平板支撑": "plank.png",
  "器械推胸": "chest-machine-press.png",
  "前平举": "shoulders-front-raise.png",
  "山羊挺身": "back-goat-extension.png",
  "上斜杠铃卧推": "chest-incline-barbell-bench-press.png",
  "上斜哑铃弯举": "biceps-incline-dumbbell-curl.png",
  "上斜哑铃卧推": "chest-incline-dumbbell-bench-press.png",
  "深蹲": "legs-squat.png",
  "绳索侧平举": "shoulders-cable-lateral-raise.png",
  "绳索高位下拉": "back-rope-lat-pulldown.png",
  "绳索夹胸": "chest-cable-fly.png",
  "绳索弯举": "biceps-cable-curl.png",
  "抬腿杠铃卧推": "chest-feet-up-bench-press.png",
  "跳绳": "cardio-jump-rope.png",
  "腿举": "legs-leg-press.png",
  "腿弯举": "legs-leg-curl.png",
  "下斜杠铃卧推": "chest-decline-barbell-bench-press.png",
  "相扑深蹲": "glutes-sumo-squat.png",
  "相扑硬拉": "legs-sumo-deadlift.png",
  "哑铃耸肩": "back-dumbbell-shrug.png",
  "哑铃弯举": "biceps-dumbbell-curl.png",
  "哑铃卧推": "chest-dumbbell-bench-press.png",
  "哑铃硬拉": "back-dumbbell-deadlift.png",
  "引体向上": "back-pull-up.png",
  "暂停卧推": "chest-paused-bench-press.png",
  "钻石俯卧撑": "triceps-diamond-push-up.png",
  "坐姿划船": "back-seated-cable-row.png"
};

const ACTION_TABLE = catalog.ACTION_TABLE.map((action) => {
  const legacyFilename = !action.hasCustomIcon && LEGACY_ICON_FILENAMES[action.name];
  if (!legacyFilename) return action;

  const iconFileID = `${LEGACY_ICON_ROOT}/${legacyFilename}`;
  return {
    ...action,
    iconPath: iconFileID,
    iconFileID,
    iconDownloadPath: iconFileID,
    iconCached: false
  };
});

module.exports = {
  ...catalog,
  ACTION_TABLE
};

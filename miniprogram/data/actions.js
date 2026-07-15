const DEFAULT_ACTION_ICON_PATH = "/assets/default-action.png";

// 动作示意图均来自 Wikimedia Commons 的 Everkinetic 线条图系列，按动作模式匹配。
const CATEGORY_ICON_PATHS = {
  chest: DEFAULT_ACTION_ICON_PATH,
  back: "/assets/action-icons/back-row.png",
  legs: "/assets/action-icons/squat.png",
  shoulders: "/assets/action-icons/shoulder-press.png",
  biceps: "/assets/action-icons/biceps-curl.png",
  triceps: "/assets/action-icons/triceps-pushdown.png",
  glutes: "/assets/action-icons/glute-bridge.png",
  core: "/assets/action-icons/core-crunch.png",
  cardio: "/assets/action-icons/shoulder-press.png"
};

// 胸部动作使用独立的线条示意图；资源与授权信息见 action-icons/ATTRIBUTION.md。
const CHEST_ACTION_ICON_PATHS = {
  "杠铃卧推": "/assets/action-icons/chest-bench-press.png",
  "暂停卧推": "/assets/action-icons/chest-paused-bench-press.png",
  "宽距杠铃卧推": "/assets/action-icons/chest-wide-grip-bench-press.png",
  "上斜杠铃卧推": "/assets/action-icons/chest-incline-barbell-bench-press.png",
  "下斜杠铃卧推": "/assets/action-icons/chest-decline-barbell-bench-press.png",
  "杠铃片夹胸": "/assets/action-icons/chest-plate-squeeze.png",
  "抬腿杠铃卧推": "/assets/action-icons/chest-feet-up-bench-press.png",
  "哑铃卧推": "/assets/action-icons/chest-dumbbell-bench-press.png",
  "上斜哑铃卧推": "/assets/action-icons/chest-incline-dumbbell-bench-press.png",
  "器械推胸": "/assets/action-icons/chest-machine-press.png",
  "俯卧撑": "/assets/action-icons/chest-push-up.png",
  "绳索夹胸": "/assets/action-icons/chest-cable-fly.png",
  "蝴蝶机夹胸": "/assets/action-icons/chest-pec-deck-fly.png"
};

const BACK_ACTION_ICON_PATHS = {
  "高位下拉": "/assets/action-icons/back-lat-pulldown.png",
  "坐姿划船": "/assets/action-icons/back-seated-cable-row.png",
  "杠铃划船": "/assets/action-icons/back-barbell-row.png",
  "引体向上": "/assets/action-icons/back-pull-up.png",
  "传统硬拉": "/assets/action-icons/back-conventional-deadlift.png",
  "单臂哑铃划船": "/assets/action-icons/back-one-arm-dumbbell-row.png",
  "T杠划船": "/assets/action-icons/back-t-bar-row.png",
  "胸托划船": "/assets/action-icons/back-chest-supported-row.png",
  "直臂下压": "/assets/action-icons/back-straight-arm-pulldown.png",
  "面拉": "/assets/action-icons/back-face-pull.png",
  "反向划船": "/assets/action-icons/back-inverted-row.png",
  "宽握高位下拉": "/assets/action-icons/back-wide-grip-lat-pulldown.png",
  "窄握高位下拉": "/assets/action-icons/back-close-grip-lat-pulldown.png",
  "反握高位下拉": "/assets/action-icons/back-underhand-lat-pulldown.png",
  "单臂高位下拉": "/assets/action-icons/back-one-arm-lat-pulldown.png",
  "辅助引体向上": "/assets/action-icons/back-assisted-pull-up.png",
  "宽握引体向上": "/assets/action-icons/back-wide-grip-pull-up.png",
  "中立握引体向上": "/assets/action-icons/back-neutral-grip-pull-up.png",
  "坐姿器械划船": "/assets/action-icons/back-seated-machine-row.png",
  "单臂器械划船": "/assets/action-icons/back-one-arm-machine-row.png",
  "单臂绳索划船": "/assets/action-icons/back-one-arm-cable-row.png",
  "俯身哑铃划船": "/assets/action-icons/back-bent-over-dumbbell-row.png",
  "反握杠铃划船": "/assets/action-icons/back-reverse-grip-barbell-row.png",
  "潘德雷划船": "/assets/action-icons/back-pendlay-row.png",
  "杠铃耸肩": "/assets/action-icons/back-barbell-shrug.png",
  "哑铃耸肩": "/assets/action-icons/back-dumbbell-shrug.png",
  "罗马椅挺身": "/assets/action-icons/back-roman-chair-extension.png",
  "架上硬拉": "/assets/action-icons/back-rack-pull.png",
  "哑铃硬拉": "/assets/action-icons/back-dumbbell-deadlift.png",
  "V把高位下拉": "/assets/action-icons/back-v-bar-lat-pulldown.png",
  "绳索高位下拉": "/assets/action-icons/back-rope-lat-pulldown.png",
  "单臂跪姿高位下拉": "/assets/action-icons/back-kneeling-one-arm-lat-pulldown.png",
  "反握单臂下拉": "/assets/action-icons/back-underhand-one-arm-lat-pulldown.png",
  "负重引体向上": "/assets/action-icons/back-weighted-pull-up.png",
  "离心引体向上": "/assets/action-icons/back-eccentric-pull-up.png",
  "悬垂肩胛下沉": "/assets/action-icons/back-scapular-pull-up.png",
  "宽握坐姿划船": "/assets/action-icons/back-wide-grip-seated-row.png",
  "窄握坐姿划船": "/assets/action-icons/back-close-grip-seated-row.png",
  "V把坐姿划船": "/assets/action-icons/back-v-bar-seated-row.png",
  "高位器械划船": "/assets/action-icons/back-high-machine-row.png",
  "地雷管划船": "/assets/action-icons/back-landmine-row.png",
  "史密斯杠铃划船": "/assets/action-icons/back-smith-machine-row.png",
  "俯卧杠铃划船": "/assets/action-icons/back-prone-barbell-row.png",
  "俯卧哑铃划船": "/assets/action-icons/back-prone-dumbbell-row.png",
  "交替哑铃划船": "/assets/action-icons/back-alternating-dumbbell-row.png",
  "俯身绳索划船": "/assets/action-icons/back-bent-over-cable-row.png",
  "直臂哑铃后拉": "/assets/action-icons/back-straight-arm-dumbbell-pullover.png",
  "哑铃上拉": "/assets/action-icons/back-dumbbell-pullover.png",
  "早安式": "/assets/action-icons/back-good-morning.png",
  "超人式": "/assets/action-icons/back-superman.png",
  "俯卧挺身": "/assets/action-icons/back-prone-extension.png"
};

const LEG_ACTION_ICON_PATHS = {
  "深蹲": "/assets/action-icons/legs-squat.png",
  "腿举": "/assets/action-icons/legs-leg-press.png",
  "弓步蹲": "/assets/action-icons/legs-lunge.png",
  "腿屈伸": "/assets/action-icons/legs-leg-extension.png",
  "颈前深蹲": "/assets/action-icons/legs-front-squat.png",
  "高脚杯深蹲": "/assets/action-icons/legs-goblet-squat.png",
  "哈克深蹲": "/assets/action-icons/legs-hack-squat.png",
  "罗马尼亚硬拉": "/assets/action-icons/legs-romanian-deadlift.png",
  "腿弯举": "/assets/action-icons/legs-leg-curl.png",
  "登台阶": "/assets/action-icons/legs-step-up.png",
  "提踵": "/assets/action-icons/legs-calf-raise.png",
  "相扑硬拉": "/assets/action-icons/legs-sumo-deadlift.png",
  "保加利亚单腿蹲": "/assets/action-icons/legs-bulgarian-split-squat.png"
};

const SHOULDER_ACTION_ICON_PATHS = {
  "肩推": "/assets/action-icons/shoulders-press.png",
  "侧平举": "/assets/action-icons/shoulders-lateral-raise.png",
  "俯身飞鸟": "/assets/action-icons/shoulders-bent-over-fly.png",
  "前平举": "/assets/action-icons/shoulders-front-raise.png",
  "杠铃推举": "/assets/action-icons/shoulders-barbell-press.png",
  "哑铃肩推": "/assets/action-icons/shoulders-dumbbell-press.png",
  "阿诺德推举": "/assets/action-icons/shoulders-arnold-press.png",
  "绳索侧平举": "/assets/action-icons/shoulders-cable-lateral-raise.png",
  "反向蝴蝶机": "/assets/action-icons/shoulders-reverse-pec-deck.png",
  "直立划船": "/assets/action-icons/shoulders-upright-row.png"
};

const BICEPS_ACTION_ICON_PATHS = {
  "杠铃弯举": "/assets/action-icons/biceps-barbell-curl.png",
  "哑铃弯举": "/assets/action-icons/biceps-dumbbell-curl.png",
  "锤式弯举": "/assets/action-icons/biceps-hammer-curl.png",
  "牧师凳弯举": "/assets/action-icons/biceps-preacher-curl.png",
  "上斜哑铃弯举": "/assets/action-icons/biceps-incline-dumbbell-curl.png",
  "集中弯举": "/assets/action-icons/biceps-concentration-curl.png",
  "绳索弯举": "/assets/action-icons/biceps-cable-curl.png",
  "反握弯举": "/assets/action-icons/biceps-reverse-curl.png"
};

const TRICEPS_ACTION_ICON_PATHS = {
  "绳索下压": "/assets/action-icons/triceps-rope-pushdown.png",
  "窄距卧推": "/assets/action-icons/triceps-close-grip-bench-press.png",
  "臂屈伸": "/assets/action-icons/triceps-dip.png",
  "仰卧臂屈伸": "/assets/action-icons/triceps-lying-extension.png",
  "过顶臂屈伸": "/assets/action-icons/triceps-overhead-extension.png",
  "哑铃臂后伸": "/assets/action-icons/triceps-dumbbell-kickback.png",
  "绳索过顶臂屈伸": "/assets/action-icons/triceps-cable-overhead-extension.png",
  "钻石俯卧撑": "/assets/action-icons/triceps-diamond-push-up.png"
};

const GLUTE_ACTION_ICON_PATHS = {
  "臀桥": "/assets/action-icons/glutes-bridge.png",
  "臀推": "/assets/action-icons/glutes-hip-thrust.png",
  "绳索后踢腿": "/assets/action-icons/glutes-cable-kickback.png",
  "保加利亚分腿蹲": "/assets/action-icons/glutes-bulgarian-split-squat.png",
  "相扑深蹲": "/assets/action-icons/glutes-sumo-squat.png",
  "髋外展": "/assets/action-icons/glutes-hip-abduction.png",
  "反向弓步蹲": "/assets/action-icons/glutes-reverse-lunge.png",
  "蛙式臀桥": "/assets/action-icons/glutes-frog-bridge.png"
};

const CORE_ACTION_ICON_PATHS = {
  "卷腹": "/assets/action-icons/core-crunch.png",
  "平板支撑": "/resource/plank.png",
  "俄罗斯转体": "/assets/action-icons/core-russian-twist.png",
  "悬垂举腿": "/assets/action-icons/core-hanging-leg-raise.png",
  "仰卧起坐": "/assets/action-icons/core-sit-up.png",
  "自行车卷腹": "/assets/action-icons/core-bicycle-crunch.png",
  "死虫式": "/assets/action-icons/core-dead-bug.png",
  "鸟狗式": "/assets/action-icons/core-bird-dog.png",
  "健腹轮": "/assets/action-icons/core-ab-wheel.png",
  "登山跑": "/assets/action-icons/core-mountain-climber.png",
  "侧平板支撑": "/assets/action-icons/core-side-plank.png",
  "帕洛夫抗旋转": "/assets/action-icons/core-pallof-press.png"
};

const CARDIO_ACTION_ICON_PATHS = {
  "跑步": "/assets/action-icons/cardio-running.png",
  "快走": "/assets/action-icons/cardio-brisk-walking.png",
  "骑行": "/assets/action-icons/cardio-cycling.png",
  "动感单车": "/assets/action-icons/cardio-stationary-bike.png",
  "游泳": "/assets/action-icons/cardio-swimming.png",
  "跳绳": "/assets/action-icons/cardio-jump-rope.png",
  "椭圆机": "/assets/action-icons/cardio-elliptical.png",
  "划船机": "/assets/action-icons/cardio-rowing-machine.png",
  "爬楼机": "/assets/action-icons/cardio-stair-climber.png",
  "有氧操": "/assets/action-icons/cardio-aerobics.png"
};

function getActionIconPath(name, categoryId) {
  if (categoryId === "chest") return CHEST_ACTION_ICON_PATHS[name] || DEFAULT_ACTION_ICON_PATH;
  if (categoryId === "back") return BACK_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.back;
  if (categoryId === "legs") return LEG_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.legs;
  if (categoryId === "shoulders") return SHOULDER_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.shoulders;
  if (categoryId === "biceps") return BICEPS_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.biceps;
  if (categoryId === "triceps") return TRICEPS_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.triceps;
  if (categoryId === "glutes") return GLUTE_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.glutes;
  if (categoryId === "core") return CORE_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.core;
  if (categoryId === "cardio") return CARDIO_ACTION_ICON_PATHS[name] || CATEGORY_ICON_PATHS.cardio;
  return CATEGORY_ICON_PATHS[categoryId] || DEFAULT_ACTION_ICON_PATH;
}

// FNV-1a 32 位哈希。相同的动作名称始终得到相同的无符号数字 ID。
function hashActionName(name) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

const ACTION_DEFINITIONS = [
  { name: "杠铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "暂停卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "宽距杠铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "上斜杠铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "下斜杠铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "杠铃片夹胸", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "抬腿杠铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "上斜哑铃卧推", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "器械推胸", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯卧撑", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索夹胸", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "蝴蝶机夹胸", categoryId: "chest", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "坐姿划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "杠铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "传统硬拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "单臂哑铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "T杠划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "胸托划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "直臂下压", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "面拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反向划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "宽握高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "窄握高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反握高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "单臂高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "辅助引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "宽握引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "中立握引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "坐姿器械划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "单臂器械划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "单臂绳索划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯身哑铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反握杠铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "潘德雷划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "杠铃耸肩", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃耸肩", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "罗马椅挺身", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "架上硬拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃硬拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "V把高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "单臂跪姿高位下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反握单臂下拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "负重引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "离心引体向上", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "悬垂肩胛下沉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "宽握坐姿划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "窄握坐姿划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "V把坐姿划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "高位器械划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "地雷管划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "史密斯杠铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯卧杠铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯卧哑铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "交替哑铃划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯身绳索划船", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "直臂哑铃后拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃上拉", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "早安式", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "超人式", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯卧挺身", categoryId: "back", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "深蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "腿举", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "弓步蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "腿屈伸", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "颈前深蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "高脚杯深蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哈克深蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "罗马尼亚硬拉", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "腿弯举", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "登台阶", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "提踵", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "相扑硬拉", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "保加利亚单腿蹲", categoryId: "legs", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "肩推", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "侧平举", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俯身飞鸟", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "前平举", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "杠铃推举", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃肩推", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "阿诺德推举", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索侧平举", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反向蝴蝶机", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "直立划船", categoryId: "shoulders", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "杠铃弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "锤式弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "牧师凳弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "上斜哑铃弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "集中弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反握弯举", categoryId: "biceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索下压", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "窄距卧推", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "臂屈伸", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "仰卧臂屈伸", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "过顶臂屈伸", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "哑铃臂后伸", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索过顶臂屈伸", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "钻石俯卧撑", categoryId: "triceps", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "臀桥", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "臀推", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "绳索后踢腿", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "保加利亚分腿蹲", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "相扑深蹲", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "髋外展", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "反向弓步蹲", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "蛙式臀桥", categoryId: "glutes", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "卷腹", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "平板支撑", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "俄罗斯转体", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "悬垂举腿", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "仰卧起坐", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "自行车卷腹", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "死虫式", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "鸟狗式", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "健腹轮", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "登山跑", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "侧平板支撑", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "帕洛夫抗旋转", categoryId: "core", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "跑步", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "快走", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "骑行", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "动感单车", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "游泳", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "跳绳", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "椭圆机", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "划船机", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "爬楼机", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH },
  { name: "有氧操", categoryId: "cardio", iconPath: DEFAULT_ACTION_ICON_PATH }
];

const ACTION_TABLE = ACTION_DEFINITIONS.map((action) => ({
  id: hashActionName(action.name),
  ...action,
  iconPath: getActionIconPath(action.name, action.categoryId)
}));

const actionIds = new Set(ACTION_TABLE.map((action) => action.id));
if (actionIds.size !== ACTION_TABLE.length) {
  throw new Error("动作名称哈希发生冲突，请调整哈希算法或动作名称");
}

module.exports = {
  ACTION_TABLE,
  DEFAULT_ACTION_ICON_PATH,
  hashActionName
};

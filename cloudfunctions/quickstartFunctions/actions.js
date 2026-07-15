const cloud = require("wx-server-sdk");
const fs = require("fs");
const path = require("path");

const db = cloud.database();
const COLLECTION = "actions";
const DATA_VERSION = 13;
const DEFAULT_ACTION_ICON_PATH = "/assets/action-icons/bench-press.png";
const ACTION_ICON_CLOUD_PATH = "actions/icons/line-action-fallback.png";
const ACTION_ICON_LOCAL_PATH = path.join(__dirname, "assets", "default-action.png");

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

function hashActionName(name) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

const ACTION_DEFINITIONS = [
  ["杠铃卧推", "chest"],
  ["暂停卧推", "chest"],
  ["宽距杠铃卧推", "chest"],
  ["上斜杠铃卧推", "chest"],
  ["下斜杠铃卧推", "chest"],
  ["杠铃片夹胸", "chest"],
  ["抬腿杠铃卧推", "chest"],
  ["哑铃卧推", "chest"],
  ["上斜哑铃卧推", "chest"],
  ["器械推胸", "chest"],
  ["俯卧撑", "chest"],
  ["绳索夹胸", "chest"],
  ["蝴蝶机夹胸", "chest"],
  ["高位下拉", "back"],
  ["坐姿划船", "back"],
  ["杠铃划船", "back"],
  ["引体向上", "back"],
  ["传统硬拉", "back"],
  ["单臂哑铃划船", "back"],
  ["T杠划船", "back"],
  ["胸托划船", "back"],
  ["直臂下压", "back"],
  ["面拉", "back"],
  ["反向划船", "back"],
  ["宽握高位下拉", "back"],
  ["窄握高位下拉", "back"],
  ["反握高位下拉", "back"],
  ["单臂高位下拉", "back"],
  ["辅助引体向上", "back"],
  ["宽握引体向上", "back"],
  ["中立握引体向上", "back"],
  ["坐姿器械划船", "back"],
  ["单臂器械划船", "back"],
  ["单臂绳索划船", "back"],
  ["俯身哑铃划船", "back"],
  ["反握杠铃划船", "back"],
  ["潘德雷划船", "back"],
  ["杠铃耸肩", "back"],
  ["哑铃耸肩", "back"],
  ["罗马椅挺身", "back"],
  ["架上硬拉", "back"],
  ["哑铃硬拉", "back"],
  ["V把高位下拉", "back"],
  ["绳索高位下拉", "back"],
  ["单臂跪姿高位下拉", "back"],
  ["反握单臂下拉", "back"],
  ["负重引体向上", "back"],
  ["离心引体向上", "back"],
  ["悬垂肩胛下沉", "back"],
  ["宽握坐姿划船", "back"],
  ["窄握坐姿划船", "back"],
  ["V把坐姿划船", "back"],
  ["高位器械划船", "back"],
  ["地雷管划船", "back"],
  ["史密斯杠铃划船", "back"],
  ["俯卧杠铃划船", "back"],
  ["俯卧哑铃划船", "back"],
  ["交替哑铃划船", "back"],
  ["俯身绳索划船", "back"],
  ["直臂哑铃后拉", "back"],
  ["哑铃上拉", "back"],
  ["早安式", "back"],
  ["超人式", "back"],
  ["俯卧挺身", "back"],
  ["深蹲", "legs"],
  ["腿举", "legs"],
  ["弓步蹲", "legs"],
  ["腿屈伸", "legs"],
  ["颈前深蹲", "legs"],
  ["高脚杯深蹲", "legs"],
  ["哈克深蹲", "legs"],
  ["罗马尼亚硬拉", "legs"],
  ["腿弯举", "legs"],
  ["登台阶", "legs"],
  ["提踵", "legs"],
  ["相扑硬拉", "legs"],
  ["保加利亚单腿蹲", "legs"],
  ["肩推", "shoulders"],
  ["侧平举", "shoulders"],
  ["俯身飞鸟", "shoulders"],
  ["前平举", "shoulders"],
  ["杠铃推举", "shoulders"],
  ["哑铃肩推", "shoulders"],
  ["阿诺德推举", "shoulders"],
  ["绳索侧平举", "shoulders"],
  ["反向蝴蝶机", "shoulders"],
  ["直立划船", "shoulders"],
  ["杠铃弯举", "biceps"],
  ["哑铃弯举", "biceps"],
  ["锤式弯举", "biceps"],
  ["牧师凳弯举", "biceps"],
  ["上斜哑铃弯举", "biceps"],
  ["集中弯举", "biceps"],
  ["绳索弯举", "biceps"],
  ["反握弯举", "biceps"],
  ["绳索下压", "triceps"],
  ["窄距卧推", "triceps"],
  ["臂屈伸", "triceps"],
  ["仰卧臂屈伸", "triceps"],
  ["过顶臂屈伸", "triceps"],
  ["哑铃臂后伸", "triceps"],
  ["绳索过顶臂屈伸", "triceps"],
  ["钻石俯卧撑", "triceps"],
  ["臀桥", "glutes"],
  ["臀推", "glutes"],
  ["绳索后踢腿", "glutes"],
  ["保加利亚分腿蹲", "glutes"],
  ["相扑深蹲", "glutes"],
  ["髋外展", "glutes"],
  ["反向弓步蹲", "glutes"],
  ["蛙式臀桥", "glutes"],
  ["卷腹", "core"],
  ["平板支撑", "core"],
  ["俄罗斯转体", "core"],
  ["悬垂举腿", "core"],
  ["仰卧起坐", "core"],
  ["自行车卷腹", "core"],
  ["死虫式", "core"],
  ["鸟狗式", "core"],
  ["健腹轮", "core"],
  ["登山跑", "core"],
  ["侧平板支撑", "core"],
  ["帕洛夫抗旋转", "core"],
  ["跑步", "cardio"],
  ["快走", "cardio"],
  ["骑行", "cardio"],
  ["动感单车", "cardio"],
  ["游泳", "cardio"],
  ["跳绳", "cardio"],
  ["椭圆机", "cardio"],
  ["划船机", "cardio"],
  ["爬楼机", "cardio"],
  ["有氧操", "cardio"]
];

const ACTION_TABLE = ACTION_DEFINITIONS.map(([name, categoryId], order) => ({
  id: hashActionName(name),
  name,
  categoryId,
  iconPath: getActionIconPath(name, categoryId),
  order,
  type: "action"
}));

if (new Set(ACTION_TABLE.map((action) => action.id)).size !== ACTION_TABLE.length) {
  throw new Error("动作名称哈希发生冲突，请调整哈希算法或动作名称");
}

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时继续执行。
  }
}

async function getSeedVersion() {
  try {
    const result = await db.collection(COLLECTION).doc("__seed_meta__").get();
    return result.data && result.data.version;
  } catch (error) {
    return null;
  }
}

function getActionIconLocalPath(iconPath) {
  if (typeof iconPath === "string" && iconPath.indexOf("/assets/action-icons/") === 0) {
    return path.join(__dirname, "assets", "action-icons", path.basename(iconPath));
  }

  if (iconPath === "/resource/plank.png") {
    return path.join(__dirname, "assets", "plank.png");
  }

  return ACTION_ICON_LOCAL_PATH;
}

async function uploadActionIcons() {
  const iconPaths = Array.from(new Set(ACTION_TABLE.map((action) => action.iconPath)));
  const iconFileIDs = {};

  // 保持较小的并发量，避免首次初始化时过多请求同时占用云存储资源。
  for (let index = 0; index < iconPaths.length; index += 8) {
    const batch = iconPaths.slice(index, index + 8);
    const uploaded = await Promise.all(batch.map(async (iconPath) => {
      const localPath = getActionIconLocalPath(iconPath);

      if (!fs.existsSync(localPath)) {
        throw new Error(`动作图标源文件不存在：${localPath}`);
      }

      const result = await cloud.uploadFile({
        cloudPath: `actions/icons/${path.basename(localPath)}`,
        fileContent: fs.readFileSync(localPath)
      });

      if (!result.fileID) {
        throw new Error(`动作图标上传失败：${iconPath}`);
      }

      return [iconPath, result.fileID];
    }));

    uploaded.forEach(([iconPath, fileID]) => {
      iconFileIDs[iconPath] = fileID;
    });
  }

  return iconFileIDs;
}

async function syncActions() {
  await ensureCollection();

  if ((await getSeedVersion()) === DATA_VERSION) {
    return;
  }

  const iconFileIDs = await uploadActionIcons();

  await Promise.all(ACTION_TABLE.map((action) => db.collection(COLLECTION).doc(String(action.id)).set({
    data: {
      ...action,
      iconFileID: iconFileIDs[action.iconPath]
    }
  })));

  await db.collection(COLLECTION).doc("__seed_meta__").set({
    data: {
      version: DATA_VERSION,
      actionCount: ACTION_TABLE.length,
      iconStyle: "wikimedia-line-cloud",
      iconCount: Object.keys(iconFileIDs).length,
      updatedAt: db.serverDate()
    }
  });
}

async function getActions() {
  try {
    await syncActions();
    const collection = db.collection(COLLECTION).where({ type: "action" });
    const [firstPage, secondPage] = await Promise.all([
      collection.limit(100).get(),
      collection.skip(100).limit(100).get()
    ]);
    const actions = (firstPage.data || []).concat(secondPage.data || []);

    return {
      success: true,
      data: actions
        .sort((first, second) => first.order - second.order)
        .map(({ _id, type, order, ...action }) => action)
    };
  } catch (error) {
    console.error("读取动作表失败", error);
    return {
      success: false,
      message: error.message || "读取动作表失败"
    };
  }
}

module.exports = {
  getActions,
  syncActions
};

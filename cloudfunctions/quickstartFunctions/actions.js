const cloud = require("wx-server-sdk");
const fs = require("fs");
const path = require("path");

const db = cloud.database();
const COLLECTION = "actions";
const DATA_VERSION = 2;
const ACTION_ICON_CLOUD_PATH = "actions/icons/default-action.png";
const ACTION_ICON_LOCAL_PATH = path.join(__dirname, "assets", "default-action.png");
const DEFAULT_ACTION_ICON_PATH = "/assets/500px-Bench-press-1.png";

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
  ["高位下拉", "back"],
  ["坐姿划船", "back"],
  ["杠铃划船", "back"],
  ["引体向上", "back"],
  ["深蹲", "legs"],
  ["腿举", "legs"],
  ["弓步蹲", "legs"],
  ["腿屈伸", "legs"],
  ["肩推", "shoulders"],
  ["侧平举", "shoulders"],
  ["俯身飞鸟", "shoulders"],
  ["前平举", "shoulders"],
  ["杠铃弯举", "biceps"],
  ["哑铃弯举", "biceps"],
  ["锤式弯举", "biceps"],
  ["牧师凳弯举", "biceps"],
  ["绳索下压", "triceps"],
  ["窄距卧推", "triceps"],
  ["臂屈伸", "triceps"],
  ["仰卧臂屈伸", "triceps"],
  ["臀桥", "glutes"],
  ["臀推", "glutes"],
  ["绳索后踢腿", "glutes"],
  ["保加利亚分腿蹲", "glutes"],
  ["卷腹", "core"],
  ["平板支撑", "core"],
  ["俄罗斯转体", "core"],
  ["悬垂举腿", "core"]
];

const ACTION_TABLE = ACTION_DEFINITIONS.map(([name, categoryId], order) => ({
  id: hashActionName(name),
  name,
  categoryId,
  iconPath: DEFAULT_ACTION_ICON_PATH,
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

async function uploadActionIcon() {
  const result = await cloud.uploadFile({
    cloudPath: ACTION_ICON_CLOUD_PATH,
    fileContent: fs.readFileSync(ACTION_ICON_LOCAL_PATH)
  });

  if (!result.fileID) {
    throw new Error("动作图标上传云存储失败");
  }

  return result.fileID;
}

async function syncActions() {
  await ensureCollection();

  if ((await getSeedVersion()) === DATA_VERSION) {
    return;
  }

  const iconPath = await uploadActionIcon();

  await Promise.all(ACTION_TABLE.map((action) => db.collection(COLLECTION).doc(String(action.id)).set({
    data: {
      ...action,
      iconPath
    }
  })));

  await db.collection(COLLECTION).doc("__seed_meta__").set({
    data: {
      version: DATA_VERSION,
      actionCount: ACTION_TABLE.length,
      iconPath,
      updatedAt: db.serverDate()
    }
  });
}

async function getActions() {
  try {
    await syncActions();
    const result = await db.collection(COLLECTION)
      .where({ type: "action" })
      .limit(100)
      .get();

    return {
      success: true,
      data: result.data
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

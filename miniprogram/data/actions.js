const DEFAULT_ACTION_ICON_PATH = "/assets/500px-Bench-press-1.png";

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
  ...action
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

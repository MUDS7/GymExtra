const cloud = require("wx-server-sdk");
const identity = require("./identity");

const db = cloud.database();
const COLLECTION = "users";
const TEST_USERS = [
  { id: "test-user-001", nickname: "测试用户小李" },
  { id: "test-user-002", nickname: "测试用户小王" }
];

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时会报错，此时可以继续使用。
  }
}

function toPublicUser(record) {
  return {
    id: record._id,
    nickname: record.nickname,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function findUser(openid) {
  const result = await db.collection(COLLECTION).where({ _id: openid }).limit(1).get();
  return result.data[0] || null;
}

async function ensureTestUsers() {
  const now = new Date();
  await Promise.all(TEST_USERS.map(async (user) => {
    try {
      await db.collection(COLLECTION).doc(user.id).get();
    } catch (error) {
      await db.collection(COLLECTION).doc(user.id).set({
        data: {
          nickname: user.nickname,
          avatarUrl: "",
          isTestAccount: true,
          createdAt: now,
          updatedAt: now
        }
      });
    }
  }));
}

async function login(event = {}) {
  await ensureCollection();
  const { openid } = identity.getUserIdentity(event);
  const record = await findUser(openid);

  return {
    success: true,
    registered: Boolean(record),
    userId: openid,
    user: record ? toPublicUser(record) : null
  };
}

async function register(event) {
  await ensureCollection();
  const { openid, unionid } = identity.getUserIdentity(event);
  const nickname = String(event.nickname || "").trim().slice(0, 20);
  const avatarUrl = String(event.avatarUrl || "").trim();

  if (!nickname) {
    return { success: false, message: "请填写昵称" };
  }

  if (!avatarUrl.startsWith("cloud://")) {
    return { success: false, message: "请选择并上传头像" };
  }

  const oldUser = await findUser(openid);
  const now = new Date();
  const data = {
    unionid,
    nickname,
    avatarUrl,
    createdAt: oldUser ? oldUser.createdAt : now,
    updatedAt: now
  };

  await db.collection(COLLECTION).doc(openid).set({ data });
  const record = { _id: openid, ...data };

  return {
    success: true,
    registered: true,
    userId: openid,
    user: toPublicUser(record)
  };
}

async function listTestUsers() {
  await ensureCollection();
  await ensureTestUsers();
  const result = await db.collection(COLLECTION).orderBy("updatedAt", "desc").limit(20).get();
  return {
    success: true,
    data: (result.data || []).map(toPublicUser)
  };
}

module.exports = { login, register, listTestUsers };

const cloud = require("wx-server-sdk");

const db = cloud.database();
const COLLECTION = "users";

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    // 集合已存在时会报错，此时可以继续使用。
  }
}

function getIdentity() {
  const { OPENID, UNIONID } = cloud.getWXContext();

  if (!OPENID) {
    throw new Error("无法获取微信登录身份");
  }

  return { openid: OPENID, unionid: UNIONID || "" };
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

async function login() {
  await ensureCollection();
  const { openid } = getIdentity();
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
  const { openid, unionid } = getIdentity();
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

module.exports = { login, register };

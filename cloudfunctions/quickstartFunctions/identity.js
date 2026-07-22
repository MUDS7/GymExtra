const cloud = require("wx-server-sdk");

function getUserId() {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error("无法获取当前用户身份");
  return OPENID;
}

function getUserIdentity() {
  const { OPENID, UNIONID } = cloud.getWXContext();
  if (!OPENID) throw new Error("无法获取微信登录身份");
  return { openid: OPENID, unionid: UNIONID || "" };
}

module.exports = { getUserId, getUserIdentity };

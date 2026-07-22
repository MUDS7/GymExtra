const cloud = require("wx-server-sdk");

// Temporary test-only identity override. Remove this module and testUserId
// handling before releasing the mini program.
function getTestUserId(event = {}) {
  const value = typeof event.testUserId === "string" ? event.testUserId.trim() : "";
  return value && value.length <= 128 ? value : "";
}

function getUserId(event = {}) {
  const testUserId = getTestUserId(event);
  if (testUserId) return testUserId;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error("无法获取当前用户身份");
  return OPENID;
}

function getUserIdentity(event = {}) {
  const testUserId = getTestUserId(event);
  if (testUserId) return { openid: testUserId, unionid: "" };

  const { OPENID, UNIONID } = cloud.getWXContext();
  if (!OPENID) throw new Error("无法获取微信登录身份");
  return { openid: OPENID, unionid: UNIONID || "" };
}

module.exports = { getUserId, getUserIdentity };

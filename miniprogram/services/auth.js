const { callCloudFunction, uploadCloudFile } = require("./network");

function call(type, data = {}) {
  return callCloudFunction({
    name: "authFunctions",
    data: { type, ...data }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "请求失败，请稍后重试");
    }
    return result;
  });
}

function uploadAvatar(tempFilePath, userId) {
  const cloudPath = `avatars/${userId}/${Date.now()}.jpg`;
  return uploadCloudFile({ cloudPath, filePath: tempFilePath });
}

function registerUser(data) {
  return call("registerUser", data);
}

module.exports = { uploadAvatar, registerUser };

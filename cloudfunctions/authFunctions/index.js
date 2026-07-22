const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const userService = require("./user");

exports.main = async (event = {}) => {
  switch (event.type) {
    case "login":
      return userService.login(event);
    case "listTestUsers":
      return userService.listTestUsers();
    case "registerUser":
      return userService.register(event);
    default:
      return { success: false, message: `未知认证操作：${event.type || ""}` };
  }
};

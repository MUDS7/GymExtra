const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const userStatsService = require("./userStats");

exports.main = async (event = {}) => {
  if (event.type !== "getUserStats") {
    return { success: false, message: `未知统计操作：${event.type || ""}` };
  }
  return userStatsService.getUserStats(event);
};

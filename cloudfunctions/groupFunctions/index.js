const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const groupService = require("./groups");

const handlers = {
  getMyGroups: "getMyGroups",
  getManagedGroups: "getManagedGroups",
  createGroup: "createGroup",
  getManagedGroupDetail: "getManagedGroupDetail",
  setManagedGroupGoal: "setManagedGroupGoal",
  searchGroups: "searchGroups",
  applyToGroup: "applyToGroup",
  approveGroupApplication: "approveGroupApplication",
  removeGroupMember: "removeGroupMember",
  getGroupDetail: "getGroupDetail",
  getGroupTemplates: "getGroupTemplates",
  getGroupTemplate: "getGroupTemplate",
  uploadGroupTemplate: "uploadGroupTemplate",
  deleteGroupTemplate: "deleteGroupTemplate",
  getGroupLeaderboard: "getGroupLeaderboard"
};

exports.main = async (event = {}) => {
  const handler = handlers[event.type];
  if (!handler) {
    return { success: false, message: `未知群组操作：${event.type || ""}` };
  }
  return groupService[handler](event);
};

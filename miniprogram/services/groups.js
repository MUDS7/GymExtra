const { callCloudFunction } = require("./network");

function callGroupFunction(type, data = {}) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "groupFunctions",
    data: { type, ...data }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "群组数据加载失败");
    }
    return result.data;
  });
}

function getMyGroups() {
  return callGroupFunction("getMyGroups").then((data) => Array.isArray(data) ? data : []);
}

function getManagedGroups() {
  return callGroupFunction("getManagedGroups").then((data) => Array.isArray(data) ? data : []);
}

function createGroup(name) {
  return callGroupFunction("createGroup", { name });
}

function getManagedGroupDetail(groupId) {
  return callGroupFunction("getManagedGroupDetail", { groupId });
}

function setManagedGroupGoal(groupId, presetId) {
  return callGroupFunction("setManagedGroupGoal", { groupId, presetId });
}

function getGroupDetail(groupId) {
  return callGroupFunction("getGroupDetail", { groupId });
}

function getGroupTemplates(groupId) {
  return callGroupFunction("getGroupTemplates", { groupId })
    .then((data) => Array.isArray(data) ? data : []);
}

function getGroupTemplate(groupId, templateId) {
  return callGroupFunction("getGroupTemplate", { groupId, templateId });
}

function uploadGroupTemplate(groupId, template) {
  return callGroupFunction("uploadGroupTemplate", { groupId, template });
}

function getGroupLeaderboard(groupId, leaderboardType) {
  return callGroupFunction("getGroupLeaderboard", { groupId, leaderboardType });
}

function searchGroups(keyword) {
  return callGroupFunction("searchGroups", { keyword })
    .then((data) => Array.isArray(data) ? data : []);
}

function applyToGroup(groupId) {
  return callGroupFunction("applyToGroup", { groupId });
}

function approveGroupApplication(groupId, applicationId) {
  return callGroupFunction("approveGroupApplication", { groupId, applicationId });
}

function removeGroupMember(groupId, memberId) {
  return callGroupFunction("removeGroupMember", { groupId, memberId });
}

module.exports = {
  getMyGroups,
  getManagedGroups,
  createGroup,
  getManagedGroupDetail,
  setManagedGroupGoal,
  getGroupDetail,
  getGroupTemplates,
  getGroupTemplate,
  uploadGroupTemplate,
  getGroupLeaderboard,
  searchGroups,
  applyToGroup,
  approveGroupApplication,
  removeGroupMember
};

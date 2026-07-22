const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const actionService = require("./actions");
const customActionService = require("./customActions");

exports.main = async (event = {}) => {
  switch (event.type) {
    case "getActions": return actionService.getActions();
    case "ensureActionIcons":
      return actionService.ensureActionIcons({ categoryIds: event.categoryIds, actionIds: event.actionIds });
    case "getCustomActions": return customActionService.getCustomActions(event);
    case "createCustomAction": return customActionService.createCustomAction(event);
    case "deleteCustomAction": return customActionService.deleteCustomAction(event);
    default:
      return { success: false, message: `未知动作操作：${event.type || ""}` };
  }
};

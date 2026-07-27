const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const trainingService = require("./trainings");
const templateService = require("./templates");

exports.main = async (event = {}) => {
  switch (event.type) {
    case "saveTraining": return trainingService.saveTraining(event);
    case "getRecentTrainings": return trainingService.getRecentTrainings(event);
    case "getAllTrainings": return trainingService.getAllTrainings(event);
    case "getTrainingDetail": return trainingService.getTrainingDetail(event);
    case "deleteTraining": return trainingService.deleteTraining(event);
    case "getWeeklyTrainings": return trainingService.getWeeklyTrainings(event);
    case "getMonthlyTrainings": return trainingService.getMonthlyTrainings(event);
    case "getTrainingTrend": return trainingService.getTrainingTrend(event);
    case "getUserTemplates": return templateService.getUserTemplates(event);
    case "saveUserTemplate": return templateService.saveUserTemplate(event);
    case "updateUserTemplate": return templateService.updateUserTemplate(event);
    case "deleteUserTemplate": return templateService.deleteUserTemplate(event);
    default:
      return { success: false, message: `未知训练操作：${event.type || ""}` };
  }
};

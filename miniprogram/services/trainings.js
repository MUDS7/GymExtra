const { callCloudFunction } = require("./network");

function saveTraining(data) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "saveTraining",
      ...data
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "保存训练记录失败");
    }

    return result;
  });
}

function getRecentTrainings() {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: { type: "getRecentTrainings" }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取最近训练记录失败");
    }

    return Array.isArray(result.data) ? result.data : [];
  });
}

function getAllTrainings(page = 0, pageSize = 20) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getAllTrainings",
      page,
      pageSize
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取全部训练记录失败");
    }

    return {
      list: Array.isArray(result.data) ? result.data : [],
      hasMore: Boolean(result.hasMore)
    };
  });
}

function getTrainingDetail(trainingId) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getTrainingDetail",
      trainingId
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取训练详情失败");
    }

    return result.data;
  });
}

function deleteTraining(trainingId) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "deleteTraining",
      trainingId
    }
  }).then(({ result }) => {
    if (!result) {
      throw new Error("云函数未返回删除结果，请重新部署 trainingFunctions");
    }

    if (!result || !result.success) {
      throw new Error((result && result.message) || "删除训练记录失败");
    }

    return result;
  });
}

function getWeeklyTrainings(weekStart, weekEnd) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getWeeklyTrainings",
      weekStart,
      weekEnd
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取本周训练记录失败");
    }

    return Array.isArray(result.data) ? result.data : [];
  });
}

function getTrainingDashboard(weekStart, weekEnd) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getTrainingDashboard",
      weekStart,
      weekEnd
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取训练首页数据失败");
    }

    const data = result.data || {};
    return {
      recentTrainings: Array.isArray(data.recentTrainings) ? data.recentTrainings : [],
      weeklyTrainings: Array.isArray(data.weeklyTrainings) ? data.weeklyTrainings : []
    };
  }).catch((error) => {
    const message = String((error && error.message) || "");
    const isOldCloudFunction = message.includes("未知训练操作")
      && message.includes("getTrainingDashboard");

    if (!isOldCloudFunction) {
      return Promise.reject(error);
    }

    console.warn("trainingFunctions 尚未部署首页聚合接口，暂时回退到兼容查询");
    return Promise.all([
      getRecentTrainings(),
      getWeeklyTrainings(weekStart, weekEnd)
    ]).then(([recentTrainings, weeklyTrainings]) => ({
      recentTrainings,
      weeklyTrainings
    }));
  });
}

function getMonthlyTrainings(monthStart, monthEnd) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getMonthlyTrainings",
      monthStart,
      monthEnd
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取月度训练记录失败");
    }

    return Array.isArray(result.data) ? result.data : [];
  });
}

function getTrainingTrend(actionId, categoryId, metric) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发"));
  }

  return callCloudFunction({
    name: "trainingFunctions",
    data: {
      type: "getTrainingTrend",
      actionId,
      categoryId,
      metric
    }
  }).then(({ result }) => {
    if (!result || !result.success) {
      throw new Error((result && result.message) || "获取训练趋势失败");
    }

    return Array.isArray(result.data) ? result.data : [];
  });
}

module.exports = { saveTraining, getRecentTrainings, getAllTrainings, getTrainingDetail, deleteTraining, getWeeklyTrainings, getTrainingDashboard, getMonthlyTrainings, getTrainingTrend };

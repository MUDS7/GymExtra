const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const userService = require("./user");
const actionService = require("./actions");
const customActionService = require("./customActions");
const trainingService = require("./trainings");
const groupService = require("./groups");
const userStatsService = require("./userStats");
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');
// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "login":
      return await userService.login(event);
    case "listTestUsers":
      return await userService.listTestUsers();
    case "registerUser":
      return await userService.register(event);
    case "getActions":
      return await actionService.getActions();
    case "ensureActionIcons":
      return await actionService.ensureActionIcons({
        categoryIds: event.categoryIds,
        actionIds: event.actionIds
      });
    case "getCustomActions":
      return await customActionService.getCustomActions(event);
    case "createCustomAction":
      return await customActionService.createCustomAction(event);
    case "deleteCustomAction":
      return await customActionService.deleteCustomAction(event);
    case "saveTraining":
      return await trainingService.saveTraining(event);
    case "getRecentTrainings":
      return await trainingService.getRecentTrainings(event);
    case "getAllTrainings":
      return await trainingService.getAllTrainings(event);
    case "getTrainingDetail":
      return await trainingService.getTrainingDetail(event);
    case "deleteTraining":
      return await trainingService.deleteTraining(event);
    case "getWeeklyTrainings":
      return await trainingService.getWeeklyTrainings(event);
    case "getMonthlyTrainings":
      return await trainingService.getMonthlyTrainings(event);
    case "getTrainingTrend":
      return await trainingService.getTrainingTrend(event);
    case "getUserStats":
      return await userStatsService.getUserStats(event);
    case "getMyGroups":
      return await groupService.getMyGroups(event);
    case "getManagedGroups":
      return await groupService.getManagedGroups(event);
    case "createGroup":
      return await groupService.createGroup(event);
    case "getManagedGroupDetail":
      return await groupService.getManagedGroupDetail(event);
    case "setManagedGroupGoal":
      return await groupService.setManagedGroupGoal(event);
    case "searchGroups":
      return await groupService.searchGroups(event);
    case "applyToGroup":
      return await groupService.applyToGroup(event);
    case "approveGroupApplication":
      return await groupService.approveGroupApplication(event);
    case "removeGroupMember":
      return await groupService.removeGroupMember(event);
    case "getGroupDetail":
      return await groupService.getGroupDetail(event);
    case "getGroupLeaderboard":
      return await groupService.getGroupLeaderboard(event);
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    default:
      return {
        success: false,
        message: `未知云函数类型：${event.type || ""}`
      };
  }
};

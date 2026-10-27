const assert = require("node:assert/strict");
const { test } = require("node:test");
const { ACTION_TABLE } = require("../miniprogram/data/actions");
const englishNames = require("../miniprogram/data/action-english-names");
const { buildTrainingExport } = require("../miniprogram/utils/training-export");
const trainingService = require("../miniprogram/services/trainings");

function createTraining(id = "record-0") {
  return {
    _id: id,
    userId: "private-user-id",
    createdAt: new Date(2026, 9, 27, 11, 35, 0),
    title: "肩部训练",
    actions: [{
      actionId: ACTION_TABLE[0].id,
      name: ACTION_TABLE[0].name,
      sets: [
        { weight: "12.5", reps: "10", completed: true },
        { weight: 0, reps: "", completed: false },
        { weight: null, reps: 8, completed: true }
      ]
    }]
  };
}

test("training JSON export", async (t) => {
  await t.test("catalog English names, per-set values and private-field exclusion", () => {
    assert.equal(ACTION_TABLE.length, 1040);
    assert(ACTION_TABLE.every((action) => englishNames[action.sourceId]));
    const source = createTraining();
    const snapshot = JSON.stringify(source);
    const [record] = buildTrainingExport([source]);
    assert.equal(record.记录时间, "2026-10-27 11:35:00");
    assert.equal(record.标题, "肩部训练");
    assert.equal(record.动作[0].中文名称, ACTION_TABLE[0].name);
    assert.equal(record.动作[0].英文名称, englishNames[ACTION_TABLE[0].sourceId]);
    assert.equal(record.动作[0].组数, 3);
    assert.deepEqual(record.动作[0].每组.map((set) => set.重量), [12.5, 0, null]);
    assert.equal(record.动作[0].每组[1].次数, null);
    assert.equal(record.动作[0].每组[1].已完成, false);
    assert(!JSON.stringify(record).includes("private-user-id"));
    assert.equal(JSON.stringify(source), snapshot);
  });

  await t.test("legacy name lookup and custom actions with no English name", () => {
    const source = createTraining();
    delete source.actions[0].actionId;
    source.actions.push({ actionId: "custom-1", isCustom: true, name: ACTION_TABLE[0].name, sets: [] });
    const [record] = buildTrainingExport([source]);
    assert.equal(record.动作[0].英文名称, englishNames[ACTION_TABLE[0].sourceId]);
    assert.equal(record.动作[1].英文名称, "");
    assert.equal(record.动作[1].组数, 0);
  });

  await t.test("fetches the latest 30 independently of loaded page; bounded concurrency and stable order", async () => {
    const summaries = Array.from({ length: 30 }, (_, i) => ({ _id: `record-${i}` }));
    let active = 0;
    let peak = 0;
    let queries = 0;
    global.wx = { cloud: { async callFunction({ data }) {
      queries += 1;
      if (data.type === "getAllTrainings") {
        assert.equal(data.page, 0);
        assert.equal(data.pageSize, 30);
        return { result: { success: true, data: summaries } };
      }
      assert.equal(data.type, "getTrainingDetail");
      active += 1;
      peak = Math.max(peak, active);
      const index = Number(data.trainingId.split("-")[1]);
      await new Promise((resolve) => setTimeout(resolve, 5 - index % 5));
      active -= 1;
      return { result: { success: true, data: createTraining(data.trainingId) } };
    } } };
    const records = await trainingService.getTrainingsForExport();
    assert.equal(queries, 31);
    assert.equal(peak, 5);
    assert.deepEqual(records.map((item) => item._id), summaries.map((item) => item._id));
  });

  await t.test("empty result and query/detail failures do not return partial exports", async () => {
    global.wx = { cloud: { async callFunction() {
      return { result: { success: true, data: [] } };
    } } };
    assert.deepEqual(await trainingService.getTrainingsForExport(), []);
    wx.cloud.callFunction = async () => ({ result: { success: false, message: "查询失败" } });
    await assert.rejects(trainingService.getTrainingsForExport(), /查询失败/);
    wx.cloud.callFunction = async ({ data }) => ({ result: {
      success: true,
      data: data.type === "getAllTrainings" ? [{ _id: "bad" }] : { _id: "bad" }
    } });
    await assert.rejects(trainingService.getTrainingsForExport(), /明细不完整/);
  });

  await t.test("modal, duplicate taps, clipboard contents, empty/error states and close", async () => {
    let definition;
    global.Page = (page) => { definition = page; };
    global.getApp = () => ({ login: async () => ({ registered: true }) });
    require("../miniprogram/pages/training-records/training-records");
    const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
    const original = trainingService.getTrainingsForExport;
    const toasts = [];
    let copied;
    global.wx = {
      showToast: (toast) => toasts.push(toast.title),
      setClipboardData: (options) => { copied = options.data; options.success(); }
    };
    try {
      let finish;
      let calls = 0;
      trainingService.getTrainingsForExport = () => {
        calls += 1;
        return new Promise((resolve) => { finish = resolve; });
      };
      const pending = page.onExportTap();
      await Promise.resolve();
      await page.onExportTap();
      assert.equal(calls, 1);
      assert.equal(page.data.exporting, true);
      finish([createTraining()]);
      await pending;
      assert.equal(page.data.exporting, false);
      assert.equal(page.data.showExportModal, true);
      assert.equal(page.data.exportCount, 1);
      assert.deepEqual(JSON.parse(page.data.exportJson), buildTrainingExport([createTraining()]));
      page.onCopyExportTap();
      assert.equal(copied, JSON.stringify(buildTrainingExport([createTraining()])));
      assert(!copied.includes("\n"));
      assert(page.data.exportJson.includes("\n"));
      assert.equal(toasts.pop(), "已复制");
      wx.setClipboardData = (options) => options.fail();
      page.onCopyExportTap();
      assert.equal(toasts.pop(), "复制失败，请重试");
      page.closeExportModal();
      assert.equal(page.data.showExportModal, false);
      assert.equal(page.data.exportJson, "");
      trainingService.getTrainingsForExport = async () => [];
      await page.onExportTap();
      assert.equal(toasts.pop(), "暂无可导出的训练记录");
      assert.equal(page.data.showExportModal, false);
      trainingService.getTrainingsForExport = async () => { throw new Error("请求失败"); };
      const originalError = console.error;
      try {
        console.error = () => {};
        await page.onExportTap();
      } finally {
        console.error = originalError;
      }
      assert.equal(toasts.pop(), "请求失败");
      assert.equal(page.data.exporting, false);
      assert.equal(page.data.showExportModal, false);
    } finally {
      trainingService.getTrainingsForExport = original;
      delete global.Page;
      delete global.getApp;
      delete global.wx;
    }
  });
});

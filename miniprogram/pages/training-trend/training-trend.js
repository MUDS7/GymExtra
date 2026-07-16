const trainingService = require("../../services/trainings");

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function decodeOption(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (error) {
    return value || "";
  }
}

function formatValue(value, isCardio) {
  const number = Number(value) || 0;
  return isCardio ? `${number} 分钟` : `${number} kg`;
}

Page({
  data: {
    actionName: "",
    isCardio: false,
    unit: "kg",
    records: [],
    loading: true,
    chartWidth: 320,
    chartHeight: 250
  },

  onLoad(options = {}) {
    const systemInfo = wx.getSystemInfoSync();
    const chartWidth = Math.max(280, systemInfo.windowWidth - 56);
    const categoryId = decodeOption(options.categoryId);
    const isCardio = categoryId === "cardio";

    this.actionId = decodeOption(options.actionId);
    this.categoryId = categoryId;
    this.setData({
      actionName: decodeOption(options.actionName) || "未选择动作",
      isCardio,
      unit: isCardio ? "分钟" : "kg",
      chartWidth
    });
    this.loadTrend();
  },

  async loadTrend() {
    this.setData({ loading: true });
    try {
      const source = await trainingService.getTrainingTrend(this.actionId, this.categoryId);
      const records = source.map((record, index) => ({
        ...record,
        order: index + 1,
        dateLabel: formatDate(record.createdAt),
        valueLabel: formatValue(record.value, this.data.isCardio)
      }));
      this.setData({ records, loading: false });
      wx.nextTick(() => this.drawChart(records));
    } catch (error) {
      console.error("加载训练趋势失败", error);
      this.setData({ records: [], loading: false });
      wx.showToast({ title: error.message || "训练趋势加载失败", icon: "none" });
      wx.nextTick(() => this.drawChart([]));
    }
  },

  drawChart(records) {
    const width = this.data.chartWidth;
    const height = this.data.chartHeight;
    const context = wx.createCanvasContext("trendChart", this);
    const padding = { top: 22, right: 14, bottom: 38, left: 48 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    context.clearRect(0, 0, width, height);
    context.setFillStyle("#FFFFFF");
    context.fillRect(0, 0, width, height);

    if (!records.length) {
      context.setFillStyle("#8A8E95");
      context.setFontSize(14);
      context.setTextAlign("center");
      context.fillText("暂无该动作的训练记录", width / 2, height / 2);
      context.draw();
      return;
    }

    const values = records.map((item) => Number(item.value) || 0);
    const largest = Math.max(...values, 1);
    const smallest = Math.min(...values, 0);
    const range = Math.max(largest - smallest, 1);
    const gridCount = 4;
    const lineColor = this.data.isCardio ? "#258DE9" : "#F06F38";

    context.setStrokeStyle("#E8EBEF");
    context.setLineWidth(1);
    context.setFillStyle("#8A8E95");
    context.setFontSize(10);
    context.setTextAlign("right");
    for (let index = 0; index <= gridCount; index += 1) {
      const y = padding.top + chartHeight * index / gridCount;
      const value = largest - range * index / gridCount;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(String(Math.round(value * 10) / 10), padding.left - 8, y + 3);
    }

    const pointPosition = (item, index) => ({
      x: padding.left + (records.length === 1 ? chartWidth / 2 : chartWidth * index / (records.length - 1)),
      y: padding.top + (largest - (Number(item.value) || 0)) / range * chartHeight
    });
    const positions = records.map(pointPosition);

    context.setStrokeStyle(lineColor);
    context.setLineWidth(3);
    context.setLineJoin("round");
    context.beginPath();
    positions.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();

    context.setFillStyle(lineColor);
    positions.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    });

    context.setFillStyle("#8A8E95");
    context.setFontSize(10);
    context.setTextAlign("center");
    const labelIndexes = records.length <= 5
      ? records.map((_, index) => index)
      : [0, Math.floor((records.length - 1) / 2), records.length - 1];
    labelIndexes.forEach((index) => {
      context.fillText(records[index].dateLabel, positions[index].x, height - 12);
    });
    context.draw();
  }
});

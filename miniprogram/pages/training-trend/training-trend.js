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

function formatValue(value, isCardio, metric) {
  const number = Number(value) || 0;
  if (isCardio) return `${number} 分钟`;
  return metric === "reps" ? `${number} 次` : `${number} kg`;
}

function formatSetLabel(record) {
  const weight = Number(record.weight) || 0;
  const reps = Number(record.reps) || 0;
  return {
    weight: `重量: ${weight}kg`,
    reps: `次数: ${reps}次`
  };
}

function getNiceStep(roughStep) {
  const safeStep = Math.max(Number(roughStep) || 1, 0.0001);
  const magnitude = Math.pow(10, Math.floor(Math.log10(safeStep)));
  const normalized = safeStep / magnitude;
  const base = normalized <= 1.5 ? 1 : (normalized <= 3 ? 2 : (normalized <= 7 ? 5 : 10));

  return base * magnitude;
}

function formatAxisValue(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

function getChartAxis(values, isCardio, metric) {
  const maximum = Math.max(...values, 0);
  const minimum = Math.min(...values);
  const useZeroBaseline = isCardio || metric === "reps" || maximum <= 30;

  if (useZeroBaseline) {
    const step = getNiceStep(Math.max(maximum, 1) / 4);
    const axisMaximum = Math.max(step * 4, Math.ceil(maximum / step) * step);

    return { minimum: 0, maximum: axisMaximum, step, gridCount: Math.round(axisMaximum / step) };
  }

  const dataRange = Math.max(maximum - minimum, maximum * 0.03, 1);
  const padding = dataRange * 0.15;
  const step = getNiceStep((dataRange + padding * 2) / 4);
  const axisMinimum = Math.max(0, Math.floor((minimum - padding) / step) * step);
  const axisMaximum = Math.ceil((maximum + padding) / step) * step;

  return {
    minimum: axisMinimum,
    maximum: Math.max(axisMaximum, axisMinimum + step * 4),
    step,
    gridCount: Math.round((Math.max(axisMaximum, axisMinimum + step * 4) - axisMinimum) / step)
  };
}

Page({
  data: {
    actionName: "",
    isCardio: false,
    unit: "kg",
    metric: "weight",
    metricIndex: 0,
    metricOptions: ["kg", "次数"],
    metricMenuOpen: false,
    trendDescription: "",
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
      trendDescription: isCardio ? "每次记录取最长运动时长" : "每次记录取最大训练重量",
      chartWidth
    });
    this.selectedRecordIndex = -1;
    this.chartBounds = null;
    this.loadTrend();
  },

  async loadTrend() {
    this.setData({ loading: true });
    try {
      const source = await trainingService.getTrainingTrend(this.actionId, this.categoryId, this.data.metric);
      const records = source.map((record, index) => ({
        ...record,
        order: index + 1,
        dateLabel: formatDate(record.createdAt),
        valueLabel: formatValue(record.value, this.data.isCardio, this.data.metric)
      }));
      this.selectedRecordIndex = -1;
      this.setData({ records, loading: false });
      wx.nextTick(() => {
        this.updateChartBounds();
        this.drawChart(records);
      });
    } catch (error) {
      console.error("加载训练趋势失败", error);
      this.setData({ records: [], loading: false });
      wx.showToast({ title: error.message || "训练趋势加载失败", icon: "none" });
      wx.nextTick(() => this.drawChart([]));
    }
  },

  toggleMetricMenu() {
    this.setData({ metricMenuOpen: !this.data.metricMenuOpen });
  },

  onMetricChange(event) {
    const metricIndex = Number(event.currentTarget.dataset.index);
    const metric = metricIndex === 1 ? "reps" : "weight";
    if (metric === this.data.metric) {
      this.setData({ metricMenuOpen: false });
      return;
    }

    this.setData({
      metric,
      metricIndex,
      unit: metric === "reps" ? "次数" : "kg",
      trendDescription: metric === "reps" ? "每次记录累计训练次数" : "每次记录取最大训练重量",
      metricMenuOpen: false
    });
    this.loadTrend();
  },

  drawChart(records) {
    const width = this.data.chartWidth;
    const height = this.data.chartHeight;
    const context = wx.createCanvasContext("trendChart", this);
    const padding = { top: 70, right: 14, bottom: 38, left: 48 };
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
    const axis = getChartAxis(values, this.data.isCardio, this.data.metric);
    const range = axis.maximum - axis.minimum;
    const lineColor = this.data.isCardio ? "#258DE9" : "#F06F38";

    context.setStrokeStyle("#E8EBEF");
    context.setLineWidth(1);
    context.setFillStyle("#8A8E95");
    context.setFontSize(10);
    context.setTextAlign("right");
    for (let index = 0; index <= axis.gridCount; index += 1) {
      const y = padding.top + chartHeight * index / axis.gridCount;
      const value = axis.maximum - axis.step * index;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(formatAxisValue(value), padding.left - 8, y + 3);
    }

    const pointPosition = (item, index) => ({
      x: padding.left + (records.length === 1 ? chartWidth / 2 : chartWidth * index / (records.length - 1)),
      y: padding.top + (axis.maximum - (Number(item.value) || 0)) / range * chartHeight
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

    const selectedRecord = records[this.selectedRecordIndex];
    const selectedPoint = positions[this.selectedRecordIndex];
    if (selectedRecord && selectedPoint && !this.data.isCardio) {
      const label = formatSetLabel(selectedRecord);
      context.setFontSize(11);
      const labelWidth = Math.max(context.measureText(label.weight).width, context.measureText(label.reps).width) + 20;
      const labelHeight = 42;
      const labelX = Math.max(6, Math.min(selectedPoint.x - labelWidth / 2, width - labelWidth - 6));
      const labelY = Math.max(8, selectedPoint.y - labelHeight - 10);

      context.setFillStyle("#FFFFFF");
      context.beginPath();
      context.arc(selectedPoint.x, selectedPoint.y, 7, 0, Math.PI * 2);
      context.fill();
      context.setFillStyle(lineColor);
      context.beginPath();
      context.arc(selectedPoint.x, selectedPoint.y, 5, 0, Math.PI * 2);
      context.fill();

      context.setFillStyle("#2B3038");
      context.fillRect(labelX, labelY, labelWidth, labelHeight);
      context.setFillStyle("#FFFFFF");
      context.setTextAlign("center");
      context.fillText(label.weight, labelX + labelWidth / 2, labelY + 15);
      context.fillText(label.reps, labelX + labelWidth / 2, labelY + 32);
    }

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
  },

  updateChartBounds() {
    wx.createSelectorQuery().in(this).select("#trendChart").boundingClientRect((rect) => {
      this.chartBounds = rect;
    }).exec();
  },

  getTouchX(event) {
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
    if (!touch) return null;
    if (typeof touch.x === "number") return touch.x;
    if (this.chartBounds && typeof touch.clientX === "number") return touch.clientX - this.chartBounds.left;
    return null;
  },

  selectChartRecord(x) {
    const records = this.data.records;
    if (this.data.isCardio || !records.length || typeof x !== "number") return;

    const padding = { right: 14, left: 48 };
    const chartAreaWidth = this.data.chartWidth - padding.left - padding.right;
    const index = records.length === 1
      ? 0
      : Math.max(0, Math.min(records.length - 1, Math.round((x - padding.left) / chartAreaWidth * (records.length - 1))));

    this.selectedRecordIndex = index;
    this.drawChart(records);
  },

  onChartTouchStart(event) {
    if (this.data.metricMenuOpen) this.setData({ metricMenuOpen: false });
    const x = this.getTouchX(event);
    const touch = event.touches && event.touches[0];
    const localX = x === null && this.chartBounds && typeof (touch && touch.clientX) === "number"
      ? touch.clientX - this.chartBounds.left
      : x;
    this.selectChartRecord(localX);
  },

  onChartTouchMove(event) {
    const x = this.getTouchX(event);
    if (typeof x === "number") this.selectChartRecord(x);
  },

  onChartTouchEnd() {
    if (this.selectedRecordIndex === -1) return;
    this.selectedRecordIndex = -1;
    this.drawChart(this.data.records);
  }
});

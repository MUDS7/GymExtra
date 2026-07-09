const { ACTION_TABLE, DEFAULT_ACTION_ICON_PATH } = require("../../data/actions");
const actionService = require("../../services/actions");
const { getCachedIconPath, isCloudFile } = require("../../services/action-icon-cache");
const trainingService = require("../../services/trainings");

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function getActionCategory(action) {
  if (action.categoryId) {
    return action.categoryId;
  }

  const definition = ACTION_TABLE.find((item) => item.id === action.id || item.id === action.actionId || item.name === action.name);
  return definition ? definition.categoryId : "";
}

function normalizeDuration(value, fallback = 30) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const duration = Math.floor(Number(value));
  return Number.isFinite(duration) && duration >= 0 ? Math.min(duration, 1439) : fallback;
}

function formatDuration(value) {
  const duration = normalizeDuration(value, 0);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours && minutes) return `${hours}小时${minutes}分钟`;
  if (hours) return `${hours}小时`;
  return `${minutes}分钟`;
}

function parseTimerSeconds(value) {
  const timer = String(value || "00:00").trim();
  const parts = timer.split(":").map(Number);

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
  }

  const minutes = Number(timer);
  return Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes * 60)) : 0;
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getCardioDurationMinutes(actions) {
  return (Array.isArray(actions) ? actions : []).reduce(
    (sum, action) => sum + (
      action.isCardio && action.sets && action.sets[0] && action.sets[0].completed
        ? normalizeDuration(action.durationMinutes, 0)
        : 0
    ),
    0
  );
}

function formatVolume(value) {
  return Number(value || 0).toFixed(1);
}

function formatRecordedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getPersistentIconPath(action) {
  if (action && isCloudFile(action.iconFileID)) {
    return action.iconFileID;
  }

  if (action && isCloudFile(action.iconPath)) {
    return action.iconPath;
  }

  return "";
}

function getReadonlyIconSource(action, actionIconMap) {
  const savedIconPath = action && action.iconPath ? action.iconPath : "";
  const libraryIconPath = actionIconMap && action && action.actionId !== undefined && action.actionId !== null
    ? actionIconMap.get(String(action.actionId)) || ""
    : "";

  if (isCloudFile(savedIconPath)) {
    return savedIconPath;
  }

  if (isCloudFile(libraryIconPath)) {
    return libraryIconPath;
  }

  return savedIconPath || libraryIconPath || DEFAULT_ACTION_ICON_PATH;
}

async function loadActionIconMap() {
  try {
    const actions = await actionService.getActions();
    const iconMap = new Map();

    actions.forEach((action) => {
      if (action && action.id !== undefined && action.id !== null) {
        iconMap.set(String(action.id), getPersistentIconPath(action) || action.iconPath || "");
      }
    });

    return iconMap;
  } catch (error) {
    console.warn("Load action icon map failed", error);
    return new Map();
  }
}

function createSet(values = {}) {
  return {
    uid: `set-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    weight: values.weight === undefined ? "" : String(values.weight ?? 0),
    reps: values.reps === undefined ? "" : String(values.reps ?? 0),
    completed: Boolean(values.completed)
  };
}

function refreshAction(action) {
  const sets = action.sets || [];
  const completedSets = sets.filter((item) => item.completed).length;
  const plannedVolume = sets.reduce((sum, item) => sum + Number(item.weight || 0) * Number(item.reps || 0), 0);
  const completedVolume = sets.reduce(
    (sum, item) => sum + (item.completed ? Number(item.weight || 0) * Number(item.reps || 0) : 0),
    0
  );

  const durationMinutes = normalizeDuration(action.durationMinutes, action.isCardio ? 30 : 0);

  return {
    ...action,
    durationMinutes,
    durationPickerValue: [Math.floor(durationMinutes / 60), durationMinutes % 60],
    setsCount: sets.length,
    completedSets,
    completedVolume,
    plannedVolume,
    metaText: action.isCardio
      ? `${formatDuration(durationMinutes)} · ${completedSets ? "已完成" : "未完成"}`
      : `${sets.length}组 · ${completedSets}组完成`,
    volumeText: `${formatVolume(completedVolume)}/${formatVolume(plannedVolume)}`
  };
}

function createTrainingAction(action) {
  const categoryId = getActionCategory(action);
  const isCardio = categoryId === "cardio";
  const sourceSets = Array.isArray(action.sets) && action.sets.length ? action.sets : [createSet({ weight: action.weight })];
  const iconPath = action.iconPath || action.image || DEFAULT_ACTION_ICON_PATH;

  return refreshAction({
    uid: `${action.id || "action"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    id: action.id,
    categoryId,
    isCardio,
    durationMinutes: normalizeDuration(action.durationMinutes, isCardio ? 30 : 0),
    name: action.name || "未命名动作",
    iconPath,
    iconFileID: getPersistentIconPath(action),
    expanded: false,
    sets: sourceSets.map((item) => (item.uid ? { ...item } : createSet(item)))
  });
}

async function createReadonlyTrainingAction(action, actionIconMap) {
  const categoryId = getActionCategory(action);
  const isCardio = categoryId === "cardio";

  const sourceSets = Array.isArray(action.sets) && action.sets.length
    ? action.sets
    : (isCardio ? [createSet()] : []);
  const iconSource = getReadonlyIconSource(action, actionIconMap);

  return refreshAction({
    uid: `saved-action-${action.order || action.actionId || Date.now()}`,
    id: action.actionId,
    categoryId,
    isCardio,
    durationMinutes: normalizeDuration(action.durationMinutes, isCardio ? 30 : 0),
    name: action.name || "未命名动作",
    iconPath: await getCachedIconPath(iconSource),
    iconFileID: isCloudFile(iconSource) ? iconSource : "",
    expanded: true,
    sets: sourceSets.map((set, index) => createSet({
      ...set,
      uid: `saved-set-${action.order || 0}-${set.order || index + 1}`
    }))
  });
}

function buildSummary(actions) {
  const totalSets = actions.reduce((sum, item) => sum + item.setsCount, 0);
  const completedSets = actions.reduce((sum, item) => sum + item.completedSets, 0);
  const completedActions = actions.filter((item) => item.setsCount > 0 && item.completedSets === item.setsCount).length;
  const completedVolume = actions.reduce((sum, item) => sum + item.completedVolume, 0);
  const plannedVolume = actions.reduce((sum, item) => sum + item.plannedVolume, 0);

  return {
    setText: `${completedSets}/${totalSets}组`,
    actionText: `${completedActions}/${actions.length}动作`,
    volumeText: `${formatVolume(completedVolume)}/${formatVolume(plannedVolume)}容量`
  };
}

Page({
  data: {
    timer: "00:00",
    title: "",
    actions: [],
    summary: buildSummary([]),
    saving: false,
    deleting: false,
    readonly: false,
    loading: false,
    trainingId: "",
    recordedAt: "",
    groupId: "",
    groupName: "",
    sharedToGroup: false,
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS
  },

  onLoad(options) {
    if (options.mode === "readonly" && options.id) {
      this.loadTrainingDetail(decodeURIComponent(options.id));
      return;
    }

    const groupId = options.groupId ? decodeURIComponent(options.groupId) : "";
    if (groupId) {
      const groupName = options.groupName ? decodeURIComponent(options.groupName) : "";
      this.setData({
        groupId,
        groupName,
        sharedToGroup: options.sharedToGroup !== "0"
      });
    }
  },

  async loadTrainingDetail(trainingId) {
    this.setData({ readonly: true, loading: true, trainingId });
    wx.showLoading({ title: "加载中", mask: true });

    try {
      const [training, actionIconMap] = await Promise.all([
        trainingService.getTrainingDetail(trainingId),
        loadActionIconMap()
      ]);
      const actions = await Promise.all(
        (Array.isArray(training.actions) ? training.actions : [])
          .map((action) => createReadonlyTrainingAction(action, actionIconMap))
      );

      this.setData({
        timer: training.timer || "00:00",
        title: training.title || "未命名训练",
        recordedAt: formatRecordedAt(training.createdAt),
        actions,
        summary: buildSummary(actions),
        loading: false
      });
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "详情加载失败",
        icon: "none"
      });
    }
  },

  onTimerInput(event) {
    this.setData({
      timer: event.detail.value
    });
  },

  onTitleInput(event) {
    this.setData({
      title: event.detail.value
    });
  },

  async onFinishTap() {
    if (this.data.readonly || this.data.saving) {
      return;
    }

    if (!Array.isArray(this.data.actions) || this.data.actions.length === 0) {
      wx.showToast({
        title: "记录为空",
        icon: "none"
      });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: "保存中", mask: true });

    try {
      await trainingService.saveTraining({
        title: this.data.title,
        timer: this.data.timer,
        groupId: this.data.groupId,
        sharedToGroup: this.data.sharedToGroup,
        actions: this.data.actions.map((action) => ({
          id: action.id,
          categoryId: action.categoryId,
          name: action.name,
          iconPath: action.iconFileID || action.iconPath,
          durationMinutes: action.isCardio ? action.durationMinutes : null,
          sets: action.sets.map((set) => ({
            weight: set.weight,
            reps: set.reps,
            completed: set.completed
          }))
        }))
      });

      wx.hideLoading();
      wx.showToast({ title: "训练已保存", icon: "success" });

      setTimeout(() => {
        const pages = getCurrentPages();

        if (pages.length > 1) {
          wx.navigateBack();
          return;
        }

        wx.switchTab({ url: "/pages/train/train" });
      }, 500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({
        title: error.message || "保存失败，请重试",
        icon: "none"
      });
    }
  },

  onTrainingDeleteTap() {
    if (!this.data.readonly || this.data.deleting || this.data.loading || !this.data.trainingId) {
      return;
    }

    wx.showModal({
      title: "删除记录",
      content: "确定删除这条运动记录吗？删除后不可恢复。",
      confirmText: "删除",
      confirmColor: "#D93025",
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        this.setData({ deleting: true });
        wx.showLoading({ title: "删除中", mask: true });

        try {
          await trainingService.deleteTraining(this.data.trainingId);
          const app = getApp();
          app.globalData.trainingRecordsChanged = true;
          wx.hideLoading();
          wx.showToast({ title: "已删除", icon: "success" });

          setTimeout(() => {
            const pages = getCurrentPages();

            if (pages.length > 1) {
              wx.navigateBack();
              return;
            }

            wx.switchTab({ url: "/pages/train/train" });
          }, 500);
        } catch (error) {
          wx.hideLoading();
          this.setData({ deleting: false });
          wx.showToast({
            title: error.message || "删除失败，请重试",
            icon: "none"
          });
        }
      }
    });
  },

  updateActions(actions) {
    const previousCardioMinutes = getCardioDurationMinutes(this.data.actions);
    const nextCardioMinutes = getCardioDurationMinutes(actions);
    const cardioDeltaSeconds = (nextCardioMinutes - previousCardioMinutes) * 60;

    this.setData({
      actions,
      summary: buildSummary(actions),
      timer: formatTimer(parseTimerSeconds(this.data.timer) + cardioDeltaSeconds)
    });
  },

  addTrainingAction(action) {
    this.updateActions(this.data.actions.concat(createTrainingAction(action)));
  },

  onAddActionTap() {
    wx.navigateTo({
      url: "/pages/action-picker/action-picker"
    });
  },

  onActionCardTap(event) {
    const index = Number(event.currentTarget.dataset.index);

    if (!Number.isInteger(index) || !this.data.actions[index]) {
      return;
    }

    const actions = this.data.actions.slice();
    actions[index] = { ...actions[index], expanded: !actions[index].expanded };
    this.setData({ actions });
  },

  onDurationChange(event) {
    if (this.data.readonly) {
      return;
    }

    const index = Number(event.currentTarget.dataset.index);
    const action = this.data.actions[index];
    const value = event.detail.value || [];

    if (!action || !action.isCardio) {
      return;
    }

    const durationMinutes = Number(value[0] || 0) * 60 + Number(value[1] || 0);
    const actions = this.data.actions.slice();
    actions[index] = refreshAction({ ...action, durationMinutes });
    this.updateActions(actions);
  },

  getSetInputContext(event) {
    const { actionIndex, setIndex, field } = event.currentTarget.dataset;
    const actionPosition = Number(actionIndex);
    const setPosition = Number(setIndex);
    const action = this.data.actions[actionPosition];
    const set = action && action.sets[setPosition];

    if (!["weight", "reps"].includes(field) || !set) {
      return null;
    }

    return {
      actionPosition,
      setPosition,
      field,
      editingField: `${field}Editing`,
      action,
      set,
      cacheKey: `${action.uid}:${set.uid}:${field}`
    };
  },

  onSetInputFocus(event) {
    const context = this.getSetInputContext(event);

    if (!context) {
      return;
    }

    this.setInputOriginalValues = this.setInputOriginalValues || {};
    this.setInputOriginalValues[context.cacheKey] = context.set[context.field];
    this.setData({
      [`actions[${context.actionPosition}].sets[${context.setPosition}].${context.field}`]: "",
      [`actions[${context.actionPosition}].sets[${context.setPosition}].${context.editingField}`]: true
    });
  },

  onSetInput(event) {
    const context = this.getSetInputContext(event);

    if (!context) {
      return;
    }

    const actions = this.data.actions.slice();
    const action = { ...actions[context.actionPosition] };
    const sets = action.sets.slice();
    sets[context.setPosition] = { ...sets[context.setPosition], [context.field]: event.detail.value };
    actions[context.actionPosition] = refreshAction({ ...action, sets });
    this.updateActions(actions);
  },

  onSetInputBlur(event) {
    const context = this.getSetInputContext(event);

    if (!context) {
      return;
    }

    const originalValues = this.setInputOriginalValues || {};
    const currentValue = event.detail.value;

    if (currentValue !== "") {
      delete originalValues[context.cacheKey];
      this.setData({
        [`actions[${context.actionPosition}].sets[${context.setPosition}].${context.editingField}`]: false
      });
      return;
    }

    const originalValue = Object.prototype.hasOwnProperty.call(originalValues, context.cacheKey)
      ? originalValues[context.cacheKey]
      : "";
    const actions = this.data.actions.slice();
    const action = { ...actions[context.actionPosition] };
    const sets = action.sets.slice();
    sets[context.setPosition] = {
      ...sets[context.setPosition],
      [context.field]: originalValue,
      [context.editingField]: false
    };
    actions[context.actionPosition] = refreshAction({ ...action, sets });
    delete originalValues[context.cacheKey];
    this.updateActions(actions);
  },

  onSetStatusTap(event) {
    if (this.data.readonly) {
      return;
    }

    const actionPosition = Number(event.currentTarget.dataset.actionIndex);
    const setPosition = Number(event.currentTarget.dataset.setIndex);

    if (!this.data.actions[actionPosition]) {
      return;
    }

    const actions = this.data.actions.slice();
    const action = { ...actions[actionPosition] };
    const sets = action.sets.slice();

    if (!sets[setPosition]) {
      return;
    }

    sets[setPosition] = { ...sets[setPosition], completed: !sets[setPosition].completed };
    actions[actionPosition] = refreshAction({ ...action, sets });
    this.updateActions(actions);
  },

  onAddSetTap(event) {
    if (this.data.readonly) {
      return;
    }

    const index = Number(event.currentTarget.dataset.index);

    if (!this.data.actions[index]) {
      return;
    }

    const actions = this.data.actions.slice();
    const action = { ...actions[index] };
    const lastSet = action.sets[action.sets.length - 1] || {};
    const sets = action.sets.concat(createSet({ weight: lastSet.weight, reps: lastSet.reps }));
    actions[index] = refreshAction({ ...action, sets });
    this.updateActions(actions);
  },

  onSetDeleteTap(event) {
    if (this.data.readonly) {
      return;
    }

    const actionPosition = Number(event.currentTarget.dataset.actionIndex);
    const setPosition = Number(event.currentTarget.dataset.setIndex);
    const action = this.data.actions[actionPosition];

    if (!action || !action.sets[setPosition]) {
      return;
    }

    const actionUid = action.uid;
    const setUid = action.sets[setPosition].uid;

    wx.showModal({
      title: "删除本组",
      content: `确定删除第 ${setPosition + 1} 组吗？`,
      confirmText: "删除",
      confirmColor: "#D93025",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const actions = this.data.actions.slice();
        const currentActionIndex = actions.findIndex((item) => item.uid === actionUid);

        if (currentActionIndex < 0) {
          return;
        }

        const currentAction = { ...actions[currentActionIndex] };
        const sets = currentAction.sets.filter((item) => item.uid !== setUid);

        if (sets.length === currentAction.sets.length) {
          return;
        }

        actions[currentActionIndex] = refreshAction({ ...currentAction, sets });
        this.updateActions(actions);
      }
    });
  },

  onActionDeleteTap(event) {
    if (this.data.readonly) {
      return;
    }

    const { index, name } = event.currentTarget.dataset;
    const deleteIndex = Number(index);

    if (!Number.isInteger(deleteIndex) || deleteIndex < 0 || deleteIndex >= this.data.actions.length) {
      return;
    }

    wx.showModal({
      title: "删除动作",
      content: `确定删除「${name}」吗？`,
      confirmText: "删除",
      confirmColor: "#D93025",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const actions = this.data.actions.slice();
        actions.splice(deleteIndex, 1);

        this.updateActions(actions);
      }
    });
  }
});

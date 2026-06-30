const { DEFAULT_ACTION_ICON_PATH } = require("../../data/actions");
const trainingService = require("../../services/trainings");

function formatVolume(value) {
  return Number(value || 0).toFixed(1);
}

function createSet(values = {}) {
  return {
    uid: `set-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    weight: values.weight === undefined ? "" : String(values.weight),
    reps: values.reps === undefined ? "" : String(values.reps),
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

  return {
    ...action,
    setsCount: sets.length,
    completedSets,
    completedVolume,
    plannedVolume,
    metaText: `${sets.length}组 · ${completedSets}组完成`,
    volumeText: `${formatVolume(completedVolume)}/${formatVolume(plannedVolume)}`
  };
}

function createTrainingAction(action) {
  const sourceSets = Array.isArray(action.sets) && action.sets.length ? action.sets : [createSet({ weight: action.weight })];

  return refreshAction({
    uid: `${action.id || "action"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    id: action.id,
    name: action.name || "未命名动作",
    iconPath: action.iconPath || action.image || DEFAULT_ACTION_ICON_PATH,
    expanded: false,
    sets: sourceSets.map((item) => (item.uid ? { ...item } : createSet(item)))
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
    saving: false
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
    if (this.data.saving) {
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: "保存中", mask: true });

    try {
      await trainingService.saveTraining({
        title: this.data.title,
        timer: this.data.timer,
        actions: this.data.actions.map((action) => ({
          id: action.id,
          name: action.name,
          iconPath: action.iconPath,
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

  updateActions(actions) {
    this.setData({
      actions,
      summary: buildSummary(actions)
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

const CACHE_STORAGE_KEY = "actionIconCache:v2";
const ACTION_CACHE_STORAGE_KEY = "actionIconCacheByAction:v1";
const DEFAULT_ACTION_ICON_PATH = "/assets/default-action.png";

const pendingDownloads = Object.create(null);

function isCloudFile(filePath) {
  return typeof filePath === "string" && filePath.indexOf("cloud://") === 0;
}

function readCache() {
  try {
    const cache = wx.getStorageSync(CACHE_STORAGE_KEY);
    return cache && typeof cache === "object" ? cache : {};
  } catch (error) {
    return {};
  }
}

function writeCache(cache) {
  try {
    wx.setStorageSync(CACHE_STORAGE_KEY, cache);
  } catch (error) {
    console.warn("动作图标缓存索引写入失败", error);
  }
}

function readActionCache() {
  try {
    const cache = wx.getStorageSync(ACTION_CACHE_STORAGE_KEY);
    return cache && typeof cache === "object" ? cache : {};
  } catch (error) {
    return {};
  }
}

function writeActionCache(cache) {
  try {
    wx.setStorageSync(ACTION_CACHE_STORAGE_KEY, cache);
  } catch (error) {
    console.warn("动作图标动作索引写入失败", error);
  }
}

function fileExists(filePath) {
  if (!filePath || !wx.getFileSystemManager) {
    return Promise.resolve(false);
  }

  const fileSystem = wx.getFileSystemManager();

  return new Promise((resolve) => {
    fileSystem.access({
      path: filePath,
      success: () => resolve(true),
      fail: () => resolve(false)
    });
  });
}

function saveTempFile(tempFilePath) {
  const fileSystem = wx.getFileSystemManager();

  return new Promise((resolve, reject) => {
    fileSystem.saveFile({
      tempFilePath,
      success: ({ savedFilePath }) => resolve(savedFilePath),
      fail: reject
    });
  });
}

function downloadAndSave(fileID) {
  return wx.cloud.downloadFile({ fileID })
    .then(({ tempFilePath }) => saveTempFile(tempFilePath)
      .then((filePath) => ({ filePath, persistent: true }))
      .catch((error) => {
        // 临时文件仅供当前会话显示，不写入持久缓存索引。
        console.warn("动作图标持久化失败，继续使用临时文件", error);
        return { filePath: tempFilePath, persistent: false };
      }));
}

function getTemporaryCloudUrl(fileID) {
  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== "function") {
    return Promise.resolve("");
  }

  return wx.cloud.getTempFileURL({ fileList: [fileID] })
    .then(({ fileList }) => {
      const file = Array.isArray(fileList) ? fileList[0] : null;
      return file && file.tempFileURL ? file.tempFileURL : "";
    })
    .catch(() => "");
}

async function getCachedIconPath(fileID) {
  if (!isCloudFile(fileID)) return fileID;
  if (!wx.cloud) return DEFAULT_ACTION_ICON_PATH;
  if (!wx.getFileSystemManager) {
    return await getTemporaryCloudUrl(fileID) || DEFAULT_ACTION_ICON_PATH;
  }

  const cache = readCache();
  const cachedPath = cache[fileID];

  if (cachedPath && await fileExists(cachedPath)) {
    return cachedPath;
  }

  if (cachedPath) {
    delete cache[fileID];
    writeCache(cache);
  }

  if (!pendingDownloads[fileID]) {
    pendingDownloads[fileID] = downloadAndSave(fileID)
      .then(({ filePath, persistent }) => {
        if (persistent) {
          const latestCache = readCache();
          latestCache[fileID] = filePath;
          writeCache(latestCache);
        }
        return filePath;
      })
      .catch(async (error) => {
        console.warn("动作图标下载失败，尝试临时网络地址", error);
        const tempFileURL = await getTemporaryCloudUrl(fileID);
        return tempFileURL || DEFAULT_ACTION_ICON_PATH;
      })
      .then((resolvedPath) => {
        delete pendingDownloads[fileID];
        return resolvedPath;
      });
  }

  return pendingDownloads[fileID];
}

function findCachedFileForAction(action, fileCache) {
  const actionId = action && action.id;
  if (actionId === undefined || actionId === null) return null;

  const directFileIDs = [action.iconFileID, action.iconDownloadPath, action.iconPath]
    .filter(isCloudFile);
  const directFileID = directFileIDs.find((fileID) => fileCache[fileID]);
  if (directFileID) {
    return { fileID: directFileID, filePath: fileCache[directFileID] };
  }

  // 兼容旧版仅按云文件 ID 保存的缓存，无需用户重新下载已有图片。
  const filenameSuffix = `/${String(actionId)}.png`;
  const revisionSegment = action.iconRevision ? `/${action.iconRevision}/` : "";
  const migratedFileID = Object.keys(fileCache).find((fileID) => {
    const cleanFileID = fileID.split("?")[0];
    return cleanFileID.endsWith(filenameSuffix)
      && (!revisionSegment || cleanFileID.indexOf(revisionSegment) >= 0);
  });

  return migratedFileID
    ? { fileID: migratedFileID, filePath: fileCache[migratedFileID] }
    : null;
}

async function restoreCachedActionIcons(actions) {
  if (!Array.isArray(actions) || !actions.length || !wx.getFileSystemManager) {
    return Array.isArray(actions) ? actions : [];
  }

  const fileCache = readCache();
  const actionCache = readActionCache();
  let fileCacheChanged = false;
  let actionCacheChanged = false;

  const restoredActions = await Promise.all(actions.map(async (action) => {
    if (!action || action.iconCached || action.id === undefined || action.id === null) {
      return action;
    }

    const actionId = String(action.id);
    let cachedEntry = actionCache[actionId];

    if (cachedEntry && cachedEntry.iconRevision !== (action.iconRevision || "")) {
      delete actionCache[actionId];
      actionCacheChanged = true;
      cachedEntry = null;
    }

    if (!cachedEntry) {
      const migratedEntry = findCachedFileForAction(action, fileCache);
      if (migratedEntry) {
        cachedEntry = {
          ...migratedEntry,
          iconRevision: action.iconRevision || ""
        };
        actionCache[actionId] = cachedEntry;
        actionCacheChanged = true;
      }
    }

    if (!cachedEntry || !cachedEntry.filePath) return action;
    if (await fileExists(cachedEntry.filePath)) {
      return {
        ...action,
        iconFileID: cachedEntry.fileID || action.iconFileID || "",
        iconPath: cachedEntry.filePath,
        iconCached: true
      };
    }

    delete actionCache[actionId];
    actionCacheChanged = true;
    if (cachedEntry.fileID && fileCache[cachedEntry.fileID] === cachedEntry.filePath) {
      delete fileCache[cachedEntry.fileID];
      fileCacheChanged = true;
    }
    return action;
  }));

  if (fileCacheChanged) writeCache(fileCache);
  if (actionCacheChanged) writeActionCache(actionCache);
  return restoredActions;
}

function rememberCachedActionIcon(action, fileID, filePath) {
  if (!action || action.id === undefined || action.id === null || !fileID || !filePath) return;

  // 只有 saveFile 成功并进入文件缓存索引的路径，才可跨会话恢复。
  if (readCache()[fileID] !== filePath) return;

  const actionCache = readActionCache();
  actionCache[String(action.id)] = {
    fileID,
    filePath,
    iconRevision: action.iconRevision || ""
  };
  writeActionCache(actionCache);
}

async function cacheActionIcon(action) {
  const sourceIconPath = action && (action.iconDownloadPath || action.iconPath);
  const iconFileID = isCloudFile(action && action.iconFileID)
    ? action.iconFileID
    : (isCloudFile(sourceIconPath) ? sourceIconPath : "");
  const { iconDownloadPath, ...cachedAction } = action || {};

  const iconPath = await getCachedIconPath(sourceIconPath);
  rememberCachedActionIcon(action, iconFileID, iconPath);

  return {
    ...cachedAction,
    iconFileID,
    iconPath,
    iconCached: true
  };
}

function cacheActionIcons(actions) {
  return Promise.all(actions.map(cacheActionIcon));
}

module.exports = {
  cacheActionIcons,
  getCachedIconPath,
  isCloudFile,
  restoreCachedActionIcons
};

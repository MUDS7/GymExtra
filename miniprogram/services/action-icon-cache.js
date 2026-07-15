const CACHE_STORAGE_KEY = "actionIconCache:v2";

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
    .then(({ tempFilePath }) => saveTempFile(tempFilePath));
}

async function getCachedIconPath(fileID) {
  if (!isCloudFile(fileID) || !wx.cloud || !wx.getFileSystemManager) {
    return fileID;
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
      .then((savedFilePath) => {
        const latestCache = readCache();
        latestCache[fileID] = savedFilePath;
        writeCache(latestCache);
        return savedFilePath;
      })
      .catch((error) => {
        console.warn("动作图标缓存失败，继续使用云端地址", error);
        return fileID;
      })
      .then((resolvedPath) => {
        delete pendingDownloads[fileID];
        return resolvedPath;
      });
  }

  return pendingDownloads[fileID];
}

async function cacheActionIcon(action) {
  const sourceIconPath = action && (action.iconDownloadPath || action.iconPath);
  const iconFileID = isCloudFile(action && action.iconFileID)
    ? action.iconFileID
    : (isCloudFile(sourceIconPath) ? sourceIconPath : "");
  const { iconDownloadPath, ...cachedAction } = action || {};

  return {
    ...cachedAction,
    iconFileID,
    iconPath: await getCachedIconPath(sourceIconPath)
  };
}

function cacheActionIcons(actions) {
  return Promise.all(actions.map(cacheActionIcon));
}

module.exports = {
  cacheActionIcons,
  getCachedIconPath,
  isCloudFile
};

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  openImagesFolder: () => ipcRenderer.invoke('open-images-folder'),
  saveSingleImage: (payload) => ipcRenderer.invoke('save-single-image', payload),
  syncAllImages: (invoices) => ipcRenderer.invoke('sync-all-images', invoices),
  saveFile: (payload) => ipcRenderer.invoke('save-file', payload),
  checkGitHubRelease: () => ipcRenderer.invoke('check-github-release'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),
  launchInstallerAndQuit: () => ipcRenderer.invoke('launch-installer-and-quit'),
  downloadAndInstallUpdate: (url) => ipcRenderer.invoke('download-and-install-update', url),
  onDownloadProgress: (callback) => {
    const handler = (_event, percent) => callback(percent);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  }
});

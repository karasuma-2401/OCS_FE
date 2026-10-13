const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ocsDesktop', {
  platform: 'windows',
  databaseHealth: () => ipcRenderer.invoke('database:health'),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waveElectron', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Platform info
  platform: process.platform,
  isElectron: true,

  // Bluetooth
  isBluetoothSupported: () => ipcRenderer.invoke('bluetooth:isSupported'),
  sendNotification: (opts) => ipcRenderer.invoke('bluetooth:notify', opts),
});

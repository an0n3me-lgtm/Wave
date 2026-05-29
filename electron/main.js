const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const serve = require('electron-serve');

const isDev = !app.isPackaged;
const clientPath = isDev
  ? path.join(__dirname, '../client/dist')
  : path.join(process.resourcesPath, 'client');
const serverPath = isDev
  ? path.join(__dirname, '../server')
  : path.join(process.resourcesPath, 'server');

const loadURL = serve({ directory: clientPath });

let mainWindow;
let serverProcess;

// ── Start embedded Wave server ────────────────────────────────────────────────

function startServer() {
  const serverIndex = path.join(serverPath, 'index.js');
  serverProcess = spawn(process.execPath, [serverIndex], {
    env: {
      ...process.env,
      PORT: '3001',
      JWT_SECRET: 'wave-electron-secret',
      CLIENT_URL: 'app://-',
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    if (isDev) console.log('[server]', d.toString().trim());
  });
  serverProcess.stderr.on('data', (d) => {
    if (isDev) console.error('[server:err]', d.toString().trim());
  });
}

// ── Create window ─────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: process.platform !== 'win32',
    backgroundColor: '#0a0a12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 1500));

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await loadURL(mainWindow);
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Window controls IPC (custom titlebar for Windows) ────────────────────────

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.restore();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ── App events ────────────────────────────────────────────────────────────────

app.on('ready', async () => {
  startServer();
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// ── Bluetooth IPC bridge ─────────────────────────────────────────────────────
// The renderer uses Web Bluetooth API directly (Chrome supports it in Electron)
// This IPC bridge is for advanced BLE operations if needed.

ipcMain.handle('bluetooth:isSupported', () => true);
ipcMain.handle('bluetooth:notify', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.png') }).show();
  }
});

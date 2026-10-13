const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { pathToFileURL } = require('node:url');

const { app, BrowserWindow, ipcMain, net, protocol, session } = require('electron');

const APP_SCHEME = 'ocs-app';
const DEVELOPMENT_ORIGIN = 'http://127.0.0.1:8081';

let database;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function openDatabase() {
  const databasePath = path.join(app.getPath('userData'), 'ocs.db');
  database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO app_metadata (key, value)
    VALUES ('schema_version', '1');
  `);
}

function isTrustedFrame(frame) {
  const trustedOrigin = app.isPackaged ? `${APP_SCHEME}://bundle` : DEVELOPMENT_ORIGIN;
  return frame?.url?.startsWith(trustedOrigin) ?? false;
}

function registerDatabaseHandlers() {
  ipcMain.handle('database:health', (event) => {
    if (!isTrustedFrame(event.senderFrame)) {
      throw new Error('IPC request rejected: untrusted renderer.');
    }

    const row = database
      .prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'")
      .get();

    return {
      ready: true,
      engine: 'node:sqlite',
      schemaVersion: Number(row?.value ?? 0),
    };
  });
}

function registerAppProtocol() {
  const bundleRoot = path.join(app.getAppPath(), 'dist');

  protocol.handle(APP_SCHEME, (request) => {
    const requestUrl = new URL(request.url);

    if (requestUrl.host !== 'bundle') {
      return new Response('Not found', { status: 404 });
    }

    const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const filePath = path.resolve(bundleRoot, `.${decodeURIComponent(requestedPath)}`);
    const relativePath = path.relative(bundleRoot, filePath);
    const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

    if (!isSafe) {
      return new Response('Bad request', { status: 400 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#F3F0E9',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const allowedOrigin = app.isPackaged ? `${APP_SCHEME}://bundle` : DEVELOPMENT_ORIGIN;
    if (!url.startsWith(allowedOrigin)) event.preventDefault();
  });

  if (app.isPackaged) {
    window.loadURL(`${APP_SCHEME}://bundle/`);
  } else {
    window.loadURL(DEVELOPMENT_ORIGIN);
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    openDatabase();
    registerDatabaseHandlers();
    if (app.isPackaged) registerAppProtocol();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    database?.close();
  });
}

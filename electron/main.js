const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('http');
const net = require('net');
const path = require('path');

const BASE_PORT = 3000;

let mainWindow = null;

// খালি পোর্ট খোঁজা (৩০০০ ব্যস্ত থাকলে পরেরটা)
function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      if (startPort > BASE_PORT + 20) {
        reject(new Error('No free port found'));
        return;
      }
      resolve(findFreePort(startPort + 1));
    });
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

// এক্সপ্রেস সার্ভার রেডি না হওয়া পর্যন্ত অপেক্ষা
function waitForServer(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Server did not start in time'));
          return;
        }
        setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 480,
    minHeight: 560,
    backgroundColor: '#0f1226',
    autoHideMenuBar: true,
    title: 'AI Chat Server',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  // বাইরের লিংক সিস্টেম ব্রাউজারে খোলা হবে
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // একই অ্যাপ দুইবার খুললে শুধু আগের ইনস্ট্যান্স ফোকাস হবে
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    const port = await findFreePort(BASE_PORT);
    process.env.PORT = String(port);

    // একই প্রসেসে Express সার্ভার চালু
    require(path.join(app.getAppPath(), 'server.js'));

    try {
      await waitForServer(port);
    } catch (err) {
      console.error(err);
    }

    createWindow(port);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

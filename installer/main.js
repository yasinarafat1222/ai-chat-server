const { app, BrowserWindow, Menu, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

// UI ফোল্ডার (zip থেকে এখানে এক্সট্র্যাক্ট করা হয়)
const UI_DIR = path.join(__dirname, 'ui');
const BASE_PORT = 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.map': 'application/json'
};

// ui/ ফোল্ডারের সবচেয়ে উপরের index.html খোঁজা (আগে রুট, তারপর ভেতরের ফোল্ডার)
function findIndexHtml() {
  const rootIndex = path.join(UI_DIR, 'index.html');
  if (fs.existsSync(rootIndex)) return rootIndex;

  const queue = [UI_DIR];
  while (queue.length) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isFile() && e.name.toLowerCase() === 'index.html') {
        return path.join(dir, e.name);
      }
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) queue.push(path.join(dir, e.name));
    }
  }
  return null;
}

// ছোট স্ট্যাটিক ফাইল সার্ভার (SPA fallback সহ)
function createServer(entryHtml) {
  return http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.normalize(path.join(UI_DIR, urlPath));
      const inside =
        filePath === UI_DIR || filePath.startsWith(UI_DIR + path.sep);
      if (!inside) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        if (!path.extname(urlPath) && entryHtml) {
          filePath = entryHtml; // SPA route fallback
        } else {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Error');
    }
  });
}

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
          reject(new Error('UI server did not start in time'));
          return;
        }
        setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 520,
    minHeight: 560,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    title: 'JAZARI Bridge UI',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(`http://127.0.0.1:${port}`);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    const entryHtml = findIndexHtml();
    const port = await findFreePort(BASE_PORT);

    const server = createServer(entryHtml);
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

    try {
      await waitForServer(port);
    } catch {
      // চলতে দাও — উইন্ডু তবুও খুলবে
    }

    createWindow(port);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}

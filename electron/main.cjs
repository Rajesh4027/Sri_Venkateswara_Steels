const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

// ── IPC Handlers for Auto-Update & GitHub API ──
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-github-release', async () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Rajesh4027/Sri_Venkateswara_Steels/releases/latest',
      headers: {
        'User-Agent': 'Sri-Venkateswara-Steels-ERP',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, release: json });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.handle('download-and-install-update', async (event, downloadUrl) => {
  return new Promise((resolve) => {
    try {
      if (!downloadUrl) {
        resolve({ success: false, error: 'No download URL provided' });
        return;
      }

      const tempDir = app.getPath('temp');
      const installerPath = path.join(tempDir, 'Sri_Venkateswara_Steels_Update_Setup.exe');

      // Helper to download following redirects (GitHub assets redirect to AWS S3)
      const downloadFileWithRedirects = (url, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          resolve({ success: false, error: 'Too many redirects' });
          return;
        }

        const client = url.startsWith('http:') ? require('http') : https;
        client.get(url, { headers: { 'User-Agent': 'Sri-Venkateswara-Steels-ERP' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            downloadFileWithRedirects(res.headers.location, maxRedirects - 1);
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ success: false, error: `Server returned HTTP ${res.statusCode}` });
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 78000000;
          let receivedBytes = 0;
          const fileStream = fs.createWriteStream(installerPath);

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            fileStream.write(chunk);
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-download-progress', percent);
            }
          });

          res.on('end', () => {
            fileStream.end();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-download-progress', 100);
            }

            // Small delay to ensure file lock is released, then launch installer & quit app
            setTimeout(() => {
              try {
                const child = spawn(installerPath, [], {
                  detached: true,
                  stdio: 'ignore'
                });
                child.unref();
                app.quit();
                resolve({ success: true, launched: true });
              } catch (spawnErr) {
                shell.openPath(installerPath);
                app.quit();
                resolve({ success: true, opened: true });
              }
            }, 800);
          });
        }).on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      };

      downloadFileWithRedirects(downloadUrl);
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Sri Venkateswara Steels - Inventory & Billing ERP',
    icon: path.join(__dirname, '../public/logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Open external links in default OS browser rather than inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null);

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    // In production or packaged app, load the built index.html from dist
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single application instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

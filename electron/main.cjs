const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

// ── IPC Handlers for Auto-Update & GitHub API ──
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ── Local Disk Image Storage Helpers & Handlers ──
function getImagesDirectory() {
  const userData = app.getPath('userData');
  const dir = path.join(userData, 'Bill_Images');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

ipcMain.handle('get-storage-info', () => {
  const imagesDir = getImagesDirectory();
  let filesCount = 0;
  let totalBytes = 0;
  try {
    const files = fs.readdirSync(imagesDir);
    filesCount = files.length;
    files.forEach(f => {
      try {
        const stat = fs.statSync(path.join(imagesDir, f));
        totalBytes += stat.size;
      } catch (e) { }
    });
  } catch (e) { }
  return {
    userDataPath: app.getPath('userData'),
    imagesDir: imagesDir,
    filesCount,
    totalSizeMb: (totalBytes / (1024 * 1024)).toFixed(2)
  };
});

ipcMain.handle('open-images-folder', async () => {
  const dir = getImagesDirectory();
  await shell.openPath(dir);
  return { success: true, path: dir };
});

function formatToDdMmYyyy(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const yyyy = m[1];
    const mm = m[2].padStart(2, '0');
    const dd = m[3].padStart(2, '0');
    return `${dd}-${mm}-${yyyy}`;
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

ipcMain.handle('save-single-image', async (event, payload) => {
  try {
    const { dataUrl, filename, invoiceNo, invoiceDate } = payload || {};
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return { success: false, error: 'Invalid data' };
    }
    const dir = getImagesDirectory();
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: false, error: 'Malformed base64 data' };
    }
    const mimeType = matches[1];
    const ext = mimeType.includes('png') ? 'png' : (mimeType.includes('webp') ? 'webp' : 'jpg');
    const safeInv = String(invoiceNo || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = formatToDdMmYyyy(invoiceDate);
    const cleanName = safeDate ? `Invoice_${safeInv}_${safeDate}.${ext}` : `Invoice_${safeInv}.${ext}`;
    const filePath = path.join(dir, cleanName);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return { success: true, filePath, filename: cleanName, imagesDir: dir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync-all-images', async (event, invoices = []) => {
  try {
    const dir = getImagesDirectory();
    let savedCount = 0;
    if (Array.isArray(invoices)) {
      for (const inv of invoices) {
        if (inv.billImage && typeof inv.billImage === 'string' && inv.billImage.startsWith('data:')) {
          const matches = inv.billImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const ext = mimeType.includes('png') ? 'png' : 'jpg';
            const safeInv = String(inv.inv || inv.id || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeDate = formatToDdMmYyyy(inv.date);
            const filename = safeDate ? `Invoice_${safeInv}_${safeDate}.${ext}` : `Invoice_${safeInv}.${ext}`;
            const filePath = path.join(dir, filename);
            fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
            savedCount++;
          }
        }
      }
    }
    return { success: true, savedCount, imagesDir: dir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Direct Invoice PDF generation to user's local disk Downloads folder
ipcMain.handle('generate-invoice-pdf', async (event, payload) => {
  let win = null;
  try {
    const { html, filename } = payload || {};
    if (!html) return { success: false, error: 'HTML is required' };

    win = new BrowserWindow({
      show: false,
      width: 800,
      height: 1150,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Give time for layout, fonts, and inline images to finish rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        top: 0.15,
        bottom: 0.15,
        left: 0.2,
        right: 0.2
      }
    });

    const downloadsDir = app.getPath('downloads');
    const safeFilename = filename
      ? (filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`)
      : `Invoice_${Date.now()}.pdf`;

    const targetPath = path.join(downloadsDir, safeFilename);

    fs.writeFileSync(targetPath, pdfBuffer);

    return { success: true, filePath: targetPath, filename: safeFilename };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (win && !win.isDestroyed()) {
      try { win.close(); } catch (e) { }
    }
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await shell.openPath(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Native File Save Dialog & Writer (for Exports like Excel, CSV, JSON Backups)
ipcMain.handle('save-file', async (event, payload) => {
  try {
    const { filename, content, defaultPath, isBase64 } = payload || {};
    if (!filename || content === undefined) {
      return { success: false, error: 'Filename and content are required' };
    }
    const defaultDir = defaultPath || app.getPath('downloads');
    const targetPath = path.join(defaultDir, filename);

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File - Sri Venkateswara Steels ERP',
      defaultPath: targetPath
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    if (isBase64) {
      fs.writeFileSync(filePath, Buffer.from(content, 'base64'));
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function fetchJsonWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = targetUrl.startsWith('http:') ? http : https;
    const req = client.get(targetUrl, {
      headers: {
        'User-Agent': 'Sri-Venkateswara-Steels-ERP',
        'Accept': 'application/json, text/plain, */*'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJsonWithRedirects(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

ipcMain.handle('check-github-release', async () => {
  // 1. Check Fastly CDN version.json FIRST - Zero GitHub API rate limits!
  try {
    const rawVerUrl = `https://raw.githubusercontent.com/Rajesh4027/Sri_Venkateswara_Steels/main/version.json?t=${Date.now()}`;
    const verData = await fetchJsonWithRedirects(rawVerUrl);
    if (verData && verData.tag_name) {
      return { success: true, release: verData };
    }
  } catch (cdnErr) {
    // Continue to next fallback
  }

  // 2. Check Fastly CDN package.json fallback - Zero GitHub API rate limits!
  try {
    const pkgUrl = `https://raw.githubusercontent.com/Rajesh4027/Sri_Venkateswara_Steels/main/package.json?t=${Date.now()}`;
    const pkgData = await fetchJsonWithRedirects(pkgUrl);
    if (pkgData && pkgData.version) {
      const tag = `v${pkgData.version}`;
      return {
        success: true,
        release: {
          tag_name: tag,
          name: `Sri Venkateswara Steels ERP ${tag}`,
          body: `Release ${tag}`,
          assets: [
            {
              name: `Sri.Venkateswara.Steels.Setup.${pkgData.version}.exe`,
              browser_download_url: `https://github.com/Rajesh4027/Sri_Venkateswara_Steels/releases/download/${tag}/Sri.Venkateswara.Steels.Setup.${pkgData.version}.exe`
            }
          ]
        }
      };
    }
  } catch (pkgErr) {
    // Continue to next fallback
  }

  // 3. Fallback to GitHub REST API (Strictly require HTTP 200 and tag_name)
  try {
    const apiUrl = 'https://api.github.com/repos/Rajesh4027/Sri_Venkateswara_Steels/releases/latest';
    const apiData = await fetchJsonWithRedirects(apiUrl);
    if (apiData && apiData.tag_name) {
      return { success: true, release: apiData };
    }
  } catch (apiErr) {
    // Both failed
  }

  return { success: false, error: 'Unable to reach update servers' };
});

let downloadedInstallerPath = null;

// IPC: Download update to temp in background without asking for download location
ipcMain.handle('download-update', async (event, downloadUrl) => {
  return new Promise((resolve) => {
    try {
      if (!downloadUrl) {
        resolve({ success: false, error: 'No download URL provided' });
        return;
      }

      const tempDir = app.getPath('temp');
      downloadedInstallerPath = path.join(tempDir, 'Sri_Venkateswara_Steels_Update_Setup.exe');

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
          const fileStream = fs.createWriteStream(downloadedInstallerPath);

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
            resolve({ success: true, path: downloadedInstallerPath });
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

// IPC: Launch the setup installer in front and quit current app so user can click Next & Next
ipcMain.handle('launch-installer-and-quit', async () => {
  const tempDir = app.getPath('temp');
  const installerPath = downloadedInstallerPath || path.join(tempDir, 'Sri_Venkateswara_Steels_Update_Setup.exe');

  setTimeout(() => {
    try {
      const child = spawn(installerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      app.quit();
    } catch (spawnErr) {
      shell.openPath(installerPath);
      app.quit();
    }
  }, 300);

  return { success: true };
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

  // Handle downloads inside Electron (allow user to save exported files)
  if (mainWindow.webContents.session) {
    mainWindow.webContents.session.on('will-download', (event, item) => {
      const defaultDir = app.getPath('downloads');
      const filename = item.getFilename();
      item.setSaveDialogOptions({
        title: 'Save File - Sri Venkateswara Steels ERP',
        defaultPath: path.join(defaultDir, filename)
      });
    });
  }

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

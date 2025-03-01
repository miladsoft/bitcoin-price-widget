const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
    return;
}

const userDataPath = app.getPath('userData');
const cachePath = path.join(userDataPath, 'Cache');

if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
}

let tray = null;
let win = null;
let settingsWin = null;

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

let settings = { autoHide: false };

function loadSettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
        return { btcAmount: 0, showPortfolio: false };
    }
}

function saveSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
}

function createWindow() {
  win = new BrowserWindow({
    width: 300,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      partition: 'persist:main',
      cache: true,
      cachePath: cachePath
    },
    focusable: true,
    opacity: settings.opacity ? settings.opacity / 100 : 1,
    movable: !settings.lockPosition
  });

  win.loadFile('index.html');
  win.setAlwaysOnTop(true, 'screen-saver');
  
  win.on('ready-to-show', () => {
    win.webContents.executeJavaScript(`
      setTimeout(() => {
        const size = document.body.getBoundingClientRect();
        window.electronAPI.resize(Math.ceil(size.width), Math.ceil(size.height));
      }, 100);
    `);
  });
  
  win.hookWindowMessage(0x0116, function (e) {
    win.setEnabled(false);
    setTimeout(() => win.setEnabled(true), 100);
    return true;
  });

  win.on('blur', () => {
    if (settings.autoHide) {
      win.hide();
    }
  });

  const ret = globalShortcut.register('Alt+B', () => {
    if (!win.isVisible()) {
      win.show();
    } else {
      win.hide();
    }
  });

  win.webContents.executeJavaScript(`
    document.body.style.opacity = '${settings.opacity / 100}';
    if (${settings.darkMode}) {
        document.getElementById('price').style.background = 'rgba(0,0,0,0.5)';
    }
  `);
}

function createSettingsWindow() {
    if (settingsWin) {
        settingsWin.focus();
        return;
    }

    settingsWin = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        transparent: true,
        skipTaskbar: true, 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            partition: 'persist:settings',
            cache: true,
            cachePath: cachePath
        },
        center: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        backgroundColor: '#00000000',
        roundedCorners: true,
        vibrancy: 'dark'
    });

    settingsWin.loadFile('settings.html');
    
    settingsWin.webContents.on('did-finish-load', () => {
        settingsWin.webContents.send('load-settings', settings);
        settingsWin.webContents.executeJavaScript(`
            document.querySelector('.setting-header').style.webkitAppRegion = 'drag';
            document.querySelector('.close-btn').style.webkitAppRegion = 'no-drag';
        `);
    });

    settingsWin.on('closed', () => {
        settingsWin = null;
    });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        win.show();
      }
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      label: 'Hide',
      click: () => {
        win.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Bitcoin Price Widget');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    tray.popUpContextMenu();
  });
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
        dialog.showErrorBox(
            'Application Already Running',
            'Another instance of Bitcoin Price Widget is already running.\nPlease check your system tray for the existing application.'
        );
        
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    }
});

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');

app.whenReady().then(() => {
  createWindow();
  createTray();

  ipcMain.on('show-context-menu', (event, data) => {
    const menu = Menu.buildFromTemplate([
        {
            label: `Copy Price: $${data.price}`,
            click: () => clipboard.writeText(`$${data.price}`)
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => createSettingsWindow()
        },
        {
            label: 'Hide Widget',
            click: () => win.hide()
        }
    ]);

    menu.popup({
        window: win,
        callback: () => win.focus()
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.setLoginItemSettings({
    openAtLogin: settings.startWithWindows
});

ipcMain.on('settings-changed', (event, newSettings) => {
    settings = newSettings;
    if (win) {
        win.setAlwaysOnTop(settings.alwaysOnTop);
        win.setOpacity(settings.opacity / 100);
        win.setMovable(!settings.lockPosition);
        app.setLoginItemSettings({ openAtLogin: settings.startWithWindows });
        win.webContents.send('settings-changed', settings);
    }
});

ipcMain.on('resize', (event, width, height) => {
  if (win) {
    win.setSize(width, height);
  }
});

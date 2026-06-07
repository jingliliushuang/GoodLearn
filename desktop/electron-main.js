const { app, BrowserWindow } = require("electron");
const path = require("path");

const FRONTEND_URL = "http://127.0.0.1:5173";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 700,
    title: "GoodLearnApp",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL(FRONTEND_URL);

  win.webContents.on("did-fail-load", (_event, _code, description) => {
    console.error("Failed to load frontend:", description);
    console.error("Make sure Vite dev server is running at", FRONTEND_URL);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

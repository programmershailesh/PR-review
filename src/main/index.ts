import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, nativeTheme, Notification, safeStorage, shell, Tray } from "electron";
import path from "node:path";
import { z } from "zod";
import { AppCore } from "./app-core";
import { migrateUserData } from "./migrate";
import { Store } from "./store";

const APP_NAME = "Code Reviewer";
const APP_ID = "app.verdict.desktop"; // Unchanged by the rename, so installers upgrade in place.
const OLD_DATA_FOLDER = "Verdict";
/** Time to read the "ready" notification and click it before the app exits. */
const IDLE_EXIT_DELAY_MS = 15_000;

let win: BrowserWindow | null = null;
let core: AppCore;
let tray: Tray | null = null;
let trayStatus = "";
let inBackground = false;
let idleTimer: NodeJS.Timeout | undefined;
// Stops Electron discarding a notification, and its click handler, too early.
const liveNotifications = new Set<Notification>();

function enginePath(): string {
  return app.isPackaged ? path.join(process.resourcesPath, "review-engine") : path.join(app.getAppPath(), "review-engine");
}

function iconPath(file: string): string {
  return app.isPackaged ? path.join(process.resourcesPath, "icons", file) : path.join(app.getAppPath(), "build", file);
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: iconPath("icon.png") });
  liveNotifications.add(n);
  n.on("click", showWindow);
  n.on("close", () => liveNotifications.delete(n));
  n.show();
}

function workLabel(): string {
  const reviews = Object.values(core.state().reviews);
  const count = reviews.filter((r) => r.state === "running" || r.state === "queued").length;
  return count === 1 ? "Reviewing 1 change" : `Reviewing ${count} changes`;
}

function updateTray(): void {
  if (!tray) return;
  const status = workLabel();
  if (status === trayStatus) return;
  trayStatus = status;
  tray.setToolTip(`${APP_NAME}: ${status}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: status, enabled: false },
      { type: "separator" },
      { label: `Open ${APP_NAME}`, click: showWindow },
      { label: "Quit (reviews resume next time)", click: () => app.quit() },
    ]),
  );
}

/** The window is gone, but reviews keep running. The tray icon shows that the app is still alive. */
function enterBackground(): void {
  inBackground = true;
  core.setBackground(true);
  tray = new Tray(nativeImage.createFromPath(iconPath("tray.png")));
  tray.on("click", showWindow);
  trayStatus = "";
  updateTray();
  notify(`${APP_NAME} is still reviewing`, "The review continues in the background. You'll be notified when it's ready.");
}

function leaveBackground(): void {
  clearTimeout(idleTimer);
  if (!inBackground) return;
  inBackground = false;
  core.setBackground(false);
  tray?.destroy();
  tray = null;
  void core.refresh();
}

function showWindow(): void {
  leaveBackground();
  if (!win) createWindow();
  else {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
}

/** With the window closed and every review finished, there's nothing left to do. */
function onIdle(): void {
  if (!inBackground) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (inBackground && !win && !core.hasWork()) app.quit();
  }, IDLE_EXIT_DELAY_MS);
}

/** Refuses to store a token without real OS protection, such as Linux with no keyring. */
function encrypt(token: string): string {
  const insecure = process.platform === "linux" && safeStorage.getSelectedStorageBackend() === "basic_text";
  if (!safeStorage.isEncryptionAvailable() || insecure) {
    throw new Error("This computer has no secure keychain available, so Code Reviewer can't store your token safely.");
  }
  return safeStorage.encryptString(token).toString("base64");
}

function decrypt(blob: string): string {
  return safeStorage.decryptString(Buffer.from(blob, "base64"));
}

const TITLE_BAR_HEIGHT = 38;

/** Must match --bg and --text-2 in the UI, so the window controls blend into the app. */
function windowColors(): { color: string; symbolColor: string } {
  return nativeTheme.shouldUseDarkColors ? { color: "#0D1014", symbolColor: "#AAB4C0" } : { color: "#F7F8FA", symbolColor: "#4C5763" };
}

function applyWindowColors(): void {
  if (!win) return;
  const colors = windowColors();
  win.setBackgroundColor(colors.color);
  if (process.platform !== "darwin") win.setTitleBarOverlay({ ...colors, height: TITLE_BAR_HEIGHT });
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 640,
    minHeight: 480,
    title: APP_NAME,
    icon: iconPath("icon.png"),
    backgroundColor: windowColors().color,
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 14, y: 12 } }
      : { titleBarStyle: "hidden" as const, titleBarOverlay: { ...windowColors(), height: TITLE_BAR_HEIGHT } }),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  if (process.platform !== "darwin") win.removeMenu();
  // The UI never navigates or opens windows. Links go through openExternal below.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => {
    if (url !== win?.webContents.getURL()) e.preventDefault();
  });
  win.on("closed", () => (win = null));
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function registerIpc(): void {
  const str = z.string().min(1).max(4096);
  const handle = <A extends unknown[]>(channel: string, schema: z.ZodType<A>, fn: (...args: A) => unknown) =>
    ipcMain.handle(channel, (_e, ...args: unknown[]) => fn(...schema.parse(args)));
  const none = z.tuple([]);
  const scope = z.string().min(1).max(300);
  const prKey = z.string().min(1).max(500);

  handle("getState", none, () => core.state());
  handle("checkClaude", none, () => core.checkClaude());
  handle(
    "connectAccount",
    z.tuple([z.object({ provider: z.enum(["github", "gitlab", "bitbucket"]), host: str, token: str })]),
    (input) => core.connectAccount(input),
  );
  handle("disconnectAccount", z.tuple([str]), (id) => core.disconnectAccount(id));
  handle("refresh", none, () => core.refresh());
  handle("startReview", z.tuple([prKey]), (k) => core.startReview(k));
  handle("cancelReview", z.tuple([prKey]), (k) => core.cancelReview(k));
  handle("getDiff", z.tuple([prKey]), (k) => core.getDiff(k));
  handle(
    "updateDraft",
    z.tuple([prKey, z.number().int().min(0), z.object({ included: z.boolean(), text: z.string().max(65536).optional() })]),
    (k, i, d) => core.updateDraft(k, i, d),
  );
  handle("sendReview", z.tuple([prKey, z.enum(["request_changes", "comment", "approve"])]), (k, e) => core.sendReview(k, e));
  handle("pickGuidelineFiles", z.tuple([scope]), async (s) => {
    const options: Electron.OpenDialogOptions = {
      title: "Choose guideline documents",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Documents", extensions: ["pdf", "docx", "md", "txt"] }],
    };
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return res.canceled ? { errors: [] } : core.addGuidelineFiles(s, res.filePaths);
  });
  handle("addGuidelineFiles", z.tuple([scope, z.array(str).max(50)]), (s, p) => core.addGuidelineFiles(s, p));
  handle("updateDoc", z.tuple([str, z.object({ level: z.enum(["must", "recommended"]).optional(), on: z.boolean().optional() })]), (id, p) => core.updateDoc(id, p));
  handle("removeDoc", z.tuple([str]), (id) => core.removeDoc(id));
  handle("addRule", z.tuple([scope, z.string().max(2000)]), (s, t) => core.addRule(s, t));
  handle("removeRule", z.tuple([scope, z.number().int().min(0)]), (s, i) => core.removeRule(s, i));
  handle(
    "updateSettings",
    z.tuple([
      z.object({
        autoStart: z.boolean().optional(),
        notify: z.boolean().optional(),
        depth: z.enum(["quick", "thorough"]).optional(),
        theme: z.enum(["system", "light", "dark"]).optional(),
        reviewNewProjects: z.boolean().optional(),
      }),
    ]),
    (p) => core.updateSettings(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))),
  );
  handle("setProjectEnabled", z.tuple([scope, z.boolean()]), (repo, enabled) => core.setProjectEnabled(repo, enabled));
  handle("setProjectOrder", z.tuple([z.array(scope).max(5000)]), (repos) => core.setProjectOrder(repos));
  handle("refreshRepositories", none, () => core.refreshRepositories());
  handle("openExternal", z.tuple([str]), async (url) => {
    // Only web links. A malicious PR must not be able to open arbitrary protocols.
    if (new URL(url).protocol !== "https:") throw new Error("Only https links can be opened.");
    await shell.openExternal(url);
  });
}

// A test profile passes its own folder, and must never touch real data.
if (!app.commandLine.hasSwitch("user-data-dir")) {
  try {
    migrateUserData(path.join(app.getPath("appData"), OLD_DATA_FOLDER), app.getPath("userData"));
  } catch (err) {
    console.error("Couldn't bring across data from the old app name", err);
  }
}
if (process.platform === "win32") app.setAppUserModelId(APP_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Opening the app while it's running in the background brings the window back.
  app.on("second-instance", showWindow);
  void app.whenReady().then(() => {
    const userData = app.getPath("userData");
    const store = new Store(path.join(userData, "state.json"));
    nativeTheme.themeSource = store.data.settings.theme;
    nativeTheme.on("updated", applyWindowColors);
    core = new AppCore({
      store,
      userData,
      enginePath: enginePath(),
      encrypt,
      decrypt,
      notify,
      onIdle,
      emit: (state) => {
        if (nativeTheme.themeSource !== state.settings.theme) nativeTheme.themeSource = state.settings.theme;
        win?.webContents.send("state", state);
        updateTray();
      },
    });
    registerIpc();
    createWindow();
    void core.start();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) showWindow();
    });
  });
  app.on("before-quit", () => core?.stop());
  app.on("window-all-closed", () => {
    if (core.hasWork()) enterBackground();
    else if (process.platform !== "darwin") app.quit();
  });
}

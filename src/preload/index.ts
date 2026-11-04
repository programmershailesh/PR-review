import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { AppState, CodeReviewerApi } from "../shared/types";

const call = (channel: string) => (...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api: CodeReviewerApi = {
  getState: call("getState"),
  onState(listener) {
    const wrapped = (_e: unknown, state: AppState) => listener(state);
    ipcRenderer.on("state", wrapped);
    return () => ipcRenderer.removeListener("state", wrapped);
  },
  checkClaude: call("checkClaude"),
  connectAccount: call("connectAccount"),
  disconnectAccount: call("disconnectAccount"),
  refresh: call("refresh"),
  startReview: call("startReview"),
  cancelReview: call("cancelReview"),
  getDiff: call("getDiff"),
  updateDraft: call("updateDraft"),
  sendReview: call("sendReview"),
  pickGuidelineFiles: call("pickGuidelineFiles"),
  addGuidelineFiles: call("addGuidelineFiles"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  updateDoc: call("updateDoc"),
  removeDoc: call("removeDoc"),
  addRule: call("addRule"),
  removeRule: call("removeRule"),
  updateSettings: call("updateSettings"),
  setProjectEnabled: call("setProjectEnabled"),
  setProjectOrder: call("setProjectOrder"),
  refreshRepositories: call("refreshRepositories"),
  openExternal: call("openExternal"),
} as CodeReviewerApi;

contextBridge.exposeInMainWorld("codeReviewer", api);

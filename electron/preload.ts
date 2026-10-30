import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { DesktopAPI, Snapshot, Page } from '../shared/types';
const api: DesktopAPI = {
  snapshot: () => ipcRenderer.invoke('app:snapshot'), analyze: url => ipcRenderer.invoke('media:analyze', url), start: (id, quality, format) => ipcRenderer.invoke('download:start', id, quality, format),
  cancel: id => ipcRenderer.invoke('download:cancel', id), retry: id => ipcRenderer.invoke('download:retry', id),
  selectFiles: () => ipcRenderer.invoke('files:select'), importFiles: files => ipcRenderer.invoke('files:import', files.map(file => webUtils.getPathForFile(file))),
  settings: settings => ipcRenderer.invoke('settings:update', settings), selectFolder: () => ipcRenderer.invoke('folder:select'), openFile: id => ipcRenderer.invoke('file:open', id), openFolder: id => ipcRenderer.invoke('folder:open', id),
  removeHistory: id => ipcRenderer.invoke('history:remove', id), clearHistory: () => ipcRenderer.invoke('history:clear'), logs: () => ipcRenderer.invoke('logs:open'), window: action => ipcRenderer.invoke('window:action', action),
  checkUpdate: () => ipcRenderer.invoke('update:check'), installUpdate: () => ipcRenderer.invoke('update:install'), licenses: () => ipcRenderer.invoke('licenses:open'),
  onState: callback => { const listener = (_: Electron.IpcRendererEvent, state: Snapshot) => callback(state); ipcRenderer.on('app:state', listener); return () => ipcRenderer.removeListener('app:state', listener); },
  onNavigate: callback => { const listener = (_: Electron.IpcRendererEvent, page: Page) => callback(page); ipcRenderer.on('app:navigate', listener); return () => ipcRenderer.removeListener('app:navigate', listener); }
};
contextBridge.exposeInMainWorld('desktop', api);

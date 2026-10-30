import { EventEmitter } from 'node:events';
import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateState } from '../../shared/types';
export class UpdateService extends EventEmitter {
  state: UpdateState = { status: 'unconfigured', message: 'Servidor de atualizações ainda não configurado.' };
  constructor() {
    super();
    // Build/release configuration supplies this URL. Never accept a feed URL over renderer IPC.
    const feed = process.env.CONVERTMP3_UPDATE_URL;
    if (!feed || !feed.startsWith('https://') || !app.isPackaged) return;
    autoUpdater.setFeedURL({ provider: 'generic', url: feed }); autoUpdater.autoDownload = false;
    this.state = { status: 'idle' };
    autoUpdater.on('update-available', info => this.set({ status: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => this.set({ status: 'idle', message: 'Você está usando a versão mais recente.' }));
    autoUpdater.on('download-progress', p => this.set({ ...this.state, status: 'downloading', progress: p.percent }));
    autoUpdater.on('update-downloaded', () => this.set({ ...this.state, status: 'downloaded' }));
    autoUpdater.on('error', error => this.set({ status: 'error', message: error.message }));
  }
  private set(state: UpdateState) { this.state = state; this.emit('change'); }
  async check() { if (this.state.status === 'unconfigured') return this.state; this.set({ status: 'checking' }); try { await autoUpdater.checkForUpdates(); } catch (error) { this.set({ status: 'error', message: String(error) }); } return this.state; }
  async install() { if (this.state.status === 'downloaded') autoUpdater.quitAndInstall(); else if (this.state.status === 'available') { this.set({ ...this.state, status: 'downloading', progress: 0 }); await autoUpdater.downloadUpdate(); } }
}

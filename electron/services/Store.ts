import fs from 'node:fs';
import path from 'node:path';
import type { Job, Settings } from '../../shared/types';
import { settingsSchema } from './validation';
interface Data { settings: Settings; jobs: Job[]; history: Job[] }
export class Store {
  data: Data;
  constructor(private folder: string, music: string) {
    fs.mkdirSync(folder, { recursive: true });
    this.data = { settings: { downloadFolder: path.join(music, 'ConvertMp3'), concurrent: 2, quality: 'best', filename: '{title}.mp3', cover: true, metadata: true, originalTitle: true, openFolder: false, startWithWindows: false, checkUpdates: true, minimizeToTray: true, theme: 'dark', language: 'pt-BR' }, jobs: [], history: [] };
    const file = path.join(folder, 'state.json');
    if (fs.existsSync(file)) {
      try { const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as Data; this.data.settings = settingsSchema.parse(saved.settings); this.data.jobs = Array.isArray(saved.jobs) ? saved.jobs : []; this.data.history = Array.isArray(saved.history) ? saved.history : []; }
      catch (e) { fs.copyFileSync(file, file + '.corrupt-' + Date.now()); this.log(String(e)); }
    }
    for (const job of this.data.jobs) if (['preparing', 'downloading', 'converting', 'metadata'].includes(job.status)) { job.status = 'error'; job.error = 'Processamento interrompido. Tente novamente.'; }
    this.save();
  }
  save() { const target = path.join(this.folder, 'state.json'); fs.writeFileSync(target + '.tmp', JSON.stringify(this.data, null, 2)); fs.renameSync(target + '.tmp', target); }
  log(message: string) { const dir = path.join(this.folder, 'logs'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, 'app.log'); if (fs.existsSync(file) && fs.statSync(file).size > 5_000_000) fs.renameSync(file, file + '.1'); fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`); }
  get logPath() { this.log('Abrindo log'); return path.join(this.folder, 'logs', 'app.log'); }
}

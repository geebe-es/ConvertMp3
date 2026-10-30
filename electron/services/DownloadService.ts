import fs from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { EventEmitter } from 'node:events';
import type { Job, Media, Quality, OutputFormat } from '../../shared/types';
import { Store } from './Store';
import { ProcessService } from './ProcessService';
import { FFmpegService } from './FFmpegService';
import { HistoryService } from './HistoryService';
import { outputName, validateUrl } from './validation';
export function friendlyError(error: unknown): string {
  const text = String(error);
  if (/ENOSPC|No space left/i.test(text)) return 'Não há espaço suficiente no disco.';
  if (/EACCES|EPERM|Permission denied/i.test(text)) return 'Sem permissão para gravar na pasta selecionada.';
  if (/private|sign in|login|authentication|cookies/i.test(text)) return 'Conteúdo privado ou que exige autenticação. Use uma fonte pública autorizada.';
  if (/DRM|protected|paywall/i.test(text)) return 'Este conteúdo possui proteção e não pode ser processado.';
  if (/unsupported URL/i.test(text)) return 'Esta URL não é suportada pelo mecanismo de download.';
  if (/unavailable|not available|404|removed/i.test(text)) return 'Conteúdo indisponível ou removido pela fonte.';
  if (/403|429|restricted|blocked/i.test(text)) return 'A fonte restringiu o acesso. Tente novamente mais tarde.';
  if (/network|resolve|connection|timed out|Tempo de resposta/i.test(text)) return 'Falha de conexão. Verifique a internet e tente novamente.';
  if (/setup:tools/i.test(text)) return 'Mecanismo ausente. Execute npm run setup:tools e reinicie o aplicativo.';
  return 'Não foi possível concluir. Verifique o arquivo ou a URL e consulte os detalhes.';
}
export class DownloadService extends EventEmitter {
  readonly media = new Map<string, Media>();
  private active = new Map<string, AbortController>();
  private reserved = new Set<string>();
  private stopped = false;
  constructor(private store: Store, private processes: ProcessService, private ffmpeg: FFmpegService, private history: HistoryService, private temp: string, private conflict: (file: string) => Promise<'replace' | 'copy' | 'cancel'>) { super(); }
  async analyze(raw: unknown): Promise<Media> {
    const url = validateUrl(raw);
    try {
      const output = await this.processes.run(crypto.randomUUID(), 'yt-dlp', ['--ignore-config', '--js-runtimes', `deno:${this.processes.executable('deno')}`, '--no-playlist', '--no-warnings', '--skip-download', '--dump-single-json', '--socket-timeout', '20', '--', url], undefined, undefined, 90000);
      const data = JSON.parse(output) as { title?: string; artist?: string; uploader?: string; duration?: number; thumbnail?: string; extractor_key?: string; abr?: number; release_year?: number; album?: string; is_live?: boolean; formats?: { abr?: number; acodec?: string }[] };
      if (data.is_live) throw new Error('Transmissões ao vivo não são suportadas. Aguarde a publicação do conteúdo.');
      const media: Media = { id: crypto.randomUUID(), url, title: data.title || 'Áudio', artist: data.artist || data.uploader || 'Artista desconhecido', source: data.extractor_key || new URL(url).hostname, duration: data.duration || 0, thumbnail: data.thumbnail?.startsWith('https://') ? data.thumbnail : undefined, bitrate: Math.max(0, ...(data.formats ?? []).filter(f => f.acodec && f.acodec !== 'none').map(f => f.abr || 0)) || data.abr, year: data.release_year?.toString(), album: data.album };
      this.remember(media); return media;
    } catch (error) { this.store.log(`Analyze: ${String(error)}`); throw new Error(/Transmissões/.test(String(error)) ? String(error).replace('Error: ', '') : friendlyError(error)); }
  }
  remember(media: Media) { if (this.media.size > 500) this.media.delete(this.media.keys().next().value!); this.media.set(media.id, media); }
  start(mediaId: string, quality: Quality, format: OutputFormat = 'mp3') {
    const media = this.media.get(mediaId); if (!media) throw new Error('Analise o link ou selecione o arquivo novamente.');
    const job: Job = { id: crypto.randomUUID(), media: structuredClone(media), quality, format, status: 'queued', progress: 0, createdAt: new Date().toISOString(), settings: structuredClone(this.store.data.settings) };
    this.store.data.jobs.unshift(job); this.store.save(); this.emit('change'); this.pump(); return job.id;
  }
  cancel(id: string) { const job = this.store.data.jobs.find(j => j.id === id); if (!job || ['completed', 'cancelled', 'error'].includes(job.status)) return; job.status = 'cancelled'; this.active.get(id)?.abort(); this.store.save(); this.emit('change'); }
  retry(id: string) {
    const job = this.store.data.jobs.find(j => j.id === id);
    if (!job || !['error', 'cancelled'].includes(job.status) || this.active.has(id)) throw new Error('Aguarde o encerramento da tarefa antes de tentar novamente.');
    Object.assign(job, { status: 'queued', error: undefined, details: undefined, progress: 0, downloaded: undefined, total: undefined, speed: undefined, eta: undefined, finishedAt: undefined, output: undefined });
    this.store.save(); this.emit('change'); this.pump();
  }
  pump() { if (this.stopped) return; for (const job of [...this.store.data.jobs].reverse()) { if (this.active.size >= this.store.data.settings.concurrent) break; if (job.status === 'queued') { const controller = new AbortController(); this.active.set(job.id, controller); void this.run(job, controller.signal).finally(() => { this.active.delete(job.id); this.emit('change'); this.pump(); }); } } }
  private update(job: Job, patch: Partial<Job>) { Object.assign(job, patch); this.emit('change'); }
  private async run(job: Job, signal: AbortSignal) {
    const format = job.format || 'mp3';
    const work = path.join(this.temp, job.id); let destination: string | undefined;
    try {
      this.update(job, { status: 'preparing' }); await fs.mkdir(work, { recursive: true }); await fs.mkdir(job.settings.downloadFolder, { recursive: true });
      await fs.access(job.settings.downloadFolder, constants.W_OK);
      const title = job.settings.originalTitle ? job.media.title : `Audio-${job.id.slice(0, 8)}`;
      let target = path.join(job.settings.downloadFolder, outputName(job.settings.filename, { ...job.media, title }, format));
      const exists = async (p: string) => { try { await fs.access(p); return true; } catch { return false; } };
      if (await exists(target) || this.reserved.has(target.toLowerCase())) {
        const choice = this.reserved.has(target.toLowerCase()) ? 'copy' : await this.conflict(target);
        if (choice === 'cancel') { this.update(job, { status: 'cancelled' }); return; }
        if (choice === 'copy') { const base = target.slice(0, -4); let i = 1; do { target = `${base} (${i++}).${format}`; } while (await exists(target) || this.reserved.has(target.toLowerCase())); }
      }
      // Recheck reservations after a native dialog, which allows other jobs to advance.
      if (this.reserved.has(target.toLowerCase())) { const base = target.slice(0, -4); let i = 1; do { target = `${base} (${i++}).${format}`; } while (await exists(target) || this.reserved.has(target.toLowerCase())); }
      destination = target; this.reserved.add(target.toLowerCase());
      signal.throwIfAborted();
      let input = job.media.localPath; let cover: string | undefined;
      if (!input) {
        this.update(job, { status: 'downloading', progress: 0 });
        const args = ['--ignore-config', '--js-runtimes', `deno:${this.processes.executable('deno')}`, '--no-playlist', '--no-warnings', '--newline', '--socket-timeout', '20', '--retries', '3', '--no-mtime', '--ffmpeg-location', path.dirname(this.processes.executable('ffmpeg')), '-f', 'bestaudio/best', '-o', path.join(work, 'source.%(ext)s'), '--progress-template', 'download:PROGRESS %(progress)j'];
        if (job.settings.cover && format === 'mp3') args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
        args.push('--', validateUrl(job.media.url));
        await this.processes.run(job.id, 'yt-dlp', args, line => {
          if (!line.startsWith('PROGRESS ')) return;
          try { const p = JSON.parse(line.slice(9)) as { downloaded_bytes?: number; total_bytes?: number; total_bytes_estimate?: number; speed?: number; eta?: number }; const total = p.total_bytes || p.total_bytes_estimate; this.update(job, { progress: total ? Math.min(100, (p.downloaded_bytes || 0) / total * 100) : 0, downloaded: p.downloaded_bytes, total, speed: p.speed, eta: p.eta }); } catch { /* Ignore non-JSON diagnostic lines. */ }
        }, signal);
        const files = await fs.readdir(work); input = files.filter(f => f.startsWith('source.') && !/\.(jpg|jpeg|png|webp|part|ytdl|json)$/i.test(f)).map(f => path.join(work, f))[0];
        cover = files.includes('source.jpg') ? path.join(work, 'source.jpg') : undefined;
        if (!input) throw new Error('O mecanismo não produziu um arquivo de áudio.');
      }
      signal.throwIfAborted(); this.update(job, { status: 'converting', progress: 0, speed: undefined, eta: undefined });
      const converted = path.join(work, `result.${format}`);
      await this.ffmpeg.convert(job.id, input, converted, job.media, job.quality, job.settings, percent => this.update(job, { progress: percent }), signal, cover, format);
      signal.throwIfAborted(); this.update(job, { status: 'metadata', progress: 100 });
      // Copy to a sibling before the final rename: incomplete outputs never appear as completed MP3s.
      const staging = target + '.' + job.id + '.tmp';
      try { await fs.copyFile(converted, staging); signal.throwIfAborted(); await fs.rename(staging, target); } finally { await fs.rm(staging, { force: true }).catch(() => {}); }
      this.update(job, { status: 'completed', output: target, finishedAt: new Date().toISOString(), progress: 100 }); this.history.add(job); this.emit('complete', job);
    } catch (error) {
      if (signal.aborted) this.update(job, { status: 'cancelled' });
      else { this.store.log(`Job ${job.id}: ${String(error)}`); this.update(job, { status: 'error', error: friendlyError(error), details: String(error).slice(-12000), finishedAt: new Date().toISOString() }); this.history.add(job); }
    } finally { if (destination) this.reserved.delete(destination.toLowerCase()); await fs.rm(work, { recursive: true, force: true }).catch(e => this.store.log(String(e))); this.store.save(); this.emit('change'); }
  }
  shutdown() { this.stopped = true; for (const controller of this.active.values()) controller.abort(); this.processes.stopAll(); this.store.save(); }
}

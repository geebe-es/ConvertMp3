import type { Media, Quality, Settings, OutputFormat } from '../../shared/types';
import { ProcessService } from './ProcessService';
import path from 'node:path';
export class FFmpegService {
  constructor(private processes: ProcessService) {}
  async probe(file: string): Promise<Media> {
    const result = await this.processes.run(crypto.randomUUID(), 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', file], undefined, undefined, 30000);
    const info = JSON.parse(result) as { format?: { duration?: string; tags?: Record<string, string> }; streams?: { index: number; codec_type: string; bit_rate?: string; disposition?: { attached_pic?: number } }[] };
    const audio = info.streams?.find(s => s.codec_type === 'audio'); if (!audio) throw new Error('Este arquivo não contém uma faixa de áudio.');
    const tags = info.format?.tags ?? {};
    return { id: crypto.randomUUID(), localPath: file, title: tags.title || path.basename(file, path.extname(file)), artist: tags.artist || 'Artista desconhecido', album: tags.album, year: tags.date, duration: Number(info.format?.duration) || 0, source: 'Arquivo local', bitrate: Number(audio.bit_rate) / 1000 || undefined, coverStream: info.streams?.find(s => s.disposition?.attached_pic === 1)?.index };
  }
  async convert(id: string, input: string, output: string, media: Media, quality: Quality, settings: Settings, progress: (percent: number) => void, signal: AbortSignal, cover?: string, format: OutputFormat = 'mp3') {
    if (format === 'wav') cover = undefined;
    const args = ['-hide_banner', '-nostdin', '-y', '-protocol_whitelist', 'file,pipe,crypto', '-i', input];
    if (cover) args.push('-i', cover);
    args.push('-map', '0:a:0');
    const localCover = format === 'mp3' && settings.cover && media.localPath && media.coverStream !== undefined;
    if (cover || localCover) args.push('-map', cover ? '1:v:0' : `0:${media.coverStream}`, '-c:v', 'mjpeg', '-disposition:v', 'attached_pic'); else args.push('-vn');
    if (format === 'wav') args.push('-c:a', 'pcm_s16le', '-rf64', 'auto', '-map_metadata', '-1');
    else args.push('-c:a', 'libmp3lame', ...(quality === 'best' ? ['-q:a', '0'] : ['-b:a', `${quality}k`]), '-map_metadata', '-1', '-id3v2_version', '3');
    if (settings.metadata) { args.push('-metadata', `title=${media.title}`, '-metadata', `artist=${media.artist}`, '-metadata', `album=${media.album || media.source}`); if (media.year) args.push('-metadata', `date=${media.year}`); }
    args.push('-progress', 'pipe:1', '-nostats', output);
    await this.processes.run(id, 'ffmpeg', args, line => { if (line.startsWith('out_time_us=')) progress(media.duration ? Math.min(99, Number(line.split('=')[1]) / (media.duration * 10000)) : 0); }, signal);
  }
}

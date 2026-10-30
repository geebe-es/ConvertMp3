import { z } from 'zod';
import path from 'node:path';
import type { OutputFormat } from '../../shared/types';
export const formatSchema = z.enum(['mp3', 'wav']).default('mp3');
export const qualitySchema = z.enum(['best', '320', '256', '192', '128']);
export const settingsSchema = z.object({ downloadFolder: z.string().min(1).max(1024), concurrent: z.number().int().min(1).max(5), quality: qualitySchema, filename: z.enum(['{title}.mp3', '{artist} - {title}.mp3', '{title} - {source}.mp3']), cover: z.boolean(), metadata: z.boolean(), originalTitle: z.boolean(), openFolder: z.boolean(), startWithWindows: z.boolean(), checkUpdates: z.boolean(), minimizeToTray: z.boolean(), theme: z.enum(['dark', 'light', 'system']), language: z.enum(['pt-BR', 'en']) }).strict();
export function validateUrl(value: unknown): string {
  const raw = z.string().max(4096).parse(value).trim();
  let url: URL; try { url = new URL(raw); } catch { throw new Error('URL inválida. Cole um endereço HTTP ou HTTPS completo.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname || /[\r\n\x00]/.test(raw)) throw new Error('URL inválida. Use HTTP ou HTTPS sem credenciais.');
  return url.href;
}
export function safeFilename(value: string): string {
  let name = value.normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 150).replace(/[. ]+$/g, '');
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) name = '_' + name;
  return name || 'Audio';
}
export function outputName(template: string, media: { title: string; artist: string; source: string }, format: OutputFormat = 'mp3'): string {
  return safeFilename(template.replace(/\{(title|artist|source)\}/g, (_, key: keyof typeof media) => media[key]).replace(/\.mp3$/i, '')) + '.' + format;
}
export function validLocalPath(value: unknown): string {
  const p = z.string().max(4096).parse(value);
  if (!path.isAbsolute(p) || !['.mp4', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.webm', '.mp3'].includes(path.extname(p).toLowerCase())) throw new Error('Formato de arquivo não suportado.');
  return path.normalize(p);
}

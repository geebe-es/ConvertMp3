import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

// Chromium needs byte-range responses to seek within a custom media protocol.
export async function audioResponse(file: string, request: Request): Promise<Response> {
  const { size } = await stat(file);
  const headers = new Headers({ 'Content-Type': path.extname(file).toLowerCase() === '.wav' ? 'audio/wav' : 'audio/mpeg', 'Accept-Ranges': 'bytes' });
  let start = 0;
  let end = size - 1;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () => new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
    if (!match || (!match[1] && !match[2])) return invalid();
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
      start = Math.max(0, size - suffix);
    } else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]), size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return invalid();
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  headers.set('Content-Length', String(Math.max(0, end - start + 1)));
  if (request.method === 'HEAD' || size === 0) return new Response(null, { status: range ? 206 : 200, headers });
  const stream = createReadStream(file, { start, end });
  const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}

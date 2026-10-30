import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { validateUrl, safeFilename, outputName, settingsSchema } from '../electron/services/validation';
import { Store } from '../electron/services/Store';
import { HistoryService } from '../electron/services/HistoryService';
import { ProcessService } from '../electron/services/ProcessService';
import { FFmpegService } from '../electron/services/FFmpegService';
import { DownloadService } from '../electron/services/DownloadService';
test('URL and Windows filename boundaries', () => {
  for (const url of ['file:///c:/x', 'javascript:alert(1)', 'https://user:secret@example.com', 'not a URL']) assert.throws(() => validateUrl(url));
  assert.equal(validateUrl(' https://example.com/audio.wav '), 'https://example.com/audio.wav');
  assert.equal(safeFilename('CON'), '_CON'); assert.equal(safeFilename('A/B:*?<>|'), 'A_B______');
  assert.equal(outputName('{artist} - {title}.mp3', { artist: '../a', title: 'NUL', source: 'x' }), '.._a - NUL.mp3');
  assert.throws(() => settingsSchema.parse({ concurrent: 6 }));
});
test('retry immediately publishes a clean queued state and persists it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'convertmp3-retry-'));
  try {
    const store = new Store(dir, dir);
    const processes = new ProcessService(path.resolve('resources/bin'));
    const service = new DownloadService(store, processes, new FFmpegService(processes), new HistoryService(store), path.join(dir, 'tmp'), async () => 'copy');
    // Hold the scheduler so this exercises a retry waiting for an available worker.
    service.shutdown();
    service.remember({ id: 'fixture', title: 'Retry', artist: 'Test', source: 'local', duration: 3 });
    const id = service.start('fixture', '192');
    const job = store.data.jobs.find(item => item.id === id)!;
    Object.assign(job, { status: 'error', error: 'failed', details: 'old failure', progress: 70, downloaded: 100, total: 200, speed: 10, eta: 10, finishedAt: new Date().toISOString() });
    let changes = 0;
    service.on('change', () => { changes++; assert.equal(job.status, 'queued'); });
    service.retry(id);
    assert.equal(changes, 1);
    assert.equal(job.progress, 0);
    for (const key of ['error', 'details', 'downloaded', 'total', 'speed', 'eta', 'finishedAt'] as const) assert.equal(job[key], undefined);
    const restored = new Store(dir, dir);
    assert.equal(restored.data.jobs[0].status, 'queued');
    assert.equal(restored.data.jobs[0].finishedAt, undefined);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('cancelling a running process does not terminate another task', { timeout: 15000 }, async () => {
  const processes = new ProcessService(path.resolve('resources/bin')); const controller = new AbortController();
  const cancelled = processes.run('cancel-target', 'ffmpeg', ['-re', '-f', 'lavfi', '-i', 'sine=duration=10', '-f', 'null', '-'], undefined, controller.signal);
  const survives = processes.run('other-task', 'ffmpeg', ['-re', '-f', 'lavfi', '-i', 'sine=duration=2', '-f', 'null', '-']);
  setTimeout(() => controller.abort(), 200);
  await assert.rejects(cancelled, /Cancelado/); await survives;
});
test('real conversion, URL download, queue, duplicate, cancellation, history and persistence', { timeout: 120000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'convertmp3-test-'));
  const processes = new ProcessService(path.resolve('resources/bin')); const ffmpeg = new FFmpegService(processes);
  let service: DownloadService | undefined;
  const server = createServer(async (_req, res) => { const data = await fs.readFile(path.join(dir, 'tone.wav')); res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': data.length }); res.end(data); });
  try {
    await processes.run('fixture', 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-metadata', 'title=Test Tone', path.join(dir, 'tone.wav')]);
    const store = new Store(path.join(dir, 'data'), dir); store.data.settings.concurrent = 1;
    const history = new HistoryService(store); service = new DownloadService(store, processes, ffmpeg, history, path.join(dir, 'tmp'), async () => 'copy');
    const media = await ffmpeg.probe(path.join(dir, 'tone.wav')); service.remember(media);
    const first = service.start(media.id, '192'); const second = service.start(media.id, '128'); const cancel = service.start(media.id, 'best'); service.cancel(cancel);
    const wait = async (id: string) => { for (let i = 0; i < 600; i++) { const job = store.data.jobs.find(j => j.id === id)!; if (['completed', 'error', 'cancelled'].includes(job.status)) return job; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Timeout waiting for job'); };
    const a = await wait(first); const b = await wait(second); assert.equal(a.status, 'completed', a.details); assert.equal(b.status, 'completed', b.details); assert.match(b.output!, /\(1\)\.mp3$/); assert.equal((await wait(cancel)).status, 'cancelled');
    const checked = await ffmpeg.probe(a.output!); assert.equal(checked.title, 'Test Tone'); assert.ok(checked.duration > 2.9); assert.equal(Math.round(checked.bitrate!), 192);
    const withCover = path.join(dir, 'with-cover.mp3'); const preserved = path.join(dir, 'preserved-cover.mp3');
    await processes.run('cover-fixture', 'ffmpeg', ['-y', '-i', a.output!, '-i', path.resolve('resources/icon.png'), '-map', '0:a', '-map', '1:v', '-c:a', 'copy', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', withCover]);
    const covered = await ffmpeg.probe(withCover); assert.notEqual(covered.coverStream, undefined);
    await ffmpeg.convert('cover-test', withCover, preserved, covered, 'best', store.data.settings, () => {}, new AbortController().signal);
    assert.notEqual((await ffmpeg.probe(preserved)).coverStream, undefined);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const addr = server.address(); assert.ok(addr && typeof addr !== 'string');
    const remote = await service.analyze(`http://127.0.0.1:${addr.port}/tone.wav`); const online = await wait(service.start(remote.id, 'best')); assert.equal(online.status, 'completed', online.details);
    assert.equal(history.get().length, 3); const restored = new Store(path.join(dir, 'data'), dir); assert.equal(restored.data.history.length, 3);
    history.remove(a.id); assert.equal(history.get().length, 2); assert.ok((await fs.stat(a.output!)).size > 1000);
    service.remember(covered);
    const wave = await wait(service.start(covered.id, 'best', 'wav'));
    assert.equal(wave.status, 'completed', wave.details);
    assert.match(wave.output!, /\.wav$/);
    const waveInfo = JSON.parse(await processes.run('probe-wave', 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', wave.output!]));
    assert.equal(waveInfo.streams[0].codec_name, 'pcm_s16le');
    assert.equal(waveInfo.streams.length, 1);
    assert.equal(waveInfo.format.tags.title, covered.title);
    const duplicateWave = await wait(service.start(covered.id, '128', 'wav'));
    assert.equal(duplicateWave.status, 'completed', duplicateWave.details);
    assert.match(duplicateWave.output!, /\(1\)\.wav$/);
    const remoteWave = await wait(service.start(remote.id, 'best', 'wav'));
    assert.equal(remoteWave.status, 'completed', remoteWave.details);
    assert.match(remoteWave.output!, /\.wav$/);
    const restoredWave = new Store(path.join(dir, 'data'), dir).data.jobs.find(j => j.id === wave.id);
    assert.equal(restoredWave?.format, 'wav');
  } finally { service?.shutdown(); processes.stopAll(); server.close(); await fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { audioResponse } from '../electron/services/MediaService';

test('audio serves complete files and byte ranges for seeking', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'convertmp3-media-'));
  try {
    const file = path.join(dir, 'audio.mp3');
    await fs.writeFile(file, '0123456789');
    for (const [range, expected, contentRange] of [
      ['bytes=3-6', '3456', 'bytes 3-6/10'],
      ['bytes=7-', '789', 'bytes 7-9/10'],
      ['bytes=-2', '89', 'bytes 8-9/10'],
      ['bytes=8-100', '89', 'bytes 8-9/10'],
    ]) {
      const response = await audioResponse(file, new Request('https://audio/test', { headers: { range } }));
      assert.equal(response.status, 206);
      assert.equal(response.headers.get('content-range'), contentRange);
      assert.equal(response.headers.get('content-length'), String(expected.length));
      assert.equal(await response.text(), expected);
    }
    const full = await audioResponse(file, new Request('https://audio/test'));
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    assert.equal(await full.text(), '0123456789');
    for (const range of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5']) {
      const response = await audioResponse(file, new Request('https://audio/test', { headers: { range } }));
      assert.equal(response.status, 416);
      assert.equal(response.headers.get('content-range'), 'bytes */10');
    }
    const head = await audioResponse(file, new Request('https://audio/test', { method: 'HEAD' }));
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

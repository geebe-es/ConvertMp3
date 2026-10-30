import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
export class ProcessService {
  private children = new Map<string, ChildProcess>();
  constructor(private bin: string) {}
  executable(name: string) { const file = path.join(this.bin, name + (process.platform === 'win32' ? '.exe' : '')); return fs.existsSync(file) ? file : name; }
  async available(name: string) { try { await this.run(crypto.randomUUID(), name, [name === 'yt-dlp' ? '--version' : '-version'], undefined, undefined, 10000); return true; } catch { return false; } }
  run(id: string, name: string, args: string[], onLine?: (line: string) => void, signal?: AbortSignal, timeout = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new Error('Cancelado')); return; }
      const child = spawn(this.executable(name), args, { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
      this.children.set(id, child); let output = '', errors = '', pending = ''; let timedOut = false;
      const stop = () => this.cancel(id); signal?.addEventListener('abort', stop, { once: true });
      const timer = timeout ? setTimeout(() => { timedOut = true; stop(); }, timeout) : undefined;
      child.stdout?.on('data', (chunk: Buffer) => { const text = chunk.toString(); output = (output + text).slice(-8_000_000); pending += text; const lines = pending.split(/\r?\n/); pending = lines.pop() ?? ''; for (const line of lines) onLine?.(line); });
      child.stderr?.on('data', (chunk: Buffer) => { errors = (errors + chunk.toString()).slice(-12000); });
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); if (this.children.get(id) === child) this.children.delete(id); };
      child.on('error', error => { cleanup(); reject(new Error(`Não foi possível iniciar ${name}. Execute npm run setup:tools. ${error.message}`)); });
      child.on('close', code => { cleanup(); if (signal?.aborted) reject(new Error('Cancelado')); else if (timedOut) reject(new Error('Tempo de resposta esgotado. Verifique a conexão.')); else if (code === 0) resolve(output); else reject(new Error(errors || `${name} terminou com código ${code}`)); });
    });
  }
  cancel(id: string) { const child = this.children.get(id); if (!child?.pid) return; if (process.platform === 'win32') { const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false }); killer.on('error', () => child.kill()); } else child.kill('SIGTERM'); }
  stopAll() { for (const id of this.children.keys()) this.cancel(id); }
}

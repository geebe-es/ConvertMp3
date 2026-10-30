export const qualities = ['best', '320', '256', '192', '128'] as const;
export type OutputFormat = 'mp3' | 'wav';
export type Quality = typeof qualities[number];
export type Page = 'home' | 'downloads' | 'history' | 'converter' | 'settings' | 'about';
export interface Media { id: string; url?: string; localPath?: string; title: string; artist: string; source: string; duration: number; thumbnail?: string; bitrate?: number; year?: string; album?: string; coverStream?: number }
export type JobStatus = 'queued' | 'preparing' | 'downloading' | 'converting' | 'metadata' | 'completed' | 'error' | 'cancelled';
export interface Job { format?: OutputFormat; id: string; media: Media; quality: Quality; status: JobStatus; progress: number; createdAt: string; finishedAt?: string; output?: string; speed?: number; downloaded?: number; total?: number; eta?: number; error?: string; details?: string; settings: Settings }
export interface Settings { downloadFolder: string; concurrent: number; quality: Quality; filename: '{title}.mp3' | '{artist} - {title}.mp3' | '{title} - {source}.mp3'; cover: boolean; metadata: boolean; originalTitle: boolean; openFolder: boolean; startWithWindows: boolean; checkUpdates: boolean; minimizeToTray: boolean; theme: 'dark' | 'light' | 'system'; language: 'pt-BR' | 'en' }
export interface UpdateState { status: 'unconfigured' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'; version?: string; progress?: number; message?: string }
export interface Snapshot { ready: boolean; settings: Settings; jobs: Job[]; history: Job[]; tools: { ffmpeg: boolean; ytdlp: boolean }; update: UpdateState; version: string }
export interface DesktopAPI {
  snapshot(): Promise<Snapshot>; analyze(url: string): Promise<Media>; start(id: string, quality: Quality, format?: OutputFormat): Promise<string>;
  cancel(id: string): Promise<void>; retry(id: string): Promise<void>; selectFiles(): Promise<Media[]>; importFiles(files: File[]): Promise<Media[]>;
  settings(settings: Settings): Promise<Settings>; selectFolder(): Promise<string | null>; openFile(id: string): Promise<void>; openFolder(id?: string): Promise<void>;
  removeHistory(id: string): Promise<void>; clearHistory(): Promise<void>; logs(): Promise<void>;
  window(action: 'minimize' | 'maximize' | 'close'): Promise<void>; checkUpdate(): Promise<UpdateState>; installUpdate(): Promise<void>; licenses(): Promise<void>;
  onState(callback: (state: Snapshot) => void): () => void; onNavigate(callback: (page: Page) => void): () => void;
}

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Snapshot, Job, Page } from '../../shared/types';
import { errorText } from '../utils/format';
import { translations } from '../utils/i18n';
import { StartupScreen } from '../components/StartupScreen';
interface Context { state: Snapshot; page: Page; navigate: (page: Page) => void; play: (job: Job) => void; playing?: Job; notify: (message: string) => void; run: <T>(work: () => Promise<T>) => Promise<T | undefined>; t: (text: string) => string }
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Snapshot>(); const [page, navigate] = useState<Page>('home'); const [playing, play] = useState<Job>(); const [toast, setToast] = useState(''); const [error, setError] = useState('');
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setIntroDone(true), 1600); return () => clearTimeout(timer); }, []);
  const notify = useCallback((message: string) => setToast(message), []);
  const run = useCallback(async <T,>(work: () => Promise<T>) => { try { return await work(); } catch (e) { notify(errorText(e)); } }, [notify]);
  useEffect(() => { if (!window.desktop) { setError('Abra o ConvertMp3 pelo Electron: npm run dev.'); return; } const stop = window.desktop.onState(setState); const nav = window.desktop.onNavigate(navigate); void window.desktop.snapshot().then(setState).catch(e => setError(errorText(e))); return () => { stop(); nav(); }; }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!state) return; const media = matchMedia('(prefers-color-scheme: light)'); const apply = () => { document.documentElement.dataset.theme = state.settings.theme === 'system' ? media.matches ? 'light' : 'dark' : state.settings.theme; document.documentElement.lang = state.settings.language; }; apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [state?.settings.theme, state?.settings.language]);
  if (!state || !state.ready || !introDone) return <StartupScreen error={error} language={state?.settings.language} version={state?.version}/>;
  const t = (text: string) => state.settings.language === 'en' ? translations[text] || text : text;
  return <AppContext.Provider value={{ state, page, navigate, playing, play, notify, run, t }}>{children}{toast && <div role="status" className="toast" onClick={() => setToast('')}>{toast}<span>×</span></div>}</AppContext.Provider>;
}
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error('AppProvider ausente'); return context; }

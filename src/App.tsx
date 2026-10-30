import { TitleBar, Sidebar } from './components/Chrome';
import { AudioPlayer } from './components/AudioPlayer';
import { useApp } from './contexts/AppContext';
import { Home } from './pages/Home';
import { Downloads } from './pages/Downloads';
import { History } from './pages/History';
import { Converter } from './pages/Converter';
import { Settings } from './pages/Settings';
import { About } from './pages/About';
const pages = { home: Home, downloads: Downloads, history: History, converter: Converter, settings: Settings, about: About };
export default function App() { const { page } = useApp(); const Page = pages[page]; return <div className="app-shell"><TitleBar/><div className="workspace"><Sidebar/><main key={page}><Page/></main></div><AudioPlayer/></div>; }

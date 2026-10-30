import logo from '../assets/logo.svg';

export function StartupScreen({ error, language, version }: { error?: string; language?: string; version?: string }) {
  const english = language === 'en';
  return <div className="startup-screen" data-testid="startup-screen">
    <div className="startup-drag"/>
    <button className="startup-close" aria-label={english ? 'Close' : 'Fechar'} onClick={() => void window.desktop?.window('close')}>×</button>
    <section className="startup-content">
      <div className="startup-logo"><img src={logo} alt=""/></div>
      <h1>Convert<span>Mp3</span></h1>
      <p>{english ? 'Your audio. Your way.' : 'Seu áudio. Do seu jeito.'}</p>
      <div className="startup-status" role={error ? 'alert' : 'status'} aria-live="polite">
        {!error && <div className="startup-progress" aria-hidden="true"><span/></div>}
        <span>{error || (english ? 'Loading your audio space…' : 'Carregando seu espaço de áudio…')}</span>
      </div>
      {error && <button onClick={() => window.location.reload()}>{english ? 'Try again' : 'Tentar novamente'}</button>}
    </section>
    <small className="startup-version">{version ? `v${version}` : 'ConvertMp3'}</small>
  </div>;
}

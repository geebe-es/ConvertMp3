# ConvertMp3

Aplicativo desktop para Windows, feito com Electron, React, TypeScript, Vite e Tailwind CSS. Interface em português e inglês, temas escuro/claro/sistema, download por yt-dlp e processamento local por FFmpeg.

## Primeira execução

Requisitos: Windows 10/11 **x64**, Node.js 22.12+ (testado com 24.21), npm e acesso à internet para obter dependências e mecanismos. O usuário final do instalador não precisa instalar Node, Python, FFmpeg ou yt-dlp.

No PowerShell:

```powershell
cd D:\APPS\ConvertMP3
npm.cmd install
node node_modules/electron/install.js
npm.cmd run assets
npm.cmd run setup:tools
npm.cmd run dev
```

`npm.cmd` evita o bloqueio de `npm.ps1` pela política de scripts do PowerShell, sem alterar essa política. Em terminais que permitem o atalho, `npm` funciona igualmente. A chamada explícita a `electron/install.js` assegura o download do Electron quando a versão/configuração do npm bloqueia scripts de instalação.

Todos os arquivos completos estão no projeto; não há partes omitidas ou APIs fictícias. Os assets já estão gerados. O comando `assets` os regenera a partir do desenho vetorial próprio.

## Uso

Na análise de links e no conversor local, escolha **MP3** ou **WAV (Wave)** no seletor de formato de saída. WAV usa PCM de 16 bits sem compressão, preservando a taxa de amostragem e os canais da fonte. Os arquivos costumam ser maiores que MP3; capas não são embutidas em WAV. O player e o histórico aceitam ambos os formatos. A extensão de saída é ajustada automaticamente ao formato escolhido, inclusive nos padrões de nome das configurações.

1. Cole uma URL HTTP/HTTPS de um conteúdo que você tem autorização para baixar.
2. Clique em **ANALISAR**. Após a consulta real, confira título, origem, duração e bitrate quando disponíveis.
3. Selecione a qualidade e clique em **BAIXAR MP3**.
4. Acompanhe a fila. Ao concluir, reproduza no player, abra o arquivo ou a pasta.

O conversor aceita seleção nativa ou arrastar arquivos MP4, M4A, WAV, FLAC, AAC, OGG, WEBM e MP3. A conversão ocorre em processos filhos, sem bloquear a interface. Os arquivos originais são preservados, exceto quando o próprio usuário escolhe substituir um destino já existente.

**Melhor disponível** seleciona `bestaudio/best` e codifica MP3 VBR com `libmp3lame -q:a 0`. As opções de 128 a 320 kbps usam bitrate constante. Nenhuma dessas opções recupera informação perdida na fonte. A qualidade final depende do áudio original.

## Recursos implementados

- Janela sem moldura, controles nativos, sidebar e identidade original.
- Análise real via yt-dlp, progresso com bytes, velocidade e estimativa quando a fonte os fornece.
- Fila FIFO com 1–5 tarefas simultâneas (padrão 2), cancelamento por tarefa, repetição após falha.
- MP3 com metadados e capa remota quando disponibilizada pelo extrator.
- Arquivos duplicados: diálogo nativo para criar cópia, substituir ou cancelar.
- Histórico persistente, busca, filtros por calendário, remoção de registros e limpeza com confirmação.
- Player interno com play/pause, busca temporal e volume, usando protocolo restrito aos MP3s conhecidos pelo aplicativo.
- Conversão local, seleção múltipla e drag-and-drop.
- Configurações persistentes, pasta nativa, padrões de nome, temas e idioma.
- Bandeja do Windows, contagem de tarefas, notificações e inicialização com Windows na versão instalada.
- Logs técnicos separados das mensagens de erro e serviço preparado para atualizações reais.

Pausa não é oferecida: a combinação de fontes remotas e conversão por FFmpeg não permite uma pausa/retomada confiável comum a todas as tarefas. Cancelar e tentar novamente estão disponíveis. Playlists são desativadas; a análise trata um item por vez. Transmissões ao vivo são recusadas. Capas marcadas como `attached_pic` em arquivos locais são preservadas quando a opção de capa está ativa; título/artista/álbum/ano são lidos quando presentes.

## Scripts

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Compila Main/Preload, inicia Vite e abre Electron |
| `npm run typecheck` | Verifica TypeScript estrito |
| `npm run build` | Verifica tipos e gera `dist` e `dist-electron` |
| `npm start` | Abre o build local |
| `npm test` | Testes de validação e integração com mecanismos reais |
| `npm run test:desktop` | Testa o build com Electron/Playwright e captura telas |
| `npm run assets` | Gera SVG, PNG transparente e ICO |
| `npm run setup:tools` | Obtém yt-dlp, FFmpeg, ffprobe e Deno para Windows x64 |
| `npm run dist` / `npm run dist:win` | Gera instalador NSIS e executável portátil |

Vite recarrega o renderer durante o desenvolvimento. Após alterar arquivos de `electron/`, reinicie `npm run dev`.

## Instalador e portátil

```powershell
npm.cmd run dist:win
```

Arquivos gerados:

```text
release/ConvertMp3-Setup.exe
release/ConvertMp3-Portable.exe
release/win-unpacked/ConvertMp3.exe
```

O instalador é por máquina, pede elevação, permite escolher o destino (normalmente `C:\Program Files\ConvertMp3`), cria atalhos no desktop/menu Iniciar e inclui desinstalador. O portátil extrai o aplicativo ao executar; preferências continuam no perfil do usuário. Ambos incluem os mecanismos em `resources/bin`.

O build local não possui assinatura digital: configure um certificado real no fluxo de publicação antes de distribuir comercialmente. SmartScreen pode alertar sobre um executável sem assinatura. A edição do ícone e dos metadados do executável permanece habilitada.

## Estrutura

```text
electron/
  main.ts                 janela, bandeja, protocolo de áudio e handlers IPC
  preload.ts              API explícita via contextBridge
  services/
    DownloadService.ts    análise, fila, estados, download e finalização
    FFmpegService.ts      probe, conversão, bitrate e metadados
    ProcessService.ts     processos sem shell, timeout e cancelamento
    HistoryService.ts     registros concluídos e falhas
    SettingsService.ts    validação e persistência de preferências
    Store.ts              JSON com gravação temporária/rename e logs
    UpdateService.ts      integração desacoplada com electron-updater
    validation.ts         esquemas de entrada, nomes e URLs
shared/types.ts           contrato tipado Main/Preload/Renderer
src/
  components/             chrome, cards, player, modal e componentes comuns
  contexts/               estado global, navegação, idioma e toasts
  hooks/                  estado de tarefas assíncronas
  pages/                  Home, Downloads, History, Converter, Settings, About
  utils/                  formatação e traduções
  assets/                 símbolo vetorial
resources/
  bin/                    binários para distribuição
  licenses/               avisos, origem dos mecanismos e licenças
  icon.ico, icon.png, logo.svg, logo-full.svg, logo-transparent.png
scripts/                  build, desenvolvimento, assets, setup e smoke test
tests/                    testes automatizados
```

## Armazenamento e segurança

- Configurações, histórico e fila: `%APPDATA%\convertmp3\state.json` (o nome pode aparecer como ConvertMp3 na versão instalada).
- Logs: `logs/app.log` dentro da pasta de dados acima; botão **Abrir logs** em Configurações.
- Temporários: `temp/<id-da-tarefa>` na pasta de dados. São removidos ao finalizar a tarefa.
- Downloads padrão: pasta Música do Windows, subpasta `ConvertMp3`.
- Testes desktop usam `.test-data/`, sem alterar preferências do usuário.

Fila aguardando é retomada ao iniciar. Tarefas interrompidas em processamento são marcadas como erro e podem ser repetidas. JSON inválido é preservado com sufixo `.corrupt-*`. O histórico retém até 3.000 registros.

`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, CSP, bloqueio de navegação/janelas externas e permissões negadas por padrão. O preload expõe somente operações do aplicativo, sem shell, Node ou canal IPC arbitrário. O Main valida remetente/frame e argumentos. Abertura e reprodução recebem IDs conhecidos, não caminhos arbitrários. Pastas novas são autorizadas pelo seletor nativo. Processos usam `spawn` com arrays e `shell: false`. A configuração externa de yt-dlp é ignorada; não são usados cookies, autenticação, opções de DRM ou comandos fornecidos pelo usuário.

## FFmpeg e yt-dlp

O setup consulta releases oficiais, verifica SHA-256 de yt-dlp e o digest de assets de FFmpeg/Deno quando publicado pelo GitHub. FFmpeg é a compilação `win64-lgpl` do projeto BtbN. Versões, hashes e origens ficam em `resources/licenses`. Deno é incluído porque a integração atual de YouTube no yt-dlp precisa de runtime JavaScript; os componentes EJS vêm no executável oficial do yt-dlp. Nenhum endpoint comercial ou chave de API é necessário.

Os extratores dependem das plataformas: mudanças, restrições regionais, limites de acesso e conteúdos indisponíveis podem impedir a obtenção. A interface apresenta erro apropriado; não tenta contornar autenticação ou DRM. A validação automatizada usa mídia gerada localmente e uma URL HTTP local; ela não comprova disponibilidade contínua de YouTube/SoundCloud.

Para atualizar mecanismos, feche o aplicativo, execute `npm run setup:tools`, teste e gere um novo instalador. Para builds reproduzíveis, conserve os binários e seus hashes junto do lockfile; o setup explicitamente busca as versões mais recentes e pode mudar seu resultado com o tempo.

## Atualizações do aplicativo

`UpdateService` usa `electron-updater`, sem servidor fictício. Por padrão a interface informa **Servidor de atualizações ainda não configurado**.

Ao existir infraestrutura real:

1. Configure `build.publish` no `package.json` com o provedor/repositório ou feed HTTPS real.
2. Publique os artefatos gerados pelo electron-builder, inclusive `latest.yml` e blockmaps, nesse destino.
3. Configure `CONVERTMP3_UPDATE_URL` com o endereço HTTPS real do feed generic no ambiente de execução, ou substitua a leitura dessa variável por uma constante controlada no build em `UpdateService.ts`.
4. Configure assinatura de código e valide instalação/atualização em uma VM Windows antes de publicar.

O serviço só ativa a consulta em builds empacotados com feed HTTPS configurado. O usuário vê a versão disponível, acompanha o download e confirma reinício/instalação. Atualizações não foram exercitadas contra um servidor, pois ele não foi fornecido.

## Testes e manutenção

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:desktop
npm.cmd audit
```

Os testes de serviços geram WAV por FFmpeg e verificam MP3 real, bitrate, metadados, URL direta, fila, cópia de duplicado, cancelamento na fila e persistência. O smoke test abre Electron real, testa isolamento do renderer, conversão pelo seletor, reprodução do MP3, confirmação de histórico, idioma, tema e estado de atualização. Capturas ficam em `test-results/`.

Atualize dependências com `npm outdated`, aplique as versões desejadas com `npm install`, execute a auditoria e repita esses testes. O `package-lock.json` deve acompanhar o código. O instalador gerado deve passar também por teste manual de instalação/desinstalação, atalhos e atualização numa VM limpa.

## Solução de problemas

- **Mecanismo ausente:** execute `npm run setup:tools` e reinicie. Verifique antivírus/quarentena e `resources/bin`.
- **Electron não instalado corretamente:** `node node_modules/electron/install.js`.
- **Falha de download:** confirme URL, conexão e acesso público autorizado. Consulte **Ver detalhes** e atualize yt-dlp.
- **Falha de FFmpeg:** confirme uma faixa de áudio no arquivo e consulte o log. Arquivos inválidos ou corrompidos podem ser recusados.
- **Disco/permissão:** altere a pasta nas configurações, libere espaço e repita a tarefa.
- **Arquivo movido:** o histórico preserva o caminho original; restaure o arquivo para reproduzir/abrir.
- **Janela sumiu ao fechar:** abra pelo ícone da bandeja. Use **Sair** na bandeja para encerrar; desative a opção nas configurações se preferir.
- **GitHub limitou o setup:** aguarde e tente novamente; o setup usa endpoints públicos, sem credenciais.
- **Build NSIS / extração de ferramentas:** verifique acesso de escrita à pasta do projeto e ao cache do electron-builder. Não desative verificações de segurança do aplicativo.

## Documentação técnica consultada

- [Electron: isolamento de contexto](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron: segurança](https://www.electronjs.org/docs/latest/tutorial/security)
- [Vite: instalação](https://vite.dev/guide/)
- [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite)
- [yt-dlp: opções oficiais](https://github.com/yt-dlp/yt-dlp#usage-and-options)
- [yt-dlp: runtime JavaScript/EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [FFmpeg: conversão, mapeamento e metadados](https://ffmpeg.org/ffmpeg.html)
- [electron-builder: NSIS](https://www.electron.build/nsis/)
- [electron-builder: atualização](https://www.electron.build/auto-update.html)

Use somente conteúdos para os quais você possui direitos ou autorização.

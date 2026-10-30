# Componentes de terceiros

O código próprio do ConvertMp3 está sob MIT. Componentes de terceiros preservam suas licenças.

| Componente | Projeto / licença |
| --- | --- |
| Electron | https://github.com/electron/electron — MIT e licenças de Chromium/Node |
| React | https://github.com/facebook/react — MIT |
| Vite | https://github.com/vitejs/vite — MIT |
| TypeScript | https://github.com/microsoft/TypeScript — Apache-2.0 |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss — MIT |
| Lucide | https://github.com/lucide-icons/lucide — ISC |
| Zod | https://github.com/colinhacks/zod — MIT |
| electron-builder / electron-updater | https://github.com/electron-userland/electron-builder — MIT |
| yt-dlp | https://github.com/yt-dlp/yt-dlp — Unlicense no código próprio; a distribuição executável inclui componentes sob outras licenças |
| FFmpeg | https://ffmpeg.org/legal.html — compilação LGPL obtida de BtbN/FFmpeg-Builds |
| Deno | https://github.com/denoland/deno — MIT e licenças de terceiros |

`npm run setup:tools` preserva informações da distribuição FFmpeg, licenças e URLs das versões em `resources/licenses`. O instalador inclui essa pasta, acessível pela tela Sobre. Electron inclui seus arquivos LICENSE e LICENSES.chromium.html na distribuição.

Antes de redistribuir comercialmente, preserve os avisos e disponibilize o código-fonte correspondente às versões binárias e aos componentes incorporados, conforme as respectivas licenças. O uso da compilação LGPL não transforma dependências de terceiros em MIT. Consulte os registros de origem e hashes em `tool-sources.json` e `deno-source.json`.

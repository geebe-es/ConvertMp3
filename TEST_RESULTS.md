# Validação — ConvertMp3 1.0.3

Revalidada em 02/10/2026, Windows x64 (build 26300) e Electron 44.4.5.

## Resultados

- `npm run build`: aprovado; TypeScript estrito, renderer Vite, Main e Preload compilados.
- `npm test`: **5 testes aprovados**, sem falhas na execução final.
  - Protocolo de áudio com respostas parciais (206), intervalos abertos/sufixos, intervalos inválidos (416) e leitura completa.
  - Repetição de tarefa publica imediatamente o estado de fila, limpa o progresso anterior e persiste o estado correto.
  - Validação de protocolos/credenciais em URLs e nomes reservados/inválidos do Windows.
  - Cancelamento de processo ativo preservando outra tarefa em execução.
  - FFmpeg e yt-dlp reais: geração de WAV, MP3 a 192/128 kbps, duração e título, capa embutida preservada, cópia de duplicado, fila sequencial, cancelamento na fila, download HTTP local, histórico e persistência.
- `npm run test:desktop`: aprovado em Electron de desenvolvimento compilado.
  - Seleção de WAV no conversor, saída `.wav`, reprodução e avanço com áudio pausado.
  - Testes de serviços ampliados: WAV PCM de 16 bits, metadados, descarte de capa incompatível, duplicados, download HTTP e persistência do formato.
  - Tela inicial com logo e carregamento, seguida de transição automática após a preparação dos mecanismos.
- `CONVERTMP3_TEST_EXE=release/win-unpacked/ConvertMp3.exe` com `npm run test:desktop`: aprovado no **executável empacotado**, usando os mecanismos distribuídos.
  - Renderer sem `window.require`.
  - Conversão pelo seletor de arquivos e exibição de conclusão.
  - Player reproduzindo o MP3 real pelo protocolo interno.
  - Avanço pela barra com áudio pausado, retrocesso durante a reprodução e arraste da barra, usando áudio de 30 segundos, também no executável empacotado. O teste reproduziu o travamento antes da correção do protocolo.
  - Confirmação de limpeza do histórico preserva dados ao cancelar.
  - Configurações, idioma inglês, tema claro e mensagem de atualização não configurada.
  - Nenhum erro JavaScript capturado na página durante o fluxo.
- `npm run dist:win`: instalador NSIS e portátil gerados com sucesso.
- `npm audit`: **0 vulnerabilidades reportadas** na validação anterior de 29/09/2026; auditoria não repetida nesta revisão.

A primeira execução desta revisão excedeu o limite de 15 segundos no teste de cancelamento de processo. A repetição completa passou, com esse teste concluído em aproximadamente 1,6 segundo, sem alterar seu limite.

## Evidências

- `test-results/home.png`
- `test-results/startup.png`
- `test-results/downloads.png`
- `test-results/settings.png`
- `test-results/settings-light.png`

## Limites da validação

- Não foi instalado/desinstalado o produto no perfil do usuário; recomenda-se teste de instalação, atalhos, elevação e desinstalação em VM limpa antes da distribuição.
- Download testado com URL direta servindo mídia gerada pelo teste. Links reais de YouTube/SoundCloud não foram usados; disponibilidade depende das fontes e de seus extratores.
- Não há servidor de atualização fornecido nem certificado de assinatura. Os binários não estão assinados; o fluxo de atualização remota não foi exercitado.
- Não foi feita uma matriz de hardware/versões do Windows nem teste de carga prolongado.

Os dados de teste estão isolados em `.test-data`; arquivos temporários dos testes de serviço são removidos ao finalizar.

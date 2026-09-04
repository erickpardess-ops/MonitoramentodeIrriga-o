# Monitoramento de Irrigação — Cacau & Coco

App offline (PWA) para monitoramento de irrigação nas culturas de cacau e coco,
com envio dos dados para o Google Sheets quando houver internet.

## O que tem nesta pasta

```
index.html            → o app (abre offline, funciona sozinho)
manifest.json          → identidade do app (nome, ícone, cores) — necessário para instalar como app e gerar o APK
service-worker.js      → deixa o app instalável e funcionando 100% offline depois da primeira visita
icons/                 → ícones do app em vários tamanhos (para instalação e para o APK)
Code.gs                → script para colar no Google Apps Script (recebe os dados e grava no Google Sheets)
```

## Passo 1 — Colocar o app no ar (GitHub Pages)

1. Crie um repositório novo no GitHub (ex.: `monitoramento-irrigacao`).
2. Envie **todos os arquivos desta pasta** para a raiz do repositório
   (`index.html`, `manifest.json`, `service-worker.js` e a pasta `icons/` inteira).
   Não precisa subir o `Code.gs` nem o `README.md` para funcionar, mas não tem problema deixá-los.
3. No repositório: **Settings → Pages → Branch: main → Save**.
4. Em alguns minutos o GitHub te dá um link tipo:
   `https://seu-usuario.github.io/monitoramento-irrigacao/`
5. Abra esse link no celular — o navegador vai oferecer **"Adicionar à tela inicial" / "Instalar app"**.
   A partir daí o app funciona offline normalmente, do jeito que já estava.

## Passo 2 — Ligar ao Google Sheets

1. Crie uma Planilha Google nova (pode ser em branco) — é nela que os dados vão cair.
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo padrão e cole o conteúdo do arquivo `Code.gs`.
4. Clique em **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Autorize as permissões pedidas (é a sua própria conta Google acessando sua própria planilha).
6. Copie a URL gerada — termina em `/exec`.
7. Abra o app (pelo link do GitHub Pages, instalado ou não), toque em
   **🔗 Configurar Google Sheets** e cole essa URL.
8. Sempre que tiver internet, toque em **☁️ Enviar para Google Sheets** para mandar
   os dados coletados em campo. Cada envio só *acrescenta* linhas novas — nunca apaga
   nada que já foi enviado antes.

A planilha vai ganhar automaticamente 4 abas na primeira vez que você enviar dados:
`Cacau_Pontos`, `Cacau_Valvulas`, `Coco_Pontos`, `Coco_Valvulas`.

> A sincronização com o Sheets **exige internet** no momento do envio — a coleta em
> campo continua 100% offline, você só precisa estar online na hora de tocar em
> "Enviar para Google Sheets".

> Dica: a URL do Google Sheets fica salva na memória do app durante o uso, mas se
> você fechar o navegador ela é perdida — por isso ela também é guardada dentro do
> backup `.json` que o app exporta. Ao importar esse backup de novo, a URL volta
> junto automaticamente.

## Passo 3 — Transformar em APK (depois que os passos acima estiverem funcionando)

Com o app publicado e instalável (Passo 1), dá pra gerar um APK real de duas formas:

- **PWABuilder** (mais simples): acesse https://www.pwabuilder.com, cole o link do
  GitHub Pages, e ele gera o pacote Android (APK/AAB) pronto para instalar ou publicar
  na Play Store.
- **Bubblewrap** (linha de comando, mais controle): `npm i -g @bubblewrap/cli`, depois
  `bubblewrap init --manifest=https://seu-usuario.github.io/.../manifest.json`.

Isso fica combinado para depois que o Sheets estiver testado e funcionando — não é
necessário mexer em nada do código para esse próximo passo, só apontar a ferramenta
para o link do GitHub Pages.

## Versão

O número da versão aparece no topo da tela inicial do app (e no topo do
`service-worker.js`) e sobe a cada atualização.

/**
 * Monitoramento de Irrigação — Cacau & Coco
 * Web App (Google Apps Script) que recebe os dados enviados pelo app offline,
 * grava em abas da Planilha Google, e mantém abas de RESUMO com gráficos
 * automáticos (ocorrências por data, sempre com o histórico completo).
 *
 * COMO USAR
 * 1. Crie (ou abra) uma Planilha Google onde os dados devem ser gravados.
 * 2. Menu Extensões > Apps Script.
 * 3. Apague o conteúdo do arquivo "Código.gs" e cole o conteúdo deste arquivo.
 * 4. Clique em "Implantar" > "Nova implantação".
 *    - Tipo: "App da Web"
 *    - Executar como: "Eu" (sua conta)
 *    - Quem pode acessar: "Qualquer pessoa"
 * 5. Copie a URL gerada (termina em "/exec").
 * 6. No app offline, toque em "🔗 Configurar Google Sheets" e cole essa URL.
 * 7. Toque em "☁️ Enviar para Google Sheets" sempre que tiver internet
 *    para sincronizar os dados coletados em campo.
 *
 * Cada envio ACRESCENTA linhas novas nas abas de dados brutos (não apaga nem
 * sobrescreve o que já foi enviado antes) — é isso que forma o histórico.
 * As abas "Resumo_..." e os gráficos são recalculados do zero a cada envio,
 * a partir de todo o histórico acumulado nas abas de dados brutos.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    appendRows(ss, 'Cacau_Pontos', data.cacauPontos);
    appendRows(ss, 'Cacau_Valvulas', data.cacauValvulas);
    appendRows(ss, 'Cacau_Pragas', data.cacauPragas);
    appendRows(ss, 'Coco_Pontos', data.cocoPontos);
    appendRows(ss, 'Coco_Valvulas', data.cocoValvulas);
    appendRows(ss, 'Historico_Cacau_Irrigacao', data.cacauIrrigacaoHistorico);
    appendRows(ss, 'Historico_Cacau_Pragas', data.cacauPragasHistorico);
    appendRows(ss, 'Historico_Coco_Irrigacao', data.cocoIrrigacaoHistorico);

    try {
      atualizarGraficos(ss);
    } catch (chartErr) {
      // Nunca deixa um erro no gráfico derrubar o envio dos dados em si.
    }

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return jsonOut({ ok: true, info: 'Web App de Monitoramento de Irrigação está no ar.' });
}

/**
 * Acrescenta linhas (array de objetos) numa aba, criando a aba e o
 * cabeçalho automaticamente na primeira vez.
 */
function appendRows(ss, sheetName, rows) {
  if (!rows || !rows.length) return;

  var sh = ss.getSheetByName(sheetName);
  var headers;

  if (!sh) {
    sh = ss.insertSheet(sheetName);
    headers = Object.keys(rows[0]);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    headers = Object.keys(rows[0]);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  } else {
    headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  }

  var data = rows.map(function (row) {
    return headers.map(function (h) {
      var v = row[h];
      return (v === undefined || v === null) ? '' : v;
    });
  });

  sh.getRange(sh.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============== RESUMOS + GRÁFICOS (histórico sempre atualizado) ==============
 * O app manda, a cada envio, TODO o histórico salvo localmente em cada setor
 * (uma linha por data já salva no aparelho, não só a visita mais recente).
 * Essas linhas vão para as abas Historico_*, que recebem linhas novas a cada
 * envio (reenviar duas vezes pode duplicar linhas ali, mas os gráficos abaixo
 * não são afetados: as abas Resumo_* sempre ficam só com a última leitura de
 * cada Setor+Data antes de desenhar o gráfico, e são redesenhadas do zero a
 * cada envio.
 */

function atualizarGraficos(ss) {
  construirResumoEGrafico(ss, 'Resumo_Cacau_Irrigacao',
    pivotarPorData(agregarHistorico(ss, 'Historico_Cacau_Irrigacao')),
    'Cacau — Irrigação: ocorrências por data');

  construirResumoEGrafico(ss, 'Resumo_Cacau_Pragas',
    pivotarPorData(agregarHistorico(ss, 'Historico_Cacau_Pragas')),
    'Cacau — Pragas: ocorrências por data');

  construirResumoEGrafico(ss, 'Resumo_Coco_Irrigacao',
    pivotarPorData(agregarHistorico(ss, 'Historico_Coco_Irrigacao')),
    'Coco — Irrigação: ocorrências por data');
}

/** Lê uma aba Historico_* (Setor, Data, Avaliados, Ocorrencias, Total) e
 *  fica só com a última leitura de cada Setor+Data (evita duplicar se o
 *  mesmo dia for reenviado). */
function agregarHistorico(ss, nomeAba) {
  var sh = ss.getSheetByName(nomeAba);
  if (!sh || sh.getLastRow() < 2) return {};

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();

  var mapa = {};
  rows.forEach(function (row) {
    var setor = row[idx.Setor];
    var data = formatarData(row[idx.Data]);
    var chave = setor + '|' + data;
    mapa[chave] = {
      setor: setor,
      data: data,
      total: Number(row[idx.Total]) || 0,
      problemas: Number(row[idx.Ocorrencias]) || 0
    };
  });
  return mapa;
}

function formatarData(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v);
}

/** Transforma o mapa {"setor|data": {...}} numa tabela pivotada: linhas = datas, colunas = setores. */
function pivotarPorData(mapa) {
  var setoresSet = {}, datasSet = {};
  Object.keys(mapa).forEach(function (k) {
    setoresSet[mapa[k].setor] = true;
    datasSet[mapa[k].data] = true;
  });
  var setores = Object.keys(setoresSet).sort();
  var datas = Object.keys(datasSet).sort();

  var header = ['Data'].concat(setores);
  var linhas = datas.map(function (d) {
    return [d].concat(setores.map(function (s) {
      var e = mapa[s + '|' + d];
      return e ? e.problemas : '';
    }));
  });
  return { header: header, linhas: linhas };
}

/** Escreve a tabela resumo numa aba e (re)desenha um gráfico de linha a partir dela. */
function construirResumoEGrafico(ss, nomeAba, tabela, titulo) {
  var sh = ss.getSheetByName(nomeAba);
  if (sh) {
    sh.clear();
    sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  } else {
    sh = ss.insertSheet(nomeAba);
  }

  sh.getRange(1, 1, 1, tabela.header.length).setValues([tabela.header]);
  if (tabela.linhas.length) {
    sh.getRange(2, 1, tabela.linhas.length, tabela.header.length).setValues(tabela.linhas);
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, tabela.header.length);

  if (!tabela.linhas.length || tabela.header.length < 2) return;

  var range = sh.getRange(1, 1, tabela.linhas.length + 1, tabela.header.length);
  var chart = sh.newChart()
    .asLineChart()
    .addRange(range)
    .setNumHeaders(1)
    .setPosition(2, tabela.header.length + 2, 0, 0)
    .setOption('title', titulo)
    .setOption('hAxis', { title: 'Data' })
    .setOption('vAxis', { title: 'Ocorrências', minValue: 0 })
    .setOption('legend', { position: 'right' })
    .setOption('width', 760)
    .setOption('height', 380)
    .build();
  sh.insertChart(chart);
}

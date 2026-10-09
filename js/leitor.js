/* Leitura de planilhas .xlsx e .csv, linha a linha, sem enviar nada para fora do navegador. */
(function () {
  'use strict';
  const PF = (window.PF = window.PF || {});

  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function dec(s) {
    if (s.indexOf('&') >= 0) {
      s = s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, e) => {
        if (ENT[e]) return ENT[e];
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return isFinite(n) ? String.fromCodePoint(n) : m;
      });
    }
    if (s.indexOf('_x') >= 0) s = s.replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    return s;
  }
  function attr(s, nome) {
    const m = new RegExp('(?:^|\\s)(?:\\w+:)?' + nome + '\\s*=\\s*"([^"]*)"').exec(s);
    return m ? dec(m[1]) : null;
  }
  const RE_T = /<(?:\w+:)?t\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g;
  function textoDe(frag) {
    if (frag.indexOf('rPh') >= 0) frag = frag.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
    let out = '', m;
    RE_T.lastIndex = 0;
    while ((m = RE_T.exec(frag))) if (m[2]) out += m[2];
    return dec(out);
  }
  function colIdx(ref) {
    let n = 0;
    for (let i = 0; i < ref.length; i++) {
      const c = ref.charCodeAt(i);
      if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
      else if (c >= 97 && c <= 122) n = n * 26 + (c - 96);
      else break;
    }
    return n - 1;
  }

  function* linhasXml(xml, sst) {
    const reRow = /<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g;
    const reCel = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
    const reV = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/;
    let mr;
    while ((mr = reRow.exec(xml))) {
      const corpo = mr[1];
      const linha = [];
      if (corpo) {
        let mc, prox = 0;
        reCel.lastIndex = 0;
        while ((mc = reCel.exec(corpo))) {
          const at = mc[1], dentro = mc[2];
          const r = attr(at, 'r');
          const ci = r ? colIdx(r) : prox;
          prox = ci + 1;
          if (dentro == null || dentro === '') continue;
          const t = attr(at, 't');
          let val = null;
          if (t === 'inlineStr') val = textoDe(dentro);
          else {
            const mv = reV.exec(dentro);
            if (mv) {
              const raw = mv[1];
              if (t === 's') val = sst[+raw] != null ? sst[+raw] : null;
              else if (t === 'str' || t === 'd') val = dec(raw);
              else if (t === 'b') val = raw === '1';
              else if (t === 'e') val = null;
              else { const n = Number(raw); val = raw === '' || !isFinite(n) ? null : n; }
            }
          }
          if (val !== null && val !== '') linha[ci] = val;
        }
      }
      yield linha;
    }
  }

  /* Devolve { abas: [{ nome, linhas() }], d1904 }. linhas() é um gerador de vetores (um por linha). */
  PF.lerXlsx = function (u8) {
    let arqs;
    try {
      arqs = window.fflate.unzipSync(u8, {
        filter: f => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/i.test(f.name),
      });
    } catch (e) {
      throw new Error('O arquivo não é uma planilha .xlsx válida. Se for .xls, salve como .xlsx ou .csv.');
    }
    const td = new TextDecoder('utf-8');
    const pega = nome => { const k = Object.keys(arqs).find(n => n.toLowerCase() === nome.toLowerCase()); return k ? td.decode(arqs[k]) : null; };
    const wb = pega('xl/workbook.xml');
    if (!wb) throw new Error('Planilha sem pasta de trabalho legível.');
    const rels = pega('xl/_rels/workbook.xml.rels') || '';
    const alvo = {};
    rels.replace(/<(?:\w+:)?Relationship\b([^>]*)>/g, (m, a) => { alvo[attr(a, 'Id')] = attr(a, 'Target'); return m; });
    const sst = [];
    const sx = pega('xl/sharedStrings.xml');
    if (sx) {
      const re = /<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g;
      let m;
      while ((m = re.exec(sx))) sst.push(m[1] ? textoDe(m[1]) : '');
    }
    const abas = [];
    wb.replace(/<(?:\w+:)?sheet\b([^>]*)>/g, (m, a) => {
      let t = alvo[attr(a, 'id')];
      if (!t) return m;
      t = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t;
      const k = Object.keys(arqs).find(n => n.toLowerCase() === t.toLowerCase());
      if (k) abas.push({ nome: attr(a, 'name') || '', linhas: () => linhasXml(td.decode(arqs[k]), sst) });
      return m;
    });
    if (!abas.length) throw new Error('Planilha sem abas legíveis.');
    return { abas, d1904: /<(?:\w+:)?workbookPr\b[^>]*date1904\s*=\s*"(1|true)"/.test(wb) };
  };

  PF.lerCsv = function (u8) {
    let txt;
    try { txt = new TextDecoder('utf-8', { fatal: true }).decode(u8); }
    catch (e) { txt = new TextDecoder('windows-1252').decode(u8); }
    if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
    const fim = txt.indexOf('\n');
    const cab = fim < 0 ? txt : txt.slice(0, fim);
    let sep = ';', melhor = -1;
    for (const s of [';', '\t', ',', '|']) { const n = cab.split(s).length; if (n > melhor) { melhor = n; sep = s; } }
    function* linhas() {
      let i = 0, campo = '', linha = [], aspas = false;
      const n = txt.length;
      while (i < n) {
        const ch = txt[i];
        if (aspas) {
          if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
          else campo += ch;
        } else if (ch === '"') aspas = true;
        else if (ch === sep) { linha.push(campo); campo = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && txt[i + 1] === '\n') i++;
          linha.push(campo); campo = '';
          yield linha.map(v => (v === '' ? undefined : v));
          linha = [];
        } else campo += ch;
        i++;
      }
      if (campo !== '' || linha.length) { linha.push(campo); yield linha.map(v => (v === '' ? undefined : v)); }
    }
    return { abas: [{ nome: 'CSV', linhas }], d1904: false };
  };

  /* Converte data vinda da planilha em { y, m, d }. Aceita número de série do Excel e textos usuais. */
  const MESES = { JAN: 1, FEV: 2, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAI: 5, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SET: 9, SEP: 9, OUT: 10, OCT: 10, NOV: 11, DEZ: 12, DEC: 12 };
  const ano4 = y => (y < 100 ? (y <= 49 ? 2000 + y : 1900 + y) : y);
  const valida = (y, m, d) => (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y, m, d } : null);
  PF.paraData = function (v, d1904) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      if (!(v > 1 && v < 110000)) return null;
      const dt = new Date(Math.round((Math.floor(v) + (d1904 ? 1462 : 0) - 25569) * 86400000));
      return valida(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    const s = String(v).trim();
    let m;
    if ((m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s))) return valida(+m[1], +m[2], m[3] ? +m[3] : 1);
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s))) {
      let d = +m[1], mo = +m[2];
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
      return valida(ano4(+m[3]), mo, d);
    }
    if ((m = /^(\d{1,2})[\/\-](\d{4})$/.exec(s))) return valida(+m[2], +m[1], 1);
    if ((m = /^([A-Za-zçÇ]{3})[A-Za-zçÇ]*[\/\-. ]+(\d{2,4})$/.exec(s))) {
      const mo = MESES[m[1].toUpperCase()];
      return mo ? valida(ano4(+m[2]), mo, 1) : null;
    }
    if (/^\d{4,6}(\.\d+)?$/.test(s)) return PF.paraData(Number(s), d1904);
    return null;
  };

  /* Converte número vindo da planilha. Aceita 1.234,56, 1234.56, R$ e sinal ao final (padrão de alguns sistemas de folha). */
  PF.paraNum = function (v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'boolean') return null;
    let s = String(v).replace(/[R$\s ]/g, '');
    if (!s) return null;
    let neg = false;
    if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1); }
    if (s.indexOf(',') >= 0 && (s.lastIndexOf(',') > s.lastIndexOf('.'))) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    const n = Number(s);
    return isFinite(n) && s !== '' ? (neg ? -n : n) : null;
  };

  PF.hash = async function (u8) {
    try {
      const h = await crypto.subtle.digest('SHA-256', u8);
      return Array.from(new Uint8Array(h).slice(0, 6)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let a = 0x811c9dc5, b = 0x1000193;
      for (let i = 0; i < u8.length; i++) { a ^= u8[i]; a = Math.imul(a, 16777619); b = (b + u8[i] * (i + 1)) | 0; }
      return ((a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0')).slice(0, 12);
    }
  };
})();

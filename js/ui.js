/* Componentes de interface: formatação, cartões, tabelas, gráficos. */
(function () {
  'use strict';
  const PF = window.PF;

  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const nulo = v => v == null || (typeof v === 'number' && !isFinite(v));
  const sinal = v => (v < 0 ? '−' : '');

  const F = (PF.f = {
    int: v => (nulo(v) ? '–' : sinal(v) + nf0.format(Math.abs(v))),
    num1: v => (nulo(v) ? '–' : sinal(v) + nf1.format(Math.abs(v))),
    moeda: v => (nulo(v) ? '–' : sinal(v) + 'R$ ' + nf0.format(Math.abs(v))),
    moeda2: v => (nulo(v) ? '–' : sinal(v) + 'R$ ' + nf2.format(Math.abs(v))),
    pct: v => (nulo(v) ? '–' : sinal(v) + nf1.format(Math.abs(v * 100)) + '%'),
    dmoeda: v => (nulo(v) ? '–' : (v > 0 ? '+' : sinal(v)) + 'R$ ' + nf0.format(Math.abs(v))),
    dpct: v => (nulo(v) ? '–' : (v > 0 ? '+' : sinal(v)) + nf1.format(Math.abs(v * 100)) + '%'),
    dint: v => (nulo(v) ? '–' : (v > 0 ? '+' : sinal(v)) + nf0.format(Math.abs(v))),
    compacto: v => {
      if (nulo(v)) return '–';
      const a = Math.abs(v);
      if (a >= 1e9) return sinal(v) + nf1.format(a / 1e9) + ' bi';
      if (a >= 1e6) return sinal(v) + nf1.format(a / 1e6) + ' mi';
      if (a >= 1e4) return sinal(v) + nf0.format(a / 1e3) + ' mil';
      return sinal(v) + nf0.format(a);
    },
    comp: c => (c ? MES[+c.slice(5) - 1] + '/' + c.slice(2, 4) : '–'),
    compLongo: c => (c ? MESL[+c.slice(5) - 1] + ' de ' + c.slice(0, 4) : '–'),
    data: n => (n ? String(n % 100).padStart(2, '0') + '/' + String(Math.floor(n / 100) % 100).padStart(2, '0') + '/' + Math.floor(n / 10000) : '–'),
  });

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (PF.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]));
  PF.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  PF.CORES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  PF.COR_OUTRAS = '#b3bcc7';
  PF.COR_ALTA = '#eb6834';
  PF.COR_BAIXA = '#2a78d6';
  PF.COR_TOTAL = '#7c8794';

  /* ---------- cartões e indicadores ---------- */
  PF.cartao = function (host, titulo, sub) {
    const el = PF.h('<section class="cartao"><header class="cartao-cab"><div><h3></h3><p class="sub"></p></div><div class="acoes"></div></header><div class="cartao-corpo"></div></section>');
    el.querySelector('h3').textContent = titulo || '';
    const p = el.querySelector('.sub');
    if (sub) p.textContent = sub; else p.remove();
    if (!titulo && !sub) el.querySelector('.cartao-cab').remove();
    host.appendChild(el);
    return { el, corpo: el.querySelector('.cartao-corpo'), acoes: el.querySelector('.acoes') };
  };
  PF.grade = function (host, cls) { const g = PF.h('<div class="grade ' + (cls || '') + '"></div>'); host.appendChild(g); return g; };
  PF.aviso = function (host, texto, tipo) { const a = PF.h('<p class="aviso ' + (tipo || '') + '"></p>'); a.textContent = texto; host.appendChild(a); return a; };

  function faisca(vals) {
    const v = vals.filter(x => x != null);
    if (v.length < 2) return '';
    const W = 120, H = 28, min = Math.min.apply(null, v), max = Math.max.apply(null, v), amp = max - min || 1;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * (W - 8) + 4, H - 4 - ((y - min) / amp) * (H - 8)]);
    const u = pts[pts.length - 1];
    return '<svg class="faisca" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline fill="none" points="' +
      pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '"/><circle cx="' + u[0].toFixed(1) + '" cy="' + u[1].toFixed(1) + '" r="3"/></svg>';
  }
  /* o: { rot, valor, fmt, ant, rotAnt, serie, nota, dfmt } */
  PF.indicador = function (host, o) {
    const fmt = o.fmt || F.moeda;
    let delta = '';
    if (o.ant != null && o.valor != null) {
      const d = o.valor - o.ant, p = o.ant ? d / Math.abs(o.ant) : null;
      const seta = d > 0 ? '▲' : d < 0 ? '▼' : '=';
      delta = '<p class="delta"><span class="seta">' + seta + '</span> ' + (p == null ? '' : esc(F.dpct(p)) + ' · ') + esc((o.dfmt || F.dmoeda)(d)) + ' <span class="mudo">vs ' + esc(o.rotAnt || '') + '</span></p>';
    } else if (o.rotAnt === null) delta = '<p class="delta mudo">Sem mês de comparação</p>';
    const el = PF.h('<div class="indicador"><p class="rot"></p><p class="valor"></p>' + delta + (o.serie ? faisca(o.serie) : '') + '</div>');
    el.querySelector('.rot').textContent = o.rot;
    el.querySelector('.valor').textContent = o.valor == null ? '–' : fmt(o.valor);
    if (o.nota) el.title = o.nota;
    host.appendChild(el);
    return el;
  };

  /* ---------- exportação ---------- */
  PF.baixarCsv = function (nome, cols, linhas) {
    const q = v => {
      if (v == null) return '';
      if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 1e6) / 1e6).replace('.', ',') : '';
      const s = String(v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') : s;
    };
    const out = [cols.map(c => q(c.rot)).join(';')];
    for (const l of linhas) out.push(cols.map(c => q(c.csv ? c.csv(l) : (c.v ? c.v(l) : l[c.k]))).join(';'));
    const blob = new Blob(['﻿' + out.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  /* ---------- tabela genérica ---------- */
  /* o: { cols:[{k, rot, t, v, html, csv, cls}], linhas, ordem:{k,dir}, limite, aoClicar, exportar, rodape, vazio }
     tipos (t): txt, int, moeda, moeda2, pct, dmoeda, dpct, dint, data, barra */
  PF.tabela = function (host, o) {
    const est = { k: o.ordem ? o.ordem.k : null, dir: o.ordem ? o.ordem.dir || -1 : -1, n: o.limite || 50 };
    const el = PF.h('<div class="tab-wrap"><div class="tab-rol"><table class="tab"><thead></thead><tbody></tbody><tfoot></tfoot></table></div><div class="tab-pe"></div></div>');
    host.appendChild(el);
    const val = (l, c) => (c.v ? c.v(l) : l[c.k]);
    const num = c => c.t && c.t !== 'txt' && c.t !== 'data';
    const maxs = {};
    o.cols.forEach(c => { if (c.t === 'barra') maxs[c.k] = Math.max.apply(null, o.linhas.map(l => Math.abs(val(l, c) || 0)).concat([0])); });
    function cel(l, c) {
      const v = val(l, c);
      if (c.html) return c.html(l, v);
      if (v == null || v === '') return '<span class="mudo">–</span>';
      switch (c.t) {
        case 'int': return esc(F.int(v));
        case 'moeda': return esc(F.moeda(v));
        case 'moeda2': return esc(F.moeda2(v));
        case 'pct': return esc(F.pct(v));
        case 'dmoeda': return esc(F.dmoeda(v));
        case 'dpct': return esc(F.dpct(v));
        case 'dint': return esc(F.dint(v));
        case 'data': return esc(F.data(v));
        case 'barra': {
          const m = maxs[c.k] || 1;
          return '<span class="barra-cel"><span class="barra-num">' + esc((c.fmt || F.moeda)(v)) + '</span><span class="barra-trilho"><span class="barra" style="width:' + Math.max(0, Math.min(100, (Math.abs(v) / m) * 100)).toFixed(1) + '%"></span></span></span>';
        }
        default: return esc(v);
      }
    }
    function ordenadas() {
      if (!est.k) return o.linhas;
      const c = o.cols.find(x => x.k === est.k);
      if (!c) return o.linhas;
      const a = o.linhas.slice();
      a.sort((x, y) => {
        const vx = val(x, c), vy = val(y, c);
        const nx = vx == null || vx === '', ny = vy == null || vy === '';
        if (nx || ny) return nx && ny ? 0 : nx ? 1 : -1;
        if (typeof vx === 'number' && typeof vy === 'number') return (vx - vy) * est.dir;
        return String(vx).localeCompare(String(vy), 'pt-BR', { numeric: true }) * est.dir;
      });
      return a;
    }
    function desenha() {
      const lin = ordenadas();
      el.querySelector('thead').innerHTML = '<tr>' + o.cols.map(c =>
        '<th class="' + (num(c) ? 'num ' : '') + (c.cls || '') + '" data-k="' + esc(c.k) + '" tabindex="0" title="' + esc(c.dica || 'Ordenar por esta coluna') + '">' + esc(c.rot) +
        (est.k === c.k ? '<span class="ord">' + (est.dir > 0 ? ' ▲' : ' ▼') + '</span>' : '') + '</th>').join('') + '</tr>';
      if (!lin.length) {
        el.querySelector('tbody').innerHTML = '<tr><td class="vazio" colspan="' + o.cols.length + '">' + esc(o.vazio || 'Nada a mostrar com os filtros atuais.') + '</td></tr>';
      } else {
        el.querySelector('tbody').innerHTML = lin.slice(0, est.n).map((l, i) =>
          '<tr data-i="' + i + '"' + (o.aoClicar ? ' class="clicavel" tabindex="0"' : '') + '>' + o.cols.map(c => '<td class="' + (num(c) ? 'num ' : '') + (c.cls || '') + '">' + cel(l, c) + '</td>').join('') + '</tr>').join('');
      }
      el.querySelector('tfoot').innerHTML = o.rodape ? '<tr>' + o.cols.map(c => '<td class="' + (num(c) ? 'num ' : '') + '">' + (o.rodape[c.k] == null ? '' : cel(o.rodape, c)) + '</td>').join('') + '</tr>' : '';
      const pe = el.querySelector('.tab-pe');
      pe.innerHTML = '';
      if (lin.length > est.n) {
        const b = PF.h('<button type="button" class="btn btn-texto">Mostrar mais (' + F.int(lin.length - est.n) + ' restantes)</button>');
        b.addEventListener('click', () => { est.n += o.limite || 50; desenha(); });
        pe.appendChild(b);
      }
      el._lin = lin;
    }
    el.addEventListener('click', e => {
      const th = e.target.closest('th');
      if (th && el.contains(th)) { const k = th.dataset.k; if (est.k === k) est.dir = -est.dir; else { est.k = k; const c = o.cols.find(x => x.k === k); est.dir = num(c) ? -1 : 1; } desenha(); return; }
      const tr = e.target.closest('tbody tr.clicavel');
      if (tr && o.aoClicar) o.aoClicar(el._lin[+tr.dataset.i]);
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { const t = e.target.closest('th, tr.clicavel'); if (t) t.click(); } });
    desenha();
    return { el, exportar: () => PF.baixarCsv(o.exportar || 'tabela', o.cols.filter(c => !c.semCsv), ordenadas()) };
  };
  /* Cartão com tabela e botão de exportação. */
  PF.cartaoTabela = function (host, titulo, sub, o) {
    const c = PF.cartao(host, titulo, sub);
    const t = PF.tabela(c.corpo, o);
    if (o.exportar && o.linhas.length) {
      const b = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
      b.addEventListener('click', t.exportar);
      c.acoes.appendChild(b);
    }
    return c;
  };

  /* Lista de barras horizontais: itens [{ rot, v, extra }] */
  PF.barras = function (host, itens, o) {
    o = o || {};
    const fmt = o.fmt || F.int;
    const max = Math.max.apply(null, itens.map(i => Math.abs(i.v || 0)).concat([0])) || 1;
    const el = PF.h('<div class="barras"></div>');
    for (const it of itens) {
      const li = PF.h('<div class="barras-l"><span class="barras-rot"></span><span class="barra-trilho"><span class="barra"></span></span><span class="barras-val"></span></div>');
      li.querySelector('.barras-rot').textContent = it.rot;
      li.querySelector('.barras-rot').title = it.rot;
      li.querySelector('.barra').style.width = (it.v == null ? 0 : (Math.abs(it.v) / max) * 100).toFixed(1) + '%';
      li.querySelector('.barras-val').textContent = it.txt != null ? it.txt : fmt(it.v) + (it.extra ? ' · ' + it.extra : '');
      el.appendChild(li);
    }
    if (!itens.length) el.appendChild(PF.h('<p class="mudo">Sem dados.</p>'));
    host.appendChild(el);
    return el;
  };

  /* ---------- gráficos ---------- */
  PF._grafs = [];
  PF.limpaGrafs = function () {
    PF._grafs.forEach(g => {
      /* cancela o redesenho que a biblioteca agenda ao redimensionar a janela; sem isso ele roda sobre um gráfico já removido */
      try { clearTimeout(g.w.globals.resizeTimer); g.destroy(); } catch (e) { /* já removido */ }
    });
    PF._grafs = [];
  };
  function funde(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) funde(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  PF.graf = function (host, opts, altura) {
    const div = PF.h('<div class="graf"></div>');
    host.appendChild(div);
    const ink = '#5c6672', linha = '#e3e8ee';
    const fy = opts._fy || (v => F.compacto(v));
    const base = {
      chart: { height: altura || 300, fontFamily: 'Roboto, "Segoe UI", system-ui, sans-serif', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false }, parentHeightOffset: 0, selection: { enabled: false } },
      colors: PF.CORES,
      dataLabels: { enabled: false },
      stroke: { width: 2, curve: 'straight', lineCap: 'round' },
      grid: { borderColor: linha, strokeDashArray: 0, padding: { left: 8, right: 16 } },
      xaxis: { axisBorder: { color: '#c9d1db' }, axisTicks: { show: false }, labels: { style: { colors: ink, fontSize: '12px' }, hideOverlappingLabels: true, rotate: 0 }, tooltip: { enabled: false }, crosshairs: { stroke: { color: '#9aa5b1', width: 1, dashArray: 0 } } },
      yaxis: { labels: { style: { colors: ink, fontSize: '12px' }, formatter: fy } },
      legend: { position: 'top', horizontalAlign: 'left', fontSize: '13px', labels: { colors: '#37414d' }, markers: { width: 10, height: 10, radius: 2 }, itemMargin: { horizontal: 10, vertical: 2 } },
      tooltip: { shared: true, intersect: false, theme: 'light', style: { fontSize: '13px' }, y: { formatter: opts._ft || fy } },
      plotOptions: { bar: { borderRadius: 3, borderRadiusApplication: 'end' } },
      markers: { size: 0, strokeColors: '#fff', strokeWidth: 2, hover: { size: 5 } },
      states: { hover: { filter: { type: 'lighten', value: 0.08 } }, active: { filter: { type: 'none' } } },
      fill: { opacity: 1 },
      noData: { text: 'Sem dados para os filtros atuais.' },
    };
    const o = funde(base, opts);
    const cats = o.xaxis.categories;
    if (o.chart.type === 'line' && cats && cats.length > 10 && o.xaxis.tickAmount == null) o.xaxis.tickAmount = 7;
    delete o._fy; delete o._ft;
    const g = new window.ApexCharts(div, o);
    g.render();
    PF._grafs.push(g);
    return g;
  };
  PF.larguraColuna = n => (n <= 4 ? '22%' : n <= 8 ? '38%' : n <= 14 ? '52%' : '66%');

  /* ---------- avisos rápidos ---------- */
  PF.toast = function (msg, tipo) {
    let c = document.getElementById('toasts');
    if (!c) { c = PF.h('<div id="toasts" aria-live="polite"></div>'); document.body.appendChild(c); }
    const t = PF.h('<div class="toast ' + (tipo || '') + '"></div>');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), tipo === 'erro' ? 12000 : 6000);
  };
  PF.ocupado = function (msg) {
    const o = document.getElementById('ocupado');
    if (msg == null) { o.hidden = true; return Promise.resolve(); }
    o.querySelector('p').textContent = msg;
    o.hidden = false;
    return new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
  };

  /* Controles simples */
  PF.select = function (rot, id, opcoes, atual, aoMudar) {
    const el = PF.h('<label class="campo"><span></span><select></select></label>');
    el.querySelector('span').textContent = rot;
    const s = el.querySelector('select');
    s.id = id;
    for (const o of opcoes) { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (o[0] === atual) op.selected = true; s.appendChild(op); }
    s.addEventListener('change', () => aoMudar(s.value));
    return el;
  };
})();

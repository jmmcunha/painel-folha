/* Telas de conjunto: visão geral, estrutura, evolução e variações. */
(function () {
  'use strict';
  const PF = window.PF, F = PF.f, esc = PF.esc;
  const T = (PF.telas = PF.telas || {});
  const rotMed = () => PF.MEDIDAS[PF.st.medida].rot;

  /* ================= VISÃO GERAL ================= */
  T.geral = function (el) {
    const st = PF.st, db = PF.db, c = st.comp, cc = PF.compCmp();
    const tot = PF.total(c), ant = cc ? PF.total(cc) : null, rotAnt = cc ? F.comp(cc) : null;
    const serie = db.comps.map(k => ({ c: k, a: PF.total(k) }));
    const i0 = db.comps.indexOf(c);
    const ult = serie.slice(Math.max(0, i0 - 11), i0 + 1);
    const medio = a => (a && a.hc ? PF.val(a, 'custo') / a.hc : null);

    const g = PF.grade(el, 'g-ind');
    const ind = (rot, fv, o) => PF.indicador(g, Object.assign({ rot, valor: fv(tot), ant: ant ? fv(ant) : null, rotAnt, serie: ult.map(x => fv(x.a)) }, o || {}));
    ind('Custo total', a => PF.val(a, 'custo'), { nota: PF.MEDIDAS.custo.nota });
    ind('Remuneração bruta', a => PF.val(a, 'bruto'), { nota: PF.MEDIDAS.bruto.nota });
    ind('Encargos patronais', a => PF.val(a, 'enc'), { nota: PF.MEDIDAS.enc.nota });
    ind('Líquido', a => PF.val(a, 'liq'), { nota: PF.MEDIDAS.liq.nota });
    ind('Colaboradores na folha', a => a.hc, { fmt: F.int, dfmt: F.dint, nota: 'Pessoas com ao menos um lançamento na competência.' });
    ind('Custo médio por colaborador', medio, { nota: 'Custo total dividido pelo número de colaboradores na folha.' });

    const jan = serie.slice(-24);
    const g2 = PF.grade(el, 'g-2');
    const c1 = PF.cartao(g2, 'Evolução mensal', rotMed() + (jan.length < serie.length ? ', últimos 24 meses' : ''));
    PF.graf(c1.corpo, {
      chart: { type: 'bar' },
      series: [{ name: rotMed(), data: jan.map(x => Math.round(PF.val(x.a))) }],
      xaxis: { categories: jan.map(x => F.comp(x.c)) },
      plotOptions: { bar: { columnWidth: PF.larguraColuna(jan.length) } },
      legend: { show: false },
      _ft: v => F.moeda(v),
    }, 300);
    const c2 = PF.cartao(g2, 'Composição do custo total', 'Proventos, encargos patronais e benefícios pagos pela empresa');
    PF.graf(c2.corpo, {
      chart: { type: 'bar', stacked: true },
      series: [
        { name: 'Proventos', data: jan.map(x => Math.round(x.a.P)) },
        { name: 'Encargos patronais', data: jan.map(x => Math.round(x.a.E)) },
        { name: 'Benefícios da empresa', data: jan.map(x => Math.round(x.a.B)) },
      ],
      xaxis: { categories: jan.map(x => F.comp(x.c)) },
      stroke: { width: 2, colors: ['#fff'] },
      plotOptions: { bar: { columnWidth: PF.larguraColuna(jan.length) } },
      _ft: v => F.moeda(v),
    }, 300);

    const g3 = PF.grade(el, 'g-13');
    const total = PF.val(tot) || 0;
    const porDir = [...PF.porGrupo(c, s => s.dir)].map(([k, a]) => ({ rot: PF.rotulo(k), v: PF.val(a), extra: (total ? F.pct(PF.val(a) / total) : '–') + ' · ' + F.int(a.hc) + ' pessoas' })).sort((a, b) => b.v - a.v);
    const cd = PF.cartao(g3, 'Por diretoria', rotMed() + ' em ' + F.comp(c));
    PF.barras(cd.corpo, porDir, { fmt: F.moeda });

    const antG = cc ? PF.porGrupo(cc, s => s.coord) : new Map();
    const lin = [...PF.porGrupo(c, s => s.coord)].map(([k, a]) => {
      const v = PF.val(a), b = antG.get(k), vb = b ? PF.val(b) : null;
      return { k, coord: PF.rotulo(k), hc: a.hc, v, part: total ? v / total : null, d: vb == null ? null : v - vb, dp: vb ? (v - vb) / Math.abs(vb) : null };
    });
    PF.cartaoTabela(g3, 'Por coordenação', cc ? 'Variação em relação a ' + F.comp(cc) + '. Clique em uma linha para filtrar.' : 'Clique em uma linha para filtrar.', {
      cols: [
        { k: 'coord', rot: 'Coordenação' }, { k: 'hc', rot: 'Pessoas', t: 'int' }, { k: 'v', rot: rotMed(), t: 'barra' },
        { k: 'part', rot: '% do total', t: 'pct' }, { k: 'd', rot: 'Variação', t: 'dmoeda' }, { k: 'dp', rot: 'Variação %', t: 'dpct' },
      ],
      linhas: lin, ordem: { k: 'v', dir: -1 }, limite: 12, exportar: 'coordenacoes-' + c,
      aoClicar: l => { st.coord = l.k; PF.render(); },
    });
  };

  /* ================= ESTRUTURA ================= */
  const NIV = [['dir', 'Diretoria'], ['coord', 'Coordenação'], ['superv', 'Supervisão'], ['nucleo', 'Núcleo']];
  function montaArvore(comp) {
    const novo = (path, nome, tipo, prof) => ({ path, nome, tipo, prof, a: PF.zero(), mats: new Set(), filhos: new Map(), pess: new Map() });
    const raiz = novo('', 'Total', '', 0), idx = new Map([['', raiz]]);
    if (!comp) return { raiz, idx };
    for (const x of PF.celulas(comp)) {
      let n = raiz;
      PF.somar(n.a, x); n.mats.add(x.m);
      for (const [k, tipo] of NIV) {
        const v = x.s[k];
        if (!v) continue;
        const path = n.path + '\u001f' + k + ':' + v;
        let f = n.filhos.get(path);
        if (!f) { f = novo(path, v, tipo, n.prof + 1); n.filhos.set(path, f); idx.set(path, f); }
        n = f;
        PF.somar(n.a, x); n.mats.add(x.m);
      }
      let p = n.pess.get(x.m);
      if (!p) n.pess.set(x.m, (p = { s: x.s, a: PF.zero() }));
      PF.somar(p.a, x);
    }
    return { raiz, idx };
  }
  T.estrutura = function (el) {
    const st = PF.st, c = st.comp, cc = PF.compCmp();
    if (!st.exp) st.exp = new Set(['']);
    const A = montaArvore(c), B = montaArvore(cc);
    const pAnt = cc ? PF.pessoasDe(cc) : new Map();
    const total = PF.val(A.raiz.a) || 0;
    const ordTipo = { '': 0, Diretoria: 1, 'Coordenação': 2, 'Supervisão': 3, 'Núcleo': 4 };

    const cart = PF.cartao(el, 'Estrutura organizacional', rotMed() + ' em ' + F.comp(c) + (cc ? ', comparada a ' + F.comp(cc) : ''));
    const barra = PF.h('<div class="ferramentas"><span class="mudo">Abrir até:</span></div>');
    [['Diretoria', 1], ['Coordenação', 2], ['Supervisão', 3], ['Núcleo', 4]].forEach(([rot, n]) => {
      const b = PF.h('<button type="button" class="btn btn-contorno btn-p"></button>');
      b.textContent = rot;
      b.addEventListener('click', () => {
        st.exp = new Set();
        A.idx.forEach(no => { if (ordTipo[no.tipo] < n) st.exp.add(no.path); });
        PF.render();
      });
      barra.appendChild(b);
    });
    const chk = PF.h('<label class="marcar"><input type="checkbox" id="est-pess"> Listar colaboradores</label>');
    chk.querySelector('input').checked = !!st.estPess;
    chk.querySelector('input').addEventListener('change', e => { st.estPess = e.target.checked; PF.render(); });
    barra.appendChild(chk);
    cart.corpo.appendChild(barra);

    const linhas = [];
    function anda(no) {
      const temFilhos = no.filhos.size > 0 || (st.estPess && no.pess.size > 0);
      const b = B.idx.get(no.path);
      const v = PF.val(no.a), vb = b ? PF.val(b.a) : null;
      linhas.push({ tipoL: 'no', no, prof: no.prof, temFilhos, nome: no.nome, tipo: no.tipo, hc: no.mats.size, v, part: total ? v / total : null, med: no.mats.size ? v / no.mats.size : null, d: vb == null ? null : v - vb, dp: vb ? (v - vb) / Math.abs(vb) : null, dh: b ? no.mats.size - b.mats.size : null });
      if (!st.exp.has(no.path)) return;
      [...no.filhos.values()].sort((x, y) => PF.val(y.a) - PF.val(x.a)).forEach(anda);
      if (st.estPess) {
        [...no.pess.entries()].sort((x, y) => PF.val(y[1].a) - PF.val(x[1].a)).forEach(([m, p]) => {
          const pv = PF.val(p.a), pb = pAnt.get(m), pvb = pb ? PF.val(pb) : null;
          linhas.push({ tipoL: 'p', prof: no.prof + 1, nome: PF.nome(p.s), mat: m, cargo: p.s.cargo, hc: null, v: pv, part: total ? pv / total : null, med: null, d: pvb == null ? null : pv - pvb, dp: pvb ? (pv - pvb) / Math.abs(pvb) : null, dh: null });
        });
      }
    }
    anda(A.raiz);

    const html = ['<div class="tab-rol"><table class="tab arvore"><thead><tr><th>Unidade</th><th class="num">Pessoas</th><th class="num">' + esc(rotMed()) +
      '</th><th>% do total</th><th class="num">Média por pessoa</th><th class="num">Variação</th><th class="num">Variação %</th><th class="num">Var. pessoas</th></tr></thead><tbody>'];
    linhas.forEach((l, i) => {
      const pad = 8 + l.prof * 20;
      let nome;
      if (l.tipoL === 'p') nome = '<span class="tog-esp"></span><button type="button" class="link" data-mat="' + esc(l.mat) + '">' + esc(l.nome) + '</button> <span class="mudo">' + esc(l.cargo || '') + '</span>';
      else nome = (l.temFilhos ? '<button type="button" class="tog" data-i="' + i + '" aria-expanded="' + st.exp.has(l.no.path) + '" aria-label="Abrir ou fechar">' + (st.exp.has(l.no.path) ? '▾' : '▸') + '</button>' : '<span class="tog-esp"></span>') +
        '<span class="no-nome">' + esc(l.nome) + '</span>' + (l.tipo ? ' <span class="etq">' + esc(l.tipo) + '</span>' : '');
      html.push('<tr class="' + (l.tipoL === 'p' ? 'pessoa' : 'niv' + Math.min(l.prof, 4)) + '"><td style="padding-left:' + pad + 'px">' + nome + '</td><td class="num">' + (l.hc == null ? '' : esc(F.int(l.hc))) +
        '</td><td class="num">' + esc(F.moeda(l.v)) + '</td><td><span class="barra-cel"><span class="barra-num">' + esc(F.pct(l.part)) + '</span><span class="barra-trilho"><span class="barra" style="width:' + Math.max(0, Math.min(100, (l.part || 0) * 100)).toFixed(1) + '%"></span></span></span></td><td class="num">' +
        (l.med == null ? '' : esc(F.moeda(l.med))) + '</td><td class="num">' + esc(F.dmoeda(l.d)) + '</td><td class="num">' + esc(F.dpct(l.dp)) + '</td><td class="num">' + (l.dh == null ? '' : esc(F.dint(l.dh))) + '</td></tr>');
    });
    html.push('</tbody></table></div>');
    const wrap = PF.h('<div>' + html.join('') + '</div>');
    wrap.addEventListener('click', e => {
      const t = e.target.closest('.tog');
      if (t) { const p = linhas[+t.dataset.i].no.path; if (st.exp.has(p)) st.exp.delete(p); else st.exp.add(p); PF.render(); return; }
      const m = e.target.closest('[data-mat]');
      if (m) PF.abrirFicha(m.dataset.mat);
    });
    cart.corpo.appendChild(wrap);

    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', () => {
      const out = [];
      (function todos(no, caminho) {
        const cam = no.tipo ? Object.assign({}, caminho, { [no.tipo]: no.nome }) : caminho;
        const b = B.idx.get(no.path), v = PF.val(no.a), vb = b ? PF.val(b.a) : null;
        out.push(Object.assign({ nivel: no.tipo || 'Total', colab: '', mat: '', hc: no.mats.size, v, vb }, cam));
        [...no.filhos.values()].forEach(f => todos(f, cam));
        if (st.estPess) no.pess.forEach((p, m) => { const pb = pAnt.get(m); out.push(Object.assign({ nivel: 'Colaborador', colab: PF.nome(p.s), mat: m, hc: 1, v: PF.val(p.a), vb: pb ? PF.val(pb) : null }, cam)); });
      })(A.raiz, {});
      PF.baixarCsv('estrutura-' + c, [
        { k: 'nivel', rot: 'Nível' }, { k: 'Diretoria', rot: 'Diretoria' }, { k: 'Coordenação', rot: 'Coordenação' }, { k: 'Supervisão', rot: 'Supervisão' }, { k: 'Núcleo', rot: 'Núcleo' },
        { k: 'colab', rot: 'Colaborador' }, { k: 'mat', rot: 'Matrícula' }, { k: 'hc', rot: 'Pessoas' }, { k: 'v', rot: rotMed() + ' ' + c }, { k: 'vb', rot: rotMed() + ' ' + (cc || 'comparação') },
      ], out);
    });
    cart.acoes.appendChild(bx);
    PF.aviso(el, 'Níveis em branco no arquivo são pulados: o colaborador sem supervisão ou núcleo aparece diretamente na unidade acima.', 'nota');
  };

  /* ================= EVOLUÇÃO ================= */
  T.evolucao = function (el) {
    const st = PF.st, db = PF.db;
    st.evGran = st.evGran || 'mes'; st.evModo = st.evModo || 'valor'; st.evQuebra = st.evQuebra || ''; st.evInd = st.evInd || 'medida'; st.evJan = st.evJan || '24';
    if ((st.evModo === 'acum' || st.evModo === 'movel') && st.evGran !== 'mes') st.evGran = 'mes';
    const gran = st.evGran, modo = st.evModo, ind = st.evInd;
    const comps = db.comps, nC = comps.length;

    const ctl = PF.h('<div class="ferramentas"></div>');
    const muda = k => v => { st[k] = v; PF.render(); };
    ctl.appendChild(PF.select('Indicador', 'ev-ind', [['medida', rotMed()], ['hc', 'Colaboradores na folha'], ['medio', 'Média por colaborador']], ind, muda('evInd')));
    ctl.appendChild(PF.select('Período', 'ev-gran', [['mes', 'Mês'], ['tri', 'Trimestre'], ['sem', 'Semestre'], ['ano', 'Ano']], gran, muda('evGran')));
    ctl.appendChild(PF.select('Leitura', 'ev-modo', [['valor', 'Valor do período'], ['acum', 'Acumulado no ano'], ['movel', '12 meses móveis'], ['var', 'Variação sobre o ano anterior']], modo, muda('evModo')));
    ctl.appendChild(PF.select('Separar por', 'ev-quebra', [['', 'Total, sem separar'], ['dir', 'Diretoria'], ['coord', 'Coordenação'], ['superv', 'Supervisão'], ['nucleo', 'Núcleo'], ['vinculo', 'Vínculo'], ['cargo', 'Cargo'], ['tf', 'Tipo de folha']], st.evQuebra, muda('evQuebra')));
    if (gran === 'mes') ctl.appendChild(PF.select('Janela', 'ev-jan', [['12', '12 meses'], ['24', '24 meses'], ['36', '36 meses'], ['0', 'Tudo']], st.evJan, muda('evJan')));

    const gfn = !st.evQuebra ? () => 'Total' : st.evQuebra === 'tf' ? (s, x) => x.tf : PF.DIMS[st.evQuebra].f;
    const M = new Map();
    comps.forEach((c, i) => { PF.porGrupo(c, gfn).forEach((a, g) => { let arr = M.get(g); if (!arr) M.set(g, (arr = new Array(nC).fill(null))); arr[i] = a; }); });

    const esperado = { mes: 1, tri: 3, sem: 6, ano: 12 }[gran];
    const chave = c => { const y = c.slice(0, 4), m = +c.slice(5); return gran === 'mes' ? c : gran === 'tri' ? y + '-T' + Math.ceil(m / 3) : gran === 'sem' ? y + '-S' + (m <= 6 ? 1 : 2) : y; };
    const rotP = k => (gran === 'mes' ? F.comp(k) : gran === 'ano' ? k : k.slice(5) + '/' + k.slice(2, 4));
    const per = [], pIdx = new Map();
    comps.forEach((c, i) => { const k = chave(c); let p = pIdx.get(k); if (!p) { p = { k, idx: [] }; pIdx.set(k, p); per.push(p); } p.idx.push(i); });
    per.forEach(p => { p.parcial = p.idx.length < esperado; p.rot = rotP(p.k) + (p.parcial ? '*' : ''); });

    function vp(arr, idxs, mediaHc) {
      let s = 0, h = 0, ult = null, n = 0;
      for (const i of idxs) { const a = arr[i]; if (!a) continue; n++; s += PF.val(a, ind === 'medio' ? 'custo' : undefined); h += a.hc; ult = a.hc; }
      if (!n) return null;
      if (ind === 'hc') return mediaHc ? h / n : ult;
      if (ind === 'medio') return h ? s / h : null;
      return s;
    }
    function valor(arr, p) {
      const fim = p.idx[p.idx.length - 1];
      if (modo === 'acum') { const y = comps[fim].slice(0, 4); const ids = []; for (let i = 0; i <= fim; i++) if (comps[i].slice(0, 4) === y) ids.push(i); return vp(arr, ids); }
      if (modo === 'movel') { if (fim < 11) return null; const ids = []; for (let i = fim - 11; i <= fim; i++) ids.push(i); return vp(arr, ids, true); }
      if (modo === 'var') {
        const ka = (+p.k.slice(0, 4) - 1) + p.k.slice(4), q = pIdx.get(ka);
        if (!q || q.idx.length !== p.idx.length) return null;
        const v1 = vp(arr, p.idx), v0 = vp(arr, q.idx);
        return v0 && v1 != null ? v1 / v0 - 1 : null;
      }
      return vp(arr, p.idx);
    }
    const jan = gran === 'mes' && +st.evJan ? per.slice(-(+st.evJan)) : per;
    const janIdx = [];
    jan.forEach(p => p.idx.forEach(i => janIdx.push(i)));

    /* limita a sete séries e junta o restante em "Outras" */
    let grupos = [...M.keys()];
    const peso = g => { let t = 0; for (const i of janIdx) { const a = M.get(g)[i]; if (a) t += ind === 'hc' ? a.hc : Math.abs(PF.val(a)); } return t; };
    grupos.sort((a, b) => peso(b) - peso(a));
    if (grupos.length > 8) {
      const resto = grupos.slice(7), arr = new Array(nC).fill(null);
      for (const g of resto) M.get(g).forEach((a, i) => { if (!a) return; if (!arr[i]) arr[i] = PF.zero(); PF.somar(arr[i], a); arr[i].hc += a.hc; });
      grupos = grupos.slice(0, 7);
      M.set('\u0000outras', arr);
      grupos.push('\u0000outras');
    }
    const nomeG = g => (g === '\u0000outras' ? 'Outras' : PF.rotulo(g));
    const ordemCor = grupos.filter(g => g !== '\u0000outras').slice().sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
    const cor = g => (g === '\u0000outras' ? PF.COR_OUTRAS : PF.CORES[ordemCor.indexOf(g) % 8]);

    const fmt = modo === 'var' ? F.dpct : ind === 'hc' ? (modo === 'movel' ? F.num1 : F.int) : F.moeda;
    const fy = modo === 'var' ? F.dpct : ind === 'hc' ? F.int : F.compacto;
    const series = grupos.map(g => ({ name: nomeG(g), data: jan.map(p => { const v = valor(M.get(g), p); return v == null ? null : modo === 'var' ? Math.round(v * 10000) / 10000 : Math.round(v * 100) / 100; }) }));
    const rotInd = ind === 'medida' ? rotMed() : ind === 'hc' ? 'Colaboradores na folha' : 'Custo médio por colaborador';
    const rotModo = { valor: 'valor do período', acum: 'acumulado no ano', movel: ind === 'hc' ? 'média de 12 meses' : 'soma de 12 meses móveis', var: 'variação sobre o mesmo período do ano anterior' }[modo];
    const cart = PF.cartao(el, 'Evolução', rotInd + ', ' + rotModo);
    cart.corpo.appendChild(ctl);

    const temDado = series.some(s => s.data.some(v => v != null));
    if (!temDado) {
      PF.aviso(cart.corpo, modo === 'movel' ? 'A leitura de 12 meses móveis exige ao menos 12 competências carregadas.' : modo === 'var' ? 'A comparação com o ano anterior exige o mesmo período carregado nos dois anos.' : 'Sem dados para os filtros atuais.', 'nota');
    } else {
      const linha = !(series.length === 1 && modo === 'valor');
      const anot = [];
      if (gran === 'mes') PF.marcos.forEach(m => { if (jan.some(p => p.k === m.competencia)) anot.push({ x: F.comp(m.competencia), borderColor: '#1f4068', strokeDashArray: 0, label: { text: m.nome, orientation: 'horizontal', borderColor: '#1f4068', style: { color: '#fff', background: '#1f4068', fontSize: '12px' } } }); });
      PF.graf(cart.corpo, {
        chart: { type: linha ? 'line' : 'bar' },
        series,
        colors: grupos.map(cor),
        xaxis: { categories: jan.map(p => p.rot) },
        markers: { size: linha ? (jan.length <= 36 ? 4 : 0) : 0 },
        plotOptions: { bar: { columnWidth: PF.larguraColuna(jan.length) } },
        legend: { show: series.length > 1 },
        annotations: { xaxis: anot },
        _fy: fy, _ft: v => fmt(v),
      }, 360);
    }
    if (per.some(p => p.parcial) && gran !== 'mes') PF.aviso(cart.corpo, 'Períodos marcados com * estão incompletos: nem todos os meses foram carregados.', 'nota');

    const aditivo = ind !== 'medio' && modo !== 'var' && grupos.length > 1;
    const cols = [{ k: 'rot', rot: 'Período', v: l => l.ord, html: l => esc(l.rot), csv: l => l.rot }];
    grupos.forEach((g, i) => cols.push({ k: 'g' + i, rot: nomeG(g), t: 'num', html: (l, v) => (v == null ? '<span class="mudo">–</span>' : esc(fmt(v))) }));
    if (aditivo) cols.push({ k: 'tot', rot: 'Total', t: 'num', html: (l, v) => (v == null ? '<span class="mudo">–</span>' : '<strong>' + esc(fmt(v)) + '</strong>') });
    const lin = jan.map((p, pi) => { const l = { rot: p.rot, ord: pi }; let t = 0, tem = false; grupos.forEach((g, i) => { const v = valor(M.get(g), p); l['g' + i] = v; if (v != null) { t += v; tem = true; } }); l.tot = tem ? t : null; return l; });
    PF.cartaoTabela(el, 'Valores por período', null, { cols, linhas: lin, ordem: { k: 'rot', dir: -1 }, limite: 36, exportar: 'evolucao' });

    /* marcos de gestão */
    const cm = PF.cartao(el, 'Marcos de gestão', 'Datas definidas por você para comparar o antes e o depois. Ficam guardadas neste navegador e aparecem como linhas no gráfico mensal.');
    const form = PF.h('<form class="ferramentas" id="form-marco"><label class="campo"><span>Nome do marco</span><input type="text" id="marco-nome" maxlength="40" placeholder="Ex.: data-base do reajuste" required></label></form>');
    const selC = PF.select('Competência', 'marco-comp', comps.slice().reverse().map(k => [k, F.comp(k)]), st.comp, () => {});
    form.appendChild(selC);
    form.appendChild(PF.h('<button type="submit" class="btn btn-primario">Adicionar marco</button>'));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const nome = form.querySelector('#marco-nome').value.trim();
      if (!nome) return;
      PF.marcos.push({ nome, competencia: form.querySelector('#marco-comp').value });
      PF.salvarMarcos(); PF.render();
    });
    cm.corpo.appendChild(form);
    const lm = PF.marcos.map((m, i) => {
      const ci = comps.indexOf(m.competencia);
      const l = { i, nome: m.nome, comp: m.competencia, nA: 0, nD: 0, a: null, d: null, dp: null, hA: null, hD: null };
      if (ci >= 0) {
        const media = ids => { let s = 0, h = 0, n = 0; ids.forEach(k => { const t = PF.total(comps[k]); s += PF.val(t); h += t.hc; n++; }); return n ? { v: s / n, h: h / n, n } : null; };
        const antes = [], depois = [];
        for (let k = Math.max(0, ci - 6); k < ci; k++) antes.push(k);
        for (let k = ci; k < Math.min(nC, ci + 6); k++) depois.push(k);
        const A = media(antes), D = media(depois);
        if (A) { l.a = A.v; l.hA = A.h; l.nA = A.n; }
        if (D) { l.d = D.v; l.hD = D.h; l.nD = D.n; }
        if (A && D && A.v) l.dp = D.v / A.v - 1;
      }
      return l;
    });
    const tm = PF.tabela(cm.corpo, {
      cols: [
        { k: 'nome', rot: 'Marco' }, { k: 'comp', rot: 'Competência', html: l => esc(F.comp(l.comp)) },
        { k: 'a', rot: 'Média mensal antes', t: 'moeda', dica: rotMed() + ': média dos até 6 meses anteriores ao marco' }, { k: 'nA', rot: 'Meses', t: 'int' },
        { k: 'd', rot: 'Média mensal depois', t: 'moeda', dica: rotMed() + ': média dos até 6 meses a partir do marco' }, { k: 'nD', rot: 'Meses', t: 'int' },
        { k: 'dp', rot: 'Variação %', t: 'dpct' }, { k: 'hA', rot: 'Pessoas antes', html: (l, v) => esc(F.num1(v)) }, { k: 'hD', rot: 'Pessoas depois', html: (l, v) => esc(F.num1(v)) },
        { k: 'x', rot: '', semCsv: true, html: l => '<button type="button" class="link" data-rm="' + l.i + '">Remover</button>' },
      ],
      linhas: lm, vazio: 'Nenhum marco definido.',
    });
    tm.el.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { PF.marcos.splice(+b.dataset.rm, 1); PF.salvarMarcos(); PF.render(); } });
    if (lm.length) PF.aviso(cm.corpo, 'Antes e depois comparam a média mensal de ' + rotMed().toLowerCase() + ' em até seis meses de cada lado, sob os filtros atuais. O mês do marco conta como depois.', 'nota');
  };

  /* ================= VARIAÇÕES ================= */
  T.variacoes = function (el) {
    const st = PF.st, db = PF.db, B = st.comp, A = PF.compCmp();
    if (!A) { const c = PF.cartao(el, 'Variações entre competências'); PF.aviso(c.corpo, 'Não há competência de comparação carregada para ' + F.comp(B) + '. Carregue o mês anterior ou altere "Comparar com".', 'nota'); return; }
    const w = PF.MEDIDAS[st.medida].w;
    const sA = PF.pessoasDe(A), sB = PF.pessoasDe(B);
    const baseA = db.pessoas.get(A) || new Map(), baseB = db.pessoas.get(B) || new Map();
    const vA = PF.val(PF.total(A)), vB = PF.val(PF.total(B));

    let adm = 0, trIn = 0, sai = 0, trOut = 0, nAdm = 0, nTrIn = 0, nSai = 0, nTrOut = 0, nPerm = 0;
    sB.forEach((p, m) => { if (sA.has(m)) { nPerm++; return; } if (baseA.has(m)) { trIn += PF.val(p); nTrIn++; } else { adm += PF.val(p); nAdm++; } });
    sA.forEach((p, m) => { if (sB.has(m)) return; if (baseB.has(m)) { trOut -= PF.val(p); nTrOut++; } else { sai -= PF.val(p); nSai++; } });

    const rubPerm = new Map(), rubTodos = new Map();
    for (const f of db.fatos) {
      if (f.c !== A && f.c !== B) continue;
      const k = w[f.r.cls];
      if (!k || !PF.passa(f)) continue;
      const v = k * f.v * (f.c === B ? 1 : -1);
      let t = rubTodos.get(f.cod);
      if (!t) rubTodos.set(f.cod, (t = { cod: f.cod, desc: f.r.desc, cls: f.r.cls, a: 0, b: 0 }));
      if (f.c === B) t.b += k * f.v; else t.a += k * f.v;
      if (sA.has(f.m) && sB.has(f.m)) rubPerm.set(f.cod, (rubPerm.get(f.cod) || 0) + v);
    }
    const perm = [...rubPerm].map(([cod, d]) => ({ cod, d, rot: (db.rub.get(cod).desc || cod) })).filter(x => Math.abs(d0(x.d)) > 0).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    function d0(v) { return Math.round(v * 100) / 100; }
    const topo = perm.slice(0, 6), demais = perm.slice(6).reduce((s, x) => s + x.d, 0);

    const passos = [{ rot: F.comp(A), tipo: 'total', v: vA }];
    if (nAdm) passos.push({ rot: 'Entradas na folha (' + nAdm + ')', v: adm });
    if (nTrIn) passos.push({ rot: 'Vindos de fora do filtro (' + nTrIn + ')', v: trIn });
    if (nSai) passos.push({ rot: 'Saídas da folha (' + nSai + ')', v: sai });
    if (nTrOut) passos.push({ rot: 'Idos para fora do filtro (' + nTrOut + ')', v: trOut });
    topo.forEach(x => passos.push({ rot: x.rot, v: x.d }));
    if (Math.abs(demais) > 0.005) passos.push({ rot: 'Demais rubricas', v: demais });
    passos.push({ rot: F.comp(B), tipo: 'total', v: vB });

    const g = PF.grade(el, 'g-ind');
    PF.indicador(g, { rot: rotMed() + ' em ' + F.comp(A), valor: vA });
    PF.indicador(g, { rot: rotMed() + ' em ' + F.comp(B), valor: vB, ant: vA, rotAnt: F.comp(A) });
    PF.indicador(g, { rot: 'Entradas e saídas de pessoas', valor: adm + trIn + sai + trOut, fmt: F.dmoeda, nota: 'Efeito de quem entrou ou saiu do recorte entre as duas competências.' });
    PF.indicador(g, { rot: 'Quem permaneceu (' + F.int(nPerm) + ')', valor: perm.reduce((s, x) => s + x.d, 0), fmt: F.dmoeda, nota: 'Variação das rubricas de quem está nas duas competências.' });

    const cw = PF.cartao(el, 'De ' + F.comp(A) + ' a ' + F.comp(B), 'Como a diferença de ' + rotMed().toLowerCase() + ' se decompõe. As parcelas somam exatamente a diferença.');
    let ac = 0;
    const dados = passos.map(p => {
      if (p.tipo === 'total') { ac = p.v; return { x: p.rot, y: [0, Math.round(p.v)], fillColor: PF.COR_TOTAL, _v: p.v, _t: true }; }
      const de = ac; ac += p.v;
      return { x: p.rot, y: [Math.round(Math.min(de, ac)), Math.round(Math.max(de, ac))], fillColor: p.v >= 0 ? PF.COR_ALTA : PF.COR_BAIXA, _v: p.v };
    });
    const faixa = dados.reduce((r, d) => [Math.min(r[0], d._t ? d.y[1] : d.y[0]), Math.max(r[1], d.y[1])], [Infinity, -Infinity]);
    const folga = (faixa[1] - faixa[0]) * 0.25 || faixa[1] * 0.05 || 1;
    PF.graf(cw.corpo, {
      chart: { type: 'rangeBar' },
      series: [{ name: rotMed(), data: dados }],
      stroke: { width: 0 },
      plotOptions: { bar: { horizontal: false, columnWidth: PF.larguraColuna(dados.length), borderRadius: 2 } },
      xaxis: { labels: { rotate: -35, rotateAlways: dados.length > 6, trim: true, maxHeight: 110, hideOverlappingLabels: false } },
      yaxis: { min: Math.max(0, Math.floor(faixa[0] - folga)), max: Math.ceil(faixa[1] + folga * 0.2), labels: { formatter: v => F.compacto(v) } },
      legend: { show: false },
      tooltip: { shared: false, intersect: true, custom: o => { const d = dados[o.dataPointIndex]; return '<div class="dica"><strong>' + esc(d._t ? F.moeda(d._v) : F.dmoeda(d._v)) + '</strong><br>' + esc(d.x) + '</div>'; } },
    }, 380);
    cw.corpo.appendChild(PF.h('<p class="legenda-manual"><span><i style="background:' + PF.COR_TOTAL + '"></i>Total da competência</span><span><i style="background:' + PF.COR_ALTA + '"></i>Aumento</span><span><i style="background:' + PF.COR_BAIXA + '"></i>Redução</span><span class="mudo">O eixo vertical não começa em zero, para dar leitura às parcelas.</span></p>'));
    PF.tabela(cw.corpo, {
      cols: [{ k: 'rot', rot: 'Parcela' }, { k: 'v', rot: 'Valor', html: (l, v) => esc(l.tipo === 'total' ? F.moeda(v) : F.dmoeda(v)) }],
      linhas: passos, limite: 30,
    });

    /* por unidade */
    st.varDim = st.varDim || 'coord';
    const fn = PF.DIMS[st.varDim].f;
    const U = new Map();
    const u = k => { let x = U.get(k); if (!x) U.set(k, (x = { k, un: PF.rotulo(k), a: 0, b: 0, ent: 0, sai: 0, perm: 0 })); return x; };
    sA.forEach((p, m) => { const ka = fn(p.s), q = sB.get(m); u(ka).a += PF.val(p); if (!q || fn(q.s) !== ka) u(ka).sai -= PF.val(p); });
    sB.forEach((p, m) => { const kb = fn(p.s), q = sA.get(m); u(kb).b += PF.val(p); if (!q || fn(q.s) !== kb) u(kb).ent += PF.val(p); else u(kb).perm += PF.val(p) - PF.val(q); });
    const lu = [...U.values()].map(x => Object.assign(x, { d: x.b - x.a, dp: x.a ? (x.b - x.a) / Math.abs(x.a) : null }));
    const cu = PF.cartaoTabela(el, 'Variação por unidade', 'Entradas e saídas incluem admissões, desligamentos e mudanças de lotação.', {
      cols: [
        { k: 'un', rot: PF.DIMS[st.varDim].rot }, { k: 'a', rot: F.comp(A), t: 'moeda' }, { k: 'b', rot: F.comp(B), t: 'moeda' }, { k: 'd', rot: 'Variação', t: 'dmoeda' }, { k: 'dp', rot: 'Variação %', t: 'dpct' },
        { k: 'ent', rot: 'Entradas', t: 'dmoeda' }, { k: 'sai', rot: 'Saídas', t: 'dmoeda' }, { k: 'perm', rot: 'Quem permaneceu', t: 'dmoeda' },
      ],
      linhas: lu, ordem: { k: 'd', dir: -1 }, limite: 25, exportar: 'variacao-unidades-' + A + '-' + B,
    });
    cu.acoes.prepend(PF.select('Agrupar por', 'var-dim', ['dir', 'coord', 'superv', 'nucleo', 'uo', 'cc', 'cargo', 'vinculo'].map(k => [k, PF.DIMS[k].rot]), st.varDim, v => { st.varDim = v; PF.render(); }));

    /* por colaborador */
    const lp = [];
    sB.forEach((p, m) => { const q = sA.get(m); lp.push({ m, nome: PF.nome(p.s), un: PF.lotacao(p.s), sit: q ? 'Permanece' : baseA.has(m) ? 'Veio de fora do filtro' : 'Entrou na folha', a: q ? PF.val(q) : null, b: PF.val(p), d: PF.val(p) - (q ? PF.val(q) : 0) }); });
    sA.forEach((p, m) => { if (!sB.has(m)) lp.push({ m, nome: PF.nome(p.s), un: PF.lotacao(p.s), sit: baseB.has(m) ? 'Foi para fora do filtro' : 'Saiu da folha', a: PF.val(p), b: null, d: -PF.val(p) }); });
    lp.forEach(l => { l.abs = Math.abs(l.d); });
    PF.cartaoTabela(el, 'Variação por colaborador', 'Ordenada pelo tamanho da variação. Clique para abrir a ficha.', {
      cols: [
        { k: 'nome', rot: 'Colaborador' }, { k: 'un', rot: 'Lotação' }, { k: 'sit', rot: 'Situação entre os meses' }, { k: 'a', rot: F.comp(A), t: 'moeda' }, { k: 'b', rot: F.comp(B), t: 'moeda' },
        { k: 'd', rot: 'Variação', t: 'dmoeda' }, { k: 'abs', rot: 'Tamanho', t: 'barra' },
      ],
      linhas: lp, ordem: { k: 'abs', dir: -1 }, limite: 25, exportar: 'variacao-colaboradores-' + A + '-' + B, aoClicar: l => PF.abrirFicha(l.m),
    });

    /* por rubrica */
    const lr = [...rubTodos.values()].map(t => Object.assign(t, { d: t.b - t.a, cl: PF.CLASSES[t.cls], abs: Math.abs(t.b - t.a) }));
    PF.cartaoTabela(el, 'Variação por rubrica', 'Todos os colaboradores do recorte, inclusive quem entrou ou saiu.', {
      cols: [{ k: 'cod', rot: 'Código' }, { k: 'desc', rot: 'Rubrica' }, { k: 'cl', rot: 'Classe' }, { k: 'a', rot: F.comp(A), t: 'moeda' }, { k: 'b', rot: F.comp(B), t: 'moeda' }, { k: 'd', rot: 'Variação', t: 'dmoeda' }, { k: 'abs', rot: 'Tamanho', t: 'barra' }],
      linhas: lr, ordem: { k: 'abs', dir: -1 }, limite: 20, exportar: 'variacao-rubricas-' + A + '-' + B,
    });
  };
})();

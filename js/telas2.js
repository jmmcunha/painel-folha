/* Telas de pessoas e composição: colaboradores, ficha, movimentação, cargos e rubricas. */
(function () {
  'use strict';
  const PF = window.PF, F = PF.f, esc = PF.esc;
  const T = (PF.telas = PF.telas || {});
  const rotMed = () => PF.MEDIDAS[PF.st.medida].rot;
  const mesDe = n => (n ? Math.floor(n / 10000) + '-' + String(Math.floor(n / 100) % 100).padStart(2, '0') : null);

  PF.abrirFicha = function (mat) { PF.st.ficha = mat; PF.ir('colab'); };

  /* ================= COLABORADORES ================= */
  T.colab = function (el) {
    const st = PF.st, c = st.comp;
    if (st.ficha) return ficha(el, st.ficha);
    const lin = [...PF.pessoasDe(c).values()].map(p => ({
      m: p.m, nome: PF.nome(p.s), cargo: p.s.cargo, coord: p.s.coord, superv: p.s.superv, vinc: p.s.vinculo, sit: p.s.situacao, adm: p.s.adm,
      sal: p.s.salBase, bruto: p.P, desc: p.D, liq: p.P - p.D, custo: PF.val(p, 'custo'),
      _b: PF.norm(p.s.mat + ' ' + (st.ocultar ? '' : p.s.nome) + ' ' + p.s.cargo + ' ' + p.s.coord + ' ' + p.s.superv),
    }));
    const cart = PF.cartao(el, 'Colaboradores', F.int(lin.length) + ' na folha de ' + F.comp(c) + '. Clique em uma linha para abrir a ficha.');
    const busca = PF.h('<div class="ferramentas"><label class="campo largo"><span>Buscar por nome, matrícula, cargo ou unidade</span><input type="search" id="colab-busca" autocomplete="off"></label></div>');
    cart.corpo.appendChild(busca);
    const inp = busca.querySelector('input');
    inp.value = st.busca || '';
    const corpo = PF.h('<div></div>');
    cart.corpo.appendChild(corpo);
    let tab;
    function desenha() {
      const q = PF.norm(st.busca || '').split(' ').filter(Boolean);
      const f = q.length ? lin.filter(l => q.every(t => l._b.indexOf(t) >= 0)) : lin;
      corpo.innerHTML = '';
      tab = PF.tabela(corpo, {
        cols: [
          { k: 'm', rot: 'Matrícula' }, { k: 'nome', rot: 'Nome' }, { k: 'cargo', rot: 'Cargo' }, { k: 'coord', rot: 'Coordenação' }, { k: 'superv', rot: 'Supervisão' },
          { k: 'vinc', rot: 'Vínculo' }, { k: 'sit', rot: 'Situação' }, { k: 'adm', rot: 'Admissão', t: 'data' }, { k: 'sal', rot: 'Salário-base', t: 'moeda2' },
          { k: 'bruto', rot: 'Bruto', t: 'moeda2' }, { k: 'desc', rot: 'Descontos', t: 'moeda2' }, { k: 'liq', rot: 'Líquido', t: 'moeda2' }, { k: 'custo', rot: 'Custo total', t: 'moeda2' },
        ],
        linhas: f, ordem: { k: 'nome', dir: 1 }, limite: 50, exportar: 'colaboradores-' + c, aoClicar: l => PF.abrirFicha(l.m),
        vazio: 'Nenhum colaborador encontrado.',
      });
    }
    desenha();
    inp.addEventListener('input', () => { st.busca = inp.value; desenha(); });
    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', () => tab.exportar());
    cart.acoes.appendChild(bx);
  };

  function ficha(el, mat) {
    const st = PF.st, db = PF.db;
    const hist = [];
    db.comps.forEach(c => {
      const a = PF.zero();
      let s = null;
      for (const x of db.porComp.get(c)) if (x.m === mat && (st.tf === '*' || x.tf === st.tf)) { PF.somar(a, x); s = s || x.s; }
      if (s) hist.push({ c, s, a });
    });
    const volta = PF.h('<p><button type="button" class="btn btn-texto">← Voltar à lista</button></p>');
    volta.querySelector('button').addEventListener('click', () => { st.ficha = null; PF.render(); });
    el.appendChild(volta);
    if (!hist.length) { PF.aviso(el, 'Não há lançamentos para a matrícula ' + mat + ' com o tipo de folha selecionado.', 'nota'); return; }
    const noMes = hist.find(h => h.c === st.comp);
    const ref = noMes || hist[hist.length - 1];
    const s = ref.s;

    const cab = PF.cartao(el, PF.nome(s), 'Matrícula ' + s.mat + (s.cargo ? ' · ' + s.cargo : ''));
    if (!noMes) PF.aviso(cab.corpo, 'Sem lançamentos em ' + F.comp(st.comp) + '. Os dados abaixo são de ' + F.comp(ref.c) + ', a competência mais recente deste colaborador.', 'nota');
    const dl = PF.h('<dl class="ficha"></dl>');
    const item = (rot, v) => { if (v == null || v === '') return; const d = PF.h('<div><dt></dt><dd></dd></div>'); d.querySelector('dt').textContent = rot; d.querySelector('dd').textContent = v; dl.appendChild(d); };
    item('Lotação', PF.lotacao(s));
    item('Unidade organizacional', s.uo);
    item('Centro de custo', s.cc);
    item('Vínculo', s.vinculo);
    item('Situação', s.situacao);
    item('Admissão', s.adm ? F.data(s.adm) : '');
    item('Tempo de casa', s.tempo == null ? '' : s.tempo + (s.tempo === 1 ? ' ano' : ' anos'));
    item('Desligamento', s.desl ? F.data(s.desl) + (s.tipoDesl ? ' · ' + s.tipoDesl : '') : '');
    item('Jornada semanal', s.jornada == null ? '' : F.int(s.jornada) + ' h');
    item('Salário-base', s.salBase == null ? '' : F.moeda2(s.salBase));
    item('Posição na tabela salarial', s.posTab);
    cab.corpo.appendChild(dl);

    const gi = PF.grade(el, 'g-ind');
    const iAnt = hist.indexOf(ref) - 1, ant = iAnt >= 0 ? hist[iAnt] : null;
    const ind = (rot, fv) => PF.indicador(gi, { rot: rot + ' em ' + F.comp(ref.c), valor: fv(ref.a), fmt: F.moeda2, ant: ant ? fv(ant.a) : null, rotAnt: ant ? F.comp(ant.c) : null, serie: hist.slice(-12).map(h => fv(h.a)) });
    ind('Remuneração bruta', a => a.P);
    ind('Descontos', a => a.D);
    ind('Líquido', a => a.P - a.D);
    ind('Custo total', a => PF.val(a, 'custo'));

    const g2 = PF.grade(el, 'g-2');
    const ch = PF.cartao(g2, 'Histórico mensal', 'Custo total, remuneração bruta e líquido');
    PF.graf(ch.corpo, {
      chart: { type: 'line' },
      series: [
        { name: 'Custo total', data: hist.map(h => Math.round(PF.val(h.a, 'custo') * 100) / 100) },
        { name: 'Remuneração bruta', data: hist.map(h => Math.round(h.a.P * 100) / 100) },
        { name: 'Líquido', data: hist.map(h => Math.round((h.a.P - h.a.D) * 100) / 100) },
      ],
      xaxis: { categories: hist.map(h => F.comp(h.c)) },
      markers: { size: hist.length <= 36 ? 4 : 0 },
      _ft: v => F.moeda2(v),
    }, 300);

    /* alterações cadastrais */
    const campos = [['cargo', 'Cargo'], ['lot', 'Lotação'], ['salBase', 'Salário-base'], ['vinculo', 'Vínculo'], ['situacao', 'Situação'], ['jornada', 'Jornada semanal']];
    const pega = (x, k) => (k === 'lot' ? PF.lotacao(x) : x[k]);
    const alt = [];
    for (let i = 1; i < hist.length; i++) {
      for (const [k, rot] of campos) {
        const a = pega(hist[i - 1].s, k), b = pega(hist[i].s, k);
        if (a === b || (a == null && b == null)) continue;
        const num = k === 'salBase';
        alt.push({ ord: i, c: hist[i].c, campo: rot, de: num ? F.moeda2(a) : (a == null || a === '' ? '–' : String(a)), para: num ? F.moeda2(b) : (b == null || b === '' ? '–' : String(b)), dp: num && a ? (b - a) / a : null });
      }
    }
    const ca = PF.cartao(g2, 'Alterações cadastrais', 'Mudanças detectadas entre competências consecutivas carregadas');
    PF.tabela(ca.corpo, {
      cols: [{ k: 'c', rot: 'Competência', v: l => l.ord, html: l => esc(F.comp(l.c)) }, { k: 'campo', rot: 'Campo' }, { k: 'de', rot: 'De' }, { k: 'para', rot: 'Para' }, { k: 'dp', rot: 'Variação', t: 'dpct' }],
      linhas: alt, ordem: { k: 'c', dir: -1 }, limite: 12, vazio: 'Nenhuma alteração detectada no período carregado.',
    });

    /* contracheque */
    const fat = db.fatos.filter(f => f.c === ref.c && f.m === mat && (st.tf === '*' || f.tf === st.tf));
    const cc = PF.cartao(el, 'Lançamentos de ' + F.comp(ref.c), 'Rubricas agrupadas pela classe do dicionário');
    const cols = [{ k: 'cod', rot: 'Código' }, { k: 'desc', rot: 'Rubrica' }, { k: 'tf', rot: 'Tipo de folha' }, { k: 'ref', rot: 'Referência', html: (l, v) => (v == null ? '' : esc(F.num1(v))) , t: 'num' }, { k: 'v', rot: 'Valor', t: 'moeda2' }];
    for (const cl of PF.ORDEM_CLASSES) {
      const lin = fat.filter(f => f.r.cls === cl).map(f => ({ cod: f.cod, desc: f.r.desc, tf: f.tf, ref: f.ref, v: f.v }));
      if (!lin.length) continue;
      const tot = lin.reduce((t, l) => t + l.v, 0);
      const bloco = PF.h('<details class="bloco"' + (cl === 'I' || cl === 'V' ? '' : ' open') + '><summary><span></span><strong></strong></summary></details>');
      bloco.querySelector('span').textContent = PF.CLASSES[cl] + ' (' + lin.length + ')';
      bloco.querySelector('strong').textContent = cl === 'I' ? '' : F.moeda2(tot);
      PF.tabela(bloco, { cols, linhas: lin, limite: 100 });
      cc.corpo.appendChild(bloco);
    }
    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', () => PF.baixarCsv('lancamentos-' + mat + '-' + ref.c, [{ k: 'cod', rot: 'Código' }, { k: 'desc', rot: 'Rubrica' }, { k: 'cl', rot: 'Classe' }, { k: 'tf', rot: 'Tipo de folha' }, { k: 'ref', rot: 'Referência' }, { k: 'v', rot: 'Valor' }],
      fat.map(f => ({ cod: f.cod, desc: f.r.desc, cl: PF.CLASSES[f.r.cls], tf: f.tf, ref: f.ref, v: f.v }))));
    cc.acoes.appendChild(bx);
  }

  /* ================= MOVIMENTAÇÃO ================= */
  T.mov = function (el) {
    const st = PF.st, db = PF.db, c = st.comp, i0 = db.comps.indexOf(c);
    const resumo = db.comps.map(k => {
      const P = PF.pessoasDe(k);
      let adm = 0, desl = 0;
      P.forEach(p => { if (mesDe(p.s.adm) === k) adm++; if (mesDe(p.s.desl) === k) desl++; });
      return { c: k, hc: P.size, adm, desl, P };
    });
    const at = resumo[i0], an = i0 > 0 ? resumo[i0 - 1] : null;
    const rot = (a, d, h0, h1) => { const m = ((h0 == null ? h1 : h0) + h1) / 2; return m ? ((a + d) / 2) / m : null; };
    const j12 = resumo.slice(Math.max(0, i0 - 11), i0 + 1);
    const rot12 = (() => { const m = PF.media(j12.map(x => x.hc)); return m ? ((j12.reduce((s, x) => s + x.adm, 0) + j12.reduce((s, x) => s + x.desl, 0)) / 2) / m : null; })();

    const g = PF.grade(el, 'g-ind');
    PF.indicador(g, { rot: 'Colaboradores na folha', valor: at.hc, fmt: F.int, dfmt: F.dint, ant: an ? an.hc : null, rotAnt: an ? F.comp(an.c) : null, serie: j12.map(x => x.hc) });
    PF.indicador(g, { rot: 'Admissões em ' + F.comp(c), valor: at.adm, fmt: F.int, nota: 'Colaboradores com data de admissão dentro da competência.' });
    PF.indicador(g, { rot: 'Desligamentos em ' + F.comp(c), valor: at.desl, fmt: F.int, nota: 'Colaboradores com data de desligamento dentro da competência.' });
    PF.indicador(g, { rot: 'Saldo do mês', valor: at.adm - at.desl, fmt: F.dint });
    PF.indicador(g, { rot: 'Rotatividade do mês', valor: rot(at.adm, at.desl, an ? an.hc : null, at.hc), fmt: F.pct, nota: 'Média entre admissões e desligamentos, dividida pela média de colaboradores do mês anterior e do atual.' });
    PF.indicador(g, { rot: 'Rotatividade em ' + j12.length + (j12.length === 1 ? ' mês' : ' meses'), valor: rot12, fmt: F.pct, nota: 'Mesma fórmula, somando as competências carregadas dos últimos 12 meses.' });

    const jan = resumo.slice(-24);
    const g2 = PF.grade(el, 'g-2');
    const c1 = PF.cartao(g2, 'Colaboradores na folha', 'Por competência');
    PF.graf(c1.corpo, { chart: { type: 'line' }, series: [{ name: 'Colaboradores', data: jan.map(x => x.hc) }], xaxis: { categories: jan.map(x => F.comp(x.c)) }, markers: { size: 4 }, legend: { show: false }, _fy: F.int }, 280);
    const c2 = PF.cartao(g2, 'Admissões e desligamentos', 'Pela data informada no cadastro');
    PF.graf(c2.corpo, {
      chart: { type: 'bar' },
      series: [{ name: 'Admissões', data: jan.map(x => x.adm) }, { name: 'Desligamentos', data: jan.map(x => x.desl) }],
      xaxis: { categories: jan.map(x => F.comp(x.c)) }, stroke: { width: 2, colors: ['#fff'] },
      plotOptions: { bar: { columnWidth: PF.larguraColuna(jan.length) } }, _fy: F.int,
    }, 280);

    const lista = (titulo, sub, filtro, colData, rotData, extra) => {
      const lin = [];
      at.P.forEach(p => { if (filtro(p.s)) lin.push({ m: p.m, nome: PF.nome(p.s), cargo: p.s.cargo, un: PF.lotacao(p.s), dt: p.s[colData], tipo: p.s.tipoDesl, vinc: p.s.vinculo }); });
      const cols = [{ k: 'nome', rot: 'Colaborador', cls: 'nq' }, { k: 'cargo', rot: 'Cargo' }, { k: 'un', rot: 'Lotação', cls: 'largo' }, { k: 'dt', rot: rotData, t: 'data' }];
      if (extra) cols.push({ k: 'tipo', rot: 'Tipo de desligamento' });
      PF.cartaoTabela(g3, titulo, sub, { cols, linhas: lin, ordem: { k: 'dt', dir: 1 }, limite: 15, exportar: titulo.toLowerCase().replace(/\s+/g, '-') + '-' + c, aoClicar: l => PF.abrirFicha(l.m), vazio: 'Nenhum registro na competência.' });
    };
    const g3 = PF.grade(el, 'g-2');
    lista('Admitidos na competência', null, s => mesDe(s.adm) === c, 'adm', 'Admissão');
    lista('Desligados na competência', null, s => mesDe(s.desl) === c, 'desl', 'Desligamento', true);

    const tipos = new Map();
    j12.forEach(x => x.P.forEach(p => { if (mesDe(p.s.desl) === x.c) { const k = PF.rotulo(p.s.tipoDesl); tipos.set(k, (tipos.get(k) || 0) + 1); } }));
    const g4 = PF.grade(el, 'g-13');
    const ct = PF.cartao(g4, 'Desligamentos por tipo', 'Nas ' + j12.length + ' competências até ' + F.comp(c));
    PF.barras(ct.corpo, [...tipos].map(([k, v]) => ({ rot: k, v })).sort((a, b) => b.v - a.v));

    /* movimentações internas em relação à competência anterior */
    const mud = [];
    if (an) {
      const antes = db.pessoas.get(an.c) || new Map();
      at.P.forEach(p => {
        const a = antes.get(p.m);
        if (!a) return;
        const s = p.s;
        if (PF.lotacao(a) !== PF.lotacao(s)) mud.push({ m: p.m, nome: PF.nome(s), tipo: 'Lotação', de: PF.lotacao(a), para: PF.lotacao(s), dp: null });
        if (a.cargo !== s.cargo) mud.push({ m: p.m, nome: PF.nome(s), tipo: 'Cargo', de: a.cargo || '–', para: s.cargo || '–', dp: null });
        if (a.salBase != null && s.salBase != null && Math.abs(a.salBase - s.salBase) > 0.005) mud.push({ m: p.m, nome: PF.nome(s), tipo: 'Salário-base', de: F.moeda2(a.salBase), para: F.moeda2(s.salBase), dp: a.salBase ? (s.salBase - a.salBase) / a.salBase : null });
      });
    }
    PF.cartaoTabela(g4, 'Movimentações internas', an ? 'Mudanças de lotação, cargo e salário-base entre ' + F.comp(an.c) + ' e ' + F.comp(c) : 'Exige a competência anterior carregada', {
      cols: [{ k: 'nome', rot: 'Colaborador' }, { k: 'tipo', rot: 'Mudança' }, { k: 'de', rot: 'De' }, { k: 'para', rot: 'Para' }, { k: 'dp', rot: 'Variação', t: 'dpct' }],
      linhas: mud, ordem: { k: 'tipo', dir: 1 }, limite: 15, exportar: 'movimentacoes-internas-' + c, aoClicar: l => PF.abrirFicha(l.m), vazio: 'Nenhuma mudança detectada.',
    });
  };

  /* ================= CARGOS E SALÁRIOS ================= */
  T.cargos = function (el) {
    const st = PF.st, c = st.comp;
    const P = [...PF.pessoasDe(c).values()];
    const sal = P.map(p => p.s.salBase).filter(v => v != null && v > 0).sort((a, b) => a - b);
    const g = PF.grade(el, 'g-ind');
    const q = (rot, x, nota) => PF.indicador(g, { rot, valor: PF.quantil(sal, x), fmt: F.moeda, nota });
    q('Salário-base: 10% ganham até', 0.1, 'Percentil 10 do salário-base.');
    q('25% ganham até', 0.25, 'Percentil 25.');
    q('Mediana', 0.5, 'Metade dos colaboradores tem salário-base até este valor.');
    q('75% ganham até', 0.75, 'Percentil 75.');
    q('90% ganham até', 0.9, 'Percentil 90.');
    PF.indicador(g, { rot: 'Maior ÷ menor salário-base', valor: sal.length && sal[0] ? sal[sal.length - 1] / sal[0] : null, fmt: v => F.num1(v) + ' vezes' });

    const g2 = PF.grade(el, 'g-2');
    const ch = PF.cartao(g2, 'Distribuição do salário-base', F.int(sal.length) + ' colaboradores com salário-base informado em ' + F.comp(c));
    if (sal.length) {
      const min = sal[0], max = sal[sal.length - 1];
      const bruto = (max - min) / 10 || 1000;
      const passo = [250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000].find(p => p >= bruto) || 100000;
      const ini = Math.floor(min / passo) * passo, n = Math.max(1, Math.ceil((max - ini + 0.01) / passo));
      const cont = new Array(n).fill(0);
      sal.forEach(v => { cont[Math.min(n - 1, Math.floor((v - ini) / passo))]++; });
      PF.graf(ch.corpo, {
        chart: { type: 'bar' }, series: [{ name: 'Colaboradores', data: cont }],
        xaxis: { categories: cont.map((x, i) => F.compacto(ini + i * passo) + ' a ' + F.compacto(ini + (i + 1) * passo)), labels: { rotate: -35, rotateAlways: n > 6 } },
        plotOptions: { bar: { columnWidth: '70%' } }, legend: { show: false }, _fy: F.int,
      }, 300);
    } else PF.aviso(ch.corpo, 'Sem salário-base informado para os filtros atuais.', 'nota');

    const pos = new Map();
    P.forEach(p => { if (p.s.posTab) pos.set(p.s.posTab, (pos.get(p.s.posTab) || 0) + 1); });
    const cp = PF.cartao(g2, 'Posição na tabela salarial', pos.size ? 'Colaboradores por posição' : null);
    if (pos.size) PF.barras(cp.corpo, [...pos].map(([k, v]) => ({ rot: k, v })).sort((a, b) => String(a.rot).localeCompare(String(b.rot), 'pt-BR', { numeric: true })));
    else PF.aviso(cp.corpo, 'A coluna POSIÇÃO TAB SALARIAL veio vazia nos arquivos carregados.', 'nota');

    const porCargo = new Map();
    P.forEach(p => { const k = p.s.cargo; let x = porCargo.get(k); if (!x) porCargo.set(k, (x = { k, cargo: PF.rotulo(k), sal: [], bruto: 0, custo: 0, n: 0 })); x.n++; if (p.s.salBase != null) x.sal.push(p.s.salBase); x.bruto += p.P; x.custo += PF.val(p, 'custo'); });
    const totC = P.reduce((t, p) => t + PF.val(p, 'custo'), 0);
    const lin = [...porCargo.values()].map(x => {
      x.sal.sort((a, b) => a - b);
      const mn = x.sal.length ? x.sal[0] : null, mx = x.sal.length ? x.sal[x.sal.length - 1] : null;
      return { k: x.k, cargo: x.cargo, n: x.n, mn, med: PF.quantil(x.sal, 0.5), avg: PF.media(x.sal), mx, amp: mn ? mx / mn : null, bm: x.n ? x.bruto / x.n : null, custo: x.custo, part: totC ? x.custo / totC : null };
    });
    PF.cartaoTabela(el, 'Cargos', 'Salário-base e custo por cargo em ' + F.comp(c) + '. Clique para ver os colaboradores do cargo.', {
      cols: [
        { k: 'cargo', rot: 'Cargo' }, { k: 'n', rot: 'Pessoas', t: 'int' }, { k: 'mn', rot: 'Menor salário-base', t: 'moeda' }, { k: 'med', rot: 'Mediana', t: 'moeda' }, { k: 'avg', rot: 'Média', t: 'moeda' },
        { k: 'mx', rot: 'Maior', t: 'moeda' }, { k: 'amp', rot: 'Maior ÷ menor', html: (l, v) => (v == null ? '<span class="mudo">–</span>' : esc(F.num1(v))), t: 'num' }, { k: 'bm', rot: 'Bruto médio', t: 'moeda' },
        { k: 'custo', rot: 'Custo total', t: 'barra' }, { k: 'part', rot: '% do custo', t: 'pct' },
      ],
      linhas: lin, ordem: { k: 'custo', dir: -1 }, limite: 30, exportar: 'cargos-' + c,
      aoClicar: l => { st.busca = l.k; st.ficha = null; PF.ir('colab'); },
    });
  };

  /* ================= RUBRICAS ================= */
  T.rubricas = function (el) {
    const st = PF.st, db = PF.db, c = st.comp, cc = PF.compCmp();
    st.rubCls = st.rubCls || 'P';
    const R = new Map();
    for (const f of db.fatos) {
      if ((f.c !== c && f.c !== cc) || !PF.passa(f)) continue;
      let x = R.get(f.cod);
      if (!x) R.set(f.cod, (x = { cod: f.cod, desc: f.r.desc, cls: f.r.cls, cl: PF.CLASSES[f.r.cls], v: 0, a: 0, mats: new Set(), temA: false }));
      if (f.c === c) { x.v += f.v; x.mats.add(f.m); } else { x.a += f.v; x.temA = true; }
    }
    const todas = [...R.values()].filter(x => x.mats.size > 0);
    const totCls = {};
    todas.forEach(x => { totCls[x.cls] = (totCls[x.cls] || 0) + x.v; });

    if (st.rubSel && db.rub.has(st.rubSel)) return detalhe(el, st.rubSel);

    const cart = PF.cartao(el, 'Rubricas', 'Lançamentos de ' + F.comp(c) + (cc ? ', comparados a ' + F.comp(cc) : '') + '. Clique em uma rubrica para ver evolução e quem recebe.');
    const chips = PF.h('<div class="chips" role="tablist"></div>');
    [['*', 'Todas']].concat(PF.ORDEM_CLASSES.map(k => [k, PF.CLASSES[k]])).forEach(([k, rot]) => {
      const n = k === '*' ? todas.length : todas.filter(x => x.cls === k).length;
      const b = PF.h('<button type="button" class="chip' + (st.rubCls === k ? ' ativo' : '') + '" role="tab" aria-selected="' + (st.rubCls === k) + '"></button>');
      b.textContent = rot + ' (' + n + ')';
      b.addEventListener('click', () => { st.rubCls = k; PF.render(); });
      chips.appendChild(b);
    });
    cart.corpo.appendChild(chips);
    const lin = todas.filter(x => st.rubCls === '*' || x.cls === st.rubCls).map(x => ({
      cod: x.cod, desc: x.desc, cl: x.cl, n: x.mats.size, v: x.v, part: totCls[x.cls] ? x.v / totCls[x.cls] : null, d: cc && x.temA ? x.v - x.a : (cc ? x.v : null), med: x.mats.size ? x.v / x.mats.size : null,
    }));
    const t = PF.tabela(cart.corpo, {
      cols: [
        { k: 'cod', rot: 'Código' }, { k: 'desc', rot: 'Rubrica' }, { k: 'cl', rot: 'Classe' }, { k: 'n', rot: 'Pessoas', t: 'int' }, { k: 'v', rot: 'Valor', t: 'barra', fmt: F.moeda },
        { k: 'part', rot: '% da classe', t: 'pct' }, { k: 'd', rot: 'Variação', t: 'dmoeda' }, { k: 'med', rot: 'Média por pessoa', t: 'moeda2' },
      ],
      linhas: lin, ordem: { k: 'v', dir: -1 }, limite: 40, exportar: 'rubricas-' + c, aoClicar: l => { st.rubSel = l.cod; PF.render(); },
    });
    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', t.exportar);
    cart.acoes.appendChild(bx);
    if (st.rubCls === 'I' || st.rubCls === '*') PF.aviso(cart.corpo, 'Rubricas informativas são bases de cálculo e saldos acumulados. Não entram em nenhuma medida do painel.', 'nota');
  };

  function detalhe(el, cod) {
    const st = PF.st, db = PF.db, c = st.comp, r = db.rub.get(cod);
    const volta = PF.h('<p><button type="button" class="btn btn-texto">← Voltar às rubricas</button></p>');
    volta.querySelector('button').addEventListener('click', () => { st.rubSel = null; PF.render(); });
    el.appendChild(volta);
    const porMes = new Map(), pess = new Map(), un = new Map();
    for (const f of db.fatos) {
      if (f.cod !== cod || !PF.passa(f)) continue;
      let m = porMes.get(f.c);
      if (!m) porMes.set(f.c, (m = { v: 0, mats: new Set() }));
      m.v += f.v; m.mats.add(f.m);
      if (f.c === c) {
        let p = pess.get(f.m);
        if (!p) pess.set(f.m, (p = { m: f.m, nome: PF.nome(f.s), un: PF.lotacao(f.s), cargo: f.s.cargo, ref: 0, v: 0 }));
        p.v += f.v; p.ref += f.ref || 0;
        const k = PF.rotulo(f.s.coord);
        un.set(k, (un.get(k) || 0) + f.v);
      }
    }
    const at = porMes.get(c);
    const g = PF.grade(el, 'g-ind');
    PF.indicador(g, { rot: cod + ' · ' + (r.desc || 'sem descrição'), valor: at ? at.v : 0, fmt: F.moeda2, nota: PF.CLASSES[r.cls] });
    PF.indicador(g, { rot: 'Pessoas com a rubrica em ' + F.comp(c), valor: at ? at.mats.size : 0, fmt: F.int });
    PF.indicador(g, { rot: 'Média por pessoa', valor: at && at.mats.size ? at.v / at.mats.size : null, fmt: F.moeda2 });
    PF.indicador(g, { rot: 'Classe no dicionário', valor: 0, fmt: () => PF.CLASSES[r.cls] });

    const jan = db.comps.slice(-24);
    const g2 = PF.grade(el, 'g-2');
    const c1 = PF.cartao(g2, 'Evolução do valor', 'Soma mensal da rubrica sob os filtros atuais');
    PF.graf(c1.corpo, { chart: { type: 'bar' }, series: [{ name: r.desc || cod, data: jan.map(k => Math.round(((porMes.get(k) || {}).v || 0) * 100) / 100) }], xaxis: { categories: jan.map(F.comp) }, plotOptions: { bar: { columnWidth: PF.larguraColuna(jan.length) } }, legend: { show: false }, _ft: v => F.moeda2(v) }, 280);
    const c2 = PF.cartao(g2, 'Por coordenação', 'Em ' + F.comp(c));
    PF.barras(c2.corpo, [...un].map(([k, v]) => ({ rot: k, v })).sort((a, b) => b.v - a.v).slice(0, 12), { fmt: F.moeda });
    PF.cartaoTabela(el, 'Quem tem a rubrica em ' + F.comp(c), 'Clique para abrir a ficha.', {
      cols: [{ k: 'nome', rot: 'Colaborador' }, { k: 'cargo', rot: 'Cargo' }, { k: 'un', rot: 'Lotação' }, { k: 'ref', rot: 'Referência', html: (l, v) => esc(F.num1(v)), t: 'num' }, { k: 'v', rot: 'Valor', t: 'barra', fmt: F.moeda2 }],
      linhas: [...pess.values()], ordem: { k: 'v', dir: -1 }, limite: 25, exportar: 'rubrica-' + cod.replace(/[^\w]/g, '_') + '-' + c, aoClicar: l => PF.abrirFicha(l.m),
    });
  }
})();

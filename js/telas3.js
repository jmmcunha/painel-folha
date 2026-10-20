/* Perfil e diversidade, alertas, base e conferência. */
(function () {
  'use strict';
  const PF = window.PF, F = PF.f, esc = PF.esc;
  const T = (PF.telas = PF.telas || {});
  const CFG = window.PF_CONFIG || {};
  const rotMed = () => PF.MEDIDAS[PF.st.medida].rot;
  const mesDe = n => (n ? Math.floor(n / 10000) + '-' + String(Math.floor(n / 100) % 100).padStart(2, '0') : null);

  /* ================= PERFIL E DIVERSIDADE ================= */
  T.perfil = function (el) {
    const st = PF.st, c = st.comp, MIN = CFG.grupoMinimo || 3;
    const P = [...PF.pessoasDe(c).values()];
    PF.aviso(el, 'Esta tela mostra apenas números agregados. Grupos com menos de ' + MIN + ' pessoas aparecem sem detalhe, e nenhuma pessoa é listada por gênero, raça/cor ou deficiência.', 'nota');
    const ordena = (dim, itens) => {
      const o = PF.DIMS[dim].ordem;
      return o ? itens.sort((a, b) => o.indexOf(a.k) - o.indexOf(b.k)) : itens.sort((a, b) => b.n - a.n);
    };
    const conta = dim => { const m = new Map(); P.forEach(p => { const k = PF.DIMS[dim].f(p.s) || ''; m.set(k, (m.get(k) || 0) + 1); }); return ordena(dim, [...m].map(([k, n]) => ({ k, n }))); };

    const g = PF.grade(el, 'g-3');
    ['genero', 'raca', 'pcd', 'faixa', 'geracao', 'faixaTempo', 'vinculo'].forEach(dim => {
      const cart = PF.cartao(g, PF.DIMS[dim].rot, F.int(P.length) + ' colaboradores em ' + F.comp(c));
      PF.barras(cart.corpo, conta(dim).map(x => ({ rot: PF.rotulo(x.k), v: x.n < MIN ? null : x.n, txt: x.n < MIN ? 'menos de ' + MIN : F.int(x.n) + ' · ' + F.pct(x.n / P.length) })));
    });

    /* reserva de vagas, art. 93 da Lei nº 8.213/1991 — calculada sobre a base inteira da competência */
    const base = PF.db.pessoas.get(c) || new Map();
    const totalBase = base.size;
    let pcd = 0;
    base.forEach(s => { if (s.pcd === 'Sim') pcd++; });
    const perc = totalBase < 100 ? 0 : totalBase <= 200 ? 0.02 : totalBase <= 500 ? 0.03 : totalBase <= 1000 ? 0.04 : 0.05;
    const cq = PF.cartao(g, 'Reserva de vagas para pessoas com deficiência', 'Referência do art. 93 da Lei nº 8.213/1991');
    if (!perc) PF.aviso(cq.corpo, 'A base tem ' + F.int(totalBase) + ' colaboradores na competência. A reserva se aplica a partir de 100 empregados.', 'nota');
    else {
      const exig = Math.ceil(totalBase * perc);
      const dl = PF.h('<dl class="ficha"></dl>');
      [['Colaboradores na base', F.int(totalBase)], ['Percentual da faixa', F.pct(perc)], ['Vagas exigidas', F.int(exig)], ['Pessoas com deficiência', F.int(pcd)], ['Diferença', F.dint(pcd - exig)]].forEach(([a, b]) => { const d = PF.h('<div><dt></dt><dd></dd></div>'); d.querySelector('dt').textContent = a; d.querySelector('dd').textContent = b; dl.appendChild(d); });
      cq.corpo.appendChild(dl);
    }
    PF.aviso(cq.corpo, 'Cálculo de referência sobre todos os colaboradores da folha, sem aplicar os filtros da tela. A base legal de cálculo, incluindo quais vínculos contam, deve ser confirmada pela área de pessoal.', 'nota');

    /* remuneração por grupo */
    st.perDim = st.perDim || 'genero';
    const dim = st.perDim, fn = PF.DIMS[dim].f;
    const salTodos = P.map(p => p.s.salBase).filter(v => v != null && v > 0).sort((a, b) => a - b);
    const medGeral = PF.quantil(salTodos, 0.5);
    const G = new Map();
    P.forEach(p => { const k = fn(p.s) || ''; let x = G.get(k); if (!x) G.set(k, (x = { k, n: 0, sal: [], bruto: [] })); x.n++; if (p.s.salBase != null && p.s.salBase > 0) x.sal.push(p.s.salBase); x.bruto.push(p.P); });
    const lin = ordena(dim, [...G.values()]).map((x, i) => {
      x.sal.sort((a, b) => a - b);
      const ok = x.n >= MIN;
      return { ord: i, grupo: PF.rotulo(x.k), n: ok ? x.n : null, nTxt: ok ? F.int(x.n) : 'menos de ' + MIN, sm: ok ? PF.media(x.sal) : null, smed: ok ? PF.quantil(x.sal, 0.5) : null, bm: ok ? PF.media(x.bruto) : null, raz: ok && medGeral ? PF.quantil(x.sal, 0.5) / medGeral : null };
    });
    const cr = PF.cartaoTabela(el, 'Remuneração por grupo', 'Mediana geral do salário-base: ' + F.moeda(medGeral) + '. A última coluna compara a mediana de cada grupo com a geral.', {
      cols: [
        { k: 'grupo', rot: PF.DIMS[dim].rot, v: l => l.ord, html: l => esc(l.grupo), csv: l => l.grupo }, { k: 'n', rot: 'Pessoas', html: l => esc(l.nTxt), csv: l => l.nTxt, t: 'num' },
        { k: 'sm', rot: 'Salário-base médio', t: 'moeda' }, { k: 'smed', rot: 'Salário-base mediano', t: 'moeda' }, { k: 'bm', rot: 'Remuneração bruta média', t: 'moeda' }, { k: 'raz', rot: 'Mediana do grupo ÷ geral', t: 'pct' },
      ],
      linhas: lin, ordem: { k: 'grupo', dir: 1 }, exportar: 'remuneracao-por-' + dim + '-' + c,
    });
    cr.acoes.prepend(PF.select('Grupo', 'per-dim', ['genero', 'raca', 'pcd', 'faixa', 'geracao', 'faixaTempo', 'vinculo'].map(k => [k, PF.DIMS[k].rot]), dim, v => { st.perDim = v; PF.render(); }));

    /* comparação dentro do mesmo cargo, entre os dois maiores grupos */
    const maiores = [...G.values()].filter(x => x.k !== '').sort((a, b) => b.n - a.n).slice(0, 2).map(x => x.k);
    if (maiores.length === 2) {
      const [g1, g2] = maiores;
      const C = new Map();
      P.forEach(p => { const k = fn(p.s) || ''; if (k !== g1 && k !== g2) return; if (p.s.salBase == null || p.s.salBase <= 0) return; const cg = p.s.cargo; let x = C.get(cg); if (!x) C.set(cg, (x = { cargo: PF.rotulo(cg), a: [], b: [] })); (k === g1 ? x.a : x.b).push(p.s.salBase); });
      const lc = [...C.values()].filter(x => x.a.length >= MIN && x.b.length >= MIN).map(x => {
        x.a.sort((p, q) => p - q); x.b.sort((p, q) => p - q);
        const ma = PF.quantil(x.a, 0.5), mb = PF.quantil(x.b, 0.5);
        return { cargo: x.cargo, na: x.a.length, ma, nb: x.b.length, mb, raz: ma ? mb / ma : null, tot: x.a.length + x.b.length };
      });
      PF.cartaoTabela(el, 'Mesmo cargo, grupos diferentes', 'Mediana do salário-base de "' + PF.rotulo(g2) + '" em relação a "' + PF.rotulo(g1) + '", apenas em cargos com ao menos ' + MIN + ' pessoas em cada grupo.', {
        cols: [
          { k: 'cargo', rot: 'Cargo' }, { k: 'na', rot: 'Pessoas: ' + PF.rotulo(g1), t: 'int' }, { k: 'ma', rot: 'Mediana: ' + PF.rotulo(g1), t: 'moeda' },
          { k: 'nb', rot: 'Pessoas: ' + PF.rotulo(g2), t: 'int' }, { k: 'mb', rot: 'Mediana: ' + PF.rotulo(g2), t: 'moeda' }, { k: 'raz', rot: PF.rotulo(g2) + ' ÷ ' + PF.rotulo(g1), t: 'pct' },
        ],
        linhas: lc, ordem: { k: 'na', dir: -1 }, limite: 25, exportar: 'mesmo-cargo-' + dim + '-' + c, vazio: 'Nenhum cargo com ao menos ' + MIN + ' pessoas em cada um dos dois grupos.',
      });
    }
    PF.aviso(el, 'As comparações usam o salário-base cadastrado, sem ajuste por jornada, tempo de casa ou posição na tabela salarial. Diferenças entre grupos indicam onde olhar, não a causa.', 'nota');
  };

  /* ================= ALERTAS ================= */
  const PADRAO = { pctInd: 30, minInd: 500, pctUni: 15, meses: 3 };
  function limites() {
    let l = {};
    try { l = JSON.parse(localStorage.getItem('pf.limites') || '{}') || {}; } catch (e) { l = {}; }
    return Object.assign({}, PADRAO, l);
  }
  PF.calcularAlertas = function () {
    const st = PF.st, db = PF.db, c = st.comp, i0 = db.comps.indexOf(c), ca = i0 > 0 ? db.comps[i0 - 1] : null, L = limites();
    const out = [];
    const add = (fam, sev, regra, p, texto, valor) => out.push({ fam, sev, regra, m: p ? p.mat : null, quem: p ? PF.nome(p) : '', un: p ? PF.lotacao(p) : '', texto, valor: valor == null ? null : valor });
    const cel = PF.celulas(c);
    const P = PF.pessoasDe(c), PA = ca ? PF.pessoasDe(ca) : new Map();
    const baseA = ca ? db.pessoas.get(ca) : new Map(), baseC = db.pessoas.get(c) || new Map();
    const ini = +c.replace('-', '') * 100 + 1;

    /* integridade */
    for (const x of cel) {
      if (x.s.desl && x.s.desl < ini && x.P > 0 && !/RESCIS/.test(PF.norm(x.tf))) add('Integridade', 'critico', 'Pagamento após o desligamento', x.s, 'Desligamento em ' + F.data(x.s.desl) + ' e proventos de ' + F.moeda2(x.P) + ' na folha ' + x.tf + '.', x.P);
      if (x.P > 0 && x.P - x.D <= 0.005) add('Integridade', 'atencao', 'Líquido zero ou negativo', x.s, 'Proventos de ' + F.moeda2(x.P) + ' e descontos de ' + F.moeda2(x.D) + ' na folha ' + x.tf + '.', x.P - x.D);
      if (x.L !== 0 && Math.abs(x.P - x.D - x.L) > 0.05) add('Integridade', 'critico', 'Líquido diferente da transferência', x.s, 'Proventos menos descontos dão ' + F.moeda2(x.P - x.D) + ', e a transferência registrada é ' + F.moeda2(x.L) + '.', x.P - x.D - x.L);
      if (x.nP === 0 && x.P === 0 && x.D === 0) add('Integridade', 'atencao', 'Sem proventos nem descontos', x.s, 'O colaborador só tem rubricas de base, encargo ou provisão na folha ' + x.tf + '.', null);
    }
    const dups = new Map();
    for (const f of db.fatos) if (f.dup && f.c === c && PF.passa(f)) { const k = f.m + '|' + f.tf + '|' + f.cod + '|' + f.v; let d = dups.get(k); if (!d) dups.set(k, (d = { f, n: 0 })); d.n++; }
    dups.forEach(d => add('Integridade', d.f.r.cls === 'I' ? 'atencao' : 'critico', 'Lançamento repetido', d.f.s, 'Rubrica ' + d.f.cod + ' (' + (d.f.r.desc || 'sem descrição') + ') aparece ' + d.n + ' vezes com o mesmo valor de ' + F.moeda2(d.f.v) + (d.f.r.cls === 'I' ? '. É rubrica informativa e não altera as medidas.' : '.'), d.f.v));
    if (ca) {
      PA.forEach((p, m) => { if (!baseC.has(m) && !p.s.desl) add('Integridade', 'atencao', 'Saiu da folha sem data de desligamento', p.s, 'Constava em ' + F.comp(ca) + ' e não consta em ' + F.comp(c) + '.', null); });
      P.forEach((p, m) => { if (!baseA.has(m) && mesDe(p.s.adm) !== c) add('Integridade', 'atencao', 'Entrou na folha sem admissão no mês', p.s, 'Não constava em ' + F.comp(ca) + ' e a admissão registrada é ' + (p.s.adm ? F.data(p.s.adm) : 'vazia') + '.', null); });
    }

    /* variação individual */
    if (ca) {
      P.forEach((p, m) => {
        const a = PA.get(m);
        if (!a || !a.P) return;
        const d = p.P - a.P, dp = d / a.P;
        const mudou = a.s.salBase != null && p.s.salBase != null && Math.abs(a.s.salBase - p.s.salBase) > 0.005;
        if (Math.abs(dp) * 100 >= L.pctInd && Math.abs(d) >= L.minInd && !mudou) add('Variação individual', 'atencao', 'Remuneração bruta variou sem mudança de salário-base', p.s, 'De ' + F.moeda2(a.P) + ' em ' + F.comp(ca) + ' para ' + F.moeda2(p.P) + ' (' + F.dpct(dp) + ').', d);
      });
      const jan = db.comps.slice(Math.max(0, i0 - L.meses), i0), setJan = new Set(jan);
      const visto = new Set(), presente = new Set();
      for (const f of db.fatos) if (setJan.has(f.c) && f.r.cls === 'P') { visto.add(f.m + '|' + f.cod); presente.add(f.m); }
      const novo = new Map();
      for (const f of db.fatos) if (f.c === c && f.r.cls === 'P' && PF.passa(f) && presente.has(f.m) && !visto.has(f.m + '|' + f.cod)) { const k = f.m + '|' + f.cod; let n = novo.get(k); if (!n) novo.set(k, (n = { f, v: 0 })); n.v += f.v; }
      novo.forEach(n => { if (Math.abs(n.v) >= L.minInd) add('Variação individual', 'atencao', 'Provento que o colaborador não recebia', n.f.s, 'Rubrica ' + n.f.cod + ' (' + (n.f.r.desc || 'sem descrição') + ') de ' + F.moeda2(n.v) + ', ausente nas ' + jan.length + ' competências anteriores.', n.v); });
    }

    /* variação por unidade */
    if (ca) {
      [['coord', 'Coordenação'], ['superv', 'Supervisão']].forEach(([k, rot]) => {
        const A = PF.porGrupo(ca, s => s[k]), B = PF.porGrupo(c, s => s[k]);
        B.forEach((b, g) => {
          if (!g) return;
          const a = A.get(g);
          if (!a) return;
          const va = PF.val(a), vb = PF.val(b);
          if (va > 0 && Math.abs(vb / va - 1) * 100 >= L.pctUni) out.push({ fam: 'Variação por unidade', sev: 'atencao', regra: rot + ' com variação relevante', m: null, quem: g, un: rot, texto: rotMed() + ' de ' + F.moeda(va) + ' em ' + F.comp(ca) + ' para ' + F.moeda(vb) + ' (' + F.dpct(vb / va - 1) + '), com ' + F.dint(b.hc - a.hc) + ' pessoas.', valor: vb - va });
        });
      });
    }
    return { itens: out, L, ca };
  };
  T.alertas = function (el) {
    const st = PF.st, c = st.comp;
    const { itens, L, ca } = PF.calcularAlertas();
    const cart = PF.cartao(el, 'Alertas de ' + F.comp(c), ca ? 'Regras aplicadas sobre ' + F.comp(c) + ', com ' + F.comp(ca) + ' como referência.' : 'Sem competência anterior carregada: só as regras de integridade do próprio mês foram aplicadas.');
    const form = PF.h('<form class="ferramentas" id="form-lim">' +
      '<label class="campo"><span>Variação individual a partir de (%)</span><input type="number" id="lim-pctInd" min="1" max="1000" step="1"></label>' +
      '<label class="campo"><span>e de (R$)</span><input type="number" id="lim-minInd" min="0" step="50"></label>' +
      '<label class="campo"><span>Variação por unidade a partir de (%)</span><input type="number" id="lim-pctUni" min="1" max="1000" step="1"></label>' +
      '<label class="campo"><span>Meses para considerar um provento novo</span><input type="number" id="lim-meses" min="1" max="12" step="1"></label>' +
      '<button type="submit" class="btn btn-primario">Aplicar limites</button></form>');
    Object.keys(PADRAO).forEach(k => { form.querySelector('#lim-' + k).value = L[k]; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const n = {};
      Object.keys(PADRAO).forEach(k => { const v = Number(form.querySelector('#lim-' + k).value); n[k] = isFinite(v) && v >= 0 ? v : PADRAO[k]; });
      try { localStorage.setItem('pf.limites', JSON.stringify(n)); } catch (er) { /* sem armazenamento */ }
      PF.render();
    });
    cart.corpo.appendChild(form);

    st.alFam = st.alFam || '*';
    const fams = ['Integridade', 'Variação individual', 'Variação por unidade'];
    const chips = PF.h('<div class="chips"></div>');
    [['*', 'Todos']].concat(fams.map(f => [f, f])).forEach(([k, rot]) => {
      const n = k === '*' ? itens.length : itens.filter(x => x.fam === k).length;
      const b = PF.h('<button type="button" class="chip' + (st.alFam === k ? ' ativo' : '') + '"></button>');
      b.textContent = rot + ' (' + n + ')';
      b.addEventListener('click', () => { st.alFam = k; PF.render(); });
      chips.appendChild(b);
    });
    cart.corpo.appendChild(chips);
    const lin = itens.filter(x => st.alFam === '*' || x.fam === st.alFam).map(x => Object.assign({ ordSev: x.sev === 'critico' ? 2 : 1, abs: x.valor == null ? null : Math.abs(x.valor) }, x));
    const t = PF.tabela(cart.corpo, {
      cols: [
        { k: 'ordSev', rot: 'Gravidade', html: l => '<span class="selo ' + l.sev + '">' + (l.sev === 'critico' ? '● Crítico' : '▲ Atenção') + '</span>', csv: l => (l.sev === 'critico' ? 'Crítico' : 'Atenção') },
        { k: 'fam', rot: 'Família' }, { k: 'regra', rot: 'Regra' }, { k: 'quem', rot: 'Colaborador ou unidade' }, { k: 'un', rot: 'Lotação' }, { k: 'texto', rot: 'O que foi encontrado', cls: 'largo' }, { k: 'abs', rot: 'Valor envolvido', t: 'moeda2' },
      ],
      linhas: lin, ordem: { k: 'ordSev', dir: -1 }, limite: 50, exportar: 'alertas-' + c, aoClicar: l => { if (l.m) PF.abrirFicha(l.m); }, vazio: 'Nenhum alerta com os limites e filtros atuais.',
    });
    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', t.exportar);
    cart.acoes.appendChild(bx);

    const cr = PF.cartao(el, 'Regras aplicadas');
    cr.corpo.appendChild(PF.h('<ul class="lista">' +
      '<li><strong>Pagamento após o desligamento.</strong> Data de desligamento anterior ao mês e proventos em folha que não seja de rescisão.</li>' +
      '<li><strong>Líquido zero ou negativo.</strong> Descontos iguais ou maiores que os proventos.</li>' +
      '<li><strong>Líquido diferente da transferência.</strong> Proventos menos descontos diferem da rubrica de transferência em mais de R$ 0,05.</li>' +
      '<li><strong>Lançamento repetido.</strong> Mesma rubrica, referência e valor mais de uma vez para o mesmo colaborador, mês e tipo de folha.</li>' +
      '<li><strong>Saída ou entrada sem data.</strong> Quem some da folha sem data de desligamento, ou aparece sem admissão no mês.</li>' +
      '<li><strong>Variação individual.</strong> Remuneração bruta que varia além dos limites sem mudança de salário-base, e provento que o colaborador não recebia nos meses anteriores.</li>' +
      '<li><strong>Variação por unidade.</strong> Coordenação ou supervisão cuja medida selecionada varia além do limite.</li></ul>'));
    PF.aviso(cr.corpo, 'Um alerta indica algo a verificar, não um erro confirmado. Férias, 13º e acertos retroativos produzem variações legítimas.', 'nota');
  };

  /* ================= BASE E CONFERÊNCIA ================= */
  PF.zonaCarga = function (host, vazia) {
    const z = PF.h('<div class="zona' + (vazia ? ' zona-g' : '') + '"><p class="zona-t"></p><p class="mudo"></p><p><button type="button" class="btn btn-primario" data-acao="carregar">Escolher arquivos</button></p></div>');
    z.querySelector('.zona-t').textContent = vazia ? 'Carregue a base da folha' : 'Carregar outros arquivos';
    z.querySelector('.mudo').textContent = 'Arraste aqui um ou mais arquivos .xlsx ou .csv no leiaute da folha, ou escolha no computador. Cada arquivo pode trazer um ou vários meses. Os dados são processados neste navegador e não são enviados a nenhum servidor.';
    host.appendChild(z);
    return z;
  };
  function leiaute(host) {
    const d = PF.h('<details class="bloco"><summary><span>Leiaute esperado do arquivo</span><strong></strong></summary></details>');
    PF.tabela(d, {
      cols: [{ k: 'col', rot: 'Coluna' }, { k: 'tipo', rot: 'Tipo' }, { k: 'uso', rot: 'Uso' }],
      linhas: PF.CAMPOS.map(c => ({ col: c[1], tipo: c[3], uso: c[2] ? 'Obrigatória' : 'Opcional' })).concat(PF.RECALCULADAS.map(n => ({ col: n, tipo: '–', uso: 'Ignorada: o painel recalcula na data de cada competência' }))),
      limite: 50,
    });
    host.appendChild(d);
    PF.aviso(host, 'O cabeçalho pode estar em qualquer das 20 primeiras linhas, em qualquer ordem de colunas. Datas podem vir como data do Excel ou texto (dd/mm/aaaa, mm/aaaa, set/26).', 'nota');
  }
  T.vazio = function (el) {
    const c = PF.cartao(el, null, null);
    PF.zonaCarga(c.corpo, true);
    const c2 = PF.cartao(el, 'Como preparar o arquivo');
    leiaute(c2.corpo);
  };
  T.base = function (el) {
    const st = PF.st, db = PF.db;
    const ativas = db.cargas.filter(k => k.ativas), inativas = db.cargas.filter(k => !k.ativas);
    const c0 = PF.cartao(el, 'Base atual', ativas.length + (ativas.length === 1 ? ' arquivo, ' : ' arquivos, ') + db.comps.length + (db.comps.length === 1 ? ' competência' : ' competências') + ' e ' + F.int(db.fatos.length) + ' linhas. Nada fica gravado: ao fechar ou recarregar a página, a base é descartada.');
    const comp = PF.h('<ul class="lista"></ul>');
    ativas.forEach(k => { const li = document.createElement('li'); li.textContent = k.nome + ': ' + (k.comps.length === 1 ? F.comp(k.comps[0]) : F.comp(k.comps[0]) + ' a ' + F.comp(k.comps[k.comps.length - 1]) + ' (' + k.comps.length + ' competências)') + ', ' + F.int(k.ativas) + ' linhas em uso' + (k.ativas < k.lidas ? ' de ' + F.int(k.lidas) + ' lidas' : ''); comp.appendChild(li); });
    c0.corpo.appendChild(comp);
    const trocas = [];
    db.cargas.forEach(k => (k.substituiu || []).forEach(s => trocas.push(k.nome + ' substituiu ' + F.comp(s.c) + ' (' + s.tf + '), ' + F.int(s.n) + ' linhas que vinham de ' + s.de.join(', ') + '.')));
    if (trocas.length) PF.aviso(c0.corpo, 'Substituições nesta sessão: ' + trocas.join(' '), 'nota');
    if (inativas.length) PF.aviso(c0.corpo, 'Fora de uso, porque todos os seus meses foram substituídos: ' + inativas.map(k => k.nome).join(', ') + '.', 'nota');
    PF.aviso(c0.corpo, 'Ao carregar outros arquivos com uma base aberta, o painel pergunta se eles substituem a base ou se somam a ela. Para trocar de conjunto de dados, escolha substituir.', 'nota');
    PF.zonaCarga(c0.corpo, false);
    PF.tabela(c0.corpo, {
      cols: [
        { k: 'nome', rot: 'Arquivo', cls: 'nq' }, { k: 'hash', rot: 'Hash', cls: 'mono' }, { k: 'aba', rot: 'Aba' }, { k: 'quando', rot: 'Carregado às', v: l => l.quando.getTime(), html: l => esc(l.quando.toLocaleTimeString('pt-BR')) },
        { k: 'per', rot: 'Competências', v: l => l.comps[0], html: l => esc(l.comps.length === 1 ? F.comp(l.comps[0]) : F.comp(l.comps[0]) + ' a ' + F.comp(l.comps[l.comps.length - 1]) + ' (' + l.comps.length + ')') },
        { k: 'lidas', rot: 'Linhas lidas', t: 'int' }, { k: 'ignoradas', rot: 'Ignoradas', t: 'int' }, { k: 'substituidas', rot: 'Substituiu', t: 'int', dica: 'Linhas de cargas anteriores trocadas por este arquivo' }, { k: 'ativas', rot: 'Ativas', t: 'int', dica: 'Linhas deste arquivo ainda em uso' },
      ],
      linhas: db.cargas, ordem: { k: 'quando', dir: -1 }, limite: 40,
    });
    const bl = PF.h('<button type="button" class="btn btn-contorno btn-p">Limpar a base</button>');
    bl.addEventListener('click', () => { PF.limparBase(); PF.reindexar(); st.ficha = null; st.rubSel = null; PF.toast('Base descartada.'); PF.ir('base'); });
    c0.acoes.appendChild(bl);

    /* conciliação */
    const conc = new Map();
    for (const x of db.cel) {
      const k = x.c + '|' + x.tf;
      let r = conc.get(k);
      if (!r) conc.set(k, (r = Object.assign(PF.zero(), { c: x.c, tf: x.tf, mats: new Set(), fontes: new Set() })));
      PF.somar(r, x); r.mats.add(x.m);
    }
    const nomeCarga = new Map(db.cargas.map(k => [k.id, k.nome]));
    const lin = new Map();
    for (const f of db.fatos) { const k = f.c + '|' + f.tf; const r = conc.get(k); r.n = (r.n || 0) + 1; r.fontes.add(nomeCarga.get(f.k)); }
    conc.forEach(r => lin.set(r.c + r.tf, { c: r.c, tf: r.tf, n: r.n, hc: r.mats.size, P: r.P, D: r.D, liq: r.P - r.D, L: r.L, dif: r.L ? r.P - r.D - r.L : null, E: r.E, B: r.B, custo: r.P + r.E + r.B, V: r.V, fonte: [...r.fontes].join(', ') }));
    PF.cartaoTabela(el, 'Conciliação por competência', 'Totais de cada mês e tipo de folha, sem filtros, para conferir com o resumo da folha. A diferença deve ser zero.', {
      cols: [
        { k: 'c', rot: 'Competência', html: l => esc(F.comp(l.c)) }, { k: 'tf', rot: 'Tipo de folha' }, { k: 'n', rot: 'Linhas', t: 'int' }, { k: 'hc', rot: 'Pessoas', t: 'int' },
        { k: 'P', rot: 'Proventos', t: 'moeda2' }, { k: 'D', rot: 'Descontos', t: 'moeda2' }, { k: 'liq', rot: 'Líquido calculado', t: 'moeda2' }, { k: 'L', rot: 'Transferência', t: 'moeda2' },
        { k: 'dif', rot: 'Diferença', html: (l, v) => (v == null ? '<span class="mudo">sem rubrica</span>' : Math.abs(v) < 0.05 ? '<span class="selo ok">✓ 0,00</span>' : '<span class="selo critico">● ' + esc(F.moeda2(v)) + '</span>'), t: 'num' },
        { k: 'E', rot: 'Encargos', t: 'moeda2' }, { k: 'B', rot: 'Benefícios da empresa', t: 'moeda2' }, { k: 'custo', rot: 'Custo total', t: 'moeda2' }, { k: 'V', rot: 'Provisões', t: 'moeda2' }, { k: 'fonte', rot: 'Arquivo', cls: 'nq' },
      ],
      linhas: [...lin.values()], ordem: { k: 'c', dir: -1 }, limite: 36, exportar: 'conciliacao',
    });

    /* qualidade */
    const probs = [];
    db.cargas.forEach(k => {
      if (!k.ativas) return;
      k.probs.forEach(p => probs.push({ arq: k.nome, tipo: p.tipo, n: p.n, ex: p.ex.join('; ') }));
      if (k.faltam.length) probs.push({ arq: k.nome, tipo: 'Colunas opcionais ausentes', n: k.faltam.length, ex: k.faltam.join('; ') });
      if (k.extras.length) probs.push({ arq: k.nome, tipo: 'Colunas não reconhecidas (ignoradas)', n: k.extras.length, ex: k.extras.slice(0, 8).join('; ') });
    });
    PF.cartaoTabela(el, 'Qualidade dos arquivos', 'Inconsistências encontradas na leitura. Linhas ignoradas não entram em nenhum total.', {
      cols: [{ k: 'arq', rot: 'Arquivo' }, { k: 'tipo', rot: 'Ocorrência' }, { k: 'n', rot: 'Quantidade', t: 'int' }, { k: 'ex', rot: 'Exemplos', cls: 'largo' }],
      linhas: probs, ordem: { k: 'n', dir: -1 }, limite: 30, exportar: 'qualidade', vazio: 'Nenhuma inconsistência encontrada.',
    });

    /* dicionário */
    const uso = new Map();
    for (const f of db.fatos) { let u = uso.get(f.cod); if (!u) uso.set(f.cod, (u = { n: 0, v: 0 })); u.n++; u.v += f.v; }
    const lr = [...db.rub.values()].map(r => ({ cod: r.cod, desc: r.desc, tcalc: r.tcalc, cls: r.cls, sug: r.sug, n: uso.get(r.cod).n, v: uso.get(r.cod).v, ordCls: PF.ORDEM_CLASSES.indexOf(r.cls) }));
    const nAj = lr.filter(l => l.cls !== l.sug).length;
    const cdx = PF.cartao(el, 'Dicionário de rubricas', 'A classe define em que medida cada rubrica entra. As sugestões vêm do tipo de cálculo e da descrição e devem ser validadas pela área de pessoal. Ajustes ficam guardados neste navegador.');
    const td = PF.tabela(cdx.corpo, {
      cols: [
        { k: 'cod', rot: 'Código' }, { k: 'desc', rot: 'Descrição' }, { k: 'tcalc', rot: 'Tipo de cálculo no arquivo' }, { k: 'n', rot: 'Linhas', t: 'int' }, { k: 'v', rot: 'Soma na base', t: 'moeda2' },
        { k: 'ordCls', rot: 'Classe', csv: l => PF.CLASSES[l.cls], html: l => '<select class="sel-cls" data-cod="' + esc(l.cod) + '" aria-label="Classe da rubrica ' + esc(l.cod) + '">' + PF.ORDEM_CLASSES.map(k => '<option value="' + k + '"' + (k === l.cls ? ' selected' : '') + '>' + esc(PF.CLASSES[k]) + '</option>').join('') + '</select>' + (l.cls !== l.sug ? ' <span class="etq">ajustada</span>' : '') },
      ],
      linhas: lr, ordem: { k: 'ordCls', dir: 1 }, limite: 200, exportar: 'dicionario-rubricas',
    });
    td.el.addEventListener('change', e => {
      const s = e.target.closest('.sel-cls');
      if (!s) return;
      const r = db.rub.get(s.dataset.cod);
      if (s.value === r.sug) delete PF.ajustes[r.cod]; else PF.ajustes[r.cod] = s.value;
      PF.salvarAjustes(); PF.reindexar(); PF.render();
    });
    const bx = PF.h('<button type="button" class="btn btn-contorno btn-p">Exportar CSV</button>');
    bx.addEventListener('click', td.exportar);
    cdx.acoes.appendChild(bx);
    if (nAj) {
      const br = PF.h('<button type="button" class="btn btn-contorno btn-p">Restaurar sugestões (' + nAj + ')</button>');
      br.addEventListener('click', () => { PF.ajustes = {}; PF.salvarAjustes(); PF.reindexar(); PF.render(); });
      cdx.acoes.appendChild(br);
    }
    const cl = PF.cartao(el, 'Leiaute');
    leiaute(cl.corpo);
  };
})();

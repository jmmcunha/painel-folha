/* Montagem da aplicação: menu, filtros, carga de arquivos e navegação. */
(function () {
  'use strict';
  const PF = window.PF, F = PF.f, CFG = window.PF_CONFIG || {}, st = PF.st;
  const $ = id => document.getElementById(id);

  const MENU = [
    ['Visão', [['geral', 'Visão geral'], ['estrutura', 'Estrutura'], ['evolucao', 'Evolução'], ['variacoes', 'Variações']]],
    ['Pessoas', [['colab', 'Colaboradores'], ['mov', 'Movimentação'], ['cargos', 'Cargos e salários'], ['perfil', 'Perfil e diversidade']]],
    ['Folha', [['rubricas', 'Rubricas'], ['alertas', 'Alertas']]],
    ['Base', [['base', 'Base e conferência']]],
  ];
  if (CFG.moduloDiversidade === false) MENU[1][1] = MENU[1][1].filter(t => t[0] !== 'perfil');
  const TITULO = {};
  MENU.forEach(g => g[1].forEach(t => { TITULO[t[0]] = t[1]; }));

  PF.ir = function (tela) {
    st.tela = TITULO[tela] ? tela : 'geral';
    if (location.hash !== '#' + st.tela) history.replaceState(null, '', '#' + st.tela);
    document.body.classList.remove('menu-aberto');
    PF.render();
    window.scrollTo(0, 0);
  };

  function desenhaMenu(temBase) {
    const nav = $('menu');
    nav.innerHTML = '';
    MENU.forEach(([grupo, itens]) => {
      const g = PF.h('<div class="menu-grupo"><p class="menu-rot"></p></div>');
      g.querySelector('p').textContent = grupo;
      itens.forEach(([k, rot]) => {
        const b = PF.h('<button type="button" class="menu-item' + (st.tela === k ? ' ativo' : '') + '"></button>');
        b.textContent = rot;
        if (st.tela === k) b.setAttribute('aria-current', 'page');
        b.disabled = !temBase && k !== 'base';
        b.addEventListener('click', () => { st.ficha = null; st.rubSel = null; PF.ir(k); });
        g.appendChild(b);
      });
      nav.appendChild(g);
    });
  }

  function opcoes(campo, pred) {
    const set = new Set();
    for (const x of PF.db.cel) if (!pred || pred(x.s)) set.add(x.s[campo]);
    return [...set].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  }
  function desenhaFiltros() {
    const db = PF.db, el = $('filtros');
    el.innerHTML = '';
    const dirs = opcoes('dir');
    const coords = opcoes('coord', s => st.dir === '*' || s.dir === st.dir);
    if (st.coord !== '*' && coords.indexOf(st.coord) < 0) st.coord = '*';
    const supervs = opcoes('superv', s => (st.dir === '*' || s.dir === st.dir) && (st.coord === '*' || s.coord === st.coord));
    if (st.superv !== '*' && supervs.indexOf(st.superv) < 0) st.superv = '*';
    const muda = k => v => { st[k] = v; PF.render(); };
    const lista = (vals, todos) => [['*', todos]].concat(vals.map(v => [v, PF.rotulo(v)]));
    el.appendChild(PF.select('Competência', 'f-comp', db.comps.slice().reverse().map(c => [c, F.comp(c)]), st.comp, muda('comp')));
    el.appendChild(PF.select('Comparar com', 'f-cmp', [['ant', 'Mês anterior carregado'], ['ano', 'Mesmo mês do ano anterior']], st.cmp, muda('cmp')));
    el.appendChild(PF.select('Medida', 'f-medida', Object.keys(PF.MEDIDAS).map(k => [k, PF.MEDIDAS[k].rot]), st.medida, muda('medida')));
    if (db.tfs.length > 1) el.appendChild(PF.select('Tipo de folha', 'f-tf', lista(db.tfs, 'Todos'), st.tf, muda('tf')));
    else st.tf = '*';
    el.appendChild(PF.select('Diretoria', 'f-dir', lista(dirs, 'Todas'), st.dir, muda('dir')));
    el.appendChild(PF.select('Coordenação', 'f-coord', lista(coords, 'Todas'), st.coord, muda('coord')));
    el.appendChild(PF.select('Supervisão', 'f-superv', lista(supervs, 'Todas'), st.superv, muda('superv')));
    el.appendChild(PF.select('Vínculo', 'f-vinc', lista(opcoes('vinculo'), 'Todos'), st.vinc, muda('vinc')));
    el.appendChild(PF.select('Situação', 'f-sit', lista(opcoes('situacao'), 'Todas'), st.sit, muda('sit')));
    if (PF.filtroUnidadeAtivo() || st.tf !== '*') {
      const b = PF.h('<button type="button" class="btn btn-texto" id="f-limpar">Limpar filtros</button>');
      b.addEventListener('click', () => { st.tf = st.dir = st.coord = st.superv = st.vinc = st.sit = '*'; PF.render(); });
      el.appendChild(b);
    }
  }

  PF.render = function () {
    const db = PF.db, temBase = db.fatos.length > 0;
    const foco = document.activeElement && document.activeElement.id;
    PF.limpaGrafs();
    const tela = $('tela');
    tela.innerHTML = '';
    if (!TITULO[st.tela]) st.tela = 'geral';
    desenhaMenu(temBase);
    $('base-info').textContent = temBase ? db.comps.length + (db.comps.length === 1 ? ' competência' : ' competências') + ' · ' + F.int(db.fatos.length) + ' linhas' : 'Nenhuma base carregada';
    const bo = $('btn-ocultar');
    bo.setAttribute('aria-pressed', String(st.ocultar));
    bo.textContent = st.ocultar ? 'Mostrar nomes' : 'Ocultar nomes';
    bo.hidden = !temBase;
    const filtros = $('filtros');
    if (!temBase) {
      filtros.hidden = true;
      $('titulo-tela').textContent = 'Base da folha';
      PF.telas.vazio(tela);
      return;
    }
    filtros.hidden = st.tela === 'base';
    if (st.tela !== 'base') desenhaFiltros();
    $('titulo-tela').textContent = TITULO[st.tela] + (st.tela === 'base' ? '' : ' · ' + F.compLongo(st.comp));
    try { PF.telas[st.tela](tela); }
    catch (e) { console.error(e); PF.aviso(tela, 'Não foi possível montar esta tela: ' + e.message, 'erro'); }
    if (foco) { const e = $(foco); if (e && e !== document.activeElement) e.focus(); }
  };

  async function carregarArquivos(lista) {
    const arqs = [...lista].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
    if (!arqs.length) return;
    const antes = PF.db.fatos.length === 0;
    let ok = 0, linhas = 0;
    const erros = [];
    for (const f of arqs) {
      await PF.ocupado('Lendo ' + f.name + '…');
      try {
        const r = await PF.carregar(f);
        if (r.ok) { ok++; linhas += r.lidas; } else erros.push(r.msg);
      } catch (e) { console.error(e); erros.push('"' + f.name + '": ' + e.message); }
    }
    await PF.ocupado('Organizando a base…');
    PF.reindexar();
    if (ok && PF.db.comps.length) st.comp = PF.db.comps[PF.db.comps.length - 1];
    PF.ocupado(null);
    if (ok) PF.toast(ok + (ok === 1 ? ' arquivo carregado: ' : ' arquivos carregados: ') + F.int(linhas) + ' linhas.');
    erros.forEach(m => PF.toast(m, 'erro'));
    $('arquivos').value = '';
    if (ok && antes) PF.ir('geral'); else PF.render();
  }

  function iniciar(usuario) {
    $('app').hidden = false;
    $('app-titulo').textContent = (CFG.titulo || 'Painel da Folha').toUpperCase();
    $('app-sub').textContent = CFG.subtitulo || '';
    document.title = CFG.titulo || 'Painel da Folha';
    const u = $('usuario');
    if (usuario) { $('usuario-email').textContent = usuario.email || ''; u.hidden = false; $('btn-sair').addEventListener('click', () => PF.sair()); }
    else { $('sem-login').hidden = false; }
    $('btn-ocultar').addEventListener('click', () => { st.ocultar = !st.ocultar; PF.render(); });
    $('btn-menu').addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
    $('arquivos').addEventListener('change', e => carregarArquivos(e.target.files));
    document.addEventListener('click', e => { if (e.target.closest('[data-acao="carregar"]')) $('arquivos').click(); });
    document.addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('soltando'); });
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('soltando'); });
    document.addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('soltando'); if (e.dataTransfer && e.dataTransfer.files.length) carregarArquivos(e.dataTransfer.files); });
    window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (TITULO[t] && t !== st.tela) { st.ficha = null; st.rubSel = null; PF.ir(t); } });
    const h = location.hash.slice(1);
    st.tela = TITULO[h] ? h : 'geral';
    PF.render();
  }

  PF.iniciarAuth(iniciar);
})();

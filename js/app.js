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
    const bi = $('base-info');
    if (temBase) {
      const ativas = db.cargas.filter(k => k.ativas);
      const faixa = db.comps.length === 1 ? F.comp(db.comps[0]) : F.comp(db.comps[0]) + ' a ' + F.comp(db.comps[db.comps.length - 1]);
      bi.textContent = ativas.length + (ativas.length === 1 ? ' arquivo · ' : ' arquivos · ') + faixa + ' · ' + F.int(db.fatos.length) + ' linhas';
      bi.title = 'Base atual: ' + ativas.map(k => k.nome).join(', ') + '. Clique para ver os detalhes.';
    } else { bi.textContent = 'Nenhuma base carregada'; bi.title = ''; }
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

  /* Com uma base já carregada, pergunta se os arquivos novos a substituem ou se somam a ela. */
  function perguntarModo(arqs) {
    return new Promise(resolve => {
      const db = PF.db;
      const lista = arqs.map(a => a.name);
      const d = PF.h('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t"><div class="modal-cx">' +
        '<h3 id="modal-t">Já existe uma base carregada</h3>' +
        '<p class="mudo">A base atual tem ' + db.cargas.filter(k => k.ativas).length + ' arquivo(s), ' + db.comps.length + ' competência(s) e ' + F.int(db.fatos.length) + ' linhas. O que fazer com ' + (lista.length === 1 ? 'o arquivo' : 'os ' + lista.length + ' arquivos') + ' selecionado(s)?</p>' +
        '<ul class="lista mono" id="modal-arqs"></ul>' +
        '<div class="modal-op"><button type="button" class="btn btn-primario" data-modo="substituir">Substituir a base</button><p class="mudo">Descarta tudo o que está carregado e usa só os arquivos novos. É o uso normal quando se abre outro conjunto de dados.</p></div>' +
        '<div class="modal-op"><button type="button" class="btn btn-contorno" data-modo="acrescentar">Acrescentar à base atual</button><p class="mudo">Soma os meses novos aos já carregados. Um mês que já exista é trocado pelo do arquivo novo.</p></div>' +
        '<p><button type="button" class="btn btn-texto" data-modo="">Cancelar</button></p></div></div>');
      lista.slice(0, 8).forEach(n => { const li = document.createElement('li'); li.textContent = n; d.querySelector('#modal-arqs').appendChild(li); });
      if (lista.length > 8) { const li = document.createElement('li'); li.textContent = '… e mais ' + (lista.length - 8); d.querySelector('#modal-arqs').appendChild(li); }
      d.addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b) return; d.remove(); resolve(b.dataset.modo || null); });
      d.addEventListener('keydown', e => { if (e.key === 'Escape') { d.remove(); resolve(null); } });
      document.body.appendChild(d);
      d.querySelector('[data-modo="substituir"]').focus();
    });
  }
  function limparFiltros() { st.tf = st.dir = st.coord = st.superv = st.vinc = st.sit = '*'; st.ficha = null; st.rubSel = null; st.busca = ''; st.exp = null; }

  async function carregarArquivos(lista) {
    const arqs = [...lista].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
    $('arquivos').value = '';
    if (!arqs.length) return;
    const vazia = PF.db.fatos.length === 0;
    let modo = 'substituir';
    if (!vazia) { modo = await perguntarModo(arqs); if (!modo) return; }
    if (modo === 'substituir' && !vazia) { PF.limparBase(); limparFiltros(); }
    let ok = 0, linhas = 0, ultima = null;
    const erros = [], avisos = [];
    for (const f of arqs) {
      await PF.ocupado('Lendo ' + f.name + '…');
      try {
        const r = await PF.carregar(f);
        if (!r.ok) { erros.push(r.msg); continue; }
        ok++; linhas += r.lidas;
        const fim = r.comps[r.comps.length - 1];
        if (!ultima || fim > ultima) ultima = fim;
        r.substituiu.forEach(s => avisos.push(f.name + ' substituiu ' + F.comp(s.c) + ' (' + s.tf + '), que vinha de ' + s.de.join(', ') + '.'));
      } catch (e) { console.error(e); erros.push('"' + f.name + '": ' + e.message); }
    }
    await PF.ocupado('Organizando a base…');
    PF.reindexar();
    /* a tela vai para o mês mais recente do que acabou de ser carregado, não da base inteira */
    if (ok && ultima && PF.db.porComp.has(ultima)) st.comp = ultima;
    PF.ocupado(null);
    if (ok) PF.toast(ok + (ok === 1 ? ' arquivo carregado: ' : ' arquivos carregados: ') + F.int(linhas) + ' linhas' + (modo === 'substituir' && !vazia ? '. A base anterior foi descartada.' : '.'));
    avisos.forEach(m => PF.toast(m, 'aviso'));
    erros.forEach(m => PF.toast(m, 'erro'));
    if (ok && (vazia || modo === 'substituir')) PF.ir('geral'); else PF.render();
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
    $('base-info').addEventListener('click', () => { if (PF.db.fatos.length) { st.ficha = null; st.rubSel = null; PF.ir('base'); } });
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

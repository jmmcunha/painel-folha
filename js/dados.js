/* Modelo de dados: carga dos arquivos, classificação das rubricas, medidas e consultas. */
(function () {
  'use strict';
  const PF = window.PF;

  PF.norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const normCab = s => PF.norm(s).replace(/[^A-Z0-9]+/g, ' ').trim();

  /* chave interna, cabeçalho do leiaute, obrigatória, tipo */
  PF.CAMPOS = [
    ['mat', 'MAT', 1, 'texto'], ['nome', 'NOME', 0, 'texto'], ['nasc', 'NASCIMENTO', 0, 'data'],
    ['genero', 'GÊNERO', 0, 'texto'], ['raca', 'RAÇA/COR', 0, 'texto'], ['pcd', 'PESSOA COM DEFICIÊNCIA', 0, 'texto'],
    ['adm', 'ADMISSÃO', 0, 'data'], ['vinculo', 'VÍNCULO', 0, 'texto'], ['situacao', 'SITUAÇÃO', 0, 'texto'],
    ['desl', 'DESLIGAMENTO', 0, 'data'], ['tipoDesl', 'TIPO DESLIGAMENTO', 0, 'texto'],
    ['salBase', 'SALÁRIO-BASE', 0, 'número'], ['posTab', 'POSIÇÃO TAB SALARIAL', 0, 'texto'],
    ['jornada', 'JORNADA SEMANAL', 0, 'número'], ['cargo', 'CARGO', 0, 'texto'], ['cc', 'CENTRO DE CUSTO', 0, 'texto'],
    ['uo', 'UNIDADE ORGANIZACIONAL', 0, 'texto'], ['dir', 'DIRETORIA', 0, 'texto'], ['coord', 'COORDENAÇÃO', 0, 'texto'],
    ['superv', 'SUPERVISÃO', 0, 'texto'], ['nucleo', 'NÚCLEO', 0, 'texto'], ['tf', 'TIPO DE FOLHA', 0, 'texto'],
    ['cod', 'COD RUBRICA', 1, 'texto'], ['desc', 'DESC RUBRICA', 0, 'texto'], ['tcalc', 'TIPO CÁLCULO', 1, 'texto'],
    ['ref', 'REF', 0, 'número'], ['valor', 'VALOR', 1, 'número'], ['comp', 'COMPETENCIA', 1, 'data'],
  ];
  PF.RECALCULADAS = ['IDADE', 'FAIXA ETÁRIA', 'GERAÇÃO', 'TEMPO DE CASA - ANOS', 'FAIXA DE TEMPO DE CASA'];

  PF.CLASSES = {
    P: 'Provento', D: 'Desconto', L: 'Líquido transferido', E: 'Encargo patronal',
    B: 'Benefício pago pela empresa', V: 'Provisão do período', I: 'Informativa (não soma)',
  };
  PF.ORDEM_CLASSES = ['P', 'D', 'L', 'E', 'B', 'V', 'I'];

  /* Cada medida é uma combinação de classes de rubrica. */
  PF.MEDIDAS = {
    custo: { rot: 'Custo total', w: { P: 1, E: 1, B: 1 }, nota: 'Proventos + encargos patronais + benefícios pagos pela empresa. Não inclui provisões.' },
    bruto: { rot: 'Remuneração bruta', w: { P: 1 }, nota: 'Soma dos proventos.' },
    enc: { rot: 'Encargos patronais', w: { E: 1 }, nota: 'Rubricas classificadas como encargo patronal.' },
    ben: { rot: 'Benefícios pagos pela empresa', w: { B: 1 }, nota: 'Rubricas classificadas como benefício pago pela empresa.' },
    desc: { rot: 'Descontos', w: { D: 1 }, nota: 'Soma dos descontos.' },
    liq: { rot: 'Líquido', w: { P: 1, D: -1 }, nota: 'Proventos menos descontos.' },
    prov: { rot: 'Provisões do período', w: { V: 1 }, nota: 'Provisões de férias e 13º constituídas no mês.' },
  };
  PF.val = (a, med) => {
    const w = PF.MEDIDAS[med || PF.st.medida].w;
    let t = 0;
    for (const k in w) t += w[k] * a[k];
    return t;
  };

  PF.FAIXAS_ETARIAS = ['0-13', '14-29', '30-45', '46-61', '62-80', '81 ou mais'];
  PF.GERACOES = ['Geração Alpha', 'Geração Z', 'Geração Y (Millennials)', 'Geração X', 'Baby Boomers', 'Geração Silenciosa'];
  PF.FAIXAS_TEMPO = ['0-1 ano', '2-5 anos', '6-10 anos', '11-15 anos', '16-20 anos', '21-25 anos', '26-30 anos', 'Acima de 30 anos'];
  const faixaEtaria = i => (i <= 13 ? 0 : i <= 29 ? 1 : i <= 45 ? 2 : i <= 61 ? 3 : i <= 80 ? 4 : 5);
  const geracao = y => (y >= 2013 ? 0 : y >= 1997 ? 1 : y >= 1981 ? 2 : y >= 1965 ? 3 : y >= 1946 ? 4 : 5);
  const faixaTempo = t => (t <= 1 ? 0 : t <= 5 ? 1 : t <= 10 ? 2 : t <= 15 ? 3 : t <= 20 ? 4 : t <= 25 ? 5 : t <= 30 ? 6 : 7);

  PF.DIMS = {
    dir: { rot: 'Diretoria', f: s => s.dir }, coord: { rot: 'Coordenação', f: s => s.coord },
    superv: { rot: 'Supervisão', f: s => s.superv }, nucleo: { rot: 'Núcleo', f: s => s.nucleo },
    uo: { rot: 'Unidade organizacional', f: s => s.uo }, cc: { rot: 'Centro de custo', f: s => s.cc },
    cargo: { rot: 'Cargo', f: s => s.cargo }, vinculo: { rot: 'Vínculo', f: s => s.vinculo },
    situacao: { rot: 'Situação', f: s => s.situacao }, genero: { rot: 'Gênero', f: s => s.genero },
    raca: { rot: 'Raça/cor', f: s => s.raca }, pcd: { rot: 'Pessoa com deficiência', f: s => s.pcd },
    faixa: { rot: 'Faixa etária', f: s => s.faixa, ordem: PF.FAIXAS_ETARIAS },
    geracao: { rot: 'Geração', f: s => s.geracao, ordem: PF.GERACOES },
    faixaTempo: { rot: 'Tempo de casa', f: s => s.faixaTempo, ordem: PF.FAIXAS_TEMPO },
  };
  PF.NI = '(não informado)';
  PF.rotulo = v => (v === '' || v == null ? PF.NI : v);

  function vazio() { return { cargas: [], fatos: [], rub: new Map(), cel: [], comps: [], porComp: new Map(), pessoas: new Map(), tfs: [], seq: 0 }; }
  PF.db = vazio();
  PF.limparBase = function () { PF.db = vazio(); };

  /* ---------- classificação das rubricas ---------- */
  PF.classeSugerida = function (r) {
    const t = PF.norm(r.tcalc), d = PF.norm(r.desc), c = String(r.cod).toUpperCase();
    if (t.startsWith('PROVENTO')) return 'P';
    if (t.startsWith('DESCONTO')) return 'D';
    if (t.startsWith('TRANSFER')) return 'L';
    if (/^PROV\.? ?PER/.test(d)) return 'V';
    if (c === '/501' || /^(TRIBUTO )?FGTS/.test(d)) return 'E';
    if (/^CONTR\. ?(EMPREGADOR|RAT|EMPR)/.test(d)) return 'E';
    if (/^RECOLHIMENTO PIS/.test(d)) return 'E';
    if (/ EMP$/.test(d) && /(ASS|CONV|MEDIC|ODONT)/.test(d)) return 'B';
    return 'I';
  };
  PF.ajustes = (function () { try { return JSON.parse(localStorage.getItem('pf.classes') || '{}') || {}; } catch (e) { return {}; } })();
  PF.salvarAjustes = function () { try { localStorage.setItem('pf.classes', JSON.stringify(PF.ajustes)); } catch (e) { /* sem armazenamento */ } };

  /* ---------- carga ---------- */
  const txt = v => (v == null ? '' : (typeof v === 'number' ? String(v) : String(v).replace(/\s+/g, ' ').trim()));
  const dnum = d => (d ? d.y * 10000 + d.m * 100 + d.d : null);
  const ckey = d => d.y + '-' + String(d.m).padStart(2, '0');

  function criaSnap(g, mat, cd, d1904, prob) {
    const data = (k, rot) => {
      const bruto = g(k);
      if (bruto == null || bruto === '') return null;
      const d = PF.paraData(bruto, d1904);
      if (!d) prob('Data inválida em ' + rot, mat);
      return dnum(d);
    };
    const s = {
      mat, nome: txt(g('nome')), nasc: data('nasc', 'NASCIMENTO'), genero: txt(g('genero')), raca: txt(g('raca')),
      pcd: '', adm: data('adm', 'ADMISSÃO'), vinculo: txt(g('vinculo')), situacao: txt(g('situacao')),
      desl: data('desl', 'DESLIGAMENTO'), tipoDesl: txt(g('tipoDesl')), salBase: PF.paraNum(g('salBase')),
      posTab: txt(g('posTab')), jornada: PF.paraNum(g('jornada')), cargo: txt(g('cargo')), cc: txt(g('cc')),
      uo: txt(g('uo')), dir: txt(g('dir')), coord: txt(g('coord')), superv: txt(g('superv')), nucleo: txt(g('nucleo')),
      idade: null, faixa: '', geracao: '', tempo: null, faixaTempo: '',
    };
    const p = PF.norm(g('pcd'));
    s.pcd = p ? (p.startsWith('S') ? 'Sim' : p.startsWith('N') ? 'Não' : txt(g('pcd'))) : '';
    if (s.nasc) {
      const by = Math.floor(s.nasc / 10000), bm = Math.floor(s.nasc / 100) % 100;
      s.idade = cd.y - by - (bm > cd.m ? 1 : 0);
      if (s.idade >= 0 && s.idade < 120) { s.faixa = PF.FAIXAS_ETARIAS[faixaEtaria(s.idade)]; s.geracao = PF.GERACOES[geracao(by)]; }
      else { s.idade = null; prob('Nascimento incompatível com a competência', mat); }
    }
    if (s.adm) {
      const ay = Math.floor(s.adm / 10000), am = Math.floor(s.adm / 100) % 100;
      const t = cd.y - ay - (am > cd.m ? 1 : 0);
      if (t >= 0) { s.tempo = t; s.faixaTempo = PF.FAIXAS_TEMPO[faixaTempo(t)]; }
    }
    return s;
  }

  /* Lê um arquivo e incorpora à base. Um mês e tipo de folha já carregados são substituídos pelos do arquivo novo. */
  PF.carregar = async function (file) {
    const db = PF.db;
    const u8 = new Uint8Array(await file.arrayBuffer());
    const hash = await PF.hash(u8);
    if (db.cargas.some(c => c.hash === hash && c.ativas > 0)) return { ok: false, msg: '"' + file.name + '" já está carregado, com o mesmo conteúdo.' };
    const csv = /\.(csv|txt)$/i.test(file.name);
    if (!csv && !/\.(xlsx|xlsm)$/i.test(file.name)) return { ok: false, msg: '"' + file.name + '": formato não aceito. Use .xlsx ou .csv.' };
    let doc;
    try { doc = csv ? PF.lerCsv(u8) : PF.lerXlsx(u8); } catch (e) { return { ok: false, msg: '"' + file.name + '": ' + e.message }; }

    const mapa = {};
    PF.CAMPOS.forEach(c => { mapa[normCab(c[1])] = c[0]; });
    const recalc = new Set(PF.RECALCULADAS.map(normCab));

    let it = null, ix = null, aba = '', cabLinha = 0, extras = [], faltam = [];
    for (const a of doc.abas) {
      const g = a.linhas();
      let n = 0;
      /* next() manual: um for...of com break encerraria o gerador e perderia as linhas de dados */
      for (let passo = g.next(); !passo.done; passo = g.next()) {
        const linha = passo.value;
        n++;
        const achado = {};
        const naoRec = [];
        for (let i = 0; i < linha.length; i++) {
          if (linha[i] == null) continue;
          const h = normCab(linha[i]);
          if (mapa[h] && achado[mapa[h]] == null) achado[mapa[h]] = i;
          else if (h && !recalc.has(h)) naoRec.push(String(linha[i]));
        }
        if (achado.mat != null && achado.comp != null) { ix = achado; it = g; aba = a.nome; cabLinha = n; extras = naoRec; break; }
        if (n >= 20) break;
      }
      if (ix) break;
    }
    if (!ix) return { ok: false, msg: '"' + file.name + '": não encontrei o cabeçalho do leiaute (colunas MAT e COMPETENCIA) nas 20 primeiras linhas.' };
    faltam = PF.CAMPOS.filter(c => ix[c[0]] == null);
    const obrig = faltam.filter(c => c[2]);
    if (obrig.length) return { ok: false, msg: '"' + file.name + '": faltam colunas obrigatórias: ' + obrig.map(c => c[1]).join(', ') + '.' };

    const id = ++db.seq;
    const probs = new Map();
    const prob = (tipo, ex) => { let p = probs.get(tipo); if (!p) probs.set(tipo, (p = { tipo, n: 0, ex: [] })); p.n++; if (p.ex.length < 5 && ex != null && p.ex.indexOf(ex) < 0) p.ex.push(ex); };
    const snaps = new Map(), fatos = [], pares = new Set(), comps = new Set(), dup = new Map();
    const conf = ['cargo', 'dir', 'coord', 'superv', 'nucleo', 'salBase', 'situacao'].filter(k => ix[k] != null);
    let lidas = 0, ignoradas = 0, nl = cabLinha;

    for (const linha of it) {
      nl++;
      const g = k => (ix[k] == null ? null : linha[ix[k]]);
      const matB = g('mat'), codB = g('cod'), valB = g('valor'), compB = g('comp');
      if (matB == null && codB == null && valB == null && compB == null) continue;
      const cd = PF.paraData(compB, doc.d1904);
      if (!cd) { ignoradas++; prob('Competência vazia ou inválida (linha ignorada)', 'linha ' + nl); continue; }
      const mat = txt(matB);
      if (!mat) { ignoradas++; prob('Matrícula vazia (linha ignorada)', 'linha ' + nl); continue; }
      const cod = txt(codB);
      if (!cod) { ignoradas++; prob('Código de rubrica vazio (linha ignorada)', 'linha ' + nl); continue; }
      const v = PF.paraNum(valB);
      if (v == null) { ignoradas++; prob('Valor vazio ou não numérico (linha ignorada)', 'linha ' + nl); continue; }
      const c = ckey(cd);
      const tf = txt(g('tf')) || PF.NI;
      const tcalc = txt(g('tcalc')), desc = txt(g('desc'));
      const sk = c + '|' + mat + '|' + tf;
      let s = snaps.get(sk);
      if (!s) {
        s = criaSnap(g, mat, cd, doc.d1904, prob);
        s._l = conf.map(k => linha[ix[k]]);
        snaps.set(sk, s);
      } else {
        for (let i = 0; i < conf.length; i++) if (s._l[i] !== linha[ix[conf[i]]]) { prob('Dados cadastrais diferentes entre linhas do mesmo colaborador no mês', mat + ' em ' + c); break; }
      }
      let r = db.rub.get(cod);
      if (!r) { r = { cod, desc, tcalc, sug: 'I', cls: 'I' }; db.rub.set(cod, r); }
      else {
        if (!r.desc && desc) r.desc = desc;
        if (!r.tcalc && tcalc) r.tcalc = tcalc;
        if (tcalc && r.tcalc && PF.norm(tcalc) !== PF.norm(r.tcalc)) prob('Rubrica com mais de um tipo de cálculo', cod);
        else if (desc && r.desc && PF.norm(desc) !== PF.norm(r.desc)) prob('Rubrica com mais de uma descrição', cod);
      }
      if (!desc) prob('Rubrica sem descrição', cod);
      const ref = PF.paraNum(g('ref'));
      const dk = sk + '|' + cod + '|' + ref + '|' + v;
      dup.set(dk, (dup.get(dk) || 0) + 1);
      fatos.push({ c, m: mat, tf, cod, ref, v, s, r, k: id, dup: false, dk });
      pares.add(c + '|' + tf);
      comps.add(c);
      lidas++;
    }
    if (!lidas) return { ok: false, msg: '"' + file.name + '": nenhuma linha de dados válida.' };
    for (const f of fatos) { if (dup.get(f.dk) > 1) f.dup = true; delete f.dk; }
    snaps.forEach(s => { delete s._l; });

    const nomes = new Map();
    snaps.forEach(s => { if (!s.nome) return; const a = nomes.get(s.mat); if (a == null) nomes.set(s.mat, s.nome); else if (PF.norm(a) !== PF.norm(s.nome)) prob('Matrícula com mais de um nome', s.mat); });

    const antes = db.fatos.length;
    db.fatos = db.fatos.filter(f => !pares.has(f.c + '|' + f.tf));
    const substituidas = antes - db.fatos.length;
    for (const f of fatos) db.fatos.push(f);
    db.cargas.push({
      id, nome: file.name, hash, aba, quando: new Date(), lidas, ignoradas, substituidas, ativas: lidas,
      comps: [...comps].sort(), faltam: faltam.map(c => c[1]), extras, probs: [...probs.values()],
    });
    return { ok: true, lidas, ignoradas, substituidas, comps: comps.size };
  };

  /* Recalcula tudo o que deriva dos fatos. Chamar depois de cargas e de ajustes no dicionário. */
  PF.reindexar = function () {
    const db = PF.db;
    for (const r of db.rub.values()) { r.sug = PF.classeSugerida(r); r.cls = PF.ajustes[r.cod] || r.sug; }
    const cubo = new Map(), ativas = new Map(), usados = new Set();
    for (const f of db.fatos) {
      const k = f.c + '|' + f.m + '|' + f.tf;
      let x = cubo.get(k);
      if (!x) cubo.set(k, (x = { c: f.c, m: f.m, tf: f.tf, s: f.s, P: 0, D: 0, L: 0, E: 0, B: 0, V: 0, I: 0, nP: 0 }));
      x[f.r.cls] += f.v;
      if (f.r.cls === 'P') x.nP++;
      ativas.set(f.k, (ativas.get(f.k) || 0) + 1);
      usados.add(f.cod);
    }
    for (const cod of [...db.rub.keys()]) if (!usados.has(cod)) db.rub.delete(cod);
    db.cargas.forEach(c => { c.ativas = ativas.get(c.id) || 0; });
    db.cel = [...cubo.values()];
    db.porComp = new Map();
    db.pessoas = new Map();
    const tfs = new Set();
    for (const x of db.cel) {
      let a = db.porComp.get(x.c);
      if (!a) db.porComp.set(x.c, (a = []));
      a.push(x);
      let p = db.pessoas.get(x.c);
      if (!p) db.pessoas.set(x.c, (p = new Map()));
      if (!p.has(x.m)) p.set(x.m, x.s);
      tfs.add(x.tf);
    }
    db.comps = [...db.porComp.keys()].sort();
    db.tfs = [...tfs].sort();
    const st = PF.st;
    if (!db.comps.length) st.comp = null;
    else if (!st.comp || db.comps.indexOf(st.comp) < 0) st.comp = db.comps[db.comps.length - 1];
  };

  /* ---------- filtros e consultas ---------- */
  PF.st = {
    tela: 'geral', comp: null, cmp: 'ant', tf: '*', dir: '*', coord: '*', superv: '*', vinc: '*', sit: '*', medida: 'custo',
    ocultar: false,
  };
  PF.passa = function (x) {
    const st = PF.st, s = x.s;
    return (st.tf === '*' || x.tf === st.tf) && (st.dir === '*' || s.dir === st.dir) && (st.coord === '*' || s.coord === st.coord) &&
      (st.superv === '*' || s.superv === st.superv) && (st.vinc === '*' || s.vinculo === st.vinc) && (st.sit === '*' || s.situacao === st.sit);
  };
  PF.filtroUnidadeAtivo = () => { const st = PF.st; return st.dir !== '*' || st.coord !== '*' || st.superv !== '*' || st.vinc !== '*' || st.sit !== '*'; };
  PF.compCmp = function (c) {
    const db = PF.db;
    c = c || PF.st.comp;
    if (!c) return null;
    if (PF.st.cmp === 'ano') { const k = (+c.slice(0, 4) - 1) + c.slice(4); return db.porComp.has(k) ? k : null; }
    const i = db.comps.indexOf(c);
    return i > 0 ? db.comps[i - 1] : null;
  };
  PF.zero = () => ({ P: 0, D: 0, L: 0, E: 0, B: 0, V: 0, I: 0, hc: 0 });
  const soma = (a, x) => { a.P += x.P; a.D += x.D; a.L += x.L; a.E += x.E; a.B += x.B; a.V += x.V; a.I += x.I; };
  PF.somar = soma;

  /* Células (colaborador × tipo de folha) de uma competência que passam nos filtros. */
  PF.celulas = function (c, extra) {
    const a = PF.db.porComp.get(c) || [];
    return a.filter(x => PF.passa(x) && (!extra || extra(x)));
  };
  /* Total da competência sob os filtros. */
  PF.total = function (c, extra) {
    const t = PF.zero(), m = new Set();
    for (const x of PF.celulas(c, extra)) { soma(t, x); m.add(x.m); }
    t.hc = m.size;
    return t;
  };
  /* Agrupa a competência por uma função do cadastro. Devolve Map chave -> acumulado com hc. */
  PF.porGrupo = function (c, fn, extra) {
    const out = new Map(), mats = new Map();
    for (const x of PF.celulas(c, extra)) {
      const g = fn(x.s, x);
      let a = out.get(g);
      if (!a) { out.set(g, (a = PF.zero())); mats.set(g, new Set()); }
      soma(a, x);
      mats.get(g).add(x.m);
    }
    out.forEach((a, g) => { a.hc = mats.get(g).size; });
    return out;
  };
  /* Uma linha por colaborador na competência (somando tipos de folha). */
  PF.pessoasDe = function (c, extra) {
    const out = new Map();
    for (const x of PF.celulas(c, extra)) {
      let p = out.get(x.m);
      if (!p) out.set(x.m, (p = Object.assign(PF.zero(), { m: x.m, s: x.s })));
      soma(p, x);
    }
    return out;
  };
  PF.nome = s => (PF.st.ocultar ? 'Matrícula ' + s.mat : (s.nome || 'Matrícula ' + s.mat));
  PF.lotacao = s => [s.dir, s.coord, s.superv, s.nucleo].filter(Boolean).join(' › ') || PF.NI;

  PF.quantil = function (ord, q) {
    if (!ord.length) return null;
    const p = (ord.length - 1) * q, i = Math.floor(p), f = p - i;
    return i + 1 < ord.length ? ord[i] + f * (ord[i + 1] - ord[i]) : ord[i];
  };
  PF.media = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  /* Marcos de gestão: datas definidas pelo usuário, guardadas neste navegador. */
  PF.marcos = (function () {
    let m = [];
    try { m = JSON.parse(localStorage.getItem('pf.marcos') || 'null'); } catch (e) { m = null; }
    if (!Array.isArray(m)) m = ((window.PF_CONFIG || {}).marcos || []).slice();
    return m.filter(x => x && x.nome && /^\d{4}-\d{2}$/.test(x.competencia));
  })();
  PF.salvarMarcos = function () { try { localStorage.setItem('pf.marcos', JSON.stringify(PF.marcos)); } catch (e) { /* sem armazenamento */ } };
})();

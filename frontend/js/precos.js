/* ========= Tabela de preços =========
   - Os valores padrão vêm da planilha "Tabela de Preços.xlsx" (Projetos/Prospecção).
   - Só vão para state.precos quando você edita algo. Até lá, o dashboard usa o padrão
     (assim um navegador vazio não "cria" dados e não atrapalha a sincronização com a nuvem).
   - Piso = menor valor aceito na negociação: preço × (1 − desconto máximo), arredondado para baixo terminando em 7. */
const TIERS = ['Low','Médio','High'];
const TIER_COR = {Low:'var(--c5)', 'Médio':'var(--c1)', High:'var(--c6)'};
const PRECOS_PADRAO = {
  servicos: [
    {id:'site-low',  nome:'Site', tier:'Low',   desc:'Landing page de 1 página, WhatsApp, mapa e Google Meu Negócio', codigo:697,  completo:997,  mensal:100},
    {id:'site-med',  nome:'Site', tier:'Médio', desc:'Site de 4 a 6 páginas, SEO local e Google Meu Negócio',          codigo:1797, completo:2497, mensal:197},
    {id:'site-high', nome:'Site', tier:'High',  desc:'Site completo com agendamento online, textos e métricas',        codigo:4497, completo:5997, mensal:397},
    {id:'bot-low',   nome:'Chatbot WhatsApp', tier:'Low',   desc:'Menu com respostas prontas e passagem para humano',  codigo:897,  completo:1297, mensal:147},
    {id:'bot-med',   nome:'Chatbot WhatsApp', tier:'Médio', desc:'IA treinada com dados do negócio, agenda ou recebe pedidos', codigo:2197, completo:2997, mensal:297},
    {id:'bot-high',  nome:'Chatbot WhatsApp', tier:'High',  desc:'IA ligada a agenda, CRM e PIX, com vários atendentes', codigo:0,  completo:6997, mensal:697},
    {id:'auto-low',  nome:'Automações', tier:'Low',   desc:'1 fluxo (ex.: lembrete ou confirmação de consulta)', codigo:497,  completo:697,  mensal:97},
    {id:'auto-med',  nome:'Automações', tier:'Médio', desc:'3 a 5 fluxos',                                       codigo:1497, completo:1997, mensal:197},
    {id:'auto-high', nome:'Automações', tier:'High',  desc:'Processo inteiro automatizado e integrado',          codigo:3497, completo:4997, mensal:397},
    {id:'dash-low',  nome:'Dashboard', tier:'Low',   desc:'Painel simples com os principais números',            codigo:497,  completo:697,  mensal:77},
    {id:'dash-med',  nome:'Dashboard', tier:'Médio', desc:'Painel web com 1 ou 2 fontes de dados',               codigo:1497, completo:1997, mensal:197},
    {id:'dash-high', nome:'Dashboard', tier:'High',  desc:'Várias fontes, atualização automática e login por usuário', codigo:3997, completo:4997, mensal:397},
  ],
  pacotes: [
    {id:'pac-presenca',    nome:'Presença',    tier:'Low',   itens:['site-low','bot-low'],                           implantacao:1797,  mensal:197},
    {id:'pac-crescimento', nome:'Crescimento', tier:'Médio', itens:['site-med','bot-med','auto-med'],                implantacao:5997,  mensal:497},
    {id:'pac-completo',    nome:'Completo',    tier:'High',  itens:['site-high','bot-high','auto-high','dash-high'], implantacao:17997, mensal:1497},
  ],
  descontoMax: {Low:.10, 'Médio':.10, High:.15, pacote:.05},
};
const precos = () => state.precos || PRECOS_PADRAO;
// primeira edição: copia o padrão para os dados (e daí em diante sincroniza com a nuvem)
const precosEditaveis = () => state.precos || (state.precos = JSON.parse(JSON.stringify(PRECOS_PADRAO)));
const piso = (v,desc) => v>0 ? Math.max(0, Math.floor((v*(1-desc)-7)/10)*10+7) : 0;
const servico = id => precos().servicos.find(s=>s.id===id);
const avulsoDe = p => p.itens.map(servico).filter(Boolean).reduce((a,s)=>({imp:a.imp+s.completo, men:a.men+s.mensal}),{imp:0,men:0});

/* Produto escolhido num formulário: "s:<id>:completo", "s:<id>:codigo" ou "p:<id>" */
function produtoInfo(cod){
  if(!cod) return null;
  const [tipo,id,modo] = cod.split(':'), P = precos();
  if(tipo==='p'){
    const p = P.pacotes.find(x=>x.id===id); if(!p) return null;
    return {nome:`Pacote ${p.nome}`, tier:p.tier, valor:p.implantacao, mensal:p.mensal, piso:piso(p.implantacao,P.descontoMax.pacote), desc:P.descontoMax.pacote};
  }
  const s = servico(id); if(!s) return null;
  if(modo==='codigo') return {nome:`${s.nome} ${s.tier} · só código`, tier:s.tier, valor:s.codigo, mensal:0, piso:s.codigo, desc:0};
  const d = P.descontoMax[s.tier]||0;
  return {nome:`${s.nome} ${s.tier}`, tier:s.tier, valor:s.completo, mensal:s.mensal, piso:piso(s.completo,d), desc:d};
}
function produtoOptions(sel, atual){
  const P = precos();
  sel.innerHTML = '<option value="">Personalizado (sem tabela)</option>' + TIERS.map(t=>{
    const pac = P.pacotes.filter(p=>p.tier===t).map(p=>`<option value="p:${p.id}">Pacote ${esc(p.nome)} · ${brl(p.implantacao)} + ${brl(p.mensal)}/mês</option>`);
    const sv = P.servicos.filter(s=>s.tier===t).flatMap(s=>[
      `<option value="s:${s.id}:completo">${esc(s.nome)} · ${brl(s.completo)} + ${brl(s.mensal)}/mês</option>`,
      ...(s.codigo>0 ? [`<option value="s:${s.id}:codigo">${esc(s.nome)} · só código · ${brl(s.codigo)}</option>`] : [])]);
    return `<optgroup label="${t} ticket">${[...pac,...sv].join('')}</optgroup>`;
  }).join('');
  sel.value = atual && produtoInfo(atual) ? atual : '';
}
// aviso de piso embaixo do campo de valor
function pisoAviso(el, info, valor){
  if(!info){ el.textContent=''; el.className='piso-hint'; return; }
  const abaixo = valor>0 && valor < info.piso;
  el.className = 'piso-hint' + (abaixo ? ' neg' : '');
  el.innerHTML = abaixo
    ? `Abaixo do piso de ${brl(info.piso)}. Tire escopo em vez de baixar o preço.`
    : `Tabela ${brl(info.valor)}${info.desc ? ` · piso ${brl(info.piso)} (até ${Math.round(info.desc*100)}% de desconto)` : ' · sem desconto'}`;
}

/* ---- Tela Preços ---- */
const tierTag = t => `<span class="tier-tag" style="--tc:${TIER_COR[t]}">${t}</span>`;
const precoIn = (path,v) => `<input class="price-in" data-preco="${path}" inputmode="decimal" value="${v ? String(v).replace('.',',') : ''}" placeholder="—">`;
let precoTier = '';
function renderPrecos(){
  const P = precos(), D = P.descontoMax;
  const fil = x => !precoTier || x.tier===precoTier;
  document.querySelectorAll('#precoTiers button').forEach(b=>b.classList.toggle('on', b.dataset.tier===precoTier));

  document.getElementById('precoServicos').innerHTML = P.servicos.map((s,i)=>!fil(s)?'':`<tr>
    <td><div class="name">${esc(s.nome)}</div><div class="company">${esc(s.desc)}</div></td>
    <td>${tierTag(s.tier)}</td>
    <td class="num">${precoIn(`servicos.${i}.codigo`,s.codigo)}</td>
    <td class="num">${precoIn(`servicos.${i}.completo`,s.completo)}</td>
    <td class="num">${precoIn(`servicos.${i}.mensal`,s.mensal)}</td>
    <td class="num piso">${brl(piso(s.completo,D[s.tier]||0))}</td>
    <td class="num"><b>${brl(s.completo+12*s.mensal)}</b></td></tr>`).join('');

  document.getElementById('precoPacotes').innerHTML = P.pacotes.map((p,i)=>{
    if(!fil(p)) return '';
    const a = avulsoDe(p), off = a.imp ? 1-p.implantacao/a.imp : 0, eco = (a.imp+12*a.men)-(p.implantacao+12*p.mensal);
    return `<tr>
    <td><div class="name">${esc(p.nome)}</div><div class="company">${p.itens.map(id=>esc(servico(id)?.nome||id)).join(' + ')}</div></td>
    <td>${tierTag(p.tier)}</td>
    <td class="num"><s class="riscado">${brl(a.imp)}</s><div class="company"><s>${brl(a.men)}/mês</s></div></td>
    <td class="num">${precoIn(`pacotes.${i}.implantacao`,p.implantacao)}</td>
    <td class="num">${precoIn(`pacotes.${i}.mensal`,p.mensal)}</td>
    <td class="num">${Math.round(off*100)}%</td>
    <td class="num piso">${brl(piso(p.implantacao,D.pacote))}</td>
    <td class="num pos"><b>${brl(eco)}</b></td></tr>`;}).join('');

  const pct = (k,label,sub) => `<label class="desc-lim"><span>${label}<small>${sub}</small></span>
    <span class="pct-in"><input data-desc="${k}" inputmode="numeric" value="${Math.round((D[k]||0)*100)}">%</span></label>`;
  document.getElementById('precoDescontos').innerHTML =
    pct('Low','Low','implantação') + pct('Médio','Médio','implantação') + pct('High','High','à vista ou em etapas') + pct('pacote','Pacotes','além do desconto do pacote');

  // quantos clientes cobrem os gastos fixos do mês selecionado
  const fixos = monthStats(month).fixed, mrr = monthStats(month).mrr;
  const alvos = [...P.pacotes.map(p=>({nome:`Pacote ${p.nome}`, tier:p.tier, m:p.mensal})),
                 ...P.servicos.filter(s=>s.nome==='Site').map(s=>({nome:`Site ${s.tier}`, tier:s.tier, m:s.mensal}))];
  const falta = Math.max(0, fixos - mrr);
  document.getElementById('precoEquilibrio').innerHTML = !fixos
    ? '<div class="empty" style="padding:16px 8px">Cadastre seus gastos fixos no Financeiro para ver quantos clientes precisa.</div>'
    : `<p class="hint">Gastos fixos de ${monthName(month,{month:'long'})}: <b>${brl(fixos)}</b> · manutenções atuais: <b>${brl(mrr)}</b>${falta ? ` · faltam <b class="neg">${brl(falta)}/mês</b>` : ' · <b class="pos">já cobertos</b>'}</p>`
      + alvos.map(x=>{ const n = x.m ? Math.ceil(falta/x.m) : 0;
          return `<div class="hbar"><span>${esc(x.nome)}</span><div class="track"><div style="width:${falta?Math.min(100,(x.m/falta)*100):100}%;background:${TIER_COR[x.tier]}"></div></div><span class="n">${falta ? n+' cliente'+(n!==1?'s':'') : '✓'}</span></div>`; }).join('');

  document.getElementById('precoReset').style.display = state.precos ? '' : 'none';
}

document.getElementById('view-precos').addEventListener('change', e=>{
  const el = e.target;
  if(el.dataset.preco){
    const P = precosEditaveis(), [lista,i,campo] = el.dataset.preco.split('.');
    P[lista][+i][campo] = parseMoney(el.value);
    save(); render(); toast('Preço atualizado');
  }
  if(el.dataset.desc){
    const v = Math.min(90, Math.max(0, parseInt(el.value)||0));
    precosEditaveis().descontoMax[el.dataset.desc] = v/100;
    save(); render(); toast('Limite de desconto atualizado');
  }
});
document.getElementById('precoTiers').onclick = e=>{
  const b = e.target.closest('button'); if(!b) return;
  precoTier = b.dataset.tier; renderPrecos();
};
document.getElementById('precoReset').onclick = ()=>{
  if(!confirm('Voltar todos os preços e limites de desconto para os valores da planilha?')) return;
  delete state.precos; save(); render(); toast('Preços restaurados');
};

/* ---- Cliente: escolher serviço/pacote preenche os valores ---- */
(()=>{
  const f = document.getElementById('clientForm'), sel = document.getElementById('clientProduto'), hint = document.getElementById('clientPiso');
  const atualiza = ()=> pisoAviso(hint, produtoInfo(sel.value), parseMoney(f.valorVenda.value));
  sel.onchange = ()=>{
    const info = produtoInfo(sel.value);
    if(info){ f.valorVenda.value = moneyInput(info.valor); f.manutencao.value = moneyInput(info.mensal); }
    atualiza();
  };
  f.valorVenda.addEventListener('input', atualiza);
  window.clientProdutoPreparar = (atual)=>{ produtoOptions(sel, atual); atualiza(); };
})();

/* ---- Prospecção: proposta enviada ---- */
(()=>{
  const f = document.getElementById('prospForm'), sel = document.getElementById('prospProduto'), hint = document.getElementById('prospPiso');
  const atualiza = ()=> pisoAviso(hint, produtoInfo(sel.value), parseMoney(f.propostaValor.value));
  sel.onchange = ()=>{
    const info = produtoInfo(sel.value);
    if(info){ f.propostaValor.value = moneyInput(info.valor); f.propostaMensal.value = moneyInput(info.mensal); }
    else { f.propostaValor.value = ''; f.propostaMensal.value = ''; }
    atualiza();
  };
  f.propostaValor.addEventListener('input', atualiza);
  window.prospProdutoPreparar = (p)=>{
    produtoOptions(sel, p?.propostaProduto);
    f.propostaValor.value = moneyInput(p?.propostaValor); f.propostaMensal.value = moneyInput(p?.propostaMensal);
    atualiza();
  };
})();
// soma das propostas das conversas em andamento
function emNegociacao(){
  const abertas = state.prospects.filter(p=>OPEN_SITS.includes(p.situacao) && (p.propostaValor||p.propostaMensal));
  return {n:abertas.length, imp:abertas.reduce((a,p)=>a+(p.propostaValor||0),0), men:abertas.reduce((a,p)=>a+(p.propostaMensal||0),0)};
}

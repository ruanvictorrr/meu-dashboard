/* ========= Formulários ========= */
const clientDlg = document.getElementById('clientDlg'), expenseDlg = document.getElementById('expenseDlg');
function openClient(id){
  const f = document.getElementById('clientForm'); f.reset();
  const c = state.clients.find(x=>x.id===id);
  document.getElementById('clientDlgTitle').textContent = c ? 'Editar cliente' : 'Novo cliente';
  f.id.value = c?.id||''; f.nome.value=c?.nome||''; f.empresa.value=c?.empresa||'';
  f.valorVenda.value = moneyInput(c?.valorVenda); f.manutencao.value = moneyInput(c?.manutencao);
  f.dataVenda.value = c?.dataVenda || new Date().toISOString().slice(0,10);
  f.diaPagamento.value = c?.diaPagamento || ''; f.ativo.value = c ? (c.ativo?'1':'0') : '1';
  clientProdutoPreparar(c?.produto);
  clientDlg.showModal(); f.nome.focus();
}
document.getElementById('clientForm').addEventListener('submit',e=>{
  const f = e.target, id = f.id.value;
  const data = { nome:f.nome.value.trim(), empresa:f.empresa.value.trim(), valorVenda:parseMoney(f.valorVenda.value),
    manutencao:parseMoney(f.manutencao.value), dataVenda:f.dataVenda.value,
    diaPagamento:Math.min(31,Math.max(1,parseInt(f.diaPagamento.value)||1)), ativo:f.ativo.value==='1', produto:f.produto.value||null };
  if(id){
    const c = state.clients.find(x=>x.id===id);
    if(c.ativo && !data.ativo) data.inativoDesde = shiftMonth(thisMonth,1);
    if(data.ativo) data.inativoDesde = null;
    Object.assign(c,data); toast('Cliente atualizado');
  } else {
    const nc = {id:uid(),pagamentos:{},...data}; state.clients.push(nc);
    if(pendingProspect){ const p = state.prospects.find(x=>x.id===pendingProspect); if(p) p.clienteId = nc.id; }
    toast('Cliente cadastrado');
  }
  pendingProspect = null;
  save(); render();
});
function openExpense(id){
  const f = document.getElementById('expenseForm'); f.reset();
  const x = state.expenses.find(e=>e.id===id);
  document.getElementById('expenseDlgTitle').textContent = x ? 'Editar gasto fixo' : 'Novo gasto fixo';
  const cats = [...new Set([...DEFAULT_CATS,...state.expenses.map(e=>e.categoria)])];
  document.getElementById('catList').innerHTML = cats.map(c=>`<option value="${esc(c)}">`).join('');
  f.id.value=x?.id||''; f.nome.value=x?.nome||''; f.valor.value=moneyInput(x?.valor); f.dia.value=x?.dia||''; f.categoria.value=x?.categoria||''; f.desde.value=x?.desde||month;
  expenseDlg.showModal(); f.nome.focus();
}
document.getElementById('expenseForm').addEventListener('submit',e=>{
  const f = e.target, id = f.id.value;
  const data = {nome:f.nome.value.trim(), valor:parseMoney(f.valor.value), dia:parseInt(f.dia.value)||null, categoria:f.categoria.value.trim()||'Outros', desde:f.desde.value||thisMonth};
  if(id){ Object.assign(state.expenses.find(x=>x.id===id),data); toast('Gasto atualizado'); }
  else { state.expenses.push({id:uid(),pagos:{},...data}); toast('Gasto cadastrado'); }
  save(); render();
});
const varDlg = document.getElementById('varDlg');
function openVar(id){
  renderVariable();
  const v = state.variaveis.find(x=>x.id===id), f = document.getElementById('varForm'); f.reset();
  document.getElementById('varDlgTitle').textContent = v ? 'Editar gasto' : 'Novo gasto';
  f.id.value=v?.id||''; f.descricao.value=v?.descricao||''; f.valor.value=moneyInput(v?.valor); f.categoria.value=v?.categoria||'';
  f.data.value = v?.data || (month===thisMonth ? new Date().toLocaleDateString('sv-SE') : month+'-01');
  f.clienteId.value=v?.clienteId||''; f.recorrencia.value=v?.recorrencia||'unico';
  varDlg.showModal(); f.descricao.focus();
}
document.getElementById('varForm').addEventListener('submit',e=>{
  const f = e.target, valor = parseMoney(f.valor.value);
  const data = {descricao:f.descricao.value.trim(), valor, data:f.data.value, categoria:f.categoria.value.trim()||'Outros',
    clienteId:f.clienteId.value||null, recorrencia:f.recorrencia.value};
  if(f.id.value){
    const v = state.variaveis.find(x=>x.id===f.id.value); Object.assign(v,data);
    if(v.recorrencia==='anual') v.canceladoDesde = null;
    toast('Gasto atualizado');
  } else {
    state.variaveis.push({id:uid(),renovacoes:{},pago:true,criado:new Date().toISOString(),...data});
    toast(data.recorrencia==='anual' ? 'Gasto lançado — vou lembrar da renovação no ano que vem' : 'Gasto lançado');
  }
  if(data.data.slice(0,7)!==month) month = data.data.slice(0,7);
  save(); render();
});
document.getElementById('addVarBtn').onclick=()=>openVar();
const prospDlg = document.getElementById('prospDlg');
document.getElementById('prospSitSelect').innerHTML = SITS.map(x=>`<option value="${x.k}">${x.label}</option>`).join('');
function openProsp(id){
  renderProspects();
  const p = state.prospects.find(x=>x.id===id), f = document.getElementById('prospForm'); f.reset();
  document.getElementById('prospDlgTitle').textContent = p ? 'Editar prospecção' : 'Nova prospecção';
  f.id.value=p?.id||''; f.nome.value=p?.nome||''; f.nicho.value=p?.nicho||''; f.numero.value=p?.numero||'';
  f.data.value=p ? (p.data||'') : new Date().toLocaleDateString('sv-SE'); f.situacao.value=p?.situacao||'novo'; f.obs.value=p?.obs||''; f.bairro.value=p?.bairro||''; f.cidade.value=p?.cidade||''; f.endereco.value=p?.endereco||'';
  prospProdutoPreparar(p);
  prospDlg.showModal(); f.nome.focus();
}
document.getElementById('prospForm').addEventListener('submit',e=>{
  const f = e.target;
  const data = {nome:f.nome.value.trim(), nicho:f.nicho.value.trim(), numero:f.numero.value.trim(), data:f.data.value || (f.situacao.value==='a_contatar' ? '' : today()), situacao:f.situacao.value, obs:f.obs.value.trim(), bairro:f.bairro.value.trim(), cidade:f.cidade.value.trim(), endereco:f.endereco.value.trim(), atualizado:new Date().toISOString(),
    propostaProduto:f.propostaProduto.value||null, propostaValor:parseMoney(f.propostaValor.value), propostaMensal:parseMoney(f.propostaMensal.value)};
  // hora do envio (para a "Resposta por horário"): só quando o contato é de hoje, senão a hora seria falsa
  const marcaHora = x => { if(x.situacao!=='a_contatar' && !x.contatadoEm && x.data===today()) x.contatadoEm = new Date().toISOString(); if(x.situacao==='followup' && !x.followupEm) x.followupEm = new Date().toISOString(); };
  if(f.id.value){ const x = state.prospects.find(x=>x.id===f.id.value); Object.assign(x,data); marcaHora(x); toast('Prospecção atualizada'); }
  else { const x = {id:uid(),...data}; marcaHora(x); state.prospects.push(x); toast('Prospecção cadastrada'); }
  save(); render();
});
document.getElementById('addProspBtn').onclick=()=>openProsp();
document.getElementById('prospSearch').oninput=()=>{ prospLimit=50; renderProspects(); };
document.getElementById('prospValue').onchange=()=>{ prospLimit=50; renderProspects(); };
document.getElementById('prospField').onchange=e=>{
  const v = e.target.value, pick = ['bairro','cidade'].includes(v);
  const inp = document.getElementById('prospSearch'), sel = document.getElementById('prospValue');
  inp.style.display = pick ? 'none' : ''; sel.style.display = pick ? '' : 'none';
  inp.value = ''; sel.value = '';
  inp.placeholder = {nome:'Digite o nome…', numero:'Digite o número…', obs:'Digite parte da observação…', tudo:'Digite qualquer coisa…'}[v] || '';
  prospLimit=50; renderProspects(); if(!pick) inp.focus();
};
document.getElementById('prospFilter').onchange=()=>{ prospLimit=50; renderProspects(); };
// cabeçalho clicável: 1º clique ordena, 2º inverte, 3º volta à ordem padrão (data começa pelos mais recentes)
document.querySelectorAll('.rt-prosp th[data-sort]').forEach(th=>{
  th.tabIndex = 0; th.title = 'Clique para ordenar';
  const go = ()=>{
    const k = th.dataset.sort, first = k==='data' ? -1 : 1;
    prospSort = prospSort.k!==k ? {k, dir:first} : prospSort.dir===first ? {k, dir:-first} : {k:'', dir:1};
    renderProspects();
  };
  th.onclick = go; th.onkeydown = e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } };
});
document.getElementById('prospSort').onchange=e=>{ const [k,d] = e.target.value.split(':'); prospSort = {k:k||'', dir:+d||1}; renderProspects(); };
document.getElementById('prospNicho').onchange=()=>{ prospLimit=50; renderProspects(); };
document.getElementById('prospClear').onclick=()=>{
  const fld = document.getElementById('prospField'); fld.value = 'nome'; fld.dispatchEvent(new Event('change'));
  document.getElementById('prospNicho').value = '';
  document.getElementById('prospFilter').value = 'contacted';
  const d = document.getElementById('prospDate'); d.value = 'any'; d.dispatchEvent(new Event('change'));
};
document.getElementById('prospDate').onchange=e=>{
  const day = document.getElementById('prospDateDay');
  day.style.display = e.target.value==='day' ? '' : 'none';
  if(e.target.value==='day' && !day.value) day.value = today();
  prospLimit=50; renderProspects();
};
document.getElementById('prospDateDay').onchange=()=>{ prospLimit=50; renderProspects(); };
document.getElementById('prospMoreBtn').onclick=()=>{ prospLimit+=100; renderProspects(); };
document.getElementById('importProspBtn').onclick=()=>document.getElementById('importProspFile').click();
document.getElementById('importProspFile').onchange=async e=>{
  const file = e.target.files[0]; e.target.value=''; if(!file) return;
  try{ await importProspectFile(file); }catch(err){ console.error(err); toast(err.message||'Não consegui ler a planilha'); }
};
document.addEventListener('change',e=>{
  const el = e.target.closest('[data-sit]'); if(!el) return;
  const p = state.prospects.find(x=>x.id===el.dataset.sit);
  if(p.situacao==='a_contatar' && el.value!=='a_contatar'){ if(!p.data) p.data = today(); if(!p.contatadoEm) p.contatadoEm = new Date().toISOString(); }
  if(el.value==='followup' && p.situacao!=='followup') p.followupEm = new Date().toISOString();
  p.situacao = el.value; p.atualizado = new Date().toISOString();
  save(); render();
  toast(p.situacao==='fechou' ? `🎉 ${p.nome} deu certo! Use "Virar cliente" para cadastrar.` : `Situação: ${sit(p.situacao).label}`);
});
let pendingProspect = null;
const FBCFG = {
  cli: { get:{nome:c=>c.nome, empresa:c=>c.empresa, tudo:c=>[c.nome,c.empresa].join(' ')}, pick:[], all:{},
         ph:{nome:'Digite o nome…', empresa:'Digite a empresa…', tudo:'Digite qualquer coisa…'}, render:()=>renderClients() },
  exp: { get:{nome:e=>e.nome, categoria:e=>e.categoria, tudo:e=>[e.nome,e.categoria].join(' ')}, pick:['categoria'], all:{categoria:'Todas as categorias'},
         ph:{nome:'Digite o nome do gasto…', tudo:'Digite qualquer coisa…'}, render:()=>renderFinance() },
  var: { get:{descricao:o=>o.v.descricao, categoria:o=>o.v.categoria, cliente:o=>clientName(o.v.clienteId), tudo:o=>[o.v.descricao,o.v.categoria,clientName(o.v.clienteId)].join(' ')},
         pick:['categoria','cliente'], all:{categoria:'Todas as categorias', cliente:'Todos os clientes'},
         ph:{descricao:'Digite a descrição…', tudo:'Digite qualquer coisa…'}, render:()=>renderVariable() },
};
const fbEl = id => document.querySelector(`.filter-by[data-fb="${id}"]`);
function fbOptions(id, items){
  const el = fbEl(id), cfg = FBCFG[id], f = el.querySelector('.fb-field').value;
  if(!cfg.pick.includes(f)) return;
  const sel = el.querySelector('.fb-pick'), counts = {};
  items.forEach(it=>{ const v = (cfg.get[f](it)||'').trim(); if(v) counts[v]=(counts[v]||0)+1; });
  const cur = sel.value;
  sel.innerHTML = `<option value="">${cfg.all[f]}</option>` + Object.keys(counts).sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${esc(v)}">${esc(v)} (${counts[v]})</option>`).join('');
  sel.value = counts[cur] ? cur : '';
}
function fbOk(id, it){
  const el = fbEl(id), cfg = FBCFG[id], f = el.querySelector('.fb-field').value;
  if(cfg.pick.includes(f)){ const v = el.querySelector('.fb-pick').value; return !v || (cfg.get[f](it)||'').trim()===v; }
  const q = normName(el.querySelector('.fb-text').value);
  return !q || normName(cfg.get[f](it)||'').includes(q);
}
document.querySelectorAll('.filter-by[data-fb]').forEach(el=>{
  const cfg = FBCFG[el.dataset.fb], fld = el.querySelector('.fb-field'), txt = el.querySelector('.fb-text'), pk = el.querySelector('.fb-pick');
  fld.onchange = ()=>{
    const pick = cfg.pick.includes(fld.value);
    txt.style.display = pick ? 'none' : ''; pk.style.display = pick ? '' : 'none';
    txt.value = ''; pk.value = ''; txt.placeholder = cfg.ph[fld.value] || 'Digite…';
    cfg.render(); if(!pick) txt.focus();
  };
  txt.oninput = cfg.render; pk.onchange = cfg.render;
});
document.getElementById('expStatus').onchange = renderFinance;
document.getElementById('varStatus').onchange = renderVariable;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.getElementById('clientDlg').addEventListener('close',()=>{ if(document.getElementById('clientDlg').returnValue!=='') return; setTimeout(()=>pendingProspect=null,0); });

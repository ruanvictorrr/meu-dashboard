/* ========= Eventos ========= */
document.addEventListener('click',e=>{
  const t = e.target.closest('button'); if(!t) return;
  const d = t.dataset;
  if(d.pay){ const c=state.clients.find(x=>x.id===d.pay); c.pagamentos=c.pagamentos||{};
    if(c.pagamentos[month]) delete c.pagamentos[month]; else { c.pagamentos[month]=new Date().toISOString(); toast(`Pagamento de ${c.empresa||c.nome} registrado`); }
    save(); render(); }
  if(d.payExp){ const x=state.expenses.find(y=>y.id===d.payExp); x.pagos=x.pagos||{};
    if(x.pagos[month]) delete x.pagos[month]; else x.pagos[month]=new Date().toISOString(); save(); render(); }
  if(d.editClient) openClient(d.editClient);
  if(d.editExp) openExpense(d.editExp);
  if(d.editVar) openVar(d.editVar);
  if(d.editProsp) openProsp(d.editProsp);
  if(d.delProsp){ const p=state.prospects.find(x=>x.id===d.delProsp);
    if(confirm(`Excluir a prospecção "${p.nome}"?`)){ state.prospects=state.prospects.filter(x=>x.id!==p.id); save(); render(); toast('Prospecção excluída'); } }
  if(d.toClient){ const p=state.prospects.find(x=>x.id===d.toClient); pendingProspect = p.id;
    openClient(); const f=document.getElementById('clientForm'); f.empresa.value=p.nome; f.nome.focus(); }
  if(d.payVar){ const [id,ano,renov]=d.payVar.split('|'), v=state.variaveis.find(x=>x.id===id);
    if(renov==='1'){ v.renovacoes=v.renovacoes||{}; if(v.renovacoes[ano]) delete v.renovacoes[ano]; else v.renovacoes[ano]=new Date().toISOString(); }
    else v.pago = v.pago===false;
    save(); render(); }
  if(d.renew){ const [id,ano]=d.renew.split('|'), v=state.variaveis.find(x=>x.id===id); v.renovacoes=v.renovacoes||{};
    if(v.renovacoes[ano]) delete v.renovacoes[ano]; else { v.renovacoes[ano]=new Date().toISOString(); toast(`${v.descricao} renovado`); }
    save(); render(); }
  if(d.stop){ const [id,ano]=d.stop.split('|'), v=state.variaveis.find(x=>x.id===id);
    if(confirm(`Parar de renovar "${v.descricao}" a partir de ${ano}? O histórico fica guardado.`)){ v.canceladoDesde=ano; save(); render(); toast('Renovação encerrada'); } }
  if(d.delVar){ const v=state.variaveis.find(x=>x.id===d.delVar);
    if(confirm(`Excluir "${v.descricao}" (${brl(v.valor)})?${v.recorrencia==='anual'?'\n\nIsso remove também as renovações futuras. Se só não vai mais renovar, use "Não renovar" no mês da renovação.':''}`)){ state.variaveis=state.variaveis.filter(x=>x.id!==v.id); save(); render(); toast('Gasto excluído'); } }
  if(d.delClient){ const c=state.clients.find(x=>x.id===d.delClient);
    if(confirm(`Excluir ${c.nome}? O histórico de pagamentos dele também será apagado.\n\nDica: se o contrato acabou, edite e marque como "Inativo" para manter o histórico.`)){ state.clients=state.clients.filter(x=>x.id!==c.id); save(); render(); toast('Cliente excluído'); } }
  if(d.delExp){ const x=state.expenses.find(y=>y.id===d.delExp);
    if(confirm(`Excluir o gasto "${x.nome}"?`)){ state.expenses=state.expenses.filter(y=>y.id!==x.id); save(); render(); toast('Gasto excluído'); } }
});
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+b.dataset.tab));
  try{ localStorage.setItem(KEY+'-tab',b.dataset.tab); }catch(e){}
});
document.getElementById('prevMonth').onclick=()=>{month=shiftMonth(month,-1);render();};
document.getElementById('nextMonth').onclick=()=>{month=shiftMonth(month,1);render();};
document.getElementById('monthLabel').ondblclick=()=>{month=thisMonth;render();};
document.getElementById('todayBtn').onclick=()=>{ if(month!==thisMonth){ month=thisMonth; render(); toast('De volta para '+monthName(thisMonth)); } };
document.getElementById('addClientBtn').onclick=()=>openClient();
document.getElementById('addExpenseBtn').onclick=()=>openExpense();

document.getElementById('clientFilter').onchange=renderClients;
document.querySelectorAll('#view-clients th[data-sort]').forEach(th=>th.onclick=()=>{
  if(sortKey===th.dataset.sort) sortDir*=-1; else {sortKey=th.dataset.sort; sortDir=1;} renderClients();
});

/* Menu de dados */
const menuPop = document.getElementById('menuPop');
const closeMenu = ()=>menuPop.classList.remove('open');
document.getElementById('menuBtn').onclick=e=>{e.stopPropagation();menuPop.classList.toggle('open');};
document.addEventListener('click',e=>{ if(!e.target.closest('.menu')) closeMenu(); });
document.getElementById('exportBtn').onclick=()=>{
  closeMenu();
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`meu-dashboard-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  state.lastBackup = new Date().toISOString(); save();
};
document.getElementById('importBtn').onclick=()=>{closeMenu();document.getElementById('importFile').click();};
document.getElementById('importFile').onchange=async e=>{
  const file = e.target.files[0]; if(!file) return;
  try{
    const s = JSON.parse(await file.text());
    if(!Array.isArray(s.clients)||!Array.isArray(s.expenses)) throw 0;
    s.variaveis = Array.isArray(s.variaveis) ? s.variaveis : []; s.prospects = Array.isArray(s.prospects) ? s.prospects : []; migrate(s);
    if(confirm(`Restaurar backup com ${s.clients.length} clientes, ${s.expenses.length} gastos e ${s.prospects.length} leads?\nOs dados atuais serão substituídos (dá para desfazer depois em Dados → Desfazer).`)){ guardarAntes('restaurar backup'); state=s; save(); render(); toastDesfazer('Backup restaurado'); }
  }catch(err){ toast('Arquivo inválido'); }
  e.target.value='';
};
document.getElementById('resetBtn').onclick=()=>{
  closeMenu();
  if(confirm('Apagar TODOS os clientes e gastos? Faça um backup antes, se quiser guardar.') && confirm('Tem certeza? Dá para desfazer logo depois em Dados → Desfazer.')){ guardarAntes('apagar todos os dados'); state={clients:[],expenses:[],variaveis:[],prospects:[]}; save(); render(); toastDesfazer('Dados apagados'); }
};
document.getElementById('themeBtn').onclick=()=>{
  closeMenu();
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  try{ localStorage.setItem(KEY+'-theme',document.documentElement.dataset.theme); }catch(e){}
};
document.getElementById('demoBtn').onclick=()=>{
  closeMenu();
  if((state.clients.length||state.expenses.length||state.variaveis.length||state.prospects.length) && !confirm('Isso substitui seus dados atuais por dados de exemplo (dá para desfazer em Dados → Desfazer). Continuar?')) return;
  if(state.clients.length||state.expenses.length||state.variaveis.length||state.prospects.length) guardarAntes('carregar dados de exemplo');
  const d = n => { const x=new Date(); x.setMonth(x.getMonth()-n); return x.toISOString().slice(0,10); };
  const paidMonths = (since,skip=[]) => { const o={}; for(let i=since-1;i>=1;i--){ const k=shiftMonth(thisMonth,-i); if(!skip.includes(i)) o[k]='x'; } return o; };
  state = { clients:[
    {id:uid(),nome:'Mariana Lopes',empresa:'Lopes Odontologia',valorVenda:4800,dataVenda:d(7),manutencao:350,diaPagamento:5,ativo:true,pagamentos:{...paidMonths(7),[thisMonth]:'x'}},
    {id:uid(),nome:'Carlos Mendes',empresa:'Mendes Auto Peças',valorVenda:6500,dataVenda:d(5),manutencao:450,diaPagamento:10,ativo:true,pagamentos:paidMonths(5)},
    {id:uid(),nome:'Fernanda Rocha',empresa:'Studio FR',valorVenda:3200,dataVenda:d(4),manutencao:250,diaPagamento:1,ativo:true,pagamentos:paidMonths(4)},
    {id:uid(),nome:'João Pereira',empresa:'Pereira Advocacia',valorVenda:5500,dataVenda:d(2),manutencao:400,diaPagamento:20,ativo:true,pagamentos:paidMonths(2)},
    {id:uid(),nome:'Ana Beatriz',empresa:'Doce Encanto',valorVenda:2800,dataVenda:d(0),manutencao:200,diaPagamento:15,ativo:true,pagamentos:{}},
  ], expenses:[
    {id:uid(),nome:'Hospedagem dos sites',categoria:'Hospedagem',valor:180,dia:5,pagos:{}},
    {id:uid(),nome:'Ferramentas de design',categoria:'Ferramentas',valor:120,dia:12,pagos:{}},
    {id:uid(),nome:'Assinatura de IA',categoria:'Ferramentas',valor:110,dia:3,pagos:{}},
    {id:uid(),nome:'Contador + DAS',categoria:'Impostos',valor:420,dia:20,pagos:{}},
    {id:uid(),nome:'Anúncios',categoria:'Marketing',valor:300,dia:8,pagos:{}},
    {id:uid(),nome:'Internet',categoria:'Escritório',valor:110,dia:15,pagos:{}},
  ], variaveis:[]};
  state.expenses.forEach(e=>e.desde=shiftMonth(thisMonth,-6));
  const pd = n => { const x=new Date(); x.setDate(x.getDate()-n); return x.toLocaleDateString('sv-SE'); };
  state.prospects = [
    ['Pizzaria Bella Massa','Pizzaria / hamburgueria','(11) 98765-4321','Quer site com cardápio e botão de pedido.','proposta',2],
    ['Clínica Sorriso','Clínica / saúde','(11) 99876-1234','Fechou site + manutenção.','fechou',20],
    ['Barbearia Navalha','Beleza / estética','(11) 97654-3210','Achou caro, talvez ano que vem.','perdeu',15],
    ['Academia FitMax','Academia','(11) 96543-2109','Mandei mensagem, visualizou e não respondeu.','sem_resposta',10],
    ['Hamburgueria Smash','Pizzaria / hamburgueria','(11) 95432-1098','Gostou do portfólio, pediu prazo.','conversa',1],
    ['Studio Glow','Beleza / estética','(11) 94321-0987','Fechou landing page.','fechou',30],
    ['Imobiliária Lar Novo','Imobiliária','(11) 93210-9876','','novo',0],
  ].map(([nome,nicho,numero,obs,situacao,d])=>({id:uid(),nome,nicho,numero,obs,situacao,data:pd(d),atualizado:new Date(Date.now()-d*864e5).toISOString()}));
  const cid = n => state.clients[n].id;
  const back = (mBack,day) => { const k=shiftMonth(thisMonth,-mBack); return k+'-'+String(Math.min(day,daysIn(k),mBack?31:new Date().getDate())).padStart(2,'0'); };
  [[0,1,'Domínio doceencanto.com.br','Domínio',40,4,'anual'],[0,2,'Tema premium do site','Template / tema',249,4,'unico'],
   [11,18,'Domínio lopesodonto.com.br','Domínio',40,0,'anual'],[10,14,'Licença Elementor Pro','Licença / plugin',390,null,'anual'],
   [1,6,'Fotos de banco de imagens','Serviço terceirizado',120,3,'unico'],[2,10,'SSD externo para backups','Equipamento',459,null,'unico'],
   [5,4,'Domínio mendesautopecas.com.br','Domínio',40,1,'anual'],[12,20,'Hospedagem anual Studio FR','Hospedagem',360,2,'anual']]
   .forEach(([m,dd,descricao,categoria,valor,c,recorrencia])=>state.variaveis.push({id:uid(),descricao,categoria,valor,data:back(m,dd),clienteId:c===null?null:cid(c),recorrencia,renovacoes:{},criado:new Date().toISOString()}));
  save(); render(); toast('Dados de exemplo carregados');
};

/* Tooltip */
const tip = document.getElementById('tip');
document.addEventListener('mousemove',e=>{
  const el = e.target.closest('[data-tip]');
  if(!el){ tip.style.opacity=0; return; }
  tip.textContent = el.dataset.tip; tip.style.opacity=1;
  const w = tip.offsetWidth; tip.style.left = Math.min(innerWidth-w-8, e.clientX+12)+'px'; tip.style.top = (e.clientY+14)+'px';
});
function toast(msg, acao){
  const t=document.getElementById('toast'); t.textContent=msg;
  if(acao){ const b=document.createElement('button'); b.type='button'; b.textContent=acao.label; b.onclick=()=>{ t.classList.remove('show'); acao.fn(); }; t.appendChild(b); }
  t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), acao ? (acao.ms||15000) : 2200);
}

/* Desfazer troca de dados (restaurar backup, apagar tudo, dados de exemplo):
   antes de substituir, guarda uma cópia dos dados atuais. "Desfazer" troca de volta
   (e guarda o que estava, então dá para refazer clicando de novo). */
const KEY_ANTES = KEY + '-antes-da-troca';
function guardarAntes(motivo){
  try{ localStorage.setItem(KEY_ANTES, JSON.stringify({em:new Date().toISOString(), motivo, dados:state})); }
  catch(e){ toast('Aviso: não consegui guardar a cópia para desfazer'); }
  renderUndoBtn();
}
function lerAntes(){ try{ return JSON.parse(localStorage.getItem(KEY_ANTES)||'null'); }catch(e){ return null; } }
function desfazerTroca(){
  const a = lerAntes(); if(!a || !a.dados){ toast('Nada para desfazer'); return; }
  const motivo = a.motivo;
  guardarAntes('desfazer ' + motivo);
  state = a.dados; migrate(state); save(); render();
  toast(`Desfeito: voltaram os dados de antes de "${motivo}"`, {label:'Refazer', fn:desfazerTroca});
}
function toastDesfazer(msg){ toast(msg, {label:'Desfazer', fn:desfazerTroca}); }
function renderUndoBtn(){
  const b = document.getElementById('undoReplaceBtn'), a = lerAntes(); if(!b) return;
  b.hidden = !a;
  if(a) b.textContent = `↶ Desfazer "${a.motivo}" (${new Date(a.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})})`;
}
document.getElementById('undoReplaceBtn').onclick = ()=>{ closeMenu(); const a=lerAntes(); if(a && confirm(`Voltar os dados de antes de "${a.motivo}" (${new Date(a.em).toLocaleString('pt-BR')})?\nOs dados atuais ficam guardados: dá para refazer depois.`)) desfazerTroca(); };

/* Sincroniza entre abas e atualiza status automaticamente */
window.addEventListener('storage',e=>{ if(e.key===KEY){ state=load(); render(); } });
setInterval(()=>{ const now=ym(new Date()); if(now!==thisMonth) location.reload(); else render(); }, 60*60*1000);

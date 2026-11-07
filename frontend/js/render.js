/* ========= Renderização ========= */
function render(){
  const ml = monthName(month); document.getElementById('monthLabel').textContent = ml[0].toUpperCase()+ml.slice(1);
  const tb = document.getElementById('todayBtn'); tb.classList.toggle('here', month===thisMonth); tb.title = month===thisMonth ? 'Você já está no mês atual' : 'Voltar para '+monthName(thisMonth);
  renderOverview(); renderClients(); renderFinance(); renderVariable(); renderProspects(); renderProximos();
}
function kpi(label,value,sub='',cls=''){
  return `<div class="card kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>`;
}

function renderOverview(){
  const s = monthStats(month), prev = monthStats(shiftMonth(month,-1));
  const delta = (a,b) => { if(!b) return ''; const p=((a-b)/Math.abs(b))*100; return `<span class="${p>=0?'pos':'neg'}">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(0)}%</span> vs mês anterior`; };
  document.getElementById('kpisOverview').innerHTML =
    kpi('Receita recorrente (MRR)', brl(s.mrr), `${s.billed} cliente${s.billed!==1?'s':''} pagando manutenção`) +
    kpi('Vendas no mês', brl(s.sales), `${s.salesCount} venda${s.salesCount!==1?'s':''} · ${delta(s.sales,prev.sales)||'—'}`) +
    kpi('Gastos do mês', brl(s.costs), `Fixos ${brl(s.fixed)} · outros ${brl(s.variable)}`) +
    kpi('Lucro previsto', brl(s.profit), s.revenue ? `Margem de ${((s.profit/s.revenue)*100).toFixed(0)}%` : 'Cadastre clientes para ver', s.profit>=0?'pos':'neg');

  // Alertas automáticos (somente no mês atual)
  const alerts = [];
  if(month === thisMonth){
    const late = state.clients.filter(c=>clientStatus(c,month).code==='late');
    const soon = state.clients.filter(c=>clientStatus(c,month).code==='soon');
    if(late.length) alerts.push(`<div class="alert late">⚠ <span><b>${late.length} manutenç${late.length>1?'ões atrasadas':'ão atrasada'}</b> — ${late.map(c=>esc(c.empresa||c.nome)).join(', ')} · ${brl(late.reduce((a,c)=>a+c.manutencao,0))}</span></div>`);
    if(soon.length) alerts.push(`<div class="alert soon">⏰ <span><b>Vencendo nos próximos 5 dias:</b> ${soon.map(c=>`${esc(c.empresa||c.nome)} (dia ${c.diaPagamento})`).join(', ')}</span></div>`);
    const expSoon = state.expenses.filter(e=>{ if(!expActive(e,month)||e.pagos?.[month]||!e.dia) return false; const d=Math.round((dueDate(month,e.dia)-today0())/86400000); return d>=0&&d<=3; });
    const renSoon = upcomingRenewals().filter(r=>r.days<=30);
    if(renSoon.length) alerts.push(`<div class="alert soon">↻ <span><b>Renovações nos próximos 30 dias:</b> ${renSoon.map(r=>`${esc(r.v.descricao)}${r.v.clienteId?' ('+esc(clientName(r.v.clienteId))+')':''} — ${brl(r.v.valor)} em ${r.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`).join(', ')}</span></div>`);
    if(expSoon.length) alerts.push(`<div class="alert soon">💳 <span><b>Contas a pagar em até 3 dias:</b> ${expSoon.map(e=>`${esc(e.nome)} (${brl(e.valor)})`).join(', ')}</span></div>`);
  }
  document.getElementById('alerts').innerHTML = alerts.join('');

  // Lista de recebimentos
  const due = state.clients.filter(c=>billsIn(c,month))
    .sort((a,b)=>(!!a.pagamentos?.[month])-(!!b.pagamentos?.[month]) || a.diaPagamento-b.diaPagamento);
  document.getElementById('dueList').innerHTML = due.length ? due.map(c=>{
    const st = clientStatus(c,month), paid = st.code==='paid';
    return `<div class="list-item">
      <div style="display:flex;gap:10px;align-items:center;min-width:0">
        <button class="check ${paid?'on':''}" data-pay="${c.id}" title="${paid?'Desmarcar':'Marcar como pago'}">${paid?CHECK:''}</button>
        <div class="l"><div class="name">${esc(c.empresa||c.nome)}</div><div class="company">Dia ${c.diaPagamento} · ${brl(c.manutencao)}</div></div>
      </div>
      <span class="badge ${badgeCls(st.code)}">${st.label}</span>
    </div>`;}).join('') + `<div style="padding-top:12px;display:flex;justify-content:space-between;font-size:13px"><span class="pos">Recebido ${brl(s.received)}</span><span class="${s.pending?'neg':''}">A receber ${brl(s.pending)}</span></div>`
    : `<div class="empty">Nenhuma manutenção para ${monthName(month,{month:'long'})}.<br><button class="btn sm" style="margin-top:10px" onclick="openClient()">+ Cadastrar cliente</button></div>`;

  renderBars();
}
const badgeCls = c => ({paid:'ok',late:'late',soon:'soon',idle:'idle',open:'idle'}[c]);

function renderBars(){
  const months = Array.from({length:6},(_,i)=>shiftMonth(month,i-5));
  const data = months.map(k=>({k,...monthStats(k)}));
  const W=640,H=240,pl=48,pr=8,pt=10,pb=28;
  const max = Math.max(1,...data.map(d=>Math.max(d.mrr+d.sales,d.costs)));
  const nice = niceMax(max), cw=(W-pl-pr)/6, bw=Math.min(28,cw/3.2);
  const y = v => pt + (H-pt-pb)*(1-v/nice);
  let g='';
  for(let i=0;i<=4;i++){ const v=nice*i/4; g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" ${i?'stroke-dasharray="3 4"':''}/><text x="${pl-8}" y="${y(v)+4}" text-anchor="end">${brlShort(v)}</text>`; }
  data.forEach((d,i)=>{
    const cx = pl + cw*i + cw/2, x1 = cx - bw - 2, x2 = cx + 2;
    const hM = y(0)-y(d.mrr), hS = y(0)-y(d.sales), hF = y(0)-y(d.fixed), hV = y(0)-y(d.variable);
    const tip = `${monthName(d.k,{month:'short',year:'2-digit'})}: manutenções ${brl(d.mrr)} · vendas ${brl(d.sales)} · fixos ${brl(d.fixed)} · outros ${brl(d.variable)}`;
    g += `<g data-tip="${esc(tip)}" style="cursor:default">
      <rect x="${cx-cw/2+2}" y="${pt}" width="${cw-4}" height="${H-pt-pb}" fill="transparent"/>
      <rect x="${x1}" y="${y(d.mrr)}" width="${bw}" height="${Math.max(0,hM)}" fill="var(--c1)" rx="3"/>
      <rect x="${x1}" y="${y(d.mrr+d.sales)}" width="${bw}" height="${Math.max(0,hS)}" fill="var(--c2)" rx="3"/>
      <rect x="${x2}" y="${y(d.fixed)}" width="${bw}" height="${Math.max(0,hF)}" fill="var(--c4)" rx="3"/>
      <rect x="${x2}" y="${y(d.costs)}" width="${bw}" height="${Math.max(0,hV)}" fill="var(--c3)" rx="3"/>
      <text x="${cx}" y="${H-8}" text-anchor="middle" style="${d.k===month?'font-weight:600;fill:var(--text)':''}">${monthName(d.k,{month:'short'}).replace('.','')}</text></g>`;
  });
  document.getElementById('barChart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de entradas e gastos">${g}</svg>`;
}
const DONUT_COLORS = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)'];
function donutHTML(byCat,emptyMsg){
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  if(!cats.length) return `<div class="empty">${emptyMsg}</div>`;
  const colors = DONUT_COLORS, total = cats.reduce((a,c)=>a+c[1],0), R=70, r=46, C=90; let ang=-Math.PI/2, paths='';
  cats.forEach(([n,v],i)=>{
    const a = (v/total)*Math.PI*2, a2 = ang + a - (cats.length>1?0.02:0);
    const large = a>Math.PI?1:0;
    const p = cats.length===1
      ? `M${C} ${C-R}A${R} ${R} 0 1 1 ${C-0.01} ${C-R}L${C-0.01} ${C-r}A${r} ${r} 0 1 0 ${C} ${C-r}Z`
      : `M${C+R*Math.cos(ang)} ${C+R*Math.sin(ang)}A${R} ${R} 0 ${large} 1 ${C+R*Math.cos(a2)} ${C+R*Math.sin(a2)}L${C+r*Math.cos(a2)} ${C+r*Math.sin(a2)}A${r} ${r} 0 ${large} 0 ${C+r*Math.cos(ang)} ${C+r*Math.sin(ang)}Z`;
    paths += `<path d="${p}" fill="${colors[i%colors.length]}" data-tip="${esc(n)}: ${brl(v)} (${((v/total)*100).toFixed(0)}%)"/>`;
    ang += a;
  });
  return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <svg viewBox="0 0 180 180" width="160" height="160">${paths}
        <text x="90" y="86" text-anchor="middle">Total</text>
        <text x="90" y="104" text-anchor="middle" style="font-size:14px;font-weight:700;fill:var(--text)">${brlShort(total)}</text></svg>
      <div class="legend" style="flex:1;min-width:150px">${cats.map(([n,v],i)=>`<div><i style="background:${colors[i%colors.length]}"></i>${esc(n)}<span class="v">${brl(v)}</span></div>`).join('')}</div>
    </div>`;
}

function renderVariable(){
  const s = monthStats(month), prev = monthStats(shiftMonth(month,-1));
  const occ = varOccurrences(month);
  const byCat = {}; occ.forEach(o=>byCat[o.v.categoria]=(byCat[o.v.categoria]||0)+o.v.valor);
  const diff = prev.variable ? ((s.variable-prev.variable)/prev.variable)*100 : null;
  const annual = state.variaveis.filter(v=>v.recorrencia==='anual' && !(v.canceladoDesde && v.canceladoDesde<=String(new Date().getFullYear()+1)));
  const annualTotal = annual.reduce((a,v)=>a+v.valor,0);
  const pendingRen = occ.filter(o=>!o.pago && o.renov);
  document.getElementById('kpisVariable').innerHTML =
    kpi('Total no mês', brl(s.variable), `${s.varCount} gasto${s.varCount!==1?'s':''}${pendingRen.length?` · ${pendingRen.length} renovaç${pendingRen.length>1?'ões':'ão'} prevista${pendingRen.length>1?'s':''}`:''}`) +
    kpi('Já pago', brl(s.variablePaid), s.variable-s.variablePaid ? `<span class="neg">Falta pagar ${brl(s.variable-s.variablePaid)}</span>` : 'Nada pendente') +
    kpi('Vs mês anterior', diff===null ? '—' : `${diff>0?'▲':'▼'} ${Math.abs(diff).toFixed(0)}%`, `Mês passado: ${brl(prev.variable)}`, diff===null?'':diff>0?'neg':'pos') +
    kpi('Custos anuais recorrentes', brl(annualTotal), annual.length ? `${annual.length} item${annual.length>1?'s':''} · ≈ ${brl(annualTotal/12)}/mês` : 'Nenhum gasto anual cadastrado');

  fbOptions('var', occ);
  const vs = document.getElementById('varStatus').value;
  const rows = occ.filter(o=>fbOk('var',o) && (vs==='all' || (vs==='pago'&&o.pago) || (vs==='apagar'&&!o.pago) || (vs==='renov'&&o.renov) || (vs==='anual'&&o.v.recorrencia==='anual')))
    .sort((a,b)=>b.data.localeCompare(a.data));
  const totalMonth = s.variable || 1;
  document.getElementById('varRows').innerHTML = rows.length ? rows.map(o=>{
    const v = o.v, cn = clientName(v.clienteId), key = `${v.id}|${o.ano}|${o.renov?1:0}`;
    let tag = '';
    if(o.pago) tag = `<span class="badge ok">${o.renov?'Renovado':'Pago'}</span>`;
    else if(o.renov) tag = '<span class="badge soon">Renovação prevista</span>';
    else tag = '<span class="badge late">A pagar</span>';
    return `<tr>
      <td><button class="check ${o.pago?'on':''}" data-pay-var="${key}" title="${o.pago?'Desmarcar':'Marcar como pago'}">${o.pago?CHECK:''}</button></td>
      <td><span class="name">${esc(v.descricao)}</span> ${tag}${v.recorrencia==='anual'?' <span class="badge idle">↻ Anual</span>':''}</td>
      <td>${esc(v.categoria)}</td>
      <td>${cn?esc(cn):'—'}</td>
      <td>${new Date(o.data+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</td>
      <td class="num">${brl(v.valor)}</td>
      <td class="num">${((v.valor/totalMonth)*100).toFixed(1)}%</td>
      <td style="text-align:right">${o.renov&&!o.pago?`<button class="btn sm ghost" data-stop="${v.id}|${o.ano}" title="Não vou mais renovar">Não renovar</button>`:''}<button class="btn sm ghost" data-edit-var="${v.id}">Editar</button><button class="btn sm ghost danger" data-del-var="${v.id}">Excluir</button></td>
    </tr>`;}).join('')
    : `<tr><td colspan="8" class="empty">${occ.length?'Nada encontrado.':'Nenhum outro gasto neste mês. Clique em <b>+ Novo gasto</b> para lançar um domínio, licença, equipamento…'}</td></tr>`;
  document.getElementById('varDonut').innerHTML = donutHTML(byCat,'Sem gastos neste mês.');

  const ren = upcomingRenewals();
  document.getElementById('renewList').innerHTML = ren.length ? ren.slice(0,8).map(r=>{
    const cn = clientName(r.v.clienteId);
    const badge = r.days<0 ? `<span class="badge late">Venceu há ${-r.days}d</span>` : r.days<=30 ? `<span class="badge soon">${r.days===0?'Hoje':`Em ${r.days} dias`}</span>` : `<span class="badge idle">${r.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}</span>`;
    return `<div class="list-item"><div class="l"><div class="name">${esc(r.v.descricao)}</div><div class="company">${cn?esc(cn)+' · ':''}${brl(r.v.valor)}</div></div>${badge}</div>`;
  }).join('') + (ren.length>8?`<div class="company" style="padding-top:8px">+ ${ren.length-8} outras</div>`:'')
    : `<div class="empty" style="padding:20px 8px">Nenhuma renovação prevista.<br>Marque "Renova todo ano" ao lançar um domínio, licença etc.</div>`;

  const cats = [...new Set([...VAR_CATS,...state.variaveis.map(v=>v.categoria)])];
  document.getElementById('varCatList').innerHTML = cats.map(c=>`<option value="${esc(c)}">`).join('');
  const opts = '<option value="">— Nenhum —</option>' + [...state.clients].sort((a,b)=>(a.empresa||a.nome).localeCompare(b.empresa||b.nome,'pt-BR')).map(c=>`<option value="${c.id}">${esc(c.empresa||c.nome)}</option>`).join('');
  document.querySelectorAll('.client-select').forEach(sel=>{ const val=sel.value; sel.innerHTML=opts; sel.value=val; });
}

const waLink = n => { let d = String(n||'').replace(/\D/g,''); if(!d) return ''; if(d.length<=11) d = '55'+d; return 'https://wa.me/'+d; };
const today = () => new Date().toLocaleDateString('sv-SE');
let prospLimit = 50;
function fieldOk(p){
  const field = document.getElementById('prospField').value;
  if(['nicho','bairro','cidade'].includes(field)){ const v = document.getElementById('prospValue').value; return !v || (p[field]||'').trim()===v; }
  const q = normName(document.getElementById('prospSearch').value); if(!q) return true;
  if(field==='numero'){ const d = q.replace(/\D/g,''); return d ? phoneKey(p.numero).includes(d) : true; }
  const txt = field==='tudo' ? [p.nome,p.nicho,p.numero,p.obs,p.bairro,p.cidade,p.endereco].join(' ') : (p[field]||'');
  return normName(txt).includes(q);
}
function dateOk(d){
  const mode = document.getElementById('prospDate').value;
  if(mode==='any') return true;
  if(!d) return false;
  const shift = n => { const x = new Date(); x.setDate(x.getDate()+n); return x.toLocaleDateString('sv-SE'); };
  if(mode==='today') return d===today();
  if(mode==='yesterday') return d===shift(-1);
  if(mode==='7d') return d>=shift(-6) && d<=today();
  if(mode==='month') return d.slice(0,7)===today().slice(0,7);
  if(mode==='day'){ const v = document.getElementById('prospDateDay').value; return !v || d===v; }
  return true;
}
function renderProspects(){
  const all = state.prospects;
  const count = k => all.filter(p=>p.situacao===k).length;
  const contacted = all.filter(p=>p.situacao!=='a_contatar');
  const won = count('fechou'), lost = count('perdeu'), noAns = count('sem_resposta');
  const open = all.filter(p=>OPEN_SITS.includes(p.situacao)).length;
  const closed = won + lost + noAns;
  const todayN = contacted.filter(p=>p.data===today()).length;
  const pct = all.length ? (contacted.length/all.length)*100 : 0;
  document.getElementById('kpisProspects').innerHTML =
    kpi('Lista contatada', all.length ? pct.toFixed(pct<10?1:0).replace('.',',')+'%' : '—', all.length ? `${contacted.length} de ${all.length} leads · <b>${todayN} hoje</b>` : 'Importe uma planilha ou cadastre') +
    kpi('Em andamento', open, `${count('aguardando')} aguardando resposta · ${count('proposta')} com proposta`) +
    kpi('Deram certo', won, `${lost} não deram certo · ${noAns} sem resposta`, won?'pos':'') +
    kpi('Taxa de conversão', closed ? ((won/closed)*100).toFixed(0)+'%' : '—', closed ? `${won} de ${closed} conversas encerradas` : 'Ainda sem conversas encerradas', closed ? (won/closed>=.2?'pos':'') : '');

  // funil (sem a fila "A contatar")
  const fsits = SITS.filter(x=>x.k!=='a_contatar');
  const maxN = Math.max(1,...fsits.map(x=>count(x.k)));
  document.getElementById('prospFunnel').innerHTML = contacted.length ? fsits.map(x=>`<div class="hbar"><span>${x.label}</span><div class="track"><div style="width:${(count(x.k)/maxN)*100}%;background:${x.color}"></div></div><span class="n">${count(x.k)}</span></div>`).join('')
    + (count('a_contatar')?`<div class="company" style="padding-top:8px">+ ${count('a_contatar')} na fila "A contatar"</div>`:'')
    : `<div class="empty" style="padding:24px 8px">${all.length?`${all.length} leads na fila. Mude a situação quando entrar em contato.`:'Nenhuma prospecção ainda.'}</div>`;

  // nicho
  const by = {};
  contacted.forEach(p=>{ const n = p.nicho||'Sem nicho'; by[n]=by[n]||{t:0,w:0,c:0}; by[n].t++; if(p.situacao==='fechou'){by[n].w++;by[n].c++;} if(['perdeu','sem_resposta'].includes(p.situacao)) by[n].c++; });
  const nich = Object.entries(by).sort((a,b)=>b[1].t-a[1].t).slice(0,7);
  document.getElementById('prospNiche').innerHTML = nich.length ? nich.map(([n,v])=>{
    const r = v.c ? v.w/v.c : 0;
    return `<div class="hbar" data-tip="${esc(n)}: ${v.t} contatado${v.t>1?'s':''} · ${v.w} deu certo · ${v.c} encerrada${v.c!==1?'s':''}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n)}</span><div class="track"><div style="width:${r*100}%;background:${r>=.3?'var(--green)':r>0?'var(--amber)':'var(--red)'}"></div></div><span class="n">${v.c?Math.round(r*100)+'%':'—'}</span></div>`;}).join('')
    : `<div class="empty" style="padding:24px 8px">Preencha o nicho para ver qual converte melhor.</div>`;

  // filtro (padrão: só quem já foi contatado)
  const fsel = document.getElementById('prospFilter');
  if(!fsel.options.length){
    fsel.innerHTML = '<option value="contacted">Já contatados</option><option value="open">Em andamento</option><option value="all">Todos (inclui a fila)</option>' + SITS.map(x=>`<option value="${x.k}">${x.label}</option>`).join('');
    fsel.value = 'contacted';
  }
  const f = fsel.value;
  // opções do "Filtrar por" quando é nicho/bairro
  const field = document.getElementById('prospField').value, vsel = document.getElementById('prospValue');
  if(['nicho','bairro','cidade'].includes(field)){
    const counts = {}; all.forEach(p=>{ const v = (p[field]||'').trim(); if(v) counts[v]=(counts[v]||0)+1; });
    const cur = vsel.value;
    vsel.innerHTML = `<option value="">${({nicho:'Todos os nichos',bairro:'Todos os bairros',cidade:'Todas as cidades'})[field]}</option>` + Object.keys(counts).sort((a,b)=>{ if(field==='cidade'){ const o=['Recife','Caruaru','Olinda','Paulista'], ia=o.indexOf(a), ib=o.indexOf(b); if(ia!==ib) return (ia<0?99:ia)-(ib<0?99:ib); } return a.localeCompare(b,'pt-BR'); }).map(v=>`<option value="${esc(v)}">${esc(v)} (${counts[v]})</option>`).join('');
    vsel.value = counts[cur] ? cur : '';
  }
  const order = {proposta:0,conversa:1,aguardando:2,decidindo:3,novo:4,fechou:5,sem_resposta:6,perdeu:7,a_contatar:8};
  const filtered = all.filter(p=>{
    if(!fieldOk(p)) return false;
    if(!dateOk(p.data)) return false;
    if(f==='open') return OPEN_SITS.includes(p.situacao);
    if(f==='contacted') return p.situacao!=='a_contatar';
    return f==='all' || p.situacao===f;
  }).sort((a,b)=>(order[a.situacao]??9)-(order[b.situacao]??9) || (b.atualizado||'').localeCompare(a.atualizado||'') || (a.ordem??0)-(b.ordem??0));
  const rows = filtered.slice(0,prospLimit);
  document.getElementById('prospHint').textContent = `${filtered.length} contato${filtered.length!==1?'s':''} neste filtro. Mude a situação direto na tabela; quando der certo, use "Virar cliente".`;
  document.getElementById('prospMore').style.display = filtered.length>prospLimit ? 'block' : 'none';
  document.getElementById('prospMoreBtn').textContent = `Mostrar mais (${filtered.length-prospLimit} restantes)`;
  // rodapé: quantos foram conversados no período do filtro (a fila "A contatar" não conta)
  const talked = filtered.filter(p=>p.situacao!=='a_contatar');
  const totEl = document.getElementById('prospTotal'), dsel = document.getElementById('prospDate');
  const dia = document.getElementById('prospDateDay').value;
  const per = ({any:'Total geral',today:'Total de hoje',yesterday:'Total de ontem','7d':'Total dos últimos 7 dias',month:'Total deste mês',day: dia ? 'Total de '+fmtDate(dia) : 'Total geral'})[dsel.value] || 'Total';
  const fila = filtered.length - talked.length;
  totEl.hidden = !filtered.length;
  totEl.innerHTML = `<div><span class="lbl">${esc(per)}</span><b>${talked.length}</b> lead${talked.length!==1?'s':''} conversado${talked.length!==1?'s':''}${fila?` <span class="fila">+ ${fila} na fila</span>`:''}</div>`
    + `<div class="parts">${SITS.filter(x=>x.k!=='a_contatar').map(x=>[x,talked.filter(p=>p.situacao===x.k).length]).filter(([,n])=>n).map(([x,n])=>`<span><i style="background:${x.color}"></i>${n} ${esc(x.label.toLowerCase())}</span>`).join('')}</div>`;
  document.getElementById('prospRows').innerHTML = rows.length ? rows.map(p=>{
    const st = sit(p.situacao), wa = waLink(p.numero);
    const isClient = p.clienteId && state.clients.some(c=>c.id===p.clienteId);
    const addr = [[p.bairro,p.cidade].filter(Boolean).join(', '),p.endereco].filter(Boolean).join(' · ');
    const maps = p.maps || (p.endereco ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.nome+' '+p.endereco) : '');
    return `<tr>
      <td style="white-space:normal;min-width:220px"><div class="name">${esc(p.nome)}</div>${addr?`<div class="company">${maps?`<a class="wa" style="color:var(--muted)" href="${esc(maps)}" target="_blank" rel="noopener" title="Abrir no Google Maps">📍 ${esc(addr)}</a>`:esc(addr)}</div>`:''}</td>
      <td>${esc(p.nicho||'—')}${seloHorario(p)}</td>
      <td>${p.numero ? (wa?`<a class="wa" href="${wa}" target="_blank" rel="noopener" title="Abrir no WhatsApp">${esc(p.numero)} ↗</a>`:esc(p.numero)) : '—'}</td>
      <td>${fmtDate(p.data)}</td>
      <td><select class="sit-select ${st.cls}" data-sit="${p.id}" aria-label="Situação">${SITS.map(x=>`<option value="${x.k}" ${x.k===p.situacao?'selected':''}>${x.label}</option>`).join('')}</select></td>
      <td><div class="obs${p.obs?'':' vazio'}" title="${esc(p.obs||'')}">${esc(p.obs||'—')}</div></td>
      <td style="text-align:right">${p.situacao==='fechou' ? (isClient?'<span class="badge ok">É cliente</span>':`<button class="btn sm" data-to-client="${p.id}">Virar cliente</button>`) : ''}<button class="btn sm ghost" data-edit-prosp="${p.id}">Editar</button><button class="btn sm ghost danger" data-del-prosp="${p.id}">Excluir</button></td>
    </tr>`;}).join('')
    : `<tr><td colspan="7" class="empty">${all.length?'Nada encontrado com esse filtro.':'Nenhuma prospecção ainda. Clique em <b>+ Nova prospecção</b> ou <b>Importar planilha</b>.'}</td></tr>`;

  renderHorarios(); renderRespostas();
  const nichos = [...new Set([...NICHOS,...all.map(p=>p.nicho).filter(Boolean)])];
  document.getElementById('nichoList').innerHTML = nichos.map(n=>`<option value="${esc(n)}">`).join('');
}

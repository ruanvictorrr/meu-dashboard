/* ========= Importar planilha de prospecção ========= */
// Cor de fundo da 1ª coluna -> situação. rgb em 0..1
function colorToSit(rgb){
  if(!rgb) return null;
  const {r,g,b} = rgb, max = Math.max(r,g,b), min = Math.min(r,g,b);
  if(min > 0.97) return null;                                  // branco
  if(max - min < 0.08) return 'decidindo';                      // cinza
  if(r > 0.8 && g < 0.35 && b < 0.35) return 'perdeu';          // vermelho
  if(r > 0.8 && g >= 0.35 && g < 0.8 && b < 0.4) return 'aguardando'; // laranja
  if(b > 0.6 && g > 0.6 && r < 0.6) return 'aguardando:azul';   // azul claro / ciano
  if(r > 0.8 && g > 0.8 && b < 0.6) return 'decidindo';         // amarelo
  if(g > 0.6 && r < 0.6 && b < 0.6) return 'fechou';            // verde
  return 'decidindo';
}
const argbToRgb = a => { if(!a || typeof a!=='string') return null; const h = a.length===8 ? a.slice(2) : a; return {r:parseInt(h.slice(0,2),16)/255, g:parseInt(h.slice(2,4),16)/255, b:parseInt(h.slice(4,6),16)/255}; };
function parseCSV(text){
  const rows=[]; let row=[], cur='', q=false;
  text = text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else if(c==='"') q=true;
    else if(c===','||c===';'){ row.push(cur); cur=''; }
    else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
    else if(c!=='\r') cur+=c;
  }
  if(cur||row.length){ row.push(cur); rows.push(row); }
  return rows.map(r=>({cells:r, color:null}));
}
async function parseXLSX(buf){
  if(!window.ExcelJS){
    await new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; sc.onload=res; sc.onerror=()=>rej(new Error('Sem internet para ler .xlsx')); document.head.appendChild(sc); });
  }
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.worksheets[0], out = [];
  ws.eachRow({includeEmpty:true},(row,n)=>{
    while(out.length < n-1) out.push({cells:[],color:null});
    const cells = [];
    for(let c=1;c<=Math.max(row.cellCount,8);c++){
      const cell = row.getCell(c); let v = cell.value;
      if(v && typeof v==='object'){ v = v.text ?? v.hyperlink ?? (v.richText ? v.richText.map(t=>t.text).join('') : v.result ?? ''); }
      cells.push(v==null?'':String(v));
    }
    const f = row.getCell(1).fill;
    out.push({cells, color: f && f.type==='pattern' && f.fgColor ? argbToRgb(f.fgColor.argb) : null});
  });
  return out;
}
const fmtPhone = d => { d = String(d||'').replace(/\D/g,''); if(d.startsWith('55') && d.length>=12) d = d.slice(2); if(d.length===11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; if(d.length===10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return d; };
const phoneKey = s => { let d = String(s||'').replace(/\D/g,''); if(d.startsWith('55') && d.length>=12) d = d.slice(2); return d; };
const normName = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const RANK = {a_contatar:0,novo:1,aguardando:2,decidindo:2,conversa:3,proposta:4,sem_resposta:5,perdeu:6,fechou:7};

function dedupeProspects(st){
  const seen = new Map(), keep = []; let merged = 0;
  (st.prospects||[]).forEach(p=>{
    const k = phoneKey(p.numero);
    const ex = k && seen.get(k);
    if(!ex){ if(k) seen.set(k,p); keep.push(p); return; }
    merged++;
    if((RANK[p.situacao]??0) > (RANK[ex.situacao]??0)){ ex.situacao = p.situacao; ex.data = ex.data || p.data; }
    ['bairro','endereco','maps','nicho','data','clienteId'].forEach(f=>{ if(!ex[f] && p[f]) ex[f]=p[f]; });
    if(p.obs && !(ex.obs||'').includes(p.obs)) ex.obs = [ex.obs,p.obs].filter(Boolean).join(' ');
  });
  st.prospects = keep;
  return merged;
}
function rowsToLeads(rows, fileName){
  const hi = rows.findIndex(r=>r.cells.some(c=>/^nome/i.test(c.trim())));
  if(hi<0) throw new Error('Não achei a coluna "Nome" na planilha.');
  const head = rows[hi].cells.map(c=>normName(c));
  const col = (...names) => head.findIndex(h=>names.some(n=>h===n || h.startsWith(n)));
  const C = {nome:col('nome','empresa'), bairro:col('bairro'), tel:col('telefone','fone','numero','celular'), wa:col('whatsapp','wpp','zap'),
    cat:col('categoria'), nicho:col('nicho','segmento'), end:col('endereco'), maps:col('google maps','maps','mapa'),
    obs:col('obs','observ'), sit:col('situacao','status'), data:col('data'), cidade:col('cidade','municipio')};
  const fileNiche = /dentist|odonto/i.test(fileName) ? 'Dentista' : '';
  const leads = [];
  for(let i=hi+1;i<rows.length;i++){
    const r = rows[i].cells, get = k => C[k]>=0 ? String(r[C[k]]||'').trim() : '';
    const nome = get('nome');
    if(!nome && !get('tel') && !get('wa')) { if(leads.length) break; else continue; } // linha vazia = fim da lista
    let waNum = phoneKey(get('wa')); const telNum = phoneKey(get('tel'));
    if(waNum.length < 10) waNum = '';                              // link de WhatsApp quebrado: usa o telefone
    if(!nome || (!waNum && !telNum)) continue;                     // ex.: linhas de cálculo
    let situacao = 'a_contatar', obsExtra = '';
    const txt = normName(get('sit'));
    if(txt){ const m = SITS.find(x=>normName(x.label)===txt || x.k===txt); if(m) situacao = m.k; }
    else { const c = colorToSit(rows[i].color); if(c){ situacao = c.split(':')[0]; if(c.endsWith(':azul')) obsExtra = 'Marcado em azul na planilha (contato conhecido).'; } }
    let nicho = get('nicho');
    if(!nicho){ const cat = get('cat'); nicho = fileNiche || (/dentist|odonto/i.test(cat) ? 'Dentista' : cat); }
    const numero = fmtPhone(waNum || telNum);
    const obs = [get('obs'), obsExtra, (telNum && waNum && telNum!==waNum) ? `Tel.: ${fmtPhone(telNum)}` : ''].filter(Boolean).join(' ');
    let data = '';
    const dRaw = get('data'); const dm = dRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if(dm) data = `${dm[3].length===2?'20'+dm[3]:dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
    leads.push({nome, nicho, numero, bairro:get('bairro').replace(/\s*\(aprox\.?\)/i,''), cidade:get('cidade') || (/recife/i.test(fileName)?'Recife':''), endereco:get('end'), maps:get('maps'), obs, situacao, data, ordem:i});
  }
  return leads;
}

function mergeLeads(leads){
  const t = today(); let novos=0, atualizados=0, iguais=0;
  const byPhone = new Map(), byName = new Map();
  state.prospects.forEach(p=>{ const k=phoneKey(p.numero); if(k) byPhone.set(k,p); byName.set(normName(p.nome),p); });
  leads.forEach(l=>{
    const k = phoneKey(l.numero), byN = byName.get(normName(l.nome));
    const ex = (k && byPhone.get(k)) || (byN && (!k || !phoneKey(byN.numero)) ? byN : null);
    if(!ex){
      const np = {id:uid(), ...l, data: l.data || (l.situacao==='a_contatar' ? '' : t), atualizado:new Date().toISOString(), origem:'planilha'};
      state.prospects.push(np); if(k) byPhone.set(k,np); byName.set(normName(l.nome),np);
      novos++; return;
    }
    // completa dados que faltam
    ['bairro','cidade','endereco','maps','nicho'].forEach(k=>{ if(!ex[k] && l[k]) ex[k]=l[k]; });
    if(l.obs && !(ex.obs||'').includes(l.obs)) ex.obs = [ex.obs,l.obs].filter(Boolean).join(' ');
    // a planilha só muda a situação se não for "voltar para trás" (ex.: branco nunca desfaz um contato)
    if(l.situacao!==ex.situacao && l.situacao!=='a_contatar' && ex.situacao!=='fechou' && (RANK[l.situacao]??0) >= (RANK[ex.situacao]??0)){
      if(ex.situacao==='a_contatar' && !ex.data) ex.data = l.data || t;
      ex.situacao = l.situacao; ex.atualizado = new Date().toISOString(); atualizados++;
    } else iguais++;
  });
  return {novos, atualizados, iguais};
}

async function importProspectFile(file){
  const isX = /\.xlsx$/i.test(file.name);
  const rows = isX ? await parseXLSX(await file.arrayBuffer()) : parseCSV(await file.text());
  const leads = rowsToLeads(rows, file.name);
  if(!leads.length) throw new Error('Nenhum contato encontrado na planilha.');
  const resumo = SITS.map(x=>[x.label, leads.filter(l=>l.situacao===x.k).length]).filter(x=>x[1]).map(x=>`• ${x[0]}: ${x[1]}`).join('\n');
  const aviso = isX ? '' : '\n\n(Arquivo .csv não guarda cores: para ler as cores, baixe a planilha como .xlsx.)';
  if(!confirm(`Encontrei ${leads.length} contatos em "${file.name}":\n\n${resumo}${aviso}\n\nImportar? Quem já está no dashboard não é duplicado, só tem a situação atualizada.`)) return;
  const r = mergeLeads(leads); dedupeProspects(state);
  save(); render();
  toast(`Importado: ${r.novos} novos · ${r.atualizados} atualizados · ${r.iguais} sem mudança`);
}

function niceMax(v){ const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }

const clientExists = (c,key) => !c.dataVenda || c.dataVenda.slice(0,7) <= key;
const activeIn = (c,key) => clientExists(c,key) && (c.ativo || (c.inativoDesde && key < c.inativoDesde));
const initials = n => String(n||'?').trim().split(/\s+/).filter(w=>w.length>2||/^[A-Z]/.test(w)).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
function avatarColor(n){ let h=0; for(const ch of String(n)) h=(h*31+ch.charCodeAt(0))>>>0; return DONUT_COLORS[h % DONUT_COLORS.length]; }
function renderClients(){
  const s = monthStats(month);
  // carteira do mês: só quem já era cliente até o fim do mês selecionado
  const carteira = state.clients.filter(c=>clientExists(c,month));
  const active = carteira.filter(c=>activeIn(c,month));
  const novos = carteira.filter(c=>c.dataVenda && c.dataVenda.slice(0,7)===month);
  const totalSales = carteira.reduce((a,c)=>a+(c.valorVenda||0),0);
  const late = carteira.filter(c=>clientStatus(c,month).code==='late').length;
  document.getElementById('kpisClients').innerHTML =
    kpi('Clientes ativos', active.length, novos.length ? `<span class="pos">+${novos.length} novo${novos.length>1?'s':''} em ${monthName(month,{month:'long'})}</span>` : `Nenhum cliente novo em ${monthName(month,{month:'long'})}`) +
    kpi('Total vendido', brl(totalSales), `Até ${monthName(month,{month:'long',year:'numeric'})}${novos.length?` · ${brl(novos.reduce((a,c)=>a+(c.valorVenda||0),0))} no mês`:''}`) +
    kpi('Ticket médio da manutenção', brl(active.length ? active.reduce((a,c)=>a+c.manutencao,0)/active.length : 0), 'Por cliente ativo') +
    kpi('Recebido no mês', brl(s.received), late ? `<span class="neg">${late} atrasado${late>1?'s':''}</span> · faltam ${brl(s.pending)}` : (s.mrr ? (s.pending ? `Faltam ${brl(s.pending)}` : '<span class="pos">✓ Tudo recebido</span>') : 'Nenhuma manutenção no mês'), s.mrr && !s.pending ? 'pos' : (late ? 'neg' : ''));

  // recebimentos do mês
  const billed = state.clients.filter(c=>billsIn(c,month));
  const cnt = k => billed.filter(c=>{ const st=clientStatus(c,month).code; return k==='open' ? (st==='open'||st==='soon') : st===k; });
  const paidL = cnt('paid'), openL = cnt('open'), lateL = cnt('late');
  const pct = s.mrr ? (s.received/s.mrr)*100 : 0;
  const col = !s.mrr ? 'var(--muted)' : pct>=100 ? 'var(--green)' : lateL.length ? 'var(--red)' : 'var(--amber)';
  const sumOf = l => brl(l.reduce((a,c)=>a+c.manutencao,0));
  document.getElementById('clientReceipts').innerHTML = billed.length ? `
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:30px;font-weight:700;color:${col}">${pct.toFixed(0)}%</span><span class="hint" style="margin:0">recebido de ${brl(s.mrr)}</span></div>
    <div class="meter"><div style="width:${Math.min(100,pct)}%;background:${col}"></div></div>
    <div class="stat-row">
      <div class="stat-pill" style="background:var(--green-soft);color:var(--green)"><b>${paidL.length}</b><span>Pagos · ${sumOf(paidL)}</span></div>
      <div class="stat-pill" style="background:var(--amber-soft);color:var(--amber)"><b>${openL.length}</b><span>A vencer · ${sumOf(openL)}</span></div>
      <div class="stat-pill" style="background:var(--red-soft);color:var(--red)"><b>${lateL.length}</b><span>Atrasados · ${sumOf(lateL)}</span></div>
    </div>`
    : `<div class="empty" style="padding:24px 8px">Nenhuma manutenção para cobrar em ${monthName(month,{month:'long'})}.<br><span class="company">A primeira cobrança é no mês seguinte ao da venda.</span></div>`;

  // receita por cliente
  const byClient = {}; active.filter(c=>c.manutencao).forEach(c=>byClient[c.empresa||c.nome]=(byClient[c.empresa||c.nome]||0)+c.manutencao);
  document.getElementById('clientDonut').innerHTML = donutHTML(byClient,'Cadastre a manutenção mensal dos clientes para ver.');

  const f = document.getElementById('clientFilter').value;
  let rows = carteira.filter(c=>{
    if(!fbOk('cli',c)) return false;
    const st = clientStatus(c,month).code;
    if(f==='late') return st==='late';
    if(f==='soon') return st==='soon';
    if(f==='paid') return st==='paid';
    if(f==='inactive') return !activeIn(c,month);
    return true;
  });
  document.getElementById('clientHint').textContent = carteira.length ? `${carteira.length} cliente${carteira.length>1?'s':''} até ${monthName(month)} · clique no título da coluna para ordenar` : 'Clique no título da coluna para ordenar';
  rows.sort((a,b)=>{ const x=a[sortKey]??'', y=b[sortKey]??''; return (typeof x==='number'? x-y : String(x).localeCompare(String(y),'pt-BR'))*sortDir; });
  document.querySelectorAll('#view-clients th[data-sort]').forEach(th=>{
    th.textContent = th.textContent.replace(/ [↑↓]$/,'') + (th.dataset.sort===sortKey ? (sortDir>0?' ↑':' ↓') : '');
  });
  document.getElementById('clientRows').innerHTML = rows.length ? rows.map(c=>{
    const st = clientStatus(c,month);
    const canPay = billsIn(c,month);
    return `<tr>
      <td><div class="who"><span class="avatar" style="background:${avatarColor(c.empresa||c.nome)}">${esc(initials(c.empresa||c.nome))}</span><div><div class="name">${esc(c.nome)} ${c.dataVenda && c.dataVenda.slice(0,7)===month?'<span class="badge info">Novo</span>':''}</div><div class="company">${esc(c.empresa||'—')}</div></div></div></td>
      <td class="num">${brl(c.valorVenda)}</td>
      <td>${fmtDate(c.dataVenda)}</td>
      <td class="num">${brl(c.manutencao)}</td>
      <td>Todo dia ${c.diaPagamento}</td>
      <td><span class="badge ${badgeCls(st.code)}">${st.label}</span></td>
      <td style="text-align:right">
        ${canPay?`<button class="btn sm" data-pay="${c.id}">${c.pagamentos?.[month]?'Desfazer pagamento':'Marcar pago'}</button>`:''}
        <button class="btn sm ghost" data-edit-client="${c.id}">Editar</button>
        <button class="btn sm ghost danger" data-del-client="${c.id}">Excluir</button>
      </td></tr>`;}).join('')
    : `<tr><td colspan="7" class="empty">${carteira.length?'Nenhum cliente encontrado com esse filtro.':state.clients.length?`Você ainda não tinha clientes em ${monthName(month)}.`:'Nenhum cliente ainda. Clique em <b>+ Novo cliente</b> para começar.'}</td></tr>`;
}

function renderFinance(){
  const s = monthStats(month);
  document.getElementById('kpisFinance').innerHTML =
    kpi('Entradas previstas', brl(s.revenue), `Manutenções ${brl(s.mrr)} + vendas ${brl(s.sales)}`) +
    kpi('Gastos fixos', brl(s.fixed), `Pagos ${brl(s.paidExp)} · faltam ${brl(s.fixed-s.paidExp)}`) +
    kpi('Lucro previsto', brl(s.profit), `Já descontados ${brl(s.variable)} de outros gastos`, s.profit>=0?'pos':'neg') +
    kpi('Caixa real do mês', brl(s.cashProfit), 'Recebido + vendas − gastos já pagos', s.cashProfit>=0?'pos':'neg');

  // Ponto de equilíbrio
  const pct = s.fixed ? (s.mrr/s.fixed)*100 : (s.mrr?100:0);
  const color = pct>=100?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
  const avg = state.clients.filter(c=>billsIn(c,month)).reduce((a,c,_,arr)=>a+c.manutencao/arr.length,0);
  const gap = Math.max(0,s.fixed-s.mrr);
  const need = avg ? Math.ceil(gap/avg) : null;
  document.getElementById('breakeven').innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:30px;font-weight:700;color:${color}">${pct.toFixed(0)}%</span><span class="hint" style="margin:0">dos gastos fixos cobertos pela manutenção</span></div>
    <div class="meter"><div style="width:${Math.min(100,pct)}%;background:${color}"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted)"><span>MRR ${brl(s.mrr)}</span><span>Gastos ${brl(s.fixed)}</span></div>
    <p style="margin:14px 0 0;font-size:13.5px">${
      !s.fixed ? 'Cadastre seus gastos fixos para ver o ponto de equilíbrio.' :
      gap===0 ? `<span class="pos">✓ A operação se paga só com manutenções.</span> Sobram ${brl(s.mrr-s.fixed)} por mês antes de qualquer venda nova.` :
      `Faltam <b>${brl(gap)}</b>/mês de manutenção para cobrir a operação${need?` — cerca de <b>${need} cliente${need>1?'s':''}</b> no ticket médio atual (${brl(avg)})`:''}.`
    }</p>`;

  // Donut por categoria
  const byCat = {};
  state.expenses.filter(e=>expActive(e,month)).forEach(e=>byCat[e.categoria]=(byCat[e.categoria]||0)+e.valor);
  document.getElementById('donut').innerHTML = donutHTML(byCat,'Sem gastos cadastrados.');

  // Tabela de gastos
  const total = s.fixed || 1;
  const expAll = state.expenses.filter(e=>expActive(e,month));
  fbOptions('exp', expAll);
  const es = document.getElementById('expStatus').value;
  const exps = expAll.filter(e=>fbOk('exp',e) && (es==='all' || (es==='pago') === !!e.pagos?.[month])).sort((a,b)=>b.valor-a.valor);
  document.getElementById('expenseRows').innerHTML = exps.length ? exps.map(e=>{
    const paid = !!e.pagos?.[month];
    let st = '';
    if(!paid && e.dia && month===thisMonth){ const d=Math.round((dueDate(month,e.dia)-today0())/86400000); st = d<0?`<span class="badge late">Vencido</span>`:d<=3?`<span class="badge soon">Em ${d}d</span>`:''; }
    return `<tr>
      <td><button class="check ${paid?'on':''}" data-pay-exp="${e.id}" title="${paid?'Desmarcar':'Marcar como pago'}">${paid?CHECK:''}</button></td>
      <td><span class="name">${esc(e.nome)}</span> ${paid?'<span class="badge ok">Pago</span>':st}</td>
      <td>${esc(e.categoria)}</td>
      <td>${e.dia?'Dia '+e.dia:'—'}${e.desde && e.desde===month?' <span class="badge idle">Começa este mês</span>':''}</td>
      <td class="num">${brl(e.valor)}</td>
      <td class="num">${((e.valor/total)*100).toFixed(1)}%</td>
      <td style="text-align:right"><button class="btn sm ghost" data-edit-exp="${e.id}">Editar</button><button class="btn sm ghost danger" data-del-exp="${e.id}">Excluir</button></td>
    </tr>`;}).join('')
    : `<tr><td colspan="7" class="empty">${state.expenses.length?`Nenhum gasto fixo ativo em ${monthName(month,{month:'long'})}. Eles só contam a partir do mês em que começam.`:'Nenhum gasto fixo. Cadastre hospedagem, ferramentas, impostos, pró-labore…'}</td></tr>`;
}

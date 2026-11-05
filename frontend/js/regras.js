/* ========= Regras de negócio ========= */
// Cliente cobra manutenção no mês se está ativo e foi vendido até o fim desse mês
// (a primeira manutenção é no mês seguinte ao da venda)
function billsIn(c,key){
  if(!c.manutencao) return false;
  const start = shiftMonth(c.dataVenda.slice(0,7),1);
  if(key < start) return false;
  if(!c.ativo && c.inativoDesde && key >= c.inativoDesde) return false;
  return true;
}
function clientStatus(c,key){
  if(!billsIn(c,key)) return {code:'idle',label: !c.ativo ? 'Inativo' : 'Sem cobrança no mês'};
  if(c.pagamentos?.[key]) return {code:'paid',label:'Pago'};
  const due = dueDate(key,c.diaPagamento), t = today0();
  const diff = Math.round((due - t)/86400000);
  if(diff < 0) return {code:'late',label:`Atrasado ${-diff} dia${-diff>1?'s':''}`,diff};
  if(diff === 0) return {code:'soon',label:'Vence hoje',diff};
  if(diff <= 5) return {code:'soon',label:`Vence em ${diff} dia${diff>1?'s':''}`,diff};
  return {code:'open',label:`Vence ${due.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`,diff};
}
function monthStats(key){
  let mrr=0, received=0, sales=0, salesCount=0, billed=0;
  state.clients.forEach(c=>{
    if(billsIn(c,key)){ mrr+=c.manutencao; billed++; if(c.pagamentos?.[key]) received+=c.manutencao; }
    if(c.dataVenda && c.dataVenda.slice(0,7)===key){ sales+=c.valorVenda||0; salesCount++; }
  });
  const fixed = state.expenses.filter(e=>expActive(e,key)).reduce((a,e)=>a+e.valor,0);
  const paidExp = state.expenses.filter(e=>expActive(e,key) && e.pagos?.[key]).reduce((a,e)=>a+e.valor,0);
  const occ = varOccurrences(key);
  const variable = occ.reduce((a,o)=>a+o.v.valor,0), variablePaid = occ.filter(o=>o.pago).reduce((a,o)=>a+o.v.valor,0);
  const varList = occ;
  return {mrr,received,pending:mrr-received,sales,salesCount,billed,fixed,paidExp,variable,varCount:varList.length,
          costs:fixed+variable, revenue:mrr+sales, profit:mrr+sales-fixed-variable, cashProfit:received+sales-paidExp-variablePaid, variablePaid};
}
const expActive = (e,key) => !e.desde || key >= e.desde;

/* Gastos avulsos: o original conta no mês da compra; os anuais reaparecem no mesmo mês dos anos seguintes */
function varOccurrences(key){
  const out = [];
  state.variaveis.forEach(v=>{
    if(!v.data) return;
    const k0 = v.data.slice(0,7);
    if(k0===key){ out.push({v,renov:false,ano:key.slice(0,4),pago:v.pago!==false,data:v.data}); return; }
    if(v.recorrencia==='anual' && key>k0 && key.slice(5)===k0.slice(5)){
      const ano = key.slice(0,4);
      if(v.canceladoDesde && ano>=v.canceladoDesde) return;
      const dd = String(Math.min(+v.data.slice(8),daysIn(key))).padStart(2,'0');
      out.push({v,renov:true,ano,pago:!!v.renovacoes?.[ano],data:key+'-'+dd});
    }
  });
  return out;
}
function upcomingRenewals(){
  const t = today0(), out = [];
  state.variaveis.filter(v=>v.recorrencia==='anual' && v.data).forEach(v=>{
    const y0 = +v.data.slice(0,4), m = +v.data.slice(5,7)-1, d = +v.data.slice(8);
    let y = t.getFullYear();
    const dt = yy => new Date(yy,m,Math.min(d,new Date(yy,m+1,0).getDate()));
    if(y<=y0) y = y0+1;
    else if(dt(y) < t && v.renovacoes?.[y]) y++;
    else if(dt(y) < t && !v.renovacoes?.[y] && (t-dt(y))/86400000 > 60) y++; // venceu há muito: mostra o próximo
    if(v.canceladoDesde && String(y)>=v.canceladoDesde) return;
    const date = dt(y), days = Math.round((date-t)/86400000);
    if(days<=366) out.push({v,ano:String(y),date,days,pago:!!v.renovacoes?.[y]});
  });
  return out.filter(r=>!r.pago).sort((a,b)=>a.date-b.date);
}
const clientName = id => { const c = state.clients.find(x=>x.id===id); return c ? (c.empresa||c.nome) : ''; };

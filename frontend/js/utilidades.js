/* ========= Utilidades ========= */
const brl = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brlShort = v => { const a=Math.abs(v); return a>=1000 ? 'R$ '+(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k' : 'R$ '+Math.round(v); };
const parseMoney = s => { if(s==null) return 0; s=String(s).trim().replace(/[R$\s]/g,''); if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:Math.round(n*100)/100; };
const moneyInput = v => v ? v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ym = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthName = (key,opt={month:'long',year:'numeric'}) => { const [y,m]=key.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('pt-BR',opt); };
const shiftMonth = (key,n) => { const [y,m]=key.split('-').map(Number); return ym(new Date(y,m-1+n,1)); };
const daysIn = key => { const [y,m]=key.split('-').map(Number); return new Date(y,m,0).getDate(); };
const dueDate = (key,day) => { const [y,m]=key.split('-').map(Number); return new Date(y,m-1,Math.min(day||1,daysIn(key))); };
const today0 = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const fmtDate = s => s ? new Date(s+'T00:00:00').toLocaleDateString('pt-BR') : '—';
const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2.5 6.5l2.3 2.3L9.5 3.5"/></svg>';

const thisMonth = ym(new Date());
let month = thisMonth;
let sortKey = 'nome', sortDir = 1;
function migrate(st){
  let changed = false;
  (st.expenses||[]).forEach(e=>{ if(!e.desde){ e.desde = thisMonth; changed = true; } });
  if(dedupeProspects(st)) changed = true;
  (st.prospects||[]).forEach(p=>{ if(!p.cidade && p.origem==='planilha' && p.nicho==='Dentista' && p.bairro){ p.cidade='Recife'; changed = true; } });
  return changed;
}

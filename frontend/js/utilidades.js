/* ========= Utilidades ========= */
const brl = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brlShort = v => { const a=Math.abs(v); return a>=1000 ? 'R$ '+(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+'k' : 'R$ '+Math.round(v); };
const parseMoney = s => { if(s==null) return 0; s=String(s).trim().replace(/[R$\s]/g,''); if(s.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:Math.round(n*100)/100; };
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
const NICHO_PIZZA_HAMB = 'Pizzaria / hamburgueria';
const ehPizzaHamb = (...txts) => txts.some(t => /pizz|hamb[uú]rg|burg(u)?er/i.test(t||''));
const nichoCorreto = (nicho, nome) => ehPizzaHamb(nicho, nome) ? NICHO_PIZZA_HAMB : nicho;

/* Link do Google Maps do lead: o da planilha (lugar exato, ".../maps/place/...") ou,
   sem ele, uma busca pelo nome + bairro + cidade (ou endereço, se não tiver bairro/cidade). */
const mapsExato = u => /\/maps\/place\//.test(u||'');
const mapsBusca = p => {
  if(!p || !p.nome) return '';
  const onde = [p.bairro, p.cidade].filter(Boolean);
  const q = [p.nome, ...(onde.length ? onde : [p.endereco])].filter(Boolean).join(' ');
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
};
// ao juntar dados de duas fontes: fica o link exato quando um dos dois for exato
const mapsMelhor = (atual, novo) => !atual ? (novo||'') : (!mapsExato(atual) && mapsExato(novo)) ? novo : atual;
function migrate(st){
  let changed = false;
  (st.expenses||[]).forEach(e=>{ if(!e.desde){ e.desde = thisMonth; changed = true; } });
  if(dedupeProspects(st)) changed = true;
  (st.prospects||[]).forEach(p=>{ if(!p.cidade && p.origem==='planilha' && p.nicho==='Dentista' && p.bairro){ p.cidade='Recife'; changed = true; } });
  (st.prospects||[]).forEach(p=>{ const n = nichoCorreto(p.nicho, p.nome); if(n !== p.nicho){ p.nicho = n; changed = true; } });
  (st.prospects||[]).forEach(p=>{ if(!p.maps){ const m = mapsBusca(p); if(m){ p.maps = m; changed = true; } } });
  return changed;
}

/* Campos de valor (R$): coloca o ponto de milhar enquanto digita (18000 → 18.000; 1500,5 → 1.500,5) */
function formatarValorDigitado(el){
  const v = el.value, pos = el.selectionStart ?? v.length;
  const antes = v.slice(0,pos).replace(/[^\d,]/g,'').length; // dígitos e vírgula antes do cursor
  let s = v.replace(/[^\d,]/g,'');
  const i = s.indexOf(',');
  let inteiro = (i<0 ? s : s.slice(0,i)).replace(/^0+(?=\d)/,'');
  const dec = i<0 ? null : s.slice(i+1).replace(/,/g,'').slice(0,2);
  const out = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g,'.') + (dec===null ? '' : ','+dec);
  if(out===v) return;
  el.value = out;
  let n = 0, p = 0;
  while(p<out.length && n<antes){ if(/[\d,]/.test(out[p])) n++; p++; }
  try{ el.setSelectionRange(p,p); }catch(e){}
}
document.addEventListener('input', e=>{ if(e.target.matches?.('input[inputmode="decimal"]')) formatarValorDigitado(e.target); }, true);

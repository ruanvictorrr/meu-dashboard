/* ========= Horários de contato por nicho =========
   Mesma referência da planilha "Horários de contato por nicho" (Google Drive) e dos eventos
   "Prospecção: …" do Google Agenda. Se mudar um horário lá, mude aqui também.
   Dias: 0=dom 1=seg 2=ter 3=qua 4=qui 5=sex 6=sáb. Horário de Recife (o do navegador). */
const PLANILHA_HORARIOS = 'https://docs.google.com/spreadsheets/d/1sQgcpU6zLxcmywaVH9dUFHWiEEvS_1EKp4ZSsPgi6NU/edit';
const HORARIOS = {
  'Dentista':               {janelas:[['08:00','08:45'],['12:00','13:30']], dias:[2], alt:[3], fds:[[0,'18:00','20:00']], evitar:'Meio da manhã e da tarde (atendendo)'},
  'Restaurante':            {janelas:[['15:00','17:30']], dias:[1], alt:[2], fds:[], evitar:'11h–14h30, noite e fim de semana'},
  'Pizzaria / hamburgueria':{janelas:[['14:00','17:00']], dias:[1], alt:[2], fds:[], evitar:'Noite (18h–23h) e fim de semana'},   // junto do bloco de Restaurante na segunda
  'Cafeteria':              {janelas:[['14:00','16:00'],['10:30','11:30']], dias:[1], alt:[2], fds:[], evitar:'7h–10h, 16h–18h e fim de semana'},
  'Clínica / saúde':        {janelas:[['07:30','08:30'],['12:00','13:30']], dias:[2], alt:[3], fds:[[0,'18:00','20:00']], evitar:'Horário de consultas'},
  'Advocacia':              {janelas:[['08:00','09:00'],['17:00','18:30']], dias:[2], alt:[3], fds:[[0,'18:00','20:00']], evitar:'9h–12h (audiências)'},
  'Beleza / estética':      {janelas:[['09:00','10:30'],['14:00','15:00']], dias:[3], alt:[2], fds:[], evitar:'Sexta à tarde e sábado'},
  'Academia':               {janelas:[['10:00','12:00'],['14:00','16:30']], dias:[4], alt:[3], fds:[[6,'14:00','17:00'],[0,'15:00','17:00']], evitar:'6h–9h, 17h–21h e segunda'},
  'Loja / varejo':          {janelas:[['09:00','10:30'],['14:00','15:30']], dias:[3], alt:[2], fds:[], evitar:'Fim de tarde, sábado e datas comemorativas'},
  'Imobiliária':            {janelas:[['09:00','11:00'],['14:00','16:00']], dias:[1], alt:[2], fds:[[6,'08:00','09:00'],[0,'18:00','20:00']], evitar:'Fim de semana durante as visitas'},
  'Oficina / automotivo':   {janelas:[['13:00','14:00'],['16:30','17:30']], dias:[4], alt:[2], fds:[[6,'13:00','15:00']], evitar:'Manhã (recebendo carros)'},
  'Educação':               {janelas:[['09:00','11:00'],['14:00','16:00']], dias:[4], alt:[2], fds:[], evitar:'Entrada e saída de alunos (7h, 12h, 17h)'},
  'Serviços':               {janelas:[['09:00','11:00'],['14:00','16:00']], dias:[5], alt:[4], fds:[[6,'09:00','11:00']], evitar:'—'},
};
const HOR_PADRAO = {janelas:[['09:00','11:00'],['14:00','16:00']], dias:[2,3,4], alt:[], fds:[], evitar:'Sem referência: teste e anote'};
const DIA_CURTO = ['dom','seg','ter','qua','qui','sex','sáb'];
const DIA_LONGO = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const RESPONDEU = ['conversa','decidindo','proposta','fechou','perdeu'];
const FAIXAS = [['07–09h',0,9],['09–12h',9,12],['12–14h',12,14],['14–17h',14,17],['17h+',17,24]];

const horDe = n => HORARIOS[n] || HOR_PADRAO;
const minutos = hm => { const [h,m] = hm.split(':').map(Number); return h*60+m; };
const hFmt = hm => hm.endsWith(':00') ? String(+hm.slice(0,2))+'h' : String(+hm.slice(0,2))+'h'+hm.slice(3);

/* janelas de um nicho num dia da semana: [{ini,fim,nivel}] — nivel: bom | ok | fds */
function janelasDoDia(nicho, dia){
  const h = horDe(nicho);
  if(dia===0 || dia===6) return h.fds.filter(f=>f[0]===dia).map(f=>({ini:f[1],fim:f[2],nivel:'fds'}));
  const nivel = h.dias.includes(dia) || h.alt.includes(dia) ? 'bom' : 'ok';
  return h.janelas
    .filter(j => !(dia===5 && minutos(j[0])>=12*60))            // sexta à tarde quase ninguém responde
    .map(j=>({ini:j[0],fim:j[1],nivel}));
}
/* situação de um nicho num instante: {nivel:'bom'|'ok'|'fds'|'fora', ate, prox:{dia,ini,nivel}} */
function horarioAgora(nicho, quando=new Date()){
  const dia = quando.getDay(), m = quando.getHours()*60+quando.getMinutes();
  const agora = janelasDoDia(nicho, dia).find(j => m>=minutos(j.ini) && m<minutos(j.fim));
  if(agora) return {nivel:agora.nivel, ate:agora.fim};
  // próxima janela boa (ignora "ok" e fim de semana, que são opcionais)
  for(let i=0;i<8;i++){
    const d = (dia+i)%7;
    const js = janelasDoDia(nicho, d).filter(j=>j.nivel==='bom' && (i>0 || minutos(j.ini)>m)).sort((a,b)=>minutos(a.ini)-minutos(b.ini));
    if(js.length) return {nivel:'fora', prox:{dia:d, ini:js[0].ini, emDias:i}};
  }
  return {nivel:'fora'};
}
const proxTexto = p => !p ? '' : (p.emDias===0 ? 'hoje' : p.emDias===1 ? 'amanhã' : DIA_CURTO[p.dia]) + ' ' + hFmt(p.ini);

/* nichos que aparecem no painel: os da lista + os que têm leads */
function nichosHorario(){
  return [...new Set([...NICHOS, ...state.prospects.map(p=>p.nicho).filter(Boolean)])];
}
const FILA = ['a_contatar'];
const FOLLOW = ['novo','aguardando'];

/* ---------- Cartão "Agora é hora de falar com…" ---------- */
function renderHorarios(){
  const el = document.getElementById('prospAgora'); if(!el) return;
  const now = new Date(), dia = now.getDay();
  const fila = {}, follow = {};
  state.prospects.forEach(p=>{ const n=p.nicho||''; if(FILA.includes(p.situacao)) fila[n]=(fila[n]||0)+1; if(FOLLOW.includes(p.situacao)) follow[n]=(follow[n]||0)+1; });
  const nichos = nichosHorario().filter(n => HORARIOS[n] || fila[n] || follow[n]);
  const st = nichos.map(n=>({n, ...horarioAgora(n, now)}));
  const chip = s => {
    const q = fila[s.n]||0, f = follow[s.n]||0;
    const det = [q?`${q} na fila`:'', f?`${f} p/ follow-up`:''].filter(Boolean).join(' · ');
    return `<button type="button" class="hor-chip ${s.nivel}" data-hor-nicho="${esc(s.n)}" title="Até ${hFmt(s.ate)} · evitar: ${esc(horDe(s.n).evitar)}"><b>${esc(s.n)}</b><span>até ${hFmt(s.ate)}${det?' · '+det:''}</span></button>`;
  };
  const bons = st.filter(s=>s.nivel==='bom'), oks = st.filter(s=>s.nivel==='ok'), fds = st.filter(s=>s.nivel==='fds');
  let agora;
  if(bons.length || oks.length || fds.length){
    agora = (bons.length ? `<div class="hor-grupo"><span class="hor-tag bom">Melhor hora</span>${bons.map(chip).join('')}</div>` : '')
      + (oks.length ? `<div class="hor-grupo"><span class="hor-tag ok">Dá para mandar</span>${oks.map(chip).join('')}</div>` : '')
      + (fds.length ? `<div class="hor-grupo"><span class="hor-tag fds">Fim de semana · opcional</span>${fds.map(chip).join('')}</div>` : '');
  } else {
    const prox = st.filter(s=>s.prox).sort((a,b)=>a.prox.emDias-b.prox.emDias || minutos(a.prox.ini)-minutos(b.prox.ini));
    const p0 = prox[0];
    const juntos = p0 ? prox.filter(s=>s.prox.emDias===p0.prox.emDias && s.prox.ini===p0.prox.ini) : [];
    agora = `<div class="hor-vazio">Nenhum nicho na janela boa agora.${p0?` Próxima: <b>${proxTexto(p0.prox)}</b> — ${juntos.map(s=>esc(s.n)).join(', ')}.`:''}</div>`;
  }
  // agenda de hoje: janelas "bom" (e fim de semana) agrupadas por horário
  const porHora = {};
  nichos.forEach(n => janelasDoDia(n, dia).filter(j=>j.nivel!=='ok').forEach(j=>{ const k=j.ini+'–'+j.fim; (porHora[k]=porHora[k]||{ini:j.ini,fim:j.fim,nivel:j.nivel,n:[]}).n.push(n); }));
  const m = now.getHours()*60+now.getMinutes();
  const hoje = Object.values(porHora).sort((a,b)=>minutos(a.ini)-minutos(b.ini));
  const agenda = hoje.length ? hoje.map(h=>{
    const passou = minutos(h.fim)<=m, ativo = minutos(h.ini)<=m && !passou;
    return `<li class="${passou?'passou':ativo?'ativo':''}"><span class="hora">${hFmt(h.ini)}–${hFmt(h.fim)}</span><span>${h.n.map(esc).join(', ')}</span></li>`;
  }).join('') : `<li class="passou"><span>${dia===0||dia===6?'Fim de semana: descanse ou use só as janelas opcionais.':'Sem janelas marcadas para hoje.'}</span></li>`;
  el.innerHTML = `
    <div class="hor-agora">
      <div class="hor-head"><h3>Agora é hora de falar com…</h3><span class="hor-relogio">${DIA_LONGO[dia]}, ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
      ${agora}
    </div>
    <div class="hor-hoje">
      <h3>Hoje${dia===0||dia===6?' <span class="badge soon">opcional</span>':''}</h3>
      <ul>${agenda}</ul>
      <a class="hor-link" href="${PLANILHA_HORARIOS}" target="_blank" rel="noopener">Planilha de horários ↗</a>
    </div>`;
}

/* ---------- Selo no lead ---------- */
function seloHorario(p){
  if(![...FILA,...FOLLOW].includes(p.situacao) || !p.nicho) return '';
  const s = horarioAgora(p.nicho);
  if(s.nivel==='bom') return `<span class="hor-selo bom" title="Boa hora para ${esc(p.nicho)} até ${hFmt(s.ate)}">● agora</span>`;
  if(s.nivel==='ok' || s.nivel==='fds') return `<span class="hor-selo ok" title="Dá para mandar até ${hFmt(s.ate)}">● dá agora</span>`;
  return s.prox ? `<span class="hor-selo fora" title="Evitar: ${esc(horDe(p.nicho).evitar)}">próx. ${proxTexto(s.prox)}</span>` : '';
}

/* ---------- Taxa de resposta por dia e por faixa ---------- */
let respModo = 'dia';
function renderRespostas(){
  const el = document.getElementById('prospResp'); if(!el) return;
  const enviados = state.prospects.filter(p=>p.situacao!=='a_contatar' && p.nicho);
  const cols = respModo==='dia' ? [1,2,3,4,5,6,0].map(d=>[DIA_CURTO[d],d]) : FAIXAS.map(f=>[f[0],f]);
  const chave = p => {
    if(respModo==='dia'){ if(!p.data) return null; const [y,mo,d] = p.data.split('-').map(Number); return new Date(y,mo-1,d).getDay(); }
    if(!p.contatadoEm) return null; const h = new Date(p.contatadoEm).getHours(); const f = FAIXAS.find(f=>h>=f[1]&&h<f[2]) || FAIXAS[0]; return f;
  };
  const tab = {};
  let semInfo = 0;
  enviados.forEach(p=>{ const k = chave(p); if(k===null){ semInfo++; return; } const n=p.nicho; tab[n]=tab[n]||new Map(); const c=tab[n].get(k)||{t:0,r:0}; c.t++; if(RESPONDEU.includes(p.situacao)) c.r++; tab[n].set(k,c); });
  const nichos = Object.keys(tab).sort((a,b)=>[...tab[b].values()].reduce((s,c)=>s+c.t,0)-[...tab[a].values()].reduce((s,c)=>s+c.t,0));
  // coluna de agora: o dia da semana (modo Dia) ou a faixa de horário atual (modo Horário)
  const agora = new Date(), hAgora = agora.getHours();
  const kAgora = respModo==='dia' ? agora.getDay() : FAIXAS.find(f=>hAgora>=f[1]&&hAgora<f[2]) || null;
  const hj = k => k===kAgora ? ' hoje' : '';
  const cel = (c, k) => {
    if(!c) return `<td class="vazio${hj(k)}">—</td>`;
    const r = c.r/c.t, cls = c.t<3 ? 'pouco' : r>=.35 ? 'alto' : r>=.15 ? 'medio' : 'baixo';
    return `<td class="${cls}${hj(k)}" title="${c.r} de ${c.t} responderam${c.t<3?' (poucos envios ainda)':''}">${Math.round(r*100)}%<small>${c.t}</small></td>`;
  };
  const totais = new Map(); nichos.forEach(n=>tab[n].forEach((c,k)=>{ const t=totais.get(k)||{t:0,r:0}; t.t+=c.t; t.r+=c.r; totais.set(k,t); }));
  const corpo = nichos.length
    ? nichos.map(n=>`<tr><th>${esc(n)}</th>${cols.map(([,k])=>cel(tab[n].get(k),k)).join('')}</tr>`).join('')
      + `<tr class="total"><th>Todos</th>${cols.map(([,k])=>cel(totais.get(k),k)).join('')}</tr>`
    : `<tr><td colspan="${cols.length+1}" class="empty">${respModo==='faixa'?'A hora do envio passa a ser registrada quando você muda um lead de "A contatar" para outra situação. Os números aparecem aqui conforme você for mandando.':'Ainda não há leads contatados com nicho e data.'}</td></tr>`;
  el.innerHTML = `
    <div class="card-head" style="padding:0 0 12px">
      <div><h3>Resposta por ${respModo==='dia'?'dia da semana':'horário do envio'}</h3>
      <p class="hint" style="margin:0">% de leads que responderam (entraram em conversa ou além). Número pequeno = quantos foram enviados.${semInfo&&respModo==='faixa'?` ${semInfo} envio${semInfo>1?'s':''} antigo${semInfo>1?'s':''} sem hora registrada.`:''}</p></div>
      <div class="seg" role="tablist"><button type="button" data-resp="dia" class="${respModo==='dia'?'on':''}">Dia</button><button type="button" data-resp="faixa" class="${respModo==='faixa'?'on':''}">Horário</button></div>
    </div>
    <div style="overflow-x:auto"><table class="resp-tab"><thead><tr><th></th>${cols.map(([l,k])=>k===kAgora?`<th class="hoje" title="${respModo==='dia'?'Hoje':'Agora'}"><span>${l}</span></th>`:`<th>${l}</th>`).join('')}</tr></thead><tbody>${corpo}</tbody></table></div>`;
}

document.addEventListener('click', e=>{
  const b = e.target.closest('[data-resp]'); if(b){ respModo = b.dataset.resp; renderRespostas(); return; }
  const c = e.target.closest('[data-hor-nicho]');
  if(c){ // filtra a tabela de contatos por esse nicho, mostrando a fila
    document.getElementById('prospField').value = 'nicho';
    document.getElementById('prospField').dispatchEvent(new Event('change'));
    const v = document.getElementById('prospValue'); v.value = c.dataset.horNicho;
    const temFila = state.prospects.some(p=>p.nicho===c.dataset.horNicho && p.situacao==='a_contatar');
    const f = document.getElementById('prospFilter'); f.value = temFila ? 'a_contatar' : 'open';
    prospLimit = 50; renderProspects();
    document.querySelector('.rt-prosp').scrollIntoView({behavior:'smooth', block:'start'});
  }
});
// atualiza o "agora" a cada minuto sem redesenhar a tela toda
setInterval(()=>{ if(!document.hidden){ renderHorarios(); renderRespostas(); } }, 60*1000);

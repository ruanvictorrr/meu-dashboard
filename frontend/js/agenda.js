/* ========= Agenda: marcar chamada, visita ou follow-up de um lead =========
   O botão "📅 Agendar" na tabela de prospecção abre um diálogo curto (tipo, dia, hora, duração).
   Ao salvar, o compromisso fica guardado no lead (p.agenda) e abre o Google Agenda já preenchido,
   em outra aba. Lá é só clicar em "Salvar". Sem login nem API: é um link de evento do Google. */
const AGENDA_TIPOS = {
  chamada: {label:'Chamada de vídeo', titulo:'Chamada com',   local:'Chamada de vídeo (WhatsApp)'},
  visita:  {label:'Visita',           titulo:'Visita a',      local:null},
  followup:{label:'Follow-up',        titulo:'Follow-up com', local:'WhatsApp'},
  outro:   {label:'Outro',            titulo:'Compromisso com', local:null},
};
const pad2 = n => String(n).padStart(2,'0');
// "2026-11-12T15:00" + 30 min → "20261112T153000" (hora local; o fuso vai no parâmetro ctz)
function gcalData(inicio, minutos=0){
  const d = new Date(inicio); d.setMinutes(d.getMinutes()+minutos);
  return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}
function gcalLink(p){
  const a = p.agenda; if(!a?.inicio) return '';
  const t = AGENDA_TIPOS[a.tipo] || AGENDA_TIPOS.outro;
  const endereco = [p.endereco, p.bairro, p.cidade].filter(Boolean).join(', ');
  const wa = waLink(p.numero);
  const detalhes = [
    a.nota,
    p.nicho && `Nicho: ${p.nicho}`,
    p.numero && `WhatsApp: ${p.numero}${wa ? ' · '+wa : ''}`,
    p.maps && `Maps: ${p.maps}`,
    p.obs && `Observações: ${p.obs}`,
    '— criado pelo Meu Dashboard',
  ].filter(Boolean).join('\n');
  const q = new URLSearchParams({
    action:'TEMPLATE',
    text:`${t.titulo} ${p.nome}`,
    dates:`${gcalData(a.inicio)}/${gcalData(a.inicio, a.dur||30)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Recife',
    details: detalhes,
    location: a.tipo==='visita' ? endereco : (t.local || endereco),
  });
  return 'https://calendar.google.com/calendar/render?'+q.toString();
}
// "qui 12/11 15:00" (ou "hoje 15:00" / "amanhã 15:00")
function agendaQuando(inicio){
  const d = new Date(inicio), dia = inicio.slice(0,10);
  const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
  const hora = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if(dia===today()) return `hoje ${hora}`;
  if(dia===amanha.toLocaleDateString('sv-SE')) return `amanhã ${hora}`;
  return `${d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')} ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} ${hora}`;
}
// compromisso ainda por vir (ou de hoje, mesmo que a hora já tenha passado)
const agendaAtiva = p => !!p.agenda?.inicio && p.agenda.inicio.slice(0,10) >= today();
function agendaLinha(p){
  if(!agendaAtiva(p)) return '';
  const t = AGENDA_TIPOS[p.agenda.tipo] || AGENDA_TIPOS.outro;
  return `<div class="company agenda-linha"><button type="button" class="link" data-agendar="${p.id}" title="Ver ou mudar o agendamento">📅 ${esc(t.label)} · ${esc(agendaQuando(p.agenda.inicio))}</button></div>`;
}

const agendaDlg = document.getElementById('agendaDlg');
function openAgenda(id){
  const p = state.prospects.find(x=>x.id===id); if(!p) return;
  const f = document.getElementById('agendaForm'); f.reset();
  const a = p.agenda;
  document.getElementById('agendaDlgTitle').textContent = `Agendar com ${p.nome}`;
  // padrão: hoje às 15h (horário calmo do comércio); depois das 14h, amanhã às 15h
  const padrao = new Date(); if(padrao.getHours()>=14) padrao.setDate(padrao.getDate()+1);
  f.id.value = p.id;
  f.tipo.value = a?.tipo || 'chamada';
  f.dia.value = a?.inicio?.slice(0,10) || padrao.toLocaleDateString('sv-SE');
  f.hora.value = a?.inicio?.slice(11,16) || '15:00';
  f.dur.value = String(a?.dur || 15);
  f.nota.value = a?.nota || '';
  document.getElementById('agendaRemover').hidden = !a;
  agendaDlg.showModal(); f.tipo.focus();
}
document.getElementById('agendaForm').addEventListener('submit', e=>{
  const f = e.target, p = state.prospects.find(x=>x.id===f.id.value); if(!p) return;
  p.agenda = {tipo:f.tipo.value, inicio:`${f.dia.value}T${f.hora.value}`, dur:parseInt(f.dur.value)||15, nota:f.nota.value.trim(), criado:new Date().toISOString()};
  p.atualizado = new Date().toISOString();
  save(); render();
  window.open(gcalLink(p), '_blank', 'noopener');
  toast('Agendado · confirme no Google Agenda que abriu na outra aba');
});
document.getElementById('agendaRemover').onclick = ()=>{
  const p = state.prospects.find(x=>x.id===document.getElementById('agendaForm').id.value); if(!p) return;
  delete p.agenda; p.atualizado = new Date().toISOString();
  save(); render(); agendaDlg.close();
  toast('Agendamento removido do dashboard · apague também no Google Agenda, se já tinha salvo');
};
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-agendar]'); if(!b) return;
  openAgenda(b.dataset.agendar);
});

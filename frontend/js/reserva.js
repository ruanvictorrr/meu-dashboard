/* ========= Reserva de leads (Dentista · Recife) =========
   Tira do dashboard os leads "A contatar" de Dentista em Recife e baixa um .csv com eles.
   Esse .csv vira a reserva do Prospec Automático (repositório da nuvem, pasta reserva/):
   enquanto ela tiver leads, a coleta não busca Dentista em Recife e põe 10 da reserva
   na planilha de Recife do dia, que o dashboard importa como sempre. */
const RESERVA = { nicho:'Dentista', cidade:'Recife', arquivo:'dentista-recife.csv' };
const ehReserva = p => p.situacao==='a_contatar'
  && /dentist|odonto/i.test(p.nicho||'')
  && /recife/i.test(p.cidade||'');
const csvCel = v => { v = String(v ?? ''); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; };
function reservaCSV(leads){
  const cols = ['Nome','Bairro','Cidade','Telefone','WhatsApp','Site/rede atual','Nicho','Categoria','Endereço','Google Maps','Obs','Servido em'];
  const linhas = leads.map(p=>{
    const d = phoneKey(p.numero);
    const celular = d.length===11 && d[2]==='9';
    return [p.nome, p.bairro, p.cidade || RESERVA.cidade, fmtPhone(d), celular ? `https://wa.me/55${d}` : '', '(nenhum)',
      RESERVA.nicho, '', p.endereco, p.maps, p.obs, ''].map(csvCel).join(',');
  });
  return '﻿' + [cols.join(','), ...linhas].join('\n') + '\n';
}
function moverParaReserva(){
  closeMenu();
  // mantém a ordem da planilha original, para a reserva sair na mesma sequência
  const leads = state.prospects.filter(ehReserva).sort((a,b)=>(a.ordem??1e9)-(b.ordem??1e9));
  if(!leads.length){ toast('Nenhum lead "A contatar" de Dentista em Recife no dashboard'); return; }
  if(!confirm(`Mover ${leads.length} leads "A contatar" de ${RESERVA.nicho} em ${RESERVA.cidade} para a reserva?\n\n`
    + `• Eles saem do dashboard e é baixado o arquivo "${RESERVA.arquivo}".\n`
    + `• Quem já foi contatado continua aqui.\n`
    + `• Dá para desfazer em Dados → Desfazer.`)) return;
  const blob = new Blob([reservaCSV(leads)], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = RESERVA.arquivo; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  guardarAntes('mover dentistas de Recife para a reserva');
  const ids = new Set(leads.map(p=>p.id));
  state.prospects = state.prospects.filter(p=>!ids.has(p.id));
  state.reserva = { ...(state.reserva||{}), [RESERVA.arquivo]: { movidos:leads.length, em:new Date().toISOString() } };
  save(); render();
  toastDesfazer(`${leads.length} leads foram para a reserva (${RESERVA.arquivo} baixado)`);
}
document.getElementById('reservaBtn').onclick = moverParaReserva;

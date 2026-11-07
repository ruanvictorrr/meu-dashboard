/* ========= Próximos passos (Visão geral) =========
   Lista curta do que fazer agora, em ordem de prioridade. Cada item leva para o lugar certo. */
const diasDesde = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime())/86400000) : 0;
const nomes = (ps, max=3) => ps.slice(0,max).map(p=>esc(p.nome)).join(', ') + (ps.length>max ? ` e mais ${ps.length-max}` : '');

function renderProximos(){
  const el = document.getElementById('proximos'); if(!el) return;
  const P = state.prospects, passos = [];
  const add = (cor, icone, titulo, detalhe, botao, acao) => passos.push({cor, icone, titulo, detalhe, botao, acao});

  // 1) manutenções atrasadas (dinheiro na mesa)
  if(month===thisMonth){
    const late = state.clients.filter(c=>clientStatus(c,month).code==='late');
    if(late.length) add('late','💰', `Cobrar ${late.length} manutenç${late.length>1?'ões atrasadas':'ão atrasada'}`,
      `${late.map(c=>esc(c.empresa||c.nome)).join(', ')} · ${brl(late.reduce((a,c)=>a+c.manutencao,0))}`, 'Ver clientes', 'tab:clients');
  }
  // 2) respostas que esfriam: propostas e conversas paradas
  const prop = P.filter(p=>p.situacao==='proposta' && diasDesde(p.atualizado)>=3);
  if(prop.length) add('info','📨', `Cobrar retorno de ${prop.length} proposta${prop.length>1?'s':''}`, `Sem novidade há 3+ dias: ${nomes(prop)}`, 'Ver propostas', 'sit:proposta');
  const conv = P.filter(p=>['conversa','decidindo'].includes(p.situacao) && diasDesde(p.atualizado)>=3);
  if(conv.length) add('info','💬', `Retomar ${conv.length} conversa${conv.length>1?'s':''} parada${conv.length>1?'s':''}`, `Paradas há 3+ dias: ${nomes(conv)}`, 'Ver conversas', 'sit:open');
  // 3) deu certo mas ainda não virou cliente
  const ganhou = P.filter(p=>p.situacao==='fechou' && !(p.clienteId && state.clients.some(c=>c.id===p.clienteId)));
  if(ganhou.length) add('ok','🎉', `Cadastrar ${ganhou.length} novo${ganhou.length>1?'s':''} cliente${ganhou.length>1?'s':''}`, `Deram certo: ${nomes(ganhou)} — use "Virar cliente"`, 'Ver', 'sit:fechou');
  // 4) follow-up de quem não respondeu (dia seguinte, na janela boa do nicho)
  const fu = P.filter(p=>p.situacao==='aguardando' && diasDesde(p.atualizado)>=1);
  const fimDeSemana = [0,6].includes(new Date().getDay());
  if(fu.length && fimDeSemana){
    // regra combinada: follow-up só em dia útil
    add('idle','↩︎', `Segunda: follow-up em ${fu.length} lead${fu.length>1?'s':''} sem resposta`,
      'Fim de semana não é dia de follow-up. Na segunda, mande no horário bom de cada nicho (selo na tabela).', 'Ver lista', 'sit:aguardando');
  } else if(fu.length){
    const agoraFu = fu.filter(p=>p.nicho && ['bom','ok'].includes(horarioAgora(p.nicho).nivel));
    add('soon','↩︎', `Follow-up em ${fu.length} lead${fu.length>1?'s':''} sem resposta`,
      agoraFu.length ? `<b>${agoraFu.length} no horário bom agora.</b> Mande em outra janela do que a primeira mensagem.` : 'Mande no horário bom de cada nicho (selo na tabela).', 'Fazer follow-up', 'sit:aguardando');
  }
  // 5) quem contatar agora
  const fila = P.filter(p=>p.situacao==='a_contatar');
  const porNicho = {}; fila.forEach(p=>{ const n=p.nicho||''; porNicho[n]=(porNicho[n]||0)+1; });
  const naJanela = Object.keys(porNicho).filter(n=>n).map(n=>({n, ...horarioAgora(n), q:porNicho[n]})).filter(s=>['bom','ok','fds'].includes(s.nivel))
    .sort((a,b)=>(a.nivel==='bom'?0:1)-(b.nivel==='bom'?0:1) || b.q-a.q);
  if(naJanela.length){
    const s0 = naJanela[0];
    add('ok','📲', `Agora: falar com ${naJanela.slice(0,3).map(s=>esc(s.n)).join(', ')}`,
      naJanela.slice(0,3).map(s=>`${esc(s.n)} ${s.q} na fila até ${hFmt(s.ate)}`).join(' · ') + (s0.nivel==='fds'?' · fim de semana, mensagem curta':'') + ' · lote de 10–20', 'Abrir fila', 'nicho:'+s0.n);
  } else if(fila.length){
    const prox = Object.keys(porNicho).filter(n=>n).map(n=>({n, ...horarioAgora(n)})).filter(s=>s.prox)
      .sort((a,b)=>a.prox.emDias-b.prox.emDias || minutos(a.prox.ini)-minutos(b.prox.ini));
    if(prox[0]){ const p0 = prox[0].prox, juntos = prox.filter(s=>s.prox.emDias===p0.emDias && s.prox.ini===p0.ini);
      add('idle','🕘', `Próxima janela: ${proxTexto(p0)}`, `${juntos.map(s=>`${esc(s.n)} (${porNicho[s.n]} na fila)`).join(', ')} · fora da janela, prefira esperar`, 'Ver horários', 'tab:prospects'); }
  }
  // 6) fila acabando
  if(fila.length < 15) add('soon','📥', fila.length ? `Fila acabando: ${fila.length} lead${fila.length>1?'s':''} para contatar` : 'Fila vazia: sem leads para contatar',
    'Importe a planilha do Prospec Automático de hoje (ou rode a coleta)', 'Importar planilha', 'importar');
  // 7) renovações e contas próximas (só aviso curto; o detalhe fica nos alertas)
  const ren = upcomingRenewals().filter(r=>r.days<=7);
  if(ren.length) add('soon','↻', `Renovar ${ren.length} item${ren.length>1?'s':''} nesta semana`, ren.map(r=>`${esc(r.v.descricao)} (${brl(r.v.valor)})`).join(', '), 'Ver gastos', 'tab:variable');

  if(fimDeSemana){ const i = passos.findIndex(x=>x.titulo.startsWith('Segunda: follow-up')); if(i>=0) passos.push(passos.splice(i,1)[0]); }
  const hoje = P.filter(p=>p.situacao!=='a_contatar' && p.data===today()).length;
  el.innerHTML = `
    <div class="prox-head"><div><h3>Próximos passos</h3><p class="hint" style="margin:0">${DIA_LONGO[new Date().getDay()]}, ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${hoje} lead${hoje!==1?'s':''} contatado${hoje!==1?'s':''} hoje</p></div></div>
    ${passos.length ? `<ol class="prox-lista">${passos.slice(0,6).map(s=>`
      <li class="prox ${s.cor}">
        <span class="prox-ic" aria-hidden="true">${s.icone}</span>
        <div class="prox-txt"><b>${s.titulo}</b><span>${s.detalhe}</span></div>
        <button type="button" class="btn sm" data-prox="${esc(s.acao)}">${s.botao}</button>
      </li>`).join('')}</ol>`
    : `<div class="empty" style="padding:18px 8px">Tudo em dia ✓ Nada pendente agora.</div>`}`;
}

function irProspeccao({sit, nicho}={}){
  document.querySelector('nav.tabs button[data-tab="prospects"]').click();
  const field = document.getElementById('prospField'), val = document.getElementById('prospValue'), filt = document.getElementById('prospFilter');
  // sempre parte de um filtro limpo, para não herdar o nicho de um clique anterior
  field.value = nicho ? 'nicho' : 'nome'; field.dispatchEvent(new Event('change'));
  document.getElementById('prospDate').value = 'any'; document.getElementById('prospDate').dispatchEvent(new Event('change'));
  if(nicho) val.value = nicho;
  if(sit) filt.value = sit;
  prospLimit = 50; renderProspects();
  setTimeout(()=>document.querySelector(nicho||sit ? '.rt-prosp' : '#prospAgora')?.scrollIntoView({behavior:'smooth', block:'start'}), 50);
}
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-prox]'); if(!b) return;
  const [tipo, ...resto] = b.dataset.prox.split(':'), arg = resto.join(':');
  if(tipo==='tab'){ if(arg==='prospects') irProspeccao(); else document.querySelector(`nav.tabs button[data-tab="${arg}"]`)?.click(); window.scrollTo({top:0,behavior:'smooth'}); }
  else if(tipo==='sit') irProspeccao({sit:arg});
  else if(tipo==='nicho') irProspeccao({sit:'a_contatar', nicho:arg});
  else if(tipo==='importar'){ document.querySelector('nav.tabs button[data-tab="prospects"]').click(); document.getElementById('importProspBtn').click(); }
});
setInterval(()=>{ if(!document.hidden) renderProximos(); }, 60*1000);

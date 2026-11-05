/* ========= Celular =========
   Botão "+" flutuante: aciona o botão principal da aba aberta
   (+ Novo cliente, + Novo gasto fixo, + Novo gasto, + Nova prospecção).
   No celular, trocar de aba volta para o topo da tela. */
const mobileQuery = window.matchMedia('(max-width: 720px)');

document.getElementById('fab').onclick = ()=>{
  document.querySelector('.view.active .section-head .btn.primary')?.click();
};

function syncFab(){
  const view = document.querySelector('.view.active');
  const alvo = view?.querySelector('.section-head .btn.primary');
  const fab = document.getElementById('fab');
  fab.hidden = !alvo;
  if(alvo) fab.setAttribute('aria-label', alvo.textContent.replace('+','').trim());
}

document.querySelectorAll('nav.tabs button').forEach(b=>b.addEventListener('click', ()=>{
  syncFab();
  if(mobileQuery.matches) window.scrollTo({top:0});
}));
syncFab();

/* ========= Nuvem (Supabase): login + sincronização =========
   - Os dados continuam salvos no navegador (funciona sem internet).
   - Com login, cada alteração também vai para a nuvem (tabela "dashboard").
   - Ao abrir, ao voltar para a aba e a cada minuto, puxa a versão mais nova
     (assim celular e computador ficam iguais).
   - Primeiro login num navegador que já tem dados e nuvem vazia: envia os dados (migração). */
window.nuvem = (()=>{
  const cfg = window.SUPABASE_CONFIG || {};
  const configurado = !!(cfg.url && cfg.key);
  let sb = null, user = null, timer = null;
  let pendente = false, enviando = false, puxando = false;
  let estado = configurado ? 'iniciando' : 'local', erro = '';

  const temDados = s => !!(s && (s.clients?.length || s.expenses?.length || s.variaveis?.length || s.prospects?.length));
  const tempo = s => Date.parse(s?.updatedAt || 0) || 0;

  function setEstado(e, msg){ estado = e; erro = msg || ''; setStatus(); }

  function status(){
    if(!configurado) return null;
    return {
      iniciando:    ['busy', 'Conectando à nuvem…'],
      login:        ['warn', 'Entre para sincronizar'],
      sincronizando:['busy', 'Sincronizando…'],
      pendente:     ['busy', 'Sincronizando…'],
      ok:           ['ok',   'Salvo na nuvem'],
      offline:      ['warn', 'Sem internet · salvo neste aparelho'],
      erro:         ['warn', 'Erro ao sincronizar · salvo neste aparelho'],
    }[estado] || ['warn', estado];
  }

  function aplicar(remoto){
    state = {clients:[],expenses:[],variaveis:[],prospects:[], ...remoto};
    migrate(state);
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
    writeFile();
    render(); renderSheetSync();
  }

  async function puxar(){
    if(!user || pendente || enviando || puxando) return;
    puxando = true;
    if(estado !== 'ok') setEstado('sincronizando');
    try{
      const { data, error } = await sb.from('dashboard').select('dados').maybeSingle();
      if(error) throw error;
      if(!data){
        if(temDados(state)){ if(await enviar()) toast('Seus dados foram enviados para a nuvem ☁️'); }
        else setEstado('ok');
      } else {
        const r = tempo(data.dados), l = tempo(state);
        if(r > l || (!temDados(state) && temDados(data.dados))) aplicar(data.dados);
        else if(l > r) { puxando = false; await enviar(); return; }
        setEstado('ok');
      }
    }catch(e){ setEstado(navigator.onLine ? 'erro' : 'offline', e.message); }
    puxando = false;
  }

  async function enviar(){
    if(!user) return false;
    clearTimeout(timer); pendente = false; enviando = true;
    setEstado('sincronizando');
    const { error } = await sb.from('dashboard').upsert({ user_id:user.id, dados:state }, { onConflict:'user_id' });
    enviando = false;
    if(error){ pendente = true; setEstado(navigator.onLine ? 'erro' : 'offline', error.message); return false; }
    setEstado('ok');
    if(pendente) agendar();
    return true;
  }

  function agendar(){
    if(!user) return;
    pendente = true;
    if(estado !== 'offline') setEstado('pendente');
    clearTimeout(timer);
    timer = setTimeout(()=>{ if(!enviando) enviar(); }, 1200);
  }

  /* ---- Tela de login ---- */
  const tela = ()=>document.getElementById('loginTela');
  function mostrarLogin(){
    setEstado('login');
    tela().hidden = false;
    document.getElementById('loginEmail').focus();
  }
  async function entrar(ev){
    ev.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;
    const msg = document.getElementById('loginMsg'), btn = document.getElementById('loginBtn');
    msg.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando…';
    const { data, error } = await sb.auth.signInWithPassword({ email, password:senha });
    btn.disabled = false; btn.textContent = 'Entrar';
    if(error){
      msg.textContent = /invalid/i.test(error.message) ? 'E-mail ou senha incorretos.' : (navigator.onLine ? error.message : 'Sem internet.');
      return;
    }
    document.getElementById('loginSenha').value = '';
    tela().hidden = true;
    conectado(data.user);
  }

  function conectado(u){
    user = u;
    const info = document.getElementById('contaInfo');
    info.textContent = 'Conectado como ' + u.email;
    document.getElementById('contaBox').hidden = false;
    puxar();
  }

  async function sair(){
    closeMenu();
    if(!confirm('Sair da conta neste aparelho?\nSeus dados continuam na nuvem; este navegador fica sem a cópia local.')) return;
    if(pendente) await enviar();
    await sb.auth.signOut();
    try{ localStorage.removeItem(KEY); localStorage.removeItem(KEY + '-antes-da-troca'); }catch(e){}
    location.reload();
  }

  async function iniciar(){
    if(!configurado) return;
    if(!window.supabase){ setEstado('offline', 'Biblioteca do Supabase não carregou'); return; }
    sb = window.supabase.createClient(cfg.url, cfg.key);
    document.getElementById('loginForm').onsubmit = entrar;
    document.getElementById('logoutBtn').onclick = sair;

    const { data:{ session } } = await sb.auth.getSession();
    if(session) conectado(session.user); else mostrarLogin();

    sb.auth.onAuthStateChange((ev)=>{ if(ev === 'SIGNED_OUT' && user){ user = null; mostrarLogin(); } });
    window.addEventListener('focus', puxar);
    window.addEventListener('online', ()=>{ pendente ? enviar() : puxar(); });
    window.addEventListener('offline', ()=>setEstado('offline'));
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden){ if(pendente && !enviando) enviar(); }
      else puxar();
    });
    setInterval(()=>{ if(!document.hidden) puxar(); }, 60*1000);
  }

  return { iniciar, agendar, status, get ativo(){ return !!user; }, get erro(){ return erro; } };
})();

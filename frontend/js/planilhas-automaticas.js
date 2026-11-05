/* ========= Planilhas automáticas (pasta Prospec Automatico) =========
   O usuário escolhe a pasta uma vez; a cada abertura/foco do dashboard ela é varrida
   (inclusive subpastas Mês/Dia) e toda planilha "… Prospec Automatico …" ainda não importada
   entra sozinha, sem duplicar (mesma regra do "Importar planilha"). */
let prospDir = null;
const sheetSync = { busy:false, perm:null };
async function listSheets(dir, out=[]){
  for await (const [name, h] of dir.entries()){
    if(h.kind==='directory') await listSheets(h, out);
    else if(/prospec automatico.*\.xlsx$/i.test(name) && !name.startsWith('~$')) out.push(h);
  }
  return out;
}
function quietSave(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} writeFile(); }
async function syncSheets(interactive){
  if(!prospDir || sheetSync.busy) return renderSheetSync();
  try{
    let perm = await prospDir.queryPermission({mode:'read'});
    if(perm!=='granted' && interactive) perm = await prospDir.requestPermission({mode:'read'});
    sheetSync.perm = perm;
    if(perm!=='granted') return renderSheetSync();
  }catch(e){ sheetSync.perm = 'denied'; return renderSheetSync(); }
  sheetSync.busy = true; renderSheetSync();
  const ai = state.autoImport = state.autoImport || {};
  const feitos = ai.arquivos = ai.arquivos || {};
  let novosArq = 0, novosLeads = 0, maisNova = ai.ultimaPlanilha ? Date.parse(ai.ultimaPlanilha) : 0;
  try{
    const hs = (await listSheets(prospDir)).sort((a,b)=>a.name.localeCompare(b.name));
    for(const h of hs){
      const f = await h.getFile();
      if(feitos[h.name]) continue;
      try{
        const leads = rowsToLeads(await parseXLSX(await f.arrayBuffer()), h.name);
        const r = mergeLeads(leads);
        feitos[h.name] = { em:new Date().toISOString(), novos:r.novos };
        novosArq++; novosLeads += r.novos;
        maisNova = Math.max(maisNova, f.lastModified);
      }catch(err){ console.warn('planilha ignorada', h.name, err); feitos[h.name] = { em:new Date().toISOString(), erro:String(err.message||err) }; }
    }
    if(maisNova) ai.ultimaPlanilha = new Date(maisNova).toISOString();
    ai.verificado = new Date().toISOString();
    if(novosArq){
      ai.ultimoLote = { arquivos:novosArq, novos:novosLeads };
      dedupeProspects(state); save(); render();
      toast(`${novosArq} planilha${novosArq>1?'s':''} nova${novosArq>1?'s':''} · ${novosLeads} lead${novosLeads===1?'':'s'} importado${novosLeads===1?'':'s'}`);
    } else quietSave();
  }catch(e){ console.error(e); toast('Não consegui ler a pasta das planilhas'); }
  sheetSync.busy = false; renderSheetSync();
}
function quando(iso){
  const d = new Date(iso), hoje = new Date(), ontem = new Date(Date.now()-864e5);
  const h = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  if(d.toDateString()===hoje.toDateString()) return 'hoje às ' + h;
  if(d.toDateString()===ontem.toDateString()) return 'ontem às ' + h;
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) + ' às ' + h;
}
function renderSheetSync(){
  const el = document.getElementById('sheetSync'), tx = document.getElementById('sheetSyncTxt');
  if(!el) return;
  if(!window.showDirectoryPicker){ el.hidden = true; return; }
  el.hidden = false;
  const ai = state.autoImport || {};
  let cls = 'off', txt = 'Conectar planilhas automáticas', tip = 'Escolha a pasta Prospec Automatico: as planilhas novas entram aqui sozinhas.';
  if(prospDir){
    if(sheetSync.busy){ cls = 'busy'; txt = 'Verificando planilhas novas…'; tip = ''; }
    else if(sheetSync.perm!=='granted'){ cls = 'warn'; txt = 'Planilhas automáticas · clique para liberar a pasta'; tip = 'O navegador pede sua confirmação para ler a pasta Prospec Automatico.'; }
    else if(!ai.ultimaPlanilha){ cls = 'ok'; txt = 'Planilhas conectadas · nenhuma planilha ainda'; tip = 'Clique para verificar agora.'; }
    else{
      const atrasada = new Date(ai.ultimaPlanilha).toDateString()!==new Date().toDateString() && new Date().getHours() >= 9;
      cls = atrasada ? 'warn' : 'ok';
      txt = 'Planilhas atualizadas ' + quando(ai.ultimaPlanilha) + (atrasada ? ' · nada de hoje ainda' : '');
      const lote = ai.ultimoLote ? `Última leva: ${ai.ultimoLote.arquivos} planilha(s), ${ai.ultimoLote.novos} leads novos.\n` : '';
      tip = lote + (ai.verificado ? 'Verificado ' + quando(ai.verificado) + '. ' : '') + 'Clique para verificar agora.';
    }
  }
  el.className = 'sheet-sync ' + cls; tx.textContent = txt; el.title = tip;
}
async function pickProspDir(){
  if(!window.showDirectoryPicker){ toast('Use o Chrome ou Edge para isso'); return; }
  try{
    // abre o seletor já dentro da pasta conectada (o Chrome não aceita caminho escrito, só uma pasta já autorizada)
    const opts = { id:'prospec-automatico', mode:'read' };
    if(prospDir) opts.startIn = prospDir;
    try{ prospDir = await window.showDirectoryPicker(opts); }
    catch(e){ if(e.name!=='AbortError' && opts.startIn){ delete opts.startIn; prospDir = await window.showDirectoryPicker(opts); } else throw e; }
    await idb.set('prospDir', prospDir);
    sheetSync.perm = 'granted';
    document.getElementById('prospDirBtn').textContent = 'Pasta das planilhas: ' + prospDir.name + ' (trocar)';
    await syncSheets(true);
  }catch(e){ /* cancelou */ }
}
async function restoreProspDir(){
  if(!window.showDirectoryPicker) return renderSheetSync();
  try{
    const h = await idb.get('prospDir');
    if(h){ prospDir = h; document.getElementById('prospDirBtn').textContent = 'Pasta das planilhas: ' + h.name + ' (trocar)'; await syncSheets(false); }
  }catch(e){}
  renderSheetSync();
}
document.getElementById('sheetSync').onclick = ()=> prospDir ? syncSheets(true) : pickProspDir();
document.getElementById('prospDirBtn').onclick = ()=>{ closeMenu(); pickProspDir(); };
window.addEventListener('focus', ()=>{ if(prospDir && sheetSync.perm==='granted') syncSheets(false); });
setInterval(()=>{ if(prospDir && sheetSync.perm==='granted' && !document.hidden) syncSheets(false); }, 10*60*1000);

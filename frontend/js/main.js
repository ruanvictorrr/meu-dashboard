/* Início */
try{ const th=localStorage.getItem(KEY+'-theme'); if(th) document.documentElement.dataset.theme=th;
     const tab=localStorage.getItem(KEY+'-tab'); if(tab) document.querySelector(`nav.tabs button[data-tab="${tab}"]`)?.click(); }catch(e){}
if(migrate(state)) { try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
restoreHandle(); setStatus(); render(); restoreProspDir(); renderUndoBtn();

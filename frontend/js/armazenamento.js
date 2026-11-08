/* ========= Armazenamento ========= */
const KEY = 'meu-dashboard-v1';
const SITS = [
  {k:'a_contatar',label:'A contatar',cls:'idle',color:'var(--c7)'},
  {k:'novo',label:'Novo contato',cls:'idle',color:'var(--c7)'},
  {k:'aguardando',label:'Aguardando resposta',cls:'soon',color:'var(--c3)'},
  {k:'conversa',label:'Em conversa',cls:'info',color:'var(--c1)'},
  {k:'decidindo',label:'Decidindo',cls:'idle',color:'var(--c2)'},
  {k:'proposta',label:'Proposta enviada',cls:'info',color:'var(--c6)'},
  {k:'fechou',label:'Deu certo',cls:'ok',color:'var(--c5)'},
  {k:'perdeu',label:'Não deu certo',cls:'late',color:'var(--c4)'},
  {k:'sem_resposta',label:'Sem resposta',cls:'idle',color:'var(--c7)'},
];
const OPEN_SITS = ['novo','aguardando','conversa','decidindo','proposta'];
const sit = k => SITS.find(x=>x.k===k) || SITS[0];
const NICHOS = ['Dentista','Restaurante','Pizzaria / hamburgueria','Cafeteria','Clínica / saúde','Advocacia','Beleza / estética','Academia','Loja / varejo','Imobiliária','Oficina / automotivo','Educação','Serviços'];
const DEFAULT_CATS = ['Ferramentas','Hospedagem','Marketing','Impostos','Pró-labore','Escritório','Outros'];
const VAR_CATS = ['Domínio','Hospedagem','Licença / plugin','Template / tema','Equipamento','Serviço terceirizado','Marketing','Taxas e tarifas','Outros'];
let state = load();
let fileHandle = null;

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){ const s = JSON.parse(raw); return {clients:[],expenses:[],variaveis:[],prospects:[],...s}; }
  }catch(e){}
  return {clients:[],expenses:[],variaveis:[],prospects:[]};
}
function save(){
  state.updatedAt = new Date().toISOString();
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ toast('Não consegui salvar no navegador'); }
  setStatus();
  writeFile();
  if(window.nuvem) nuvem.agendar();
}
// "19:08" se foi hoje, "ontem, 19:08", ou "05/11, 19:08"
function quandoSalvo(iso){
  if(!iso) return null;
  const d = new Date(iso), h = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const dia = x => x.toLocaleDateString('sv-SE'), ontem = new Date(); ontem.setDate(ontem.getDate()-1);
  if(dia(d)===dia(new Date())) return h;
  if(dia(d)===dia(ontem)) return 'ontem, '+h;
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+', '+h;
}
function setStatus(){
  const t = quandoSalvo(state.updatedAt);
  const n = window.nuvem && nuvem.status();
  const el = document.getElementById('saveStatus');
  el.parentElement.className = 'save-status ' + (n ? n[0] : 'ok');
  el.parentElement.title = (window.nuvem && nuvem.erro) || (state.updatedAt ? 'Última alteração nos dados: ' + new Date(state.updatedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '');
  el.textContent = n
    ? n[1] + (n[0]==='ok' && t ? ' · ' + t : '')
    : (fileHandle ? 'Salvo no navegador e no arquivo' : 'Salvo neste navegador') + (t ? ' · ' + t : '');
}
// Pede ao navegador para não apagar os dados em limpeza automática
if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});

/* Arquivo sincronizado (File System Access API) */
const idb = {
  open(){ return new Promise((res,rej)=>{ const r=indexedDB.open('meu-dashboard',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
  async get(k){ const db=await this.open(); return new Promise(res=>{ const r=db.transaction('kv').objectStore('kv').get(k); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }); },
  async set(k,v){ const db=await this.open(); return new Promise(res=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=res; t.onerror=res; }); }
};
async function writeFile(){
  if(!fileHandle) return;
  try{
    if((await fileHandle.queryPermission({mode:'readwrite'}))!=='granted') return;
    const w = await fileHandle.createWritable();
    await w.write(JSON.stringify(state,null,2)); await w.close();
  }catch(e){ console.warn(e); }
}
async function restoreHandle(){
  if(!window.showSaveFilePicker) { document.getElementById('syncInfo').textContent='Seu navegador não suporta. Use "Baixar backup".'; return; }
  try{
    const h = await idb.get('file');
    if(h){ fileHandle = h; document.getElementById('syncFileBtn').textContent = 'Arquivo: ' + h.name + ' (reconectar)'; setStatus(); }
  }catch(e){}
}
document.getElementById('syncFileBtn').onclick = async ()=>{
  closeMenu();
  if(!window.showSaveFilePicker){ toast('Use o Chrome ou Edge para isso'); return; }
  try{
    if(fileHandle && (await fileHandle.queryPermission({mode:'readwrite'}))!=='granted'){
      if((await fileHandle.requestPermission({mode:'readwrite'}))==='granted'){ await writeFile(); setStatus(); toast('Arquivo reconectado'); return; }
    }
    fileHandle = await window.showSaveFilePicker({suggestedName:'meu-dashboard-dados.json',types:[{description:'JSON',accept:{'application/json':['.json']}}]});
    await idb.set('file', fileHandle);
    document.getElementById('syncFileBtn').textContent = 'Arquivo: ' + fileHandle.name;
    await writeFile(); setStatus(); toast('Pronto! Cada alteração também vai para o arquivo');
  }catch(e){}
};

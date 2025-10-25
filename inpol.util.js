
(function(){
  const iaDot = document.getElementById('iaDot');
  const iaText = document.getElementById('iaText');
  function setIAState(available){
    if (available){ iaDot?.classList.remove('bad'); iaDot?.classList.add('good'); iaText&&(iaText.textContent='IA disponible'); }
    else { iaDot?.classList.remove('good'); iaDot?.classList.add('bad'); iaText&&(iaText.textContent='IA no disponible — modo manual'); }
  }
  setIAState(false);
})();

function esc(s){ return String(s||'').replace(/"/g,'&quot;'); }
function setDeep(obj, path, val){
  const parts = path.split('.'); let o = obj;
  for(let i=0;i<parts.length-1;i++){ const k=parts[i]; if(!(k in o)) o[k]={}; o=o[k]; }
  o[parts[parts.length-1]] = val;
}

function capWord(w){
  w = String(w||''); if (!w) return '';
  if (/^[A-ZÁÉÍÓÚÜÑ]{2,}$/.test(w)) return w; // acrónimos
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
function capWords(s){
  return String(s||'').split(/([\s\-\./]+)/).map(part=>/^[\s\-\./]+$/.test(part)?part:capWord(part)).join('');
}

function normalizeSexo(s){
  const t = String(s||'').trim().toUpperCase();
  if (!t) return '';
  if (t.startsWith('F')) return 'F';
  if (t.startsWith('M')) return 'M';
  return '';
}
function normalizeCondicion(s){
  s = String(s||'').toLowerCase();
  if (s.startsWith('deten')) return 'Detenido/a';
  if (s.startsWith('testi')) return 'Testigo';
  if (s.startsWith('perju')) return 'Perjudicado/a';
  if (s.startsWith('invest')) return 'Investigado/a';
  if (s.startsWith('otro')) return 'Otro';
  return 'Imputado/a';
}
function normalizeTipoDoc(s){
  s = String(s||'').toUpperCase();
  if (s.includes('NIE')) return 'NIE';
  if (s.includes('PAS')) return 'Pasaporte';
  if (s.includes('OTR')) return 'Otro';
  return 'DNI';
}
function toDDMMYYYYFromISO(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function formatFechaLocal(dt){
  return dt.getDate().toString().padStart(2,'0') + '/' + (dt.getMonth()+1).toString().padStart(2,'0') + '/' + dt.getFullYear();
}
function formatHora(dt){
  return dt.getHours().toString().padStart(2,'0') + ':' + dt.getMinutes().toString().padStart(2,'0');
}

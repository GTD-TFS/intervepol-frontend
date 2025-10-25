
function normalizePerson(x){
  const base = PERSON_TEMPLATE();
  const out = Object.assign(base, x||{});
  if (x && typeof x.principal !== 'undefined') out.principal = !!x.principal;
  if (x && x.datosDilipol) out.datosDilipol = Object.assign({}, x.datosDilipol);

  out.nombre = capWords(String(out.nombre||''));
  out.apellidos = String(out.apellidos||'').toUpperCase();
  out.nacionalidad = capWords(out.nacionalidad);
  if (out.nacionalidad.toUpperCase()==='ESP') out.nacionalidad = 'España';
  out.fnac = String(out.fnac||'').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(out.fnac)) out.fnac = toDDMMYYYYFromISO(out.fnac);
  out.lnac = capWords(String(out.lnac||''));
  out.padres = capWords(String(out.padres||''));
  out.domicilio = capWords(String(out.domicilio||''));
  out.telefono = String(out.telefono||'').trim();
  out.tipoDocOtro = capWords(String(out.tipoDocOtro||''));
  out.sexo = normalizeSexo(out.sexo);

  return out;
}
function isLegacyPersonObject(o){
  if (!o || typeof o !== 'object') return false;
  const keys = Object.keys(o);
  return keys.includes('Nombre') && keys.includes('Apellidos');
}
function mapLegacyToPerson(src){
  const p = PERSON_TEMPLATE();
  p.nombre = capWords(src['Nombre']||'');
  p.apellidos = String(src['Apellidos']||'').toUpperCase();
  p.tipoDoc = normalizeTipoDoc(src['Tipo de documento']||'');
  p.numDoc = (src['Nº Documento']||'').toString().replace(/\s+/g,'').trim().toUpperCase();
  p.sexo = normalizeSexo(src['Sexo']||src['sexo']||'');
  p.nacionalidad = capWords(src['Nacionalidad']||'');
  p.padres = capWords(src['Nombre de los Padres']||'');
  p.fnac = (src['Fecha de nacimiento']||'').toString().trim();
  p.lnac = capWords(src['Lugar de nacimiento']||'');
  p.domicilio = capWords(src['Domicilio']||'');
  p.telefono = (src['Teléfono']||'').toString().trim();
  p.condicion = normalizeCondicion(src['Condición']||'Imputado/a');
  const generalesKeys = [
    'Delito','Diligencias','Lugar del hecho','Lugar de la detención',
    'Hora del hecho','Hora de la detención','Breve resumen de los hechos','Indicios por los que se detiene',
    'Indicativo','C.P. Agentes','C.P. agentes','Instructor Inicial'
  ];
  const datos = {};
  for (const k of generalesKeys) if (src[k]) datos[k] = src[k];
  p.datosDilipol = datos;
  return p;
}

function exportSexoLegacy(s){ if (s === 'M') return 'MASCULINO'; if (s === 'F') return 'FEMENINO'; return String(s||'').toUpperCase(); }
function exportCondicionLegacy(s){
  const t = String(s||'').toLowerCase();
  if (t.startsWith('deten')) return 'Detenido';
  if (t.startsWith('imput')) return 'Imputado';
  if (t.startsWith('invest')) return 'Investigado';
  if (t.startsWith('testi')) return 'Testigo';
  if (t.startsWith('perju')) return 'Perjudicado';
  if (t.startsWith('otro')) return 'Otro';
  return s||'';
}
function mapPersonToLegacy(p){
  const tipoDoc = p.tipoDoc === 'Otro' ? (p.tipoDocOtro||'Otro') : p.tipoDoc;
  const out = {
    'Nombre': capWords(p.nombre||''),
    'Apellidos': String(p.apellidos||'').toUpperCase(),
    'Tipo de documento': tipoDoc||'',
    'Otro documento': p.tipoDoc === 'Otro' ? (p.tipoDocOtro||'') : '',
    'Nº Documento': (p.numDoc||'').toString().toUpperCase(),
    'Fecha de nacimiento': p.fnac||'',
    'Lugar de nacimiento': capWords(p.lnac||''),
    'Nombre de los Padres': capWords(p.padres||''),
    'Domicilio': capWords(p.domicilio||''),
    'Teléfono': (p.telefono||''),
    'Condición': exportCondicionLegacy(p.condicion||''),
    'Condición (otro)': p.condicion==='Otro' ? (p.condicionOtro||'') : '',
    'Sexo': exportSexoLegacy(p.sexo||''),
    'Nacionalidad': capWords(p.nacionalidad||'')
  };
  if (p.datosDilipol && typeof p.datosDilipol === 'object') {
    Object.entries(p.datosDilipol).forEach(([k,v])=>{
      if (v==null || v==='') return;
      let val = v;
      if (k === 'Delito') val = String(v).toUpperCase();
      else if (k === 'Lugar del hecho' || k === 'Lugar de la detención' || k === 'Lugar de la detencion') val = capWords(v);
      else if (k === 'C.P. Agentes' || k === 'C.P. agentes') { out['Agentes'] = String(v); return; }
      else if (k === 'Indicativo') { out['Indicativo'] = String(v); return; }
      else if (k === 'Instructor Inicial') { out['Instructor Inicial'] = String(v); return; }
      out[k] = val;
    });
  }
  return out;
}

function pickFromPersons(keys){
  for (const x of persons){
    const d = x && x.datosDilipol; if (!d) continue;
    for (const k of keys){ if (d[k]!=null && String(d[k]).trim()!=='') return String(d[k]); }
  }
  return '';
}

function buildJSON(){
  const now = new Date();
  let act = (actuacion.value || '').trim();
  if (!act) {
    const pr0 = getPrincipalPerson();
    const breve0 = pr0?.datosDilipol?.['Breve resumen de los hechos'] || pr0?.datosDilipol?.['BreveResumen'];
    if (breve0) act = String(breve0).trim();
  }
  const objects = String(objetosEl?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const drugs   = String(drogasEl?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

  const filiLegacy = persons.map(mapPersonToLegacy);

  const pr = getPrincipalPerson();
  const gen = pr && pr.datosDilipol && typeof pr.datosDilipol === 'object' ? pr.datosDilipol : {};

  const root = {
    origen: 'IN•POL',
    fecha_iso: now.toISOString(),
    fecha_local: formatFechaLocal(now),
    hora: formatHora(now),
    doc: act,
    actuacion: act,
    filiaciones: filiLegacy,
    objects: objects.concat(drugs), // fusión para visibilidad
    drugs,
    offline: true
  };

  const generalKeys = [
    'Delito','C.P. Agentes','C.P. agentes','Diligencias','Instructor','Instructor Inicial','Lugar del hecho','Lugar de la detención',
    'Hora del hecho','Hora de la detención','Breve resumen de los hechos','Indicios por los que se detiene',
    'Indicativo','Fecha de generación','Fecha de generacion','Abogado','Comunicarse con','Informar de detención','Intérprete','Médico','Consulado'
  ];
  generalKeys.forEach(k=>{ if (gen && k in gen && gen[k]!=='' && gen[k]!=null) root[k] = gen[k]; });

  if (root['Delito']) root['Delito'] = String(root['Delito']).toUpperCase();
  if (root['Lugar del hecho']) root['Lugar del hecho'] = capWords(root['Lugar del hecho']);
  if (root['Lugar de la detención']) root['Lugar de la detención'] = capWords(root['Lugar de la detención']);
  if (!root.Agentes && (root['C.P. Agentes'] || root['C.P. agentes'])) root.Agentes = root['C.P. Agentes'] || root['C.P. agentes'];

  if (!('Indicativo' in root) || !String(root['Indicativo']||'').trim()) root['Indicativo'] = pickFromPersons(['Indicativo']) || '';
  if (!('Agentes' in root)    || !String(root['Agentes']||'').trim())    root['Agentes']    = pickFromPersons(['Agentes','C.P. Agentes','C.P. agentes']) || (root['C.P. Agentes']||root['C.P. agentes']||'');
  if (!('Instructor Inicial' in root) || !String(root['Instructor Inicial']||'').trim()) root['Instructor Inicial'] = pickFromPersons(['Instructor Inicial']) || '';

  if (!root['Fecha de generación'] && !root['Fecha de generacion']) root['Fecha de generación'] = root.fecha_local;

  return root;
}

function loadFromJSON(j){
  let imported = [];

  if (Array.isArray(j.filiaciones) && j.filiaciones.length) {
    // Si ya vienen en formato legacy (Nombre/Apellidos...), mantenemos; si no, normalizamos
    if ('Nombre' in (j.filiaciones[0]||{})){
      imported = j.filiaciones.map(mapLegacyToPerson);
    }else{
      imported = j.filiaciones.map(x => normalizePerson(x));
    }
    actuacion.value = actuacion.value || j.actuacion || '';
  }
  else if (isLegacyPersonObject(j)) {
    imported = [ mapLegacyToPerson(j) ];
    actuacion.value = actuacion.value || j['Breve resumen de los hechos'] || '';
  }
  else {
    const possible = ['persona','detenido','intervenido','sujeto'];
    for (const k of possible) if (j[k] && isLegacyPersonObject(j[k])) { imported = [ mapLegacyToPerson(j[k]) ]; break; }
  }

  // Rellenar objetos/drogas si vienen
  if (Array.isArray(j.objects)) objetosEl.value = j.objects.map(String).join("\n");
  if (Array.isArray(j.drugs))   drogasEl.value  = j.drugs.map(String).join("\n");
  if (!actuacion.value && typeof j.doc === 'string') actuacion.value = j.doc;

  // Propaga generales raíz al (futuro) principal para roundtrip
  const rootGenerales = ['Indicativo','Agentes','C.P. Agentes','C.P. agentes','Instructor Inicial'];
  if (imported.length){
    const fp = imported[0];
    fp.datosDilipol = Object.assign({}, fp.datosDilipol||{});
    rootGenerales.forEach(k=>{ if (j[k]!=null && String(j[k]).trim()!=='') fp.datosDilipol[k]=j[k]; });
  }

  persons = persons.concat(imported);

  let foundPrincipal = false;
  for (const pr of persons) {
    if (!foundPrincipal && normalizeCondicion(pr.condicion) === 'Detenido/a') {
      pr.principal = true; foundPrincipal = true;
    } else {
      pr.principal = foundPrincipal ? false : !!pr.principal;
    }
  }

  renderPersons();
}
// ==== Helpers for heuristic parser ====
function joinClean(arr){
  return arr.map(s=>String(s||'').trim()).filter(Boolean).join(' ').replace(/\s{2,}/g,' ').trim();
}
function blockAfterLabel(lines, labelRe, take=3){
  for (let i=0; i<lines.length; i++){
    if (labelRe.test(lines[i])){
      const chunk=[];
      for (let k=1; k<=take && (i+k)<lines.length; k++){
        const v = lines[i+k].trim();
        if (!v) break;
        // cortar si aparece otra etiqueta clara
        if (
          /^(DOMICILIO|LUGAR\s+DE\s+NACIMIENTO|HIJO\/?A\s+DE|EQUIPO|DNI|NIE|PASAPORTE|NACIONALIDAD|NOMBRE|APELLIDOS|NOMBRES?)\b/i.test(v)
          || /&lt;&lt;&lt;/.test(v)
          || /^ID(?:ESP)?\b/i.test(v)
        ) break;
        chunk.push(v);
      }
      return joinClean(chunk);
    }
  }
  return '';
}
// ===== OCR → PERSON (Universal MRZ TD1/TD2/TD3) =====
function parseMRZPersonFromText(raw){
  try{
    const txt = String(raw||'').replace(/[\t\r]+/g,'\n');
    const lines = txt.split(/\n+/).map(s=>s.trim()).filter(Boolean);

    const mrzBlocks = [];
    for(let i=0;i<lines.length;i++){
      const a = lines[i]?.replace(/\s+/g,'')||'';
      const b = lines[i+1]?.replace(/\s+/g,'')||'';
      const c = lines[i+2]?.replace(/\s+/g,'')||'';
      if (/^[A-Z0-9<]{20,}$/.test(a) && /^[A-Z0-9<]{20,}$/.test(b) && /^[A-Z0-9<]{20,}$/.test(c) && (a.includes('<<')||a.includes('<<<'))){
        mrzBlocks.push([a,b,c]);
        continue;
      }
      if (/^[A-Z0-9<]{20,}$/.test(a) && /^[A-Z0-9<]{20,}$/.test(b) && (a.startsWith('P<') || a.startsWith('ID') || a.includes('<<'))){
        mrzBlocks.push([a,b]);
      }
    }

    if (!mrzBlocks.length) return null;
    const block = mrzBlocks[0];
    const P = PERSON_TEMPLATE();

    if (block.length === 3){
      const [l1,l2,l3] = block;
      let m1 = /^(?:ID|I<)?([A-Z<]{3})([A-Z0-9<]+)$/.exec(l1);
      if (m1){
        const num = m1[2].replace(/<.*$/,'');
        P.numDoc = String(num||'').toUpperCase();
      }
      const nat = l2.slice(15,18).replace(/</g,'');
      if (nat) P.nacionalidad = capWords(nat);
      const yy = l2.slice(0,2), mm=l2.slice(2,4), dd=l2.slice(4,6);
      const yyn = parseInt(yy,10);
      const nowYY = (new Date()).getFullYear()%100;
      const century = (yyn > nowYY?1900:2000);
      const yyyy = century + yyn;
      P.fnac = `${dd}/${mm}/${yyyy}`;
      const sex = l2.slice(7,8);
      if (sex==='M'||sex==='F') P.sexo = sex;
      const parts = l3.split('<<');
      const apes = (parts[0]||'').replace(/</g,' ').trim();
      const noms = (parts[1]||'').replace(/</g,' ').trim();
      if (apes) P.apellidos = apes.toUpperCase();
      if (noms) P.nombre = capWords(noms);
    } else {
      const [l1,l2] = block;
      const num = l1.slice(5,14).replace(/</g,'');
      P.numDoc = String(num||'').toUpperCase();
      const yy=l2.slice(0,2),mm=l2.slice(2,4),dd=l2.slice(4,6);
      const yyn=parseInt(yy,10);
      const nowYY=(new Date()).getFullYear()%100;
      const century=(yyn>nowYY?1900:2000);
      const yyyy=century+yyn;
      P.fnac = `${dd}/${mm}/${yyyy}`;
      const sex=l2.slice(7,8);
      if (sex==='M'||sex==='F') P.sexo = sex;
      const sur=l1.slice(14).split('<<')[0].replace(/</g,' ').trim();
      const given=l2.split('<<').slice(1).join(' ').replace(/</g,' ').trim();
      if (sur) P.apellidos = sur.toUpperCase();
      if (given) P.nombre = capWords(given);
    }

    // ✅ Corrección específica DNI/NIE si se detecta en el OCR completo
    if (!P.numDoc || !/\b\d{7,8}[A-Z]\b/.test(P.numDoc)){
      const mDni = txt.match(/\b\d{7,8}[A-Z]\b/g);
      if (mDni && mDni.length){ P.numDoc = mDni[mDni.length-1].toUpperCase(); }
    }

    // Nacionalidad por texto plano, si no vino de MRZ
    if (!P.nacionalidad){
      const mNat = txt.match(/\bESPA[NÑ]OLA\b|\bESPANOLA\b|\bNACIONALIDAD\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ ]{3,})/i);
      if (mNat){ P.nacionalidad = capWords((mNat[1]||'Española').trim()); }
    }

    return P;
  }catch(e){return null;}
}
// ===== Heurístico sin MRZ: extraer persona + tipo de documento =====
function monthToNum(m){
  if(!m) return null; const t=m.toLowerCase();
  const map = { ene:'01', feb:'02', mar:'03', abr:'04', may:'05', jun:'06', jul:'07', ago:'08', set:'09', sep:'09', oct:'10', nov:'11', dic:'12', jan:'01', febr:'02', apr:'04', aug:'08', dec:'12' };
  for (const k of Object.keys(map)) if (t.startsWith(k)) return map[k];
  return null;
}
function parseDateSmart(s){
  s = String(s||'');
  let m = s.match(/(\d{1,2})[\s\/-](\d{1,2}|[A-Za-z]{3,})[\s\/-](\d{2,4})/);
  if (!m) return '';
  let dd = m[1].padStart(2,'0');
  let mm = m[2];
  let yy = m[3];
  if (/[A-Za-z]/.test(mm)) mm = monthToNum(mm) || '01';
  else mm = mm.padStart(2,'0');
  if (yy.length===2){ const y = parseInt(yy,10); const nowYY=(new Date()).getFullYear()%100; const century = (y>nowYY?1900:2000); yy = String(century+y); }
  return `${dd}/${mm}/${yy}`;
}

function detectDocTypeFromText(t){
  const s = String(t||'').toLowerCase();
  const has = (p)=> s.includes(p);
  // Pasaporte
  if (has('pasaporte') || has('passport') || /\bpassport\b/.test(s)) return {tipoDoc:'Pasaporte'};
  // DNI (España) & NIE
  if (has('documento nacional de identidad') || /\bdni\b/.test(s)) return {tipoDoc:'DNI'};
  if (/\bnie\b/.test(s)) return {tipoDoc:'NIE'};
  // Carta de Identidad (ID card local)
  if (has('carta d’identitat') || has('carta d’ identitat') || has("carta d'identitat") || has('carta de identidad') || has('id card'))
    return {tipoDoc:'Otro', tipoDocOtro:'Carta de Identidad'};
  // Permiso de conducir
  if (has('driving license') || has('driver') || has('permiso de conducir') || has('licencia de conducir'))
    return {tipoDoc:'Otro', tipoDocOtro:'Permiso de conducir'};
  // Tarjeta de residencia
  if (has('residence') || has('residencia') || has('residence permit') || has('tarjeta residencia'))
    return {tipoDoc:'Otro', tipoDocOtro:'Tarjeta residencia'};
  // ID extranjero genérico
  if (has('identity card') || /\bid card\b/.test(s))
    return {tipoDoc:'Otro', tipoDocOtro:'ID Extranjero'};
  return {tipoDoc:'DNI'}; // por defecto
}

// ==== Helper functions for heuristic OCR parser ====
function nextNonEmpty(lines, i){
  let k=i; while(k<lines.length && !String(lines[k]).trim()) k++; return k<lines.length? lines[k].trim() : '';
}
function valueUnderLabel(lines, labelRe, count){
  for (let i=0;i<lines.length;i++){
    if (labelRe.test(lines[i])){
      const out=[]; let k=i+1; let taken=0;
      while(taken<count && k<lines.length){
        const v = nextNonEmpty(lines, k);
        if (!v) break;
        if (
          /^(DOMICILIO|LUGAR\s+DE\s+NACIMIENTO|HIJO\/?A\s+DE|EQUIPO|DNI|NIE|PASAPORTE|NACIONALIDAD|NOMBRE|APELLIDOS|NOMBRES?)\b/i.test(v)
          || /&lt;&lt;&lt;/.test(v)
          || /^ID(?:ESP)?\b/i.test(v)
        ) break;
        out.push(v);
        // avanzar el índice hasta la posición real del valor encontrado
        const foundAt = lines.indexOf(v, k);
        k = (foundAt>=0? foundAt+1 : k+1);
        taken++;
      }
      return out;
    }
  }
  return [];
}

function parseHeuristicPersonFromText(raw){
  const P = PERSON_TEMPLATE();
  const text = String(raw||'');
  Object.assign(P, detectDocTypeFromText(text));

  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const join = lines.join('\n');

  // Preferir número de DNI justo antes de << (p.ej., '99999999R<<<<') y QUEDARSE SOLO con el alfanumérico
  {
    const all = Array.from(join.matchAll(/([0-9]{7,8}[A-Z])<+/gi));
    if (all.length){
      const only = all[all.length-1][1].toUpperCase();
      P.numDoc = only;
    }
  }

  // Sexo
  let m = join.match(/\bSEX[O\s/:]*([MF])\b/i); if (m) P.sexo = m[1].toUpperCase();

  // Nº Documento (DNI/NIE/Passport/ID): priorizar patrón común DNI 8 dígitos + letra
  m = join.match(/\b\d{7,8}[A-Z]\b/g);
  if (m && m.length) P.numDoc = m[m.length-1].toUpperCase();
  if (!P.numDoc){
    m = join.match(/\b(?:dni|num(?:ero)?\s*(?:doc|documento)|passport\s*no\.?|no\.?\s*pass(?:port)?|num\.?\s*soporte|id(?:esp)?)\s*[:\-]?\s*([A-Z0-9]{5,})/i);
    if (m) P.numDoc = m[1].replace(/[^A-Z0-9]/ig,'').toUpperCase();
  }
  if (P.numDoc) P.numDoc = P.numDoc.replace(/[^0-9A-Z]/gi,'');

  // Nacionalidad
  m = join.match(/\bNACIONALIDAD\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ ]{3,})/i);
  if (m) P.nacionalidad = capWords(m[1].trim());
  else if (/ESPA[NÑ]OLA/i.test(join)) P.nacionalidad = 'Española';

  // Fecha de nacimiento
  m = join.match(/(?:fecha\s*de\s*nacimiento|date\s*of\s*birth|dob)[^\n]*?([0-9]{1,2}[\s\/-][0-9A-Za-z]{2,}[\s\/-][0-9]{2,4})/i);
  if (m) P.fnac = parseDateSmart(m[1]);

  // Lugar de nacimiento — capturar solo la primera línea tras la etiqueta
  const lnacArr = valueUnderLabel(lines, /^LUGAR\s+DE\s+NACIMIENTO\b/i, 1);
  if (lnacArr.length){
    P.lnac = capWords(lnacArr[0]||'');
  }

  // Domicilio — capturar 1-3 líneas tras la etiqueta
  const domBlock = blockAfterLabel(lines, /^DOMICILIO\b|^DIRECCION\b|^ADDRESS\b/i, 3);
  if (domBlock) P.domicilio = capWords(domBlock);

  // Padres: tras HIJO/A DE → normalizar "Nombre1 y Nombre2" (sin barra)
  const padresBlock = blockAfterLabel(lines, /^HIJO\/?A\s+DE\b/i, 2);
  if (padresBlock){
    // eliminar restos tipo 'IDESP...' o cualquier cola con '&lt;&lt;&lt;'
    const raw = padresBlock.replace(/<.*$/,'').replace(/\bID(?:ESP)?[A-Z0-9]*\b.*/i,'').replace(/\s{2,}/g,' ').trim();
    if (raw.includes('/')){
      const [a,b] = raw.split('/').map(s=>capWords(s.trim())).filter(Boolean);
      if (a && b) P.padres = `${a} y ${b}`; else P.padres = capWords(raw.replace('/', ' y '));
    } else {
      const tokens = raw.split(/\s+/).filter(Boolean);
      if (tokens.length===2){
        P.padres = `${capWords(tokens[0])} y ${capWords(tokens[1])}`;
      } else if (tokens.length>2){
        const mid = Math.floor(tokens.length/2);
        const a = capWords(tokens.slice(0, mid).join(' '));
        const b = capWords(tokens.slice(mid).join(' '));
        if (a && b) P.padres = `${a} y ${b}`; else P.padres = capWords(raw);
      } else {
        P.padres = capWords(raw);
      }
    }
  }

  // Apellidos / Nombre por etiquetas (si existieran)
  for (let i=0;i<lines.length;i++){
    const L = lines[i].toLowerCase();
    if (/^apellid/.test(L) || /surname/.test(L) || /family\s*name/.test(L)){
      const v = (lines[i+1]||'').replace(/\s{2,}/g,' ').trim(); if (v) P.apellidos = String(v).toUpperCase();
    }
    if (/^nombres?\b/.test(L) || /given\s*names?/.test(L) || /^nombre\b/.test(L) || /first\s*name/.test(L)){
      const v = (lines[i+1]||'').replace(/\s{2,}/g,' ').trim(); if (v) P.nombre = capWords(v);
    }
  }

  const hasUseful = (P.nombre||P.apellidos||P.numDoc||P.fnac||P.lnac||P.domicilio||P.padres);
  return hasUseful ? P : null;
}
window.INPOL_PARSE_OCR = {
  parseOCRToPerson: parseMRZPersonFromText,
  parseHeuristicPersonFromText
};
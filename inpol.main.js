
btnAddPerson.addEventListener('click', ()=>{ persons.push(PERSON_TEMPLATE()); renderPersons(); setStatus('Persona añadida.'); });
cfgExtra.addEventListener('change', (e)=>{ showExtra = !!e.target.checked; renderPersons(); });

btnImport.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  try{
    const txt = await f.text();
    const j = JSON.parse(txt);
    loadFromJSON(j);
  }catch(err){
    console.error(err);
    alert('No se pudo leer el JSON.');
  }finally{ e.target.value=''; }
});

btnSave.addEventListener('click', ()=>{
  // Validación: condición obligatoria
  for (const p of persons){
    if (!p.condicion || !String(p.condicion).trim()){
      alert('La condición es obligatoria en todas las filiaciones. Selecciona una opción.');
      return;
    }
  }
  const data = buildJSON();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const n=new Date(); const d=n.getDate(); const m=n.getMonth()+1;
  a.download = `Intervención ${d}-${m} ${n.getHours()}-${n.getMinutes()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
btnClear.addEventListener('click', ()=>{ persons = []; renderPersons(); actuacion.value=''; objetosEl.value=''; drogasEl.value=''; });

document.getElementById('btnDrogasModal').addEventListener('click', (e)=>{
  e.preventDefault();
  if (window.DrogasModal) {
    window.DrogasModal.open((items)=>{
      const prev = (drogasEl.value||'').trim();
      drogasEl.value = (prev ? (prev + "\n") : "") + items.join("\n");
    });
  }
});

// Pintar al inicio
renderPersons();
// ===== IA (placeholders; sin llamadas externas aún) =====
(function(){
  const cfgKey = 'inpol_ia_cfg_v1';
  const iaStatus = document.getElementById('iaStatus');
  const iaDot = document.getElementById('iaDot');
  const imageInput = document.getElementById('iaImageInput');
  const audioInput = document.getElementById('iaAudioInput');
  const DEBUG_OCR_TO_ACT = false; // pon a true si quieres ver siempre el OCR bruto en Actuación

  function loadCfg(){ try{ return JSON.parse(localStorage.getItem(cfgKey)||'{}'); }catch(e){ return {}; } }
  function saveCfg(c){ localStorage.setItem(cfgKey, JSON.stringify(c)); }
  function setStatus(txt, ready){
    if(iaStatus) iaStatus.textContent = txt;
    if(iaDot){
      iaDot.classList.toggle('good', !!ready);
      iaDot.classList.toggle('bad', !ready);
    }
    const iaTextEl = document.getElementById('iaText');
    if (iaTextEl) iaTextEl.textContent = ready ? 'IA disponible' : 'IA no disponible — modo manual';
  }

  // --- IA: extracción completa de persona desde texto OCR (prioritario sobre reglas) ---
  async function aiExtractPerson(text){
    try{
      if (!cfg.backendUrl) return null;
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/extract', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) return null; // si el backend no tiene /extract devolverá 404/500
      const data = await res.json();
      if (data && data.person && typeof data.person === 'object') return data.person;
      return null;
    }catch{ return null; }
  }

  // ===== Browser-side OCR fallback with Tesseract.js =====
  async function browserOcrFallback(file){
    try{
      if (!(window.Tesseract && typeof Tesseract.recognize==='function')) return '';
      // Prefer Spanish + English; adjust paths if needed
      const opts = {
        logger: ()=>{},
        corePath: 'tesseract-core-simd.js',
        workerPath: 'worker.min.js',
        // If you keep traineddata gz next to index, tesseract auto-loads; else set `langPath: \'./\'`
        langPath: './'
      };
      const { data } = await Tesseract.recognize(file, 'spa+eng', opts);
      return (data && data.text) ? String(data.text) : '';
    }catch{ return ''; }
  }

  function isHeicFile(f){
    const name = (f && f.name) ? String(f.name) : '';
    const type = (f && f.type) ? String(f.type) : '';
    return /\.heic$/i.test(name) || /heic|heif/i.test(type);
  }

  async function convertHeicToJpeg(file){
    try{
      if (!window.heic2any) return null;
      const blob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
      const outBlob = (blob && blob.length) ? blob[0] : blob;
      const newName = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
      try{ return new File([outBlob], newName, { type: 'image/jpeg' }); }
      catch(_){ return outBlob; }
    }catch(e){ console.warn('HEIC convert error', e); return null; }
  }

  async function ensureOcrCompatibleImage(file){
    if (!file) return file;
    if (isHeicFile(file)){
      setStatus('HEIC detectado → convirtiendo a JPEG…', false);
      const conv = await convertHeicToJpeg(file);
      if (conv) { setStatus('HEIC convertido a JPEG', true); return conv; }
      setStatus('HEIC no convertible, intentaré OCR local…', false);
    }
    return file;
  }

  const cfg = Object.assign({ backendUrl: '' }, loadCfg());
  setStatus(cfg.projectId ? `Proyecto: ${cfg.projectId}${cfg.backendUrl? ' • API':''}` : 'Sin configurar', (!!cfg.projectId && !!cfg.backendUrl));

  document.getElementById('iaCfgBtn')?.addEventListener('click', ()=>{
    const projectId = prompt('Project ID de Google Cloud (lo firmará tu backend):', cfg.projectId||'')||'';
    const location  = prompt('Región (p.ej. europe-west1):', cfg.location||'europe-west1')||'europe-west1';
    const mode      = prompt('Modo OCR (vision|docai|tesseract-fallback):', cfg.mode||'vision')||'vision';
    const backendUrl= prompt('URL del backend (Google Cloud Run). Ej: https://inpol-xxxxx-uc.a.run.app', cfg.backendUrl||'')||'';
    const next = { projectId, location, mode, backendUrl };
    saveCfg(next);
    setStatus(projectId? `Proyecto: ${projectId}${backendUrl? ' • API':''}` : 'Sin configurar', (!!projectId && !!backendUrl));
    alert('Configuración guardada localmente. Las llamadas reales irán por backend.');
  });

  document.getElementById('iaOcrBtn')?.addEventListener('click', ()=> imageInput?.click());
  imageInput?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const fileForOcr = await ensureOcrCompatibleImage(f);
    setStatus('OCR: imagen lista (pendiente backend)…', !!cfg.projectId);
    try{
      if (cfg.backendUrl) {
        const form = new FormData();
        form.append('image', fileForOcr, (fileForOcr.name||'image.jpg'));
        // --- PATCH: backend OCR with fallback to browser OCR ---
        let txt = '';
        try{
          const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/ocr', { method:'POST', body: form });
          if (res.ok){
            const data = await res.json();
            txt = (data && data.text) ? String(data.text) : '';
          } else {
            // Backend OCR falló (500/404/etc.) → Fallback local con Tesseract
            setStatus('OCR backend falló ('+res.status+'). Intentando OCR local…', false);
            txt = await browserOcrFallback(fileForOcr);
          }
        }catch(_){
          // Network/Fetch error → Fallback local
          setStatus('OCR backend error. Intentando OCR local…', false);
          txt = await browserOcrFallback(fileForOcr);
        }
        // ↳ Volcar OCR a Actuación solo si está activado
        if (DEBUG_OCR_TO_ACT) {
          try{
            const prev = (typeof actuacion !== 'undefined' && actuacion.value) ? actuacion.value.trim() : '';
            const stamp = new Date();
            const dd = String(stamp.getDate()).padStart(2,'0');
            const mm = String(stamp.getMonth()+1).padStart(2,'0');
            const hh = String(stamp.getHours()).padStart(2,'0');
            const mn = String(stamp.getMinutes()).padStart(2,'0');
            const header = `— OCR bruto ${dd}/${mm} ${hh}:${mn} —`;
            const block = `${header}\n${txt.trim()}`;
            actuacion.value = (prev ? (prev + '\n\n') : '') + block;
          } catch(_) {}
        }
        if (txt) {
          // 1) IA primero: pedir extracción completa al backend
          const aiPerson = await aiExtractPerson(txt);
          if (aiPerson && typeof aiPerson === 'object'){
            let merged = { ...aiPerson };
            try{
              const parser = window.INPOL_PARSE_OCR && window.INPOL_PARSE_OCR.parseHeuristicPersonFromText;
              const h = parser ? (parser(txt) || {}) : {};
              const prefer = (v)=> v!=null && String(v).trim()!=='';
              // Campos duros: SI hay heurístico, PISAN SIEMPRE a la IA
              const hardFields = ['domicilio','padres','lnac','numDoc'];
              for (const k of hardFields){ if (prefer(h[k])) merged[k]=h[k]; }
              // Campos blandos: solo rellenar si IA los dejó vacíos
              const softFields = ['nacionalidad','fnac','sexo','nombre','apellidos','tipoDoc','tipoDocOtro'];
              for (const k of softFields){ if (!prefer(merged[k]) && prefer(h[k])) merged[k]=h[k]; }
              // Corrección extra de DNI/NIE si aún faltara
              if (!prefer(merged.numDoc)){
                const m = String(txt).match(/\b\d{7,8}[A-Z]\b/g);
                if (m && m.length){ merged.numDoc = m[m.length-1].toUpperCase(); }
              }
            }catch(_){/* noop */}
            persons.push(normalizePerson(merged));
            renderPersons();
            setStatus('Filiación creada por IA (+ campos clave por OCR).', true);
          } else {
            // 2) Fallback MRZ → 3) Heurística → 4) Ficha vacía
            const parser = window.INPOL_PARSE_OCR && window.INPOL_PARSE_OCR.parseOCRToPerson;
            const parsed = parser ? parser(txt) : null;
            if (parsed) {
              let merged = { ...parsed };
              try{
                const hParser = window.INPOL_PARSE_OCR && window.INPOL_PARSE_OCR.parseHeuristicPersonFromText;
                const h = hParser ? (hParser(txt) || {}) : {};
                const prefer = (v)=> v!=null && String(v).trim()!=='';
                const hardFields = ['domicilio','padres','lnac','numDoc'];
                for (const k of hardFields){ if (prefer(h[k])) merged[k]=h[k]; }
                const softFields = ['nacionalidad','fnac','sexo','nombre','apellidos','tipoDoc','tipoDocOtro'];
                for (const k of softFields){ if (!prefer(merged[k]) && prefer(h[k])) merged[k]=h[k]; }
                if (!prefer(merged.numDoc)){
                  const m = String(txt).match(/\b\d{7,8}[A-Z]\b/g);
                  if (m && m.length){ merged.numDoc = m[m.length-1].toUpperCase(); }
                }
              }catch(_){/* noop */}
              persons.push(normalizePerson(merged));
              renderPersons();
              setStatus('Filiación creada desde OCR (MRZ + campos bajo etiqueta).', true);
            } else {
              const hp = (window.INPOL_PARSE_OCR && INPOL_PARSE_OCR.parseHeuristicPersonFromText)
                ? INPOL_PARSE_OCR.parseHeuristicPersonFromText(txt) : null;
              if (hp) {
                persons.push(normalizePerson(hp));
                renderPersons();
                setStatus('Filiación creada — OCR heurístico (sin MRZ)', true);
              } else {
                persons.push(PERSON_TEMPLATE());
                renderPersons();
                setStatus('Filiación creada — sin datos OCR interpretables', true);
              }
            }
          }
          if (!txt) {
            setStatus('OCR backend sin texto, intento OCR local…', false);
            txt = await browserOcrFallback(fileForOcr);
          }
        } else {
          // último intento de fallback si algo nos dejó sin texto
          const lastTry = await browserOcrFallback(fileForOcr);
          if (lastTry){
            // reutilizamos el mismo flujo como si txt existiera
            const aiPerson = await aiExtractPerson(lastTry);
            if (aiPerson && typeof aiPerson === 'object'){
              persons.push(normalizePerson(aiPerson));
              renderPersons();
              setStatus('Filiación creada por OCR local (último intento).', true);
            } else {
              const parser = window.INPOL_PARSE_OCR && window.INPOL_PARSE_OCR.parseOCRToPerson;
              const parsed = parser ? parser(lastTry) : null;
              if (parsed) { persons.push(normalizePerson(parsed)); renderPersons(); setStatus('Filiación creada por OCR local.', true); }
              else { alert('OCR: respuesta sin texto.'); }
            }
          } else {
            alert('OCR: respuesta sin texto.');
          }
        }
      } else {
        const bytes = await f.arrayBuffer();
        console.log('OCR image bytes', bytes.byteLength);
        alert('OCR pendiente del backend. Imagen capturada correctamente.');
      }
    } finally { e.target.value=''; }
  });

  document.getElementById('iaSttBtn')?.addEventListener('click', ()=> audioInput?.click());
  audioInput?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    setStatus('Transcripción: audio listo (pendiente backend)…', !!cfg.projectId);
    try{
      if (cfg.backendUrl) {
        const form = new FormData();
        form.append('audio', f, f.name);
        const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/stt', { method:'POST', body: form });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        const txt = (data && data.text) ? String(data.text) : '';
        if (txt) {
          actuacion.value = (actuacion.value ? (actuacion.value + "\n\n") : '') + txt;
          setStatus('STT: transcripción recibida', true);
        } else {
          alert('STT: respuesta sin texto.');
        }
      } else {
        const bytes = await f.arrayBuffer();
        console.log('STT audio bytes', bytes.byteLength);
        alert('STT pendiente del backend. Audio cargado correctamente.');
      }
    } finally { e.target.value=''; }
  });

  document.getElementById('iaWriteBtn')?.addEventListener('click', async ()=>{
    const base = (actuacion.value||'').trim() || 'Redactar intervención a partir de los hechos…';
    if (!cfg.backendUrl) { alert('Redactor IA pendiente del backend.'); return; }
    const payload = {
      base,
      filiaciones: (typeof persons !== 'undefined') ? persons : [],
      objects: String(objetosEl?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      drugs:   String(drogasEl?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    };
    try{
      const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + '/draft', {
        method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const txt = (data && data.text) ? String(data.text) : '';
      if (txt) {
        actuacion.value = txt;
        setStatus('Redacción recibida', true);
      } else {
        alert('Redactor: respuesta sin texto.');
      }
    } catch(err){
      console.error(err);
      alert('Error llamando al backend de redacción.');
    }
  });
})();

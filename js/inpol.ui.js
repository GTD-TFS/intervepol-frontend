
function renderPersons(){
  personsEl.innerHTML = '';
  persons.forEach((p, idx)=>{
    const wrapper = document.createElement('div');
    wrapper.className = 'person';
    wrapper.innerHTML = `
      <div class="personHead">
        <div class="row">
          <span class="chip">Persona ${idx+1}${p.principal?' ⭐':''}</span>
        </div>
        <div class="row">
          <button class="btn ghost small" data-up="1">⬆</button>
          <button class="btn ghost small" data-down="1">⬇</button>
          <button class="btn ghost small" data-star="1" title="Marcar como principal">⭐</button>
          <button class="btn bad small" data-del="1">Eliminar</button>
        </div>
      </div>

      <div class="grid3">
        <div class="field">
          <label>Condición</label>
          <select data-k="condicion">
  <option value="" ${!p.condicion?'selected':''}>— Selecciona —</option>
  <option ${p.condicion==='Imputado/a'?'selected':''}>Imputado/a</option>
  <option ${p.condicion==='Detenido/a'?'selected':''}>Detenido/a</option>
  <option ${p.condicion==='Testigo'?'selected':''}>Testigo</option>
  <option ${p.condicion==='Perjudicado/a'?'selected':''}>Perjudicado/a</option>
  <option ${p.condicion==='Investigado/a'?'selected':''}>Investigado/a</option>
  <option ${p.condicion==='Otro'?'selected':''}>Otro</option>
</select>
          <input data-k="condicionOtro" class="${p.condicion==='Otro'?'':'hidden'}" value="${esc(p.condicionOtro)}">
        </div>

        <div class="field">
          <label>Sexo</label>
          <select data-k="sexo">
            <option value="" ${!p.sexo?'selected':''}></option>
            <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
            <option value="F" ${p.sexo==='F'?'selected':''}>Femenino</option>
          </select>
        </div>

        <div class="field">
          <label>Tipo documento</label>
          <select data-k="tipoDoc">
            <option ${p.tipoDoc==='DNI'?'selected':''}>DNI</option>
            <option ${p.tipoDoc==='NIE'?'selected':''}>NIE</option>
            <option ${p.tipoDoc==='Pasaporte'?'selected':''}>Pasaporte</option>
            <option ${p.tipoDoc==='Otro'?'selected':''}>Otro</option>
          </select>
          <input data-k="tipoDocOtro" class="${p.tipoDoc==='Otro'?'':'hidden'}" value="${esc(p.tipoDocOtro)}">
        </div>
      </div>

      <div class="grid2">
        <div class="field"><label>Nombre</label><input data-k="nombre" value="${esc(p.nombre)}"></div>
        <div class="field"><label>Apellidos</label><input data-k="apellidos" value="${esc(p.apellidos)}"></div>
      </div>

      <div class="grid3">
        <div class="field"><label>Nº documento</label><input data-k="numDoc" value="${esc(p.numDoc)}"></div>
        <div class="field"><label>Nacionalidad</label><input data-k="nacionalidad" value="${esc(p.nacionalidad)}"></div>
        <div class="field"><label>Fecha nacimiento (DD/MM/AAAA)</label><input data-k="fnac" value="${esc(p.fnac)}"></div>
      </div>

      <div class="grid2">
        <div class="field"><label>Lugar de nacimiento</label><input data-k="lnac" value="${esc(p.lnac)}"></div>
        <div class="field"><label>Nombre de los padres</label><input data-k="padres" value="${esc(p.padres)}"></div>
      </div>

      <div class="grid2">
        <div class="field"><label>Domicilio</label><input data-k="domicilio" value="${esc(p.domicilio)}"></div>
        <div class="field"><label>Teléfono</label><input data-k="telefono" value="${esc(p.telefono)}"></div>
      </div>
    `;

    wrapper.querySelectorAll('[data-k]').forEach(el=>{
      el.addEventListener('input', (e)=>{
        setDeep(p, e.target.getAttribute('data-k'), e.target.value);
      });
    });

    // --- Solo PADRES: normaliza nombres compuestos y coloca " y " correctamente ---
    (function(){
      const elPadres = wrapper.querySelector('[data-k="padres"]');
      if(!elPadres) return;

      function capWordsLocal(s){
        return String(s||'')
          .toLowerCase()
          .replace(/\p{L}+/gu, w => w.charAt(0).toUpperCase() + w.slice(1));
      }

      const COMPOUNDS = new Set([
        'jose luis','jose maria','jose manuel','jose antonio','jose carlos','jose miguel',
        'juan carlos','juan jose','juan antonio','juan manuel','juan luis','juan pablo',
        'maria jose','maria jesus','maria angeles','maria isabel','maria pilar',
        'maria del carmen','maria de los angeles','maria de las nieves','maria de la o',
        'maria dolores','maria luisa','maria mercedes','maria carmen','maria teresa',
        'ana maria','rosa maria','francisco javier','luis miguel','maria victoria','maria eugenia',
        'josep maria','maria del mar','maria del rosario','maria paz','maria luz','maria nieve'
      ]);

      function splitByDelimiters(raw){
        const parts = String(raw||'')
          .replace(/<.*$/, '')
          .replace(/\bID(?:ESP)?[A-Z0-9]*\b.*/i,'')
          .replace(/[|]/g,' ')
          .replace(/\s{2,}/g,' ')
          .trim()
          .replace(/\s+\/\s+|\s*&\s*|\s+y\s+/gi,'|')
          .split('|')
          .map(s=>s.trim())
          .filter(Boolean);
        return parts.length ? parts : null;
      }

      function takeFirstName(tokens){
        if (!tokens.length) return '';
        let first = tokens.shift();
        if (tokens.length){
          const big = (first + ' ' + tokens[0]).toLowerCase();
          if (COMPOUNDS.has(big)) first = first + ' ' + tokens.shift();
        }
        const t0 = (tokens[0]||'').toLowerCase();
        if (/^maria$/i.test(first) && (t0==='de' || t0==='del')){
          first += ' ' + tokens.shift();
          const t1 = (tokens[0]||'').toLowerCase();
          if (t1==='la' || t1==='las' || t1==='los') first += ' ' + tokens.shift();
          if (tokens.length) first += ' ' + tokens.shift();
        }
        return capWordsLocal(first);
      }

      function normalizePadres(raw){
        const cleaned = String(raw||'').trim();
        if (!cleaned) return '';
        const del = splitByDelimiters(cleaned);
        if (del && del.length >= 2){
          return capWordsLocal(del[0]) + ' y ' + capWordsLocal(del[1]);
        }
        const tokens = cleaned.split(/\s+/).filter(Boolean);
        const padre = takeFirstName(tokens);
        const madre = capWordsLocal(tokens.join(' '));
        return [padre, madre].filter(Boolean).join(' y ');
      }

      elPadres.addEventListener('blur', ()=>{
        const v = normalizePadres(elPadres.value);
        if (v){
          setDeep(p, 'padres', v);
          elPadres.value = v; // actualizar visualmente sin re-render
        }
      });
    })();

    const selCond = wrapper.querySelector('select[data-k="condicion"]');
    const selTipo = wrapper.querySelector('select[data-k="tipoDoc"]');
    selCond?.addEventListener('change', ()=>{ setDeep(p,'condicion', selCond.value); renderPersons(); });
    selTipo?.addEventListener('change', ()=>{ setDeep(p,'tipoDoc', selTipo.value); renderPersons(); });

    wrapper.querySelector('[data-del]')?.addEventListener('click', ()=>{ persons.splice(idx,1); renderPersons(); setStatus('Persona eliminada.'); });
    wrapper.querySelector('[data-up]')?.addEventListener('click', ()=>{
      if(idx>0){ const tmp=persons[idx-1]; persons[idx-1]=persons[idx]; persons[idx]=tmp; renderPersons(); }
    });
    wrapper.querySelector('[data-down]')?.addEventListener('click', ()=>{
      if(idx<persons.length-1){ const tmp=persons[idx+1]; persons[idx+1]=persons[idx]; persons[idx]=tmp; renderPersons(); }
    });
    wrapper.querySelector('[data-star]')?.addEventListener('click', ()=>{
      persons.forEach((x,i)=> x.principal = (i===idx));
      renderPersons();
    });

    personsEl.appendChild(wrapper);
  });

  if(persons.length===0){
    const empty = document.createElement('div');
    empty.className='muted';
    empty.textContent='No hay personas añadidas. Pulse “Añadir persona”.';
    personsEl.appendChild(empty);
  }
}

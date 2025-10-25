(function () {
  const DRUGS = [
    "Cannabis (marihuana)", "Hachís", "Cocaína", "Heroína", "MDMA (cristal)",
    "Éxtasis (MDMA)", "Anfetamina", "Metanfetamina", "LSD", "Ketamina",
    "GHB/GBL", "PCP", "Mefedrona", "2C-B", "Fentanilo",
    "Oxicodona", "Morfina", "Codeína", "Metadona", "Tramadol",
    "Benzodiacepinas (diazepam)", "Clonazepam", "Alprazolam", "Barbitúricos",
    "Setas psilocibinas", "Poppers (nitrito de amilo)", "Spice (can. sint.)",
    "Kratom", "Peyote/Mescalina", "DMT"
  ];

  function capWord(w){
    w = String(w||'');
    if (!w) return '';
    if (/^[A-ZÁÉÍÓÚÜÑ]{2,}$/.test(w)) return w; // acrónimos
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  function capDrugName(s){
    return String(s||'').split(/([\s\-\/]+)/).map(part => /^[\s\-\/]+$/.test(part) ? part : capWord(part)).join('');
  }

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else if (k.startsWith("on") && typeof v === "function") n[k.toLowerCase()] = v;
      else if (v != null) n.setAttribute(k, v);
    });
    children.forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function inputStyle(){ return { background:"#0b1220", color:"#e5e7eb", border:"1px solid #374151", borderRadius:"8px", padding:"8px 10px" }; }
  function selStyle(){ return { background:"#0b1220", color:"#e5e7eb", border:"1px solid #374151", borderRadius:"8px", padding:"8px 10px", width:"100%" }; }
  function rmStyle(){ return { background:"#7f1d1d", border:"1px solid rgba(153,27,27,.6)", padding:"8px 10px", borderRadius:"8px", color:"#fff", cursor:"pointer" }; }

  function makeDrugRow() {
    const row = el("div", { class:"drug-row", style:{ display:"grid", gridTemplateColumns:"120px 160px 1fr 80px", gap:"10px", alignItems:"center" } });
    const qty = el("input", { type:"number", step:"0.01", min:"0", placeholder:"Cantidad", style:inputStyle() });
    const unitWrap = el("div", { style:{ display:"flex", gap:"8px", alignItems:"center" } });
    const unit = el("select", { style:selStyle() }, el("option",{value:"gramo"},"gramo"), el("option",{value:"dosis"},"dosis"), el("option",{value:"otro"},"otro"));
    const unitOther = el("input", { type:"text", placeholder:"unidad…", style:Object.assign(inputStyle(), { width:"110px", display:"none" }) });
    unit.addEventListener("change", ()=> unitOther.style.display = unit.value==="otro" ? "block":"none");
    unitWrap.appendChild(unit); unitWrap.appendChild(unitOther);

    const drug = el("select", { style:selStyle() }, ...DRUGS.map(d=>el("option",{value:d},d)), el("option",{value:"__otro__"},"Otro (especificar)"));
    const drugOther = el("input", { type:"text", placeholder:"especificar…", style:Object.assign(inputStyle(), { display:"none" }) });
    drug.addEventListener("change", ()=> drugOther.style.display = (drug.value==="__otro__")?"block":"none");

    const rm = el("button", { type:"button", style:rmStyle(), onclick:()=>row.remove() }, "✕");

    row.appendChild(qty);
    row.appendChild(unitWrap);
    const drugWrap = el("div", { style:{ display:"flex", gap:"8px", alignItems:"center" } });
    drugWrap.appendChild(drug); drugWrap.appendChild(drugOther);
    row.appendChild(drugWrap);
    row.appendChild(rm);
    return row;
  }

  function pluralize(unit, qty) { if (unit === "gramo") return Number(qty) === 1 ? "gramo" : "gramos"; return unit; }
  function collectRows(listNode) {
    const out = [];
    listNode.querySelectorAll(".drug-row").forEach(row => {
      const inputs = row.querySelectorAll("input, select");
      const qty = inputs[0].value.trim();
      const unit = inputs[1].value;
      const unitOther = inputs[2].value.trim();
      const drug = inputs[3].value;
      const drugOther = inputs[4].value.trim();

      const qtyNum = qty === "" ? null : Number(qty);
      if (qtyNum == null || isNaN(qtyNum) || qtyNum <= 0) return;
      const finalUnit = (unit === "otro" && unitOther) ? unitOther : pluralize(unit, qtyNum);
      const finalDrug = capDrugName((drug === "__otro__" && drugOther) ? drugOther : drug);

      out.push(`${qtyNum} ${finalUnit} de ${finalDrug}`);
    });
    return out;
  }

  function openModal(onCommit) {
    const overlay = el("div",{style:{position:"fixed",inset:"0",background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}});
    const card = el("div",{style:{width:"min(860px,94vw)",maxHeight:"90vh",overflow:"auto",background:"#111827",border:"1px solid #28324a",borderRadius:"12px",boxShadow:"0 10px 28px rgba(0,0,0,.45)",padding:"18px 20px",color:"#e5e7eb"}});
    const title = el("div",{style:{fontSize:"20px",fontWeight:"800",marginBottom:"8px",color:"#7FFFD4"}},"Drogas — añadir ítems");
    const list = el("div",{id:"drugItems",style:{display:"grid",gap:"10px",marginTop:"10px"}});
    const addLineBtn = el("button",{type:"button",style:{padding:"8px 12px",borderRadius:"8px",border:"1px solid rgba(148,163,184,.25)",fontWeight:"800",cursor:"pointer",color:"#fff",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)"},
      onclick:()=>list.appendChild(makeDrugRow())},"+ Añadir línea");
    const footer = el("div",{style:{display:"flex",gap:"10px",marginTop:"16px",justifyContent:"flex-end"}});
    const addBtn = el("button",{type:"button",style:{padding:"10px 14px",borderRadius:"10px",border:"1px solid rgba(148,163,184,.25)",fontWeight:"800",cursor:"pointer",color:"#fff",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)"}},"Añadir");
    const closeBtn = el("button",{type:"button",style:{padding:"10px 14px",borderRadius:"10px",border:"1px solid rgba(148,163,184,.25)",fontWeight:"800",cursor:"pointer",color:"#fff",background:"linear-gradient(135deg,#374151,#4b5563)"},onclick:()=>overlay.remove()},"Salir");
    footer.appendChild(closeBtn); footer.appendChild(addBtn);
    card.appendChild(title); card.appendChild(list); card.appendChild(addLineBtn); card.appendChild(footer);
    overlay.appendChild(card); document.body.appendChild(overlay);
    list.appendChild(makeDrugRow());
    addBtn.addEventListener("click", ()=>{
      const items = collectRows(list);
      if(!items.length){ alert("Añade al menos una línea válida (cantidad > 0)."); return; }
      try{
        if (onCommit) onCommit(items);
        if (window.DrogasUI) window.DrogasUI.render(); // re-pinta chips para poder eliminar
      } finally { overlay.remove(); }
    });
  }

  window.DrogasModal = { open(onCommit){ openModal(onCommit); } };

  // === UI de lista/eliminación para drogas ===
  (function(){
    const drogasEl = document.getElementById('drogas');
    const listEl   = document.getElementById('drogasList');

    function getList(){
      return String(drogasEl?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    }
    function setList(arr){
      if (!drogasEl) return;
      drogasEl.value = (arr||[]).join("\n");
      render();
    }
    function render(){
      if (!listEl) return;
      const items = getList();
      listEl.innerHTML = '';
      items.forEach((txt, i)=>{
        const chip = document.createElement('span');
        chip.className = 'chip';
        const label = document.createElement('span');
        label.textContent = txt;
        const btn = document.createElement('button');
        btn.textContent = '✕';
        btn.className = 'btn small';
        btn.style.marginLeft = '6px';
        btn.style.padding = '2px 8px';
        btn.addEventListener('click', ()=>{
          const cur = getList();
          cur.splice(i,1);
          setList(cur);
        });
        chip.appendChild(label);
        chip.appendChild(btn);
        listEl.appendChild(chip);
      });
    }
    function add(items){
      const cur = getList();
      const next = cur.concat(items||[]);
      setList(next);
    }

    window.DrogasUI = { getList, setList, render, add };
    // Render inicial
    render();
  })();
})();

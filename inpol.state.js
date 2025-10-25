
const personsEl = document.getElementById('persons');
const btnAddPerson = document.getElementById('btnAddPerson');
const btnImport = document.getElementById('btnImport');
const importFile = document.getElementById('importFile');
const btnSave = document.getElementById('btnSave');
const btnClear = document.getElementById('btnClear');
const actuacion = document.getElementById('actuacion');
const statusEl = document.getElementById('status');
const cfgExtra = document.getElementById('cfgExtra');
const objetosEl = document.getElementById('objetos');
const drogasEl  = document.getElementById('drogas');

let showExtra = false;

const PERSON_TEMPLATE = () => ({
  condicion:'', condicionOtro:'',
  sexo:'',
  nombre:'', apellidos:'',
  tipoDoc:'DNI', tipoDocOtro:'',
  numDoc:'',
  nacionalidad:'',
  fnac:'',
  lnac:'',
  padres:'',
  domicilio:'',
  telefono:'',
  principal:false,
  datosDilipol:{},
  extra:{ pais:'', cp:'', email:'', observaciones:'' }
});

let persons = [];

function getPrincipalPerson(){
  return persons.find(pr => pr.principal) ||
         persons.find(pr => normalizeCondicion(pr.condicion) === 'Detenido/a') ||
         null;
}

function setStatus(t){ statusEl.textContent = t||''; setTimeout(()=>statusEl.textContent='', 2500); }

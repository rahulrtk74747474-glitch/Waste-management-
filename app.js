const STORAGE_KEY = 'haryanaWasteIndustryDatabase.v1';
const seed = Array.isArray(window.HARYANA_WASTE_SEED) ? window.HARYANA_WASTE_SEED : [];
let records = loadRecords();

const $ = (id) => document.getElementById(id);
const tbody = $('tbody');
const dialog = $('recordDialog');

function cloneSeed(){ return JSON.parse(JSON.stringify(seed)); }
function loadRecords(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.warn('Could not load saved database', e); }
  return cloneSeed();
}
function saveRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function esc(v=''){
  return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function normalize(v=''){ return String(v).toLowerCase().trim(); }

function uniqueDistricts(){ return [...new Set(records.map(r => r.district).filter(Boolean))].sort(); }
function wasteTokens(){
  const set = new Set();
  records.forEach(r => String(r.wasteType || '').split(';').map(s => s.trim()).filter(Boolean).forEach(s => set.add(s)));
  return [...set].sort();
}
function populateFilters(){
  const d = $('districtFilter').value;
  $('districtFilter').innerHTML = '<option value="">All districts</option>' + uniqueDistricts().map(x => `<option>${esc(x)}</option>`).join('');
  if ([...$('districtFilter').options].some(o => o.value === d)) $('districtFilter').value = d;
  const t = $('typeFilter').value;
  $('typeFilter').innerHTML = '<option value="">All waste types</option>' + wasteTokens().map(x => `<option>${esc(x)}</option>`).join('');
  if ([...$('typeFilter').options].some(o => o.value === t)) $('typeFilter').value = t;
}

function filteredRecords(){
  const q = normalize($('search').value);
  const district = $('districtFilter').value;
  const type = normalize($('typeFilter').value);
  const priority = $('priorityFilter').value;
  const hazard = $('hazardFilter').value;
  return records.filter(r => {
    const hay = normalize(Object.values(r).join(' '));
    return (!q || hay.includes(q)) &&
      (!district || r.district === district) &&
      (!type || normalize(r.wasteType).split(';').map(s => s.trim()).includes(type)) &&
      (!priority || r.priority === priority) &&
      (!hazard || r.hazardous === hazard);
  }).sort((a,b) => (a.district || '').localeCompare(b.district || '') || (a.city || '').localeCompare(b.city || '') || Number(a.id)-Number(b.id));
}

function handlingTag(value){
  const cls = value === 'Regulated' || value === 'Mixed' ? 'tag reg' : 'tag';
  return `<span class="${cls}">${esc(value || '')}</span>`;
}
function priorityTag(value){
  const cls = value === 'Very High' || value === 'High' ? 'tag high' : 'tag';
  return `<span class="${cls}">${esc(value || '')}</span>`;
}
function render(){
  populateFilters();
  const rows = filteredRecords();
  tbody.innerHTML = rows.map(r => `<tr>
    <td><b>${esc(r.district)}</b></td>
    <td>${esc(r.city)}</td>
    <td>${esc(r.industrialArea)}</td>
    <td>${esc(r.industries)}</td>
    <td>${esc(r.waste)}</td>
    <td>${esc(r.wasteType)}</td>
    <td>${handlingTag(r.hazardous)}</td>
    <td>${esc(r.buyerUse)}</td>
    <td>${esc(r.opportunity)}</td>
    <td>${priorityTag(r.priority)}</td>
    <td>${esc(r.verification)}</td>
    <td>${esc(r.notes)}${r.source ? `<div class="source"><small>${/^https?:\/\//.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener">source</a>` : esc(r.source)}</small></div>` : ''}</td>
    <td><div class="actions"><button onclick="editRecord(${Number(r.id)})">Edit</button><button onclick="deleteRecord(${Number(r.id)})">Delete</button></div></td>
  </tr>`).join('');
  $('empty').hidden = rows.length !== 0;
  $('recordCount').textContent = rows.length;
  $('districtCount').textContent = new Set(rows.map(r => r.district)).size;
  $('highCount').textContent = rows.filter(r => ['High','Very High'].includes(r.priority)).length;
  $('regulatedCount').textContent = rows.filter(r => ['Mixed','Regulated'].includes(r.hazardous)).length;
}

function clearForm(){
  $('recordForm').reset();
  $('recordId').value = '';
  $('priority').value = 'High';
  $('hazardous').value = 'No';
  $('verification').value = 'Regional lead';
}
function openAdd(){ clearForm(); $('dialogTitle').textContent='Add Record'; dialog.showModal(); }
function formRecord(){
  return {
    id: $('recordId').value ? Number($('recordId').value) : nextId(),
    district: $('district').value.trim(), city: $('city').value.trim(), industrialArea: $('industrialArea').value.trim(),
    industries: $('industries').value.trim(), waste: $('waste').value.trim(), wasteType: $('wasteType').value.trim(),
    hazardous: $('hazardous').value, buyerUse: $('buyerUse').value.trim(), opportunity: $('opportunity').value.trim(),
    priority: $('priority').value, verification: $('verification').value, notes: $('notes').value.trim(), source: $('source').value.trim()
  };
}
function nextId(){ return records.reduce((m,r) => Math.max(m, Number(r.id)||0), 0) + 1; }
window.editRecord = function(id){
  const r = records.find(x => Number(x.id) === Number(id)); if(!r) return;
  $('dialogTitle').textContent='Edit Record'; $('recordId').value=r.id;
  ['district','city','industrialArea','industries','waste','wasteType','hazardous','buyerUse','opportunity','priority','verification','notes','source'].forEach(k => { if($(k)) $(k).value = r[k] ?? ''; });
  dialog.showModal();
};
window.deleteRecord = function(id){
  const r = records.find(x => Number(x.id) === Number(id)); if(!r) return;
  if(!confirm(`Delete ${r.city} — ${r.industries}?`)) return;
  records = records.filter(x => Number(x.id) !== Number(id)); saveRecords(); render();
};

$('recordForm').addEventListener('submit', e => {
  e.preventDefault();
  const item = formRecord();
  const i = records.findIndex(r => Number(r.id) === Number(item.id));
  if (i >= 0) records[i] = item; else records.push(item);
  saveRecords(); dialog.close(); render();
});
$('addBtn').addEventListener('click', openAdd);
$('closeDialog').addEventListener('click', () => dialog.close());
$('cancelBtn').addEventListener('click', () => dialog.close());
['search','districtFilter','typeFilter','priorityFilter','hazardFilter'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));

function download(name, text, mime){
  const blob = new Blob([text], {type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
}
$('exportJsonBtn').addEventListener('click', () => download('haryana-waste-database.json', JSON.stringify(records,null,2), 'application/json'));
$('exportCsvBtn').addEventListener('click', () => {
  const fields=['id','district','city','industrialArea','industries','waste','wasteType','hazardous','buyerUse','opportunity','priority','verification','notes','source'];
  const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[fields.join(','), ...records.map(r=>fields.map(f=>quote(r[f])).join(','))].join('\n');
  download('haryana-waste-database.csv', '\ufeff'+csv, 'text/csv;charset=utf-8');
});
$('importFile').addEventListener('change', async e => {
  const file=e.target.files[0]; if(!file) return;
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed)) throw new Error('JSON must contain an array of records.');
    const cleaned=parsed.map((r,i)=>({
      id:Number(r.id)||i+1,district:String(r.district||''),city:String(r.city||''),industrialArea:String(r.industrialArea||''),industries:String(r.industries||''),waste:String(r.waste||''),wasteType:String(r.wasteType||''),hazardous:String(r.hazardous||'No'),buyerUse:String(r.buyerUse||''),opportunity:String(r.opportunity||''),priority:String(r.priority||'Medium'),verification:String(r.verification||'Needs verification'),notes:String(r.notes||''),source:String(r.source||'')
    }));
    if(!confirm(`Import ${cleaned.length} records and replace the current browser database?`)) return;
    records=cleaned; saveRecords(); render();
  }catch(err){ alert('Import failed: '+err.message); }
  finally{ e.target.value=''; }
});
$('resetBtn').addEventListener('click', () => {
  if(!confirm('Reset all browser edits and restore the GitHub seed database?')) return;
  records=cloneSeed(); saveRecords(); render();
});

render();

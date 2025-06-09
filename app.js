// ─────────────────────────────────────────────────────────────────
// 1) STATE
let freqDatabase = [];
let searchResults = [];
let sequence = [];
let uniqueConditions = [];
let presets = {};
let editIndex = -1;
let isPlaying = false;
let isPaused = false;
let currentIndex = 0;
let currentAudioCtx = null;
let currentOscillator = null;
let currentTimeout = null;
let newConditionsArray = [];
const $ = id => document.getElementById(id);

// ─────────────────────────────────────────────────────────────────
// 2) LOAD FULL DATABASE
async function loadFullDatabase() {
  try {
    const resp = await fetch('frequencies_extended.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    freqDatabase = Array.isArray(data) ? data.slice() : [];
    buildUniqueConditions();
    renderResults();
  } catch (err) {
    console.error('Failed to load JSON:', err);
    alert('Could not load frequencies_extended.json.');
  }
}

// ─────────────────────────────────────────────────────────────────
// 3) BUILD CONDITIONS DATASOURCE
function buildUniqueConditions() {
  const set = new Set();
  freqDatabase.forEach(e =>
    Array.isArray(e.conditions) &&
      e.conditions.forEach(c => c.trim() && set.add(c.trim()))
  );
  uniqueConditions = [...set].sort((a,b)=>a.localeCompare(b));
  const dl = $('conditionList');
  dl.innerHTML = '';
  uniqueConditions.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    dl.append(opt);
  });
}

// ─────────────────────────────────────────────────────────────────
// 4) RENDER RESULTS
function renderResults() {
  const tbody = $('resultsTable').querySelector('tbody');
  tbody.innerHTML = '';
  if (!searchResults.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.style.textAlign = 'center';
    td.textContent = 'No matches found.';
    tr.append(td);
    tbody.append(tr);
    return;
  }
  searchResults.forEach(item => {
    const tr = document.createElement('tr');
    ['label','frequency','duration','waveform','conditions'].forEach(key => {
      const td = document.createElement('td');
      td.textContent = key==='conditions'
        ? (Array.isArray(item.conditions) ? item.conditions.join(', ') : '–')
        : (item[key] != null ? item[key] : '–');
      tr.append(td);
    });
    const tdA = document.createElement('td');
    const idx = freqDatabase.indexOf(item);
    const eBtn = document.createElement('button');
    eBtn.textContent = '✏️';
    eBtn.onclick = () => populateFormForEdit(idx);
    const dBtn = document.createElement('button');
    dBtn.textContent = '🗑️';
    dBtn.onclick = () => deleteEntry(idx);
    tdA.append(eBtn, dBtn);
    tr.append(tdA);
    tbody.append(tr);
  });
}

// ─────────────────────────────────────────────────────────────────
// 5) SEARCH
function searchCondition() {
  const q = $('conditionInput').value.trim().toLowerCase();
  if (!q) return alert('Type a condition first.');
  searchResults = freqDatabase.filter(e =>
    Array.isArray(e.conditions) &&
      e.conditions.some(c => c.toLowerCase().includes(q))
  );
  renderResults();
}

// ─────────────────────────────────────────────────────────────────
// 6) FORM HANDLERS
function clearForm() {
  editIndex = -1;
  $('formTitle').textContent = 'Add New Entry';
  ['entryLabel','entryFrequency','entryDuration'].forEach(id => $(id).value = '');
  $('entryWaveform').value = 'sine';
  newConditionsArray = [];
  renderNewConditions();
  $('addEntryBtn').textContent = '➕ Add Entry';
}

function populateFormForEdit(i) {
  if (i < 0 || i >= freqDatabase.length) return;
  editIndex = i;
  const e = freqDatabase[i];
  $('formTitle').textContent = 'Edit Entry';
  $('entryLabel').value = e.label || '';
  $('entryFrequency').value = e.frequency || '';
  $('entryDuration').value = e.duration || '';
  $('entryWaveform').value = e.waveform || 'sine';
  newConditionsArray = Array.isArray(e.conditions) ? [...e.conditions] : [];
  renderNewConditions();
  $('addEntryBtn').textContent = '✅ Update Entry';
}

function deleteEntry(i) {
  if (i < 0 || i >= freqDatabase.length || !confirm('Delete?')) return;
  freqDatabase.splice(i,1);
  buildUniqueConditions();
  searchResults = [];
  renderResults();
  clearForm();
}

function addOrUpdateEntry() {
  const label = $('entryLabel').value.trim();
  const freq = parseFloat($('entryFrequency').value);
  const dur  = parseFloat($('entryDuration').value);
  const wave = $('entryWaveform').value;
  const conds= newConditionsArray.slice();
  if (!label || isNaN(freq) || isNaN(dur)) return alert('Fill all fields.');
  const entry = { label, frequency: freq, duration: dur, waveform: wave, conditions: conds };
  if (editIndex >= 0) {
    freqDatabase[editIndex] = entry;
    alert('Updated');
  } else {
    freqDatabase.push(entry);
    alert('Added');
  }
  buildUniqueConditions();
  clearForm();
  searchResults = [];
  renderResults();
}

// ─────────────────────────────────────────────────────────────────
// 7) SEQUENCE & RENDER
function addAllResultsToSequence() {
  if (!searchResults.length) return alert('No results.');
  let cnt = 0;
  searchResults.forEach(item => {
    const { frequency: f, duration: d, waveform: w, label } = item;
    if (!isNaN(f) && !isNaN(d)) {
      sequence.push({ label: label||`Tuned:${f}Hz`, frequency: f, duration: d, waveform: w });
      cnt++;
    }
  });
  alert(`Added ${cnt} entr${cnt===1?'y':'ies'}.`);
  renderSequence();
}

function renderSequence() {
  const ul = $('sequenceList');
  ul.innerHTML = '';
  if (!sequence.length) {
    const li = document.createElement('li');
    li.style.fontStyle = 'italic';
    li.style.color = '#666';
    li.textContent = '(empty)';
    ul.append(li);
    return;
  }
  sequence.forEach((e,i) => {
    const li = document.createElement('li');
    li.textContent = `${e.label} — ${e.frequency}Hz | ${e.duration}s | ${e.waveform}`;
    const rm = document.createElement('button');
    rm.textContent = '✕';
    rm.onclick = () => { sequence.splice(i,1); renderSequence(); };
    li.append(rm);
    ul.append(li);
  });
}

// ─────────────────────────────────────────────────────────────────
// 8) PLAYBACK
async function playFrom(i) {
  if (i >= sequence.length) return stopSequence();
  if (!isPlaying) return;
  currentIndex = i;
  const { frequency, duration, waveform } = sequence[i];
  currentOscillator = currentAudioCtx.createOscillator();
  currentOscillator.type = waveform;
  currentOscillator.frequency.setValueAtTime(frequency, currentAudioCtx.currentTime);
  currentOscillator.connect(currentAudioCtx.destination);
  currentOscillator.start();
  currentTimeout = setTimeout(() => {
    currentOscillator.stop();
    currentOscillator.disconnect();
    currentOscillator = null;
    if (isPlaying && !isPaused) playFrom(i+1);
  }, duration * 1000);
}

function playSequence() {
  if (isPlaying) return;
  if (!sequence.length) return alert('Empty.');
  isPlaying = true;
  isPaused = false;
  currentAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
  playFrom(0);
  $('pauseBtn').disabled = false;
  $('nextBtn').disabled  = false;
}

function stopSequence() {
  isPlaying = false;
  isPaused  = false;
  clearTimeout(currentTimeout);
  currentTimeout = null;
  if (currentOscillator) {
    currentOscillator.stop();
    currentOscillator.disconnect();
    currentOscillator = null;
  }
  if (currentAudioCtx) {
    currentAudioCtx.close();
    currentAudioCtx = null;
  }
  $('pauseBtn').disabled = true;
  $('nextBtn').disabled  = true;
}

function togglePause() {
  if (!isPlaying) return;
  if (!isPaused) {
    isPaused = true;
    clearTimeout(currentTimeout);
    currentTimeout = null;
    currentOscillator.stop();
    currentOscillator.disconnect();
    currentOscillator = null;
    $('pauseBtn').textContent = '▶ Resume';
  } else {
    isPaused = false;
    $('pauseBtn').textContent = '⏸ Pause';
    playFrom(currentIndex);
  }
}

function skipToNext() {
  if (!isPlaying) return;
  clearTimeout(currentTimeout);
  currentTimeout = null;
  if (currentOscillator) {
    currentOscillator.stop();
    currentOscillator.disconnect();
    currentOscillator = null;
  }
  isPaused = false;
  currentIndex++;
  if (currentIndex < sequence.length) playFrom(currentIndex);
  else stopSequence();
}

function clearSequence() {
  if (isPlaying) return alert('Stop first.');
  if (sequence.length && !confirm('Clear all?')) return;
  sequence = [];
  renderSequence();
}

// ─────────────────────────────────────────────────────────────────
// 9) TUNER
function addTunedTone() {
  const f = parseFloat($('tunerFrequency').value);
  const d = parseFloat($('tunerDuration').value);
  const w = $('tunerWaveform').value;
  if (isNaN(f)||isNaN(d)) return alert('Invalid tone');
  sequence.push({ label:`Tuned:${f}Hz`, frequency: f, duration: d, waveform: w });
  renderSequence();
  $('tunerFrequency').value = '';
  $('tunerDuration').value  = '';
  $('tunerWaveform').value  = 'sine';
}

// ─────────────────────────────────────────────────────────────────
// 10) RAW JSON EDITOR
function toggleDbEditor() {
  const d = $('dbEditor'), t = $('resultsTable');
  if (d.style.display==='flex') {
    d.style.display='none'; t.style.display='';
    $('toggleDbEditorBtn').textContent='► Raw JSON Editor';
  } else {
    $('dbEditorTextarea').value = JSON.stringify(freqDatabase,null,2);
    $('dbPreview').innerHTML='<em>JSON preview will appear here</em>';
    d.style.display='flex'; t.style.display='none';
    $('toggleDbEditorBtn').textContent='▼ Raw JSON Editor';
  }
}

function saveDatabaseFromEditor() {
  try {
    const j = JSON.parse($('dbEditorTextarea').value);
    if (!Array.isArray(j)) throw '';
    freqDatabase = j.slice();
    buildUniqueConditions();
    searchResults = [];
    renderResults();
    toggleDbEditor();
    clearForm();
    alert('DB updated');
  } catch (e) {
    alert('Invalid JSON');
  }
}

function previewDatabaseJSON() {
  const txt = $('dbEditorTextarea').value, p=$('dbPreview');
  try {
    const j = JSON.parse(txt);
    if (!Array.isArray(j)) throw '';
    p.classList.remove('error');
    const c = j.length;
    const labs = j.slice(0,3).map(e=>e.label||'(no label)').join(', ');
    p.innerHTML = `<strong>Preview:</strong> ${c} entr${c===1?'y':'ies'}. First: ${labs}${c>3?', …':''}.`;
  } catch (e) {
    p.classList.add('error');
    p.innerHTML = `<strong>Error:</strong> ${e.message}`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 11) TAG-INPUT RENDERER
function renderNewConditions() {
  const ul = $('newConditionsTags');
  ul.innerHTML = '';
  newConditionsArray.forEach((val,i) => {
    const li = document.createElement('li');
    li.textContent = val;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.onclick = () => { newConditionsArray.splice(i,1); renderNewConditions(); };
    li.append(btn);
    ul.append(li);
  });
  $('newConditionsInput').value = '';
}

// ─────────────────────────────────────────────────────────────────
// 12) INIT
window.addEventListener('DOMContentLoaded', ()=>{
  loadFullDatabase();

  const condInput = $('newConditionsInput');
  condInput.addEventListener('keydown', e=>{
    if (e.key==='Enter'|| e.key===',') {
      e.preventDefault();
      let val = condInput.value.trim().replace(/,$/,'');
      if (val && !newConditionsArray.includes(val)) newConditionsArray.push(val);
      renderNewConditions();
    } else if (e.key==='Backspace' && condInput.value==='') {
      newConditionsArray.pop();
      renderNewConditions();
    }
  });
  $('newConditionsContainer').addEventListener('click',()=>condInput.focus());

  $('searchBtn').onclick         = searchCondition;
  $('conditionInput').onkeyup    = e=> e.key==='Enter' && searchCondition();
  $('addEntryBtn').onclick       = addOrUpdateEntry;
  $('clearFormBtn').onclick      = clearForm;
  $('addAllBtn').onclick         = addAllResultsToSequence;
  $('toggleDbEditorBtn').onclick = toggleDbEditor;
  $('saveDbBtn').onclick         = saveDatabaseFromEditor;
  $('previewDbBtn').onclick      = previewDatabaseJSON;
  $('playBtn').onclick           = playSequence;
  $('pauseBtn').onclick          = togglePause;
  $('nextBtn').onclick           = skipToNext;
  $('stopBtn').onclick           = stopSequence;
  $('clearSequenceBtn').onclick  = clearSequence;
  $('addTunerBtn').onclick       = addTunedTone;

  renderResults();
  renderSequence();
  clearForm();
});

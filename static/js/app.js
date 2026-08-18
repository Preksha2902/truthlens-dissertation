const API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000"
  : "https://truthlens-api-940351316561.us-central1.run.app";

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

const textInput = document.getElementById('text-input');
if (textInput) {
  textInput.addEventListener('input', () => {
    const words = textInput.value.trim().split(/\s+/).filter(w => w.length > 0);
    const wc = document.getElementById('word-count');
    if (wc) wc.textContent = words.length + ' words';
  });
}

function handleFile(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  if (type === 'image') showImgPreview(file);
  if (type === 'audio') showAudPreview(file);
}

function handleDrop(event, type) {
  event.preventDefault();
  const dropId = type === 'image' ? 'img-drop' : 'aud-drop';
  document.getElementById(dropId).classList.remove('drag-active');
  const file = event.dataTransfer.files[0];
  if (!file) return;
  if (type === 'image') showImgPreview(file);
  if (type === 'audio') showAudPreview(file);
}

function showImgPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('img-drop-inner').style.display = 'none';
    const prev = document.getElementById('img-preview');
    prev.style.display = 'flex';
    document.getElementById('img-preview-img').src = e.target.result;
    document.getElementById('img-preview-name').textContent = file.name;
  };
  reader.readAsDataURL(file);
}

function showAudPreview(file) {
  document.getElementById('aud-drop-inner').style.display = 'none';
  const prev = document.getElementById('aud-preview');
  prev.style.display = 'flex';
  document.getElementById('aud-preview-name').textContent = file.name;
  const wave = document.getElementById('audio-wave');
  if (wave) {
    wave.innerHTML = '';
    [30,60,90,70,100,55,80,45,95,65,40,85,50,75,35,90,60,80].forEach((h, i) => {
      const b = document.createElement('div');
      b.className = 'wave-bar';
      b.style.height = h + '%';
      b.style.animationDelay = (i * 0.065) + 's';
      wave.appendChild(b);
    });
  }
}

async function runAnalysis(type) {
  if (type === 'text') {
    const words = document.getElementById('text-input')
      .value.trim().split(/\s+/).filter(w => w).length;
    if (words < 5) { flashBtn(type); return; }
  }

  const progress = document.getElementById(type + '-progress');
  const fill     = document.getElementById(type + '-fill');
  const empty    = document.getElementById(type + '-empty');
  const result   = document.getElementById(type + '-result');

  if (empty)  empty.style.display  = 'none';
  if (result) result.style.display = 'none';
  if (progress) {
    progress.style.display = 'block';
    fill.style.width = '0%';
    setTimeout(() => { fill.style.width = '60%'; }, 50);
  }

  let data;

  try {
    if (type === 'text') {
      const text     = document.getElementById('text-input').value.trim();
      const response = await fetch(`${API_URL}/predict/text`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text })
      });
      if (!response.ok) throw new Error(await response.text());
      data = await response.json();

    } else if (type === 'image') {
      const fileInput = document.getElementById('img-file');
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please upload an image first');
        if (progress) progress.style.display = 'none';
        if (empty)    empty.style.display = 'flex';
        return;
      }

      const file      = fileInput.files[0];
      const formData  = new FormData();
      formData.append('file', file);

      const modelSel = document.getElementById('image-model');
      const modelVal = modelSel.value;

      const response = await fetch(`${API_URL}/predict/image?model=${modelVal}`, {
        method: 'POST',
        body:   formData
      });
      if (!response.ok) throw new Error(await response.text());
      data = await response.json();

    } else {
      const fileInput = document.getElementById('aud-file');
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please upload an audio file first');
        if (progress) progress.style.display = 'none';
        if (empty)    empty.style.display = 'flex';
        return;
      }

      const file      = fileInput.files[0];
      const formData  = new FormData();
      formData.append('file', file);

      const modelSel = document.getElementById('audio-model');
      const modelVal = modelSel.value;

      const response = await fetch(`${API_URL}/predict/audio?model=${modelVal}`, {
        method: 'POST',
        body:   formData
      });
      if (!response.ok) throw new Error(await response.text());
      data = await response.json();
    }

    fill.style.width = '100%';
    setTimeout(() => {
      if (progress) progress.style.display = 'none';
      if (fill)     fill.style.width = '0%';
      showResult(type, data);
    }, 300);

  } catch (error) {
    console.error('Error:', error);
    if (progress) progress.style.display = 'none';
    if (empty) {
      empty.style.display = 'flex';
      empty.querySelector('p').textContent  = 'Error connecting to model';
      empty.querySelector('span').textContent = error.message;
    }
  }
}

function showResult(type, data) {
  const empty  = document.getElementById(type + '-empty');
  const result = document.getElementById(type + '-result');

  if (empty)  empty.style.display  = 'none';
  if (!result) return;
  result.style.display = 'flex';

  let iconClass, icon;
  if (data.label === 'AI-Generated') {
    iconClass = 'ai';        icon = '✗';
  } else if (data.label === 'Likely AI-Generated') {
    iconClass = 'uncertain'; icon = '?';
  } else if (data.label.startsWith('Human')) {
    iconClass = 'human';     icon = '✓';
  } else {
    iconClass = 'uncertain'; icon = '?';
  }

  const vicon = document.getElementById(type + '-verdict-icon');
  if (vicon) {
    vicon.textContent = icon;
    vicon.className   = 'verdict-icon ' + iconClass;
  }

  const vlabel = document.getElementById(type + '-verdict-label');
  if (vlabel) vlabel.textContent = data.label;

  const vpct = document.getElementById(type + '-verdict-pct');
  if (vpct) vpct.textContent = data.ai_probability + '%';

  const subEl = document.getElementById(type + '-verdict-sub');
  if (subEl) {
    const sel = document.getElementById(type + '-model');
    const modelName = data.model_used || (sel ? sel.options[sel.selectedIndex].text : 'RoBERTa');
    subEl.textContent = data.confidence + ' · ' + modelName;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const barAi    = document.getElementById(type + '-bar-ai');
      const barHuman = document.getElementById(type + '-bar-human');
      const pctAi    = document.getElementById(type + '-pct-ai');
      const pctHuman = document.getElementById(type + '-pct-human');

      if (barAi)    barAi.style.width    = data.ai_probability + '%';
      if (barHuman) barHuman.style.width = data.human_probability + '%';
      if (pctAi)    pctAi.textContent    = data.ai_probability + '%';
      if (pctHuman) pctHuman.textContent = data.human_probability + '%';
    });
  });

  const sigEl = document.getElementById(type + '-signals');
  if (sigEl) {
    sigEl.innerHTML = data.signals
      .map(s => `<span class="signal">${s}</span>`)
      .join('');
  }

  const modelUsed = document.getElementById(type + '-model-used');
  if (modelUsed) {
    const sel = document.getElementById(type + '-model');
    modelUsed.textContent = data.model_used || (sel ? sel.options[sel.selectedIndex].text : 'RoBERTa');
  }
}

function flashBtn(type) {
  const btn = document.querySelector(`#panel-${type} .analyse-btn`);
  if (!btn) return;
  btn.style.borderColor = 'rgba(224,84,84,0.5)';
  btn.style.color = '#e05454';
  setTimeout(() => {
    btn.style.borderColor = '';
    btn.style.color = '';
  }, 1200);
}

function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target   = parseFloat(el.dataset.val);
    const duration = 1600;
    const start    = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * e);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  });
}

const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) animateCounters();
    });
  }, { threshold: 0.4 }).observe(statsBar);
}

window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (nav) {
    nav.style.borderBottomColor = window.scrollY > 40
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(255,255,255,0.08)';
  }
});
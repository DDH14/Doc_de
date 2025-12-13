/* MODULE: PA – Luyện âm vị (Segment • Tone • Pair)
   2025 upgrade – đáp ứng 3.2.x–3.7: onset–rime/cụm phụ âm; 6 thanh điệu (mã màu nhất quán);
   cặp tối thiểu theo ngữ cảnh/phương ngữ; phân bổ theo cấp 1–2–3; gợi ý tầng bậc; phản hồi đa giác quan;
   TTS normal/chậm; analytics theo loại/tag + median RT + pattern lỗi + gợi ý luyện tập tuần.

   Phụ thuộc mềm: window.TTS, window.VoiceUI, window.Store, window.AppState (ttsRate), navigator.vibrate.
   Không có thì vẫn hoạt động cơ bản.
*/
(function(){
  const C = { containerId: 'pa-container' };

  // Tone mapping (consistent across app)
  const TONES = ['ngang','sắc','huyền','hỏi','ngã','nặng'];
  const TONE_COLORS = {
    'ngang': '#4F46E5',  // indigo
    'sắc':   '#EF4444',  // red
    'huyền': '#10B981',  // emerald
    'hỏi':   '#F59E0B',  // amber
    'ngã':   '#8B5CF6',  // violet
    'nặng':  '#6B7280'   // gray
  };
  const TONE_BG = {
    'ngang': 'rgba(79,70,229,.08)',
    'sắc':   'rgba(239,68,68,.08)',
    'huyền': 'rgba(16,185,129,.10)',
    'hỏi':   'rgba(245,158,11,.10)',
    'ngã':   'rgba(139,92,246,.10)',
    'nặng':  'rgba(107,114,128,.10)'
  };

  // Emoji gợi nghĩa
  const EMOJI = {
    // Người – gia đình
    'bé':'🧒','mẹ':'👩','bà':'👵','bố':'👨','ông':'👴','cô':'👩‍🏫','chú':'👨‍🦳',
    // Đồ vật – nơi chốn
    'nhà':'🏠','cửa':'🚪','bàn':'🛋️','ghế':'🪑','bút':'🖊️','vở':'📒','thước':'📏','giấy':'📄',
    // Cây cối – hoa quả
    'cây':'🌳','lá':'🍃','hoa':'🌸','quả':'🍎','lúa':'🌾',
    // Động vật – vật nuôi
    'cá':'🐟','gà':'🐔','chó':'🐶','mèo':'🐱','chim':'🐦','trứng':'🥚','trâu':'🐃','ngỗng':'🦢',
    // Thiên nhiên – thời tiết – địa lí
    'trăng':'🌙','sao':'⭐','mưa':'🌧️','nắng':'🌤️','mây':'☁️','gió':'🌬️','sương':'🌫️',
    'sông':'🏞️','biển':'🌊','núi':'⛰️','đường':'🛣️','trời':'🌤️',
    // Hoạt động
    'đi':'🚶','về':'🏠','học':'📚','đọc':'📖','viết':'✍️','chơi':'🎲','chạy':'🏃','nhảy':'🤸',
    'ăn':'🍽️','uống':'🥤','ngủ':'😴','thức':'☕',
    // Chính tả – cặp dễ nhầm
    'chanh':'🍋','tranh':'🖼️','xưa':'📜','quà':'🎁','quê':'🏡','kẹo':'🍬','cối':'⚙️',
    'nghỉ':'🛌','nghệ':'🧡','nồi':'🍲','lồi':'⚪','châu':'🌏','khỏe':'💪','bữa':'🍽️',
    'quạt':'🌀','quên':'💭','ghé':'🚪','ghen':'😤','giỏ':'🧺','sáo':'🎶','xáo':'🥣',
    'sẻ':'🐦','xẻ':'🪚','trẻ':'🧒','chẻ':'🪓','nâu':'🟫','lâu':'⏳','nặng':'⚖️','lặng':'🤫',
    'trôi':'🌊','quý':'💎','xương':'🦴',
    // PA segment bổ sung
    'cháo':'🍲','xanh':'🟩','trường':'🏫','thuốc':'💊','bắp':'🌽','cầu':'🌉','người':'🧑',
    'trâu':'🐃','châu':'🌏','chanh':'🍋','tranh':'🖼️','sôi':'🍲','xôi':'🍚','sương':'🌫️'
  };

  const RULE_HINTS = {
    'ngngh': 'Mẹo: “ngh” chỉ đi với e/i/ê. Ví dụ: nghề, nghỉ, nghệ…',
    'ggh':   'Mẹo: “gh” đi với e/i/ê; “g” đi với a/o/u/ư/â/ă/ô/ơ…',
    'ckqu':  'Mẹo: “c” đi với a/o/u; “k” đi với e/i/ê; “qu” là “q+u” viết liền.',
    'sx':    'Mẹo: s và x khác âm đầu; nghe kỹ vị trí lưỡi. So sánh “sôi” – “xôi”.',
    'chtr':  'Mẹo: ch và tr khác âm đầu; “tr” cụm phụ âm, hơi bật mạnh hơn.',
    'tone':  'Mẹo: nhìn màu/thanh: sắc(đỏ) ↑, huyền(xanh lá) ↓, hỏi(da cam) ˜, ngã(tím) ~, nặng(xám) .',
    'nl':    'Mẹo: n/l phân biệt đầu lưỡi; “nồi” vs “lồi”.'
  };

  // Simple fx: beep + vibrate + flash
  let _actx = null;
  function beep(f=880, t=0.06, type='sine'){
    try{
      _actx = _actx || new (window.AudioContext||window.webkitAudioContext)();
      const o = _actx.createOscillator();
      const g = _actx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.value = 0.05;
      o.connect(g); g.connect(_actx.destination);
      o.start(); setTimeout(()=>{ o.stop(); }, t*1000);
    }catch(_){}
  }
  function vibr(ms=40){ try{ if (navigator.vibrate) navigator.vibrate(ms); }catch(_){ } }

  function speak(txt, rateMul=1){
    try {
      const baseRate = (window.AppState?.learner?.ttsRate) || 0.9;
      const r = Math.max(0.5, Math.min(1.6, baseRate*rateMul));
      window.TTS && TTS.speak(txt, r);
    } catch(_){}
  }

  function fmtPct(x){ if (!isFinite(x)) return '—'; return (x*100).toFixed(0)+'%'; }
  function median(arr){
    if (!arr || !arr.length) return null;
    const a = arr.slice().sort((x,y)=>x-y);
    const m = Math.floor(a.length/2);
    return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
  }
  function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

  // Defaults bank (used if window.PA_ITEMS missing/insufficient)
  // 3 chế độ: segment / tone / pair
  const DEFAULT_BANK = {
    segment: [
      // Level 1 – CV/CVC đơn
      {type:'segment', level:1, target:'bé', parts:['b','é'], tags:['cv']},
      {type:'segment', level:1, target:'cá', parts:['c','á'], tags:['cv']},
      {type:'segment', level:1, target:'mẹ', parts:['m','ẹ'], tags:['cv']},
      {type:'segment', level:1, target:'bàn', parts:['b','àn'], tags:['cvc']},
      // Level 2 – cụm phụ âm/chuỗi chữ
      {type:'segment', level:2, target:'tranh', parts:['tr','anh'], tags:['chtr']},
      {type:'segment', level:2, target:'ghế', parts:['gh','ế'], tags:['ggh']},
      {type:'segment', level:2, target:'quả', parts:['qu','ả'], tags:['ckqu']},
      // Level 3 – vần phức
      {type:'segment', level:3, target:'xương', parts:['x','ương'], tags:['vphuc']},
      {type:'segment', level:3, target:'quý', parts:['qu','ý'], tags:['ckqu','vphuc']},
      {type:'segment', level:3, target:'trường', parts:['tr','ường'], tags:['chtr','vphuc']}
    ],
    tone: [
      // base + 6 forms [ngang, sắc, huyền, hỏi, ngã, nặng]
      {type:'tone', level:1, base:'me', forms:['me','mé','mè','mẻ','mẽ','mẹ']},
      {type:'tone', level:1, base:'la', forms:['la','lá','là','lả','lã','lạ']},
      {type:'tone', level:1, base:'co', forms:['co','có','cò','cỏ','cõ','cọ']},
      {type:'tone', level:2, base:'cho', forms:['cho','chó','chò','chỏ','chõ','chọ']},
      {type:'tone', level:2, base:'ga', forms:['ga','gá','gà','gả','gã','gạ']},
      {type:'tone', level:3, base:'mua', forms:['mua','múa','mùa','mủa','mũa','mụa']}, // ví dụ mở rộng (chấp nhận hiếm để luyện thanh)
      {type:'tone', level:3, base:'nha', forms:['nha','nhá','nhà','nhả','nhã','nhạ']}
    ],
    pair: [
      // Level 1 – cặp rất quen
      {type:'pair', level:1, a:'sôi', b:'xôi', tags:['sx'], region:'all'},
      {type:'pair', level:1, a:'nồi', b:'lồi', tags:['nl'], region:'all'},
      // Level 2 – ch/tr; s/x nhiều
      {type:'pair', level:2, a:'trẻ', b:'chẻ', tags:['chtr'], region:'all'},
      {type:'pair', level:2, a:'chanh', b:'tranh', tags:['chtr'], region:'all'},
      {type:'pair', level:2, a:'sương', b:'xương', tags:['sx'], region:'all'},
      // Level 3 – theo ngữ cảnh chính tả
      {type:'pair', level:3, a:'nghỉ', b:'ngỉ', tags:['ngngh'], region:'bac'}, // ưu tiên miền Bắc
      {type:'pair', level:3, a:'ghé', b:'gé', tags:['ggh'], region:'all'},
      {type:'pair', level:3, a:'quê', b:'kê', tags:['ckqu'], region:'all'},
      {type:'pair', level:3, a:'cá', b:'ká', tags:['ckqu'], region:'nam'} // k/c trước e/i/ê – ví dụ gợi ý (Nam hay dùng)
    ]
  };

  // Hỗ trợ lấy thêm từ PA_ITEMS (nếu có)
  function normalizeExternal(items){
    const out = { segment: [], tone: [], pair: [] };
    if (!Array.isArray(items)) return out;
    for (const it of items){
      if (!it || !it.type) continue;
      if (it.type==='segment' && Array.isArray(it.parts) && it.parts.length>=2 && it.target){
        out.segment.push({
          type:'segment', target: it.target, parts: it.parts.slice(0,4), level: it.level||2, tags: it.tags||[]
        });
      } else if (it.type==='tone' && Array.isArray(it.forms) && it.forms.length===6){
        out.tone.push({ type:'tone', base: it.base || it.forms[0], forms: it.forms.slice(0,6), level: it.level||2 });
      } else if (it.type==='pair' && typeof it.a==='string' && typeof it.b==='string'){
        out.pair.push({ type:'pair', a: it.a, b: it.b, level: it.level||2, tags: it.tags||[], region: it.region||'all' });
      }
    }
    return out;
  }

  function buildBank(){
    const ext = normalizeExternal(window.PA_ITEMS);
    return {
      segment: DEFAULT_BANK.segment.concat(ext.segment),
      tone:    DEFAULT_BANK.tone.concat(ext.tone),
      pair:    DEFAULT_BANK.pair.concat(ext.pair)
    };
  }

  // Session state
  const State = {
    mode: 'segment',       // 'segment' | 'tone' | 'pair'
    level: 1,              // 1 | 2 | 3
    dialect: 'bac',        // 'bac' | 'nam'
    showExtended: true,    // bật củng cố mẫu hoá
    hintLevel: 0,          // 0..3
    bank: buildBank(),
    queue: [],
    lastItemKey: '',
    stats: {
      startedAt: 0,
      points: 0,
      total: 0,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      rts: [],
      perType: { segment:{t:0,c:0}, tone:{t:0,c:0}, pair:{t:0,c:0} },
      perTag: {}, // tag => {t,c}
      logs: []    // {ts, mode, level, dialect, tags, target, selected, correct, rt, hintLevel, note}
    }
  };

  function saveLocal(){
    try{
      const keep = { mode:State.mode, level:State.level, dialect:State.dialect, showExtended:State.showExtended };
      localStorage.setItem('paState', JSON.stringify(keep));
    }catch(_){}
  }
  function loadLocal(){
    try{
      const s = JSON.parse(localStorage.getItem('paState')||'{}');
      if (s.mode) State.mode = s.mode;
      if (s.level) State.level = s.level;
      if (s.dialect) State.dialect = s.dialect;
      if (typeof s.showExtended==='boolean') State.showExtended = s.showExtended;
    }catch(_){}
  }

  // Styles (once)
  function renderStylesOnce(){
    if (document.getElementById('paStyle')) return;
    const css = `
      #${C.containerId} .pa-card{
        background: var(--surface, #fff);
        border-radius: 16px;
        box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,.08));
        padding: 16px;
      }
      #${C.containerId} .row{ display:flex; gap:10px; align-items:center; }
      #${C.containerId} .spacer{ flex:1; }
      #${C.containerId} .pill{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:#f5f7f9; border:1px solid #e6eaef; }
      #${C.containerId} .badge{ background:#eef6ff; color:#0b3a6f; border:1px solid #cfe3fb; border-radius:999px; padding:4px 8px; font-weight:600; }
      #${C.containerId} .pa-topbar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
      #${C.containerId} .pa-modes button{ padding:8px 10px; border-radius:8px; border:1px solid #e3e7ee; background:#fff; cursor:pointer; }
      #${C.containerId} .pa-modes button.active{ background:#111; color:#fff; border-color:#111; }
      #${C.containerId} select, #${C.containerId} input[type="checkbox"]{ min-height:36px; }
      #${C.containerId} .scorebar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      #${C.containerId} .scorebar .stat{ background:#fafafa; border:1px solid #eee; padding:6px 8px; border-radius:8px; }
      #${C.containerId} .hint{ color:#444; font-size:0.95em; }
      #${C.containerId} .pa-grid{ display:grid; grid-template-columns: 1.2fr 1fr; gap:16px; }
      @media (max-width:900px){ #${C.containerId} .pa-grid{ grid-template-columns: 1fr; } }
      #${C.containerId} .pa-bigword{ display:inline-block; padding:8px 12px; background:#e9f3ff; color:#0b3a6f; border-radius:8px; font-size:34px; font-weight:800; letter-spacing:0.02em; }
      #${C.containerId} .pa-instr{ margin-top:10px; color:var(--subtle,#666); }
      #${C.containerId} .pa-zone{ margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; }
      #${C.containerId} .pa-slot{ min-height:48px; border:2px dashed #d9e1ea; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f7fbff; }
      #${C.containerId} .pa-slot.over{ background:#eef6ff; border-color:#bcd6f2; }
      #${C.containerId} .pa-pool{ margin-top:12px; padding:10px; border:2px dashed #e8e1cf; border-radius:12px; background:#fffaf1; min-height:68px; display:flex; flex-wrap:wrap; gap:8px; }
      #${C.containerId} .pa-chip{ display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; background:#fff; border:1px solid #e3e7ee; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,.06); font-weight:700; cursor:grab; user-select:none; transition:transform .05s; }
      #${C.containerId} .pa-chip.dragging{ opacity:0.7; transform:scale(1.02); }
      #${C.containerId} .pa-art{ display:flex; align-items:center; justify-content:center; width:100%; height: clamp(220px, 42vh, 420px); border:2px solid #111; border-radius:18px; overflow:hidden; background:#fff; }
      #${C.containerId} .pa-art svg{ width:100%; height:100%; display:block; }
      #${C.containerId} .pa-actions{ margin-top:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
      #${C.containerId} .pa-fab{ position:absolute; right:18px; top:18px; width:46px; height:46px; border-radius:50%; background:#7c3aed; color:#fff; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; box-shadow:0 6px 16px rgba(124,58,237,.35); }
      #${C.containerId} .pa-fab:hover{ filter:brightness(1.05); }
      #${C.containerId} .pa-ok{ outline:3px solid #22c55e; outline-offset:2px; }
      #${C.containerId} .pa-warn{ outline:3px solid #ef4444; outline-offset:2px; }
      #${C.containerId} .tone-grid{ margin-top:10px; display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; }
      #${C.containerId} .tone-opt{ display:flex; align-items:center; justify-content:center; min-height:58px; border-radius:12px; border:2px solid transparent; cursor:pointer; font-weight:800; font-size:20px; user-select:none; }
      #${C.containerId} .tone-opt .tname{ font-size:12px; opacity:0.8; display:block; }
      #${C.containerId} .pair-grid{ margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
      @media (max-width:700px){ #${C.containerId} .pair-grid{ grid-template-columns: 1fr; } }
      #${C.containerId} .pair-btn{ min-height:64px; border-radius:12px; border:1px solid #e3e7ee; background:#fff; font-size:28px; font-weight:800; cursor:pointer; }
      #${C.containerId} .tiny{ font-size:12px; opacity:0.8; }
      #${C.containerId} .ghost, #${C.containerId} .primary, #${C.containerId} .hint-btn, #${C.containerId} .tts-btn{
        min-height:40px; border-radius:8px; border:1px solid #e3e7ee; background:#fff; padding:8px 12px; cursor:pointer;
      }
      #${C.containerId} .primary{ background:#111; color:#fff; border-color:#111; }
      #${C.containerId} .tts-btn{ background:#f0f9ff; border-color:#cde9ff; }
      #${C.containerId} .rule-box{ margin-top:8px; padding:8px 10px; border:1px dashed #e5e7eb; background:#fafafa; border-radius:8px; }
      #${C.containerId} .pattern{ margin-top:8px; padding:8px 10px; border:1px solid #d9f99d; background:#f7fee7; border-radius:8px; }
    `;
    const s = document.createElement('style'); s.id='paStyle'; s.textContent = css;
    document.head.appendChild(s);
  }

  // Art SVG (as before, responsive)
  function hashColor(word, idx=0){
    let h=0; for (let i=0;i<word.length;i++){ h=(h*31 + word.charCodeAt(i))>>>0; }
    const hue = (h + idx*47) % 360;
    const sat = 60 + (h%22);
    const lig = 55 + (h%18);
    return { hue, sat, lig };
  }
  function wordArtSVG(word){
    const vbW = 800, vbH = 520;
    const c1 = hashColor(word,0), c2 = hashColor(word,1);
    const bg1 = `hsl(${c1.hue}, ${c1.sat}%, ${c1.lig}%)`;
    const bg2 = `hsl(${c2.hue}, ${c2.sat}%, ${Math.max(26, c2.lig-20)}%)`;
    const emoji = EMOJI[word] || '';
    const fsEmoji = Math.round(vbH * (emoji? 0.38 : 0.32));
    const fsCap   = Math.round(vbH * 0.11);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"
           viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"
           role="img" aria-label="Hình minh họa cho ${word}">
        <defs>
          <linearGradient id="g_${encodeURIComponent(word)}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
          <filter id="sh_${encodeURIComponent(word)}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.25"/>
          </filter>
        </defs>
        <rect x="16" y="12" rx="28" ry="28" width="${vbW-32}" height="${vbH-24}" fill="url(#g_${encodeURIComponent(word)})" filter="url(#sh_${encodeURIComponent(word)})"/>
        <circle cx="${vbW*0.2}" cy="${vbH*0.28}" r="${vbH*0.04}" fill="rgba(255,255,255,0.25)"/>
        <circle cx="${vbW*0.82}" cy="${vbH*0.32}" r="${vbH*0.035}" fill="rgba(255,255,255,0.22)"/>
        <rect x="${vbW*0.70}" y="${vbH*0.70}" width="${vbW*0.10}" height="${vbH*0.02}" rx="${vbH*0.01}" fill="rgba(255,255,255,0.2)"/>
        <g dominant-baseline="middle" text-anchor="middle">
          <text x="${vbW/2}" y="${vbH*0.50 - (emoji? vbH*0.01 : vbH*0.04)}" font-size="${fsEmoji}" filter="url(#sh_${encodeURIComponent(word)})">${emoji? emoji : word.charAt(0).toUpperCase()}</text>
          <text x="${vbW/2}" y="${vbH*0.90}" font-size="${fsCap}" fill="#fff" style="font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,.25)">${word}</text>
        </g>
      </svg>
    `;
  }

  // UI scaffolding
  function topbar(host){
    const bar = document.createElement('div'); bar.className='pa-topbar';
    // Modes
    const modes = document.createElement('div'); modes.className='pa-modes';
    const mkBtn = (k, label)=> {
      const b = document.createElement('button');
      b.textContent = label; b.className = State.mode===k? 'active':'';
      b.onclick = ()=>{ State.mode=k; State.hintLevel=0; saveLocal(); refresh(); };
      return b;
    };
    modes.append(mkBtn('segment','Segment'), mkBtn('tone','Tone'), mkBtn('pair','Pair'));

    // Level
    const selLevel = document.createElement('select');
    [1,2,3].forEach(v=>{
      const opt = document.createElement('option'); opt.value=String(v);
      opt.textContent = 'Cấp '+v; if (State.level===v) opt.selected = true; selLevel.appendChild(opt);
    });
    selLevel.onchange = ()=>{ State.level = parseInt(selLevel.value,10)||1; State.hintLevel=0; saveLocal(); refresh(); };
    const wrapLev = wrapPill('Cấp độ:', selLevel);

    // Dialect
    const selDia = document.createElement('select');
    [{v:'bac',t:'Bắc'},{v:'nam',t:'Nam'}].forEach(o=>{
      const opt=document.createElement('option'); opt.value=o.v; opt.textContent=o.t; if (State.dialect===o.v) opt.selected=true; selDia.appendChild(opt);
    });
    selDia.onchange = ()=>{ State.dialect = selDia.value; State.hintLevel=0; saveLocal(); refresh(); };
    const wrapDia = wrapPill('Phương ngữ:', selDia);

    // Extended
    const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = State.showExtended;
    chk.onchange = ()=>{ State.showExtended = chk.checked; saveLocal(); };
    const wrapEx = wrapPill('Mở rộng:', (()=>{ const s=document.createElement('span'); s.appendChild(chk); s.append(' Củng cố'); return s;})());

    // TTS
    const btnListen = document.createElement('button'); btnListen.className='tts-btn'; btnListen.textContent='🔊 Nghe';
    btnListen.title='Nghe mẫu (normal)'; btnListen.onclick = ()=> { currentPlay('normal'); };
    const btnSlow = document.createElement('button'); btnSlow.className='tts-btn'; btnSlow.textContent='🐢 Chậm';
    btnSlow.title='Nghe chậm'; btnSlow.onclick = ()=> { currentPlay('slow'); };
    const ttsWrap = document.createElement('div'); ttsWrap.className='row'; ttsWrap.append(btnListen, btnSlow);

    // Scorebar
    const sb = scorebar();

    bar.append(modes, wrapLev, wrapDia, wrapEx, ttsWrap);
    const spacer = document.createElement('div'); spacer.className='spacer';
    bar.append(spacer, sb);
    host.appendChild(bar);
  }

  function wrapPill(label, node){
    const w = document.createElement('span'); w.className='pill';
    const lb = document.createElement('span'); lb.textContent = label;
    w.append(lb, node);
    return w;
  }

  function scorebar(){
    const wrap = document.createElement('div'); wrap.className='scorebar';
    const st1 = statBox('🏆 Điểm', State.stats.points);
    const st2 = statBox('✅ Đúng', `${State.stats.correct}/${State.stats.total}`);
    const acc = State.stats.total? Math.round(100*State.stats.correct/State.stats.total)+'%':'—';
    const st3 = statBox('🎯 Tỉ lệ', acc);
    const st4 = statBox('🔥 Liên tiếp', `${State.stats.streak} (tốt nhất ${State.stats.bestStreak})`);
    const med = median(State.stats.rts||[]);
    const st5 = statBox('⏱️ Median RT', med? (Math.round(med)+' ms') : '—');
    wrap.append(st1, st2, st3, st4, st5);
    return wrap;
  }
  function statBox(label, val){
    const el = document.createElement('span'); el.className='stat';
    el.innerHTML = `<span class="tiny">${label}</span> <b>${val}</b>`;
    return el;
  }

  // Global current trial for TTS/hints
  let _trial = null;
  function currentPlay(kind='normal'){
    if (!_trial) return;
    if (_trial.mode==='segment'){
      // Nghe mục tiêu
      speak(_trial.item.speak || _trial.item.target, kind==='slow'? 0.75 : 1);
    } else if (_trial.mode==='tone'){
      // nghe đúng biến thể (target form)
      const txt = _trial.item.forms[_trial.targetToneIdx];
      speak(txt, kind==='slow'? 0.75 : 1);
    } else if (_trial.mode==='pair'){
      // nghe tiếng mục tiêu
      speak(_trial.target, kind==='slow'? 0.75 : 1);
    }
  }

  // Hints
  function hintText(){
    if (!_trial) return '';
    // Gợi ý tầng bậc
    // 1) nghe chậm + tô màu thanh (tone)
    // 2) manh mối quy tắc
    // 3) so sánh đối chiếu cặp gần
    if (State.hintLevel===0) return '';
    if (_trial.mode==='tone'){
      if (State.hintLevel===1){
        return 'Gợi ý 1: Nghe chậm và chú ý màu/thanh.';
      } else if (State.hintLevel===2){
        return RULE_HINTS['tone'];
      } else {
        return 'Gợi ý 3: So sánh 2 thanh dễ nhầm (ví dụ sắc–ngã; huyền–hỏi). Nghe liên tiếp để phân biệt đường cong.';
      }
    } else if (_trial.mode==='pair'){
      const tag = (_trial.tags||[])[0] || 'sx';
      if (State.hintLevel===1){
        return 'Gợi ý 1: Nghe chậm và tập trung vào âm đầu.';
      } else if (State.hintLevel===2){
        return RULE_HINTS[tag] || 'Chú ý quy tắc chính tả theo môi trường (ng/ngh; g/gh; c/k/qu…).';
      } else {
        return 'Gợi ý 3: Nghe nối tiếp hai âm gần nhau để đối chiếu (ví dụ phát “s” rồi “x”).';
      }
    } else { // segment
      if (State.hintLevel===1){
        return 'Gợi ý 1: Nghe chậm tiếng mục tiêu rồi ghép theo thứ tự.';
      } else if (State.hintLevel===2){
        // dựa theo tag
        const tag = (_trial.tags||[])[0];
        return RULE_HINTS[tag] || 'Nhớ: onset (phụ âm đầu) + vần tạo thành tiếng. Cụm tr/gh/qu cần ghép liền.';
      } else {
        return 'Gợi ý 3: So sánh với ví dụ tương tự (tr–anh; gh–ế; qu–ả…).';
      }
    }
  }

  function renderHintBox(host){
    const h = document.createElement('div'); h.className = 'row';
    const btnH = document.createElement('button'); btnH.className='hint-btn'; btnH.textContent='💡 Gợi ý';
    btnH.onclick = ()=>{
      State.hintLevel = Math.min(3, State.hintLevel+1);
      if (State.hintLevel===1){ currentPlay('slow'); }
      refreshHint();
    };
    const txt = document.createElement('div'); txt.className='hint'; txt.style.minHeight='1.4em';
    function refresh(){ txt.textContent = hintText(); }
    function refreshHint(){ refresh(); }
    h.append(btnH, txt);
    host.appendChild(h);
    refresh();
    // expose
    renderHintBox.refresh = refreshHint;
  }

  function refreshHint(){
    try{ renderHintBox.refresh && renderHintBox.refresh(); }catch(_){}
  }

  // Build queue based on mode, level, dialect and content rules
  function buildQueue(){
    const b = State.bank;
    let pool = [];
    if (State.mode==='segment'){
      pool = b.segment.filter(x=>{
        // chọn vần phổ dụng, hạn chế ngoại lệ ở cấp 1
        if (State.level===1 && (x.tags||[]).includes('vphuc')) return false;
        return x.level<=State.level;
      });
    } else if (State.mode==='tone'){
      pool = b.tone.filter(x=> x.level<=State.level);
    } else {
      pool = b.pair.filter(x=>{
        if (x.level>State.level) return false;
        if (State.dialect==='bac' && x.region==='nam') return false;
        if (State.dialect==='nam' && x.region==='bac') return false;
        return true;
      });
    }
    // Shuffle and ensure not repeating last target
    pool = shuffle(pool);
    State.queue = pool;
  }

  function nextItem(){
    if (!State.queue.length) buildQueue();
    const item = State.queue.shift() || null;
    return item;
  }

  // Analytics
  function bumpTagStats(tags, correct){
    (tags||[]).forEach(tag=>{
      if (!State.stats.perTag[tag]) State.stats.perTag[tag] = {t:0,c:0};
      State.stats.perTag[tag].t += 1;
      if (correct) State.stats.perTag[tag].c += 1;
    });
  }
  function recordTrial(log){
    State.stats.total += 1;
    if (log.correct){
      State.stats.correct += 1;
      State.stats.points += 10 - Math.min(6, State.hintLevel*2); // đúng có gợi ý ít điểm hơn
      State.stats.streak += 1;
      State.stats.bestStreak = Math.max(State.stats.bestStreak, State.stats.streak);
    } else {
      State.stats.streak = 0;
      State.stats.points = Math.max(0, State.stats.points - 1);
    }
    if (typeof log.rt==='number') State.stats.rts.push(log.rt);
    State.stats.perType[State.mode].t += 1;
    if (log.correct) State.stats.perType[State.mode].c += 1;
    bumpTagStats(log.tags, log.correct);
    State.stats.logs.push(log);

    // try to persist a single-trial log
    try{
      if (window.Store){
        if (typeof Store.log==='function') Store.log({type:'PA_TRIAL', payload:log});
        else if (typeof Store.addLog==='function') Store.addLog('PA_TRIAL', log);
        else if (typeof Store.addPA==='function') Store.addPA(log);
      }
    }catch(_){}
  }

  function weeklySuggestion(){
    // pick 2–3 tags with lowest accuracy and enough trials
    const arr = Object.entries(State.stats.perTag).map(([tag, v])=>{
      const acc = v.t ? (v.c/v.t) : 0;
      return {tag, t:v.t, acc};
    }).filter(x=>x.t>=3).sort((a,b)=>a.acc-b.acc);
    const top = arr.slice(0,3);
    if (!top.length) return '—';
    return top.map(x=> x.tag).join(', ');
  }

  function endSessionSave(){
    const sum = {
      ts: Date.now(),
      mode: State.mode,
      level: State.level,
      dialect: State.dialect,
      points: State.stats.points,
      total: State.stats.total,
      correct: State.stats.correct,
      acc: State.stats.total ? (State.stats.correct/State.stats.total) : 0,
      medianRT: median(State.stats.rts||[]),
      perType: State.stats.perType,
      perTag: State.stats.perTag,
      bestStreak: State.stats.bestStreak,
      suggest: weeklySuggestion()
    };
    try{
      if (window.Store){
        const payload = { type:'PA_SESSION', payload: sum };
        if (typeof Store.log==='function') Store.log(payload);
        else if (typeof Store.addLog==='function') Store.addLog('PA_SESSION', sum);
        else if (typeof Store.addPA==='function') Store.addPA(sum);
      }
    }catch(_){}
  }

  // UI render per mode
  function renderSegment(item, host){
    const card = document.createElement('div'); card.className='pa-card'; card.style.position='relative';
    const title = document.createElement('div'); title.className='pa-title'; title.textContent = 'Ghép âm/tiếng thành từ (onset–rime)';
    card.appendChild(title);

    const fab = document.createElement('button'); fab.className='pa-fab'; fab.title='Nghe từ'; fab.setAttribute('aria-label','Nghe từ'); fab.textContent='🔊';
    fab.onclick = ()=> currentPlay('normal');
    card.appendChild(fab);

    const grid = document.createElement('div'); grid.className='pa-grid'; card.appendChild(grid);

    // Left
    const left = document.createElement('div');
    const big = document.createElement('div'); big.className='pa-bigword'; big.textContent = item.target; left.appendChild(big);
    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Kéo các mảnh vào khung theo đúng thứ tự. Một thao tác – một mục tiêu.';
    left.appendChild(instr);

    const zone = document.createElement('div'); zone.className='pa-zone';
    const slots = item.parts.map(()=> makeSlot());
    slots.forEach(s=> zone.appendChild(s)); left.appendChild(zone);

    const pool = document.createElement('div'); pool.className='pa-pool'; wirePoolDrop(pool);
    shuffle(item.parts).forEach((txt,i)=> pool.appendChild(makeChip(txt,i)));
    left.appendChild(pool);

    const actions = document.createElement('div'); actions.className='pa-actions';
    const btnCheck = document.createElement('button'); btnCheck.className='primary'; btnCheck.textContent='Kiểm tra';
    const btnNext  = document.createElement('button'); btnNext.className='ghost'; btnNext.textContent='Bài khác';
    const btnExplain = document.createElement('button'); btnExplain.className='ghost'; btnExplain.textContent='❓ Giải thích';

    btnExplain.onclick = ()=>{
      const tag = (item.tags||[])[0];
      const box = document.createElement('div'); box.className='rule-box'; box.textContent = RULE_HINTS[tag] || 'Onset + vần tạo tiếng; cụm phụ âm (tr/gh/qu) đi liền.';
      actions.appendChild(box);
    };

    btnCheck.onclick = ()=>{
      const t0 = _trial.t0;
      const got = slots.map(s=> (s.querySelector('.pa-chip')?.textContent.trim() || ''));
      const correctSeq = item.parts.join('|');
      const actualSeq  = got.join('|');
      slots.forEach(s=> s.classList.remove('pa-ok','pa-warn'));
      const ok = (actualSeq===correctSeq);
      if (ok){
        slots.forEach(s=> s.classList.add('pa-ok'));
        beep(1040, 0.08, 'triangle');
        if (window.VoiceUI?.enabled){ try{ VoiceUI.say('Đúng rồi!'); }catch(_){ } }
        // củng cố mẫu hoá nếu streak >=3
        if (State.showExtended && State.stats.streak+1 >= 3){
          showPattern(left, item);
        }
      } else {
        slots.forEach((s,i)=>{
          const chip = s.querySelector('.pa-chip'); const okp = item.parts[i]||'';
          if (!chip || chip.textContent.trim()!==okp) s.classList.add('pa-warn');
        });
        vibr(60); beep(220, 0.08, 'sawtooth');
        // giải thích ngắn nếu có tag
        const tag = (item.tags||[])[0];
        if (RULE_HINTS[tag]) showRuleBrief(left, RULE_HINTS[tag]);
        // auto replay slow
        setTimeout(()=> currentPlay('slow'), 180);
      }
      // analytics
      const rt = Date.now() - t0;
      recordTrial({
        ts: Date.now(), mode:'segment', level:State.level, dialect:State.dialect,
        tags: item.tags||[], target: item.target, selected: got.join(' '),
        correct: ok, rt, hintLevel: State.hintLevel, note:'segment'
      });
      refreshUIStats();
    };
    btnNext.onclick = ()=> { State.hintLevel=0; refresh(); };

    actions.append(btnCheck, btnNext, btnExplain);
    renderHintBox(left);

    // Right art
    const right = document.createElement('div');
    const art = document.createElement('div'); art.className='pa-art'; art.innerHTML = wordArtSVG(item.target);
    right.appendChild(art);

    grid.append(left, right);
    host.appendChild(card);

    // attention cue
    setTimeout(()=> beep(880, 0.05, 'sine'), 60);
    // set trial
    _trial = { mode:'segment', item, t0: Date.now(), tags: item.tags||[], target: item.target };
  }

  function showRuleBrief(parent, text){
    const box = document.createElement('div'); box.className='rule-box'; box.textContent = text;
    parent.appendChild(box);
  }
  function showPattern(parent, item){
    const tag = (item.tags||[])[0];
    const patt = {
      'chtr': 'Mẫu hoá: tr + a/ă/â/… → “trang, trắng, trăng…”; ch + a/ă/â/… → “chang, chẳng, chăng…”.',
      'ggh':  'Mẫu hoá: gh + e/i/ê (ghé, ghì, ghê) • g + a/o/u (ga, go, gu).',
      'ckqu': 'Mẫu hoá: c + a/o/u (ca, co, cu) • k + e/i/ê (ke, ki, kê) • qu + a/ă/â (qua, quă, quâ…).',
      'vphuc':'Mẫu hoá: vần “ươ, iê, uy” → luyện ghép onset + vần: “x-ương, tr-iêng, qu-y”.',
      'cv':   'Mẫu hoá: CV → phụ âm + nguyên âm: b-ê, c-á, m-ẹ…',
      'cvc':  'Mẫu hoá: CVC → phụ âm + vần có âm cuối: b-ăn, b-anh, v-ăn…'
    }[tag] || 'Mẫu hoá: lặp lại quy tắc với vài ví dụ tương tự.';
    const p = document.createElement('div'); p.className='pattern'; p.textContent = patt;
    parent.appendChild(p);
  }

  function renderTone(item, host){
    const card = document.createElement('div'); card.className='pa-card'; card.style.position='relative';
    const title = document.createElement('div'); title.className='pa-title'; title.textContent = 'Thanh điệu – 6 thanh (mã màu nhất quán)';
    card.appendChild(title);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Nghe tiếng mục tiêu rồi chọn đúng thanh điệu. Giữ nguyên onset/vần – chỉ khác thanh.';
    card.appendChild(instr);

    // Decide a target tone index
    const targetToneIdx = Math.floor(Math.random()*6);
    const targetText = item.forms[targetToneIdx];

    // Hint: show the base big word (without telling which tone)
    const big = document.createElement('div'); big.className='pa-bigword'; big.textContent = item.base + ' (6 thanh)';
    card.appendChild(big);

    // Tone grid
    const grid = document.createElement('div'); grid.className='tone-grid';
    const order = [0,1,2,3,4,5];
    const opts = order.map(i=>{
      const toneName = TONES[i];
      const btn = document.createElement('button'); btn.className='tone-opt';
      btn.style.background = TONE_BG[toneName];
      btn.style.borderColor = TONE_COLORS[toneName];
      btn.style.color = '#111';
      btn.innerHTML = `<div>${item.forms[i]}</div><span class="tname" style="color:${TONE_COLORS[toneName]}">${toneName}</span>`;
      btn.onclick = ()=>{
        const t0 = _trial.t0;
        const ok = (i===targetToneIdx);
        if (ok){
          btn.classList.add('pa-ok'); beep(1040, 0.08, 'triangle');
          if (window.VoiceUI?.enabled){ try{ VoiceUI.say('Giỏi lắm!'); }catch(_){ } }
          if (State.showExtended && State.stats.streak+1 >= 3){
            const pattern = document.createElement('div'); pattern.className='pattern';
            pattern.textContent = 'Ghi nhớ màu/thanh: sắc(đỏ) ↑, huyền(xanh lá) ↓, hỏi(da cam) ˜, ngã(tím) ~, nặng(xám) .';
            card.appendChild(pattern);
          }
        } else {
          btn.classList.add('pa-warn'); vibr(60); beep(220, 0.08, 'sawtooth');
          showRuleBrief(card, RULE_HINTS['tone']);
          setTimeout(()=> currentPlay('slow'), 180);
        }
        const rt = Date.now()-t0;
        recordTrial({
          ts: Date.now(), mode:'tone', level:State.level, dialect:State.dialect,
          tags:['tone'], target: targetText, selected: item.forms[i],
          correct: ok, rt, hintLevel: State.hintLevel, note: `tone:${TONES[targetToneIdx]}`
        });
        refreshUIStats();
        // auto next after short delay
        setTimeout(()=> { State.hintLevel=0; refresh(); }, 480);
      };
      return btn;
    });
    opts.forEach(o=> grid.appendChild(o));
    card.appendChild(grid);

    renderHintBox(card);

    host.appendChild(card);

    // attention cue + play sample
    setTimeout(()=> { beep(880,0.05,'sine'); }, 60);
    setTimeout(()=> { speak(targetText, 1); }, 140);

    _trial = { mode:'tone', item, targetToneIdx, t0: Date.now(), target: targetText, tags:['tone'] };
  }

  function renderPair(item, host){
    const card = document.createElement('div'); card.className='pa-card'; card.style.position='relative';
    const title = document.createElement('div'); title.className='pa-title';
    title.textContent = 'Cặp tối thiểu – nghe chọn (chính tả theo ngữ cảnh/phương ngữ)';
    card.appendChild(title);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Bấm 🔊 để nghe một trong hai từ; sau đó chọn đáp án đúng. Tập trung âm đầu.';
    card.appendChild(instr);

    const pairBox = document.createElement('div'); pairBox.className='pair-grid';
    const order = Math.random()<0.5 ? [item.a, item.b] : [item.b, item.a];
    const btns = order.map(txt=>{
      const b = document.createElement('button'); b.className='pair-btn'; b.textContent = txt;
      b.onclick = ()=>{
        const t0 = _trial.t0;
        const ok = (txt===_trial.target);
        if (ok){
          b.classList.add('pa-ok'); beep(1040, 0.08, 'triangle');
          if (window.VoiceUI?.enabled){ try{ VoiceUI.say('Tuyệt!'); }catch(_){ } }
          if (State.showExtended && State.stats.streak+1 >= 3){
            const tag = (item.tags||[])[0];
            const pattText = RULE_HINTS[tag] || 'Lắng nghe đối chiếu thêm vài ví dụ tương tự để khái quát quy tắc.';
            const patt = document.createElement('div'); patt.className='pattern'; patt.textContent = 'Mẫu hoá: '+pattText;
            card.appendChild(patt);
          }
        } else {
          b.classList.add('pa-warn'); vibr(60); beep(220, 0.08, 'sawtooth');
          const tag = (item.tags||[])[0]; if (RULE_HINTS[tag]) showRuleBrief(card, RULE_HINTS[tag]);
          setTimeout(()=> currentPlay('slow'), 180);
        }
        const rt = Date.now() - t0;
        recordTrial({
          ts: Date.now(), mode:'pair', level:State.level, dialect:State.dialect,
          tags: item.tags||[], target: _trial.target, selected: txt,
          correct: ok, rt, hintLevel: State.hintLevel, note:`pair:${(item.tags||[]).join(',')}`
        });
        refreshUIStats();
        setTimeout(()=>{ State.hintLevel=0; refresh(); }, 520);
      };
      return b;
    });
    btns.forEach(b=> pairBox.appendChild(b));
    card.appendChild(pairBox);

    // Controls
    const row = document.createElement('div'); row.className='row';
    const btnPlay = document.createElement('button'); btnPlay.className='tts-btn'; btnPlay.textContent='🔊 Nghe mẫu';
    btnPlay.onclick = ()=> currentPlay('normal');
    const btnSlow = document.createElement('button'); btnSlow.className='tts-btn'; btnSlow.textContent='🐢 Chậm';
    btnSlow.onclick = ()=> currentPlay('slow');
    row.append(btnPlay, btnSlow);
    card.appendChild(row);

    renderHintBox(card);

    host.appendChild(card);

    // decide target and play
    const target = Math.random()<0.5 ? item.a : item.b;
    _trial = { mode:'pair', item, target, t0: Date.now(), tags: item.tags||[] };
    setTimeout(()=> { beep(880,0.05,'sine'); speak(target, 1); }, 120);
  }

  // Segment helpers (drag-drop)
  function makeChip(txt, idx){
    const el = document.createElement('div');
    el.className = 'pa-chip'; el.textContent = txt; el.draggable = true;
    el.id = `chip_${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`;
    el.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', el.id);
      setTimeout(()=> el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
    return el;
  }
  function makeSlot(){
    const el = document.createElement('div');
    el.className = 'pa-slot';
    el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', ()=> el.classList.remove('over'));
    el.addEventListener('drop', e=>{
      e.preventDefault(); el.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const chip = document.getElementById(id);
      if (!chip) return;
      const cur = el.querySelector('.pa-chip');
      const pool = el.closest('.pa-card').querySelector('.pa-pool');
      if (cur && pool) pool.appendChild(cur);
      el.appendChild(chip);
    });
    return el;
  }
  function wirePoolDrop(pool){
    pool.addEventListener('dragover', e=> e.preventDefault());
    pool.addEventListener('drop', e=>{
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const chip = document.getElementById(id);
      if (chip) pool.appendChild(chip);
    });
  }

  function refresh(){
    const host = document.getElementById(C.containerId); if (!host) return;
    host.innerHTML = '';
    renderStylesOnce();
    topbar(host);

    // container for current task
    const cont = document.createElement('div');
    host.appendChild(cont);

    // pick next item
    const item = nextItem();
    if (!item){
      cont.innerHTML = '<div class="pa-card"><div class="pa-title">Chưa có dữ liệu</div><div>Hãy bổ sung PA_ITEMS hoặc dùng ngân hàng mặc định.</div></div>';
      return;
    }
    if (State.mode==='segment') renderSegment(item, cont);
    else if (State.mode==='tone') renderTone(item, cont);
    else renderPair(item, cont);

    // footer actions row
    const f = document.createElement('div'); f.className='row'; f.style.marginTop='10px';
    const btnSave = document.createElement('button'); btnSave.className='ghost'; btnSave.textContent='💾 Ghi phiên';
    btnSave.title = 'Lưu lại thống kê phiên hiện tại';
    btnSave.onclick = ()=>{ endSessionSave(); beep(660,0.06,'triangle'); };
    const btnReset = document.createElement('button'); btnReset.className='ghost'; btnReset.textContent='🧹 Xoá thống kê phiên';
    btnReset.onclick = ()=> {
      State.stats = { startedAt: Date.now(), points:0, total:0, correct:0, streak:0, bestStreak:0, rts:[], perType:{segment:{t:0,c:0}, tone:{t:0,c:0}, pair:{t:0,c:0}}, perTag:{}, logs:[] };
      refreshUIStats();
      beep(520,0.05,'sine');
    };
    const sugg = document.createElement('span'); sugg.className='badge'; sugg.textContent = 'Ưu tiên tuần: '+weeklySuggestion();
    f.append(btnSave, btnReset);
    const sp = document.createElement('div'); sp.className='spacer';
    f.append(sp, sugg);
    host.appendChild(f);

    // set session start if needed
    if (!State.stats.startedAt) State.stats.startedAt = Date.now();
  }

  function refreshUIStats(){
    // Re-render topbar score segment only (simple approach: refresh whole topbar)
    const host = document.getElementById(C.containerId);
    if (!host) return;
    const oldTop = host.querySelector('.pa-topbar');
    if (oldTop){
      oldTop.remove();
      topbar(host);
    }
    const sugg = host.querySelector('.badge');
    if (sugg) sugg.textContent = 'Ưu tiên tuần: '+weeklySuggestion();
  }

  // Public API
  function init(){
    const host = document.getElementById(C.containerId); if (!host) return;
    loadLocal();
    State.bank = buildBank();
    State.hintLevel = 0;
    buildQueue();
    refresh();
  }

  // Expose
  window.PAModule = {
    init,
    setMode(m){ if (['segment','tone','pair'].includes(m)){ State.mode=m; State.hintLevel=0; saveLocal(); buildQueue(); refresh(); } },
    setLevel(l){ const v = parseInt(l,10)||1; State.level=v; saveLocal(); buildQueue(); refresh(); },
    setDialect(d){ if (d==='bac'||d==='nam'){ State.dialect=d; saveLocal(); buildQueue(); refresh(); } },
    getStats(){ return JSON.parse(JSON.stringify(State.stats)); },
    renderSegment(item){ // backward compatibility
      const host = document.getElementById(C.containerId); if (!host) return;
      host.innerHTML = ''; renderStylesOnce(); topbar(host);
      const cont = document.createElement('div'); host.appendChild(cont);
      renderSegment(item, cont);
    }
  };

  // Auto init
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

})();
/* MODULE: PA – Luyện âm vị (Ghép âm/tiếng thành từ)
   Giao diện 2 cột; kéo‑thả parts vào slot theo thứ tự; TTS nghe từ; nút “Bài khác”.
   Hình minh hoạ sinh tự động (SVG + emoji) – nay đã to và phủ đầy khung (responsive). */

(function(){
  const C = { containerId: 'pa-container' };

  // Emoji gợi nghĩa (fallback: chữ cái lớn nếu không có)
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
    // Hoạt động thường ngày
    'đi':'🚶','về':'🏠','học':'📚','đọc':'📖','viết':'✍️','chơi':'🎲','chạy':'🏃','nhảy':'🤸',
    'ăn':'🍽️','uống':'🥤','ngủ':'😴','thức':'☕',
    // Chính tả – cặp dễ nhầm
    'chanh':'🍋','tranh':'🖼️','xưa':'📜','quà':'🎁','quê':'🏡','kẹo':'🍬','cối':'⚙️',
    'nghỉ':'🛌','nghệ':'🧡','nồi':'🍲','lồi':'⚪','châu':'🌏','khỏe':'💪','bữa':'🍽️',
    'quạt':'🌀','quên':'💭','ghé':'🚪','ghen':'😤','giỏ':'🧺','sáo':'🎶','xáo':'🥣',
    'sẻ':'🐦','xẻ':'🪚','trẻ':'🧒','chẻ':'🪓','nâu':'🟫','lâu':'⏳','nặng':'⚖️','lặng':'🤫',
    'trôi':'🌊','quý':'💎','xương':'🦴',
    // Các từ xuất hiện trong PA segment
    'cháo':'🍲','xanh':'🟩','trường':'🏫','thuốc':'💊','bắp':'🌽','cầu':'🌉','người':'🧑'
  };

  function getSegments(){
    const src = Array.isArray(window.PA_ITEMS) ? window.PA_ITEMS : [];
    return src.filter(x=>x && x.type==='segment' && Array.isArray(x.parts) && x.parts.length>=2);
  }

  // Hash → màu
  function hashColor(s, idx=0){
    let h=0; for (let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; }
    const hue = (h + idx*47) % 360;
    const sat = 60 + (h%22);
    const lig = 55 + (h%18);
    return { hue, sat, lig };
  }

  // SVG minh hoạ – responsive (width/height 100%), viewBox cố định, fill khung
  function wordArtSVG(word){
    const vbW = 800, vbH = 520; // viewBox rộng – tỉ lệ ngang
    const c1 = hashColor(word,0), c2 = hashColor(word,1);
    const bg1 = `hsl(${c1.hue}, ${c1.sat}%, ${c1.lig}%)`;
    const bg2 = `hsl(${c2.hue}, ${c2.sat}%, ${Math.max(26, c2.lig-20)}%)`;
    const emoji = EMOJI[word] || '';
    // kích thước text tỷ lệ với khung
    const fsEmoji = Math.round(vbH * (emoji? 0.38 : 0.32));
    const fsCap   = Math.round(vbH * 0.11);

    return `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}"
           preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hình minh họa cho ${word}">
        <defs>
          <linearGradient id="g_${encodeURIComponent(word)}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bg1}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
          <filter id="sh_${encodeURIComponent(word)}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.25"/>
          </filter>
        </defs>
        <!-- nền bo tròn phủ gần hết khung -->
        <rect x="16" y="12" rx="28" ry="28" width="${vbW-32}" height="${vbH-24}" fill="url(#g_${encodeURIComponent(word)})" filter="url(#sh_${encodeURIComponent(word)})"/>
        <!-- họa tiết nhẹ -->
        <circle cx="${vbW*0.2}" cy="${vbH*0.28}" r="${vbH*0.04}" fill="rgba(255,255,255,0.25)"/>
        <circle cx="${vbW*0.82}" cy="${vbH*0.32}" r="${vbH*0.035}" fill="rgba(255,255,255,0.22)"/>
        <rect x="${vbW*0.70}" y="${vbH*0.70}" width="${vbW*0.10}" height="${vbH*0.02}" rx="${vbH*0.01}" fill="rgba(255,255,255,0.2)"/>
        <!-- emoji / chữ + caption -->
        <g dominant-baseline="middle" text-anchor="middle">
          <text x="${vbW/2}" y="${vbH*0.50 - (emoji? vbH*0.01 : vbH*0.04)}"
                font-size="${fsEmoji}" filter="url(#sh_${encodeURIComponent(word)})">${emoji? emoji : word.charAt(0).toUpperCase()}</text>
          <text x="${vbW/2}" y="${vbH*0.90}" font-size="${fsCap}" fill="#fff"
                style="font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,.25)">${word}</text>
        </g>
      </svg>
    `;
  }

  function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]];} return b; }

  function makeChip(txt, idx){
    const el = document.createElement('div');
    el.className = 'pa-chip';
    el.textContent = txt;
    el.draggable = true;
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
      e.preventDefault();
      el.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const chip = document.getElementById(id);
      if (!chip) return;
      const cur = el.querySelector('.pa-chip');
      const pool = el.closest('.pa-grid').querySelector('.pa-pool');
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

  function renderStylesOnce(){
    if (document.getElementById('paStyle')) return;
    const css = `
      #${C.containerId} .pa-card{
        background: var(--surface, #fff);
        border-radius: 16px;
        box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,.08));
        padding: 16px;
      }
      #${C.containerId} .pa-title{
        font-size: 18px; font-weight: 700; margin: 0 0 12px; color: var(--text);
      }
      #${C.containerId} .pa-grid{
        display:grid; grid-template-columns: 1.2fr 1fr; gap:16px;
      }
      @media (max-width:900px){
        #${C.containerId} .pa-grid{ grid-template-columns: 1fr; }
      }
      #${C.containerId} .pa-bigword{
        display:inline-block; padding:8px 12px; background:#e9f3ff; color:#0b3a6f;
        border-radius:8px; font-size:34px; font-weight:800; letter-spacing:0.02em;
      }
      #${C.containerId} .pa-instr{ margin-top:10px; color:var(--subtle,#666); }
      #${C.containerId} .pa-zone{
        margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px;
      }
      #${C.containerId} .pa-slot{
        min-height:48px; border:2px dashed #d9e1ea; border-radius:12px; display:flex; align-items:center; justify-content:center;
        background:#f7fbff;
      }
      #${C.containerId} .pa-slot.over{ background:#eef6ff; border-color:#bcd6f2; }
      #${C.containerId} .pa-pool{
        margin-top:12px; padding:10px; border:2px dashed #e8e1cf; border-radius:12px; background:#fffaf1;
        min-height:68px; display:flex; flex-wrap:wrap; gap:8px;
      }
      #${C.containerId} .pa-chip{
        display:inline-flex; align-items:center; justify-content:center;
        padding:10px 14px; background:#fff; border:1px solid #e3e7ee; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,.06);
        font-weight:700; cursor:grab; user-select:none; transition:transform .05s;
      }
      #${C.containerId} .pa-chip.dragging{ opacity:0.7; transform:scale(1.02); }
      #${C.containerId} .pa-art{
        display:flex; align-items:center; justify-content:center; width:100%;
        height: clamp(220px, 42vh, 420px); /* to và linh hoạt */
        border:2px solid #111; border-radius:18px; overflow:hidden; background:#fff;
      }
      #${C.containerId} .pa-art svg{ width:100%; height:100%; display:block; }
      #${C.containerId} .pa-actions{ margin-top:14px; display:flex; gap:12px; align-items:center; }
      #${C.containerId} .pa-fab{
        position:absolute; right:18px; top:18px; width:46px; height:46px; border-radius:50%;
        background:#7c3aed; color:#fff; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;
        box-shadow:0 6px 16px rgba(124,58,237,.35);
      }
      #${C.containerId} .pa-fab:hover{ filter:brightness(1.05); }
      #${C.containerId} .pa-ok{ outline:3px solid #22c55e; outline-offset:2px; }
      #${C.containerId} .pa-warn{ outline:3px solid #ef4444; outline-offset:2px; }
    `;
    const s = document.createElement('style'); s.id='paStyle'; s.textContent = css;
    document.head.appendChild(s);
  }

  function renderSegment(item){
    const host = document.getElementById(C.containerId);
    if (!host) return;
    renderStylesOnce();

    host.innerHTML = '';
    const card = document.createElement('div'); card.className='pa-card'; card.style.position='relative';

    const title = document.createElement('div'); title.className='pa-title';
    title.textContent = 'Ghép âm/tiếng thành từ';
    card.appendChild(title);

    const fab = document.createElement('button');
    fab.className='pa-fab'; fab.title='Nghe từ'; fab.setAttribute('aria-label','Nghe từ'); fab.textContent='🔊';
    fab.onclick = ()=> { try{ window.TTS && TTS.speak(item.speak || item.target, (window.AppState?.learner?.ttsRate)||0.9); }catch(_){ } };
    card.appendChild(fab);

    const grid = document.createElement('div'); grid.className='pa-grid';
    card.appendChild(grid);

    // Trái: thao tác
    const left = document.createElement('div');
    const big = document.createElement('div'); big.className='pa-bigword'; big.textContent = item.target;
    left.appendChild(big);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Kéo các mảnh bên dưới vào khung theo thứ tự đúng:';
    left.appendChild(instr);

    const zone = document.createElement('div'); zone.className='pa-zone';
    const slots = item.parts.map(()=> makeSlot());
    slots.forEach(s=> zone.appendChild(s));
    left.appendChild(zone);

    const pool = document.createElement('div'); pool.className='pa-pool';
    wirePoolDrop(pool);
    shuffle(item.parts).forEach((txt,i)=> pool.appendChild(makeChip(txt,i)));
    left.appendChild(pool);

    const actions = document.createElement('div'); actions.className='pa-actions';
    const btnCheck = document.createElement('button'); btnCheck.className='primary'; btnCheck.textContent='Kiểm tra';
    btnCheck.onclick = ()=>{
      const got = slots.map(s=> (s.querySelector('.pa-chip')?.textContent.trim() || ''));
      const correct = item.parts.join('|');
      const actual  = got.join('|');
      slots.forEach(s=> s.classList.remove('pa-ok','pa-warn'));
      if (actual===correct){
        slots.forEach(s=> s.classList.add('pa-ok'));
        try{ if (window.VoiceUI && VoiceUI.enabled) VoiceUI.say('Đúng rồi!'); }catch(_){}
      } else {
        slots.forEach((s,i)=>{
          const chip = s.querySelector('.pa-chip'); const ok = item.parts[i]||'';
          if (!chip || chip.textContent.trim()!==ok) s.classList.add('pa-warn');
        });
        try{ if (window.VoiceUI && VoiceUI.enabled) VoiceUI.say('Chưa đúng. Hãy thử lại.'); }catch(_){}
      }
    };
    const btnNext = document.createElement('button'); btnNext.className='ghost'; btnNext.textContent='Bài khác';
    btnNext.onclick = ()=>{
      const segs = getSegments().filter(x=>x.target!==item.target);
      const pick = segs.length? segs[Math.floor(Math.random()*segs.length)] : item;
      renderSegment(pick);
    };
    actions.append(btnCheck, btnNext);
    left.appendChild(actions);

    // Phải: hình minh hoạ (to và responsive)
    const right = document.createElement('div');
    const art = document.createElement('div'); art.className='pa-art';
    art.innerHTML = wordArtSVG(item.target);
    right.appendChild(art);

    grid.append(left, right);
    host.appendChild(card);
  }

  function init(){
    const host = document.getElementById(C.containerId); if (!host) return;
    const segs = getSegments();
    if (!segs.length){
      host.innerHTML = '<div class="pa-card"><div class="pa-title">Ghép âm/tiếng thành từ</div><div>Chưa có dữ liệu segment trong PA_ITEMS.</div></div>';
      return;
    }
    renderSegment(segs[Math.floor(Math.random()*segs.length)]);
  }

  window.PAModule = { init, renderSegment };

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
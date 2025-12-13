/* app/eval_boost.js
   Cải tiến đánh giá: mục tiêu sư phạm rõ ràng, tô màu thanh điệu nhất quán,
   TTS vi-VN + nghe chậm, Pacer/Spotlight/Echo cho Reading, consent bar,
   và tối ưu A11y/hiển thị dấu tiếng Việt.
*/
(function(){
  'use strict';

  // ========== 0) CSS & tone màu nhất quán + hiển thị dấu ==========
  const TONE_COLORS = {
    'ngang':'#374151', 'sắc':'#ef4444', 'huyền':'#3b82f6',
    'hỏi':'#f59e0b', 'ngã':'#8b5cf6', 'nặng':'#10b981'
  };
  const ACCENT_MAP = {
    'a': {ngang:'a', sắc:'á', huyền:'à', hỏi:'ả', ngã:'ã', nặng:'ạ'},
    'ă': {ngang:'ă', sắc:'ắ', huyền:'ằ', hỏi:'ẳ', ngã:'ẵ', nặng:'ặ'},
    'â': {ngang:'â', sắc:'ấ', huyền:'ầ', hỏi:'ẩ', ngã:'ẫ', nặng:'ậ'},
    'e': {ngang:'e', sắc:'é', huyền:'è', hỏi:'ẻ', ngã:'ẽ', nặng:'ẹ'},
    'ê': {ngang:'ê', sắc:'ế', huyền:'ề', hỏi:'ể', ngã:'ễ', nặng:'ệ'},
    'i': {ngang:'i', sắc:'í', huyền:'ì', hỏi:'ỉ', ngã:'ĩ', nặng:'ị'},
    'o': {ngang:'o', sắc:'ó', huyền:'ò', hỏi:'ỏ', ngã:'õ', nặng:'ọ'},
    'ô': {ngang:'ô', sắc:'ố', huyền:'ồ', hỏi:'ổ', ngã:'ỗ', nặng:'ộ'},
    'ơ': {ngang:'ơ', sắc:'ớ', huyền:'ờ', hỏi:'ở', ngã:'ỡ', nặng:'ợ'},
    'u': {ngang:'u', sắc:'ú', huyền:'ù', hỏi:'ủ', ngã:'ũ', nặng:'ụ'},
    'ư': {ngang:'ư', sắc:'ứ', huyền:'ừ', hỏi:'ử', ngã:'ữ', nặng:'ự'},
    'y': {ngang:'y', sắc:'ý', huyền:'ỳ', hỏi:'ỷ', ngã:'ỹ', nặng:'ỵ'}
  };
  const TONE_LOOKUP = (()=>{ const m={}; for(const [b,t] of Object.entries(ACCENT_MAP)){ for(const [tn,ch] of Object.entries(t)){ m[ch]=tn; } } return m; })();
  function detectTone(word){
    for (let ch of word||''){ if (TONE_LOOKUP[ch]) return TONE_LOOKUP[ch]; }
    return 'ngang';
  }
  function injectGlobalStyles(){
    if (document.getElementById('evalBoostCss')) return;
    const css = `
      html{ text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; font-synthesis: none; }
      .token.tone-ngang{ color:${TONE_COLORS['ngang']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .token.tone-sắc{ color:${TONE_COLORS['sắc']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .token.tone-huyền{ color:${TONE_COLORS['huyền']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .token.tone-hỏi{ color:${TONE_COLORS['hỏi']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .token.tone-ngã{ color:${TONE_COLORS['ngã']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .token.tone-nặng{ color:${TONE_COLORS['nặng']}; text-decoration: underline wavy; text-underline-offset:4px; text-decoration-thickness:2px; }
      .goalbar{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 0; }
      .goalbar .pill{ background:#fff; border:1px solid #e5e7eb; border-radius:999px; padding:4px 8px; font-size:12px; box-shadow:0 1px 2px rgba(0,0,0,.06); }
      /* Pacer highlight */
      .pacer-wrap{ position:relative; }
      .pacer-band{ position:absolute; left:0; right:0; height:1.7em; background:rgba(255, 247, 133, .33); border:1px dashed rgba(0,0,0,.15); border-radius:6px; pointer-events:none; transform: translateY(0); }
      .pacer-ctrl{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0 0; }
      /* Consent bar */
      .consent-bar{ position:fixed; inset:auto 10px 10px 10px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 6px 24px rgba(0,0,0,.12); border-radius:10px; padding:10px; z-index:9999; }
      .consent-bar .row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    `;
    const st=document.createElement('style'); st.id='evalBoostCss'; st.textContent=css; document.head.appendChild(st);
  }
  // toneClass(word) cho toàn app (Cards đã gọi)
  function toneClass(word){
    try{
      const t = detectTone((word||'').normalize('NFC'));
      const map = { 'ngang':'tone-ngang', 'sắc':'tone-sắc', 'huyền':'tone-huyền', 'hỏi':'tone-hỏi', 'ngã':'tone-ngã', 'nặng':'tone-nặng' };
      return map[t] || 'tone-ngang';
    }catch(_){ return 'tone-ngang'; }
  }
  window.toneClass = window.toneClass || toneClass;

  // ========== 1) TTS: ưu tiên vi-VN + nghe chậm ==========
  function ensureTTS(){
    // Bọc TTS.speak: chọn voice vi-VN nếu có
    if (!window.TTS){
      // fallback cực nhẹ
      window.TTS = {
        speak: (txt, rate=0.9)=>{
          try{
            const u = new SpeechSynthesisUtterance(txt);
            u.lang = 'vi-VN'; u.rate = rate;
            const vs = window.speechSynthesis.getVoices();
            const v = vs.find(v=> /vi|Vietnam/i.test(v.lang+v.name)) || vs[0];
            if (v) u.voice = v;
            speechSynthesis.speak(u);
          }catch(_){}
        }
      };
    } else {
      // Patch ưu tiên vi-VN nếu module gốc chưa chọn
      if (!TTS._boostPatched){
        const orig = TTS.speak.bind(TTS);
        TTS.speak = function(txt, rate){
          try{
            // nếu module gốc có pickVoice thì bỏ qua
            if (typeof TTS.pickVoice === 'function') return orig(txt, rate);
            const u = new SpeechSynthesisUtterance(txt);
            u.lang = 'vi-VN';
            u.rate = rate || (window.AppState?.learner?.ttsRate) || 0.9;
            const vs = window.speechSynthesis.getVoices();
            const v = vs.find(v=> /vi|Vietnam/i.test((v.lang||'')+(v.name||''))) || vs[0];
            if (v) u.voice = v;
            speechSynthesis.speak(u);
          }catch(_){
            try{ orig(txt, rate); }catch(__){}
          }
        };
        TTS._boostPatched = true;
      }
    }
  }
  const baseRate = ()=> (window.AppState?.learner?.ttsRate) || 0.9;
  const slowRate = ()=> Math.max(0.6, Math.min(0.75, baseRate() - 0.2));
  const reduceMotion = ()=> window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========== 2) Goal chips cho từng màn ==========
  function injectGoals(){
    const map = {
      'screen-pa': [
        '🎯 Nhận diện onset–vần', '🎵 6 thanh điệu', '🧩 Cặp tối thiểu', '🗣️ Nghe–ghép một thao tác'
      ],
      'screen-cards': [
        '🗓️ Ôn đúng lúc (SRS)', '🔖 Lọc theo tag (s/x, ch/tr, tone…)', '🐢 Nghe chậm khi khó', '🧠 Tự động hoá đơn vị tiếng'
      ],
      'screen-reading': [
        '⏱️ WCPM + % đúng', '🔎 Spotlight/Pacer', '🔁 Echo mẫu', '📝 Đánh dấu lỗi → hiểu bài'
      ],
      'screen-game': [
        '🎯 Theo mục tiêu (tone/tag)', '🔊 Nghe mẫu', '✨ Phản hồi tức thì'
      ]
    };
    Object.entries(map).forEach(([id, goals])=>{
      const sc = document.getElementById(id);
      if (!sc) return;
      // tránh chèn lặp
      if (sc.querySelector('.goalbar')) return;
      const hero = sc.querySelector('.hero .hero-content') || sc.querySelector('.section');
      if (!hero) return;
      const bar = document.createElement('div');
      bar.className='goalbar';
      bar.setAttribute('aria-label','Mục tiêu học tập của màn');
      bar.innerHTML = goals.map(g=> `<span class="pill">${g}</span>`).join('');
      hero.appendChild(bar);
    });
  }

  // ========== 3) Reading: Pacer + Echo ==========
  const Pacer = {
    enabled:false, speedLps:1.2, // lines per second
    band:null, raf:null, y:0, lastTs:0, host:null,
    setup(){
      const step2 = document.getElementById('readStep2'); if (!step2) return;
      const row = step2.querySelector('.row'); // hàng nút Start/Stop...
      if (!row || step2.querySelector('#pacerControls')) {
        // nếu đã có, chỉ đảm bảo wrap
        this.wrapPassage();
        return;
      }
      // Controls
      const ctl = document.createElement('div'); ctl.className='pacer-ctrl'; ctl.id='pacerControls';
      const btn = document.createElement('button'); btn.className='ghost'; btn.id='btnPacerToggle'; btn.textContent='👣 Pacer: Tắt';
      const lab = document.createElement('span'); lab.textContent='Tốc độ';
      const slider = document.createElement('input'); slider.type='range'; slider.min='0.5'; slider.max='3.0'; slider.step='0.1'; slider.value=String(this.speedLps);
      const echoBtn = document.createElement('button'); echoBtn.className='ghost'; echoBtn.id='btnEchoOne'; echoBtn.textContent='🔁 Echo 1 câu';
      btn.onclick = ()=>{ this.enabled = !this.enabled; btn.textContent = this.enabled? '👣 Pacer: Bật' : '👣 Pacer: Tắt'; if (this.enabled) this.start(); else this.stop(); };
      slider.oninput = ()=>{ this.speedLps = parseFloat(slider.value)||1.2; };
      echoBtn.onclick = ()=> Echo.playOne();
      row.parentElement.insertBefore(ctl, row.nextElementSibling);
      ctl.append(btn, lab, slider, echoBtn);
      // Hook start/stop từ nút đọc
      const btnStart = document.getElementById('btnStartRead');
      const btnStop  = document.getElementById('btnStopRead');
      btnStart && btnStart.addEventListener('click', ()=> { if (this.enabled) this.start(); });
      btnStop && btnStop.addEventListener('click', ()=> this.stop());
      this.wrapPassage();
    },
    wrapPassage(){
      const host = document.getElementById('passageText');
      if (!host) return;
      if (!host.classList.contains('pacer-wrap')){
        host.classList.add('pacer-wrap');
        const band = document.createElement('div'); band.className='pacer-band'; band.style.display='none';
        host.appendChild(band);
        this.band = band; this.host = host; this.y = 0; this.lastTs=0;
      }
    },
    start(){
      this.wrapPassage();
      if (!this.band) return;
      this.y = 0; this.lastTs = 0; this.band.style.display='';
      const lh = parseFloat(getComputedStyle(this.host).lineHeight)||28;
      const step = (ts)=>{
        if (!this.enabled) return;
        if (!this.lastTs) this.lastTs = ts;
        const dt = (ts - this.lastTs)/1000; // s
        this.lastTs = ts;
        const dy = this.speedLps * lh * dt; // px
        this.y += dy;
        const maxY = Math.max(0, this.host.scrollHeight - this.host.clientHeight);
        this.band.style.transform = `translateY(${this.y}px)`;
        // auto scroll theo band
        if (this.y > (this.host.scrollTop + this.host.clientHeight - lh*2)){
          this.host.scrollTop = Math.min(maxY, this.y - lh);
        }
        this.raf = requestAnimationFrame(step);
      };
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(step);
    },
    stop(){
      cancelAnimationFrame(this.raf); this.raf = null;
      if (this.band) this.band.style.display='none';
    }
  };

  const Echo = {
    // Phát mẫu 1 câu (câu đầu tiên hoặc câu đang trong tầm nhìn)
    playOne(){
      try{
        const host = document.getElementById('passageText'); if (!host) return;
        const txt = host.innerText || host.textContent || '';
        const sentences = txt.split(/([.!?…]|\\n)/).reduce((acc,cur,idx,arr)=>{
          if (idx%2===0){ const tail = (arr[idx+1]||''); acc.push((cur+tail).trim()); } return acc;
        },[]).filter(s=> s.length>0);
        const yTop = host.scrollTop, yBot = yTop + host.clientHeight;
        let pick = sentences[0] || '';
        // heuristic: câu có nhiều chữ và ở đầu viewport
        const firstVisible = host.querySelector('span, p') ? null : null; // giữ đơn giản: câu đầu
        // phát chậm, sau đó phát lại nhanh hơn chút
        TTS.speak(pick, Math.max(0.65, slowRate()));
        setTimeout(()=> TTS.speak(pick, Math.min(0.9, baseRate())), 900 + Math.min(1500, pick.length*12));
      }catch(_){}
    }
  };

  // ========== 4) Consent (Thông tin – Đồng thuận) ==========
  function showConsentOnce(){
    try{
      if (localStorage.getItem('consent_ok')==='1') return;
      const bar = document.createElement('div'); bar.className='consent-bar';
      bar.innerHTML = `
        <div class="row">
          <b>Thông tin – Đồng thuận:</b>
          <span class="muted">Ứng dụng ẩn danh; không tự gửi ghi âm/ảnh; đồng bộ chỉ khi bạn bật và cung cấp URL/SECRET.</span>
        </div>
        <div class="row" style="margin-top:6px;">
          <button class="primary" id="consentOk">Đồng ý</button>
          <button class="ghost" id="consentMore">Xem chi tiết</button>
          <div class="spacer"></div>
          <button class="ghost" id="consentClose">Đóng</button>
        </div>
      `;
      document.body.appendChild(bar);
      const rm = ()=> bar.remove();
      document.getElementById('consentOk').onclick = ()=> { localStorage.setItem('consent_ok','1'); rm(); };
      document.getElementById('consentClose').onclick = rm;
      document.getElementById('consentMore').onclick = ()=>{
        const msg = 'Mục đích: trải nghiệm 10–20 phút, sau đó nhận xét. Dữ liệu ẩn danh; có quyền xem/xoá trên thiết bị; đồng bộ chỉ khi bật (opt-in). Tham gia tự nguyện.';
        alert(msg);
      };
    }catch(_){}
  }

  // ========== 5) Khởi động ==========
  function init(){
    injectGlobalStyles();
    ensureTTS();
    injectGoals();
    Pacer.setup();
    showConsentOnce();

    // Nếu reduce motion: tắt rung/confetti toàn cục (nếu module Effects có)
    if (reduceMotion()){
      try{ window.Effects && (window.Effects.confetti = ()=>{}); }catch(_){}
      try{ window.navigator && navigator.vibrate && (navigator.vibrate = ()=>false); }catch(_){}
    }

    // Khi điều hướng màn → chèn goalbar lại (nếu SPA)
    const nav = window.App?.nav;
    if (typeof nav === 'function' && !App._navPatched){
      App._navPatched = true;
      const orig = nav.bind(App);
      App.nav = function(screen){
        const r = orig(screen);
        setTimeout(()=>{ injectGoals(); if (screen==='reading') Pacer.setup(); }, 60);
        return r;
      };
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
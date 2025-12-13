/* app/xplat_patch.js – Vá tương thích Web/Android/iOS */
(function(){
  'use strict';

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const isInApp = /FBAN|FBAV|FB_IAB|Line|Instagram|Zalo/i.test(navigator.userAgent);

  /* 0) CSS phụ: game canvas full-width trên mobile */
  (function injectCSS(){
    if (document.getElementById('xplatCss')) return;
    const css = `
      #gameCanvas{ width:100% !important; height:auto !important; display:block; max-width:100%; touch-action:manipulation; }
      .pa-chip, button, .ghost, .primary { touch-action: manipulation; } /* giảm delay click iOS */
      .inapp-banner{ position:fixed; left:8px; right:8px; bottom:calc(70px + env(safe-area-inset-bottom,0px)); z-index:1200; background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,.12); padding:10px 12px; display:none; }
    `;
    const st = document.createElement('style'); st.id='xplatCss'; st.textContent = css; document.head.appendChild(st);
  })();

  /* 1) TTS – ép vi-VN, chờ voices, “mồi” iOS sau chạm đầu tiên, nút kích hoạt nếu cần */
  (function ttsGate(){
    if (!('speechSynthesis' in window)) return;
    let voices = [], viVoice = null, primed = false;
    const gate = document.createElement('div');
    gate.className='inapp-banner';
    gate.id='soundGate';
    gate.innerHTML = `<button id="btnEnableSound" class="primary" style="min-height:40px">🔊 Kích hoạt âm thanh</button> <span style="margin-left:8px;color:#555">Chạm để bật tiếng</span>`;
    document.body.appendChild(gate);

    function pickVi(list){
      const vi = list.filter(v=> /vi|Vietnam/i.test((v.lang||'')+(v.name||'')));
      return vi.find(v=>/Hoai|Hieu|Vietnamese|Tiếng|Thanh|Linh/i.test(v.name||'')) || vi[0] || null;
    }
    function refreshVoices(){
      const v = speechSynthesis.getVoices() || [];
      if (v.length) voices = v;
      viVoice = pickVi(voices) || viVoice;
    }
    function prime(){
      if (primed) return; primed = true;
      const u = new SpeechSynthesisUtterance('Xin chào');
      u.lang = (viVoice && viVoice.lang) || 'vi-VN';
      if (viVoice) u.voice = viVoice;
      u.rate = (window.AppState?.learner?.ttsRate)||0.9;
      u.volume = 0; // “mồi” iOS
      try{ speechSynthesis.speak(u); }catch(_){}
      gate.style.display='none';
      localStorage.setItem('sound_ok','1');
      document.removeEventListener('touchstart', prime, true);
      document.removeEventListener('click', prime, true);
    }
    function showGateIfNeeded(){
      if (localStorage.getItem('sound_ok')==='1') return;
      gate.style.display = '';
    }
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
    let tries=0; const poll = setInterval(()=>{ refreshVoices(); if (++tries>12 || voices.length){ clearInterval(poll); showGateIfNeeded(); } }, 300);
    document.addEventListener('click', prime, true);
    document.addEventListener('touchstart', prime, true);
    gate.addEventListener('click', e=>{ if (e.target.id==='btnEnableSound') prime(); });

    // Patch TTS.speak → vi-VN
    function speakVI(text, rate){
      const u = new SpeechSynthesisUtterance(String(text||'')); 
      u.lang = (viVoice && viVoice.lang) || 'vi-VN'; if (viVoice) u.voice = viVoice;
      u.rate = rate || (window.AppState?.learner?.ttsRate)||0.9;
      speechSynthesis.speak(u);
    }
    window.TTS = window.TTS || {};
    const orig = window.TTS.speak?.bind(window.TTS);
    window.TTS.speak = (t,r)=> { try{ speakVI(t,r); }catch(_){ try{ orig && orig(t,r); }catch(__){} } };

    // Hủy phát khi chuyển nền
    document.addEventListener('visibilitychange', ()=>{ if (document.hidden) try{ speechSynthesis.cancel(); }catch(_){}} );
  })();

  /* 2) Recorder – phát hiện hỗ trợ và làm mềm hành vi */
  (function recorderSupport(){
    const recBtn = document.getElementById('btnRec');
    const ok = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!recBtn) return;
    if (!ok){
      recBtn.disabled = true;
      recBtn.title = 'Thiết bị không hỗ trợ ghi âm trên trình duyệt này';
      return;
    }
    // iOS cần yêu cầu gọn nhẹ và chỉ khi người dùng bấm
    recBtn.addEventListener('click', ()=> {
      // chỉ test quyền một lần
      if (localStorage.getItem('rec_perm_checked')==='1') return;
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true } })
        .then(stream=>{ stream.getTracks().forEach(t=>t.stop()); localStorage.setItem('rec_perm_checked','1'); })
        .catch(()=>{ /* nếu từ chối, để module recorder.js xử lý tiếp */ });
    }, { once:true });
  })();

  /* 3) Game canvas – co giãn theo màn hình + DPR */
  (function fitCanvas(){
    const canvas = document.getElementById('gameCanvas'); if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    function resize(){
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const cssW = Math.min(canvas.parentElement.clientWidth || window.innerWidth, 10000);
      // tỉ lệ mặc định 900x420 ~ 2.14
      const ratio = 420/900;
      const cssH = Math.round(cssW * ratio);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width  = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      if (ctx && ctx.setTransform) ctx.setTransform(dpr,0,0,dpr,0,0);
      // Nếu module game có hàm redraw/resize thì gọi
      try{
        if (window.Game && typeof Game.resize === 'function') Game.resize(canvas.width, canvas.height, dpr);
        else if (window.App && App.modules?.game?.resize) App.modules.game.resize();
      }catch(_){}
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', ()=> setTimeout(resize, 200));
    setTimeout(resize, 50);
  })();

  /* 4) Pointer/touch – ưu tiên pointer events và tránh lặp click+touch */
  (function dedupeVoice(){
    const last = { t:0, txt:'' }, gap = 1200;
    function isDup(text){ const now=Date.now(); if(text && text===last.txt && (now-last.t)<gap){ return true; } last.txt=text||''; last.t=now; return false; }
    if (window.VoiceUI){
      const orig = VoiceUI.say ? VoiceUI.say.bind(VoiceUI) : null;
      VoiceUI.say = function(text){ if(!text || isDup(text)) return; try{ orig? orig(text) : (window.TTS && TTS.speak && TTS.speak(text)); }catch(_){ } };
    }
    document.addEventListener('click', e=>{
      const el = e.target.closest('[data-voice]'); if (!el) return;
      const msg = el.getAttribute('data-voice'); if (!msg || isDup(msg)) e.stopPropagation();
    }, true);
  })();

  /* 5) Cảnh báo in‑app browser (Zalo/Facebook…) */
  (function inAppBanner(){
    if (!isInApp) return;
    const bn = document.querySelector('.inapp-banner');
    if (!bn) return;
    bn.style.display = '';
    bn.innerHTML = `<span>Trình duyệt trong ứng dụng có thể chặn âm thanh. Hãy mở bằng <b>Safari/Chrome</b> để có trải nghiệm tốt nhất.</span>`;
    setTimeout(()=> bn.remove(), 7000);
  })();
})();
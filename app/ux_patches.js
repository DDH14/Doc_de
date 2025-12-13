/* app/ux_patches.js
   - Khử lặp TTS/Voice (giảm nói lặp gây phân tâm).
   - Tự ẩn footer khi cuộn + chèn khoảng đệm để không che nội dung.
   - Ẩn banner cố định khi đã chấp thuận; thêm "Tập trung" ẩn Header/Footer nhanh.
   - Ảnh trong modal/Help luôn vừa khung, không mất góc.
*/
(function(){
  'use strict';

  /* ===================== 1) TTS: CHỐNG LẶP ===================== */
  const CFG = {
    dedupeMs: 1500,      // cùng nội dung trong ~1.5s thì bỏ qua
    throttleMs: 900,     // nói cách nhau < 0.9s thì bỏ qua
    cancelBeforeSpeak: true // hủy phát cũ trước khi phát mới
  };
  let lastSpeakAt = 0;
  let lastTextNorm = '';

  const norm = s => String(s||'').trim().replace(/\s+/g,' ').toLowerCase();

  // Hàm gọi phát có bộ lọc chống lặp
  function guardedSpeak(exec, text, rate, opts={}){
    const now = Date.now();
    const n = norm(text);
    if (!opts.force){
      if (n && n===lastTextNorm && (now-lastSpeakAt)<CFG.dedupeMs) return;     // trùng nội dung gần
      if ((now-lastSpeakAt)<CFG.throttleMs) return;                              // quá sát
    }
    if (CFG.cancelBeforeSpeak && 'speechSynthesis' in window){
      try{ window.speechSynthesis.cancel(); }catch(_){}
    }
    try{ exec(text, rate); }catch(_){}
    lastSpeakAt = now; lastTextNorm = n;
  }

  // Bọc tất cả điểm vào TTS/App/VoiceUI
  const fallSpeak = (txt, rate)=>{
    try{
      const u = new SpeechSynthesisUtterance(String(txt||'')); 
      u.lang = 'vi-VN'; u.rate = rate || (window.AppState?.learner?.ttsRate) || 0.9;
      speechSynthesis.speak(u);
    }catch(_){}
  };

  // TTS.speak
  if (!window.TTS) window.TTS = { speak: (t,r)=> guardedSpeak(fallSpeak, t, r) };
  else {
    const orig = window.TTS.speak ? window.TTS.speak.bind(window.TTS) : fallSpeak;
    window.TTS.speak = (t,r,opts)=> guardedSpeak(orig, t, r, opts||{});
  }

  // App.speak
  window.App = window.App || {};
  const appOrigSpeak = window.App.speak ? window.App.speak.bind(window.App) : (t)=>window.TTS.speak(t);
  window.App.speak = (t,r,opts)=> guardedSpeak(appOrigSpeak, t, r, opts||{});

  // VoiceUI.say
  if (window.VoiceUI){
    const vu = window.VoiceUI.say ? window.VoiceUI.say.bind(window.VoiceUI) : (t)=>window.TTS.speak(t);
    window.VoiceUI.say = (t,r,opts)=> guardedSpeak(vu, t, r, opts||{});
  }

  // API: chỉ nói 1 lần/theo id trong 15s (dùng cho thông báo hiếm)
  window.SpeakOnce = function(id, text, rate){
    try{
      const key = 'speak_once_' + id;
      const last = +localStorage.getItem(key) || 0;
      const now = Date.now();
      if (now - last < 15000) return;
      localStorage.setItem(key, String(now));
      window.TTS.speak(text, rate, { force:true });
    }catch(_){}
  };

  /* ===================== 2) FOOTERBAR: TỰ ẨN + KHÔNG CHE ===================== */
  function injectFooterCss(){
    if (document.getElementById('uxFooterCss')) return;
    const css = `
      :root{ --footer-h: 56px; }
      .app{ padding-bottom: calc(var(--footer-h,56px) + env(safe-area-inset-bottom)); }
      .footerbar{
        position: sticky; bottom: 0; z-index: 999;
        background: rgba(255,250,240,.92); backdrop-filter: saturate(1.2) blur(8px);
        border-top: 1px solid rgba(0,0,0,.06);
        transform: translateY(0); transition: transform .22s ease, opacity .22s ease;
      }
      .footerbar.hide{ transform: translateY(calc(100% + env(safe-area-inset-bottom))); opacity:.9; }
    `;
    const st = document.createElement('style'); st.id='uxFooterCss'; st.textContent = css;
    document.head.appendChild(st);
  }
  function measureFooter(){
    const fb = document.querySelector('.footerbar'); if (!fb) return;
    const h = Math.round(fb.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--footer-h', h + 'px');
  }
  function setupFooterAutoHide(){
    const fb = document.querySelector('.footerbar'); if (!fb) return;
    injectFooterCss(); measureFooter();
    let last = window.scrollY;
    window.addEventListener('resize', measureFooter);
    window.addEventListener('scroll', ()=>{
      const y = window.scrollY;
      const down = y > last + 6;
      const up   = y < last - 6;
      last = y;
      if (down && y > 24) fb.classList.add('hide');
      else if (up) fb.classList.remove('hide');
    }, { passive:true });
  }

  /* ===================== 3) FOCUS MODE: Ẩn Header/Footer khi cần ===================== */
  function setupFocusMode(){
    if (document.getElementById('btnFocusMode')) return;
    const bar = document.querySelector('.a11ybar'); if (!bar) return;
    const btn = document.createElement('button');
    btn.id='btnFocusMode'; btn.className='ghost'; btn.textContent='🧘 Tập trung: Tắt';
    btn.setAttribute('data-voice','Bật hoặc tắt chế độ tập trung');
    btn.onclick = ()=>{
      const on = document.body.classList.toggle('focus-mode');
      btn.textContent = on ? '🧘 Tập trung: Bật' : '🧘 Tập trung: Tắt';
      SpeakOnce('focus', on ? 'Đã bật chế độ tập trung' : 'Đã tắt chế độ tập trung');
    };
    bar.appendChild(btn);

    // CSS cho focus-mode
    if (!document.getElementById('focusModeCss')){
      const st = document.createElement('style'); st.id='focusModeCss';
      st.textContent = `
        body.focus-mode .appbar, body.focus-mode .footerbar, body.focus-mode #lockbar{ display:none !important; }
        body.focus-mode .app{ padding-bottom: 12px !important; }
      `;
      document.head.appendChild(st);
    }
  }

  /* ===================== 4) ẢNH HƯỚNG DẪN VỪA KHUNG + Ẩn banner cố định ===================== */
  function injectHelpImageCss(){
    if (document.getElementById('helpImgCss')) return;
    const st = document.createElement('style'); st.id='helpImgCss';
    st.textContent = `
      .modal .dialog img, .help img, .help-step img, .hero .hero-art img, .hero .hero-art svg{
        max-width:100%; height:auto; display:block; object-fit:contain;
      }
      @media (max-width:700px){ .help-steps{ display:block !important; } .help-step{ margin-bottom:10px; } }
    `;
    document.head.appendChild(st);
  }
  // Nếu đã chấp thuận thì không hiển thị thanh “consent” tự tạo (nếu có)
  function hideConsentIfAgreed(){
    try{
      if (localStorage.getItem('consent_ok')==='1'){
        const bar = document.querySelector('.consent-bar'); if (bar) bar.remove();
      }
    }catch(_){}
  }

  /* ===================== INIT ===================== */
  function init(){
    // chống lặp TTS đã cài ở trên
    injectHelpImageCss();
    setupFooterAutoHide();
    setupFocusMode();
    hideConsentIfAgreed();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
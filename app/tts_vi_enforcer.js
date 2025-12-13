/* app/tts_vi_enforcer.js
   - Ép TTS dùng tiếng Việt (vi-VN), đợi voices sẵn sàng rồi mới speak.
   - Patch TTS.speak, App.speak, VoiceUI.say.
   - Làm ảnh trong Hướng dẫn/Modal vừa khung, không bị cắt góc.
*/
(function(){
  'use strict';

  if (!('speechSynthesis' in window)) {
    // Không có Web Speech API; giữ nguyên để không lỗi.
    return;
  }

  // ========== Voice tiếng Việt ==========
  let voices = [];
  let viVoice = null;
  let ready = false;
  const waiters = [];

  function pickViVoice(list){
    if (!list || !list.length) return null;
    // Ưu tiên theo tên thông dụng
    const preferName = [
      /Hoai\s*My/i, /Hieu/i,                      // Microsoft
      /Ti(e|ê)ng\s*Vi(e|ê)t/i, /Vietnamese/i,     // Google
      /Thanh|Linh/i                               // Apple/Siri (ví dụ VN)
    ];
    const viList = list.filter(v => /vi|Vietnam/i.test((v.lang||'')+(v.name||'')));
    for (const rx of preferName){
      const f = viList.find(v => rx.test(v.name||'')); if (f) return f;
    }
    return viList[0] || null;
  }

  function refreshVoices(){
    const v = window.speechSynthesis.getVoices() || [];
    if (v.length) voices = v;
    const pick = pickViVoice(voices);
    if (pick) viVoice = pick;
    if (voices.length && !ready){
      ready = true;
      // chạy các speak đang chờ
      while (waiters.length){ try{ waiters.shift()(); }catch(_){} }
    }
  }

  function onReady(fn){
    if (ready) fn(); else waiters.push(fn);
  }

  // Safari iOS cần kích hoạt voice sau 1 thao tác chạm
  function primeIOS(){
    const once = () => {
      document.removeEventListener('click', once, true);
      document.removeEventListener('touchstart', once, true);
      try{
        const u = new SpeechSynthesisUtterance('Xin chào');
        if (viVoice) { u.voice = viVoice; u.lang = viVoice.lang || 'vi-VN'; }
        else { u.lang = 'vi-VN'; }
        u.volume = 0; u.rate = 0.8; // câm để chỉ khởi động engine
        speechSynthesis.speak(u);
      }catch(_){}
    };
    document.addEventListener('click', once, true);
    document.addEventListener('touchstart', once, true);
  }

  // Đăng ký nhận voices; một số trình duyệt không bắn sự kiện → fallback poll
  window.speechSynthesis.onvoiceschanged = refreshVoices;
  let tries = 0;
  const poll = setInterval(()=>{
    tries++; refreshVoices();
    if (ready || tries > 12) clearInterval(poll);
  }, 300);
  refreshVoices();
  primeIOS();

  // ========== speak tiếng Việt thống nhất ==========
  function baseRate(){ return (window.AppState?.learner?.ttsRate) || 0.9; }

  function speakVi(text, rate){
    const exec = ()=>{
      try{
        const u = new SpeechSynthesisUtterance(String(text || ''));
        // Luôn đặt vi-VN; nếu có voice Việt thì gán
        u.lang = (viVoice && viVoice.lang) || 'vi-VN';
        if (viVoice) u.voice = viVoice;
        u.rate = rate || baseRate();
        speechSynthesis.speak(u);
      }catch(_){}
    };
    onReady(exec);
  }

  // Patch TTS
  if (!window.TTS) { window.TTS = { speak: speakVi }; }
  else {
    window.TTS._origSpeak = window.TTS.speak?.bind(window.TTS);
    window.TTS.speak = function(text, rate){ speakVi(text, rate); };
  }

  // Patch App.speak
  window.App = window.App || {};
  window.App._origSpeak = window.App.speak?.bind(window.App);
  window.App.speak = function(text){ speakVi(text, baseRate()); };

  // Patch VoiceUI.say nếu có
  if (window.VoiceUI){
    window.VoiceUI._origSay = window.VoiceUI.say?.bind(window.VoiceUI);
    window.VoiceUI.say = function(text){ speakVi(text, baseRate()); };
  }

  // API phụ: chọn voice Việt thủ công nếu muốn
  window.TTS_VI = {
    list: ()=> (speechSynthesis.getVoices()||[]).map(v=> ({name:v.name, lang:v.lang})),
    pickBy: (matcher)=>{
      const vs = speechSynthesis.getVoices()||[];
      const v = vs.find(x => typeof matcher==='string' ? (x.name||'').includes(matcher) : matcher.test(x.name||''));
      if (v){ viVoice = v; return true; }
      return false;
    },
    current: ()=> viVoice
  };

  // ========== Ảnh Hướng dẫn/Modal vừa khung ==========
  const css = `
    /* Ảnh trong modal/Help luôn vừa khung, không cắt góc */
    .modal .dialog img,
    .help img,
    .help-illustration,
    .help-step img,
    .hero .hero-art img,
    .hero .hero-art svg {
      max-width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }
    /* Hướng dẫn: 2 cột → 1 cột trên màn nhỏ để tránh tràn */
    @media (max-width: 700px){
      .help-steps{ display:block !important; }
      .help-step{ margin-bottom:10px; }
    }
  `;
  const st = document.createElement('style');
  st.id = 'ttsViEnforcerCss';
  st.textContent = css;
  document.head.appendChild(st);
})();
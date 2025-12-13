/* MODULE: VISUALS – Image-Assist cho trẻ dyslexia
   - Chèn biểu tượng/đồ hoạ SVG nội tuyến (không dùng URL ngoài).
   - Tăng định hướng thị giác ở Trang chủ, Stepper Luyện đọc, Đánh giá nhanh, Thẻ từ, Trò chơi, Dashboard.
   - Tự động chạy sau DOMContentLoaded; có thể bật/tắt bằng window.Visuals.enabled (mặc định true). */
(function(){
  const Visuals = {
    enabled: true,

    init(){
      if (!this.enabled) return;
      this.injectStyle();
      // chạy sau khi DOM sẵn, và thêm “re-run” khi điều hướng màn
      document.addEventListener('DOMContentLoaded', ()=> this.refresh());
      // Thử re-run vài lần sau load để đảm bảo các module khác đã render
      setTimeout(()=>this.refresh(), 300);
      setTimeout(()=>this.refresh(), 800);
      // Hook nhẹ vào App.nav nếu có
      if (window.App && typeof App.nav==='function' && !App._visualsWrapped){
        const origNav = App.nav.bind(App);
        App.nav = (id)=>{ const ok = origNav(id); try{ Visuals.refresh(); }catch(_){ } return ok; };
        App._visualsWrapped = true;
      }
    },

    refresh(){
      try {
        this.enhanceHome();
        this.enhanceReadingStepper();
        this.enhanceAssess();
        this.enhanceButtons();
        this.enhanceCards();
        this.enhanceGame();
        this.enhanceDashboard();
      }catch(e){ console.warn('[Visuals] refresh err', e); }
    },

    /* ========== CSS ========== */
    injectStyle(){
      if (document.getElementById('visualsCSS')) return;
      const css = `
        /* Khối hero minh hoạ */
        .vis-hero { display:flex; gap:10px; align-items:center; margin:4px 0 2px; }
        .vis-hero .vis-ic { width:28px; height:28px; flex:0 0 28px; }
        .vis-hero .vis-caption { font-weight:600; color:#1a1a1a; }
        /* Trang chủ: ảnh trong card */
        .card .vis-cardpic { margin:6px 0 0; display:flex; gap:6px; align-items:center; }
        .vis-cardpic .vis-ic { width:38px; height:38px; }
        /* Stepper: icon trước nhãn */
        .stepper .step .vis-ic { width:18px; height:18px; vertical-align:middle; margin-right:6px; }
        /* Nút có icon */
        .icon-btn .vis-ic { width:18px; height:18px; vertical-align:middle; margin-right:6px; }
        /* Assess: icon trước tiêu đề */
        .section.lift > h3 .vis-ic { width:22px; height:22px; vertical-align:middle; margin-right:6px; }
        /* Tag chip (nếu có) */
        .vis-chip { display:inline-flex; gap:6px; align-items:center; padding:4px 8px; border:1px solid #eee; border-radius:999px; background:#fff; }
        .vis-chip .vis-ic { width:16px; height:16px; }
        /* Ưu tiên tương phản cho chế độ dễ đọc */
        body.dys .vis-hero .vis-caption { letter-spacing:0.02em; }
        @media (prefers-reduced-motion: reduce){ .vis-hero, .vis-cardpic { transition:none !important; } }
      `;
      const st = document.createElement('style');
      st.id='visualsCSS'; st.textContent = css;
      document.head.appendChild(st);
    },

    /* ========== SVG icons (nội tuyến) ========== */
    ic(name, color='#111'){
      const wrap = (p)=> {
        const span = document.createElement('span'); span.className='vis-ic'; span.innerHTML = p; return span;
      };
      const svg = (d, vb='0 0 24 24')=> `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
      switch(name){
        case 'book': return wrap(svg(`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v13M4 19.5c0 1.1.9 2 2 2h14"/>`));
        case 'ear': return wrap(svg(`<path d="M6 8a6 6 0 0 1 12 0c0 4-2 6-3 7s-1 3-4 3a3 3 0 0 1-3-3"/>`));
        case 'mic': return wrap(svg(`<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M12 17v5M8 22h8M5 10v2a7 7 0 0 0 14 0v-2"/>`));
        case 'clock': return wrap(svg(`<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>`));
        case 'puzzle': return wrap(svg(`<path d="M10 3a2 2 0 1 1 4 0v2h2a2 2 0 0 1 2 2v1h-2a2 2 0 1 0 0 4h2v1a2 2 0 0 1-2 2h-2v2a2 2 0 1 1-4 0v-2H8a2 2 0 0 1-2-2v-1h2a2 2 0 1 0 0-4H6V7a2 2 0 0 1 2-2h2z"/>`));
        case 'eye': return wrap(svg(`<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>`));
        case 'brain': return wrap(svg(`<path d="M8 3a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5v1a3 3 0 0 0 4 3v-1a3 3 0 0 0 2 0v1a3 3 0 0 0 4-3v-1a3 3 0 0 0 1-5V6a3 3 0 0 0-3-3 3 3 0 0 0-2 1 3 3 0 0 0-2-1z"/>`));
        case 'star': return wrap(svg(`<path d="m12 2 2.9 5.9 6.5.9-4.7 4.5 1.1 6.4L12 17l-5.8 3.1 1.1-6.4-4.7-4.5 6.5-.9L12 2z"/>`));
        case 'cards': return wrap(svg(`<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M7 4V2h14v14h-2"/>`));
        case 'game': return wrap(svg(`<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M8 12h2M6 12h.01M16 10v4"/>`));
        case 'chart': return wrap(svg(`<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>`));
        case 'headset': return wrap(svg(`<path d="M4 12a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3h-1v-8h4"/><path d="M4 17a3 3 0 0 0 3 3h1v-8H4"/>`));
        default: return wrap(svg(`<circle cx="12" cy="12" r="9"/>`));
      }
    },

    /* ========== Tăng ảnh Trang chủ ========== */
    enhanceHome(){
      const home = document.getElementById('screen-home');
      if (!home) return;
      const cards = home.querySelectorAll('.card.lift');
      cards.forEach(card=>{
        if (card.querySelector('.vis-cardpic')) return;
        const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
        let ic = 'star';
        if (title.includes('đánh giá')) ic = 'headset';
        else if (title.includes('âm vị')) ic = 'puzzle';
        else if (title.includes('thẻ từ')) ic = 'cards';
        else if (title.includes('đọc')) ic = 'book';
        else if (title.includes('trò chơi')) ic = 'game';
        else if (title.includes('dashboard')) ic = 'chart';
        const box = document.createElement('div'); box.className='vis-cardpic';
        box.appendChild(this.ic(ic, '#222'));
        const cp = document.createElement('div'); cp.className='vis-caption'; cp.textContent = 'Hình minh hoạ';
        box.appendChild(cp);
        const note = card.querySelector('.note');
        if (note) note.insertAdjacentElement('beforebegin', box); else card.appendChild(box);
      });
    },

    /* ========== Stepper Luyện đọc ========== */
    enhanceReadingStepper(){
      const st = document.getElementById('readSteps'); if (!st) return;
      const steps = st.querySelectorAll('.step');
      steps.forEach(s=>{
        if (s.querySelector('.vis-ic')) return;
        const txt = (s.textContent||'').toLowerCase();
        let ic = 'book';
        if (txt.includes('chọn')) ic='eye';
        else if (txt.includes('đọc')) ic='mic';
        else if (txt.includes('đánh dấu')) ic='puzzle';
        else if (txt.includes('câu hỏi')) ic='headset';
        else if (txt.includes('kết quả')) ic='chart';
        s.insertBefore(this.ic(ic, '#333'), s.firstChild);
      });
    },

    /* ========== Đánh giá nhanh ========== */
    enhanceAssess(){
      const as = document.getElementById('screen-assess'); if (!as) return;
      const secs = as.querySelectorAll('.section.lift > h3');
      secs.forEach(h=>{
        if (h.querySelector('.vis-ic')) return;
        const txt = (h.textContent||'').toLowerCase();
        let ic = 'puzzle';
        if (txt.includes('ran')) ic='clock';
        else if (txt.includes('sight')) ic='eye';
        else if (txt.includes('decoding')) ic='brain';
        h.insertBefore(this.ic(ic, '#222'), h.firstChild);
      });
    },

    /* ========== Nút có icon ========== */
    enhanceButtons(){
      const btns = document.querySelectorAll('button.primary, button.ghost, button.tts, button.record, button.danger');
      btns.forEach(b=>{
        // đã có emoji? bỏ qua
        if (/[🔊🎯🗣️⏱️🔦👟🏆❤️⬅️→←→]/u.test(b.textContent||'')) return;
        // đã có icon?
        if (b.classList.contains('icon-btn') || b.querySelector('.vis-ic')) return;
        let ic='star';
        const t = (b.textContent||'').toLowerCase();
        if (t.includes('bắt đầu')) ic='clock';
        else if (t.includes('kết thúc')||t.includes('xong')) ic='clock';
        else if (t.includes('nghe')||t.includes('tts')) ic='ear';
        else if (t.includes('ghi âm')||t.includes('record')) ic='mic';
        else if (t.includes('đọc')) ic='book';
        else if (t.includes('dashboard')||t.includes('kết quả')||t.includes('xem')) ic='chart';
        else if (t.includes('đánh giá')) ic='headset';
        b.classList.add('icon-btn');
        b.insertBefore(this.ic(ic, '#333'), b.firstChild);
      });
    },

    /* ========== Thẻ từ / chip minh hoạ ========== */
    enhanceCards(){
      const cardsScreen = document.getElementById('screen-cards'); if (!cardsScreen) return;
      // nếu có chip chủ đề (select), gợi ý icon ở nhãn
      const lab = cardsScreen.querySelector('label[for="selCardTag"]');
      if (lab && !lab.querySelector('.vis-ic')){
        lab.insertBefore(this.ic('cards', '#444'), lab.firstChild);
      }
      // minh hoạ nhẹ cho vùng container (nếu có)
      const cont = document.getElementById('cards-container');
      if (cont && !cont.querySelector('.vis-hero')){
        const vh = document.createElement('div'); vh.className='vis-hero'; 
        vh.appendChild(this.ic('puzzle', '#444'));
        const cap = document.createElement('div'); cap.className='vis-caption'; cap.textContent='Ôn theo hình ảnh: mỗi thẻ là 1 mảnh ghép kiến thức.';
        vh.appendChild(cap);
        cont.insertAdjacentElement('afterbegin', vh);
      }
    },

    /* ========== Trò chơi ========== */
    enhanceGame(){
      const gm = document.getElementById('screen-game'); if (!gm) return;
      const title = gm.querySelector('.badge'); 
      if (title && !title.querySelector('.vis-ic')){
        title.insertBefore(this.ic('game', '#333'), title.firstChild);
      }
    },

    /* ========== Dashboard ========== */
    enhanceDashboard(){
      const db = document.getElementById('screen-dashboard'); if (!db) return;
      const heads = db.querySelectorAll('h3');
      heads.forEach(h=>{
        if (h.querySelector('.vis-ic')) return;
        const txt = (h.textContent||'').toLowerCase();
        let ic='chart';
        if (txt.includes('wcpm')) ic='clock';
        else if (txt.includes('% chính xác')) ic='star';
        else if (txt.includes('lỗi')) ic='puzzle';
        else if (txt.includes('thời lượng')) ic='book';
        else if (txt.includes('ran')) ic='clock';
        else if (txt.includes('pa')) ic='puzzle';
        else if (txt.includes('decoding')) ic='brain';
        else if (txt.includes('sight')) ic='eye';
        h.insertBefore(this.ic(ic, '#333'), h.firstChild);
      });
    }
  };
  window.Visuals = Visuals;
  Visuals.init();
})();
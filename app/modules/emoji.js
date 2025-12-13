/* MODULE: EMOJI – Trang trí giao diện bằng emoji theo heuristic (bản vá an toàn).
   - Chỉ trang trí khu vực màn đang active để tránh nặng UI.
   - Pointer-events: none cho emoji để không chặn click.
   - Throttle MutationObserver để tránh spam.
   - Không dùng optional chaining (?.) để tương thích trình duyệt cũ. */
window.Emoji = {
  // Từ khóa → emoji
  dict: (function(){
    const m = new Map();
    const add = (words, e)=> words.forEach(w=> m.set(w, e));
    // Người
    add(['bé','em','bạn','trẻ'],'🧒'); add(['mẹ','má'],'👩‍🦰'); add(['bố','ba'],'👨‍🦱'); add(['ông'],'👴'); add(['bà'],'👵');
    // Động vật
    add(['cá'],'🐟'); add(['mèo'],'🐱'); add(['chó'],'🐶'); add(['chim'],'🐦'); add(['trâu'],'🐃'); add(['châu'],'🐮');
    // Thiên nhiên – thời tiết
    add(['mưa'],'🌧️'); add(['nắng'],'☀️'); add(['mây'],'☁️'); add(['gió'],'💨'); add(['sông'],'🏞️'); add(['biển'],'🌊'); add(['núi'],'⛰️');
    add(['trăng'],'🌙'); add(['sao'],'⭐');
    // Đồ vật – lớp học
    add(['bàn'],'🛋️'); add(['ghế'],'🪑'); add(['bút'],'✏️'); add(['vở','sách'],'📘'); add(['thước'],'📏'); add(['cửa'],'🚪'); add(['nhà'],'🏠');
    // Hoạt động
    add(['đi'],'🚶'); add(['chạy'],'🏃'); add(['nhảy'],'🤸'); add(['chơi'],'🎲'); add(['ăn'],'🍽️'); add(['uống'],'🥤'); add(['ngủ'],'😴'); add(['đọc'],'📖'); add(['viết'],'✍️');
    // Cây cối – vườn
    add(['cây'],'🌳'); add(['lá'],'🍃'); add(['hoa'],'🌸'); add(['vườn'],'🌿');
    // Khó chính tả / nhóm lỗi
    add(['sương','sáo','sẻ','sông'],'🌀'); add(['xương','xáo','xẻ'],'🧭');
    add(['chanh','chai'],'🍋'); add(['tranh','trẻ','trời','trôi'],'🧩');
    add(['nghỉ','nghệ'],'🪵'); add(['ghế','ghé','ghen'],'🧱');
    add(['quê','quà','quạt','quên','quý','lúa'],'🌾');
    // Khác
    add(['đường'],'🛣️'); add(['trứng'],'🥚'); add(['kẹo'],'🍬'); add(['giấy'],'📄'); add(['sữa'],'🥛'); add(['bữa'],'🍲'); add(['cối'],'🧱');
    return m;
  })(),

  iconForWord(wRaw){
    var w = String(wRaw||'').toLowerCase();
    if (!w) return '';
    var base = w.replace(/[.,!?;:"“”()…]/g,'').replace(/[0-9]/g,'').trim();
    if (this.dict.has(base)) return this.dict.get(base);
    // Heuristic nhẹ
    if (/m(ưa|ưa)/.test(base)) return '🌧️';
    if (/n(ă|a)ng/.test(base)) return '☀️';
    if (/bi(e|ê)n/.test(base)) return '🌊';
    if (/núi|doi/.test(base)) return '⛰️';
    if (/hoa|bông/.test(base)) return '🌸';
    if (/lá/.test(base)) return '🍃';
    if (/c(ử|u)a/.test(base)) return '🚪';
    if (/nh(à|a)/.test(base)) return '🏠';
    if (/b(ú|u)t|vi(ế|e) t/.test(base)) return '✏️';
    if (/v(ơ|o)̉|s(á|a)ch/.test(base)) return '📘';
    if (/ch(ơ|o)i/.test(base)) return '🎲';
    return '';
  },

  iconsForText(text){
    var tokens = String(text||'').split(/\s+/).filter(Boolean);
    var cnt = {};
    for (var i=0;i<tokens.length;i++){
      var e = this.iconForWord(tokens[i]);
      if (!e) continue;
      cnt[e] = (cnt[e]||0)+1;
    }
    var arr = Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]; }).slice(0,3);
    if (!arr.length) return ['📖','🙂'];
    return arr;
  },

  // Chỉ trang trí khi màn active tương ứng
  decorateActive(){
    try{
      var active = document.querySelector('.screen.active');
      if (!active) return;
      if (active.id === 'screen-reading') this.decorateReading();
      else if (active.id === 'screen-cards') this.decorateCards();
      // có thể trang trí Home nhẹ nếu muốn, ở đây bỏ qua
    }catch(e){ /* noop */ }
  },

  decorateReading(){
    try{
      var b2 = document.getElementById('readStep2');
      if (b2 && b2.style.display !== 'none'){
        var headerId = 'emojiHeader';
        var header = document.getElementById(headerId);
        if (!header){
          header = document.createElement('div');
          header.id = headerId;
          header.className = 'emoji-header';
          header.setAttribute('aria-hidden','true');
          var row = b2.querySelector('.row');
          if (row && row.parentElement) row.parentElement.insertBefore(header, row.nextSibling);
          else b2.insertBefore(header, b2.firstChild);
        }
        var pt = document.getElementById('passageText');
        var txt = pt ? (pt.textContent||'') : '';
        var arr = this.iconsForText(txt);
        header.textContent = arr.join('  ');
      }

      // B2: #passageText .reading-line span
      var toks2 = document.querySelectorAll('#passageText .reading-line span');
      for (var i=0;i<toks2.length;i++){
        var sp = toks2[i];
        if (!sp || sp.dataset.emojified==='1') continue;
        var e2 = this.iconForWord(sp.textContent||'');
        if (e2){
          var em2 = document.createElement('sup');
          em2.className = 'tok-emoji';
          em2.setAttribute('aria-hidden','true');
          em2.textContent = e2;
          sp.appendChild(document.createTextNode(' '));
          sp.appendChild(em2);
        }
        sp.dataset.emojified='1';
      }

      // B3: #passageView .token
      var toks3 = document.querySelectorAll('#passageView .token');
      for (var j=0;j<toks3.length;j++){
        var sp3 = toks3[j];
        if (!sp3 || sp3.dataset.emojified==='1') continue;
        var w = (sp3.textContent||'').trim();
        var e3 = this.iconForWord(w);
        if (e3){
          var em3 = document.createElement('span');
          em3.className = 'tok-emoji';
          em3.setAttribute('aria-hidden','true');
          em3.textContent = ' ' + e3;
          sp3.appendChild(em3);
        }
        sp3.dataset.emojified='1';
      }
    }catch(e){ /* noop */ }
  },

  decorateCards(){
    try{
      var cardsScreen = document.getElementById('screen-cards');
      if (!cardsScreen || cardsScreen.style.display==='none') return;
      var box = document.getElementById('cards-container');
      if (!box) return;
      // Chỉ chọn các thẻ từ trong vùng hiển thị
      var items = box.querySelectorAll('button.word, .word, .card .word, .card button');
      if (!items || !items.length){
        // fallback: bám mọi button trong container (nhưng vẫn chỉ trong #cards-container)
        items = box.querySelectorAll('button');
      }
      for (var i=0;i<items.length;i++){
        var el = items[i];
        if (!el || el.dataset.emojified==='1') continue;
        var raw = (el.innerText || el.textContent || '').trim();
        if (!raw) { el.dataset.emojified='1'; continue; }
        var word = raw.split(/\s+/)[0];
        var e = this.iconForWord(word);
        if (!e){ el.dataset.emojified='1'; continue; }
        // chèn emoji trái, pointer-events none
        var span = document.createElement('span');
        span.className = 'card-emoji';
        span.setAttribute('aria-hidden','true');
        span.textContent = e + ' ';
        if (el.firstChild) el.insertBefore(span, el.firstChild); else el.appendChild(span);
        el.dataset.emojified='1';
      }
    }catch(e){ /* noop */ }
  },

  observe(){
    var self = this;
    function onReady(){
      self.decorateActive();
      // MutationObserver với throttle
      var scheduled = false;
      var obs = new MutationObserver(function(){
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function(){
          scheduled = false;
          self.decorateActive();
        });
      });
      obs.observe(document.body, { childList:true, subtree:true });
      self._observer = obs;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }
};

try { Emoji.observe(); } catch(_) {}
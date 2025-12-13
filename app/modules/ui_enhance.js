/* MODULE: UI_ENHANCE – Chèn hình minh họa (SVG data URI) cho Thẻ từ & Luyện đọc.
   - Thẻ từ: lắng nghe thay đổi #cards-container, thêm .thumb (SVG) theo từ tìm được.
   - Luyện đọc B2: chèn minh họa đoạn văn ngay trên #passageText (theo từ khóa/passage).
   Không dùng URL ngoài; toàn bộ hình là SVG data-uri. */

(function(){
  const UIX = {
    init(){
      document.addEventListener('DOMContentLoaded', ()=> this.ready());
      if (document.readyState!=='loading') this.ready();
    },
    ready(){
      try{
        this.observeCards();
        this.observeReading();
        // lần đầu nếu đã có nội dung
        setTimeout(()=>{ this.enhanceCards(); this.enhanceReadingArt(); }, 500);
        // Khi chọn bài đọc thay đổi
        const selP = document.getElementById('selPassage');
        if (selP) selP.addEventListener('change', ()=> this.enhanceReadingArt());
      }catch(e){ console.warn('UIX ready err', e); }
    },

    /* ========== Cards ========== */
    observeCards(){
      const cont = document.getElementById('cards-container');
      if (!cont || window.__uixCardsObs) return;
      const obs = new MutationObserver(()=> this.enhanceCards());
      obs.observe(cont, { childList:true, subtree:true });
      window.__uixCardsObs = obs;
    },
    enhanceCards(){
      const cont = document.getElementById('cards-container'); if (!cont) return;
      const cards = Array.from(cont.children);
      if (!cards.length) return;
      const dict = this.makeCardDict();

      cards.forEach(el=>{
        if (el.dataset && el.dataset.thumbAdded==='1') return;

        const word = this.detectWord(el, dict);
        if (!word) return;
        const emoji = this.pickEmojiForWord(word);
        const src = this.makeTileSVG(emoji, word, 84, 84);

        // Tạo thumb (ảnh bên trái)
        const thumb = document.createElement('div'); thumb.className='thumb';
        const img = document.createElement('img'); img.alt = `Minh họa ${word}`; img.src = src;
        thumb.appendChild(img);

        // Cấu trúc: nếu phần tử là .card flex, chèn đầu
        el.insertBefore(thumb, el.firstChild);
        el.dataset.thumbAdded = '1';
      });
    },
    makeCardDict(){
      const dict = new Map();
      if (Array.isArray(window.CARDS)){
        for (const c of window.CARDS){ if (c && c.text) dict.set(String(c.text), true); }
      }
      return dict;
    },
    detectWord(node, dict){
      // Ưu tiên data-word nếu có
      if (node.dataset && node.dataset.word) return node.dataset.word.trim();

      const txt = (node.textContent || '').trim();
      if (!txt) return null;
      // Tìm từ trong CARDS xuất hiện trong textContent
      let best = null, bestLen = 0;
      if (dict && dict.size){
        dict.forEach((_, w)=>{
          if (txt.includes(w) && w.length > bestLen){ best = w; bestLen = w.length; }
        });
      }
      // fallback: lấy "từ" đầu tiên (≤10 ký tự) trong dòng đầu
      if (!best){
        const line = txt.split('\n')[0] || txt;
        const m = line.match(/[A-Za-zÀ-ỹĐđ\-]{1,12}/u);
        if (m) best = m[0];
      }
      return best;
    },

    /* ========== Reading (B2) ========== */
    observeReading(){
      const el = document.getElementById('passageText'); if (!el || window.__uixReadObs) return;
      const obs = new MutationObserver(()=> this.enhanceReadingArt());
      obs.observe(el, { childList:true, subtree:true });
      window.__uixReadObs = obs;
    },
    enhanceReadingArt(){
      const wrap = document.getElementById('readStep2'); if (!wrap) return;
      const hostText = document.getElementById('passageText'); if (!hostText) return;

      // Tạo container nếu chưa có
      let art = wrap.querySelector('.passage-art');
      if (!art){
        art = document.createElement('div');
        art.className='passage-art';
        wrap.insertBefore(art, hostText);
      }
      // Lấy nội dung hiện thời
      const text = (window.ReadingModule && ReadingModule.passage && ReadingModule.passage.text) ? ReadingModule.passage.text : hostText.textContent || '';
      const id = (window.ReadingModule && ReadingModule.passage && ReadingModule.passage.id) ? ReadingModule.passage.id : (document.getElementById('selPassage')?.value || '');
      if (!text.trim()) { art.innerHTML=''; return; }

      const emoji = this.pickEmojiForPassage(text, id);
      const label = this.makeShortTitle(text);
      const src = this.makeTileSVG(emoji, label, 96, 96);

      art.innerHTML = '';
      const thumb = document.createElement('div'); thumb.className='thumb';
      const img = document.createElement('img'); img.alt='Minh họa đoạn'; img.src = src;
      thumb.appendChild(img);
      const cap = document.createElement('div');
      cap.innerHTML = `<div style="font-weight:600;">${this.escapeHTML(label)}</div><div style="color:#666;font-size:12px;">Hình minh họa</div>`;
      art.appendChild(thumb); art.appendChild(cap);
    },
    makeShortTitle(text){
      const s = String(text||'').split(/[.?!…]/u)[0] || '';
      // lấy 3–5 từ đầu làm nhãn
      const tokens = s.trim().split(/\s+/).slice(0,5);
      return tokens.join(' ');
    },

    /* ========== Emoji picks ========== */
    pickEmojiForWord(w){
      const s = (w||'').toLowerCase();
      const map = {
        'cá':'🐟','gà':'🐔','chó':'🐶','mèo':'🐱','chim':'🐦','trứng':'🥚',
        'hoa':'🌸','lá':'🍃','cây':'🌳','quả':'🍎','quê':'🏡','quạt':'🪭','quý':'💎',
        'mưa':'🌧️','nắng':'🌞','mây':'☁️','gió':'🍃','sông':'🌊','biển':'🌊','núi':'⛰️','đường':'🛣️',
        'đi':'🚶','chạy':'🏃','nhảy':'🤸','chơi':'🎮','ăn':'🍽️','uống':'🥤','ngủ':'😴','thức':'⏰',
        'sách':'📘','bút':'✏️','vở':'📒','thước':'📏','ghế':'🪑',
        'trăng':'🌙','sao':'⭐','giấy':'📄','khỏe':'💪','sữa':'🍼','lúa':'🌾'
      };
      // Từ ghép/2 tiếng: thử tiếng cuối
      if (!map[s]){
        const parts = s.split(/\s+/);
        const last = parts[parts.length-1] || s;
        if (map[last]) return map[last];
      }
      // kí tự mặc định
      return '🔤';
    },
    pickEmojiForPassage(text, id){
      const t = (String(text||'') + ' ' + String(id||'')).toLowerCase();
      const has = (k)=> t.includes(k);
      if (has('mưa') || has('ướt')) return '🌧️';
      if (has('nắng') || has('đội mũ')) return '🌞';
      if (has('vườn') || has('tưới') || has('trồng')) return '🌿';
      if (has('công viên') || has('xe đạp')) return '🚲';
      if (has('diều')) return '🪁';
      if (has('chợ') || has('rau')) return '🛒';
      if (has('khoa học') || has('mô hình') || has('pin')) return '🔬';
      if (has('thư viện') || has('sách')) return '📚';
      if (has('robot')) return '🤖';
      if (has('bảo vệ môi trường') || has('rác')) return '♻️';
      if (has('bóng rổ')) return '🏀';
      return '📖';
    },

    /* ========== SVG Generator ========== */
    makeTileSVG(emoji, label, w, h){
      const W = w||96, H = h||96;
      const bg = this.pickBG(label);
      const text = this.escapeXML(emoji||'📖');
      const cap = this.escapeXML(this.trimCap(label||''));
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg[0]}"/>
      <stop offset="100%" stop-color="${bg[1]}"/>
    </linearGradient>
  </defs>
  <rect rx="${Math.round(W*0.12)}" ry="${Math.round(W*0.12)}" width="${W}" height="${H}" fill="url(#g)"/>
  <text x="50%" y="${Math.round(H*0.55)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(W*0.5)}"> ${text} </text>
  <text x="50%" y="${H-8}" text-anchor="middle" font-size="${Math.max(10,Math.round(W*0.16))}" fill="#112" font-family="system-ui, sans-serif">${cap}</text>
</svg>`.trim();
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    },
    pickBG(s){
      // màu nền dựa hash
      const palette = [
        ['#FFDEE9','#B5FFFC'],
        ['#FDE2E4','#E2ECE9'],
        ['#FFF1C1','#FDE9A7'],
        ['#D7FFD2','#A5FECB'],
        ['#DDEBFF','#C7CEEA'],
        ['#F1F0FF','#E0C3FC']
      ];
      let h=0; const str=String(s||'x');
      for (let i=0;i<str.length;i++){ h = (h*33 + str.charCodeAt(i))>>>0; }
      return palette[h % palette.length];
    },
    trimCap(label){
      const s = String(label||'').trim();
      if (s.length<=8) return s;
      return s.slice(0,8) + '…';
    },

    /* ========== Utils ========== */
    escapeXML(s){ return String(s||'').replace(/[<>&"']/g, c=>({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); },
    escapeHTML(s){ const el=document.createElement('div'); el.textContent=String(s||''); return el.innerHTML; }
  };

  UIX.init();
})();
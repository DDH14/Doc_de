/* MODULE: CARDS – có minh họa Emoji + sửa lỗi không lấy được dữ liệu */
(function(){
  const TAG_KEY = 'cards_filter_tag';

  // ===== Helpers an toàn với global =====
  const now = ()=> (typeof window.__now === 'function' ? window.__now() : Date.now());
  const say = (t)=> window.VoiceUI?.say?.(t);
  const attachVoice = ()=> window.VoiceUI?.attachAll?.();
  const speak = (txt, rate)=> window.TTS?.speak?.(txt, rate);

  function storeSet(key, val){
    try{ window.Store?.set ? window.Store.set(key,val) : localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }
  function syncEnq(obj){
    try{ window.Sync?.enqueue?.(obj); }catch(e){}
  }

  // ===== Emoji minh hoạ theo id/text =====
  const EMOJI_BY_ID = {
    w_0001:"👶", w_0002:"👩‍🍼", w_0003:"👵", w_0004:"👨", w_0005:"👴", w_0006:"👩‍🏫", w_0007:"👨‍🏫",
    w_0008:"🏠", w_0009:"🚪", w_0010:"🛋️", w_0011:"🪑", w_0012:"🌳", w_0013:"🍃", w_0014:"🌸", w_0015:"🍎",
    w_0016:"🐟", w_0017:"🐔", w_0018:"🐶", w_0019:"🐱", w_0020:"🐦", w_0021:"🥚",
    w_0022:"📚", w_0023:"🖊️", w_0024:"📒", w_0025:"📏",
    w_0026:"🌙", w_0027:"⭐", w_0028:"🌧️", w_0029:"🌤️", w_0030:"☁️", w_0031:"🌬️",
    w_0032:"🏞️", w_0033:"💦", w_0034:"🌊", w_0035:"⛰️", w_0036:"🛣️",
    w_0037:"🚶", w_0038:"🏠", w_0039:"🎒", w_0040:"📖", w_0041:"✍️", w_0042:"🎲",
    w_0043:"🏃", w_0044:"🤾", w_0045:"🍽️", w_0046:"🥤", w_0047:"🛌", w_0048:"⏰",
    w_0049:"🍋", w_0050:"🖼️", w_0051:"🌫️", w_0052:"🏯", w_0053:"🎁", w_0054:"🏡",
    w_0055:"🍬", w_0056:"🪵", w_0057:"🛌", w_0058:"🎨", w_0059:"🍲", w_0060:"🥣",
    w_0061:"🐃", w_0062:"💎", w_0063:"📄", w_0064:"💪", w_0065:"🍽️",
    w_0066:"🥛", w_0067:"🌾", w_0068:"🌀", w_0069:"🧠", w_0070:"🚪", w_0071:"😠",
    w_0072:"🧺", w_0073:"🎶", w_0074:"🍳", w_0075:"🐦", w_0076:"🪚", w_0077:"🧒",
    w_0078:"🪓", w_0079:"🟫", w_0080:"⏳", w_0081:"⚖️", w_0082:"🤫",
    w_0083:"🌥️", w_0084:"🌊", w_0085:"💎"
  };
  function emojiFor(card){
    if (!card) return "❔";
    if (EMOJI_BY_ID[card.id]) return EMOJI_BY_ID[card.id];
    const mapByText = {
      "bé":"👶","mẹ":"👩‍🍼","bà":"👵","bố":"👨","ông":"👴","cô":"👩‍🏫","chú":"👨‍🏫",
      "nhà":"🏠","cửa":"🚪","bàn":"🛋️","ghế":"🪑","cây":"🌳","lá":"🍃","hoa":"🌸","quả":"🍎",
      "cá":"🐟","gà":"🐔","chó":"🐶","mèo":"🐱","chim":"🐦","trứng":"🥚","sách":"📚","bút":"🖊️",
      "vở":"📒","thước":"📏","trăng":"🌙","sao":"⭐","mưa":"🌧️","nắng":"🌤️","mây":"☁️","gió":"🌬️",
      "sông":"🏞️","xương":"💦","biển":"🌊","núi":"⛰️","đường":"🛣️","đi":"🚶","về":"🏠","học":"🎒",
      "đọc":"📖","viết":"✍️","chơi":"🎲","chạy":"🏃","nhảy":"🤾","ăn":"🍽️","uống":"🥤","ngủ":"🛌","thức":"⏰",
      "chanh":"🍋","tranh":"🖼️","sương":"🌫️","xưa":"🏯","quà":"🎁","quê":"🏡","kẹo":"🍬","cối":"🪵",
      "nghỉ":"🛌","nghệ":"🎨","nồi":"🍲","lồi":"🥣","trâu":"🐃","châu":"💎","giấy":"📄","khỏe":"💪","bữa":"🍽️",
      "sữa":"🥛","lúa":"🌾","quạt":"🌀","quên":"🧠","ghé":"🚪","ghen":"😠","giỏ":"🧺","sáo":"🎶","xáo":"🍳",
      "sẻ":"🐦","xẻ":"🪚","trẻ":"🧒","chẻ":"🪓","nâu":"🟫","lâu":"⏳","nặng":"⚖️","lặng":"🤫",
      "trời":"🌥️","trôi":"🌊","quý":"💎"
    };
    return mapByText[card.text] || "❔";
  }

  // ===== CSS động =====
  function injectStyles(){
    if (document.getElementById('cardsFxCss')) return;
    const css = `
    .cards-hud{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .cards-hud .pill{background:#fff;border:1px solid var(--border);border-radius:999px;padding:6px 10px;box-shadow:var(--shadow-sm)}
    .cards-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
    .cards-score{font-weight:900;color:var(--primary)}
    .cards-combo{font-weight:800;color:#6A1B9A}
    .cards-timer{font-weight:800;color:#C62828}
    .cards-card{
      position:relative; display:grid; grid-template-columns:1fr min(42%,220px); gap:12px;
      align-items:stretch; min-height:140px; border-radius:16px; border:1px solid var(--border);
      background:var(--panel); box-shadow:var(--shadow); overflow:hidden;
    }
    @media (max-width:640px){ .cards-card{ grid-template-columns:1fr; min-height:180px; } }
    .cards-face{ display:flex; align-items:center; justify-content:center; font-size:clamp(30px,7vw,54px); padding:18px 22px; user-select:none; }
    .cards-illu{ border-left:1px dashed var(--border); display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.02); }
    @media (max-width:640px){ .cards-illu{ border-left:none; border-top:1px dashed var(--border); padding:10px 0; } }
    .cards-emoji{ font-size:clamp(48px,12vw,90px); filter:drop-shadow(0 2px 4px rgba(0,0,0,.15)); transition:transform .25s ease; }
    .cards-emoji.hint{ animation:IlluPulse .5s ease; }
    @keyframes IlluPulse{ 0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)} }
    .cards-pulse{ animation:cardsPulse .5s ease; }
    @keyframes cardsPulse{ 0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)} }
    .cards-shake{ animation:cardsShake .35s ease; }
    @keyframes cardsShake{ 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
    .cards-sticker{ position:absolute; top:8px; right:8px; font-size:24px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.25)); animation:popIn .35s ease; }
    @keyframes popIn{ from{transform:scale(.3);opacity:0} to{transform:scale(1);opacity:1} }
    .cards-progress{height:10px;background:#eee;border-radius:999px;overflow:hidden}
    .cards-progress>span{display:block;height:100%;background:linear-gradient(90deg,#2E7D32,#81C784);width:0%}
    .tag-pill{padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:#fff;font-size:12px}
    .tag-sx{background:#E3F2FD} .tag-chtr{background:#FFF3E0} .tag-tone{background:#F3E5F5}
    .cards-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    `;
    const st = document.createElement('style'); st.id='cardsFxCss'; st.textContent = css; document.head.appendChild(st);
  }

  function uniqueTags(cards){
    const set = new Set();
    for (const c of cards) (c.tags||[]).forEach(t=> set.add(t));
    return Array.from(set).sort();
  }
  function tagsLabel(tag){
    const map = { all:'Tất cả', basic:'Cơ bản', tone:'Thanh điệu', sx:'s/x', chtr:'ch/tr', nl:'n/l', ngngh:'ng/ngh', ckqu:'c/k/qu', ghg:'gh/g' };
    return map[tag] || tag;
  }

  // ===== Điểm/chuỗi =====
  function scoreFor(quality, combo){
    const base = quality>=5 ? 10 : (quality>=3 ? 6 : 3);
    const bonus = Math.min(4, Math.floor(combo/3));
    return base + bonus;
  }

  // ===== Module chính =====
  const CardsModule = {
    current:null,
    _filter: localStorage.getItem(TAG_KEY) || 'all',

    roundActive:false, timeLeft:0, timerId:null,
    score:0, combo:0, bestCombo:0, reviewed:0,
    get slowRate(){ return Math.max(0.6, ((window.AppState?.learner?.ttsRate)||0.9) - 0.2); },

    setTag(tag){
      this._filter = tag || 'all';
      localStorage.setItem(TAG_KEY, this._filter);
      this.render();
    },

    reconcile(){
      window.AppState = window.AppState || {};
      if (!window.AppState.cardDeck) window.AppState.cardDeck = {};
      const src = Array.isArray(window.CARDS) ? window.CARDS : [];
      for (const c of src) if (!window.AppState.cardDeck[c.id]) window.AppState.cardDeck[c.id] = { id:c.id, easiness:2.5, interval:0, due: now() };
      storeSet('cards', window.AppState.cardDeck);
      this.render(); say?.('Đã cập nhật thẻ mới');
    },

    populateTagOptions(){
      const sel = document.getElementById('selCardTag'); if (!sel) return;
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const tags = ['all', ...uniqueTags(cards)];
      sel.innerHTML = tags.map(t => `<option value="${t}">${tagsLabel(t)}</option>`).join('');
      sel.value = this._filter;
    },

    dueList(){
      const deck = window.AppState?.cardDeck || {};
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const filtered = this._filter==='all' ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
      return filtered.map(c => ({...c, _deck: deck[c.id]}))
                     .sort((a,b) => (a._deck?.due ?? 0) - (b._deck?.due ?? 0));
    },

    stats(){
      const deck = window.AppState?.cardDeck || {};
      const nowMs = now();
      let total=0, due=0, mastered=0;
      for (const c of (Array.isArray(window.CARDS)? window.CARDS: [])) {
        total++;
        const d = deck[c.id];
        if ((d?.due ?? 0) <= nowMs) due++;
        if ((d?.interval || 0) >= 14) mastered++;
      }
      return { total, due, mastered };
    },

    render(){
      injectStyles();
      this.populateTagOptions();
      this.stopRound('rerender');

      const wrap = document.getElementById('cards-container'); if (!wrap) return;
      const list = this.dueList();
      const next = list[0];
      this.current = next || null;

      const s = this.stats();
      wrap.innerHTML = `
        <div class="cards-hud">
          <span class="pill">Đến hạn hôm nay: <b>${s.due}</b>/<b>${s.total}</b></span>
          <span class="pill">Đã vững: <b>${s.mastered}</b></span>
          <span class="pill tag-pill ${this._filter!=='all'?'tag-'+this._filter:''}">Bộ lọc: ${tagsLabel(this._filter)}</span>
          <div class="spacer"></div>
          <button class="ghost" onclick="CardsModule.startRound()" data-voice="Bắt đầu một vòng 60 giây">▶️ Chơi vòng 60s</button>
          <button class="ghost" onclick="CardsModule.stopRound('stop')" id="btnStopRound" disabled>⏹ Dừng</button>
        </div>

        <div class="cards-bar">
          <span class="pill cards-score">Điểm: <b id="cardsScore">0</b></span>
          <span class="pill cards-combo">Chuỗi: <b id="cardsCombo">0</b></span>
          <span class="pill cards-timer">⏱ <b id="cardsTimer">—</b></span>
          <div class="spacer"></div>
          <div class="cards-progress"><span id="cardsProg"></span></div>
        </div>

        <div class="cards-card" id="cardsCard">
          <div class="cards-face" id="cardsFace">—</div>
          <div class="cards-illu"><div class="cards-emoji" id="cardsEmoji">❔</div></div>
          <div class="cards-sticker" id="cardsSticker" style="display:none;">✨</div>
        </div>

        <div class="cards-actions">
          <button class="tts" data-voice="Nghe từ" id="btnHear">🔊 Nghe</button>
          <button class="ghost" data-voice="Nghe chậm" id="btnHearSlow">🐢 Nghe chậm</button>
          <button class="ghost" data-voice="Gợi ý nhẹ" id="btnHint">💡 Gợi ý</button>
          <div class="spacer"></div>
          <button onclick="CardsModule.grade(5)" class="primary" data-voice="Đánh giá dễ">Dễ</button>
          <button onclick="CardsModule.grade(3)" data-voice="Đánh giá vừa">Vừa</button>
          <button onclick="CardsModule.grade(1)" class="danger" data-voice="Đánh giá khó">Khó</button>
        </div>
      `;

      const btnHear = document.getElementById('btnHear');
      const btnSlow = document.getElementById('btnHearSlow');
      const btnHint = document.getElementById('btnHint');
      if (btnHear) btnHear.onclick = ()=> { if (this.current) speak(this.current.text, window.AppState?.learner?.ttsRate || 0.9); };
      if (btnSlow) btnSlow.onclick = ()=> { if (this.current) speak(this.current.text, this.slowRate); };
      if (btnHint) btnHint.onclick = ()=> this.hint();

      if (next){ this.showCard(next); } else { this.noCardUI(); }

      attachVoice();
      if (window.AppState?.childMode && next){ setTimeout(()=> speak(next.text, window.AppState?.learner?.ttsRate || 0.9), 250); }
    },

    noCardUI(){
      const face = document.getElementById('cardsFace');
      const emoji = document.getElementById('cardsEmoji');
      if (face) face.textContent = 'Hôm nay không có thẻ đến hạn. Bấm “Chơi vòng 60s” hoặc “Cập nhật thẻ mới”.';
      if (emoji) emoji.textContent = '🙂';
    },

    showCard(card){
      const face = document.getElementById('cardsFace'); if (!face) return;
      face.classList.remove('cards-pulse','cards-shake');
      face.innerHTML = `<span class="token ${window.toneClass ? window.toneClass(card.text) : ''}">${card.text}</span>`;

      const prog = document.getElementById('cardsProg');
      if (prog){
        const deck = window.AppState?.cardDeck?.[card.id] || { interval:0 };
        const pct = Math.max(0, Math.min(100, Math.round((deck.interval||0)/21*100)));
        prog.style.width = pct + '%';
      }

      const emojiEl = document.getElementById('cardsEmoji');
      if (emojiEl){
        emojiEl.classList.remove('hint');
        emojiEl.textContent = emojiFor(card);
      }

      const st = document.getElementById('cardsSticker'); if (st) st.style.display='none';
    },

    hint(){
      const card = this.current; if (!card) return;
      const face = document.getElementById('cardsFace');
      if (face){
        face.classList.remove('cards-shake');
        face.classList.add('cards-pulse');
        setTimeout(()=> face.classList.remove('cards-pulse'), 500);
      }
      const emojiEl = document.getElementById('cardsEmoji');
      if (emojiEl){
        emojiEl.classList.add('hint');
        setTimeout(()=> emojiEl.classList.remove('hint'), 520);
      }
      speak(card.text, this.slowRate);
      say?.('Gợi ý nhẹ');
    },

    grade(q){
      const c = this.current; if (!c) return;
      window.AppState = window.AppState || {};
      window.AppState.cardDeck = window.AppState.cardDeck || {};
      const prev = window.AppState.cardDeck[c.id] || { id:c.id, easiness:2.5, interval:0, due: now() };
      const updated = typeof window.srReview === 'function'
        ? window.srReview(prev, q)
        : simpleSrReview(prev, q); // fallback
      window.AppState.cardDeck[c.id] = updated;
      storeSet('cards', window.AppState.cardDeck);

      if (q>=3){ this.combo += 1; this.bestCombo = Math.max(this.bestCombo, this.combo); } else this.combo = 0;
      const pts = scoreFor(q, this.combo);
      this.score += pts; this.reviewed += 1;
      this.updateHud();

      const face = document.getElementById('cardsFace');
      if (face){
        if (q>=5){ face.classList.add('cards-pulse'); setTimeout(()=> face.classList.remove('cards-pulse'), 500); }
        if (q<=1){ face.classList.add('cards-shake'); setTimeout(()=> face.classList.remove('cards-shake'), 350); }
      }
      if (this.combo>0 && this.combo%3===0){
        const st = document.getElementById('cardsSticker');
        if (st){ st.textContent = this.combo>=9 ? '🔥' : (this.combo>=6 ? '⚡️' : '✨'); st.style.display=''; }
        window.Effects?.confetti?.(40,{anchorEl:document.getElementById('cardsCard')});
      }

      const log = {
        type: 'cards',
        learnerId: window.AppState?.learner?.sysId || '',
        sessionId: 'cards_' + Math.random().toString(36).slice(2,8),
        ts: now(),
        cardId: c.id, cardText: c.text, cardTags: c.tags || [],
        quality: q, easiness: updated.easiness, interval: updated.interval, due: updated.due,
        filterTag: this._filter
      };
      syncEnq(log);

      this.nextCard();
    },

    updateHud(){
      const sc = document.getElementById('cardsScore'); if (sc) sc.textContent = this.score;
      const cb = document.getElementById('cardsCombo'); if (cb) cb.textContent = this.combo;
      const tm = document.getElementById('cardsTimer'); if (tm) tm.textContent = this.roundActive ? (this.timeLeft+'s') : '—';
    },

    nextCard(){
      const list = this.dueList();
      let next = list[0];
      if (!next){
        const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
        const pool = (this._filter==='all') ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
        if (pool.length) next = pool[Math.floor(Math.random()*pool.length)];
      }
      this.current = next || null;
      if (!next){ this.noCardUI(); return; }
      this.showCard(next);
      if (window.AppState?.childMode) setTimeout(()=> speak(next.text, window.AppState?.learner?.ttsRate || 0.9), 200);
    },

    startRound(sec=60){
      if (this.roundActive) return;
      this.roundActive = true; this.timeLeft = sec; this.score=0; this.combo=0; this.bestCombo=0; this.reviewed=0;
      const btnStop = document.getElementById('btnStopRound'); if (btnStop) btnStop.disabled = false;
      this.updateHud();
      this.nextCard();
      const tick = ()=>{
        if (!this.roundActive) return;
        this.timeLeft -= 1; this.updateHud();
        if (this.timeLeft<=0){ this.stopRound('timeout'); return; }
        this.timerId = setTimeout(tick, 1000);
      };
      tick();
      say?.('Bắt đầu vòng 60 giây. Cố gắng nhé!');
    },

    stopRound(reason='stop'){
      if (!this.roundActive) return;
      this.roundActive = false;
      clearTimeout(this.timerId); this.timerId=null;
      const btnStop = document.getElementById('btnStopRound'); if (btnStop) btnStop.disabled = true;
      this.updateHud();

      let stars = 0;
      if (this.score>=180) stars = 2; else if (this.score>=100) stars = 1;
      if (stars>0 && window.App){ for(let i=0;i<stars;i++) window.App.addStar(1); window.Effects?.confetti?.(80); }

      const msg = `Vòng kết thúc: Điểm ${this.score}, Chuỗi cao nhất ${this.bestCombo}, Ôn ${this.reviewed} thẻ.` + (stars?` Thưởng ${'⭐'.repeat(stars)}!`:``);
      alert(msg);

      const log = {
        type:'cards_round',
        learnerId: window.AppState?.learner?.sysId || '',
        sessionId: 'cardsR_' + Math.random().toString(36).slice(2,8),
        ts: now(),
        filterTag: this._filter, score: this.score, bestCombo: this.bestCombo, reviewed: this.reviewed,
        durationSec: undefined
      };
      syncEnq(log);
    }
  };

  // Fallback SR nếu môi trường chưa có srReview
  function simpleSrReview(prev, q){
    const ease = Math.max(1.3, (prev.easiness || 2.5) + (q>=4?0.1:(q===3?-0.05:-0.2)));
    const step = q>=3 ? Math.max(1, (prev.interval||0) ? Math.round(prev.interval * ease) : 1) : 0;
    const ivl = q>=3 ? Math.min(60, step || 1) : 0;
    return { id:prev.id, easiness:ease, interval:ivl, due: now() + ivl*24*3600*1000 };
  }

  // ===== Tự khởi động và chờ dữ liệu CARDS =====
  function autoInit(){
    // Đợi DOM sẵn sàng
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', ()=> { try{ CardsModule.render(); }catch(e){ console.error(e); } });
    } else {
      try{ CardsModule.render(); }catch(e){ console.error(e); }
    }
    // Nếu CARDS chưa có, chờ tối đa 10s rồi render lại khi có dữ liệu
    if (!Array.isArray(window.CARDS) || !window.CARDS.length){
      let tries = 0;
      const id = setInterval(()=>{
        tries++;
        if (Array.isArray(window.CARDS) && window.CARDS.length){
          clearInterval(id);
          try{ CardsModule.render(); }catch(e){ console.error(e); }
        }
        if (tries>50) clearInterval(id); // ~12.5s nếu 250ms/ lần
      }, 250);
    }
  }

  // Gán ra window để HTML gọi onClick được
  window.CardsModule = CardsModule;

  // Khởi chạy
  autoInit();
})();
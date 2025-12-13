/* MODULE: CARDS – phiên bản sinh động với vòng chơi 60s, điểm/chuỗi, hiệu ứng */
(function(){
  const TAG_KEY = 'cards_filter_tag';

  // ——— CSS động cho hiệu ứng ———
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
      position:relative; display:flex; align-items:center; justify-content:center;
      min-height:120px; border-radius:16px; border:1px solid var(--border); background:var(--panel);
      box-shadow:var(--shadow); perspective:1000px; overflow:hidden;
    }
    .cards-face{
      font-size: clamp(30px, 7vw, 54px);
      padding:18px 22px; border-radius:12px; user-select:none;
      transform-style:preserve-3d; transition:transform .5s ease;
    }
    .cards-card.flip .cards-face{ transform:rotateY(180deg); }
    .cards-pulse{ animation: cardsPulse .5s ease; }
    @keyframes cardsPulse{ 0%{ transform: scale(1);} 50%{ transform: scale(1.06);} 100%{ transform: scale(1);} }
    .cards-shake{ animation: cardsShake .35s ease; }
    @keyframes cardsShake{
      0%,100%{ transform: translateX(0); } 20%{ transform: translateX(-6px); }
      40%{ transform: translateX(6px);} 60%{ transform: translateX(-4px);} 80%{ transform: translateX(4px);}
    }
    .cards-sticker{ position:absolute; top:8px; right:8px; font-size:24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.25)); animation: popIn .35s ease; }
    @keyframes popIn{ from{ transform: scale(.3); opacity:0;} to{ transform: scale(1); opacity:1;} }
    .cards-progress{height:10px;background:#eee;border-radius:999px;overflow:hidden}
    .cards-progress>span{display:block;height:100%;background:linear-gradient(90deg,#2E7D32,#81C784);width:0%}
    .tag-pill{padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:#fff; font-size:12px}
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
    const map = {
      all:'Tất cả', basic:'Cơ bản', tone:'Thanh điệu', sx:'s/x', chtr:'ch/tr',
      nl:'n/l', ngngh:'ng/ngh', ckqu:'c/k/qu', ghg:'gh/g'
    }; return map[tag] || tag;
  }

  // ——— Tiện ích điểm/chuỗi ———
  function scoreFor(quality, combo){
    // Điểm cơ bản + nhân theo chuỗi
    const base = quality>=5 ? 10 : (quality>=3 ? 6 : 3);
    const bonus = Math.min(4, Math.floor(combo/3)); // +1 mỗi 3 combo, tối đa +4
    return base + bonus;
  }

  // ——— Module chính ———
  window.CardsModule = {
    current:null,
    _filter: localStorage.getItem(TAG_KEY) || 'all',

    // HUD & vòng chơi
    roundActive:false,
    timeLeft:0,
    timerId:null,
    score:0,
    combo:0,
    bestCombo:0,
    reviewed:0,
    slowRate: Math.max(0.6, (AppState?.learner?.ttsRate||0.9) - 0.2),

    setTag(tag){
      this._filter = tag || 'all';
      localStorage.setItem(TAG_KEY, this._filter);
      this.render();
    },

    reconcile(){
      if (!AppState.cardDeck) AppState.cardDeck = {};
      const src = Array.isArray(window.CARDS) ? window.CARDS : [];
      for (const c of src) if (!AppState.cardDeck[c.id]) AppState.cardDeck[c.id] = { id:c.id, easiness:2.5, interval:0, due: window.__now() };
      Store.set('cards', AppState.cardDeck);
      this.render(); VoiceUI.say('Đã cập nhật thẻ mới');
    },

    populateTagOptions(){
      const sel = document.getElementById('selCardTag'); if (!sel) return;
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const tags = ['all', ...uniqueTags(cards)];
      sel.innerHTML = tags.map(t => `<option value="${t}">${tagsLabel(t)}</option>`).join('');
      sel.value = this._filter;
    },

    dueList(){
      const deck = AppState.cardDeck || {};
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const filtered = this._filter==='all' ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
      // Ưu tiên đến hạn trước, rồi những thẻ mới
      const list = filtered.map(c => ({...c, _deck: deck[c.id]}))
                           .sort((a,b) => (a._deck?.due ?? 0) - (b._deck?.due ?? 0));
      return list;
    },

    stats(){
      const deck = AppState.cardDeck || {};
      const nowMs = window.__now();
      let total=0, due=0, mastered=0;
      for (const c of (Array.isArray(window.CARDS)? window.CARDS: [])) {
        total++;
        const d = deck[c.id];
        if ((d?.due ?? 0) <= nowMs) due++;
        if ((d?.interval || 0) >= 14) mastered++; // coi là đã khá vững
      }
      return { total, due, mastered };
    },

    render(){
      injectStyles();
      this.populateTagOptions();
      // Dừng vòng chơi nếu đang chạy (khi user rời tab cards rồi quay lại)
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

      // Sự kiện nghe
      const btnHear = document.getElementById('btnHear');
      const btnSlow = document.getElementById('btnHearSlow');
      const btnHint = document.getElementById('btnHint');
      btnHear.onclick = ()=> { if (this.current) TTS.speak(this.current.text, AppState.learner.ttsRate || 0.9); };
      btnSlow.onclick = ()=> { if (this.current) TTS.speak(this.current.text, this.slowRate); };
      btnHint.onclick = ()=> this.hint();

      // Hiển thị thẻ đầu
      if (next){ this.showCard(next); } else { this.noCardUI(); }

      VoiceUI.attachAll();
      if (AppState.childMode && next){ setTimeout(()=> TTS.speak(next.text, AppState.learner.ttsRate || 0.9), 250); }
    },

    noCardUI(){
      const face = document.getElementById('cardsFace');
      if (face) face.textContent = 'Hôm nay không có thẻ đến hạn. Bấm “Chơi vòng 60s” hoặc “Cập nhật thẻ mới”.';
    },

    showCard(card){
      const face = document.getElementById('cardsFace'); if (!face) return;
      face.classList.remove('cards-pulse','cards-shake');
      face.innerHTML = `<span class="token ${window.toneClass ? window.toneClass(card.text) : ''}">${card.text}</span>`;
      const prog = document.getElementById('cardsProg');
      if (prog){
        const deck = AppState.cardDeck?.[card.id] || { interval:0 };
        // vẽ thanh nhỏ dựa trên interval (0–21+ ngày)
        const pct = Math.max(0, Math.min(100, Math.round((deck.interval||0)/21*100)));
        prog.style.width = pct + '%';
      }
      // Sticker combo ẩn đi
      const st = document.getElementById('cardsSticker'); if (st) st.style.display='none';
    },

    // Gợi ý nhẹ: hiển thị tone màu, rung nhẹ, không trừ điểm
    hint(){
      const card = this.current; if (!card) return;
      const face = document.getElementById('cardsFace');
      if (face){
        face.classList.remove('cards-shake');
        face.classList.add('cards-pulse');
        setTimeout(()=> face.classList.remove('cards-pulse'), 500);
      }
      TTS.speak(card.text, this.slowRate);
      VoiceUI.say('Gợi ý nhẹ');
    },

    // Tính điểm/chuỗi + SRS + log
    grade(q){
      const c = this.current; if (!c) return;
      const prev = AppState.cardDeck[c.id] || { id:c.id, easiness:2.5, interval:0, due: window.__now() };
      const updated = window.srReview(prev, q);
      AppState.cardDeck[c.id] = updated;
      Store.set('cards', AppState.cardDeck);

      // Điểm/chuỗi
      if (q>=3){ this.combo += 1; this.bestCombo = Math.max(this.bestCombo, this.combo); }
      else this.combo = 0;
      const pts = scoreFor(q, this.combo);
      this.score += pts; this.reviewed += 1;
      this.updateHud();

      // Hiệu ứng
      const face = document.getElementById('cardsFace');
      if (face){
        if (q>=5){ face.classList.add('cards-pulse'); setTimeout(()=> face.classList.remove('cards-pulse'), 500); }
        if (q<=1){ face.classList.add('cards-shake'); setTimeout(()=> face.classList.remove('cards-shake'), 350); }
      }
      if (this.combo>0 && this.combo%3===0){
        const st = document.getElementById('cardsSticker');
        if (st){ st.textContent = this.combo>=9 ? '🔥' : (this.combo>=6 ? '⚡️' : '✨'); st.style.display=''; }
        Effects?.confetti?.(40,{anchorEl:document.getElementById('cardsCard')});
      }

      // Log từng thẻ
      const log = {
        type: 'cards',
        learnerId: AppState.learner.sysId || '',
        sessionId: 'cards_' + Math.random().toString(36).slice(2,8),
        ts: window.__now(),
        cardId: c.id,
        cardText: c.text,
        cardTags: c.tags || [],
        quality: q,
        easiness: updated.easiness,
        interval: updated.interval,
        due: updated.due,
        filterTag: this._filter
      };
      window.Sync.enqueue(log);

      // Thẻ kế tiếp
      this.nextCard();
    },

    updateHud(){
      const sc = document.getElementById('cardsScore'); if (sc) sc.textContent = this.score;
      const cb = document.getElementById('cardsCombo'); if (cb) cb.textContent = this.combo;
      const tm = document.getElementById('cardsTimer'); if (tm) tm.textContent = this.roundActive ? (this.timeLeft+'s') : '—';
    },

    nextCard(){
      // Ưu tiên danh sách đến hạn
      const list = this.dueList();
      let next = list[0];
      // Nếu không có đến hạn → chủ động chọn ngẫu nhiên trong filter (để luyện tự do)
      if (!next){
        const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
        const pool = (this._filter==='all') ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
        if (pool.length) next = pool[Math.floor(Math.random()*pool.length)];
      }
      this.current = next || null;
      if (!next){ this.noCardUI(); return; }
      this.showCard(next);
      if (AppState.childMode) setTimeout(()=> TTS.speak(next.text, AppState.learner.ttsRate || 0.9), 200);
    },

    // ——— Vòng 60s ———
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
      VoiceUI.say('Bắt đầu vòng 60 giây. Cố gắng nhé!');
    },

    stopRound(reason='stop'){
      if (!this.roundActive) return;
      this.roundActive = false;
      clearTimeout(this.timerId); this.timerId=null;
      const btnStop = document.getElementById('btnStopRound'); if (btnStop) btnStop.disabled = true;
      this.updateHud();

      // Thưởng sao theo điểm
      let stars = 0;
      if (this.score>=180) stars = 2; else if (this.score>=100) stars = 1;
      if (stars>0 && window.App) { for(let i=0;i<stars;i++) App.addStar(1); Effects?.confetti?.(80); }

      // Tóm tắt
      const msg = `Vòng kết thúc: Điểm ${this.score}, Chuỗi cao nhất ${this.bestCombo}, Ôn ${this.reviewed} thẻ.` + (stars?` Thưởng ${'⭐'.repeat(stars)}!`:``);
      alert(msg);

      // Log vòng
      const log = {
        type:'cards_round',
        learnerId: AppState.learner.sysId || '',
        sessionId: 'cardsR_' + Math.random().toString(36).slice(2,8),
        ts: window.__now(),
        filterTag: this._filter,
        score: this.score,
        bestCombo: this.bestCombo,
        reviewed: this.reviewed,
        durationSec: typeof this.timeLeft==='number' ? undefined : undefined // không cần thiết
      };
      window.Sync.enqueue(log);
    }
  };

  // Gán vào window để HTML onClick gọi được
  window.CardsModule = window.CardsModule;
})();
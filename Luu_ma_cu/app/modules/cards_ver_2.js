/* MODULE: CARDS – Thẻ từ, ôn theo nhịp (SM-2 giản lược), TTS, hotkeys, thân thiện dyslexia.
   Bản này bổ sung: seed dữ liệu ban đầu (từ window.CARDS hoặc bộ mẫu), auto-reconcile từ cardInbox. */
(function(){
  const NOW = ()=> (window.__now ? window.__now() : Date.now());

  const KEY_CARDS = 'cards';
  const KEY_INBOX = 'cardInbox';
  const SESSION_DEFAULT_COUNT = 12;
  const SESSION_MAX_MINUTES = 2; // phiên ngắn
  const GRADE = { HARD:0, GOOD:1, EASY:2 };

  // Bộ mẫu tối thiểu nếu không có window.CARDS và Store.cards trống
  const DEFAULT_SEED = [
    { text:'xa', tag:'s-x' }, { text:'sa', tag:'s-x' }, { text:'xôi', tag:'s-x' }, { text:'sôi', tag:'s-x' },
    { text:'trà', tag:'ch-tr' }, { text:'cha', tag:'ch-tr' }, { text:'chân', tag:'ch-tr' }, { text:'trân', tag:'ch-tr' },
    { text:'ma', tag:'tone' }, { text:'má', tag:'tone' }, { text:'mà', tag:'tone' }, { text:'mã', tag:'tone' }, { text:'mạ', tag:'tone' }
  ];

  const TAG_HINTS = {
    's-x': 'Phân biệt âm đầu s và x.',
    'ch-tr': 'Phân biệt âm đầu ch và tr.',
    'tone': 'Chú ý thanh điệu.',
    'omission': 'Tránh bỏ âm/tiếng.',
    'insertion': 'Tránh thêm âm/tiếng.',
    'reading-misread': 'Từ từng đọc sai, ôn lại để khắc sâu.',
  };

  function logReview(card, grade){
    try{
      const entry = { type:'card', ts: NOW(), text: card.text, tag: card.tag, grade, due: card.due||0 };
      window.AppState = window.AppState || { logs: [] };
      AppState.logs = AppState.logs || [];
      AppState.logs.push(entry);
      if (window.Store) Store.set('logs', AppState.logs);
      if (window.Sync && typeof Sync.enqueue==='function') Sync.enqueue(entry);
    }catch(_){}
  }

  function schedule(card, grade){
    card.reps = card.reps || 0;
    card.ease = card.ease || 2.5;
    card.interval = card.interval || 0;
    card.lapses = card.lapses || 0;

    if (grade===GRADE.EASY) card.ease += 0.15;
    if (grade===GRADE.GOOD) card.ease += 0.00;
    if (grade===GRADE.HARD) card.ease = Math.max(1.3, card.ease - 0.20);

    if (grade===GRADE.HARD){
      card.lapses++;
      card.reps = 0;
      card.due = NOW() + 10*60*1000; // 10 phút
      card.interval = 0;
      return;
    }

    let nextIntervalDays = 0;
    if (card.reps === 0) nextIntervalDays = (grade===GRADE.EASY) ? 2 : 1;
    else if (card.reps === 1) nextIntervalDays = (grade===GRADE.EASY) ? 5 : 3;
    else nextIntervalDays = Math.max(1, Math.round(card.interval * (grade===GRADE.EASY ? card.ease : Math.max(1.3, card.ease-0.2))));

    card.reps += 1;
    card.interval = nextIntervalDays;
    card.due = NOW() + nextIntervalDays*24*60*60*1000;
  }

  function speak(text){
    try{
      const rate = (window.AppState && AppState.learner && AppState.learner.ttsRate) || 0.95;
      if (window.TTS && typeof TTS.speak === 'function') TTS.speak(String(text), rate);
      else if (window.speechSynthesis){
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = 'vi-VN'; u.rate = rate;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    }catch(_){}
  }
  function vibrate(pattern){ try{ navigator.vibrate && navigator.vibrate(pattern); }catch(_){ } }

  const SPECIAL_TAG_ALL = '__all__';
  const SPECIAL_TAG_DUE = '__due__';
  const SPECIAL_TAG_NEW = '__new__';

  const CardsModule = {
    cards: [],
    tag: SPECIAL_TAG_DUE,
    sessionActive: false,
    sessionQueue: [],
    sessionIdx: 0,
    sessionReviewed: 0,
    sessionGoal: SESSION_DEFAULT_COUNT,
    hotkeysOn: false,

    init(){
      if (this._initialized) return;
      this._initialized = true;

      window.App = window.App || {};
      window.App.cards = this;

      this.load();
      this.seedIfEmpty(true); // seed + auto-reconcile inbox lần đầu nếu trống
      this.populateTags();
      this.updateStatsBadge();
      this.renderHome();

      this.observeScreenActivate();
    },

    observeScreenActivate(){
      const sec = document.getElementById('screen-cards');
      if (!sec || window.MutationObserver==null) return;
      const obs = new MutationObserver(()=> {
        const active = sec.classList.contains('active');
        if (active) this.attachHotkeys();
        else this.detachHotkeys();
      });
      obs.observe(sec, { attributes:true, attributeFilter:['class'] });
      if (sec.classList.contains('active')) this.attachHotkeys();
    },

    attachHotkeys(){
      if (this.hotkeysOn) return;
      this._keyHandler = (e)=>{
        const inCards = document.getElementById('screen-cards')?.classList.contains('active');
        if (!inCards) return;
        if (!this.sessionActive){
          if (e.key==='Enter'){ this.startSession(); e.preventDefault(); }
          return;
        }
        if (e.key==='1'){ this.gradeCurrent(GRADE.HARD); e.preventDefault(); }
        if (e.key==='2'){ this.gradeCurrent(GRADE.GOOD); e.preventDefault(); }
        if (e.key==='3'){ this.gradeCurrent(GRADE.EASY); e.preventDefault(); }
        if (e.code==='Space'){ const cur = this.sessionQueue[this.sessionIdx]; if (cur) speak(cur.text); e.preventDefault(); }
        if (e.key==='ArrowRight'){ this.skipCurrent(); e.preventDefault(); }
        if (e.key==='Escape'){ this.endSession(); e.preventDefault(); }
      };
      document.addEventListener('keydown', this._keyHandler);
      this.hotkeysOn = true;
    },
    detachHotkeys(){
      if (!this.hotkeysOn) return;
      document.removeEventListener('keydown', this._keyHandler);
      this.hotkeysOn = false;
    },

    load(){
      try{
        this.cards = (window.Store ? (Store.get(KEY_CARDS) || []) : []) ;
      }catch(_){ this.cards = []; }
      this.cards.forEach(c=>{
        c.text = String(c.text||'').trim();
        c.tag = c.tag || 'general';
      });
    },
    save(){
      try{ window.Store && Store.set(KEY_CARDS, this.cards); }catch(_){}
    },

    uniqueId(text, tag){
      return `${String(text).toLowerCase()}__${String(tag).toLowerCase()}`;
    },

    // SEED: tạo thẻ ban đầu nếu rỗng
    seedIfEmpty(autoPullInbox){
      if (this.cards.length){
        if (autoPullInbox) { this.reconcile({ silent:true }); }
        return;
      }
      let added = 0;
      const now = NOW();
      const push = (text, tag='general')=>{
        const card = {
          id: this.uniqueId(text, tag),
          text, tag,
          createdAt: now,
          due: now,
          ease: 2.5,
          interval: 0,
          reps: 0,
          lapses: 0,
          history: []
        };
        this.cards.push(card); added++;
      };

      // 1) Ưu tiên window.CARDS nếu có
      if (Array.isArray(window.CARDS)){
        window.CARDS.forEach(item=>{
          if (typeof item==='string') push(item.trim());
          else if (item && typeof item==='object' && item.text){
            push(String(item.text).trim(), String(item.tag||'general').trim());
          }
        });
      } else if (window.CARDS && typeof window.CARDS==='object'){
        // object { tag: [text1, text2, ...] }
        Object.keys(window.CARDS).forEach(tag=>{
          const arr = window.CARDS[tag];
          if (Array.isArray(arr)){
            arr.forEach(txt=> { if (txt) push(String(txt).trim(), String(tag).trim()); });
          }
        });
      }

      // 2) Nếu vẫn trống, seed DEFAULT_SEED
      if (!added){
        DEFAULT_SEED.forEach(c=> push(c.text, c.tag));
      }

      // 3) Auto-pull inbox một lần
      if (autoPullInbox) this.reconcile({ silent:true });

      this.save();
    },

    populateTags(){
      const sel = document.getElementById('selCardTag');
      if (!sel) return;
      const tags = new Set(this.cards.map(c=>c.tag));
      const options = [
        { val: SPECIAL_TAG_DUE, label: 'Đến hạn' },
        { val: SPECIAL_TAG_NEW, label: 'Mới' },
        { val: SPECIAL_TAG_ALL, label: 'Tất cả' },
        ...Array.from(tags).sort().map(t=>({ val: t, label: t }))
      ];
      const cur = this.tag || SPECIAL_TAG_DUE;
      sel.innerHTML = options.map(o=> `<option value="${o.val}">${o.label}</option>`).join('');
      sel.value = cur;
    },

    setTag(tag){
      this.tag = tag || SPECIAL_TAG_DUE;
      this.renderHome();
      this.updateStatsBadge();
    },

    // Hòa nhập inbox từ Reading (cardInbox) -> cards
    // opts.silent = true để không hiện alert
    reconcile(opts){
      const silent = !!(opts && opts.silent);
      const inbox = (window.Store ? (Store.get(KEY_INBOX) || []) : []) ;
      if (!Array.isArray(inbox) || !inbox.length){
        if (!silent) alert('Không có thẻ mới trong Hộp thẻ.');
        return 0;
      }

      let added = 0;
      const index = new Map(this.cards.map(c=>[this.uniqueId(c.text,c.tag), c]));
      inbox.forEach(item=>{
        const text = String(item.text||'').trim();
        const tag = String(item.tag||'reading-misread');
        if (!text) return;
        const id = this.uniqueId(text, tag);
        if (index.has(id)) return;
        const card = {
          id,
          text, tag,
          createdAt: NOW(),
          due: NOW(), // cho vào phiên ngay
          ease: 2.5,
          interval: 0,
          reps: 0,
          lapses: 0,
          history: []
        };
        this.cards.push(card); index.set(id, card); added++;
      });

      if (added){
        this.save();
        this.populateTags();
        this.updateStatsBadge();
        this.renderHome();
        if (!silent) alert(`Đã thêm ${added} thẻ mới từ Hộp thẻ.`);
      }else if (!silent){
        alert('Không có thẻ mới để thêm.');
      }
      return added;
    },

    filterByTag(){
      const now = NOW();
      let list = this.cards.slice();
      if (this.tag === SPECIAL_TAG_DUE){
        list = list.filter(c=> (c.reps>0 && (c.due||0) <= now) || c.reps===0);
      }else if (this.tag === SPECIAL_TAG_NEW){
        list = list.filter(c=> (c.reps||0)===0);
      }else if (this.tag !== SPECIAL_TAG_ALL){
        list = list.filter(c=> c.tag===this.tag);
      }
      list.sort((a,b)=>{
        const aNew = a.reps===0, bNew = b.reps===0;
        if (aNew!==bNew) return aNew?1:-1; // ưu tiên đến hạn
        return (a.due||0) - (b.due||0);
      });
      return list;
    },

    dueCount(){
      const now = NOW();
      const due = this.cards.filter(c=> (c.reps>0 && (c.due||0)<=now)).length;
      const fresh = this.cards.filter(c=> (c.reps||0)===0).length;
      const today = this.cards.filter(c=>{
        const d = new Date(c.due || 0); const t = new Date();
        return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate();
      }).length;
      return { due, fresh, today };
    },

    updateStatsBadge(){
      const st = document.getElementById('cardStats');
      if (!st) return;
      const { due, fresh, today } = this.dueCount();
      st.textContent = `Đến hạn: ${due} • Mới: ${fresh} • Hôm nay: ${today}`;
    },

    startSession(){
      const pool = this.filterByTag();
      if (!pool.length){
        this.renderHome('<div class="help">Không có thẻ để ôn. Bấm “Cập nhật thẻ mới” hoặc chọn tag khác.</div>');
        return;
      }
      const due = pool.filter(c=> c.reps>0 && (c.due||0) <= NOW());
      const fresh = pool.filter(c=> c.reps===0);
      const q = [];
      q.push(...due.slice(0, this.sessionGoal));
      if (q.length < this.sessionGoal) q.push(...fresh.slice(0, this.sessionGoal - q.length));
      if (!q.length) q.push(...pool.slice(0, Math.min(pool.length, this.sessionGoal)));

      this.sessionQueue = q;
      this.sessionIdx = 0;
      this.sessionReviewed = 0;
      this.sessionActive = true;
      this.renderSession();
    },

    endSession(showSummary=true){
      this.sessionActive = false;
      this.sessionQueue = [];
      this.sessionIdx = 0;
      this.sessionReviewed = 0;
      this.save();
      this.updateStatsBadge();
      this.renderHome(showSummary ? '<div class="note">Đã kết thúc phiên ôn. Tuyệt vời!</div>' : '');
    },

    skipCurrent(){
      if (!this.sessionActive) return;
      this.sessionIdx = Math.min(this.sessionIdx+1, this.sessionQueue.length-1);
      this.renderSession();
    },

    gradeCurrent(grade){
      if (!this.sessionActive) return;
      const card = this.sessionQueue[this.sessionIdx];
      if (!card) return;
      if (grade===GRADE.HARD) vibrate([30,40,30]);

      card.history = card.history || [];
      card.history.push({ ts: NOW(), grade });

      schedule(card, grade);
      logReview(card, grade);

      const cont = document.getElementById('cards-container');
      if (cont){
        cont.style.transition = 'background 120ms ease-out';
        cont.style.background = (grade===GRADE.EASY?'#E9FFE9': grade===GRADE.GOOD?'#EEF6FF':'#FFECEC');
        setTimeout(()=>{ cont.style.background=''; }, 160);
      }

      this.sessionReviewed++;
      if (this.sessionIdx < this.sessionQueue.length-1){
        this.sessionIdx++;
        this.renderSession();
      }else{
        this.endSession(true);
      }
    },

    explainTag(tag){
      const tip = TAG_HINTS[tag] || `Nhóm ${tag}. Hãy nghe kỹ và đọc theo.`;
      if (window.VoiceUI && VoiceUI.enabled) { try{ VoiceUI.say(tip); }catch(_){ } }
      else speak(tip);
    },

    renderHome(extraHtml=''){
      const wrap = document.getElementById('cards-container');
      if (!wrap) return;
      this.sessionActive = false;
      wrap.innerHTML = '';

      const list = this.filterByTag();
      const { due, fresh } = this.dueCount();

      const hdr = document.createElement('div');
      hdr.className = 'row';
      const title = document.createElement('div');
      title.innerHTML = `<b>Phiên ôn</b> • Mục tiêu: ${this.sessionGoal} thẻ`;
      const spacer = document.createElement('div'); spacer.className = 'spacer';
      const btnStart = document.createElement('button');
      btnStart.className = 'primary';
      const countHint = due>0 ? Math.min(this.sessionGoal, due) : Math.min(this.sessionGoal, (fresh||list.length));
      btnStart.textContent = `Bắt đầu ôn (${countHint} thẻ)`;
      btnStart.onclick = ()=> this.startSession();
      hdr.appendChild(title); hdr.appendChild(spacer); hdr.appendChild(btnStart);
      wrap.appendChild(hdr);

      if (extraHtml){
        const msg = document.createElement('div');
        msg.innerHTML = extraHtml;
        wrap.appendChild(msg);
      }

      const preview = document.createElement('div');
      preview.className = 'section lift';
      preview.style.padding = '10px';
      const pvTitle = document.createElement('div');
      pvTitle.innerHTML = `<b>Xem nhanh</b> • Nhấn 🔊 để nghe mẫu`;
      preview.appendChild(pvTitle);

      const chips = document.createElement('div');
      chips.style.display = 'flex';
      chips.style.flexWrap = 'wrap';
      chips.style.gap = '8px';
      (list.slice(0, Math.min(18, list.length))).forEach(c=>{
        const chip = document.createElement('div');
        chip.style.border = '1px solid var(--line,#ddd)';
        chip.style.padding = '4px 8px';
        chip.style.borderRadius = '999px';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.fontWeight = '600';
        chip.style.letterSpacing = '0.04em';
        chip.style.wordSpacing = '0.12em';
        chip.style.cursor = 'default';

        const w = document.createElement('span');
        w.textContent = c.text;
        const btn = document.createElement('button');
        btn.className = 'tts';
        btn.style.marginLeft = '6px';
        btn.textContent = '🔊';
        btn.setAttribute('aria-label', `Nghe ${c.text}`);
        btn.onclick = ()=> speak(c.text);

        chip.title = TAG_HINTS[c.tag] || c.tag;
        chip.appendChild(w); chip.appendChild(btn);
        chips.appendChild(chip);
      });

      if (!list.length){
        const empty = document.createElement('div');
        empty.className = 'help';
        empty.textContent = 'Chưa có thẻ để hiển thị. Bấm “Cập nhật thẻ mới” hoặc chọn tag khác.';
        preview.appendChild(empty);
      }
      preview.appendChild(chips);
      wrap.appendChild(preview);
    },

    renderSession(){
      const wrap = document.getElementById('cards-container');
      if (!wrap) return;
      wrap.innerHTML = '';

      const total = this.sessionQueue.length;
      const idx = this.sessionIdx;
      const card = this.sessionQueue[idx];

      const head = document.createElement('div');
      head.className = 'row';
      const back = document.createElement('button');
      back.className = 'ghost'; back.textContent = '← Kết thúc';
      back.setAttribute('data-voice', 'Kết thúc phiên');
      back.onclick = ()=> this.endSession(false);
      const title = document.createElement('div');
      title.innerHTML = `<b>Thẻ ${idx+1}/${total}</b>`;
      const spacer = document.createElement('div'); spacer.className = 'spacer';
      const prog = document.createElement('div');
      prog.style.flex = '0 0 160px';
      prog.style.height = '8px'; prog.style.borderRadius='4px'; prog.style.background='#eee';
      const bar = document.createElement('div');
      bar.style.height = '100%'; bar.style.borderRadius='4px';
      bar.style.background = 'linear-gradient(90deg, #8CE99A, #4DABF7)';
      bar.style.width = `${Math.max(5, Math.round((idx+1)/Math.max(1,total)*100))}%`;
      prog.appendChild(bar);

      head.appendChild(back); head.appendChild(title); head.appendChild(spacer); head.appendChild(prog);
      wrap.appendChild(head);

      const cardBox = document.createElement('div');
      cardBox.className = 'section lift';
      cardBox.style.textAlign = 'center';
      cardBox.style.padding = '18px';
      cardBox.style.userSelect = 'none';

      const word = document.createElement('div');
      word.textContent = card.text;
      word.style.fontSize = '38px';
      word.style.fontWeight = '800';
      word.style.letterSpacing = '0.06em';
      word.style.wordSpacing = '0.18em';
      word.style.lineHeight = '1.25';
      word.style.margin = '10px 0 8px 0';

      const tagLine = document.createElement('div');
      tagLine.style.opacity = '0.85';
      tagLine.style.fontSize = '14px';
      tagLine.textContent = `Nhóm: ${card.tag}`;
      tagLine.title = TAG_HINTS[card.tag] || card.tag;

      const controls = document.createElement('div');
      controls.className = 'inline-buttons';
      controls.style.marginTop = '12px';

      const btnListen = document.createElement('button');
      btnListen.className = 'tts';
      btnListen.textContent = '🔊 Nghe';
      btnListen.onclick = ()=> speak(card.text);

      const btnExplain = document.createElement('button');
      btnExplain.className = 'ghost';
      btnExplain.textContent = '❓ Giải thích';
      btnExplain.onclick = ()=> this.explainTag(card.tag);

      cardBox.appendChild(word);
      cardBox.appendChild(tagLine);
      controls.appendChild(btnListen);
      controls.appendChild(btnExplain);
      cardBox.appendChild(controls);
      wrap.appendChild(cardBox);

      const gradeBox = document.createElement('div');
      gradeBox.className = 'row';
      gradeBox.style.justifyContent = 'center';
      gradeBox.style.gap = '12px';

      const bHard = document.createElement('button');
      bHard.textContent = 'Khó (1)';
      bHard.className = 'danger';
      bHard.style.minWidth = '110px';
      bHard.onclick = ()=> this.gradeCurrent(GRADE.HARD);

      const bGood = document.createElement('button');
      bGood.textContent = 'Vừa (2)';
      bGood.className = 'hint';
      bGood.style.minWidth = '110px';
      bGood.onclick = ()=> this.gradeCurrent(GRADE.GOOD);

      const bEasy = document.createElement('button');
      bEasy.textContent = 'Dễ (3)';
      bEasy.className = 'primary';
      bEasy.style.minWidth = '110px';
      bEasy.onclick = ()=> this.gradeCurrent(GRADE.EASY);

      gradeBox.appendChild(bHard);
      gradeBox.appendChild(bGood);
      gradeBox.appendChild(bEasy);
      wrap.appendChild(gradeBox);

      const hint = document.createElement('div');
      hint.className = 'help';
      hint.style.textAlign = 'center';
      hint.textContent = 'Phím tắt: 1=Khó, 2=Vừa, 3=Dễ, Space=Nghe, →=Bỏ qua, Esc=Kết thúc';
      wrap.appendChild(hint);
    }
  };

  window.CardsModule = CardsModule;
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> CardsModule.init());
  }else{
    CardsModule.init();
  }
})();
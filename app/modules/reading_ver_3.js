/* MODULE: READING – 4 bước + B5 xem kết quả, ghi âm tự động, 1-minute reading,
   gợi ý lỗi, hiển thị đoạn dễ đọc (B2, có highlight từ đúng/sai nếu có ASR),
   đánh dấu từ (B3), ước tính WCPM/% (nếu có ASR), thanh luyện từ sai,
   micro-prompt khi im lặng, màn Xem kết quả (B5), và thanh trợ giúp B2:
   Spotlight/Tricky/Echo/Pacer + No-guess prompt.
   NÂNG CẤP: 
   - B1: Ẩn “🔀 Ngẫu nhiên” vào menu kebab.
   - B2: Sticky bar chỉ 3 nút lớn Start → Stop → 🔊 Nghe đoạn; di chuyển ghi âm sang menu phụ; 
         Spotlight theo “Nhóm từ/Câu”, chọn độ dày Focus-line, Chunk reveal tùy chọn.
   - Stats throttle ~1.2s khi đang đọc; cập nhật tức thời khi thao tác.
   - B3: dấu “˜” cạnh token đã đánh; thêm nút “Hoàn tác”.
   - B4: phân trang từng câu, lựa chọn dạng radio lớn + âm báo khi chọn. */
window.ReadingModule = {
  // Trạng thái chung
  level: (window.AppState && window.AppState.learner && window.AppState.learner.level) || 1,

  passage: null,

  // Phiên đọc
  started: false,
  startTime: 0,
  timerId: null,
  usedTTS: 0,

  // 1-minute reading
  timedOneMinute: true,
  _autoStopId: null,

  // Đánh dấu thủ công
  markModeState: 'normal',
  errors: {},               // { idx: {type: 'tone'|'sx'|'chtr'|'omission'|'insertion'|'other'} }
  tokenElems: [],           // B3
  readTokenElems: [],       // B2 (token dạng không bấm, để highlight)
  b2Status: [],             // 'unknown' | 'wrong' | 'correct' (trạng thái bền)

  // Nhận dạng & âm thanh
  asr: null,
  asrText: '',
  asrLiveText: '',
  asrAvailable: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  audioMutedDuringRec: false,
  prevVoiceUIEnabled: true,
  _lastASRAt: 0,           // micro-prompt theo im lặng

  // Lưu tạm kết quả phiên (dùng khi gửi log)
  _sessionTemp: null,
  _errTarget: null,
  _currentStep: 1,
  _step5Ready: false,
  _lastComp: null,          // lưu lựa chọn/điểm hiểu ở B4 để hiển thị ở B5

  // Trợ giúp B2
  _spotOn: null,
  _spotWidth: 4,
  _spotIdxManual: null,
  _pacerOn: false,
  _pacerWPM: 80,
  _pacerTid: null,
  _echoOn: false,
  _echoIdx: 0,
  _noGuessLastTs: 0,

  // Spotlight nâng cấp
  _spotMode: 'chunk',       // 'chunk' | 'sentence'
  _lineRanges: [],          // [{start,end}] cho mỗi reading-line
  _focusThickness: 'medium',// 'thin'|'medium'|'thick'

  // Chunk reveal
  _chunkOn: false,
  _chunkSize: 4,
  _chunkTid: null,

  // Stats throttle
  _lastStatAt: 0,
  _statThrottleMs: 1200,

  // B3 undo
  _markHistory: [],

  // B4 pagination
  _qIdx: 0,
  _chosen: [],

  // Tiện ích
  wordSplit(text){
    if (window.wordsOf) return window.wordsOf(text);
    // fallback: tách theo khoảng trắng, giữ nguyên trật tự, bỏ rỗng
    return String(text||'').replace(/\n+/g,' ').trim().split(/\s+/).filter(Boolean);
  },
  normalizeText(s){ return String(s||'').toLowerCase().replace(/[.,!?;:"“”()…]/g,'').trim(); },

  /* ========== Khởi tạo ========== */
  init(){
    if (this._initialized) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ()=> this.init());
      return;
    }
    this._initialized = true;

    this.ensureStep5Exists(); // chuẩn bị B5

    // Đổ danh sách cấp độ
    const src = Array.isArray(window.PASSAGES) ? window.PASSAGES : [];
    const sel = document.getElementById('selLevel');

    if (sel) {
      if (src.length){
        const levels = Array.from(new Set(src.map(p=>p.level))).sort((a,b)=>a-b);
        sel.innerHTML = levels.map(l=> `<option value="${l}">Cấp ${l}</option>`).join('');
        if (!this.level) this.level = levels[0];
        sel.value = String(this.level);
      }else{
        sel.innerHTML = '<option value="">—</option>';
      }
    }

    this.chooseLevel(this.level);
    this.goStep(1);

    // Đảm bảo các bước có nút quay lại (fallback nếu HTML thiếu)
    this.ensureBackButtons();

    // Reset chỉ số
    this.errors = {};
    const sW = document.getElementById('statWCPM'); if (sW) sW.textContent='—';
    const sA = document.getElementById('statAcc'); if (sA) sA.textContent='—';
    const t = document.getElementById('timer'); if (t) t.textContent='00:00';

    // Child mode → bật “1 dòng” & Spotlight mặc định
    if (window.AppState && AppState.childMode) {
      this.ensureFocusOn(true);
      this._spotOn = true;
    }
    this.markModeState = (window.AppState && AppState.childMode) ? 'error' : 'normal';

    // Làm gọn UI theo yêu cầu
    this.enhanceStep1UI();
    this.enhanceStep2UI();
    this.enhanceStep3UI();
  },

  /* ========== Điều hướng ========== */
  goStep(n){
    if ((n===3 || n===4 || n===5) && this.started){
      if (!confirm('Bạn đang trong phiên đọc. Dừng phiên và chuyển sang bước tiếp?')) return;
      try{ this.stop(); }catch(_){ /* ignore */ }
    }
    this.ensureStep5Exists();
    const ids = ['readStep1','readStep2','readStep3','readStep4','readStep5'];
    ids.forEach((id,idx)=>{
      const el = document.getElementById(id);
      if (el) el.style.display = (idx===(n-1)) ? '' : 'none';
    });
    this._currentStep = n; this.updateStepper(n);

    if (n===2) { this.renderPlainPassage(); this.enhanceStep2UI(); }    // B2
    if (n===3) { this.renderPassageTokens(); this.injectPracticeBar(); this.enhanceStep3UI(); } // B3
    if (n===4) { this.renderQuestions(); }       // B4
    if (n===5) this.renderResults();             // B5

    // Fallback đảm bảo nút quay lại (nếu HTML thiếu)
    this.ensureBackButtons();

    const msg = {
      1:'Chọn cấp độ và bài, rồi bấm Tiếp tục.',
      2:'Bấm Bắt đầu để tính giờ. Đọc to, sau đó bấm Kết thúc.',
      3:'Đánh dấu từ sai hoặc chọn loại lỗi.',
      4:'Chọn đáp án rồi bấm Xem kết quả.',
      5:'Xem kết quả và đáp án. Có thể nghe lại đoạn.'
    }[n];
    if (window.VoiceUI && typeof VoiceUI.say === 'function') VoiceUI.say(msg || '');
  },
  updateStepper(step){
    const box = document.getElementById('readSteps');
    if (!box) return;
    // Đảm bảo có bước 5
    if (!box.querySelector('.step[data-step="5"]')){
      const s = document.createElement('div');
      s.className = 'step'; s.setAttribute('data-step','5');
      s.innerHTML = '<span>5</span> Kết quả';
      box.appendChild(s);
    }
    Array.from(box.querySelectorAll('.step')).forEach(el=>{
      el.classList.toggle('active', String(el.getAttribute('data-step'))===String(step));
    });
  },

  ensureBackButtons(){
    const cfg = { readStep2:1, readStep3:2, readStep4:3 };
    Object.entries(cfg).forEach(([secId, prev])=>{
      const sec = document.getElementById(secId);
      if (!sec) return;
      const existedAttr = sec.querySelector(`button[onclick*="App.reading.goStep(${prev})"]`);
      const existedInjected = sec.querySelector(`button[data-back-btn="1"][data-prev-step="${prev}"]`);
      if (existedAttr) {
        existedAttr.setAttribute('data-back-btn','1');
        existedAttr.setAttribute('data-prev-step', String(prev));
        return;
      }
      if (existedInjected) return;

      const back = document.createElement('button');
      back.className = 'ghost';
      back.textContent = '← Quay lại';
      back.setAttribute('data-voice','Quay lại bước trước');
      back.setAttribute('data-back-btn','1');
      back.setAttribute('data-prev-step', String(prev));
      back.setAttribute('onclick', `App.reading.goStep(${prev})`);
      const firstRow = sec.querySelector('.row');
      if (firstRow) firstRow.insertBefore(back, firstRow.firstChild);
      else sec.insertBefore(back, sec.firstChild);
    });
  },

  /* ========== Làm gọn UI B1/B2/B3 theo yêu cầu ========== */
  enhanceStep1UI(){
    // Ẩn nút “🔀 Ngẫu nhiên” → chuyển vào menu kebab
    const rs1 = document.getElementById('readStep1');
    if (!rs1) return;
    const btnRnd = rs1.querySelector('button[onclick*="App.reading.randomPassage"]');
    if (btnRnd) btnRnd.style.display = 'none';

    // Chèn nút “⋮ Thêm” nếu chưa có
    if (!rs1.querySelector('#btnStep1More')){
      const row = rs1.querySelector('.row');
      if (row){
        const wrap = document.createElement('span'); wrap.className='kebab';
        const b = document.createElement('button'); b.id='btnStep1More'; b.className='ghost'; b.textContent='⋮ Thêm';
        const menu = document.createElement('div'); menu.className='kebab-menu'; menu.style.display='none';
        const it1 = document.createElement('button'); it1.className='ghost'; it1.textContent='🔀 Chọn bài ngẫu nhiên';
        it1.onclick = ()=>{ this.randomPassage(); menu.style.display='none'; };
        menu.appendChild(it1);
        wrap.append(b, menu);
        row.appendChild(wrap);
        b.onclick = ()=>{
          menu.style.display = (menu.style.display==='none' || !menu.style.display) ? 'block' : 'none';
          setTimeout(()=> document.addEventListener('click', hideOnce, { once: true }), 0);
          function hideOnce(ev){ if (!wrap.contains(ev.target)) menu.style.display='none'; }
        };
      }
    }
  },

  enhanceStep2UI(){
    const rs2 = document.getElementById('readStep2');
    if (!rs2) return;
    // Ẩn nút “← Quay lại” ở hàng sticky đầu tiên (đã có hàng quay lại ở dưới)
    const firstRow = rs2.querySelector('.row');
    if (firstRow){
      const backBtn = firstRow.querySelector('button[onclick*="App.reading.goStep(1)"]');
      if (backBtn) backBtn.style.display = 'none';

      // Chỉ giữ 3 nút lớn: Bắt đầu → Kết thúc → 🔊 Nghe đoạn; Ẩn nút “Ghi âm”
      const btnStart = document.getElementById('btnStartRead');
      const btnStop  = document.getElementById('btnStopRead');
      const btnTTS   = rs2.querySelector('button.tts[onclick*="App.reading.speakPassage"]');
      const btnRec   = document.getElementById('btnRec');
      if (btnRec) btnRec.style.display = 'none';
      if (btnStart) btnStart.classList.add('button-lg', 'primary');
      if (btnStop)  btnStop.classList.add('button-lg', 'danger');
      if (btnTTS)   btnTTS.classList.add('button-lg', 'tts');

      // Stats chip lớn
      const wChip = document.getElementById('statWCPM')?.closest('.stat');
      const aChip = document.getElementById('statAcc')?.closest('.stat');
      if (wChip) wChip.classList.add('lg');
      if (aChip) aChip.classList.add('lg');
    }
  },

  enhanceStep3UI(){
    // Mặc định bật “Đánh dấu lỗi”
    this.markMode('error');

    // Thêm nút Hoàn tác ở hàng công cụ B3 nếu chưa có
    const rs3 = document.getElementById('readStep3');
    if (!rs3) return;
    const row = rs3.querySelector('.row');
    if (row && !row.querySelector('#btnUndoMark')){
      const spacer = document.createElement('div'); spacer.className='spacer';
      // Đặt spacer trước nhóm nút xoá/tiếp theo để tách xa
      const btnErr = document.getElementById('btnErr');
      if (btnErr && btnErr.nextSibling) row.insertBefore(spacer, btnErr.nextSibling);

      const btnUndo = document.createElement('button');
      btnUndo.id='btnUndoMark'; btnUndo.className='ghost';
      btnUndo.textContent='↩️ Hoàn tác';
      btnUndo.onclick = ()=> this.undoMark();
      // chèn trước nút Xóa dấu
      const btnClear = row.querySelector('button[onclick*="clearMarks"]');
      if (btnClear) row.insertBefore(btnUndo, btnClear);
      else row.appendChild(btnUndo);
    }
  },

  /* ========== B1: chọn cấp/bài ========== */
  listByLevel(lv){
    const src = Array.isArray(window.PASSAGES) ? window.PASSAGES : [];
    return src.filter(p=>p.level===+lv);
  },
  chooseLevel(lv){
    this.level = +lv || this.level || 1;
    const list = this.listByLevel(this.level);
    const selP = document.getElementById('selPassage');
    if (selP){
      selP.innerHTML = '';
      list.forEach(p=>{
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.id;
        selP.appendChild(opt);
      });
      if (list[0]) selP.value = list[0].id;
    }
    this.choosePassage(selP?.value || (list[0]?.id) || null);
  },
  choosePassage(id){
    const list = this.listByLevel(this.level);
    this.passage = list.find(p => p.id===id) || list[0] || (window.PASSAGES && window.PASSAGES[0]) || { id:'p_na', level:this.level, text:'', questions:[] };
    this.renderPlainPassage();
    this.renderPassageTokens();
  },
  randomPassage(){
    const list = this.listByLevel(this.level);
    if (!list.length) return;
    let pick = list[Math.floor(Math.random()*list.length)];
    if (this.passage && list.length>1){
      for (let i=0;i<5 && pick.id===this.passage.id;i++) pick = list[Math.floor(Math.random()*list.length)];
    }
    this.passage = pick;
    const selP = document.getElementById('selPassage'); if (selP) selP.value = pick.id;
    this.renderPlainPassage(); this.renderPassageTokens();
  },

  /* ========== B2: hiển thị đoạn (token để highlight) ========== */
  renderPlainPassage(){
    const el = document.getElementById('passageText');
    if (!el) return;
    const text = String(this.passage?.text || '').trim();
    // Chia câu rõ ràng; tôn trọng xuống dòng
    const parts = text.split(/([.!?…]+)\s+|\n+/u).filter(Boolean);
    el.innerHTML = '';
    this.readTokenElems = [];
    this._lineRanges = [];
    let globalIdx = 0;
    let buffer = '';

    const flushLine = ()=>{
      if (!buffer.trim()) return;
      const line = document.createElement('div');
      line.className = 'reading-line';
      const words = this.wordSplit(buffer);
      const start = globalIdx;
      for (let k=0;k<words.length;k++){
        const span = document.createElement('span');
        span.textContent = words[k];
        span.style.padding = '1px 2px';
        span.style.borderRadius = '4px';
        span.style.transition = 'background 0.2s, box-shadow 0.2s, outline 0.2s, border-bottom-color 0.2s, opacity .2s';
        line.appendChild(span);
        this.readTokenElems[globalIdx++] = span;
        if (k < words.length-1) line.appendChild(document.createTextNode(' '));
      }
      el.appendChild(line);
      this._lineRanges.push({ start, end: globalIdx });
      buffer = '';
    };

    for (let i=0;i<parts.length;i++){
      const p = parts[i];
      if (/^[.!?…]+$/.test(p)) {
        buffer += p;
        flushLine();
      } else if (/\n/.test(p)) {
        flushLine();
      } else {
        buffer += (buffer ? ' ' : '') + p;
      }
    }
    flushLine();

    this.applyFocusMask();
    // reset highlight khi đổi bài
    this.clearB2Styles();

    // Chèn thanh trợ giúp B2 (Spotlight/Tricky/Echo/Pacer) + nâng cấp
    this.ensureB2AssistBar();
    // Cập nhật Spotlight lúc đầu
    this.updateSpotlight();
  },

  /* ========== B3: hiển thị đoạn bấm‑được ========== */
  renderPassageTokens(){
    const view = document.getElementById('passageView');
    if (!view) return;
    view.innerHTML = '';
    const tokens = this.wordSplit(this.passage.text);
    this.tokenElems = tokens.map((w,i)=>{
      const span = document.createElement('span');
      span.className = 'token ' + (window.toneClass ? window.toneClass(w) : '');
      span.textContent = w + ' ';
      span.dataset.idx = i;
      span.setAttribute('role','button');
      span.setAttribute('aria-pressed','false');
      span.tabIndex = 0;
      span.onclick = () => this.onTokenClick(i, span);
      span.onkeydown = (e)=>{ if (e.key===' '|| e.key==='Enter'){ e.preventDefault(); this.onTokenClick(i, span); } };
      span.oncontextmenu = (e)=> { e.preventDefault(); this.openErrMenu(i); };
      span.onpointerdown = ()=> {
        if (!this.audioMutedDuringRec && window.VoiceUI && VoiceUI.enabled && window.TTS) {
          TTS.speak(w, (window.AppState && AppState.learner && AppState.learner.ttsRate) || 0.9);
        }
      };
      view.appendChild(span);
      return span;
    });
    // Áp lại các từ sai từ B2
    Object.keys(this.errors).forEach(k=>{
      const idx = +k; const el = this.tokenElems[idx];
      if (el) { el.style.outline = '3px solid var(--danger)'; el.classList.add('marked'); el.setAttribute('aria-pressed','true'); }
    });
    this.applyFocusMask();
  },

  /* ========== Thanh công cụ ở B3: Luyện từ sai / Đưa vào Thẻ từ + Hoàn tác ========== */
  injectPracticeBar(){
    const view = document.getElementById('passageView');
    if (!view) return;
    if (document.getElementById('misreadTools')) return;
    const host = view.parentElement || view;

    const bar = document.createElement('div');
    bar.id = 'misreadTools';
    bar.className = 'row';
    bar.style.margin = '6px 0';

    const btnPractice = document.createElement('button');
    btnPractice.textContent = '🔁 Luyện từ sai';
    btnPractice.onclick = ()=>{
      const words = Object.keys(this.errors)
        .map(i => (this.tokenElems[+i]?.textContent || '').trim())
        .map(s => s.replace(/\s+$/,''))
        .filter(Boolean);
      if (!words.length) { alert('Chưa có từ sai để luyện.'); return; }
      if (window.TTS){
        words.forEach((w,k)=> setTimeout(()=> TTS.speak(w, (window.AppState && AppState.learner && AppState.learner.ttsRate)||0.9), k*700));
      }
    };

    const btnCards = document.createElement('button');
    btnCards.className = 'ghost';
    btnCards.textContent = '➕ Đưa vào Thẻ từ';
    btnCards.onclick = ()=>{
      const words = Object.keys(this.errors)
        .map(i => (this.tokenElems[+i]?.textContent || '').trim())
        .map(s => s.replace(/\s+$/,''))
        .filter(Boolean);
      if (!words.length) { alert('Chưa có từ sai.'); return; }
      const inbox = (window.Store ? Store.get('cardInbox') : null) || [];
      const items = words.map(w=>({ text:w, tag:'reading-misread' }));
      if (window.Store) Store.set('cardInbox', inbox.concat(items));
      alert('Đã đưa từ sai vào Hộp thẻ. Vào Thẻ từ → “Cập nhật thẻ mới”.');
    };

    const spacer = document.createElement('div'); spacer.className='spacer';

    const btnUndo = document.createElement('button');
    btnUndo.id='btnUndoMark2'; btnUndo.className='ghost';
    btnUndo.textContent = '↩️ Hoàn tác';
    btnUndo.onclick = ()=> this.undoMark();

    bar.appendChild(btnPractice);
    bar.appendChild(btnCards);
    bar.appendChild(spacer);
    bar.appendChild(btnUndo);
    host.insertBefore(bar, view);
  },

  /* ========== Chế độ 1 dòng cho B2 & B3 ========== */
  ensureFocusOn(forceOn){
    const root = document.documentElement;
    if (forceOn){
      document.body.classList.add('read-focus-on');
      // Ánh xạ độ dày
      const h = this._focusThickness==='thin' ? '2.2em' : (this._focusThickness==='thick' ? '3.0em' : '2.6em');
      root.style.setProperty('--focus-h', h);
    } else {
      document.body.classList.remove('read-focus-on');
    }
  },
  applyFocusMask(){
    const btnF = document.getElementById('btnFocusLine');
    const isOn = btnF && (btnF.dataset?.focusOn === '1' || /Bật$/.test(btnF.textContent || ''));
    if (isOn) this.ensureFocusOn(true);
    else this.ensureFocusOn(false);
  },

  /* ========== Đánh dấu lỗi thủ công (B3) ========== */
  clearMarks(){
    this.errors = {};
    this._markHistory = [];
    for (const el of this.tokenElems) { if (!el) continue; el.style.outline = 'none'; el.classList.remove('marked'); el.setAttribute('aria-pressed','false'); }
    const sW = document.getElementById('statWCPM'); if (sW) sW.textContent='—';
    const sA = document.getElementById('statAcc'); if (sA) sA.textContent='—';
  },
  onTokenClick(i, el){
    if (this.markModeState!=='error') return;
    const before = { marked: !!this.errors[i], type: this.errors[i]?.type || null };
    if (this.errors[i]) {
      delete this.errors[i];
      el.style.outline = 'none'; el.classList.remove('marked'); el.setAttribute('aria-pressed','false');
    }
    else {
      this.errors[i] = { type: 'other' };
      el.style.outline = '3px solid var(--danger)'; el.classList.add('marked'); el.setAttribute('aria-pressed','true');
    }
    const after = { marked: !!this.errors[i], type: this.errors[i]?.type || null };
    this._markHistory.push({ idx:i, before, after });
    this.updateStatsLive(true);
  },
  undoMark(){
    const step = this._markHistory.pop();
    if (!step) return;
    const i = step.idx;
    if (step.before.marked){
      this.errors[i] = { type: step.before.type || 'other' };
      const el = this.tokenElems[i]; if (el){ el.style.outline='3px solid var(--danger)'; el.classList.add('marked'); el.setAttribute('aria-pressed','true'); }
    }else{
      delete this.errors[i];
      const el = this.tokenElems[i]; if (el){ el.style.outline='none'; el.classList.remove('marked'); el.setAttribute('aria-pressed','false'); }
    }
    this.updateStatsLive(true);
  },
  openErrMenu(i){
    if (this.markModeState!=='error') return;
    this._errTarget = i;
    const em = document.getElementById('errorMenu');
    if (em) em.classList.add('active');
  },
  setErrType(t){
    if (this._errTarget==null) return;
    const before = { marked: !!this.errors[this._errTarget], type: this.errors[this._errTarget]?.type || null };
    this.errors[this._errTarget] = { type: t };
    const el = this.tokenElems[this._errTarget]; if (el) { el.style.outline = '3px solid var(--danger)'; el.classList.add('marked'); el.setAttribute('aria-pressed','true'); }
    const em = document.getElementById('errorMenu');
    if (em) em.classList.remove('active');
    const after = { marked: !!this.errors[this._errTarget], type: this.errors[this._errTarget]?.type || null };
    this._markHistory.push({ idx:this._errTarget, before, after });
    this.updateStatsLive(true);
  },
  markMode(mode){
    this.markModeState = mode;
    const be = document.getElementById('btnErr'); const bn = document.getElementById('btnNorm');
    if (be) be.className = mode==='error'? 'hint' : 'ghost';
    if (bn) bn.className = mode==='normal'? 'hint' : 'ghost';
    if (window.VoiceUI && typeof VoiceUI.say === 'function') {
      VoiceUI.say(mode==='error' ? 'Đang ở chế độ đánh dấu lỗi' : 'Đang ở chế độ bình thường');
    }
  },

  /* ========== Ghi âm & tắt âm khác khi ghi ========== */
  muteAllAudio(on){
    this.audioMutedDuringRec = !!on;
    try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(_){}
    if (on){
      this.prevVoiceUIEnabled = (window.VoiceUI ? VoiceUI.enabled : true);
      if (window.VoiceUI) VoiceUI.enabled = false;
    }else{
      if (window.VoiceUI) VoiceUI.enabled = this.prevVoiceUIEnabled;
    }
  },

  /* ========== Đồng hồ & micro-prompt ========== */
  updateTimer(){
    if (!this.started) return;
    const elapsed = window.__now() - this.startTime;
    const t = document.getElementById('timer');
    if (t){
      const sec = Math.floor(elapsed/1000);
      const mm = String(Math.floor(sec/60)).padStart(2,'0');
      const ss = String(sec%60).padStart(2,'0');
      t.textContent = `${mm}:${ss}`;
    }
    // micro-prompt nếu im lặng quá 10s khi đang bật ASR
    if (this.asr && window.__now() - this._lastASRAt > 10000){
      this._lastASRAt = window.__now();
      if (window.VoiceUI && VoiceUI.enabled) {
        try { VoiceUI.say('Em thử đọc tiếp câu này nhé.'); } catch(_){}
      }
    }
    // cập nhật thống kê (throttle)
    this.updateStatsLive();

    this.timerId = setTimeout(()=>this.updateTimer(), 250);
  },

  /* ========== Bắt đầu/Kết thúc ========== */
  start(){
    if (this.started) return;
    this.started = true; this.startTime = window.__now(); this.errors = {};
    this.asrText = ''; this.asrLiveText = '';
    this.clearB2Styles();
    this.b2Status = new Array(this.wordSplit(this.passage.text).length).fill('unknown');
    this._spotIdxManual = null; // để Spotlight bám theo tiến trình lúc đọc

    this.updateTimer();

    // UI nút
    const bs = document.getElementById('btnStartRead');
    const be = document.getElementById('btnStopRead');
    const br = document.getElementById('btnRec');
    if (bs) bs.disabled = true; if (be) be.disabled = false;

    // Tắt mọi nguồn âm khác khi ghi
    this.muteAllAudio(true);

    // Recorder fallback
    if (!window.Recorder) {
      (function(){
        let mediaRecorder = null;
        let chunks = [];
        let lastBlob = null;
        let recording = false;
        let streamRef = null;

        async function startRec(maxMs = 600000){
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef = s;
          mediaRecorder = new MediaRecorder(s);
          chunks = [];
          mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
          mediaRecorder.onstop = ()=> {
            lastBlob = new Blob(chunks, { type: 'audio/webm' });
            try { streamRef && streamRef.getTracks().forEach(t=>t.stop()); } catch(_){}
          };
          mediaRecorder.start();
          recording = true;
          setTimeout(()=>{ if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); recording=false; }, maxMs);
        }

        window.Recorder = {
          get recording(){ return !!recording; },
          get lastBlob(){ return lastBlob; },
          async toggle(maxMs){
            if (!recording) {
              await startRec(maxMs);
            } else {
              if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
              recording = false;
            }
          },
          stop(){
            if (mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop();
            recording = false;
          },
          play(){
            if (!lastBlob) return alert('Chưa có bản ghi');
            const url = URL.createObjectURL(lastBlob);
            const a = new Audio(url);
            a.play();
          }
        };
      })();
    }

    // Bắt đầu ghi âm
    (async ()=>{
      try{
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Micro không sẵn có');
        if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost'){
          throw new Error('Cần HTTPS hoặc localhost để dùng micro');
        }
        if (!window.Recorder?.recording){
          await window.Recorder.toggle(600000); // tối đa 10 phút
          if (br) br.textContent = 'Đang ghi... Nhấn để dừng';
        }
      }catch(err){
        console.warn('Không thể ghi âm:', err);
        try{ alert('Không thể truy cập micro. Vui lòng cấp quyền micro và dùng HTTPS hoặc localhost.'); }catch(_){}
      }
    })();

    // Bật ASR (nếu khả dụng) để highlight theo thời gian thực
    if (this.asrAvailable){
      try{
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR){
          this.asr = new SR();
          this.asr.lang = 'vi-VN';
          this.asr.interimResults = true;
          this.asr.continuous = true;
          this._lastASRAt = window.__now();
          this.asr.onresult = (e)=>{
            // tích lũy final + interim để so khớp
            let interim = '';
            for (let i=e.resultIndex;i<e.results.length;i++){
              const seg = e.results[i][0].transcript || '';
              if (e.results[i].isFinal) {
                this.asrText += (seg + ' ');
                this._lastASRAt = window.__now();
              } else {
                interim += seg + ' ';
                this._lastASRAt = window.__now();
              }
            }
            this.asrLiveText = (this.asrText + ' ' + interim).trim();
            this.updateLiveHighlight(); // sẽ kéo Spotlight theo tiến trình
          };
          this.asr.onend = ()=>{
            if (this.started && this.asr) { try{ this.asr.start(); }catch(_){ } }
          };
          this.asr.start();
        }
      }catch(e){ console.warn('ASR start failed', e); /* bỏ qua nếu bị chặn */ }
    }

    // 1-minute auto stop
    if (this.timedOneMinute){
      this._autoStopId = setTimeout(()=>{ if (this.started) this.stop(); }, 60000);
    }

    this.markModeState = 'error';
    const b1 = document.getElementById('btnErr'); const b2 = document.getElementById('btnNorm');
    if (b1) b1.className = 'hint'; if (b2) b2.className = 'ghost';
    if (window.VoiceUI && typeof VoiceUI.say === 'function') VoiceUI.say('Bắt đầu tính giờ. Cố gắng đọc đều nhé.');
  },

  stop(){
    if (!this.started) return;
    this.started = false; clearTimeout(this.timerId);
    if (this._autoStopId){ clearTimeout(this._autoStopId); this._autoStopId = null; }

    // Dừng ghi âm
    try{
      if (window.Recorder?.recording) {
        Recorder.stop();
        const br = document.getElementById('btnRec'); if (br) br.textContent = 'Nghe lại bản ghi';
      }
    }catch(e){ console.warn('Recorder stop error', e); }

    // Dừng ASR
    try{ if (this.asr){ this.asr.onend=null; this.asr.stop(); this.asr=null; } }catch(e){ console.warn('ASR stop error', e); }

    // Bật lại âm thanh
    this.muteAllAudio(false);

    const bs = document.getElementById('btnStartRead'); const be = document.getElementById('btnStopRead');
    if (bs) bs.disabled = false; if (be) be.disabled = true;

    // Tính toán tự động nếu có ASR; nếu không, giữ “—” và sang B3 đánh dấu thủ công
    const dur = window.__now() - this.startTime;
    const expected = this.wordSplit(this.passage.text);
    let correct = null;

    const finalizeWithTranscript = (transcriptText)=>{
      if (!transcriptText) {
        const sW = document.getElementById('statWCPM'); if (sW) sW.textContent = '—';
        const sA = document.getElementById('statAcc'); if (sA) sA.textContent = '—';
        this._sessionTemp = { dur, total: expected.length, correct: expected.length, wcpm: 0, acc: 0 };
        if (window.VoiceUI && typeof VoiceUI.say === 'function') VoiceUI.say('Đã dừng. Hãy sang bước 3 để đánh dấu lỗi.');
        return;
      }
      const rec = this.wordSplit(this.normalizeText(transcriptText));
      const matched = this.lcsLength(expected.map(this.normalizeText), rec);
      correct = matched;
      const total = expected.length;
      const minutes = Math.max(0.5, dur/60000); // ràng buộc tối thiểu 30s để số ổn định hơn
      const wcpm = Math.round(correct / minutes);
      const acc = total ? +(correct/total).toFixed(3) : 0;
      this._sessionTemp = { dur, total, correct, wcpm, acc, auto:true, asrText: transcriptText };

      const sW = document.getElementById('statWCPM'); if (sW) sW.textContent = wcpm;
      const sA = document.getElementById('statAcc'); if (sA) sA.textContent = (acc*100).toFixed(0) + '%';
      if (window.VoiceUI && typeof VoiceUI.say === 'function') VoiceUI.say(`Đã dừng. Tốc độ ${wcpm} từ một phút. Chính xác ${Math.round(acc*100)} phần trăm.`);

      // Gợi ý lỗi nhẹ (đánh dấu nghi ngờ) để hỗ trợ B3 (bổ sung vào errors nếu chưa có)
      this.suggestFromTranscript(expected, transcriptText);
    };

    // Nếu có transcript từ WebSpeech
    if (this.asrText && this.asrText.trim()){
      finalizeWithTranscript(this.asrText);
    } else {
      // Nếu không có ASR nhưng có ghi âm và có URL upload để chuyển giọng → text
      const uploadUrl = window.ASR_UPLOAD_URL || null;
      if (window.Recorder?.lastBlob && uploadUrl){
        const blob = window.Recorder.lastBlob;
        const fd = new FormData();
        fd.append('audio', blob, 'rec.webm');
        fetch(uploadUrl, { method:'POST', body: fd })
          .then(r=>r.json())
          .then(j=>{
            const txt = (j && j.text) ? j.text : '';
            finalizeWithTranscript(txt);
          })
          .catch(err=>{
            console.error('Upload/ASR server error', err);
            finalizeWithTranscript(''); // fallback -> sang B3
          });
      } else {
        // Không có ASR và không có upload URL -> để đánh dấu thủ công
        finalizeWithTranscript('');
      }
    }
  },

  // Gợi ý lỗi: đánh dấu nghi ngờ (dashed orange) dựa trên căn chỉnh tham lam (khi stop)
  suggestFromTranscript(expectedTokens, transcriptText){
    if (!Array.isArray(expectedTokens) || !transcriptText) return;
    const exp = expectedTokens.map(t => this.normalizeText(t));
    const rec = this.wordSplit(this.normalizeText(transcriptText));
    const suspects = [];
    let i=0, j=0;
    while (i<exp.length && j<rec.length){
      if (exp[i] === rec[j]) { i++; j++; }
      else { suspects.push(i); i++; }
    }
    // Không đánh dấu phần đuôi chưa đọc
    suspects.forEach(idx=>{
      const el = this.tokenElems[idx];
      if (el && !this.errors[idx]) {
        el.style.outline = '2px dashed orange';
        // không ghi đè lỗi “đã xác nhận” ở B2/B3
      }
    });
  },

  // LCS (ước lượng số từ đúng)
  lcsLength(a, b){
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length < b.length) { const tmp=a; a=b; b=tmp; }
    const m = b.length, n = a.length;
    const prev = new Array(m+1).fill(0);
    const cur = new Array(m+1).fill(0);
    for (let i=1;i<=n;i++){
      for (let j=1;j<=m;j++){
        if (a[i-1] === b[j-1]) cur[j] = prev[j-1] + 1;
        else cur[j] = Math.max(prev[j], cur[j-1]);
      }
      for (let k=0;k<=m;k++){ prev[k]=cur[k]; cur[k]=0; }
    }
    return prev[m];
  },

  /* ========== Highlight đúng/sai theo thời gian thực ở B2 (nếu có ASR) – bền vững ========== */
  clearB2Styles(){
    for (const el of this.readTokenElems){
      if (!el) continue;
      el.style.background = ''; el.style.boxShadow = ''; el.style.outline = '';
      el.style.borderBottom = ''; el.classList.remove('chunk-flash');
      el.style.opacity = '';
      el.style.filter = '';
    }
    this.b2Status = new Array(this.readTokenElems.length).fill('unknown');
  },
  styleCorrect(el){
    if (!el) return;
    el.style.background = '#E6FFE6';
    el.style.boxShadow = '0 0 0 2px #5bbb5b inset';
    el.style.outline = 'none';
  },
  styleWrong(el){
    if (!el) return;
    el.style.background = '#FFEAEA';
    el.style.outline = '3px solid var(--danger)';
    el.style.boxShadow = '';
  },
  setB2State(i, state){
    const el = this.readTokenElems[i];
    if (!el) return;
    const cur = this.b2Status[i] || 'unknown';
    if (state === 'correct'){
      if (cur !== 'correct'){
        this.b2Status[i] = 'correct';
        this.styleCorrect(el);
        if (this.errors[i]) delete this.errors[i];
      }
    } else if (state === 'wrong'){
      if (cur !== 'correct' && cur !== 'wrong'){
        this.b2Status[i] = 'wrong';
        this.styleWrong(el);
        if (!this.errors[i]) this.errors[i] = { type:'other' };
        // No-guess prompt (nhắc nhẹ, không phát khi đang ghi âm)
        const now = Date.now();
        if (!this.audioMutedDuringRec && now - this._noGuessLastTs > 2500){
          this._noGuessLastTs = now;
          this.showNoGuessHint();
          try{
            if (window.VoiceUI && VoiceUI.enabled) VoiceUI.say('Đừng đoán. Hãy phân tích âm chữ: tách âm đầu, vần và thanh.');
          }catch(_){}
        } else {
          this.showNoGuessHint(); // vẫn hiển thị chữ
        }
      }
    }
  },

  updateLiveHighlight(){
    if (!this.readTokenElems || !this.readTokenElems.length) return;
    const expected = this.wordSplit(this.passage.text);
    const expN = expected.map(t=>this.normalizeText(t));
    const recN = this.wordSplit(this.normalizeText(this.asrLiveText || this.asrText || ''));
    const n = expN.length, m = recN.length;
    if (!m) { this.updateSpotlight(); return; }

    // DP (Levenshtein) để căn chỉnh prefix
    const dp = Array.from({length: n+1}, (_,i)=> {
      const row = new Array(m+1);
      row[0] = i;
      return row;
    });
    for (let j=0;j<=m;j++) dp[0][j] = j;
    for (let i=1;i<=n;i++){
      for (let j=1;j<=m;j++){
        const cost = (expN[i-1] === recN[j-1]) ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,        // del
          dp[i][j-1] + 1,        // ins
          dp[i-1][j-1] + cost    // sub/match
        );
      }
    }

    // Duyệt tiến từ (0,0) đến khi dùng hết rec (j==m)
    let i=0, j=0;
    const matchedIdx = new Set();
    while (j < m && i < n){
      const here = dp[i][j];
      // match
      if (expN[i] === recN[j] && dp[i+1][j+1] === here){
        matchedIdx.add(i);
        i++; j++; continue;
      }
      // insert (từ thừa trong nhận dạng)
      if (dp[i][j+1] === here + 1){ j++; continue; }
      // substitute
      if (dp[i+1][j+1] === here + 1){ i++; j++; continue; }
      // delete
      if (dp[i+1][j] === here + 1){ i++; continue; }
      // fallback
      i++; j++;
    }
    const i_end = i; // số từ expected đã "đi qua" theo căn chỉnh hiện tại

    // Gắn trạng thái bền: 0..i_end-1: đúng nếu match, sai nếu không match
    for (let k=0;k<i_end;k++){
      if (matchedIdx.has(k)) this.setB2State(k, 'correct');
      else this.setB2State(k, 'wrong');
    }

    // Cập nhật Spotlight bám theo i_end (trừ khi người dùng điều khiển tay)
    if (this._spotIdxManual == null) this.updateSpotlight(i_end);
    else this.updateSpotlight(this._spotIdxManual);
  },

  /* ========== Đồng bộ cập nhật chỉ số tạm (throttle ~1.2s khi đang đọc) ========== */
  updateStatsLive(force){
    const now = window.__now ? window.__now() : Date.now();

    // Khi chưa start hoặc khi cần cập nhật tức thời từ thao tác
    if (!this.started && (!this._sessionTemp || !this._sessionTemp.auto)){
      const expected = this.wordSplit(this.passage.text);
      const wrong = Object.keys(this.errors).length;
      const correct = Math.max(0, expected.length - wrong);
      const dur = this._sessionTemp ? this._sessionTemp.dur : 60000; // giả định 1 phút
      const minutes = Math.max(0.5, dur/60000);
      const wcpm = Math.round(correct / minutes);
      const acc = expected.length ? +(correct/expected.length).toFixed(3) : 0;

      const sW = document.getElementById('statWCPM'); if (sW) sW.textContent = wcpm;
      const sA = document.getElementById('statAcc'); if (sA) sA.textContent = (acc*100).toFixed(0) + '%';
      this._sessionTemp = { dur, total: expected.length, correct, wcpm, acc };
    }

    if (!this.started) return;

    // Throttle khi đang đọc
    if (!force && (now - this._lastStatAt) < this._statThrottleMs) return;
    this._lastStatAt = now;

    const dur = now - this.startTime;
    const expected = this.wordSplit(this.passage.text).length;
    const wrong = Object.keys(this.errors).length;
    const correct = Math.max(0, expected - wrong);
    const minutes = Math.max(0.5, dur/60000);
    const wcpm = Math.round(correct / minutes);
    const acc = expected ? +(correct/expected).toFixed(3) : 0;
    const sW = document.getElementById('statWCPM'); if (sW) sW.textContent = wcpm;
    const sA = document.getElementById('statAcc'); if (sA) sA.textContent = (acc*100).toFixed(0) + '%';
  },

  toggleRec(){
    const btn = document.getElementById('btnRec');
    // Sau khi Stop(), cho phép nghe lại
    if (!this.started && window.Recorder?.lastBlob){
      Recorder.play();
      return;
    }
    // Trong lúc đọc, đã tự ghi âm ở start(); nút này chỉ hiển thị trạng thái
    if (this.started && window.Recorder?.recording){
      Recorder.stop();
      if (btn) btn.textContent = 'Nghe lại bản ghi';
    }
  },

  /* ========== B4: câu hỏi (phân trang) ========== */
  renderQuestions(){
    const sec = document.getElementById('readStep4');
    const qWrap = document.getElementById('questions'); if (!qWrap || !sec) return;
    qWrap.innerHTML = '';
    const qs = this.passage.questions || [];
    this._qIdx = 0;
    this._chosen = new Array(qs.length).fill(-1);
    if (!qs.length){ sec.style.display = 'none'; return; }

    // Tạo vỏ radiogroup + nav
    const host = document.createElement('div');
    host.id = 'qHost';
    qWrap.appendChild(host);

    const nav = document.createElement('div');
    nav.className = 'row';
    const btnPrev = document.createElement('button'); btnPrev.className='ghost'; btnPrev.textContent='← Trước';
    const sp = document.createElement('div'); sp.className='spacer';
    const btnNext = document.createElement('button'); btnNext.className='primary'; btnNext.textContent='Tiếp theo →';
    btnPrev.onclick = ()=>{ if (this._qIdx>0){ this._qIdx--; this.renderQPage(host, qs, btnPrev, btnNext); } };
    btnNext.onclick = ()=>{
      if (this._qIdx < qs.length-1){ this._qIdx++; this.renderQPage(host, qs, btnPrev, btnNext); }
      else { this.finishComp(); }
    };
    qWrap.appendChild(nav);
    nav.append(btnPrev, sp, btnNext);

    this.renderQPage(host, qs, btnPrev, btnNext);
  },
  renderQPage(host, qs, btnPrev, btnNext){
    const i = this._qIdx;
    const q = qs[i];
    host.innerHTML = '';
    const div = document.createElement('div'); div.className = 'question'; host.appendChild(div);

    const qTitle = document.createElement('div');
    const b = document.createElement('b'); b.textContent = `Câu ${i+1}/${qs.length}:`;
    qTitle.appendChild(b);
    qTitle.appendChild(document.createTextNode(' ' + (q.q || '')));
    div.appendChild(qTitle);

    const group = document.createElement('div'); group.className='radiogroup'; group.setAttribute('role','radiogroup');
    (q.choices||[]).forEach((c, idx)=>{
      const opt = document.createElement('div'); opt.className='opt-radio'; opt.setAttribute('role','radio');
      opt.setAttribute('aria-checked', String(this._chosen[i]===idx));
      const dot = document.createElement('span'); dot.className='dot';
      const label = document.createElement('span'); label.textContent = c;
      opt.append(dot, label);
      opt.onclick = ()=>{
        this._chosen[i] = idx;
        Array.from(group.children).forEach(el => el.setAttribute('aria-checked','false'));
        opt.setAttribute('aria-checked','true');
        this.beep(880, 0.05);
      };
      group.appendChild(opt);
    });
    div.appendChild(group);

    // Prev/Next trạng thái
    btnPrev.disabled = i===0;
    btnNext.textContent = (i===qs.length-1) ? 'Xem kết quả' : 'Tiếp theo →';
  },

  finishComp(){
    const qList = this.passage.questions || [];
    const chosen = this._chosen.map((sel,i)=>({ sel, correct: (qList[i]?.ans ?? -1) }));
    const compCorrect = chosen.filter(x=>x.sel===x.correct).length;
    const compTotal = qList.length;

    const tmp = this._sessionTemp || { dur:0,total:0,correct:0,wcpm:0,acc:0 };
    const errorsByType = { tone:0, sx:0, chtr:0, omission:0, insertion:0, other:0 };
    Object.values(this.errors).forEach(e => { if (e && errorsByType[e.type]!=null) errorsByType[e.type]++; else errorsByType.other++; });

    const log = {
      type: 'reading',
      learnerId: (window.AppState && AppState.learner && AppState.learner.sysId) || '',
      sessionId: Math.random().toString(36).slice(2,10),
      ts: window.__now(),
      passageId: this.passage.id,
      level: this.level,
      durationMs: tmp.dur,
      totalWords: tmp.total,
      correctWords: tmp.correct,
      wcpm: tmp.wcpm,
      accuracy: tmp.acc,
      compCorrect, compTotal,
      errorsByType, usedTTS: this.usedTTS || 0, scaffolds: [],
      autoAnalysis: this.asrText ? { engine:'webkitSpeechRecognition', text: this.asrText.trim(),
                                     qTypes: (qList||[]).map(q=>q.type||null) } : null
    };

    AppState.logs.push(log); Store.set('logs', AppState.logs);

    const recent = AppState.logs.filter(x=>x.type==='reading').slice(-2);
    const lastW = recent.length>=2 ? recent[recent.length-2].wcpm : 0;
    if (log.accuracy >= 0.9 || (lastW && log.wcpm > lastW)) { if (window.App) App.addStar(1); }

    // Lưu để hiển thị ở B5
    this._lastComp = { chosen, compCorrect, compTotal, questions: qList, wcpm: tmp.wcpm, acc: tmp.acc };

    if (window.VoiceUI && typeof VoiceUI.say === 'function') {
      VoiceUI.say(`Hoàn thành bài đọc. Trả lời đúng ${compCorrect} trên ${compTotal}.`);
    }

    AppState.learner.level = window.adaptivePlan(AppState.logs, AppState.learner.level).nextLevel; Store.set('learner', AppState.learner);
    if (window.App){ App.updateLearnerBadge(); App.updateNextLevelHint(); }

    window.Sync.enqueue(log);

    // Chuyển sang B5 (Xem kết quả)
    this.goStep(5);
  },

  /* ========== B5: Xem kết quả ========== */
  ensureStep5Exists(){
    if (this._step5Ready) return;
    const host = document.getElementById('screen-reading');
    const stepper = document.getElementById('readSteps');

    if (host){
      // Thêm section B5
      const sec = document.createElement('div');
      sec.id = 'readStep5';
      sec.className = 'section lift';
      sec.style.display = 'none';
      sec.innerHTML = `
        <div class="row">
          <button class="ghost" onclick="App.reading.goStep(4)" data-voice="Quay lại bước 4">← Quay lại</button>
          <button class="ghost" onclick="App.reading.goStep(1)" data-voice="Về bước 1 để chọn bài khác">← Về bước 1 (Chọn)</button>
          <div class="spacer"></div>
          <span class="badge">Kết quả</span>
        </div>
        <div class="row" style="gap:10px; margin-top:6px;">
          <span class="stat">WCPM: <b id="resWCPM">—</b></span>
          <span class="stat">% đúng: <b id="resACC">—</b></span>
        </div>
        <div class="inline-buttons" id="resActions" style="margin-top:8px;"></div>
        <div style="margin-top:10px;">
          <h3>Đáp án câu hỏi</h3>
          <div id="answersList"></div>
        </div>
      `;
      host.appendChild(sec);

      // Bổ sung nút “🔊 Nghe đoạn” riêng ở B5
      const dstBar = sec.querySelector('#resActions');
      if (dstBar) {
        const b = document.createElement('button');
        b.className = 'tts';
        b.textContent = '🔊 Nghe đoạn';
        b.setAttribute('data-voice','Nghe toàn bộ đoạn');
        b.onclick = ()=> this.speakPassage();
        dstBar.appendChild(b);
      }

      // Stepper thêm bước 5 nếu thiếu
      if (stepper && !stepper.querySelector('.step[data-step="5"]')){
        const s = document.createElement('div');
        s.className = 'step'; s.setAttribute('data-step','5');
        s.innerHTML = '<span>5</span> Kết quả';
        stepper.appendChild(s);
      }
    }

    this._step5Ready = true;
  },
  renderResults(){
    this.ensureStep5Exists();
    const tmp = this._sessionTemp || { wcpm:0, acc:0 };
    const resW = document.getElementById('resWCPM');
    const resA = document.getElementById('resACC');
    if (resW) resW.textContent = String(Math.round(tmp.wcpm||0));
    if (resA) resA.textContent = ((tmp.acc||0)*100).toFixed(0) + '%';

    const box = document.getElementById('answersList');
    if (!box) return;
    box.innerHTML = '';
    const comp = this._lastComp || { chosen:[], compCorrect:0, compTotal:0, questions:[] };
    for (let i=0;i<comp.questions.length;i++){
      const q = comp.questions[i];
      const userSel = comp.chosen[i]?.sel ?? -1;
      const ans = comp.questions[i]?.ans ?? -1;
      const div = document.createElement('div');
      div.className = 'card';
      div.style.padding = '8px';
      const head = document.createElement('div');
      head.innerHTML = `<b>Câu ${i+1}:</b> ${q.q || ''}`;
      const yours = document.createElement('div');
      const yourTxt = (q.choices||[])[userSel] ?? '—';
      const ansTxt = (q.choices||[])[ans] ?? '—';
      const ok = (userSel===ans);
      yours.innerHTML = `• Bạn chọn: <b style="color:${ok?'#0a8':'#c00'}">${yourTxt}</b> ${ok?'✅':'❌'}`;
      const corr = document.createElement('div');
      corr.innerHTML = `• Đáp án đúng: <b>${ansTxt}</b>`;
      div.appendChild(head); div.appendChild(yours); div.appendChild(corr);
      box.appendChild(div);
    }
  },

  /* ========== TTS toàn đoạn ========== */
  speakPassage(){
    if (this.audioMutedDuringRec) return;
    this.usedTTS++;
    if (window.TTS) TTS.speak(this.passage.text || '', (window.AppState && AppState.learner && AppState.learner.ttsRate) || 0.9);
  },

  /* ========== B2 Assist Bar: Spotlight / Tricky / Echo / Pacer & No-guess + Nâng cấp ========== */
  ensureB2AssistBar(){
    const step = document.getElementById('readStep2');
    if (!step) return;
    if (document.getElementById('b2AssistBar')) return;

    // Thanh
    const bar = document.createElement('div');
    bar.id = 'b2AssistBar';
    bar.className = 'row';
    bar.style.gap = '8px';
    bar.style.margin = '6px 0';

    const mkBtn = (label, handler, cls='ghost')=>{
      const b = document.createElement('button');
      b.className = cls;
      b.textContent = label;
      b.onclick = handler;
      return b;
    };

    // Spotlight
    if (this._spotOn == null) this._spotOn = !!(window.AppState && AppState.childMode);
    const btnSpot = mkBtn(this._spotOn ? '🔦 Spotlight: Bật' : '🔦 Spotlight: Tắt', ()=>{
      this._spotOn = !this._spotOn;
      btnSpot.textContent = this._spotOn ? '🔦 Spotlight: Bật' : '🔦 Spotlight: Tắt';
      this.updateSpotlight();
    });

    // Chế độ Spotlight: Nhóm từ / Câu
    const btnMode = mkBtn(this._spotMode==='sentence' ? '📑 Chế độ: Câu' : '📑 Chế độ: Nhóm từ', ()=>{
      this._spotMode = (this._spotMode==='sentence') ? 'chunk' : 'sentence';
      btnMode.textContent = this._spotMode==='sentence' ? '📑 Chế độ: Câu' : '📑 Chế độ: Nhóm từ';
      this.updateSpotlight(this._spotIdxManual ?? 0);
    });

    // Độ dày Focus-line
    const btnThick = mkBtn('🖍️ Dày: Vừa', ()=>{
      this._focusThickness = (this._focusThickness==='thin') ? 'medium' : (this._focusThickness==='medium' ? 'thick' : 'thin');
      const label = this._focusThickness==='thin' ? 'Mỏng' : (this._focusThickness==='thick' ? 'Dày' : 'Vừa');
      btnThick.textContent = `🖍️ Dày: ${label}`;
      this.ensureFocusOn(true);
    });

    // Tricky words
    const btnTricky = mkBtn('🎯 Từ khó', ()=> this.showTrickyWords());

    // Echo Reading
    const btnEcho = mkBtn(this._echoOn ? '🗣️ Echo: Bật' : '🗣️ Echo: Tắt', ()=>{
      if (this.started){ alert('Hãy tắt ghi âm trước khi dùng Echo.'); return; }
      this._echoOn = !this._echoOn;
      btnEcho.textContent = this._echoOn ? '🗣️ Echo: Bật' : '🗣️ Echo: Tắt';
      if (this._echoOn) this.startEcho(); else this.stopEcho();
    });

    // Pacer
    const btnPacer = mkBtn(this._pacerOn ? '⏱️ Pacer: Bật' : '⏱️ Pacer: Tắt', ()=>{
      this._pacerOn = !this._pacerOn;
      btnPacer.textContent = this._pacerOn ? '⏱️ Pacer: Bật' : '⏱️ Pacer: Tắt';
      this.updatePacer();
    });

    const wpmWrap = document.createElement('span');
    wpmWrap.className='row';
    wpmWrap.style.gap='6px';
    const lbl = document.createElement('span'); lbl.textContent='WPM';
    const inp = document.createElement('input');
    inp.type='range'; inp.min='50'; inp.max='140'; inp.step='5';
    inp.value=String(this._pacerWPM||80);
    const spanVal = document.createElement('span'); spanVal.textContent = String(this._pacerWPM||80);
    inp.oninput = ()=>{ this._pacerWPM = +inp.value; spanVal.textContent=String(this._pacerWPM); this.updatePacer(); };
    wpmWrap.append(lbl, inp, spanVal);

    // Chunk reveal
    const btnChunk = mkBtn(this._chunkOn ? '🔳 Chunk: Bật' : '🔳 Chunk: Tắt', ()=>{
      this._chunkOn = !this._chunkOn;
      btnChunk.textContent = this._chunkOn ? '🔳 Chunk: Bật' : '🔳 Chunk: Tắt';
      this.updateChunkReveal();
    });

    // Hàng nhắc No-guess (ẩn mặc định)
    if (!document.getElementById('noGuessHint')){
      const hint = document.createElement('div');
      hint.id='noGuessHint';
      hint.className='help';
      hint.style.display='none';
      hint.style.marginTop='4px';
      hint.textContent='Đừng đoán nhé. Hãy phân tích âm–chữ: tách âm đầu – vần – thanh.';
      step.appendChild(hint);
    }

    // Chèn ngay dưới hàng điều khiển đầu tiên
    const firstRow = step.querySelector('.row');
    if (firstRow && firstRow.parentElement) firstRow.parentElement.insertBefore(bar, firstRow.nextSibling);
    else step.insertBefore(bar, step.firstChild);

    bar.append(btnSpot, btnMode, btnThick, btnTricky, btnEcho, btnPacer, wpmWrap, btnChunk);

    // Phím mũi tên điều khiển Spotlight khi không có ASR
    step.addEventListener('keydown', (e)=>{
      if (!this._spotOn) return;
      if (e.key==='ArrowRight' || e.key==='ArrowLeft'){
        e.preventDefault();
        const dir = e.key==='ArrowRight' ? 1 : -1;
        const maxIdx = Math.max(0, this.readTokenElems.length-1);
        this._spotIdxManual = Math.max(0, Math.min(maxIdx, (this._spotIdxManual ?? 0) + dir));
        this.updateSpotlight(this._spotIdxManual);
      }
    });
  },

  updateSpotlight(forcedIdx){
    if (!this.readTokenElems || !this.readTokenElems.length) return;
    if (!this._spotOn){
      for (const el of this.readTokenElems){ if (el){ el.style.filter=''; el.style.opacity=''; } }
      return;
    }
    const maxIdx = this.readTokenElems.length-1;
    let idx = typeof forcedIdx==='number' ? forcedIdx : 0;
    if (this._spotIdxManual != null) idx = this._spotIdxManual;
    if (idx<0) idx=0; if (idx>maxIdx) idx=maxIdx;

    if (this._spotMode === 'sentence' && this._lineRanges.length){
      // Tìm câu (reading-line) bao phủ idx
      let start = 0, end = 0;
      for (const r of this._lineRanges){
        if (idx >= r.start && idx < r.end){ start = r.start; end = r.end; break; }
      }
      for (let i=0;i<=maxIdx;i++){
        const el = this.readTokenElems[i]; if (!el) continue;
        const on = (i>=start && i<end);
        el.style.filter = on ? '' : 'grayscale(0.3)';
        el.style.opacity = on ? '1' : '0.35';
      }
    } else {
      // Spotlight theo nhóm từ (chunk)
      const w = this._spotWidth || 4;
      for (let i=0;i<=maxIdx;i++){
        const el = this.readTokenElems[i];
        if (!el) continue;
        const on = (i>=idx && i<idx+w);
        el.style.filter = on ? '' : 'grayscale(0.3)';
        el.style.opacity = on ? '1' : '0.35';
      }
    }
  },

  updateChunkReveal(){
    if (this._chunkTid){ clearInterval(this._chunkTid); this._chunkTid=null; }
    if (!this._chunkOn) { this._spotIdxManual=null; this.updateSpotlight(0); return; }
    // Bật chunk reveal: tiến theo _chunkSize nhịp, làm flash nhẹ
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = this._chunkSize || 4;
    this._spotIdxManual = 0;
    const msPerChunk = Math.max(600, Math.round(60000/Math.max(40, Math.min(160, this._pacerWPM||80))) * size);
    this._chunkTid = setInterval(()=>{
      const maxIdx = this.readTokenElems.length-1;
      // flash
      const start = this._spotIdxManual;
      const end = Math.min(maxIdx+1, start+size);
      if (!prefersReduced){
        for (let i=start;i<end;i++){ this.readTokenElems[i]?.classList.add('chunk-flash'); setTimeout(()=> this.readTokenElems[i]?.classList.remove('chunk-flash'), 360); }
      }
      // tiến
      this._spotIdxManual = Math.min(maxIdx, this._spotIdxManual + size);
      this.updateSpotlight(this._spotIdxManual);
      if (this._spotIdxManual >= maxIdx) { clearInterval(this._chunkTid); this._chunkTid=null; }
    }, msPerChunk);
  },

  showTrickyWords(){
    try{
      const words = this.wordSplit(this.passage?.text||'').map(x=>x.trim());
      const cards = Array.isArray(window.CARDS)? window.CARDS : [];
      const badTags = new Set(['sx','chtr','ngngh','ckqu','nl','tone','ghg']);
      const dict = new Map(cards.map(c=>[String(c.text||'').normalize('NFC'), c]));
      const tricky = [];
      for (const w of words){
        const c = dict.get(w.normalize('NFC'));
        if (c && (c.tags||[]).some(t=>badTags.has(t))) tricky.push({text:w, tags:c.tags});
      }
      const seen = new Set(); const list=[];
      for (const t of tricky){ if (seen.has(t.text)) continue; seen.add(t.text); list.push(t); if (list.length>=8) break; }
      if (!list.length){ alert('Bài này không có “từ khó” nổi bật.'); return; }

      const wrap = document.createElement('div');
      wrap.className='modal active'; wrap.style.background='rgba(0,0,0,.35)';
      const dlg = document.createElement('div');
      dlg.className='dialog';
      dlg.innerHTML='<h3>Từ cần chú ý</h3>';
      const ul = document.createElement('div'); ul.className='inline-buttons'; ul.style.flexWrap='wrap';
      list.forEach(t=>{
        const b = document.createElement('button');
        b.textContent = '🔊 ' + t.text;
        b.onclick = ()=> { if (window.TTS) TTS.speak(t.text, window.AppState?.learner?.ttsRate || 0.9); };
        ul.appendChild(b);
      });
      const row = document.createElement('div'); row.className='row'; row.style.marginTop='8px';
      const sp = document.createElement('div'); sp.className='spacer';
      const close = document.createElement('button'); close.className='ghost'; close.textContent='Đã xong'; close.onclick=()=> wrap.remove();
      row.append(sp, close);
      dlg.append(ul, row); wrap.appendChild(dlg);
      document.body.appendChild(wrap);
    }catch(_){}
  },

  startEcho(){
    if (this.started) return;
    this._echoIdx = 0;
    const lines = Array.from(document.querySelectorAll('#passageText .reading-line')).map(el=>el.textContent.trim()).filter(Boolean);
    if (!lines.length){ this._echoOn=false; return; }
    const go = ()=>{
      if (!this._echoOn) return;
      if (this._echoIdx >= lines.length){ this._echoOn=false; return; }
      const line = lines[this._echoIdx];
      if (window.TTS) TTS.speak(line, window.AppState?.learner?.ttsRate || 0.85);
      const secs = Math.max(2.5, Math.min(6, line.split(/\s+/).length/2));
      setTimeout(()=>{ if (!this._echoOn) return; this._echoIdx++; go(); }, secs*1000);
    };
    go();
  },
  stopEcho(){ this._echoOn=false; },

  updatePacer(){
    if (this._pacerTid){ clearInterval(this._pacerTid); this._pacerTid=null; }
    if (!this._pacerOn) return;
    const wpm = this._pacerWPM || 80;
    const msPerWord = Math.max(250, Math.round(60000/Math.max(30, Math.min(180, wpm))));
    if (this._spotIdxManual==null) this._spotIdxManual = 0;
    this._pacerTid = setInterval(()=>{
      if (!this._spotOn || !this.readTokenElems?.length){ clearInterval(this._pacerTid); this._pacerTid=null; return; }
      const maxIdx = this.readTokenElems.length-1;
      this._spotIdxManual = Math.min(maxIdx, (this._spotIdxManual ?? 0) + 1);
      this.updateSpotlight(this._spotIdxManual);
    }, msPerWord);
  },

  showNoGuessHint(){
    const hint = document.getElementById('noGuessHint');
    if (!hint) return;
    hint.style.display='block';
    clearTimeout(hint._tid);
    hint._tid = setTimeout(()=>{ hint.style.display='none'; }, 2200);
  },

  /* ========== Tiện ích âm báo khi chọn đáp án (B4) ========== */
  beep(freq=880, dur=0.05, type='triangle'){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.value = 0.08; o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, Math.max(10, dur*1000));
    }catch(_){}
  }
};
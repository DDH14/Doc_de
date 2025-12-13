/* MODULE: READING – 4 bước + B5 xem kết quả, ghi âm tự động, 1-minute reading,
   gợi ý lỗi, hiển thị đoạn dễ đọc (B2, có highlight từ đúng/sai nếu có ASR),
   đánh dấu từ (B3), ước tính WCPM/% (nếu có ASR), thanh luyện từ sai,
   micro-prompt khi im lặng, và màn Xem kết quả (B5). */
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
  b2Status: [],             // B2: 'unknown' | 'wrong' | 'correct' (trạng thái bền)

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

    this.ensureStep5Exists(); // chèn bước 5 và di chuyển nút “Nghe đoạn” về B5

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

    // Child mode → bật “1 dòng”
    if (window.AppState && AppState.childMode) this.ensureFocusOn(true);
    this.markModeState = (window.AppState && AppState.childMode) ? 'error' : 'normal';
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

    if (n===2) this.renderPlainPassage();     // B2: Đoạn dễ đọc (token hoá để highlight)
    if (n===3) { this.renderPassageTokens(); this.injectPracticeBar(); } // B3
    if (n===4) this.renderQuestions();        // B4
    if (n===5) this.renderResults();          // B5

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

  // Fallback: đảm bảo các bước 2–4 có nút quay lại về bước trước; B1 không có.
  // Tránh nhân đôi bằng cách: (1) nhận diện nút có sẵn bằng onclick attr, (2) gắn cờ data-back-btn="1" cho nút mình chèn.
  ensureBackButtons(){
    const cfg = { readStep2:1, readStep3:2, readStep4:3 };
    Object.entries(cfg).forEach(([secId, prev])=>{
      const sec = document.getElementById(secId);
      if (!sec) return;
      const existedAttr = sec.querySelector(`button[onclick*="App.reading.goStep(${prev})"]`);
      const existedInjected = sec.querySelector(`button[data-back-btn="1"][data-prev-step="${prev}"]`);
      if (existedAttr) {
        // Gắn cờ để lần sau khỏi chèn nhầm
        existedAttr.setAttribute('data-back-btn','1');
        existedAttr.setAttribute('data-prev-step', String(prev));
        return;
      }
      if (existedInjected) return;

      // Chèn 1 nút quay lại
      const back = document.createElement('button');
      back.className = 'ghost';
      back.textContent = '← Quay lại';
      back.setAttribute('data-voice','Quay lại bước trước');
      back.setAttribute('data-back-btn','1');
      back.setAttribute('data-prev-step', String(prev));
      back.setAttribute('onclick', `App.reading.goStep(${prev})`); // đặt attr để selector nhận ra lần sau
      const firstRow = sec.querySelector('.row');
      if (firstRow) firstRow.insertBefore(back, firstRow.firstChild);
      else sec.insertBefore(back, sec.firstChild);
    });
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
    let globalIdx = 0;
    let buffer = '';
    for (let i=0;i<parts.length;i++){
      const p = parts[i];
      if (/^[.!?…]+$/.test(p)) {
        buffer += p;
        // render một dòng bằng token
        const line = document.createElement('div');
        line.className = 'reading-line';
        const words = this.wordSplit(buffer);
        for (let k=0;k<words.length;k++){
          const span = document.createElement('span');
          span.textContent = words[k];
          span.style.padding = '1px 2px';
          span.style.borderRadius = '4px';
          span.style.transition = 'background 0.2s, box-shadow 0.2s, outline 0.2s';
          line.appendChild(span);
          this.readTokenElems[globalIdx++] = span;
          if (k < words.length-1) line.appendChild(document.createTextNode(' '));
        }
        el.appendChild(line);
        buffer = '';
      } else if (/\n/.test(p)) {
        if (buffer.trim()){
          const line = document.createElement('div');
          line.className = 'reading-line';
          const words = this.wordSplit(buffer);
          for (let k=0;k<words.length;k++){
            const span = document.createElement('span');
            span.textContent = words[k];
            span.style.padding = '1px 2px';
            span.style.borderRadius = '4px';
            span.style.transition = 'background 0.2s, box-shadow 0.2s, outline 0.2s';
            line.appendChild(span);
            this.readTokenElems[globalIdx++] = span;
            if (k < words.length-1) line.appendChild(document.createTextNode(' '));
          }
          el.appendChild(line);
          buffer = '';
        }
      } else {
        buffer += (buffer ? ' ' : '') + p;
      }
    }
    if (buffer.trim()){
      const line = document.createElement('div');
      line.className = 'reading-line';
      const words = this.wordSplit(buffer);
      for (let k=0;k<words.length;k++){
        const span = document.createElement('span');
        span.textContent = words[k];
        span.style.padding = '1px 2px';
        span.style.borderRadius = '4px';
        span.style.transition = 'background 0.2s, box-shadow 0.2s, outline 0.2s';
        line.appendChild(span);
        this.readTokenElems[globalIdx++] = span;
        if (k < words.length-1) line.appendChild(document.createTextNode(' '));
      }
      el.appendChild(line);
    }
    this.applyFocusMask();
    // reset highlight khi đổi bài
    this.clearB2Styles();
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
      span.onclick = () => this.onTokenClick(i, span);
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
      if (el) el.style.outline = '3px solid var(--danger)';
    });
    this.applyFocusMask();
  },

  /* ========== Thanh công cụ ở B3: Luyện từ sai / Đưa vào Thẻ từ ========== */
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

    bar.appendChild(btnPractice);
    bar.appendChild(btnCards);
    host.insertBefore(bar, view);
  },

  /* ========== Chế độ 1 dòng cho B2 & B3 ========== */
  ensureFocusOn(forceOn){
    const apply = (el)=>{
      if (!el) return;
      el.style.maxHeight = '3.4em';
      el.style.overflow = 'hidden';
      el.style.maskImage = 'linear-gradient(180deg, black 60%, transparent 100%)';
    };
    const clear = (el)=>{
      if (!el) return;
      el.style.maxHeight = '';
      el.style.overflow = '';
      el.style.maskImage = '';
    };
    if (forceOn){
      apply(document.getElementById('passageText'));
      apply(document.getElementById('passageView'));
    } else {
      clear(document.getElementById('passageText'));
      clear(document.getElementById('passageView'));
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
    for (const el of this.tokenElems) { el.style.outline = 'none'; }
    const sW = document.getElementById('statWCPM'); if (sW) sW.textContent='—';
    const sA = document.getElementById('statAcc'); if (sA) sA.textContent='—';
  },
  onTokenClick(i, el){
    if (this.markModeState!=='error') return;
    if (this.errors[i]) { delete this.errors[i]; el.style.outline = 'none'; }
    else { this.errors[i] = { type: 'other' }; el.style.outline = '3px solid var(--danger)'; }
    this.updateStatsLive();
  },
  openErrMenu(i){
    if (this.markModeState!=='error') return;
    this._errTarget = i;
    const em = document.getElementById('errorMenu');
    if (em) em.classList.add('active');
  },
  setErrType(t){
    if (this._errTarget==null) return;
    this.errors[this._errTarget] = { type: t };
    const el = this.tokenElems[this._errTarget]; if (el) el.style.outline = '3px solid var(--danger)';
    const em = document.getElementById('errorMenu');
    if (em) em.classList.remove('active');
    this.updateStatsLive();
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
    // cập nhật thống kê tức thời khi đang đọc
    this.updateStatsLive();
    this.timerId = setTimeout(()=>this.updateTimer(), 250);
  },

  /* ========== Bắt đầu/Kết thúc ========== */
  start(){
    if (this.started) return;
    this.started = true; this.startTime = window.__now(); this.errors = {};
    this.asrText = ''; this.asrLiveText = '';
    this.clearB2Styles();
    // Khởi tạo trạng thái bền cho B2
    this.b2Status = new Array(this.wordSplit(this.passage.text).length).fill('unknown');

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

    // Bật ASR (nếu khả dụng) để highlight đúng/sai theo thời gian thực bền vững
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
              }
            }
            this.asrLiveText = (this.asrText + ' ' + interim).trim();
            this.updateLiveHighlight();
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
      // Sai chỉ được nâng lên thành đúng, không bị hạ/clear bởi interim
      if (cur !== 'correct' && cur !== 'wrong'){
        this.b2Status[i] = 'wrong';
        this.styleWrong(el);
        if (!this.errors[i]) this.errors[i] = { type:'other' };
      }
    }
  },
  updateLiveHighlight(){
    if (!this.readTokenElems || !this.readTokenElems.length) return;
    const expected = this.wordSplit(this.passage.text);
    const expN = expected.map(t=>this.normalizeText(t));
    const recN = this.wordSplit(this.normalizeText(this.asrLiveText || this.asrText || ''));
    const n = expN.length, m = recN.length;
    if (!m) return; // không xóa dấu khi chưa có nhận dạng

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
      if (dp[i][j+1] === here + 1){
        j++; continue;
      }
      // substitute
      if (dp[i+1][j+1] === here + 1){
        i++; j++; continue;
      }
      // delete
      if (dp[i+1][j] === here + 1){
        i++; continue;
      }
      // fallback
      i++; j++;
    }
    const i_end = i; // số từ expected đã "đi qua" theo căn chỉnh hiện tại

    // Gắn trạng thái bền: 0..i_end-1: đúng nếu match, sai nếu không match
    for (let k=0;k<i_end;k++){
      if (matchedIdx.has(k)) this.setB2State(k, 'correct');
      else this.setB2State(k, 'wrong');
    }
    // Những chỉ số >= i_end giữ nguyên trạng thái hiện tại (unknown/sai/đúng) theo lần trước
  },

  /* ========== Đồng bộ cập nhật chỉ số tạm khi đánh dấu thủ công (nếu không có ASR) ========== */
  updateStatsLive(){
    if (!this.started && (!this._sessionTemp || !this._sessionTemp.auto)){
      // tính theo đánh dấu thủ công
      const expected = this.wordSplit(this.passage.text);
      const wrong = Object.keys(this.errors).length;
      const correct = Math.max(0, expected.length - wrong);
      const dur = this._sessionTemp ? this._sessionTemp.dur : 60000; // giả định 1 phút nếu chưa biết
      const minutes = Math.max(0.5, dur/60000);
      const wcpm = Math.round(correct / minutes);
      const acc = expected.length ? +(correct/expected.length).toFixed(3) : 0;

      const sW = document.getElementById('statWCPM'); if (sW) sW.textContent = wcpm;
      const sA = document.getElementById('statAcc'); if (sA) sA.textContent = (acc*100).toFixed(0) + '%';
      this._sessionTemp = { dur, total: expected.length, correct, wcpm, acc };
    }

    if (!this.started) return;
    // Khi đang đọc: hiển thị tức thời theo số từ chưa đánh dấu (không dùng ASR realtime)
    const dur = window.__now() - this.startTime;
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

  /* ========== B4: câu hỏi ========== */
  renderQuestions(){
    const sec = document.getElementById('readStep4');
    const qWrap = document.getElementById('questions'); if (!qWrap || !sec) return;
    qWrap.innerHTML = '';
    const qs = this.passage.questions || [];
    for (let i=0;i<qs.length;i++){
      const q = qs[i];
      const div = document.createElement('div'); div.className = 'question';
      const qTitle = document.createElement('div');
      const b = document.createElement('b'); b.textContent = `Câu ${i+1}:`;
      qTitle.appendChild(b);
      qTitle.appendChild(document.createTextNode(' ' + (q.q || '')));
      div.appendChild(qTitle);

      const opts = document.createElement('div'); opts.className='inline-buttons';
      (q.choices||[]).forEach((c, idx)=>{
        const bbtn = document.createElement('button');
        bbtn.textContent = c;
        bbtn.setAttribute('data-voice', `Chọn đáp án ${c}`);
        bbtn.onclick = ()=> { div.dataset.sel = idx; Array.from(opts.children).forEach(ch => ch.style.outline='none'); bbtn.style.outline = '2px solid var(--primary)'; };
        opts.appendChild(bbtn);
      });
      div.appendChild(opts); qWrap.appendChild(div);
    }
    sec.style.display = qs.length ? '' : 'none';
    if (window.VoiceUI && typeof VoiceUI.attachAll === 'function') VoiceUI.attachAll();
  },

  finishComp(){
    const qList = this.passage.questions || [];
    const chosen = Array.from(document.querySelectorAll('#questions .question')).map((div,i)=>{
      const sel = +(div.dataset.sel ?? -1); const correct = qList[i]?.ans ?? -1;
      return { sel, correct };
    });
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

      // Cập nhật stepper có bước 5 (nếu thiếu sẽ thêm trong updateStepper)
      if (stepper && !stepper.querySelector('.step[data-step="5"]')){
        const s = document.createElement('div');
        s.className = 'step'; s.setAttribute('data-step','5');
        s.innerHTML = '<span>5</span> Kết quả';
        stepper.appendChild(s);
      }

      // Di chuyển nút “🔊 Nghe đoạn” từ B2 sang B5
      const srcBtn = document.querySelector('#readStep2 button.tts[onclick*="App.reading.speakPassage"]');
      const dstBar = sec.querySelector('#resActions');
      if (srcBtn && dstBar){
        dstBar.appendChild(srcBtn);
      } else if (dstBar) {
        // nếu không tìm thấy, tạo mới
        const b = document.createElement('button');
        b.className = 'tts';
        b.textContent = '🔊 Nghe đoạn';
        b.setAttribute('data-voice','Nghe toàn bộ đoạn');
        b.onclick = ()=> this.speakPassage();
        dstBar.appendChild(b);
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

  /* ========== TTS toàn đoạn (chuyển sang B5) ========== */
  speakPassage(){
    if (this.audioMutedDuringRec) return;
    this.usedTTS++;
    if (window.TTS) TTS.speak(this.passage.text || '', (window.AppState && AppState.learner && AppState.learner.ttsRate) || 0.9);
  }
};
/* MODULE: ASSESS – Đánh giá nhanh (PA, RAN, Decoding, Sight).
   Lưu log vào AppState.logs với type: 'screen'. */
window.AssessModule = {
  // Trạng thái
  _paItems: [],
  _ranArr: [],
  _ranStart: 0,
  _decItems: [],
  _sightItems: [],

  init(){
    // Khởi tạo danh sách nhiệm vụ một lần mỗi lần mở màn
    this.renderPA();
    this.renderRAN();
    this.renderDEC();
    this.renderSIGHT();
    this.updateSummary();
  },

  // ========== PA ==========
  renderPA(){
    const host = document.getElementById('paItems'); if (!host) return;
    // 6 câu hỏi: chọn từ cùng vần với từ gợi ý (3 đáp án)
    const bank = [
      { stem:'cá', opts:['cỏ','lá','na'], ans:1 },
      { stem:'mèo', opts:['keo','mẻo','mì'], ans:0 },
      { stem:'tranh', opts:['chanh','trăng','tranh'], ans:0 },
      { stem:'quê', opts:['quế','nhé','quê'], ans:2 },
      { stem:'sữa', opts:['giữa','sả','sữa'], ans:2 },
      { stem:'búp', opts:['búp','bục','búp bê'], ans:0 }
    ];
    this._paItems = bank.map((x,i)=>({ stem:x.stem, opts:x.opts, ans:x.ans, sel:null, id:i }));
    host.innerHTML = '';
    this._paItems.forEach((q, idx)=>{
      const row = document.createElement('div'); row.style.margin='6px 0';
      const title = document.createElement('div'); title.innerHTML = `<b>${idx+1}.</b> Từ gợi ý: <b>${q.stem}</b>`;
      const opts = document.createElement('div'); opts.className='inline-buttons'; opts.style.marginTop='6px';
      q.opts.forEach((o, j)=>{
        const b = document.createElement('button');
        b.textContent = o;
        b.onclick = ()=>{
          q.sel = j;
          Array.from(opts.children).forEach(ch=> ch.style.outline='none');
          b.style.outline='2px solid var(--primary)';
          this.updatePAScore();
        };
        opts.appendChild(b);
      });
      row.appendChild(title); row.appendChild(opts); host.appendChild(row);
    });
    this.updatePAScore();
  },
  updatePAScore(){
    const done = this._paItems.filter(x=>x.sel!=null);
    const ok = done.filter(x=>x.sel===x.ans).length;
    const el = document.getElementById('paScore'); if (el) el.textContent = `${ok}/${this._paItems.length}`;
    this.updateSummary();
  },
  resetPA(){
    this.renderPA();
  },

  // ========== RAN ==========
  renderRAN(){
    const host = document.getElementById('ranGrid'); if (!host) return;
    this._ranArr = this.makeRANArray(50);
    host.innerHTML = '';
    this._ranArr.forEach(n=>{
      const c = document.createElement('div');
      c.className='cell'; c.textContent = String(n);
      host.appendChild(c);
    });
    const t = document.getElementById('ranTime'); if (t) t.textContent = '—';
    const bS = document.getElementById('btnRanStart'); const bX = document.getElementById('btnRanStop');
    if (bS) bS.disabled=false; if (bX) bX.disabled=true;
    this._ranStart = 0;
    this.updateSummary();
  },
  makeRANArray(len){
    const out = []; const digits=[1,2,3,4,5,6,7,8,9,0];
    for (let i=0;i<len;i++) out.push(digits[Math.floor(Math.random()*digits.length)]);
    return out;
  },
  startRAN(){
    this._ranStart = Date.now();
    const bS = document.getElementById('btnRanStart'); const bX = document.getElementById('btnRanStop');
    if (bS) bS.disabled=true; if (bX) bX.disabled=false;
    const t = document.getElementById('ranTime'); if (t) t.textContent = '…';
  },
  stopRAN(){
    if (!this._ranStart) return;
    const sec = Math.max(1, Math.round((Date.now() - this._ranStart)/1000));
    const t = document.getElementById('ranTime'); if (t) t.textContent = String(sec);
    this._ranStart = 0;
    const bS = document.getElementById('btnRanStart'); const bX = document.getElementById('btnRanStop');
    if (bS) bS.disabled=false; if (bX) bX.disabled=true;
    this.updateSummary();
  },
  shuffleRAN(){
    this.renderRAN();
  },

  // ========== Decoding ==========
  renderDEC(){
    const host = document.getElementById('decList'); if (!host) return;
    // 8 giả từ gần gũi âm vị TV (không nhằm nghĩa)
    const bank = ['náp','tỏm','sẹt','búp','tủn','nốp','rẻn','gút'];
    this._decItems = bank.map((w,i)=>({ w, ok:false, id:i }));
    host.innerHTML='';
    this._decItems.forEach((it,idx)=>{
      const row = document.createElement('div'); row.className='row'; row.style.margin='4px 0'; row.style.alignItems='center';
      const w = document.createElement('div'); w.style.minWidth='120px'; w.innerHTML = `<b>${idx+1}.</b> ${it.w}`;
      const sp = document.createElement('div'); sp.className='spacer';
      const chk = document.createElement('input'); chk.type='checkbox'; chk.id = `dec_ok_${idx}`;
      chk.onchange = ()=>{ it.ok = !!chk.checked; this.updateDECScore(); };
      const lab = document.createElement('label'); lab.setAttribute('for',chk.id); lab.textContent='Đúng';
      row.append(w, sp, chk, lab); host.appendChild(row);
    });
    this.updateDECScore();
  },
  updateDECScore(){
    const ok = this._decItems.filter(x=>x.ok).length;
    const el = document.getElementById('decScore'); if (el) el.textContent = `${ok}/${this._decItems.length}`;
    this.updateSummary();
  },
  resetDEC(){ this.renderDEC(); },

  // ========== Sight Words ==========
  renderSIGHT(){
    const host = document.getElementById('sightList'); if (!host) return;
    const words = ['và','của','được','những','đã','cũng','nhưng','rất','không','một'];
    this._sightItems = words.map((w,i)=>({ w, ok:false, id:i }));
    host.innerHTML='';
    this._sightItems.forEach((it,idx)=>{
      const row = document.createElement('div'); row.className='row'; row.style.margin='4px 0'; row.style.alignItems='center';
      const w = document.createElement('div'); w.style.minWidth='120px'; w.innerHTML = `<b>${idx+1}.</b> ${it.w}`;
      const sp = document.createElement('div'); sp.className='spacer';
      const chk = document.createElement('input'); chk.type='checkbox'; chk.id = `sight_ok_${idx}`;
      chk.onchange = ()=>{ it.ok = !!chk.checked; this.updateSIGHTScore(); };
      const lab = document.createElement('label'); lab.setAttribute('for',chk.id); lab.textContent='Biết ngay';
      row.append(w, sp, chk, lab); host.appendChild(row);
    });
    this.updateSIGHTScore();
  },
  updateSIGHTScore(){
    const ok = this._sightItems.filter(x=>x.ok).length;
    const el = document.getElementById('sightScore'); if (el) el.textContent = `${ok}/${this._sightItems.length}`;
    this.updateSummary();
  },
  resetSIGHT(){ this.renderSIGHT(); },

  // ========== Tổng hợp & Lưu ==========
  updateSummary(){
    const paDone = this._paItems.length ? this._paItems.filter(x=>x.sel!=null).length : 0;
    const paOk = this._paItems.length ? this._paItems.filter(x=>x.sel===x.ans).length : 0;
    const paAcc = this._paItems.length ? (paOk/this._paItems.length) : 0;

    const ranSec = (document.getElementById('ranTime')?.textContent||'').trim();
    const ranVal = /^\d+$/.test(ranSec) ? parseInt(ranSec,10) : null;

    const decAcc = this._decItems.length ? (this._decItems.filter(x=>x.ok).length/this._decItems.length) : 0;
    const sightAcc = this._sightItems.length ? (this._sightItems.filter(x=>x.ok).length/this._sightItems.length) : 0;

    const e1 = document.getElementById('sumPA'); if (e1) e1.textContent = this._paItems.length? (Math.round(paAcc*100)+'%') : '—';
    const e2 = document.getElementById('sumRAN'); if (e2) e2.textContent = ranVal==null? '—' : String(ranVal);
    const e3 = document.getElementById('sumDEC'); if (e3) e3.textContent = this._decItems.length? (Math.round(decAcc*100)+'%') : '—';
    const e4 = document.getElementById('sumSIGHT'); if (e4) e4.textContent = this._sightItems.length? (Math.round(sightAcc*100)+'%') : '—';
  },

  save(){
    try{
      const learnerId = (window.AppState && AppState.learner && AppState.learner.sysId) || '';
      const ts = window.__now ? window.__now() : Date.now();

      const paOk = this._paItems.filter(x=>x.sel===x.ans).length;
      const paAcc = this._paItems.length ? (paOk/this._paItems.length) : 0;

      const ranSecTxt = (document.getElementById('ranTime')?.textContent||'').trim();
      const ranSec = /^\d+$/.test(ranSecTxt) ? parseInt(ranSecTxt,10) : null;

      const decOk = this._decItems.filter(x=>x.ok).length;
      const decAcc = this._decItems.length ? (decOk/this._decItems.length) : 0;

      const sightOk = this._sightItems.filter(x=>x.ok).length;
      const sightAcc = this._sightItems.length ? (sightOk/this._sightItems.length) : 0;

      const log = {
        type: 'screen', // đánh giá nhanh
        learnerId,
        sessionId: Math.random().toString(36).slice(2,10),
        ts,
        paAcc,
        ranSec,
        decAcc,
        sightAcc,
        details: {
          pa: this._paItems.map(x=>({stem:x.stem, sel:x.sel, ans:x.ans})),
          ran: this._ranArr.slice(0,50),
          dec: this._decItems.map(x=>({w:x.w, ok:x.ok})),
          sight: this._sightItems.map(x=>({w:x.w, ok:x.ok}))
        }
      };
      window.AppState = window.AppState || { logs:[], learner:{ sysId:'' } };
      AppState.logs = Array.isArray(AppState.logs)? AppState.logs : [];
      AppState.logs.push(log);
      if (window.Store && typeof Store.set==='function') Store.set('logs', AppState.logs);

      alert('Đã lưu kết quả Đánh giá nhanh.');
      try{ if (window.VoiceUI && VoiceUI.enabled) VoiceUI.say('Đã lưu kết quả đánh giá nhanh'); }catch(_){}
      this.updateSummary();
    }catch(e){
      console.error('Assess save error', e);
      alert('Không thể lưu. Hãy thử lại.');
    }
  }
};
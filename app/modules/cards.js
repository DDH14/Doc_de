/* MODULE: CARDS – SRS cho tiếng Việt đơn âm tiết có dấu
   Mục tiêu (4.1):
   - Tự động hoá nhận diện–phát âm theo thanh điệu và chính tả ngữ cảnh (s/x, ch/tr, ng/ngh, g/gh, c/k/qu, n/l…).
   - Là “cầu nối” từ PA (âm vị–thanh điệu) đến Luyện đọc (fluency).
   - Ngắn – đều – đúng nhóm lỗi: ưu tiên thẻ “đến hạn” theo filter/tag trọng tâm; vòng 60s là luyện tự do (mặc định không ảnh hưởng lịch ôn).

   Phạm vi & dữ liệu (4.2):
   - Thẻ: { id, text (NFC), tags: ['tone'|'sx'|'chtr'|'ngngh'|'ckqu'|'ghg'|'nl'|'basic', ...] }
   - Trạng thái SRS theo người học: { easiness(E)=2.5, interval(I)=0, due=timestamp, reps=0 }
   - Emojis minh hoạ ổn định theo id/text. Tô màu 6 thanh điệu nhất quán.

   Giao diện & tương tác (4.3):
   - HUD: đến hạn/tổng, đã vững, filter, điểm/chuỗi, đồng hồ vòng 60s.
   - Mặt thẻ: chữ lớn, tô màu tone, emoji gợi nghĩa, progress “độ vững”.
   - Nút: 🔊 (0.9×), 🐢 (0.6–0.75×), 💡 (gợi ý nhẹ), Dễ/Vừa/Khó (Q=5/3/1).
   - Vòng 60s: luyện tăng nhịp, mặc định không cập nhật lịch (có cờ cấu hình).

   Thuật toán SRS (4.4 – SM2 rút gọn, mềm hoá cho trẻ nhỏ):
   - Q∈{1,3,5}. Nếu Q≥3: tăng E nhẹ; I: 1d (lần1) → 2–3d (lần2) → round(Iprev*E) (<=60d).
   - Q=1: giảm E (~-0.2, chặn dưới E≥1.3), I=0–1, due sớm. Nếu sai 2 lần trong 1 phiên: tạm “trì hoãn” (ban) đến phiên sau.
   - Không hạ E quá mạnh khi sai liên tiếp trong cùng phiên.

   Thích ứng (4.5):
   - Ưu tiên due trong filter hiện hành + trộn 20–30% “dễ/đã vững” để giữ nhịp thành công.
   - Gợi ý đổi filter nếu 7 ngày gần nhất, % đúng theo tag < 70% và lượt ≥ 8.
   - Phương ngữ: ưu tiên thẻ tag s/x, ch/tr, d/gi/r phù hợp vùng (Bắc/Nam).

   Quy trình phiên (4.6 – gợi ý hiển thị trong UI):
   - B1 Khởi động 30–45s: 3–5 thẻ đến hạn thuộc tag yếu (🔊 1 lần).
   - B2 Nòng cốt 3–5p: due theo filter → Đánh giá Dễ/Vừa/Khó.
   - B3 Củng cố 30–60s: xen 3 thẻ “đã vững”; có thể chơi vòng 60s.
   - B4 Tổng kết: số thẻ, % đúng, tăng “đã vững”, đề xuất tag.

   Đa giác quan & A11y (4.8, 4.9):
   - Emoji neo nghĩa; màu tone nhất quán; rung nhẹ khi Q=1; phát lại chậm 2 lần (có tôn trọng “giảm chuyển động”).
   - Nút ≥44px, Voice UI (nhấn giữ 0.4s), child mode: auto đọc mẫu khi hiện thẻ.

   Rủi ro – khắc phục (4.10):
   - Tone khó: ưu tiên 🐢 với tag 'tone', tăng tương phản màu; có thể phát cặp đối chiếu (mở rộng).
   - Thất bại liên tiếp: gợi ý tầng bậc, trì hoãn thẻ trong phiên, trộn thẻ dễ.
   - Quá tải due: gợi ý chia phiên; ưu tiên interval ngắn trước.
*/
(function(){
  'use strict';

  const TAG_KEY = 'cards_filter_tag';

  // ===== Helpers an toàn với global =====
  const now = ()=> (typeof window.__now === 'function' ? window.__now() : Date.now());
  const say = (t)=> window.VoiceUI?.say?.(t);
  const attachVoice = ()=> window.VoiceUI?.attachAll?.();
  const speak = (txt, rate)=> window.TTS?.speak?.(txt, rate);
  const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // TTS rate
  const baseRate = ()=> (window.AppState?.learner?.ttsRate) || 0.9;
  const slowRate = ()=> Math.max(0.6, Math.min(0.75, baseRate() - 0.2));

  // Vibrate small
  function vibrate(ms=35){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(_){} }

  // NFC normalize
  const nfc = s => (s && s.normalize ? s.normalize('NFC') : s);

  // ===== Tone màu (6 thanh) – nhất quán toàn app =====
  const TONE_COLORS = {
    'ngang':'#374151',   // xám đậm
    'sắc':'#ef4444',     // đỏ
    'huyền':'#3b82f6',   // lam
    'hỏi':'#f59e0b',     // cam
    'ngã':'#8b5cf6',     // tím
    'nặng':'#10b981'     // lục
  };
  // Bản đồ nguyên âm → 6 thanh
  const ACCENT_MAP = {
    'a': {ngang:'a', sắc:'á', huyền:'à', hỏi:'ả', ngã:'ã', nặng:'ạ'},
    'ă': {ngang:'ă', sắc:'ắ', huyền:'ằ', hỏi:'ẳ', ngã:'ẵ', nặng:'ặ'},
    'â': {ngang:'â', sắc:'ấ', huyền:'ầ', hỏi:'ẩ', ngã:'ẫ', nặng:'ậ'},
    'e': {ngang:'e', sắc:'é', huyền:'è', hỏi:'ẻ', ngã:'ẽ', nặng:'ẹ'},
    'ê': {ngang:'ê', sắc:'ế', huyền:'ề', hỏi:'ể', ngã:'ễ', nặng:'ệ'},
    'i': {ngang:'i', sắc:'í', huyền:'ì', hỏi:'ỉ', ngã:'ĩ', nặng:'ị'},
    'o': {ngang:'o', sắc:'ó', huyền:'ò', hỏi:'ỏ', ngã:'õ', nặng:'ọ'},
    'ô': {ngang:'ô', sắc:'ố', huyền:'ồ', hỏi:'ổ', ngã:'ỗ', nặng:'ộ'},
    'ơ': {ngang:'ơ', sắc:'ớ', huyền:'ờ', hỏi:'ở', ngã:'ỡ', nặng:'ợ'},
    'u': {ngang:'u', sắc:'ú', huyền:'ù', hỏi:'ủ', ngã:'ũ', nặng:'ụ'},
    'ư': {ngang:'ư', sắc:'ứ', huyền:'ừ', hỏi:'ử', ngã:'ữ', nặng:'ự'},
    'y': {ngang:'y', sắc:'ý', huyền:'ỳ', hỏi:'ỷ', ngã:'ỹ', nặng:'ỵ'}
  };
  const TONE_LOOKUP = (() => {
    const map = {};
    for (const [base, tones] of Object.entries(ACCENT_MAP)){
      for (const [tone, ch] of Object.entries(tones)){ map[ch] = tone; }
    }
    return map;
  })();
  function detectTone(word){
    for (let ch of word){ if (TONE_LOOKUP[ch]) return TONE_LOOKUP[ch]; }
    return 'ngang';
  }
  function toneColoredHTML(word){
    const t = detectTone(nfc(word));
    const c = TONE_COLORS[t] || '#111';
    return `<span class="cards-toned" data-tone="${t}" style="color:${c}">${escapeHTML(word)}</span>`;
  }

  // ===== Voice + Store + Sync =====
  function storeSet(key, val){
    try{ window.Store?.set ? window.Store.set(key,val) : localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }
  function syncEnq(obj){
    try{ window.Sync?.enqueue?.(obj); }catch(e){}
  }
  function localLog(key, row){
    try{
      const arr = JSON.parse(localStorage.getItem(key)||'[]');
      arr.push(row);
      // giữ tối đa 5000 bản ghi
      if (arr.length>5000) arr.splice(0, arr.length-5000);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(_){}
  }

  // ===== Emoji minh hoạ theo id/text (ổn định, offline) =====
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
    return mapByText[nfc(card.text)] || "❔";
  }

  // ===== CSS động =====
  function injectStyles(){
    if (document.getElementById('cardsFxCss')) return;
    const css = `
    .cards-hud{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .cards-hud .pill{background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:999px;padding:6px 10px;box-shadow:var(--shadow-sm,0 1px 2px rgba(0,0,0,.06))}
    .cards-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
    .cards-score{font-weight:900;color:var(--primary,#0ea5a0)}
    .cards-combo{font-weight:800;color:#6A1B9A}
    .cards-timer{font-weight:800;color:#C62828}
    .cards-card{
      position:relative; display:grid; grid-template-columns:1fr min(42%,220px); gap:12px;
      align-items:stretch; min-height:140px; border-radius:16px; border:1px solid var(--border,#e5e7eb);
      background:var(--panel,#fff); box-shadow:var(--shadow,0 1px 3px rgba(0,0,0,.08)); overflow:hidden;
    }
    @media (max-width:640px){ .cards-card{ grid-template-columns:1fr; min-height:180px; } }
    .cards-face{ display:flex; align-items:center; justify-content:center; font-size:clamp(30px,7vw,54px); padding:18px 22px; user-select:none; }
    .cards-illu{ border-left:1px dashed var(--border,#e5e7eb); display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.02); }
    @media (max-width:640px){ .cards-illu{ border-left:none; border-top:1px dashed var(--border,#e5e7eb); padding:10px 0; } }
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
    .tag-pill{padding:2px 8px;border-radius:999px;border:1px solid var(--border,#e5e7eb);background:#fff;font-size:12px}
    .tag-sx{background:#E3F2FD} .tag-chtr{background:#FFF3E0} .tag-tone{background:#F3E5F5}
    .cards-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
    .cards-guide{margin-top:8px;color:#555;font-size:.95em}
    .cards-toned[data-tone]{ text-decoration: underline wavy; text-decoration-thickness: 2px; text-underline-offset: 4px; }
    `;
    const st = document.createElement('style'); st.id='cardsFxCss'; st.textContent = css; document.head.appendChild(st);
  }

  // ===== Tag helpers =====
  function uniqueTags(cards){
    const set = new Set();
    for (const c of cards) (c.tags||[]).forEach(t=> set.add(t));
    return Array.from(set).sort();
  }
  function tagsLabel(tag){
    const map = { all:'Tất cả', basic:'Cơ bản', tone:'Thanh điệu', sx:'s/x', chtr:'ch/tr', nl:'n/l', ngngh:'ng/ngh', ckqu:'c/k/qu', ghg:'gh/g', 'dgr':'d/gi/r' };
    return map[tag] || tag;
  }

  // ===== Điểm/chuỗi =====
  function scoreFor(quality, combo){
    const base = quality>=5 ? 10 : (quality>=3 ? 6 : 3);
    const bonus = Math.min(4, Math.floor(combo/3));
    return base + bonus;
  }

  // ===== SM2 rút gọn (mềm hoá) =====
  function sm2Review(prev, q, sessionWrong=0){
    // prev: {easiness, interval, due, reps}
    let E = Math.max(1.3, prev.easiness || 2.5);
    let I = Math.max(0, prev.interval || 0);
    let reps = Math.max(0, prev.reps || 0);

    if (q >= 3){
      // Nâng E mềm: +0.1 (Dễ), ±0.0..-0.05 (Vừa)
      E += (q>=5 ? 0.10 : -0.05);
      if (E < 1.3) E = 1.3;

      if (reps === 0) I = 1;
      else if (reps === 1) I = Math.max(2, Math.round(2.5));
      else I = Math.round(I * E);
      I = Math.min(60, Math.max(1, I));
      reps += 1;
    } else {
      // Sai: giảm E vừa phải, nhưng không quá mạnh nếu sai lặp trong cùng phiên
      const penalty = sessionWrong >= 2 ? 0.0 : -0.20;
      E = Math.max(1.3, E + penalty);
      I = Math.max(0, Math.min(1, Math.round(I*0.5))); // nhắc lại gần
      // không tăng reps khi sai
    }

    const due = now() + I*24*3600*1000;
    return { easiness:E, interval:I, due, reps };
  }

  // ===== Module chính =====
  const CardsModule = {
    current:null,
    _filter: localStorage.getItem(TAG_KEY) || 'all',

    roundActive:false, timeLeft:0, timerId:null, roundAffectsSRS:false,
    score:0, combo:0, bestCombo:0, reviewed:0,

    // Thông tin phiên để tổng kết/analytics (4.7)
    sessId: 'cards_' + Math.random().toString(36).slice(2,8),
    sessionStart: now(),
    masteredStart: null,
    sessionCounts: { n:0, correct:0, perTag:{} },
    wrongCountByCard: {},      // id -> count trong phiên
    bannedIds: new Set(),      // thẻ trì hoãn đến phiên sau (sai 2 lần)
    dialect: 'Bắc',            // ưu tiên theo vùng
    suggestTag: null,          // đề xuất đổi filter

    get slowRate(){ return slowRate(); },

    setTag(tag){
      this._filter = tag || 'all';
      localStorage.setItem(TAG_KEY, this._filter);
      this.render();
    },

    reconcile(){
      window.AppState = window.AppState || {};
      if (!window.AppState.cardDeck) window.AppState.cardDeck = {};
      const src = Array.isArray(window.CARDS) ? window.CARDS : [];
      for (const c of src) {
        const id = c.id;
        if (!window.AppState.cardDeck[id]) window.AppState.cardDeck[id] = { id, easiness:2.5, interval:0, due: now(), reps:0 };
      }
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

    // Danh sách “đến hạn” (ưu tiên): lọc theo filter; sắp xếp due tăng; ưu tiên theo phương ngữ
    dueList(){
      const deck = window.AppState?.cardDeck || {};
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const filtered = this._filter==='all' ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
      const notBanned = filtered.filter(c => !this.bannedIds.has(c.id));
      const prioritized = this._prioritizeByDialect(notBanned);
      return prioritized
        .map(c => ({...c, _deck: deck[c.id]}))
        .sort((a,b) => ((a._deck?.due ?? 0) - (b._deck?.due ?? 0)));
    },

    _prioritizeByDialect(list){
      // Ưu tiên một số tag gắn với vùng (có thể mở rộng)
      try{
        this.dialect = window.AppState?.settings?.dialect || this.dialect;
      }catch(_){}
      const priTags = this.dialect==='Nam' ? ['dgr','sx','chtr'] : ['sx','chtr','dgr'];
      return list.slice().sort((a,b)=>{
        const at = (a.tags||[]).find(t=> priTags.includes(t)) ? 0 : 1;
        const bt = (b.tags||[]).find(t=> priTags.includes(t)) ? 0 : 1;
        return at - bt;
      });
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

    // Gợi ý đổi filter theo dữ liệu 7 ngày (4.5)
    computeFilterSuggestion(){
      const logs = JSON.parse(localStorage.getItem('cards_hist')||'[]');
      const weekAgo = now() - 7*24*3600*1000;
      const recents = logs.filter(r => r.ts >= weekAgo && r.type==='cards_review' && !r.free);
      const byTag = {};
      for (const r of recents){
        const tags = r.cardTags || [];
        const corr = r.quality>=3 ? 1:0;
        for (const t of tags){
          if (!byTag[t]) byTag[t] = {n:0, cr:0};
          byTag[t].n++; byTag[t].cr += corr;
        }
      }
      let sug = null; let minAcc = 1;
      for (const [t,v] of Object.entries(byTag)){
        if (v.n>=8){
          const acc = v.cr / v.n;
          if (acc < 0.7 && acc < minAcc){ minAcc=acc; sug = t; }
        }
      }
      this.suggestTag = sug;
    },

    render(){
      injectStyles();
      // lấy dialect từ settings nếu có
      try{ this.dialect = window.AppState?.settings?.dialect || this.dialect; }catch(_){}
      this.populateTagOptions();
      this.stopRound('rerender');

      const wrap = document.getElementById('cards-container'); if (!wrap) return;
      const list = this.dueList();
      const next = list[0];
      this.current = next || null;

      const s = this.stats();
      if (this.masteredStart == null) this.masteredStart = s.mastered; // snapshot đầu phiên
      this.computeFilterSuggestion();

      const suggestHTML = this.suggestTag
        ? `<span class="pill">Đề xuất: luyện <b>${tagsLabel(this.suggestTag)}</b> tuần tới (dữ liệu 7 ngày)</span>`
        : '';
      wrap.innerHTML = `
        <div class="cards-hud">
          <span class="pill">Đến hạn hôm nay: <b>${s.due}</b>/<b>${s.total}</b></span>
          <span class="pill">Đã vững: <b>${s.mastered}</b> (I ≥ 14d)</span>
          <span class="pill tag-pill ${this._filter!=='all'?'tag-'+this._filter:''}">Bộ lọc: ${tagsLabel(this._filter)}</span>
          ${suggestHTML}
          <div class="spacer"></div>
          <button class="ghost" onclick="CardsModule.startRound()" data-voice="Bắt đầu một vòng 60 giây">▶️ Vòng 60s</button>
          <button class="ghost" onclick="CardsModule.stopRound('stop')" id="btnStopRound" disabled>⏹ Dừng</button>
          <button class="ghost" onclick="CardsModule.toggleRoundAffect()" id="btnRoundMode" title="Bật/tắt ảnh hưởng lịch ôn">⚙️ SRS: <b>${this.roundAffectsSRS?'Có':'Không'}</b></button>
        </div>

        <div class="cards-bar" role="status" aria-live="polite">
          <span class="pill cards-score">Điểm: <b id="cardsScore">0</b></span>
          <span class="pill cards-combo">Chuỗi: <b id="cardsCombo">0</b></span>
          <span class="pill cards-timer">⏱ <b id="cardsTimer">—</b></span>
          <div class="spacer"></div>
          <div class="cards-progress" aria-label="Độ vững"><span id="cardsProg"></span></div>
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

        <div class="cards-guide">
          Hướng dẫn nhanh (4 bước):
          1) Bấm 🔊 (nếu khó nghe dấu → 🐢).
          2) Nhắc lại tiếng.
          3) Chọn Dễ/Vừa/Khó (cập nhật lịch ôn).
          4) Cuối phiên xem tổng kết. Gợi ý: mỗi buổi 4–7 phút, ưu tiên thẻ “đến hạn” theo bộ lọc.
        </div>
      `;

      const btnHear = document.getElementById('btnHear');
      const btnSlow = document.getElementById('btnHearSlow');
      const btnHint = document.getElementById('btnHint');
      if (btnHear) btnHear.onclick = ()=> {
        if (this.current) {
          const rate = (this.current.tags||[]).includes('tone') ? slowRate() : baseRate();
          speak(nfc(this.current.text), rate);
        }
      };
      if (btnSlow) btnSlow.onclick = ()=> { if (this.current) speak(nfc(this.current.text), slowRate()); };
      if (btnHint) btnHint.onclick = ()=> this.hint();

      if (next){ this.showCard(next); } else { this.noCardUI(); }

      attachVoice();
      if (window.AppState?.childMode && next){
        const rate = (next.tags||[]).includes('tone') ? slowRate() : baseRate();
        setTimeout(()=> speak(nfc(next.text), rate), 250);
      }
    },

    toggleRoundAffect(){
      this.roundAffectsSRS = !this.roundAffectsSRS;
      const btn = document.getElementById('btnRoundMode');
      if (btn) btn.innerHTML = `⚙️ SRS: <b>${this.roundAffectsSRS?'Có':'Không'}</b>`;
      say?.(this.roundAffectsSRS ? 'Vòng 60 giây có ảnh hưởng lịch ôn' : 'Vòng 60 giây không ảnh hưởng lịch ôn');
    },

    noCardUI(){
      const face = document.getElementById('cardsFace');
      const emoji = document.getElementById('cardsEmoji');
      if (face) face.textContent = 'Hôm nay không có thẻ đến hạn. Bấm “Vòng 60s” hoặc “Cập nhật thẻ mới”.';
      if (emoji) emoji.textContent = '🙂';
    },

    showCard(card){
      const face = document.getElementById('cardsFace'); if (!face) return;
      if (!prefersReducedMotion()){
        face.classList.remove('cards-pulse','cards-shake');
      }
      face.innerHTML = toneColoredHTML(nfc(card.text));

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
      if (face && !prefersReducedMotion()){
        face.classList.remove('cards-shake');
        face.classList.add('cards-pulse');
        setTimeout(()=> face.classList.remove('cards-pulse'), 500);
      }
      const emojiEl = document.getElementById('cardsEmoji');
      if (emojiEl && !prefersReducedMotion()){
        emojiEl.classList.add('hint');
        setTimeout(()=> emojiEl.classList.remove('hint'), 520);
      }
      speak(nfc(card.text), slowRate());
      say?.('Gợi ý nhẹ');
    },

    updateHud(){
      const sc = document.getElementById('cardsScore'); if (sc) sc.textContent = this.score;
      const cb = document.getElementById('cardsCombo'); if (cb) cb.textContent = this.combo;
      const tm = document.getElementById('cardsTimer'); if (tm) tm.textContent = this.roundActive ? (this.timeLeft+'s') : '—';
    },

    grade(q){
      const c = this.current; if (!c) return;
      const free = this.roundActive && !this.roundAffectsSRS;

      // Update session stats (4.7)
      const isCorrect = q>=3 ? 1 : 0;
      this.sessionCounts.n += 1;
      this.sessionCounts.correct += isCorrect;
      for (const t of (c.tags||[])){
        if (!this.sessionCounts.perTag[t]) this.sessionCounts.perTag[t] = {n:0, cr:0};
        this.sessionCounts.perTag[t].n += 1;
        this.sessionCounts.perTag[t].cr += isCorrect;
      }

      // Wrong handling: count & ban after 2 fails
      if (q<=1){
        this.wrongCountByCard[c.id] = (this.wrongCountByCard[c.id]||0)+1;
        if (this.wrongCountByCard[c.id] >= 2){
          this.bannedIds.add(c.id); // trì hoãn đến phiên sau
        }
      }

      // SR state update (unless free mode)
      window.AppState = window.AppState || {};
      window.AppState.cardDeck = window.AppState.cardDeck || {};
      const prev = window.AppState.cardDeck[c.id] || { id:c.id, easiness:2.5, interval:0, due: now(), reps:0 };

      let updated = prev;
      if (!free){
        updated = sm2Review(prev, q, this.wrongCountByCard[c.id]||0);
        window.AppState.cardDeck[c.id] = { id:c.id, ...updated };
        storeSet('cards', window.AppState.cardDeck);
      }

      // Score/combo UI
      if (q>=3){ this.combo += 1; this.bestCombo = Math.max(this.bestCombo, this.combo); } else this.combo = 0;
      const pts = scoreFor(q, this.combo);
      this.score += pts; this.reviewed += 1;
      this.updateHud();

      const face = document.getElementById('cardsFace');
      if (face && !prefersReducedMotion()){
        if (q>=5){ face.classList.add('cards-pulse'); setTimeout(()=> face.classList.remove('cards-pulse'), 500); }
        if (q<=1){ face.classList.add('cards-shake'); setTimeout(()=> face.classList.remove('cards-shake'), 350); }
      }
      if (q<=1){
        vibrate(50);
        // Gợi ý tầng bậc: phát chậm 2 lần (4.8)
        const text = nfc(c.text);
        speak(text, slowRate());
        setTimeout(()=> speak(text, slowRate()), 280);
      }
      if (this.combo>0 && this.combo%3===0){
        const st = document.getElementById('cardsSticker');
        if (st){ st.textContent = this.combo>=9 ? '🔥' : (this.combo>=6 ? '⚡️' : '✨'); st.style.display=''; }
        window.Effects?.confetti?.(40,{anchorEl:document.getElementById('cardsCard')});
      }

      // Log review (local + sync)
      const log = {
        type: 'cards_review',
        learnerId: window.AppState?.learner?.sysId || '',
        sessionId: this.sessId,
        ts: now(),
        free,
        cardId: c.id, cardText: nfc(c.text), cardTags: c.tags || [],
        quality: q,
        easiness: updated.easiness, interval: updated.interval, due: updated.due,
        filterTag: this._filter
      };
      localLog('cards_hist', log);
      syncEnq(log);

      this.nextCard();
    },

    // Trộn 70–80% due + 20–30% “đã vững” (4.5)
    nextCard(){
      const deck = window.AppState?.cardDeck || {};
      const cards = Array.isArray(window.CARDS) ? window.CARDS : [];
      const filtered = this._filter==='all' ? cards : cards.filter(c => (c.tags||[]).includes(this._filter));
      const notBanned = filtered.filter(c => !this.bannedIds.has(c.id));

      const dueCandidates = notBanned.filter(c => (deck[c.id]?.due || 0) <= now())
                                     .sort((a,b)=> (deck[a.id]?.due||0) - (deck[b.id]?.due||0));
      const mastered = notBanned.filter(c => (deck[c.id]?.interval||0) >= 14);

      let next = null;
      const r = Math.random();
      if (dueCandidates.length && r < 0.75) next = dueCandidates[0];
      else if (mastered.length && r < 0.9) next = mastered[Math.floor(Math.random()*mastered.length)];
      else if (notBanned.length) next = notBanned[Math.floor(Math.random()*notBanned.length)];

      this.current = next || null;
      if (!next){ this.noCardUI(); return; }
      this.showCard(next);

      if (window.AppState?.childMode){
        const rate = (next.tags||[]).includes('tone') ? slowRate() : baseRate();
        setTimeout(()=> speak(nfc(next.text), rate), 200);
      }
    },

    startRound(sec=60){
      if (this.roundActive) return;
      this.roundActive = true; this.timeLeft = sec; this.score=0; this.combo=0; this.bestCombo=0; this.reviewed=0;
      this.sessId = 'cards_' + Math.random().toString(36).slice(2,8);
      this.sessionStart = now();
      this.sessionCounts = { n:0, correct:0, perTag:{} };
      this.wrongCountByCard = {};
      this.bannedIds = new Set();

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
      syncEnq({ type:'cards_round_start', sessionId:this.sessId, ts:this.sessionStart, affectSRS:this.roundAffectsSRS, filterTag:this._filter });
    },

    stopRound(reason='stop'){
      if (!this.roundActive) return;
      this.roundActive = false;
      clearTimeout(this.timerId); this.timerId=null;
      const btnStop = document.getElementById('btnStopRound'); if (btnStop) btnStop.disabled = true;
      this.updateHud();

      // Tổng kết (4.6, 4.7)
      const s = this.stats();
      const acc = this.sessionCounts.n ? Math.round(100 * this.sessionCounts.correct / this.sessionCounts.n) : 0;
      let topTag = null, worstAcc = 101;
      for (const [t,v] of Object.entries(this.sessionCounts.perTag)){
        const a = v.n? Math.round(100*v.cr/v.n):100;
        if (a < worstAcc && v.n>=3){ worstAcc = a; topTag = t; }
      }
      const masteredGain = (s.mastered - (this.masteredStart ?? s.mastered));
      let stars = 0;
      if (this.score>=180) stars = 2; else if (this.score>=100) stars = 1;
      if (stars>0 && window.App){ for(let i=0;i<stars;i++) window.App.addStar(1); window.Effects?.confetti?.(80); }
      const msg = [
        `Vòng kết thúc (${reason==='timeout'?'hết giờ':'dừng'}):`,
        `• Điểm: ${this.score} | Chuỗi cao nhất: ${this.bestCombo}`,
        `• Ôn: ${this.reviewed} thẻ | Ước % đúng: ${acc}%`,
        `• “Đã vững” thay đổi: ${masteredGain>=0?'+':''}${masteredGain}`,
        topTag ? `• Gợi ý: tập trung ${tagsLabel(topTag)} buổi tới` : ''
      ].filter(Boolean).join('\n');
      alert(msg);

      // Log summary
      const endTs = now();
      syncEnq({
        type:'cards_round',
        learnerId: window.AppState?.learner?.sysId || '',
        sessionId: this.sessId,
        ts: endTs,
        filterTag: this._filter,
        score: this.score, bestCombo: this.bestCombo, reviewed: this.reviewed,
        durationSec: Math.round((endTs - this.sessionStart)/1000),
        accPct: acc, masteredGain, reason, affectSRS: this.roundAffectsSRS
      });
      localLog('cards_hist', { type:'cards_round', sessionId:this.sessId, ts:endTs, score:this.score, reviewed:this.reviewed, accPct:acc, bestCombo:this.bestCombo, filterTag:this._filter });
    }
  };

  // Fallback SR nếu môi trường chưa có srReview (được thay bằng sm2Review mềm hoá)
  function simpleSrReview(prev, q){
    return sm2Review(prev, q, 0);
  }

  // ===== Tự khởi động và chờ dữ liệu CARDS =====
  function autoInit(){
    // Đợi DOM sẵn sàng
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', ()=> { try{ CardsModule.render(); }catch(e){ console.error(e); } });
    } else {
      try{ CardsModule.render(); }catch(e){ console.error(e); }
    }
    // Nếu CARDS chưa có, chờ tối đa ~12.5s rồi render lại khi có dữ liệu
    if (!Array.isArray(window.CARDS) || !window.CARDS.length){
      let tries = 0;
      const id = setInterval(()=>{
        tries++;
        if (Array.isArray(window.CARDS) && window.CARDS.length){
          clearInterval(id);
          try{ CardsModule.render(); }catch(e){ console.error(e); }
        }
        if (tries>50) clearInterval(id);
      }, 250);
    }
  }

  // HTML helpers
  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // Xuất module
  window.CardsModule = CardsModule;
  // Tương thích HTML index: App.cards.*
  window.App = window.App || {};
  window.App.cards = window.App.cards || {
    setTag: (v)=> CardsModule.setTag(v),
    reconcile: ()=> CardsModule.reconcile()
  };

  // Khởi chạy
  autoInit();
})();
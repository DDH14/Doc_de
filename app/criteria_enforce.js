/* app/criteria_enforce.js
   Mục tiêu:
   1) Hiển thị "Mục tiêu học tập" rõ ràng trên mỗi màn (PA/Cards/Reading/Game/Home).
   2) Sau thao tác, hiện "Ví dụ – Phản ví dụ" kèm quy tắc (c/k/qu; ng/ngh; g/gh; s/x; ch/tr; n/l) trong PA.
   3) Trình tự nội dung mạch lạc: thêm dải chips “Âm vị → Ghép âm → Thanh điệu → Chính tả → Đọc → Hiểu”.
   4) Mã màu 6 thanh điệu thống nhất toàn app; tô màu tự động các từ có dấu.
   5) Tránh ngoại lệ gây nhiễu ở cấp đầu: đánh dấu "minh họa quy tắc" cho giả từ, nhắc tránh xuất hiện ở Level 1.
*/

(function(){
  'use strict';

  /* ====== 0) CSS & màu thanh điệu nhất quán ====== */
  const TONE_COLORS = {
    'ngang':'#374151','sắc':'#ef4444','huyền':'#3b82f6','hỏi':'#f59e0b','ngã':'#8b5cf6','nặng':'#10b981'
  };
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
  const TONE_LOOKUP = (()=>{ const m={}; for(const t of Object.values(ACCENT_MAP)){ for(const [tone,ch] of Object.entries(t)) m[ch]=tone; } return m; })();

  function injectCSS(){
    if (document.getElementById('criteriaCss')) return;
    const css = `
      .goalbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
      .goalbar .pill{background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.06);font-size:12px}
      .tone-pill{display:inline-block;padding:2px 8px;border-radius:999px;color:#fff;font-weight:700;font-size:12px;margin-right:4px}
      .rulebox{margin-top:8px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:8px 10px;color:#7a5200;font-size:.95em}
      .rulebox b.badge{display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:2px 8px;margin-right:6px}
      .criteria-note{margin-top:6px;color:#555;font-size:.92em}
      /* Màu 6 thanh cho lớp token */
      .token.tone-ngang{color:${TONE_COLORS['ngang']};text-decoration:underline wavy;text-underline-offset:4px}
      .token.tone-sắc{color:${TONE_COLORS['sắc']};text-decoration:underline wavy;text-underline-offset:4px}
      .token.tone-huyền{color:${TONE_COLORS['huyền']};text-decoration:underline wavy;text-underline-offset:4px}
      .token.tone-hỏi{color:${TONE_COLORS['hỏi']};text-decoration:underline wavy;text-underline-offset:4px}
      .token.tone-ngã{color:${TONE_COLORS['ngã']};text-decoration:underline wavy;text-underline-offset:4px}
      .token.tone-nặng{color:${TONE_COLORS['nặng']};text-decoration:underline wavy;text-underline-offset:4px}
    `;
    const st=document.createElement('style'); st.id='criteriaCss'; st.textContent=css; document.head.appendChild(st);
  }

  function detectTone(word){
    for (const ch of (word||'')){ if (TONE_LOOKUP[ch]) return TONE_LOOKUP[ch]; }
    return 'ngang';
  }
  function toneClass(word){
    const t = detectTone(String(word||''));
    const map = { 'ngang':'tone-ngang','sắc':'tone-sắc','huyền':'tone-huyền','hỏi':'tone-hỏi','ngã':'tone-ngã','nặng':'tone-nặng' };
    return map[t] || 'tone-ngang';
  }
  // Expose toneClass để Cards/PA có thể dùng lại nếu cần
  window.toneClass = window.toneClass || toneClass;

  /* ====== 1) Mục tiêu học tập hiển thị rõ ràng ====== */
  const GOALS = {
    'screen-home': ['Âm vị → Ghép âm → Thanh điệu → Chính tả → Đọc → Hiểu', 'Ngắn – Đều – Đúng nhóm lỗi', 'Dữ liệu hướng dẫn luyện tập'],
    'screen-pa':   ['Nhận diện onset–vần', '6 thanh điệu (mã màu)', 'Cặp tối thiểu theo quy tắc ngữ cảnh'],
    'screen-cards':['SRS – Ôn đúng lúc', 'Lọc theo tag (s/x, ch/tr, tone…)', 'Tự động hoá đơn vị tiếng'],
    'screen-reading':['WCPM & % đúng', 'Đánh dấu lỗi theo loại', 'Câu hỏi hiểu nội dung'],
    'screen-game': ['Luyện theo thanh/tag', 'Nghe mẫu → chọn đúng', 'Động lực & phản hồi tức thì']
  };

  function injectGoals(){
    Object.entries(GOALS).forEach(([id, goals])=>{
      const sc = document.getElementById(id); if (!sc) return;
      // tránh chèn lặp
      if (sc.querySelector('.goalbar')) return;
      const host = sc.querySelector('.hero .hero-content') || sc.querySelector('.section');
      if (!host) return;
      const bar = document.createElement('div');
      bar.className = 'goalbar';
      bar.setAttribute('aria-label','Mục tiêu học tập');
      bar.innerHTML = goals.map(g=> `<span class="pill">${g}</span>`).join('');
      host.appendChild(bar);

      // Legend 6 thanh cho PA/Reading (hiển thị ổn định)
      if (id==='screen-pa' || id==='screen-reading'){
        const l = document.createElement('div');
        l.style.marginTop = '6px';
        l.innerHTML =
          `<span class="tone-pill" style="background:${TONE_COLORS.ngang}">ngang</span>`+
          `<span class="tone-pill" style="background:${TONE_COLORS['sắc']}">sắc</span>`+
          `<span class="tone-pill" style="background:${TONE_COLORS['huyền']}">huyền</span>`+
          `<span class="tone-pill" style="background:${TONE_COLORS['hỏi']}">hỏi</span>`+
          `<span class="tone-pill" style="background:${TONE_COLORS['ngã']}">ngã</span>`+
          `<span class="tone-pill" style="background:${TONE_COLORS['nặng']}">nặng</span>`;
        host.appendChild(l);
      }
    });

    // Trình tự mạch lạc trên Home
    const home = document.getElementById('screen-home');
    if (home && !home.querySelector('.criteria-note')){
      const note = document.createElement('div');
      note.className='criteria-note';
      note.textContent = 'Trình tự gợi ý: Âm vị → Ghép âm → Thanh điệu → Chính tả theo ngữ cảnh → Đọc trôi chảy → Hiểu nội dung (tăng dần độ khó).';
      (home.querySelector('.hero .hero-content')||home).appendChild(note);
    }
  }

  /* ====== 2) Hộp quy tắc + Ví dụ – Phản ví dụ trong PA ====== */
  const RULES = {
    'sx': {
      name:'s/x', tip:'s (xát) vs x (xì). Luyện nghe đầu lưỡi và vị trí ma sát.',
      explain:(a,b)=>`<b class="badge">Quy tắc s/x</b> Ví dụ: <b>${a}</b> — Phản ví dụ: <b>${b}</b>. Tập trung phân biệt đầu âm /s/ và /x/.`
    },
    'chtr': {
      name:'ch/tr', tip:'Ch (đầu lưỡi) vs Tr (quặt lưỡi).',
      explain:(a,b)=>`<b class="badge">Quy tắc ch/tr</b> Ví dụ: <b>${a}</b> — Phản ví dụ: <b>${b}</b>. Nghe vị trí lưỡi để phân biệt.`
    },
    'ngngh': {
      name:'ng/ngh', tip:'“ngh” dùng trước e, i, ê.',
      explain:(a,b)=>`<b class="badge">ng/ngh</b> Trước e/i/ê dùng <b>ngh</b>: ví dụ <b>${a}</b>; <b>${b}</b> là phản ví dụ.`
    },
    'ghg': {
      name:'g/gh', tip:'“gh” dùng trước e, i, ê; “g” trước a, o, u…',
      explain:(a,b)=>`<b class="badge">g/gh</b> Trước e/i/ê dùng <b>gh</b>: <b>${a}</b>; <b>${b}</b> là phản ví dụ.`
    },
    'ckqu': {
      name:'c/k/qu', tip:'c: a/o/u; k: e/i/ê; qu: đi với u.',
      explain:(a,b)=>`<b class="badge">c/k/qu</b> <b>c</b> đứng trước a/o/u; <b>k</b> trước e/i/ê; <b>qu</b> thường đi kèm u. Ví dụ: <b>${a}</b>; Phản ví dụ: <b>${b}</b>.`
    },
    'nl': {
      name:'n/l', tip:'Phân biệt n và l ở đầu âm.',
      explain:(a,b)=>`<b class="badge">n/l</b> Ví dụ: <b>${a}</b> — Phản ví dụ: <b>${b}</b>. Luyện vị trí đầu lưỡi.`
    },
    'tone':{
      name:'tone', tip:'6 thanh điệu (mã màu) – chú ý cặp hỏi/ngã & huyền/hỏi.',
      explain:(a,b)=>`<b class="badge">Thanh điệu</b> Chỉ đổi <i>dấu thanh</i> trên cùng base. Ví dụ: <b>${a}</b> — Phản ví dụ: <b>${b}</b>.`
    }
  };

  function guessTagFromPair(a,b){
    if (!a||!b) return '';
    const A=a.normalize('NFC'), B=b.normalize('NFC');
    // đơn giản hoá nhận diện
    if (/^ngh/.test(A) || /^ng[eiê]/.test(B)) return 'ngngh';
    if (/^gh[eiê]/.test(A) || /^g[eiê]/.test(B)) return 'ghg';
    if (/^[ckq]/.test(A) || /^[ckq]/.test(B)) return 'ckqu';
    if (/^tr/.test(A) || /^ch/.test(A) || /^tr/.test(B) || /^ch/.test(B)) return 'chtr';
    if (/^[sx]/.test(A) || /^[sx]/.test(B)) return 'sx';
    if (/^[nl]/.test(A) || /^[nl]/.test(B)) return 'nl';
    return '';
  }

  // đánh dấu "giả từ/ngoại lệ" (không dùng ở Level 1)
  function isPseudoWord(w){
    return /(xữa|k[ueiy]|ko|kuy|kue|ngi)/i.test(w); // mẫu hay dùng minh hoạ quy tắc
  }

  function levelNow(){
    // lấy cấp độ hiện tại trong PA nếu có
    const sel = document.getElementById('paLevelSel');
    const v = sel ? parseInt(sel.value,10) : NaN;
    return Number.isFinite(v) ? v : 2;
  }

  function mountRuleBox(container, html){
    let box = container.querySelector('.rulebox');
    if (!box){ box = document.createElement('div'); box.className='rulebox'; container.appendChild(box); }
    box.innerHTML = html;
  }

  function enhancePA(){
    const sc = document.getElementById('screen-pa'); if (!sc) return;
    const body = sc.querySelector('#paBody') || sc;
    if (!body) return;

    // Khi có tone-grid hoặc pair-grid, gắn event để hiển thị "Ví dụ – Phản ví dụ"
    body.addEventListener('click', (e)=>{
      const pairBtn = e.target.closest('#'+CId('pair-btn-placeholder')); // placeholder tránh bắt nhầm — sẽ xử lý thật bên dưới
    });

    // Pair
    const pairGrid = body.querySelector('.pair-grid');
    if (pairGrid){
      pairGrid.addEventListener('click', (ev)=>{
        const btn = ev.target.closest('.pair-btn'); if (!btn) return;
        const labels = Array.from(pairGrid.querySelectorAll('.pair-btn')).map(b=> b.textContent.trim()).slice(0,2);
        if (labels.length<2) return;
        const [w1,w2] = labels;
        const tag = guessTagFromPair(w1,w2) || (window.PAModule?.S?.current?.item?.tags?.[0]) || '';
        const r = RULES[tag] || RULES['tone'];
        // Ưu tiên đặt ví dụ cho "đúng" nếu suy luận được (dựa vào quy tắc)
        let example=w1, counter=w2;
        if (tag==='ghg' && /^g[eiê]/.test(w1)) { example=w2; counter=w1; }
        if (tag==='ngngh' && /^ng[eiê]/.test(w1)) { example=w2; counter=w1; }
        if (tag==='ckqu' && /^[ki]/i.test(w1)) { example=w1; counter=w2; } // không chắc; chỉ minh họa
        // Cảnh báo ngoại lệ ở Level 1
        const pseudo = isPseudoWord(w1) || isPseudoWord(w2);
        const lv = levelNow();
        const extra = pseudo && lv===1 ? `<div class="criteria-note">Lưu ý: đây là <b>minh hoạ quy tắc</b>, tránh dùng ở cấp độ đầu.</div>` : '';
        mountRuleBox(body, `${r.explain(example, counter)}<div class="criteria-note">${r.tip}</div>${extra}`);
      }, { once:false });
    }

    // Tone: thêm legend (đảm bảo)
    const toneGrid = body.querySelector('.tone-grid');
    if (toneGrid && !body.querySelector('.tone-legend')){
      const lg = document.createElement('div');
      lg.className='tone-legend';
      lg.style.marginTop='6px';
      lg.innerHTML =
        `<span class="tone-pill" style="background:${TONE_COLORS.ngang}">ngang</span>`+
        `<span class="tone-pill" style="background:${TONE_COLORS['sắc']}">sắc</span>`+
        `<span class="tone-pill" style="background:${TONE_COLORS['huyền']}">huyền</span>`+
        `<span class="tone-pill" style="background:${TONE_COLORS['hỏi']}">hỏi</span>`+
        `<span class="tone-pill" style="background:${TONE_COLORS['ngã']}">ngã</span>`+
        `<span class="tone-pill" style="background:${TONE_COLORS['nặng']}">nặng</span>`;
      body.appendChild(lg);
    }

    // Segment: nếu phát hiện qu/ngh/gh -> gợi ý ngắn
    const big = body.querySelector('.pa-bigword'); 
    if (big){
      const w = big.textContent.trim();
      let hint = '';
      if (/^qu/.test(w)) hint = RULES.ckqu.tip;
      else if (/ngh/.test(w)) hint = RULES.ngngh.tip;
      else if (/gh[eiê]/.test(w)) hint = RULES.ghg.tip;
      if (hint) mountRuleBox(body, `<b class="badge">Gợi ý</b> ${hint}`);
    }
  }

  // Quan sát thay đổi trong PA để gắn rulebox mỗi lần render
  function observePA(){
    const host = document.getElementById('screen-pa'); if (!host) return;
    const target = host.querySelector('#paBody') || host;
    const mo = new MutationObserver(()=> enhancePA());
    mo.observe(target, { childList:true, subtree:true });
    enhancePA();
  }

  /* ====== 3) Tô màu thanh trong các thẻ từ ở Cards/PA (nếu xuất hiện .token) ====== */
  function colorizeTokens(root=document){
    const tokens = root.querySelectorAll('.token:not([data-tone])');
    tokens.forEach(el=>{
      const t = toneClass(el.textContent.trim());
      el.classList.add(t);
      el.setAttribute('data-tone', t.replace('tone-',''));
    });
  }

  /* ====== 4) Khởi động ====== */
  function init(){
    injectCSS();
    injectGoals();
    observePA();
    colorizeTokens(document);

    // Khi điều hướng trong SPA → chèn lại mục tiêu/hint
    if (window.App?.nav && !App._criteriaPatched){
      const orig = App.nav.bind(App);
      App.nav = function(scr){
        const r = orig(scr);
        setTimeout(()=>{ injectGoals(); if (scr==='pa') observePA(); colorizeTokens(document); }, 60);
        return r;
      };
      App._criteriaPatched = true;
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
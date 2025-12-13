/* MODULE: PA – Luyện âm vị (Segment • Tone • Pair)
   Mục tiêu:
   - 3.2.x: Hỗ trợ 3 loại nhiệm vụ: Segment (ghép onset–rime/cụm phụ âm), Tone (6 thanh), Pair (cặp tối thiểu).
   - 3.3: Thiết kế kích thích, chọn từ/âm thông dụng, emoji gợi nghĩa, TTS nghe chậm/nhanh.
   - 3.4: Quy trình 5 bước (cue → nghe/nhìn → thao tác → phản hồi tức thì → củng cố).
   - 3.5: Gợi ý tầng bậc (🐢 nghe chậm; manh mối quy tắc; so sánh đối chiếu).
   - 3.6: Ghi nhận analytics phiên: điểm tức thì, % đúng theo loại/tag, RT trung vị, error pattern, gợi ý ưu tiên.
   - 3.7: Theo dõi độ khó tạm thời (p-value) cho item/tag; giữ vùng 0.4–0.8, note để tinh chỉnh.

   Lưu ý:
   - Không phụ thuộc thư viện bên ngoài. Tích hợp mềm với TTS.speak, VoiceUI, Store nếu có.
   - Có fallback dữ liệu nếu window.PA_ITEMS trống.
   - A11y: hỗ trợ bàn phím, ARIA role, target ≥ 44px, màu thanh điệu nhất quán.
*/

(function(){
  'use strict';

  const C = { containerId: 'pa-container' };

  // Màu 6 thanh điệu – dùng nhất quán trên toàn mô-đun
  const TONE_NAMES = ['ngang','sắc','huyền','hỏi','ngã','nặng'];
  const TONE_COLORS = {
    'ngang':'#374151',   // xám đậm, phẳng
    'sắc':'#ef4444',     // đỏ
    'huyền':'#3b82f6',   // lam
    'hỏi':'#f59e0b',     // cam
    'ngã':'#8b5cf6',     // tím
    'nặng':'#10b981'     // lục
  };

  // Bản đồ nguyên âm → 6 thanh (chữ thường)
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
  // Tập ký tự để nhận diện thanh hiện có trong một tiếng
  const TONE_LOOKUP = (() => {
    const map = {};
    for (const [base, tones] of Object.entries(ACCENT_MAP)){
      for (const [tone, ch] of Object.entries(tones)){
        map[ch] = tone;
      }
    }
    return map;
  })();

  // Emoji gợi nghĩa (fallback: chữ cái lớn nếu không có)
  const EMOJI = {
    // Người – gia đình
    'bé':'🧒','mẹ':'👩','bà':'👵','bố':'👨','ông':'👴','cô':'👩‍🏫','chú':'👨‍🦳',
    // Đồ vật – nơi chốn
    'nhà':'🏠','cửa':'🚪','bàn':'🛋️','ghế':'🪑','bút':'🖊️','vở':'📒','thước':'📏','giấy':'📄',
    // Cây cối – hoa quả
    'cây':'🌳','lá':'🍃','hoa':'🌸','quả':'🍎','lúa':'🌾',
    // Động vật – vật nuôi
    'cá':'🐟','gà':'🐔','chó':'🐶','mèo':'🐱','chim':'🐦','trứng':'🥚','trâu':'🐃','ngỗng':'🦢',
    // Thiên nhiên – thời tiết – địa lí
    'trăng':'🌙','sao':'⭐','mưa':'🌧️','nắng':'🌤️','mây':'☁️','gió':'🌬️','sương':'🌫️',
    'sông':'🏞️','biển':'🌊','núi':'⛰️','đường':'🛣️','trời':'🌤️',
    // Hoạt động thường ngày
    'đi':'🚶','về':'🏠','học':'📚','đọc':'📖','viết':'✍️','chơi':'🎲','chạy':'🏃','nhảy':'🤸',
    'ăn':'🍽️','uống':'🥤','ngủ':'😴','thức':'☕',
    // Chính tả – cặp dễ nhầm
    'chanh':'🍋','tranh':'🖼️','xưa':'📜','quà':'🎁','quê':'🏡','kẹo':'🍬','cối':'⚙️',
    'nghỉ':'🛌','nghệ':'🧡','nồi':'🍲','lồi':'⚪','châu':'🌏','khỏe':'💪','bữa':'🍽️',
    'quạt':'🌀','quên':'💭','ghé':'🚪','ghen':'😤','giỏ':'🧺','sáo':'🎶','xáo':'🥣',
    'sẻ':'🐦','xẻ':'🪚','trẻ':'🧒','chẻ':'🪓','nâu':'🟫','lâu':'⏳','nặng':'⚖️','lặng':'🤫',
    'trôi':'🌊','quý':'💎','xương':'🦴',
    // Các từ ví dụ thêm
    'cháo':'🍲','xanh':'🟩','trường':'🏫','thuốc':'💊','bắp':'🌽','cầu':'🌉','người':'🧑',
    'sôi':'🍲','xôi':'🍚'
  };

  // Mẹo/giải thích ngắn theo tag hoặc mẫu chữ
  const HINTS_BY_TAG = {
    'sx':'Phân biệt s (xát) và x (xì).',
    'chtr':'Ch và Tr khác vị trí lưỡi; nghe đầu lưỡi (ch) vs. quặt lưỡi (tr).',
    'ngngh':'“ngh” dùng trước e, i, ê.',
    'ghg':'“gh” dùng trước e, i, ê; còn g đứng trước a, o, u…',
    'ckqu':'c/k/qu chọn theo nguyên âm sau: c: a, o, u; k: e, i, ê; qu: thường đi với u.',
    'tone_hỏi_ngã':'Hỏi (ˇ) uốn; Ngã (~) rung/nhấn gãy.',
  };
  const HINTS_BY_PATTERN = [
    { test: w=> /ngh/.test(w), hint: HINTS_BY_TAG.ngngh },
    { test: w=> /gh[eiê]/.test(w), hint: HINTS_BY_TAG.ghg },
    { test: w=> /^qu/.test(w), hint: '“qu” bắt buộc có “u” sau q.' },
    { test: w=> /^[ckq]/.test(w), hint: HINTS_BY_TAG.ckqu }
  ];

  // Âm báo nhẹ để “chuẩn bị chú ý”
  function cueBeep(freq=660, dur=0.08, vol=0.06){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type='sine'; o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, dur*1000);
    }catch(_){}
  }

  function vibrate(ms=35){
    try{ if (navigator.vibrate) navigator.vibrate(ms); }catch(_){}
  }

  function speak(text, rate){
    try{
      const r = (rate!=null? rate : (window.AppState?.learner?.ttsRate)||0.9);
      if (window.TTS && TTS.speak) TTS.speak(text, r);
      else if (window.App && App.speak) App.speak(text);
    }catch(_){}
  }

  function speakSlow(text){
    const base = (window.AppState?.learner?.ttsRate)||0.9;
    speak(text, Math.max(0.6, Math.min(0.9, base - 0.2)));
  }

  // Tô màu thanh điệu trong một tiếng (dựa trên ký tự nguyên âm mang dấu)
  function detectTone(word){
    for (let ch of word){
      const t = TONE_LOOKUP[ch];
      if (t) return t;
    }
    return 'ngang';
  }
  function colorToneHTML(word){
    const t = detectTone(word);
    // Tô màu nhẹ toàn từ theo tone; nhấn dấu bằng viền dưới
    const c = TONE_COLORS[t] || '#111';
    return `<span class="pa-word" data-tone="${t}" style="color:${c}">${escapeHTML(word)}</span>`;
  }

  // Áp dấu thanh cho 1 tiếng base (quy tắc đơn giản: đặt trên nguyên âm cuối)
  function applyTone(syllable, tone){
    if (!syllable) return syllable;
    const vowels = Array.from(syllable).map((ch,i)=> ({i, ch, isVowel: ACCENT_MAP[ch]!=null}));
    const last = [...vowels].reverse().find(v=> v.isVowel);
    if (!last) return syllable;
    const toneChar = ACCENT_MAP[last.ch]?.[tone];
    if (!toneChar) return syllable;
    const arr = Array.from(syllable);
    arr[last.i] = toneChar;
    return arr.join('');
  }

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }

  // STATE phiên
  const S = {
    mode: 'segment',           // 'segment' | 'tone' | 'pair'
    level: 1,                  // 1 | 2 | 3
    dialect: 'Bắc',            // 'Bắc' | 'Nam' (tối thiểu, mở rộng sau)
    extend: false,             // luyện mở rộng sau phản hồi
    stats: {
      points: 0,
      streak: 0,
      trials: 0,
      corrects: 0,
      rt: [],                  // ms
      perType: { segment:{n:0,cr:0}, tone:{n:0,cr:0}, pair:{n:0,cr:0} },
      perTag: {},              // tag: {n, cr}
      errorPattern: {}         // key: count
    },
    current: {
      item: null,              // data của mục hiện tại
      startAt: 0,              // timestamp
      hints: 0,
      id: ''
    },
    sessionStart: Date.now()
  };

  // DỮ LIỆU: lấy từ window.PA_ITEMS (nếu có) + bổ sung fallback
  function normalizeData(){
    const raw = Array.isArray(window.PA_ITEMS) ? window.PA_ITEMS : [];
    const segments = raw.filter(x=> x && x.type==='segment' && Array.isArray(x.parts) && x.parts.length>=2)
      .map(x=> ({...x, level: x.level||inferLevelFromSegment(x)}));
    const pairs = raw.filter(x=> x && x.type==='pair' && Array.isArray(x.choices) && x.choices.length===2);
    const tones = raw.filter(x=> x && x.type==='tone'); // hiếm khi có, ta sinh động

    // Fallback – theo 3 cấp
    const fallbackSegments = [
      // Level 1: CV/CVC đơn
      {type:'segment', target:'cá', parts:['c','á'], level:1, tags:['rime:a']},
      {type:'segment', target:'bé', parts:['b','é'], level:1, tags:['rime:e']},
      {type:'segment', target:'mèo', parts:['m','eo'], level:1, tags:['rime:eo']},
      {type:'segment', target:'bắp', parts:['b','ắp'], level:1, tags:['rime:ăp']},
      // Level 2: cụm phụ âm phổ biến
      {type:'segment', target:'tranh', parts:['tr','anh'], level:2, tags:['cluster:tr','rime:anh']},
      {type:'segment', target:'ghé', parts:['gh','é'], level:2, tags:['cluster:gh','rime:e']},
      {type:'segment', target:'quả', parts:['qu','ả'], level:2, tags:['cluster:qu','rime:a']},
      {type:'segment', target:'chó', parts:['ch','ó'], level:2, tags:['cluster:ch','rime:o']},
      // Level 3: vần phức
      {type:'segment', target:'xương', parts:['x','ương'], level:3, tags:['rime:ương']},
      {type:'segment', target:'thuốc', parts:['th','uốc'], level:3, tags:['cluster:th','rime:uôc']},
      {type:'segment', target:'trường', parts:['tr','ường'], level:3, tags:['cluster:tr','rime:ươn']},
      {type:'segment', target:'quyến', parts:['qu','yến'], level:3, tags:['cluster:qu','rime:yên']}
    ];

    // Pair – bổ sung lớn theo nhóm lỗi: sx • chtr • ngngh • ghg • ckqu • nl • dgr
    // Ghi chú: một số cặp cấp 3 là “giả từ” để minh hoạ luật chính tả (đã được chấp nhận trong mô-đun).
    const fallbackPairs = [
      // --- s/x (Level 1–3) ---
      {type:'pair',id:'sx-soi-xoi',     choices:['sôi','xôi'],   correct:'xôi', tags:['sx'], level:1},
      {type:'pair',id:'sx-sao-xao',     choices:['sáo','xáo'],   correct:'sáo', tags:['sx'], level:1},
      {type:'pair',id:'sx-se-xe',       choices:['sẻ','xẻ'],     correct:'xẻ',  tags:['sx'], level:1},
      {type:'pair',id:'sx-sau-xau',     choices:['sấu','xấu'],   correct:'xấu', tags:['sx'], level:1},
      {type:'pair',id:'sx-sao-xao-2',   choices:['sào','xào'],   correct:'sào', tags:['sx'], level:2},
      {type:'pair',id:'sx-suong-xuong', choices:['sương','xương'],correct:'xương', tags:['sx'], level:2},
      {type:'pair',id:'sx-sinh-xinh',   choices:['sinh','xinh'], correct:'xinh', tags:['sx'], level:2},
      {type:'pair',id:'sx-set-xet',     choices:['sét','xét'],   correct:'xét', tags:['sx'], level:2},
      {type:'pair',id:'sx-sui-xui',     choices:['sui','xui'],   correct:'xui', tags:['sx'], level:2},
      {type:'pair',id:'sx-so-xo',       choices:['sợ','xợ'],     correct:'sợ', tags:['sx'], level:2},
      {type:'pair',id:'sx-sua-xua',     choices:['sữa','xữa'],   correct:'sữa', tags:['sx'], level:3}, // giả từ “xữa”
      {type:'pair',id:'sx-sua-xua-2',   choices:['sưa','xưa'],   correct:'xưa', tags:['sx'], level:3},
      {type:'pair',id:'sx-sen-xen',     choices:['sen','xen'],   correct:'sen', tags:['sx'], level:3},
      {type:'pair',id:'sx-song-xong',   choices:['sông','xông'], correct:'sông', tags:['sx'], level:3},
      {type:'pair',id:'sx-suong-xuong-2',choices:['sưởng','xưởng'], correct:'xưởng', tags:['sx'], level:3},

      // --- ch/tr (Level 1–3) ---
      {type:'pair',id:'chtr-tre-che',   choices:['trẻ','chẻ'],   correct:'trẻ', tags:['chtr'], level:1},
      {type:'pair',id:'chtr-trau-chau', choices:['trâu','châu'], correct:'trâu', tags:['chtr'], level:1},
      {type:'pair',id:'chtr-treo-cheo', choices:['trèo','chèo'], correct:'trèo', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-trang-chanh',choices:['trăng','chăng'], correct:'trăng', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-tranh-chanh',choices:['tranh','chanh'], correct:'tranh', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-tro-cho',   choices:['trỏ','chỏ'],   correct:'trỏ', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-trut-chut', choices:['trút','chút'], correct:'trút', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-truot-chuot',choices:['trượt','chuột'], correct:'trượt', tags:['chtr'], level:2},
      {type:'pair',id:'chtr-tron-chon', choices:['tròn','chòn'], correct:'tròn', tags:['chtr'], level:3},
      {type:'pair',id:'chtr-trung-chung',choices:['trứng','chứng'], correct:'trứng', tags:['chtr'], level:3},
      {type:'pair',id:'chtr-trang-chang',choices:['trang','chang'], correct:'trang', tags:['chtr'], level:3},

      // --- ng/ngh (Level 2–3) – minh hoạ quy tắc ngh + e/i/ê ---
      {type:'pair',id:'ngngh-nghi-ngi', choices:['nghỉ','ngỉ'],  correct:'nghỉ', tags:['ngngh'], level:2},
      {type:'pair',id:'ngngh-nghe-nge', choices:['nghề','ngề'],  correct:'nghề', tags:['ngngh'], level:2},
      {type:'pair',id:'ngngh-nghe-nghe',choices:['nghẹ','ngẹ'],  correct:'nghẹ', tags:['ngngh'], level:2},
      {type:'pair',id:'ngngh-nghieng-ngieng',choices:['nghiêng','ngiêng'], correct:'nghiêng', tags:['ngngh'], level:3},
      {type:'pair',id:'ngngh-nghi-nghi-2',choices:['nghĩ','ngĩ'], correct:'nghĩ', tags:['ngngh'], level:3},
      {type:'pair',id:'ngngh-ngheo-ngeo',choices:['nghẽo','ngẽo'], correct:'nghẽo', tags:['ngngh'], level:3},

      // --- g/gh (Level 2–3) – gh trước e/i/ê ---
      {type:'pair',id:'ghg-ghe-ge',     choices:['ghé','gé'],    correct:'ghé', tags:['ghg'], level:2},
      {type:'pair',id:'ghg-ghe-ghe-2',  choices:['ghế','gế'],    correct:'ghế', tags:['ghg'], level:2},
      {type:'pair',id:'ghg-ghe-gen',    choices:['ghen','gen'],  correct:'ghen', tags:['ghg'], level:2},
      {type:'pair',id:'ghg-ghe-ghe-3',  choices:['ghê','gê'],    correct:'ghê', tags:['ghg'], level:2},
      {type:'pair',id:'ghg-ghim-gim',   choices:['ghìm','gìm'],  correct:'ghìm', tags:['ghg'], level:3},
      {type:'pair',id:'ghg-ghep-gep',   choices:['ghép','gép'],  correct:'ghép', tags:['ghg'], level:3},
      {type:'pair',id:'ghg-ghe-ge-3',   choices:['ghẹ','gẹ'],    correct:'ghẹ', tags:['ghg'], level:3},

      // --- c/k/qu (Level 1–3) – minh hoạ quy tắc theo nguyên âm sau ---
      {type:'pair',id:'ckqu-ca-ka',     choices:['ca','ka'],      correct:'ca', tags:['ckqu'], level:1},
      {type:'pair',id:'ckqu-co-ko',     choices:['co','ko'],      correct:'co', tags:['ckqu'], level:1},
      {type:'pair',id:'ckqu-cu-ku',     choices:['cu','ku'],      correct:'cu', tags:['ckqu'], level:1},
      {type:'pair',id:'ckqu-ke-ce',     choices:['kê','cê'],      correct:'kê', tags:['ckqu'], level:2}, // k + ê
      {type:'pair',id:'ckqu-ki-ci',     choices:['kí','cí'],      correct:'kí', tags:['ckqu'], level:2}, // k + i
      {type:'pair',id:'ckqu-que-kue',   choices:['que','kue'],    correct:'que', tags:['ckqu'], level:2},
      {type:'pair',id:'ckqu-qua-kua',   choices:['qua','kua'],    correct:'qua', tags:['ckqu'], level:2},
      {type:'pair',id:'ckqu-quy-kuy',   choices:['quy','kuy'],    correct:'quy', tags:['ckqu'], level:2},
      {type:'pair',id:'ckqu-cc-ke',     choices:['cẻ','kẻ'],      correct:'kẻ', tags:['ckqu'], level:3}, // trước e → k
      {type:'pair',id:'ckqu-cc-ki',     choices:['cị','kị'],      correct:'kị', tags:['ckqu'], level:3}, // trước i → k
      {type:'pair',id:'ckqu-cc-ca',     choices:['cá','ká'],      correct:'cá', tags:['ckqu'], level:3}, // trước a → c
      {type:'pair',id:'ckqu-cc-co',     choices:['có','kó'],      correct:'có', tags:['ckqu'], level:3}, // trước o → c

      // --- n/l (Level 1–2) ---
      {type:'pair',id:'nl-noi-loi',     choices:['nồi','lồi'],    correct:'nồi', tags:['nl'],   level:1},
      {type:'pair',id:'nl-nau-lau',     choices:['nâu','lâu'],    correct:'nâu', tags:['nl'],   level:1},
      {type:'pair',id:'nl-no-lo',       choices:['nở','lở'],      correct:'nở',  tags:['nl'],   level:2},
      {type:'pair',id:'nl-nang-lang',   choices:['nắng','lắng'],  correct:'nắng', tags:['nl'],  level:2},
      {type:'pair',id:'nl-nac-lac',     choices:['nạc','lạc'],    correct:'nạc', tags:['nl'],   level:2},

      // --- d/gi/r (Level 2–3) – mở rộng theo phương ngữ (tuỳ lớp có thể dùng) ---
      {type:'pair',id:'dgr-de-gie',     choices:['dẻ','giẻ'],     correct:'giẻ', tags:['dgr'],  level:2},
      {type:'pair',id:'dgr-di-gi',      choices:['dì','gì'],      correct:'dì',  tags:['dgr'],  level:2},
      {type:'pair',id:'dgr-rau-dau',    choices:['rau','dau'],    correct:'rau', tags:['dgr'],  level:3}, // “dau” giả
      {type:'pair',id:'dgr-ro-do',      choices:['rổ','dổ'],      correct:'rổ',  tags:['dgr'],  level:3}, // “dổ” khẩu ngữ/giả
      {type:'pair',id:'dgr-ram-giam',   choices:['rằm','dằm'],    correct:'rằm', tags:['dgr'],  level:3}
    ];
    // Tone bases chọn theo cấp (giữ vần/onset, chỉ đổi thanh)
    const toneBasesByLevel = {
      // Cấp 1: CV đơn giản, 1 nguyên âm (a/e/i/o/u/ô/ơ/ê/ư), dễ áp dấu và rõ thanh
      1: [
        'ba','be','bi','bo','bu','da','de','di','do','du',
        'ga','ge','gi','go','gu','ha','he','hi','ho','hu',
        'la','le','li','lo','lu','ma','me','mi','mo','mu',
        'na','ne','ni','no','nu','ra','re','ri','ro','ru',
        'sa','se','si','so','su','ta','te','ti','to','tu',
        'va','ve','vi','vo','vu','bơ','mơ','tơ','vơ','sơ',
        'bô','mô','tô','vô','sô','bê','mê','tê','vê','sê',
        'bư','mư','tư','vư','sư'
      ],

      // Cấp 2: thêm cụm phụ âm thông dụng (ch/tr/th/ph/kh/gh/nh/ng/qu), vẫn giữ 1 nguyên âm chính
      2: [
        'cho','che','cha','chu','chi',
        'tra','tre','tri','tro','tru',
        'tha','the','thi','tho','thu',
        'pha','phe','phi','pho','phu',
        'kha','khe','khi','kho','khu',
        'ghe','ghi',            // gh + e/i
        'nha','nhe','nhi','nho','nhu',
        'nga','nge','ngi','ngo','ngu', // “ng + e/i” dùng cho sinh phát âm (giả base)
        'que','qua','quy',      // qu + e/a/y (dấu đặt trên e/a/y)
        'bơm','lơm','sơm','tơm','vơm', // có phụ âm cuối m/n/ng đơn giản
        'ban','ben','bin','bon','bun',
        'lan','len','lin','lon','lun'
      ],

      // Cấp 3: thêm âm cuối n/m/ng/t/c/p, và nguyên âm mở rộng (ô/ơ/ê/ư) để luyện thanh trên nhiều ngữ cảnh
      3: [
        'bang','banh','bac','bat','bam',
        'dang','danh','dac','dat','dam',
        'lang','lanh','lac','lat','lam',
        'mang','manh','mac','mat','mam',
        'sang','sanh','sac','sat','sam',
        'tang','tanh','tac','tat','tam',
        'bôn','bôn?','bôn'/*(chỉ là base; hàm applyTone sẽ đặt dấu trên ô)*/, 'lôn','tôn','sôn','môn',
        'bơn','lơn','tơn','sơn','mơn',
        'bên','lên','tên','sên','mên',
        'bưn','lưn','tưn','sưn','mưn'
      ]
    };

    return {
      segments: segments.length ? segments : fallbackSegments,
      pairs: pairs.length ? pairs : fallbackPairs,
      toneBasesByLevel,
      tones // hiếm dùng
    };
  }

  function inferLevelFromSegment(seg){
    const hasCluster = /(tr|ch|gh|ngh|qu|th|ph)/.test((seg.parts||[]).join(''));
    const hasComplexRime = /(ươ|yê|uy|iê|uô|ươ|ươ|ương|uyê|uyên|ượt)/.test((seg.parts||[]).join(''));
    if (hasComplexRime) return 3;
    if (hasCluster) return 2;
    return 1;
  }

  const Data = normalizeData();

  // Ghi log phiên/ mục
  function logTrial(payload){
    try{
      const row = {
        t: Date.now(),
        mode: S.mode,
        lvl: S.level,
        id: payload.id || S.current.id || (S.current.item?.target || S.current.item?.base || ''),
        target: payload.target || '',
        choice: payload.choice || '',
        correct: !!payload.correct,
        rt: payload.rt || 0,
        hints: S.current.hints||0,
        tags: payload.tags || [],
        dialect: S.dialect
      };
      // Lưu LocalStorage
      const key = 'pa_log';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(row);
      localStorage.setItem(key, JSON.stringify(arr));
      // Nếu Store.log tồn tại (để Dashboard dùng), gọi nhẹ
      try{
        if (window.Store && Store.log){
          Store.log('pa_trial', row);
        }
      }catch(_){}
      return row;
    }catch(_){ return null; }
  }

  // Cập nhật thống kê phiên
  function updateStats(correct, tags=[], rt=0){
    S.stats.trials++;
    if (correct){
      S.stats.corrects++;
      S.stats.streak++;
      S.stats.points += 1;
    } else {
      S.stats.streak = 0;
    }
    S.stats.rt.push(rt);
    // loại
    const p = S.stats.perType[S.mode];
    if (p){ p.n++; if (correct) p.cr++; }
    // tag
    tags.forEach(tag=>{
      if (!S.stats.perTag[tag]) S.stats.perTag[tag] = {n:0,cr:0};
      S.stats.perTag[tag].n++; if (correct) S.stats.perTag[tag].cr++;
    });
    // gợi ý ưu tiên (error pattern)
    if (!correct){
      const key = `${S.mode}:${(tags[0]||'misc')}`;
      S.stats.errorPattern[key] = (S.stats.errorPattern[key]||0)+1;
    }
    renderScorebar();
  }

  function median(arr){
    if (!arr.length) return 0;
    const a = arr.slice().sort((x,y)=>x-y);
    const m = Math.floor(a.length/2);
    return a.length%2? a[m] : Math.round((a[m-1]+a[m])/2);
  }

  // Gợi ý ưu tiên nhóm luyện (dựa trên errorPattern/accuracy)
  function nextPriorityHint(){
    // Tìm tag có tỉ lệ đúng thấp và có số lần đủ
    let worst = null; let worstAcc = 1;
    for (const [tag, v] of Object.entries(S.stats.perTag)){
      if (v.n >= 3){
        const acc = v.cr / v.n;
        if (acc < worstAcc){ worstAcc = acc; worst = tag; }
      }
    }
    if (!worst) return '—';
    // ánh xạ tag → mô tả
    const desc = {
      'sx':'s/x', 'chtr':'ch/tr', 'ngngh':'ng/ngh', 'ghg':'g/gh', 'ckqu':'c/k/qu', 'tone_hỏi_ngã':'hỏi/ngã'
    };
    return `Ưu tiên: ${desc[worst] || worst} (${Math.round(worstAcc*100)}%)`;
  }

  /* ========== UI & STYLES ========== */

  function renderStylesOnce(){
    if (document.getElementById('paStyle')) return;
    const css = `
      #${C.containerId} .pa-card{
        background: var(--surface, #fff);
        border-radius: 16px;
        box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,.08));
        padding: 16px;
      }
      #${C.containerId} .pa-toolbar{
        display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px;
      }
      #${C.containerId} .pa-tabs{ display:flex; gap:6px; background:#f6f7f9; padding:4px; border-radius:10px; }
      #${C.containerId} .pa-tab{
        min-height:36px; min-width:44px; border:none; background:transparent; padding:8px 10px; border-radius:8px; cursor:pointer;
        font-weight:700; color:#333;
      }
      #${C.containerId} .pa-tab[aria-selected="true"]{ background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.08); }
      #${C.containerId} .pa-scorebar{ margin-left:auto; display:flex; gap:10px; align-items:center; }
      #${C.containerId} .pa-stat{ background:#f6f7f9; padding:6px 10px; border-radius:8px; font-weight:700; }
      #${C.containerId} .pa-help{ color:#555; font-size:0.95em; margin:10px 0 0; }
      #${C.containerId} .pa-grid{ display:grid; grid-template-columns: 1.2fr 1fr; gap:16px; }
      @media (max-width:900px){ #${C.containerId} .pa-grid{ grid-template-columns: 1fr; } }
      #${C.containerId} .pa-title{ font-size:18px; font-weight:800; margin:0 0 8px; }
      #${C.containerId} .pa-bigword{
        display:inline-block; padding:8px 12px; background:#e9f3ff; color:#0b3a6f;
        border-radius:8px; font-size:34px; font-weight:800; letter-spacing:0.02em;
      }
      #${C.containerId} .pa-instr{ margin-top:8px; color:#555; }
      #${C.containerId} .pa-zone{ margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; }
      #${C.containerId} .pa-slot{
        min-height:48px; border:2px dashed #d9e1ea; border-radius:12px; display:flex; align-items:center; justify-content:center;
        background:#f7fbff;
      }
      #${C.containerId} .pa-slot.over{ background:#eef6ff; border-color:#bcd6f2; }
      #${C.containerId} .pa-pool{
        margin-top:12px; padding:10px; border:2px dashed #e8e1cf; border-radius:12px; background:#fffaf1;
        min-height:68px; display:flex; flex-wrap:wrap; gap:8px;
      }
      #${C.containerId} .pa-chip{
        display:inline-flex; align-items:center; justify-content:center;
        padding:10px 14px; background:#fff; border:1px solid #e3e7ee; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,.06);
        font-weight:700; cursor:grab; user-select:none; transition:transform .05s, background .2s;
        min-width:44px; min-height:44px;
      }
      #${C.containerId} .pa-chip.dragging{ opacity:0.7; transform:scale(1.02); }
      #${C.containerId} .pa-chip:focus{ outline:3px solid var(--primary, #3c7); outline-offset:2px; cursor:grabbing; }
      #${C.containerId} .pa-actions{ margin-top:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
      #${C.containerId} .pa-art{ display:flex; align-items:center; justify-content:center; width:100%; height: clamp(220px, 42vh, 420px); border:2px solid #111; border-radius:18px; overflow:hidden; background:#fff; }
      #${C.containerId} .pa-art svg{ width:100%; height:100%; display:block; }
      #${C.containerId} .pa-ok{ outline:3px solid #22c55e; outline-offset:2px; }
      #${C.containerId} .pa-warn{ outline:3px solid #ef4444; outline-offset:2px; }
      #${C.containerId} .pa-correct{ animation: paPulse .36s ease; }
      #${C.containerId} .pa-shake{ animation: paShake .28s ease; }
      @keyframes paPulse { 0%{transform:scale(1)} 40%{transform:scale(1.03)} 100%{transform:scale(1)} }
      @keyframes paShake { 10%, 90% { transform: translateX(-1px);} 20%, 80% { transform: translateX(2px);} 30%, 50%, 70% { transform: translateX(-4px);} 40%, 60% { transform: translateX(4px);} }
      /* Tone chips */
      #${C.containerId} .tone-grid{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; margin-top:10px; }
      #${C.containerId} .tone-btn{
        display:flex; align-items:center; justify-content:center; padding:12px; border-radius:12px; color:#fff; font-weight:800; font-size:20px; min-height:56px; cursor:pointer; border:none;
      }
      #${C.containerId} .tone-btn[data-tone="ngang"]{ background:${TONE_COLORS.ngang}; }
      #${C.containerId} .tone-btn[data-tone="sắc"]{ background:${TONE_COLORS.sắc}; }
      #${C.containerId} .tone-btn[data-tone="huyền"]{ background:${TONE_COLORS.huyền}; }
      #${C.containerId} .tone-btn[data-tone="hỏi"]{ background:${TONE_COLORS.hỏi}; }
      #${C.containerId} .tone-btn[data-tone="ngã"]{ background:${TONE_COLORS.ngã}; }
      #${C.containerId} .tone-btn[data-tone="nặng"]{ background:${TONE_COLORS.nặng}; }
      #${C.containerId} .tone-legend{ display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
      #${C.containerId} .tone-pill{ padding:4px 8px; border-radius:999px; font-weight:700; color:#fff; font-size:12px; }
      /* Pair UI */
      #${C.containerId} .pair-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px; }
      #${C.containerId} .pair-btn{
        display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:12px; border:2px solid #e3e7ee; background:#fff; cursor:pointer; min-height:64px; font-weight:800; font-size:22px;
      }
      #${C.containerId} .pair-btn:hover{ background:#f9fafb; }
      #${C.containerId} .pair-emoji{ font-size:28px; }
      #${C.containerId} .hintbox{ margin-top:8px; background:#fff7ed; border:1px solid #fed7aa; padding:8px 10px; border-radius:10px; color:#8a5200; font-size:0.95em; }
      #${C.containerId} .patternbox{ margin-top:8px; background:#f0fdf4; border:1px solid #bbf7d0; padding:8px 10px; border-radius:10px; color:#0a6a3b; font-size:0.95em; }
      #${C.containerId} .pa-ctl{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      #${C.containerId} .pa-ctl .ghost, #${C.containerId} .pa-ctl .primary, #${C.containerId} .pa-ctl .tts { min-height:44px; }
      #${C.containerId} .pa-word[data-tone]{ text-decoration: underline wavy; text-decoration-thickness: 2px; text-underline-offset: 4px; }
      /* Skip link nội bộ */
      #${C.containerId} .sr-only{ position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden; }
    `;
    const s = document.createElement('style'); s.id='paStyle'; s.textContent = css;
    document.head.appendChild(s);
  }

  function renderToolbar(host){
    const bar = document.createElement('div');
    bar.className = 'pa-toolbar';

    // Tabs
    const tabs = document.createElement('div'); tabs.className='pa-tabs'; tabs.setAttribute('role','tablist');
    [
      {id:'segment', label:'Segment'},
      {id:'tone', label:'Tone'},
      {id:'pair', label:'Pair'}
    ].forEach(t=>{
      const btn = document.createElement('button');
      btn.className='pa-tab';
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', String(S.mode===t.id));
      btn.textContent = t.label;
      btn.onclick = ()=> { S.mode=t.id; cueBeep(740,0.05); render(); };
      tabs.appendChild(btn);
    });

    // Level
    const lvlWrap = document.createElement('span');
    lvlWrap.className = 'pa-ctl';
    const lbl = document.createElement('label'); lbl.textContent='Cấp độ:'; lbl.style.margin='0 4px 0 8px';
    lbl.htmlFor='paLevelSel';
    const sel = document.createElement('select'); sel.id='paLevelSel'; sel.setAttribute('aria-label','Chọn cấp độ');
    [1,2,3].forEach(i=>{
      const op=document.createElement('option'); op.value=String(i); op.textContent=String(i);
      if (i===S.level) op.selected=true;
      sel.appendChild(op);
    });
    sel.onchange = ()=>{ S.level = parseInt(sel.value,10)||1; cueBeep(600,0.05); renderTaskOnly(); };

    // Dialect
    const dialectLbl = document.createElement('label'); dialectLbl.textContent='Phương ngữ:'; dialectLbl.style.margin='0 4px 0 8px';
    dialectLbl.htmlFor='paDialect';
    const dialectSel = document.createElement('select'); dialectSel.id='paDialect'; dialectSel.setAttribute('aria-label','Chọn phương ngữ');
    ['Bắc','Nam'].forEach(d=>{
      const op=document.createElement('option'); op.value=d; op.textContent=d; if (S.dialect===d) op.selected=true; dialectSel.appendChild(op);
    });
    dialectSel.onchange = ()=>{ S.dialect = dialectSel.value; cueBeep(520,0.05); renderTaskOnly(); };

    // Extend toggle
    const extBtn = document.createElement('button');
    extBtn.className='ghost';
    extBtn.textContent = S.extend? '👟 Luyện mở rộng: Bật' : '👟 Luyện mở rộng: Tắt';
    extBtn.onclick = ()=>{ S.extend=!S.extend; extBtn.textContent = S.extend? '👟 Luyện mở rộng: Bật' : '👟 Luyện mở rộng: Tắt'; };

    // Scorebar
    const sb = document.createElement('div'); sb.className='pa-scorebar';
    sb.innerHTML = `
      <span class="pa-stat" id="paPts">⭐ ${S.stats.points}</span>
      <span class="pa-stat" id="paStreak">🔥 ${S.stats.streak}</span>
      <span class="pa-stat" id="paAcc">🎯 —%</span>
      <span class="pa-stat" id="paRT">⏱️ —ms</span>
    `;

    bar.appendChild(tabs);
    bar.appendChild(lvlWrap);
    lvlWrap.appendChild(lbl); lvlWrap.appendChild(sel);
    bar.appendChild(dialectLbl); bar.appendChild(dialectSel);
    bar.appendChild(extBtn);
    bar.appendChild(sb);
    host.appendChild(bar);
  }

  function renderScorebar(){
    const acc = S.stats.trials ? Math.round(100 * S.stats.corrects / S.stats.trials) : '—';
    const rt = S.stats.rt.length ? `${median(S.stats.rt)}` : '—';
    const pts = document.getElementById('paPts'); if (pts) pts.textContent = `⭐ ${S.stats.points}`;
    const st = document.getElementById('paStreak'); if (st) st.textContent = `🔥 ${S.stats.streak}`;
    const ac = document.getElementById('paAcc'); if (ac) ac.textContent = `🎯 ${acc}%`;
    const rtEl = document.getElementById('paRT'); if (rtEl) rtEl.textContent = `⏱️ ${rt}ms`;
    const hint = document.getElementById('paNextHint'); if (hint) hint.textContent = nextPriorityHint();
  }

  function renderHelp(host){
    const help = document.createElement('div');
    help.className='pa-help';
    help.innerHTML = `
      <b>Quy trình:</b> 1) Nghe tiếng (🔊/🐢) → 2) Thực hiện (kéo–thả/chọn) → 3) Phản hồi tức thì → 4) Củng cố (👟 nếu bật). 
      Thời lượng: 6–10 giây/mục; 5–7 phút/phiên.
      <div class="row" style="margin-top:6px; gap:8px; align-items:center;">
        <span class="stat">Gợi ý ưu tiên tuần: <b id="paNextHint">—</b></span>
      </div>
    `;
    host.appendChild(help);
  }

  function render(){
    const host = document.getElementById(C.containerId);
    if (!host) return;
    renderStylesOnce();
    host.innerHTML = '';

    // Toolbar
    renderToolbar(host);

    // Nội dung chính
    const card = document.createElement('div'); card.className='pa-card';

    // Tiêu đề + điều khiển nghe
    const title = document.createElement('div'); title.className='pa-title';
    title.textContent = S.mode==='segment' ? 'Ghép onset–rime/cụm phụ âm'
                    : S.mode==='tone'    ? 'Thanh điệu – 6 thanh'
                    : 'Cặp tối thiểu (chính tả/âm vị)';
    card.appendChild(title);

    // Task
    const body = document.createElement('div'); body.id='paBody';
    card.appendChild(body);

    // A11y/Help
    renderHelp(card);

    host.appendChild(card);
    renderTaskOnly();
  }

  function renderTaskOnly(){
    const body = document.getElementById('paBody'); if (!body) return;
    body.innerHTML = '';
    if (S.mode==='segment') renderSegmentTask(body);
    else if (S.mode==='tone') renderToneTask(body);
    else renderPairTask(body);
    renderScorebar();
  }

  /* ========== SEGMENT (Onset–Rime/cụm phụ âm) ========== */
  function makeChip(txt, idx){
    const el = document.createElement('div');
    el.className = 'pa-chip';
    el.textContent = txt;
    el.draggable = true;
    el.tabIndex = 0;
    el.id = `chip_${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`;
    el.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', el.id);
      setTimeout(()=> el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
    // Click = đưa vào slot trống đầu tiên
    el.addEventListener('click', ()=>{
      const firstEmpty = el.closest('.pa-grid').querySelector('.pa-slot:not(:has(.pa-chip))');
      const pool = el.closest('.pa-grid').querySelector('.pa-pool');
      if (firstEmpty){ firstEmpty.appendChild(el); } else if (pool){ pool.appendChild(el); }
    });
    // Enter = toggle pool/slot
    el.addEventListener('keydown', e=>{
      if (e.key==='Enter' || e.key===' '){ e.preventDefault(); el.click(); }
    });
    return el;
  }

  function makeSlot(){
    const el = document.createElement('div');
    el.className = 'pa-slot';
    el.setAttribute('aria-label','Vị trí ghép');
    el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', ()=> el.classList.remove('over'));
    el.addEventListener('drop', e=>{
      e.preventDefault();
      el.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const chip = document.getElementById(id);
      if (!chip) return;
      const cur = el.querySelector('.pa-chip');
      const pool = el.closest('.pa-grid').querySelector('.pa-pool');
      if (cur && pool) pool.appendChild(cur);
      el.appendChild(chip);
    });
    el.addEventListener('click', ()=>{
      // click slot = trả chip về pool
      const chip = el.querySelector('.pa-chip');
      const pool = el.closest('.pa-grid').querySelector('.pa-pool');
      if (chip && pool) pool.appendChild(chip);
    });
    return el;
  }

  function wirePoolDrop(pool){
    pool.addEventListener('dragover', e=> e.preventDefault());
    pool.addEventListener('drop', e=>{
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const chip = document.getElementById(id);
      if (chip) pool.appendChild(chip);
    });
  }

  function pickSegment(){
    const arr = Data.segments.filter(x=> x.level===S.level);
    const item = arr.length ? arr[Math.floor(Math.random()*arr.length)]
                            : Data.segments[Math.floor(Math.random()*Data.segments.length)];
    return item;
  }

  function wordArtSVG(word){
    // Tạo nền gradient mềm, chữ và emoji
    const vbW = 800, vbH = 520;
    const { hue, sat, lig } = hashColor(word,0);
    const c1 = `hsl(${hue}, ${sat}%, ${lig}%)`;
    const c2 = `hsl(${(hue+37)%360}, ${Math.max(40, sat-10)}%, ${Math.max(28, lig-20)}%)`;
    const emoji = EMOJI[word] || '';
    const fsEmoji = Math.round(vbH * (emoji? 0.38 : 0.32));
    const fsCap   = Math.round(vbH * 0.11);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hình minh họa cho ${escapeHTML(word)}">
        <defs>
          <linearGradient id="g_${encodeURIComponent(word)}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
          </linearGradient>
          <filter id="sh_${encodeURIComponent(word)}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.25"/></filter>
        </defs>
        <rect x="16" y="12" rx="28" ry="28" width="${vbW-32}" height="${vbH-24}" fill="url(#g_${encodeURIComponent(word)})" />
        <g dominant-baseline="middle" text-anchor="middle">
          <text x="${vbW/2}" y="${vbH*0.50 - (emoji? vbH*0.01 : vbH*0.04)}" font-size="${fsEmoji}" filter="url(#sh_${encodeURIComponent(word)})">${emoji? emoji : word.charAt(0).toUpperCase()}</text>
          <text x="${vbW/2}" y="${vbH*0.90}" font-size="${fsCap}" fill="#fff" style="font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,.25)">${escapeHTML(word)}</text>
        </g>
      </svg>
    `;
  }

  // Hash → màu (ổn định theo từ)
  function hashColor(s, idx=0){
    let h=0; for (let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; }
    const hue = (h + idx*47) % 360;
    const sat = 60 + (h%22);
    const lig = 55 + (h%18);
    return { hue, sat, lig };
  }

  function segmentHint(item){
    const w = item.target || '';
    const pattern = HINTS_BY_PATTERN.find(x=> x.test(w));
    return (pattern && pattern.hint) || '';
  }

  function renderSegmentTask(body){
    const item = pickSegment();
    S.current.item = item; S.current.hints = 0; S.current.startAt = Date.now(); S.current.id = `seg:${item.target}`;
    cueBeep();

    const grid = document.createElement('div'); grid.className='pa-grid';
    // Trái: thao tác
    const left = document.createElement('div');
    const big = document.createElement('div'); big.className='pa-bigword'; big.innerHTML = colorToneHTML(item.target);
    left.appendChild(big);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Kéo các mảnh bên dưới vào khung theo thứ tự đúng:';
    left.appendChild(instr);

    const zone = document.createElement('div'); zone.className='pa-zone';
    const slots = item.parts.map(()=> makeSlot());
    slots.forEach(s=> zone.appendChild(s));
    left.appendChild(zone);

    const pool = document.createElement('div'); pool.className='pa-pool';
    wirePoolDrop(pool);
    shuffle(item.parts).forEach((txt,i)=> pool.appendChild(makeChip(txt,i)));
    left.appendChild(pool);

    const actions = document.createElement('div'); actions.className='pa-actions';
    // Nghe nhanh/chậm
    const btnHear = document.createElement('button'); btnHear.className='tts'; btnHear.textContent='🔊 Nghe';
    btnHear.onclick = ()=> speak(item.speak || item.target);
    const btnSlow = document.createElement('button'); btnSlow.className='ghost'; btnSlow.textContent='🐢 Chậm';
    btnSlow.onclick = ()=> { S.current.hints = Math.max(S.current.hints,1); speakSlow(item.speak || item.target); };

    const btnCheck = document.createElement('button'); btnCheck.className='primary'; btnCheck.textContent='Kiểm tra';
    btnCheck.onclick = ()=>{
      const end = Date.now();
      const got = slots.map(s=> (s.querySelector('.pa-chip')?.textContent.trim() || ''));
      const correctSeq = item.parts.join('|');
      const actualSeq  = got.join('|');
      slots.forEach(s=> s.classList.remove('pa-ok','pa-warn'));
      const rt = end - S.current.startAt;
      const tags = item.tags || [];
      let correct = false;
      if (actualSeq===correctSeq){
        correct = true;
        slots.forEach(s=> s.classList.add('pa-ok'));
        left.classList.add('pa-correct'); setTimeout(()=> left.classList.remove('pa-correct'), 360);
        try{ VoiceUI?.enabled && VoiceUI.say('Đúng rồi!'); }catch(_){}
      } else {
        slots.forEach((s,i)=>{
          const chip = s.querySelector('.pa-chip'); const ok = item.parts[i]||'';
          if (!chip || chip.textContent.trim()!==ok) s.classList.add('pa-warn');
        });
        left.classList.add('pa-shake'); setTimeout(()=> left.classList.remove('pa-shake'), 300);
        vibrate(60);
        const hint = segmentHint(item);
        if (hint) showHint(body, hint);
        try{ VoiceUI?.enabled && VoiceUI.say('Chưa đúng. Hãy thử lại.'); }catch(_){}
      }
      updateStats(correct, tags, rt);
      const row = logTrial({ id:S.current.id, target:item.target, correct, rt, tags, choice: got.join('') });

      // Củng cố nếu đúng nhiều lần liên tiếp
      if (correct && S.extend && S.stats.streak>0 && S.stats.streak%3===0){
        showPattern(body, makePatternForItem(item));
      }
    };

    const btnNext = document.createElement('button'); btnNext.className='ghost'; btnNext.textContent='Bài khác';
    btnNext.onclick = ()=> renderTaskOnly();

    actions.append(btnHear, btnSlow, btnCheck, btnNext);
    left.appendChild(actions);

    // Phải: minh họa
    const right = document.createElement('div');
    const art = document.createElement('div'); art.className='pa-art';
    art.innerHTML = wordArtSVG(item.target);
    right.appendChild(art);

    grid.append(left, right);
    body.appendChild(grid);
  }

  function showHint(container, text){
    if (!text) return;
    let box = container.querySelector('.hintbox');
    if (!box){
      box = document.createElement('div'); box.className='hintbox';
      container.appendChild(box);
    }
    box.textContent = `Gợi ý: ${text}`;
  }

  function showPattern(container, html){
    if (!html) return;
    let box = container.querySelector('.patternbox');
    if (!box){
      box = document.createElement('div'); box.className='patternbox';
      container.appendChild(box);
    }
    box.innerHTML = html;
  }

  function makePatternForItem(item){
    const w = item.target || '';
    if (/gh/.test(w)){
      return 'Mẫu hóa: <b>gh + e/i/ê</b> → ghé, ghì, ghê.';
    }
    if (/ngh/.test(w)){
      return 'Mẫu hóa: <b>ngh + e/i/ê</b> → nghé, nghỉ, nghệ.';
    }
    if (/^qu/.test(w)){
      return 'Mẫu hóa: <b>qu + a/á/…</b> (qu = q + u) → quả, quạ, quê.';
    }
    return 'Tiếp tục giữ nhịp: đúng 3 mục liên tiếp!';
  }

  /* ========== TONE (6 thanh) ========== */

  function pickToneBase(){
    const list = Data.toneBasesByLevel[S.level] || Data.toneBasesByLevel[1];
    return list[Math.floor(Math.random()*list.length)];
  }

  function renderToneTask(body){
    const base = pickToneBase();
    const forms = TONE_NAMES.map(t=> ({ tone:t, text: applyTone(base, t) }));
    const target = forms[Math.floor(Math.random()*forms.length)];
    S.current.item = { base, forms, target, tags:['tone', `tone:${target.tone}`] };
    S.current.hints = 0; S.current.startAt=Date.now(); S.current.id=`tone:${base}:${target.tone}`;
    cueBeep();

    const grid = document.createElement('div'); grid.className='pa-grid';

    // Trái
    const left = document.createElement('div');
    const big = document.createElement('div'); big.className='pa-bigword';
    big.innerHTML = `Chọn thanh đúng cho: <b>${escapeHTML(base)}</b>`;
    left.appendChild(big);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Bấm 🔊 để nghe rồi chọn biến thể có thanh điệu đúng. (Giữ nguyên onset/vần, chỉ đổi thanh)';
    left.appendChild(instr);

    const toneGrid = document.createElement('div'); toneGrid.className='tone-grid';
    forms.forEach(({tone, text})=>{
      const b = document.createElement('button');
      b.className='tone-btn';
      b.dataset.tone = tone;
      b.textContent = text;
      b.onclick = ()=>{
        const end = Date.now();
        const correct = (tone===target.tone);
        const rt = end - S.current.startAt;
        const tags = [`tone:${target.tone}`];
        if (correct){
          b.classList.add('pa-correct'); setTimeout(()=> b.classList.remove('pa-correct'), 360);
          try{ VoiceUI?.enabled && VoiceUI.say('Giỏi lắm!'); }catch(_){}
        } else {
          b.classList.add('pa-shake'); setTimeout(()=> b.classList.remove('pa-shake'), 300);
          vibrate(60);
          // gợi ý phân biệt cặp dễ nhầm
          const hardPairs = (target.tone==='hỏi'||target.tone==='ngã') ? HINTS_BY_TAG.tone_hỏi_ngã
                             : (target.tone==='huyền'||target.tone==='hỏi') ? 'Huyền (\\) hạ giọng; Hỏi (ˇ) uốn giọng.'
                             : (target.tone==='sắc'||target.tone==='ngã') ? 'Sắc (/) cao lên; Ngã (~) gãy/rung.'
                             : '';
          if (hardPairs) showHint(body, hardPairs);
          // phát lại chậm
          speakSlow(target.text);
        }
        updateStats(correct, tags, rt);
        logTrial({ id:S.current.id, target:target.text, choice:text, correct, rt, tags });
        // củng cố nhịp
        if (correct && S.extend && S.stats.streak>0 && S.stats.streak%3===0){
          const legend = TONE_NAMES.map(t=> `<span class="tone-pill" style="background:${TONE_COLORS[t]}">${t}</span>`).join(' ');
          showPattern(body, `Mã hóa thị giác: ${legend}`);
        }
        // tự chuyển mục mới khi đã chọn (đảm bảo 1 thao tác – 1 mục tiêu)
        setTimeout(()=> renderTaskOnly(), 450);
      };
      toneGrid.appendChild(b);
    });
    left.appendChild(toneGrid);

    const actions = document.createElement('div'); actions.className='pa-actions';
    const btnHear = document.createElement('button'); btnHear.className='tts'; btnHear.textContent='🔊 Nghe';
    btnHear.onclick = ()=> speak(target.text);
    const btnSlow = document.createElement('button'); btnSlow.className='ghost'; btnSlow.textContent='🐢 Chậm';
    btnSlow.onclick = ()=> { S.current.hints = Math.max(S.current.hints,1); speakSlow(target.text); };
    const btnNext = document.createElement('button'); btnNext.className='ghost'; btnNext.textContent='Bài khác';
    btnNext.onclick = ()=> renderTaskOnly();
    actions.append(btnHear, btnSlow, btnNext);
    left.appendChild(actions);

    // Phải: legend tone và minh họa
    const right = document.createElement('div');
    const art = document.createElement('div'); art.className='pa-art';
    art.innerHTML = wordArtSVG(target.text);
    right.appendChild(art);

    const legend = document.createElement('div'); legend.className='tone-legend';
    legend.setAttribute('aria-label','Mã hóa màu thanh điệu');
    TONE_NAMES.forEach(t=>{
      const pill = document.createElement('span');
      pill.className='tone-pill';
      pill.style.background = TONE_COLORS[t];
      pill.textContent = t;
      legend.appendChild(pill);
    });
    right.appendChild(legend);

    grid.append(left,right);
    body.appendChild(grid);
  }

  /* ========== PAIR (Cặp tối thiểu) ========== */

  function pickPair(){
    // Ưu tiên theo level và phương ngữ (ở bước này chỉ lọc level; dialect có thể dùng để ẩn nhóm d/gi/r nếu thêm sau)
    const arr = Data.pairs.filter(x=> x.level===S.level);
    const item = arr.length ? arr[Math.floor(Math.random()*arr.length)]
                            : Data.pairs[Math.floor(Math.random()*Data.pairs.length)];
    return item;
  }

  function renderPairTask(body){
    const item = pickPair();
    S.current.item = item; S.current.hints = 0; S.current.startAt = Date.now(); S.current.id = `pair:${item.id || (item.choices.join('-'))}`;
    cueBeep();

    const grid = document.createElement('div'); grid.className='pa-grid';

    const left = document.createElement('div');
    const big = document.createElement('div'); big.className='pa-bigword';
    big.textContent = 'Nghe – chọn từ đúng:';
    left.appendChild(big);

    const instr = document.createElement('div'); instr.className='pa-instr';
    instr.textContent = 'Bấm 🔊 để nghe tiếng mục tiêu. Chọn 1 trong 2 từ chỉ khác 1 nét âm/chữ.';
    left.appendChild(instr);

    const pairGrid = document.createElement('div'); pairGrid.className='pair-grid';
    const choices = shuffle(item.choices.slice(0,2));
    const clickChoice = (txt, btn)=>{
      const end = Date.now();
      const correct = (txt === item.correct);
      const rt = end - S.current.startAt;
      const tags = item.tags || [];
      if (correct){
        btn.classList.add('pa-correct'); setTimeout(()=> btn.classList.remove('pa-correct'), 360);
        try{ VoiceUI?.enabled && VoiceUI.say('Chính xác!'); }catch(_){}
      } else {
        btn.classList.add('pa-shake'); setTimeout(()=> btn.classList.remove('pa-shake'), 300);
        vibrate(60);
        const tag = (tags && tags[0]) || '';
        const hint = HINTS_BY_TAG[tag] || '';
        if (hint) showHint(body, hint);
        speakSlow(item.correct);
      }
      updateStats(correct, tags, rt);
      logTrial({ id:S.current.id, target:item.correct, choice:txt, correct, rt, tags });
      if (correct && S.extend && S.stats.streak>0 && S.stats.streak%3===0){
        const tag = (tags && tags[0]) || '';
        showPattern(body, tag? `Mẫu hóa (${tag}): Luyện thêm 2–3 cặp tương tự.` : 'Tiếp tục duy trì nhịp đúng!');
      }
      setTimeout(()=> renderTaskOnly(), 450);
    };

    choices.forEach(txt=>{
      const b = document.createElement('button'); b.className='pair-btn'; b.setAttribute('aria-label', `Chọn ${txt}`);
      const emo = document.createElement('span'); emo.className='pair-emoji'; emo.textContent = EMOJI[txt] || '🔤';
      const label = document.createElement('span'); label.textContent = txt;
      b.appendChild(emo); b.appendChild(label);
      b.onclick = ()=> clickChoice(txt, b);
      pairGrid.appendChild(b);
    });
    left.appendChild(pairGrid);

    const actions = document.createElement('div'); actions.className='pa-actions';
    const btnHear = document.createElement('button'); btnHear.className='tts'; btnHear.textContent='🔊 Nghe';
    btnHear.onclick = ()=> speak(item.correct);
    const btnSlow = document.createElement('button'); btnSlow.className='ghost'; btnSlow.textContent='🐢 Chậm';
    btnSlow.onclick = ()=> { S.current.hints = Math.max(S.current.hints,1); speakSlow(item.correct); };
    const btnNext = document.createElement('button'); btnNext.className='ghost'; btnNext.textContent='Bài khác';
    btnNext.onclick = ()=> renderTaskOnly();
    actions.append(btnHear, btnSlow, btnNext);
    left.appendChild(actions);

    // Phải: minh họa 2 từ
    const right = document.createElement('div');
    const art = document.createElement('div'); art.className='pa-art';
    // Hiển thị hai emoji/nhãn đối chiếu
    const html = `
      <div style="display:flex; align-items:center; justify-content:center; gap:18px; width:100%; height:100%;">
        <div style="text-align:center;">
          <div style="font-size:64px; line-height:1;">${EMOJI[choices[0]]||'🔤'}</div>
          <div style="font-weight:800; margin-top:6px;">${escapeHTML(choices[0])}</div>
        </div>
        <div style="width:2px; height:70%; background:#111; opacity:.2;"></div>
        <div style="text-align:center;">
          <div style="font-size:64px; line-height:1;">${EMOJI[choices[1]]||'🔤'}</div>
          <div style="font-weight:800; margin-top:6px;">${escapeHTML(choices[1])}</div>
        </div>
      </div>
    `;
    art.innerHTML = html;
    right.appendChild(art);

    grid.append(left,right);
    body.appendChild(grid);
  }

  /* ========== Khởi tạo ========== */

  function init(){
    const host = document.getElementById(C.containerId); if (!host) return;
    // Ưu tiên cấp độ từ cài đặt nếu có
    try{
      const startLevel = window.AppState?.settings?.startLevel;
      if (startLevel) S.level = parseInt(startLevel,10)||S.level;
    }catch(_){}
    render();
  }

  // Public API
  window.PAModule = {
    init,
    setMode(mode){ if (['segment','tone','pair'].includes(mode)){ S.mode=mode; render(); } },
    renderSegment(item){ S.mode='segment'; render(); } // tương thích cũ
  };

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

})();
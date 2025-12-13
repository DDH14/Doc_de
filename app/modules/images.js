/* MODULE: IMAGES – Sinh SVG minh họa (pictogram) cho từ vựng tiếng Việt trong CARDS.
   Nguyên tắc: ưu tiên biểu tượng ngữ nghĩa; không có → fallback chữ to trong khung. */
window.Images = (function(){
  // Màu nền/viền dịu mắt
  const C = {
    bg1:'#FAFAFA', ink:'#111', primary:'#1D4ED8',
    sky:'#60a5fa', sun:'#f59e0b', leaf:'#22c55e', sea:'#38bdf8',
    sand:'#f5deb3', soil:'#b45309', red:'#ef4444', gray:'#9ca3af'
  };

  // Chuẩn hóa chuỗi
  const norm = s => String(s||'').toLowerCase().normalize('NFC').trim();

  // Vẽ hình cơ bản
  const svgWrap = (w,h,inner)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${inner}</svg>`;
  const rect = (x,y,w,h,rx=8,fill='#fff',stroke='#e5e7eb') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
  const circle = (cx,cy,r,fill,stroke='none') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const line = (x1,y1,x2,y2,stroke='#111',sw=3,cap='round') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}"/>`;
  const path = (d, fill='none', stroke='#111', sw=3, cap='round', join='round') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="${join}"/>`;
  const text = (x,y,str,fs=16,fw=700,fill='#111') => `<text x="${x}" y="${y}" font-size="${fs}" font-family="system-ui, sans-serif" font-weight="${fw}" fill="${fill}" dominant-baseline="middle" text-anchor="middle">${str}</text>`;

  // Biểu tượng một số danh mục
  function iconHouse(){
    return svgWrap(96,96,`
      ${rect(8,40,80,48,8,'#fff',C.gray)}
      ${path('M8 44 L48 12 L88 44','none',C.gray,4)}
      ${rect(38,56,20,32,4,'#f3f4f6',C.gray)}
      ${rect(58,56,20,14,3,'#f3f4f6',C.gray)}
    `);
  }
  function iconDoor(){
    return svgWrap(96,96,`
      ${rect(20,18,56,60,8,'#fff',C.gray)}
      ${rect(24,22,48,52,6,'#fafafa',C.gray)}
      ${circle(66,48,2,C.gray)}
    `);
  }
  function iconTableChair(){
    return svgWrap(96,96,`
      ${rect(16,52,64,10,2,'#e5e7eb',C.gray)}
      ${line(24,62,24,82,C.gray,4)}
      ${line(72,62,72,82,C.gray,4)}
      ${rect(68,42,10,10,2,'#d1d5db',C.gray)}
      ${line(72,52,72,68,C.gray,3)}
    `);
  }
  function iconTree(){
    return svgWrap(96,96,`
      ${rect(44,54,8,22,3,C.soil,C.gray)}
      ${circle(48,40,18,C.leaf)}
      ${circle(36,48,12,C.leaf)}
      ${circle(60,48,12,C.leaf)}
    `);
  }
  function iconLeaf(){
    return svgWrap(96,96,`
      ${path('M20 60 C20 30, 60 20, 76 36 C92 52, 62 72, 40 72 C28 72, 22 66, 20 60',C.leaf,C.gray,2)}
      ${path('M20 60 C36 58, 58 50, 72 40', 'none', C.gray,2)}
    `);
  }
  function iconFlower(){
    return svgWrap(96,96,`
      ${circle(48,48,6,'#fb7185')}
      ${circle(48,32,10,'#fda4af')}
      ${circle(32,48,10,'#fda4af')}
      ${circle(64,48,10,'#fda4af')}
      ${circle(48,64,10,'#fda4af')}
      ${rect(46,58,4,20,2,'#16a34a')}
    `);
  }
  function iconFruit(){
    return svgWrap(96,96,`
      ${circle(48,58,18,'#f97316')}
      ${path('M48 36 C44 38, 42 40, 42 44 C46 44, 50 42, 54 38', 'none', '#16a34a',3)}
    `);
  }
  function iconFish(){
    return svgWrap(96,96,`
      ${path('M22 52 C30 40, 54 36, 70 48 C56 60, 30 64, 22 52','none',C.gray,3)}
      ${path('M70 48 L82 42 L80 54 Z', 'none', C.gray,3)}
      ${circle(38,48,2,C.gray)}
    `);
  }
  function iconChicken(){
    return svgWrap(96,96,`
      ${circle(48,52,18,'#fde68a',C.gray)}
      ${circle(62,38,8,'#fde68a',C.gray)}
      ${path('M66 38 L76 34 L68 42 Z', 'none', '#ef4444',3)}
      ${circle(64,36,1.8,'#111')}
      ${line(40,70,42,82,C.gray,3)}
      ${line(56,70,58,82,C.gray,3)}
    `);
  }
  function iconDog(){
    return svgWrap(96,96,`
      ${rect(32,54,32,16,6,'#d6d3d1',C.gray)}
      ${circle(40,48,8,'#d6d3d1',C.gray)}
      ${circle(56,48,8,'#d6d3d1',C.gray)}
      ${path('M36 44 L28 36','none',C.gray,3)}
      ${circle(36,48,1.6,'#111')}
      ${circle(52,48,1.6,'#111')}
    `);
  }
  function iconCat(){
    return svgWrap(96,96,`
      ${circle(48,48,14,'#e5e7eb',C.gray)}
      ${path('M36 40 L34 32 L42 36','none',C.gray,2)}
      ${path('M60 40 L62 32 L54 36','none',C.gray,2)}
      ${circle(44,48,1.6,'#111')}
      ${circle(52,48,1.6,'#111')}
      ${path('M48 50 L48 54','none',C.gray,2)}
      ${path('M40 54 L32 58','none',C.gray,2)}
      ${path('M56 54 L64 58','none',C.gray,2)}
    `);
  }
  function iconBird(){
    return svgWrap(96,96,`
      ${path('M20 60 C28 44, 54 42, 70 52 C56 64, 36 66, 20 60', 'none', C.gray,3)}
      ${circle(48,50,2,'#111')}
      ${path('M58 48 L66 44 L62 52 Z', 'none', C.gray,3)}
    `);
  }
  function iconEgg(){
    return svgWrap(96,96,`${path('M48 30 C66 34, 66 62, 48 70 C30 62, 30 34, 48 30', 'none', C.gray,3)}`);
  }
  function iconBook(){
    return svgWrap(96,96,`
      ${rect(22,28,52,40,6,'#fff',C.gray)}
      ${path('M48 28 L48 68', 'none', C.gray,2)}
      ${path('M26 36 L44 36', 'none', C.gray,2)}
      ${path('M52 36 L70 36', 'none', C.gray,2)}
    `);
  }
  function iconPen(){
    return svgWrap(96,96,`
      ${path('M24 64 L64 24 L72 32 L32 72 Z', '#fee2e2', C.gray,2)}
      ${path('M64 24 L70 18 L78 26 L72 32 Z', '#fda4af', C.gray,2)}
    `);
  }
  function iconNotebook(){
    return svgWrap(96,96,`
      ${rect(26,22,44,52,6,'#fff',C.gray)}
      ${path('M30 30 L66 30','none',C.gray,2)}
      ${path('M30 38 L66 38','none',C.gray,2)}
      ${path('M30 46 L66 46','none',C.gray,2)}
    `);
  }
  function iconRuler(){
    return svgWrap(96,96,`
      ${rect(26,38,44,12,4,'#fde68a',C.gray)}
      ${line(30,38,30,44,C.gray,2)}
      ${line(38,38,38,42,C.gray,2)}
      ${line(46,38,46,44,C.gray,2)}
      ${line(54,38,54,42,C.gray,2)}
      ${line(62,38,62,44,C.gray,2)}
    `);
  }
  function iconMoon(){ return svgWrap(96,96,`${path('M62 30 C46 30, 36 42, 36 56 C36 68, 42 76, 52 82 C38 82, 26 70, 26 54 C26 38, 38 26, 54 26 Z', '#fef9c3', C.gray,2)}`); }
  function iconStar(){ return svgWrap(96,96,`${path('M48 20 L56 40 L78 40 L60 52 L66 72 L48 60 L30 72 L36 52 L18 40 L40 40 Z', '#fde68a', C.gray,2)}`); }
  function iconRain(){ return svgWrap(96,96,`${circle(40,34,12,'#e5e7eb')} ${circle(52,36,10,'#e5e7eb')} ${circle(62,32,10,'#e5e7eb')} ${path('M32 56 L28 68','none','#60a5fa',4)} ${path('M44 58 L40 70','none','#60a5fa',4)} ${path('M56 56 L52 68','none','#60a5fa',4)}`); }
  function iconSun(){ return svgWrap(96,96,`${circle(48,40,12,C.sun)} ${path('M48 16 L48 28','none',C.sun,3)} ${path('M48 52 L48 64','none',C.sun,3)} ${path('M24 40 L36 40','none',C.sun,3)} ${path('M60 40 L72 40','none',C.sun,3)} ${path('M34 26 L42 32','none',C.sun,3)} ${path('M54 48 L62 54','none',C.sun,3)} ${path('M62 26 L54 32','none',C.sun,3)} ${path('M42 48 L34 54','none',C.sun,3)}`); }
  function iconCloud(){ return svgWrap(96,96,`${circle(36,44,12,'#e5e7eb')} ${circle(48,42,14,'#e5e7eb')} ${circle(62,46,12,'#e5e7eb')} ${rect(28,48,48,10,8,'#e5e7eb')}`); }
  function iconWind(){ return svgWrap(96,96,`${path('M20 46 C32 42, 56 42, 72 46', 'none', C.gray,3)} ${path('M24 54 C38 50, 60 50, 76 54', 'none', C.gray,3)}`); }
  function iconRiver(){ return svgWrap(96,96,`${path('M20 40 C28 42, 36 44, 44 42 C52 40, 60 36, 76 38', 'none', C.sea,3)} ${path('M20 52 C28 54, 36 56, 44 54 C52 52, 60 48, 76 50', 'none', C.sea,3)}`); }
  function iconSea(){ return svgWrap(96,96,`${path('M20 56 C26 54, 32 52, 38 56 C44 60, 50 58, 56 56 C62 54, 68 52, 74 56', 'none', C.sea,3)} ${path('M20 44 C26 42, 32 40, 38 44 C44 48, 50 46, 56 44 C62 42, 68 40, 74 44', 'none', C.sea,3)}`); }
  function iconMountain(){ return svgWrap(96,96,`${path('M18 68 L36 38 L50 52 L64 28 L78 68 Z', 'none', C.gray,3)} ${path('M36 38 L50 52 L64 28', 'none', C.gray,3)}`); }
  function iconRoad(){ return svgWrap(96,96,`${rect(28,24,40,48,8,'#e5e7eb',C.gray)} ${path('M48 26 L48 70', 'none', '#fff',3)}`); }

  function iconPerson(kind='adult'){
    // kind: 'child','mom','dad','old'
    const color = kind==='mom'||kind==='child' ? '#f0abfc' : '#bfdbfe';
    return svgWrap(96,96,`
      ${circle(48,36,10,color,C.gray)}
      ${path('M48 48 C36 48, 34 62, 34 76 L62 76 C62 62, 60 48, 48 48 Z', '#f3f4f6', C.gray,2)}
    `);
  }

  function iconAction(type){
    // đi, về, học, đọc, viết, chơi, chạy, nhảy, ăn, uống, ngủ, thức
    switch(type){
      case 'đi': case 'về': return svgWrap(96,96,`${line(30,70,42,56,C.gray,4)}${line(42,56,58,70,C.gray,4)}${circle(44,36,8,'#d1d5db',C.gray)}${line(44,44,44,58,C.gray,4)}`);
      case 'học': return iconBook();
      case 'đọc': return iconBook();
      case 'viết': return iconPen();
      case 'chơi': return svgWrap(96,96,`${circle(48,52,12,'#93c5fd',C.gray)}${path('M36 44 L32 36','none',C.gray,3)}${path('M60 44 L64 36','none',C.gray,3)}`);
      case 'chạy': return svgWrap(96,96,`${line(26,64,42,52,C.gray,4)}${line(42,52,58,60,C.gray,4)}${path('M36 50 L48 42','none',C.gray,3)}${circle(48,36,6,'#d1d5db',C.gray)}`);
      case 'nhảy': return svgWrap(96,96,`${circle(48,36,6,'#d1d5db',C.gray)}${path('M48 42 L48 56','none',C.gray,3)}${path('M40 46 L36 38','none',C.gray,3)}${path('M56 46 L60 38','none',C.gray,3)}${path('M42 58 L48 64 L54 58','none',C.gray,3)}`);
      case 'ăn': return svgWrap(96,96,`${path('M30 62 L66 62','none',C.gray,3)}${path('M40 42 C44 40, 52 40, 56 42 C60 44, 60 54, 56 56 C52 58, 44 58, 40 56 C36 54, 36 44, 40
/* MODULE: ILLUSTRATIONS – Vẽ SVG minh họa nội tuyến cho các màn.
   Không dùng ảnh ngoài; hoàn toàn SVG sinh ra bằng code. */
(function(){
  const Ico = {
    // Tạo nền họa tiết tròn
    bgDots(color='#fff', op=0.15){
      return `<g opacity="${op}">
        ${[...Array(60)].map((_,i)=>{
          const x = 20 + (i%10)*36;
          const y = 20 + Math.floor(i/10)*24;
          const r = (i%3===0)? 3 : 2;
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
        }).join('')}
      </g>`;
    },
    // Clipboard (Assess)
    clipboard(){
      return `
        <rect x="28" y="24" rx="8" ry="8" width="200" height="140" fill="#ffffff" opacity="0.95"/>
        <rect x="88" y="10" rx="6" ry="6" width="80" height="28" fill="#FFD480"/>
        <rect x="40" y="48" width="176" height="10" fill="#E6EEF9"/>
        <rect x="40" y="66" width="120" height="10" fill="#E6EEF9"/>
        <rect x="40" y="84" width="176" height="10" fill="#E6EEF9"/>
        <rect x="40" y="102" width="156" height="10" fill="#E6EEF9"/>
        <rect x="40" y="120" width="136" height="10" fill="#E6EEF9"/>
        <g fill="#74C69D">
          <path d="M40 140 h10 v10 h-10 z"/><path d="M56 148 l6 6 l12 -12" stroke="#74C69D" stroke-width="4" fill="none"/>
        </g>
      `;
    },
    // Book (Reading)
    book(){
      return `
        <path d="M30 40 h90 a10 10 0 0 1 10 10 v86 a10 10 0 0 1 -10 10 h-90 z" fill="#ffffff" opacity="0.96"/>
        <path d="M130 40 h90 a10 10 0 0 1 10 10 v86 a10 10 0 0 1 -10 10 h-90 z" fill="#ffffff" opacity="0.96"/>
        <line x1="125" y1="40" x2="125" y2="146" stroke="#EAEAEA" stroke-width="2"/>
        ${[0,16,32,48,64,80].map(y=>`<rect x="38" y="${48+y}" width="74" height="8" fill="#E6EEF9"/>`).join('')}
        ${[0,16,32,48,64,80].map(y=>`<rect x="138" y="${48+y}" width="74" height="8" fill="#E6EEF9"/>`).join('')}
      `;
    },
    // Cards (Cards)
    cards(){
      const tile=(x,y,c)=>`<rect x="${x}" y="${y}" width="56" height="36" rx="6" fill="${c}" />`;
      return `
        ${tile(24,40,'#ffffff')}${tile(88,40,'#FEF7E6')}${tile(152,40,'#E6F7FD')}
        ${tile(24,84,'#EAF7EE')}${tile(88,84,'#ffffff')}${tile(152,84,'#F2EAFE')}
        ${tile(24,128,'#E6F7FD')}${tile(88,128,'#EAF7EE')}${tile(152,128,'#ffffff')}
      `;
    },
    // Phonology bubbles (PA)
    bubbles(){
      return `
        <circle cx="70" cy="70" r="36" fill="#ffffff" opacity="0.96"/>
        <circle cx="130" cy="58" r="24" fill="#EAF7EE"/>
        <circle cx="160" cy="106" r="28" fill="#E6F7FD"/>
        <circle cx="210" cy="76" r="20" fill="#F2EAFE"/>
        <text x="70" y="76" font-size="18" font-family="system-ui" text-anchor="middle" fill="#333">âm</text>
        <text x="160" y="112" font-size="14" font-family="system-ui" text-anchor="middle" fill="#333">vần</text>
      `;
    },
    // Game balloons
    balloons(){
      const bal=(x,y,c)=>`
        <ellipse cx="${x}" cy="${y}" rx="22" ry="28" fill="${c}"/>
        <path d="M${x} ${y+28} l-4 8 l8 0 z" fill="${c}"/>
        <path d="M${x} ${y+36} q -8 18 12 36" stroke="#888" fill="none"/>
      `;
      return `${bal(70,70,'#FFE27A')}${bal(120,54,'#9EE493')}${bal(176,86,'#85D1F0')}`;
    },
    // Dashboard charts
    charts(){
      return `
        <rect x="24" y="24" width="92" height="60" fill="#fff" opacity="0.95"/>
        <polyline points="28,76 46,62 64,68 82,42 110,56" fill="none" stroke="#5FA8D3" stroke-width="3"/>
        <rect x="138" y="24" width="92" height="60" fill="#fff" opacity="0.95"/>
        ${[0,1,2,3].map(i=>`<rect x="${146+i*20}" y="${78 - i*10}" width="14" height="${10+i*10}" fill="#74C69D"/>`).join('')}
        <rect x="24" y="100" width="206" height="56" fill="#fff" opacity="0.95"/>
        ${[0,1,2,3,4,5].map(i=>`<rect x="${32+i*30}" y="${146 - (i%3)*12}" width="12" height="${8 + (i%3)*12}" fill="#F4A261"/>`).join('')}
      `;
    },
    // Export doc
    exportDoc(){
      return `
        <rect x="50" y="30" width="120" height="130" rx="10" fill="#fff" opacity="0.96"/>
        <rect x="62" y="50" width="96" height="10" fill="#E6EEF9"/>
        <rect x="62" y="70" width="76" height="10" fill="#E6EEF9"/>
        <rect x="62" y="90" width="96" height="10" fill="#E6EEF9"/>
        <rect x="62" y="110" width="66" height="10" fill="#E6EEF9"/>
        <path d="M182 80 l24 16 l-24 16" fill="#85D1F0"/>
      `;
    },
    // Settings gears
    gears(){
      const gear=(cx,cy,r,c)=>`
        <g transform="translate(${cx},${cy})">
          <circle r="${r}" fill="${c}"/>
          ${[...Array(8)].map((_,i)=>{
            const a=i*Math.PI/4, x=Math.cos(a)*(r+8), y=Math.sin(a)*(r+8);
            return `<rect x="${x-3}" y="${y-6}" width="6" height="12" transform="rotate(${a*180/Math.PI})" fill="${c}"/>`;
          }).join('')}
          <circle r="${r-6}" fill="#fff" opacity="0.9"/>
        </g>
      `;
      return gear(90,86,20,'#FFD480') + gear(152,60,16,'#9EE493');
    }
  };

  function svgWrap(content){
    return `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.0"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0.15"/>
        </linearGradient>
      </defs>
      <rect width="240" height="160" fill="url(#g1)"/>
      ${Ico.bgDots('#fff', 0.18)}
      ${content}
    </svg>`;
  }

  function mount(id, type){
    const el = document.getElementById(id);
    if (!el) return;
    let art = '';
    switch(type){
      case 'home': art = Ico.charts(); break;
      case 'assess': art = Ico.clipboard(); break;
      case 'pa': art = Ico.bubbles(); break;
      case 'cards': art = Ico.cards(); break;
      case 'reading': art = Ico.book(); break;
      case 'game': art = Ico.balloons(); break;
      case 'dashboard': art = Ico.charts(); break;
      case 'export': art = Ico.exportDoc(); break;
      case 'settings': art = Ico.gears(); break;
      default: art = Ico.bubbles();
    }
    el.innerHTML = svgWrap(art);
  }

  window.Illustrations = {
    renderAll(){
      mount('art-home','home');
      mount('art-assess','assess');
      mount('art-pa','pa');
      mount('art-cards','cards');
      mount('art-reading','reading');
      mount('art-game','game');
      mount('art-dashboard','dashboard');
      mount('art-export','export');
      mount('art-settings','settings');
    }
  };

  document.addEventListener('DOMContentLoaded', ()=> {
    try{ window.Illustrations.renderAll(); }catch(_){}
  });
})();
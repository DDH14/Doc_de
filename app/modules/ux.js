/* MODULE: UX – Toast, footer aria-current, phím tắt luyện đọc. */
window.UI = window.UI || {};
(function(){
  // Toast đơn giản
  function ensureToast(){
    let c = document.getElementById('toastContainer');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.position='fixed'; c.style.right='12px'; c.style.bottom='12px';
    c.style.zIndex='9999'; c.style.display='flex'; c.style.flexDirection='column'; c.style.gap='8px';
    document.body.appendChild(c);
    return c;
  }
  UI.toast = function(msg, ms=2200){
    const cont = ensureToast();
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.padding='10px 12px';
    d.style.borderRadius='8px';
    d.style.background='var(--toast-bg, rgba(20,20,20,.9))';
    d.style.color='#fff'; d.style.boxShadow='0 4px 14px rgba(0,0,0,.18)';
    d.style.maxWidth='min(320px, 90vw)';
    d.style.font='14px system-ui, sans-serif';
    cont.appendChild(d);
    setTimeout(()=>{ d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(), 300); }, ms);
  };

  // Footerbar aria-current
  function setFooterCurrent(screenId){
    const map = {
      'screen-home':'home',
      'screen-assess':'assess',
      'screen-pa':'pa',
      'screen-reading':'reading',
      'screen-game':'game',
      'screen-dashboard':'dashboard',
      'screen-export':'export'
    };
    const key = map[screenId] || '';
    const btns = document.querySelectorAll('.footerbar button');
    btns.forEach(b=> b.removeAttribute('aria-current'));
    // gán dựa trên onclick chứa App.nav('xxx')
    btns.forEach(b=>{
      const on = (b.getAttribute('onclick')||'');
      const m = on.match(/App\.nav\('([^']+)'\)/);
      if (m && m[1]===key) b.setAttribute('aria-current','page');
    });
  }
  function observeActiveScreen(){
    const root = document.body;
    const obs = new MutationObserver(()=>{
      const act = document.querySelector('.screen.active');
      if (act) setFooterCurrent(act.id);
    });
    obs.observe(root, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    // thiết lập lần đầu
    const act = document.querySelector('.screen.active');
    if (act) setFooterCurrent(act.id);
  }

  // Phím tắt trong Luyện đọc
  function keyHandler(e){
    const scr = document.getElementById('screen-reading');
    if (!scr || scr.style.display==='none' || !scr.classList.contains('screen')) return;
    const isActive = scr.classList.contains('active') || scr.style.display!=='none';
    if (!isActive) return;
    const tag = (e.target && e.target.tagName)||'';
    if (/(INPUT|TEXTAREA|SELECT)/.test(tag)) return; // không chặn khi đang nhập

    const startBtn = document.getElementById('btnStartRead');
    const stopBtn = document.getElementById('btnStopRead');

    // S = start
    if (e.key==='s' || e.key==='S'){
      if (startBtn && !startBtn.disabled){ startBtn.click(); UI.toast('Bắt đầu (phím S)'); e.preventDefault(); }
    }
    // E/K = stop
    if (e.key==='e' || e.key==='E' || e.key==='k' || e.key==='K'){
      if (stopBtn && !stopBtn.disabled){ stopBtn.click(); UI.toast('Kết thúc (phím E/K)'); e.preventDefault(); }
    }
    // → qua bước
    if (e.key==='ArrowRight'){
      const st2 = document.getElementById('readStep2'), st3 = document.getElementById('readStep3'), st4 = document.getElementById('readStep4');
      if (st2 && st2.style.display!=='none'){ const b = scr.querySelector('#readStep2 button.primary[onclick*="goStep(3)"]'); if (b){ b.click(); e.preventDefault(); } }
      else if (st3 && st3.style.display!=='none'){ const b = scr.querySelector('#readStep3 button.primary[onclick*="goStep(4)"]'); if (b){ b.click(); e.preventDefault(); } }
    }
    // ← về bước
    if (e.key==='ArrowLeft'){
      const st2 = document.getElementById('readStep2'), st3 = document.getElementById('readStep3'), st4 = document.getElementById('readStep4');
      if (st3 && st3.style.display!=='none'){ const b = scr.querySelector('#readStep3 button.ghost[onclick*="goStep(2)"]'); if (b){ b.click(); e.preventDefault(); } }
      else if (st2 && st2.style.display!=='none'){ const b = scr.querySelector('#readStep2 button.ghost[onclick*="goStep(1)"]'); if (b){ b.click(); e.preventDefault(); } }
      else if (st4 && st4.style.display!=='none'){ const b = scr.querySelector('#readStep4 button.ghost[onclick*="goStep(3)"]'); if (b){ b.click(); e.preventDefault(); } }
    }
  }

  function init(){
    observeActiveScreen();
    window.addEventListener('keydown', keyHandler, { capture:true });
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
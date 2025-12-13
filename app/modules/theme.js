/* MODULE: THEME – Đổi giao diện Light/Dark/Sepia/High-Contrast/System, lưu vào Store. */
(function(){
  const THEMES = ['system','light','dark','sepia','hc']; // hc = high-contrast
  const ICONS = { system:'🌈', light:'🌤️', dark:'🌙', sepia:'📜', hc:'⚫⚪' };

  function getStore(){
    try{ return window.Store; }catch(_){ return null; }
  }
  function loadTheme(){
    try{
      const S = getStore();
      const t = (S && typeof S.get==='function') ? (S.get('uiTheme') || 'system') : (localStorage.getItem('uiTheme') || 'system');
      return THEMES.includes(t) ? t : 'system';
    }catch(_){ return 'system'; }
  }
  function saveTheme(t){
    try{
      const S = getStore();
      if (S && typeof S.set==='function') S.set('uiTheme', t);
      else localStorage.setItem('uiTheme', t);
    }catch(_){}
  }
  function applyTheme(t){
    const el = document.documentElement; // <html>
    // system = bỏ data-theme để dùng OS
    if (t==='system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t);
    // Cập nhật nút
    const btn = document.getElementById('btnTheme');
    if (btn){
      btn.textContent = `${ICONS[t]||'🌈'} Giao diện`;
      btn.setAttribute('aria-label', `Giao diện: ${t}`);
    }
  }
  function nextTheme(cur){
    const i = THEMES.indexOf(cur);
    return THEMES[(i+1) % THEMES.length];
  }

  function init(){
    const cur = loadTheme();
    applyTheme(cur);
    const btn = document.getElementById('btnTheme');
    if (btn){
      btn.addEventListener('click', ()=>{
        const now = loadTheme();
        const nx = nextTheme(now);
        saveTheme(nx); applyTheme(nx);
        if (window.UI && typeof UI.toast==='function'){
          const vn = {system:'Theo hệ thống', light:'Sáng', dark:'Tối', sepia:'Sepia', hc:'Tương phản cao'}[nx] || nx;
          UI.toast(`Đã chuyển giao diện: ${vn}`);
        }
      });
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
/* MODULE: DASHBOARD_EXTRA – Vẽ 4 đồ thị từ Đánh giá nhanh (PA, RAN, DEC, SIGHT).
   Độc lập với modules/dashboard.js hiện có; gọi DashboardExtra.render() khi mở Dashboard. */
window.DashboardExtra = {
  render(){
    try{
      const logs = (window.AppState && Array.isArray(AppState.logs)) ? AppState.logs : [];
      const S = logs.filter(x=>x && x.type==='screen').sort((a,b)=>(a.ts||0)-(b.ts||0));
      // Dữ liệu
      const xs = S.map(x=> this.fmtDate(x.ts));
      const pa = S.map(x=> (typeof x.paAcc==='number') ? Math.max(0, Math.min(1, x.paAcc))*100 : null);
      const ran = S.map(x=> (typeof x.ranSec==='number') ? x.ranSec : null);
      const dec = S.map(x=> (typeof x.decAcc==='number') ? Math.max(0, Math.min(1, x.decAcc))*100 : null);
      const sight = S.map(x=> (typeof x.sightAcc==='number') ? Math.max(0, Math.min(1, x.sightAcc))*100 : null);

      this.drawLine('chartPA', xs, pa, { title:'PA %', color:'#2a9d8f', ymin:0, ymax:100, hint:'PA: tỉ lệ đúng (%)' });
      this.drawLine('chartRAN', xs, ran, { title:'RAN (giây / 50)', color:'#e76f51', ymin:0, ymax:this.maxRAN(ran), invert:true, hint:'RAN: càng thấp càng tốt' });
      this.drawLine('chartDEC', xs, dec, { title:'Decoding %', color:'#264653', ymin:0, ymax:100, hint:'Decoding: tỉ lệ đúng (%)' });
      this.drawLine('chartSIGHT', xs, sight, { title:'Sight %', color:'#f4a261', ymin:0, ymax:100, hint:'Sight: tỉ lệ đúng (%)' });
    }catch(e){
      console.warn('DashboardExtra.render error', e);
    }
  },

  maxRAN(arr){
    const vals = (arr||[]).filter(x=>typeof x==='number');
    if (!vals.length) return 60;
    const m = Math.max.apply(null, vals);
    return Math.min(120, Math.max(30, Math.ceil(m/10)*10));
  },

  fmtDate(ts){
    try{
      const d = new Date(ts||Date.now());
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      return `${dd}/${mm}`;
    }catch(_){ return '—'; }
  },

  drawLine(canvasId, labels, data, opt){
    const cv = document.getElementById(canvasId);
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    // clear
    ctx.clearRect(0,0,W,H);
    // frame
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = '#ddd'; ctx.strokeRect(0,0,W,H);

    const padL = 42, padR=10, padT=18, padB=28;
    const w = W - padL - padR;
    const h = H - padT - padB;

    // y scale
    const ymin = (typeof opt.ymin==='number') ? opt.ymin : 0;
    const ymax = (typeof opt.ymax==='number') ? opt.ymax : 100;
    const invert = !!opt.invert;

    // axes
    ctx.strokeStyle = '#ccc'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT+h); ctx.lineTo(padL+w, padT+h); ctx.stroke();

    // y ticks
    ctx.fillStyle = '#666'; ctx.font = '12px system-ui, sans-serif';
    const yticks = 4;
    for (let i=0;i<=yticks;i++){
      const v = ymin + (i*(ymax-ymin)/yticks);
      const y = padT + h - (i*h/yticks);
      ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL+w, y); ctx.stroke();
      ctx.fillStyle='#666'; ctx.fillText(String(Math.round(v)), 4, y+4);
    }

    // x labels
    const n = labels.length;
    const step = n>1 ? (w/(n-1)) : 0;
    ctx.fillStyle='#666';
    for (let i=0;i<n;i++){
      if (n>12 && i%2) continue; // giảm nhiễu
      const x = padL + i*step;
      ctx.fillText(labels[i] || '', x-10, padT+h+18);
    }

    // line
    ctx.strokeStyle = opt.color || '#36c'; ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i=0;i<n;i++){
      const v = data[i];
      if (typeof v!=='number'){ started=false; continue; }
      const x = padL + i*step;
      let norm = (v - ymin) / (ymax - ymin); norm = Math.max(0, Math.min(1, norm));
      const y = invert ? (padT + norm*h) : (padT + h - norm*h);
      if (!started){ ctx.moveTo(x,y); started=true; } else ctx.lineTo(x,y);
      // point
      ctx.fillStyle=opt.color||'#36c'; ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
    }
    ctx.stroke();

    // title/hint
    ctx.fillStyle = '#111'; ctx.font='bold 13px system-ui, sans-serif';
    ctx.fillText(opt.title || '', padL, 14);
    ctx.fillStyle='#777'; ctx.font='11px system-ui, sans-serif';
    if (opt.hint) ctx.fillText(opt.hint, padL+120, 14);
  }
};
// Tự render nếu vào dashboard bằng các nút khác
document.addEventListener('DOMContentLoaded', ()=>{
  // cố gắng render sau khi AppState đã tải logs
  setTimeout(()=>{ try{ DashboardExtra.render(); }catch(_){} }, 500);
});
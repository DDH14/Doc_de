/* DASHBOARD MODULE - đáp ứng các yêu cầu 2.5.5 và 2.6
   - KPIs đầu trang
   - Biểu đồ: WCPM & Accuracy (time series), Lỗi theo tag (stacked),
              Thời lượng & Số phiên (bar+line), các khối PA/Cards/Game
   - Gợi ý tuần này: dựa 7 ngày gần nhất
   - Xuất CSV nhanh; Evaluation Snapshot (PDF qua cửa sổ in)
   - Kiểm thử chấp nhận (smoke) với dữ liệu mẫu (tùy chọn)
   - Chuẩn Unicode NFC cho xuất liệu
*/
(function () {
  // ==========================
  // Utils
  // ==========================
  const DAY_MS = 24 * 60 * 60 * 1000;
  const TAGS = ['tone','sx','chtr','nl','ngngh','ckqu','ghg','omission','insertion','misc','other'];
  const ERROR_TAGS = ['tone','sx','chtr','nl','ngngh','ckqu','ghg','omission','insertion','misc','other'];

  function nfc(s) { try { return (s ?? '').normalize('NFC'); } catch { return s ?? ''; } }
  function toPct(x, digits = 0) { if (x == null || isNaN(x)) return '—'; return (x * 100).toFixed(digits) + '%'; }
  function fmtPct(x, digits = 0) { if (x == null || isNaN(x)) return '—'; return (x).toFixed(digits) + '%'; }
  function sum(arr) { return arr.reduce((a,b)=>a+(+b||0),0); }
  function avg(arr) { if (!arr.length) return 0; return sum(arr)/arr.length; }
  function median(arr) { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }
  function dateKey(ts) { const d = new Date(ts); // YYYY-MM-DD local
    const y = d.getFullYear(); const m = (d.getMonth()+1).toString().padStart(2,'0'); const da = d.getDate().toString().padStart(2,'0'); return `${y}-${m}-${da}`; }
  function labelShort(key) { // 'YYYY-MM-DD' -> 'DD/MM'
    const [y,m,d] = key.split('-'); return `${d}/${m}`;
  }
  function startOfToday() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); }
  function startOfWeekMonday() { const now = new Date(); const day = (now.getDay()+6)%7; const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - day*DAY_MS; return s; }
  function within(ts, from, to) { const t = +new Date(ts); return t>=from && t<=to; }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function humanMinutes(sec){ if (sec==null) return '0'; const m = Math.round(sec/60); return `${m}′`; }
  function safeGet(obj, path, dflt) {
    try { return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj) ?? dflt; } catch { return dflt; }
  }

  // ==========================
  // Chart primitives (Canvas 2D) - fallback nếu drawLineChart chưa tồn tại
  // ==========================
  function ensureChartFuncs(){
    if (typeof window.drawLineChart !== 'function'){
      window.drawLineChart = (canvas, labels, data, color = '#1565C0', yLabel = '') => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        resizeCanvasToDisplaySize(canvas);
        const {w,h,pad} = {w:canvas.width, h:canvas.height, pad:30};
        ctx.clearRect(0,0,w,h);
        // Axes
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
        // Scale
        const maxVal = Math.max(10, Math.max(...data.map(v=>+v||0)));
        const minVal = Math.min(0, Math.min(...data.map(v=>+v||0)));
        const range = maxVal - minVal || 1;
        const sx = (w-2*pad) / Math.max(1, (labels.length-1));
        const sy = (h-2*pad) / range;
        // Line
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
        data.forEach((v,i)=>{
          const x = pad + i*sx;
          const y = h-pad - ((v-minVal)*sy);
          if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }); ctx.stroke();
        // Dots
        ctx.fillStyle = color;
        data.forEach((v,i)=>{
          const x = pad + i*sx;
          const y = h-pad - ((v-minVal)*sy);
          ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
        });
        // X labels (sparse)
        ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
        const step = Math.ceil(labels.length/6);
        labels.forEach((lb,i)=>{ if (i%step===0 || i===labels.length-1) ctx.fillText(lb, pad + i*sx - 8, h-pad+14); });
        // Y label
        if (yLabel){ ctx.save(); ctx.translate(10, h/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLabel, 0,0); ctx.restore(); }
      };
    }
    if (typeof window.drawMultiLineChart !== 'function'){
      window.drawMultiLineChart = (canvas, labels, datasets, yLabel = '') => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        resizeCanvasToDisplaySize(canvas);
        const {w,h,pad} = {w:canvas.width, h:canvas.height, pad:30};
        ctx.clearRect(0,0,w,h);
        // Compute global min/max
        const all = datasets.flatMap(d=>d.data);
        const maxVal = Math.max(10, Math.max(...all.map(v=>+v||0)));
        const minVal = Math.min(0, Math.min(...all.map(v=>+v||0)));
        const range = maxVal - minVal || 1;
        const sx = (w-2*pad) / Math.max(1, (labels.length-1));
        const sy = (h-2*pad) / range;
        // Axes
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
        // Lines
        datasets.forEach(ds=>{
          ctx.strokeStyle = ds.color; ctx.lineWidth = 2; ctx.beginPath();
          ds.data.forEach((v,i)=>{
            const x = pad + i*sx;
            const y = h-pad - ((v-minVal)*sy);
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }); ctx.stroke();
          // Dots
          ctx.fillStyle = ds.color;
          ds.data.forEach((v,i)=>{
            const x = pad + i*sx;
            const y = h-pad - ((v-minVal)*sy);
            ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
          });
        });
        // X labels
        ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
        const step = Math.ceil(labels.length/6);
        labels.forEach((lb,i)=>{ if (i%step===0 || i===labels.length-1) ctx.fillText(lb, pad + i*sx - 8, h-pad+14); });
        // Legend
        let lx = pad+5, ly = pad-12;
        datasets.forEach(ds=>{
          ctx.fillStyle = ds.color; ctx.fillRect(lx, ly-8, 10, 10);
          ctx.fillStyle = '#333'; ctx.fillText(ds.label, lx+14, ly);
          lx += ctx.measureText(ds.label).width + 50;
        });
        // Y label
        if (yLabel){ ctx.save(); ctx.translate(10, h/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLabel, 0,0); ctx.restore(); }
      };
    }
    if (typeof window.drawStackedBarChart !== 'function'){
      window.drawStackedBarChart = (canvas, labels, seriesMap, colors, yLabel='')=>{
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        resizeCanvasToDisplaySize(canvas);
        const {w,h,pad} = {w:canvas.width, h:canvas.height, pad:30};
        ctx.clearRect(0,0,w,h);
        const keys = Object.keys(seriesMap);
        const n = labels.length;
        const totals = labels.map((_,i)=> sum(keys.map(k => +seriesMap[k][i] || 0)));
        const maxVal = Math.max(5, Math.max(...totals));
        const sx = (w-2*pad) / n;
        // Axes
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
        // Bars
        labels.forEach((lb,i)=>{
          let accH = 0;
          keys.forEach(k=>{
            const val = +seriesMap[k][i] || 0;
            const barH = (h-2*pad) * (val/maxVal);
            const x = pad + i*sx + sx*0.1;
            const y = h - pad - accH - barH;
            const bw = sx*0.8;
            ctx.fillStyle = colors[k] || '#999';
            ctx.fillRect(x,y,bw,barH);
            accH += barH;
          });
        });
        // X labels
        ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
        const step = Math.ceil(labels.length/6);
        labels.forEach((lb,i)=>{ if (i%step===0 || i===labels.length-1) ctx.fillText(lb, pad + i*sx, h-pad+14); });
        // Legend
        let lx = pad+5, ly = pad-12;
        keys.forEach(k=>{
          ctx.fillStyle = colors[k] || '#999'; ctx.fillRect(lx, ly-8, 10, 10);
          ctx.fillStyle = '#333'; ctx.fillText(k, lx+14, ly);
          lx += ctx.measureText(k).width + 40;
        });
        if (yLabel){ ctx.save(); ctx.translate(10, h/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLabel, 0,0); ctx.restore(); }
      };
    }
    if (typeof window.drawBarLineCombo !== 'function'){
      window.drawBarLineCombo = (canvas, labels, barData, barColor, lineData, lineColor, yLeft='Phút', yRight='Phiên')=>{
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        resizeCanvasToDisplaySize(canvas);
        const {w,h,pad} = {w:canvas.width, h:canvas.height, pad:30};
        ctx.clearRect(0,0,w,h);
        // Scales
        const maxBar = Math.max(5, Math.max(...barData));
        const maxLine = Math.max(1, Math.max(...lineData));
        const sx = (w-2*pad) / Math.max(1, (labels.length-1));
        const syBar = (h-2*pad) / maxBar;
        const syLine = (h-2*pad) / maxLine;
        // Axes
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
        // Bars (left axis)
        labels.forEach((lb,i)=>{
          const x = pad + i*sx - sx*0.3;
          const barH = (barData[i]||0)*syBar;
          ctx.fillStyle = barColor;
          ctx.fillRect(x, h-pad-barH, sx*0.6, barH);
        });
        // Line (right axis)
        ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.beginPath();
        labels.forEach((lb,i)=>{
          const x = pad + i*sx;
          const y = h - pad - (lineData[i]||0)*syLine;
          if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }); ctx.stroke();
        // Dots
        ctx.fillStyle = lineColor;
        labels.forEach((lb,i)=>{
          const x = pad + i*sx;
          const y = h - pad - (lineData[i]||0)*syLine;
          ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
        });
        // X labels
        ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
        const step = Math.ceil(labels.length/6);
        labels.forEach((lb,i)=>{ if (i%step===0 || i===labels.length-1) ctx.fillText(lb, pad + i*sx - 8, h-pad+14); });
        // Y labels
        if (yLeft){ ctx.save(); ctx.translate(10, h/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLeft, 0,0); ctx.restore(); }
        if (yRight){ ctx.save(); ctx.translate(w-10, h/2); ctx.rotate(Math.PI/2); ctx.fillText(yRight, 0,0); ctx.restore(); }
      };
    }
    if (typeof window.drawBarChart !== 'function'){
      window.drawBarChart = (canvas, labels, values, color='#1976D2', yLabel='')=>{
        if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        resizeCanvasToDisplaySize(canvas);
        const {w,h,pad} = {w:canvas.width, h:canvas.height, pad:30};
        ctx.clearRect(0,0,w,h);
        const n = labels.length;
        const maxVal = Math.max(1, Math.max(...values));
        const sx = (w-2*pad) / n;
        // Axes
        ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.stroke();
        // Bars
        values.forEach((v,i)=>{
          const x = pad + i*sx + sx*0.1;
          const y = h-pad - (h-2*pad)*(v/maxVal);
          const bw = sx*0.8;
          const bh = (h-2*pad)*(v/maxVal);
          ctx.fillStyle = color; ctx.fillRect(x,y,bw,bh);
        });
        // X labels
        ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
        const step = Math.ceil(n/6);
        labels.forEach((lb,i)=>{ if (i%step===0 || i===n-1) ctx.fillText(lb, pad + i*sx, h-pad+14); });
        if (yLabel){ ctx.save(); ctx.translate(10, h/2); ctx.rotate(-Math.PI/2); ctx.fillText(yLabel, 0,0); ctx.restore(); }
      };
    }
  }

  function resizeCanvasToDisplaySize(canvas) {
    if (!canvas) return;
    const width  = canvas.clientWidth  || 600;
    const height = canvas.clientHeight || 200;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  // ==========================
  // Core computations
  // ==========================
  function getLogs() {
    const logs = Array.isArray(window.AppState?.logs) ? window.AppState.logs : [];
    // Normalize ts
    logs.forEach(l => { if (!l.ts && l.time) l.ts = l.time; });
    return logs.sort((a,b)=> (+new Date(a.ts)) - (+new Date(b.ts)));
  }

  function getLastReading(logs){
    const r = [...logs].filter(x=>x.type==='reading' && typeof x.wcpm==='number').slice(-1)[0];
    return r || null;
  }

  function getReadingSeries(logs) {
    const rLogs = logs.filter(x=>x.type==='reading');
    const byDay = new Map();
    rLogs.forEach(l=>{
      const dk = dateKey(l.ts);
      if (!byDay.has(dk)) byDay.set(dk, []);
      byDay.get(dk).push(l);
    });
    const keys = [...byDay.keys()].sort();
    const xs = keys.map(k=> labelShort(k));
    const wcpm = keys.map(k=> avg(byDay.get(k).map(l=> +l.wcpm || 0)));
    const acc = keys.map(k=> avg(byDay.get(k).map(l=> +(l.accuracy||0)*100)));
    const durMin = keys.map(k=> Math.round(sum(byDay.get(k).map(l=> +(l.durationMs||0)))/60000));
    const sessions = keys.map(k=> byDay.get(k).length);
    // Errors stacked by tag
    const errSeries = {};
    ERROR_TAGS.forEach(t=> errSeries[t]= keys.map(()=>0));
    keys.forEach((k,idx)=>{
      const arr = byDay.get(k);
      arr.forEach(l=>{
        const e = l.errorsByType || {};
        ERROR_TAGS.forEach(t=>{
          errSeries[t][idx] += +(e[t] || 0);
        });
      });
    });
    return { xs, wcpm, acc, durMin, sessions, errSeries };
  }

  function computeDurations(logs) {
    const now = Date.now();
    const todayStart = startOfToday();
    const weekStart = startOfWeekMonday();
    const todayLogs = logs.filter(l => within(l.ts, todayStart, todayStart + DAY_MS - 1));
    const weekLogs = logs.filter(l => within(l.ts, weekStart, now));
    const durTodaySec = Math.round(sum(todayLogs.map(l=> +l.durationMs || 0))/1000);
    const durWeekSec = Math.round(sum(weekLogs.map(l=> +l.durationMs || 0))/1000);
    return { durTodaySec, durWeekSec };
  }

  function getCardState(){
    // CARD_STATE có thể ở AppState.cardState hoặc AppState.cards?.state
    return window.AppState?.cardState || window.AppState?.CARD_STATE || {};
  }

  function countMasteredCards(cardState){
    // "Đã vững": interval >= 14 ngày
    try {
      const vals = Object.values(cardState || {});
      const mastered = vals.filter(s=>{
        const I = s?.interval ?? s?.intervalDays ?? 0;
        return (I >= 14);
      }).length;
      return mastered;
    } catch { return 0; }
  }

  function computeAvgReadingAcc7d(logs){
    const since = Date.now() - 7*DAY_MS;
    const arr = logs.filter(l=> l.type==='reading' && within(l.ts, since, Date.now())).map(l=> +l.accuracy*100 || 0);
    return arr.length ? avg(arr) : 0;
  }

  function collectTagStats7d(logs){
    const since = Date.now() - 7*DAY_MS;
    const within7 = logs.filter(l=> within(l.ts, since, Date.now()));
    const tagTotals = {}; // tag -> {correct, total}
    function accTag(tag, correct, weight=1){
      if (!tag) return;
      const t = String(tag);
      if (!tagTotals[t]) tagTotals[t] = {correct:0,total:0};
      tagTotals[t].correct += (correct? weight:0);
      tagTotals[t].total += weight;
    }
    within7.forEach(l=>{
      if (l.type==='pa'){
        const tags = l.tags || (l.tag?[l.tag]:[]);
        const correct = !!l.correct || l.score===1 || l.ok===true;
        const w = 1;
        tags.forEach(t=> accTag(t, correct, w));
      } else if (l.type==='cards'){
        const tags = l.tags || l.cardTags || [];
        const q = +l.q || +l.Q || 0;
        const correct = q>=3;
        const w = 1;
        tags.forEach(t=> accTag(t, correct, w));
      } else if (l.type==='game'){
        const t = l.targetTag || l.tag || (l.mode==='tone'?'tone': null);
        const accuracy = (typeof l.accuracy==='number') ? clamp(l.accuracy, 0, 1) : null;
        if (t && accuracy!=null){
          // 1 "phiên" = trọng số 1
          accTag(t, true, accuracy);
          accTag(t, false, 1-accuracy);
        }
      } else if (l.type==='reading'){
        // Chuyển lỗi thành tín hiệu "không đúng" theo tag (nếu có)
        const e = l.errorsByType || {};
        const tokens = +l.totalTokens || 0;
        ERROR_TAGS.forEach(t=>{
          const wrong = +e[t] || 0;
          if (wrong>0){
            // Quy ước: total bằng wrong + đúng giả định cùng số (nhẹ cân)
            accTag(t, false, wrong);
          }
        });
      }
    });
    // Tính accuracy theo tag
    const tagAcc = {};
    Object.keys(tagTotals).forEach(t=>{
      const it = tagTotals[t];
      const a = it.total ? (it.correct/it.total) : 0;
      tagAcc[t] = {acc: a, total: it.total};
    });
    // Tag đỏ: acc<0.7 và số lượt >=8
    const red = Object.entries(tagAcc)
      .filter(([t,v])=> v.total>=8 && v.acc < 0.7)
      .sort((a,b)=> (a[1].acc - b[1].acc))
      .map(([t])=> t);
    return { tagAcc, redTags: red.slice(0,3) };
  }

  function computePAStats7d(logs){
    const since = Date.now() - 7*DAY_MS;
    const arr = logs.filter(l=> l.type==='pa' && within(l.ts, since, Date.now()));
    const corrects = arr.map(l=> (l.correct || l.score===1 || l.ok===true) ? 1: 0);
    const rts = arr.map(l=> +l.rtMs || +l.rt || 0).filter(x=> x>0 && x<10000);
    return {
      acc: corrects.length? avg(corrects) : 0,
      rtMedian: rts.length? median(rts) : 0,
      n: arr.length
    };
  }

  function computeCardStats7d(logs, cardState){
    const since = Date.now() - 7*DAY_MS;
    const arr = logs.filter(l=> l.type==='cards' && within(l.ts, since, Date.now()));
    const qVals = arr.map(l=> +l.q || +l.Q || 0).filter(x=> x>0);
    const avgQ = qVals.length? avg(qVals) : 0;
    const mastered = countMasteredCards(cardState);
    // Ước lượng due completion: tỷ lệ số review có due≤now trong 7 ngày được thực hiện
    let dueTotal = 0, dueDone = 0;
    try {
      const now = Date.now();
      const states = Object.entries(cardState || {});
      states.forEach(([cardId, s])=>{
        const due = +s?.due || +s?.dueAt || 0;
        if (due>0 && due<=now) dueTotal++;
      });
      // Unique cardIds reviewed trong 7 ngày
      const reviewedIds = new Set(arr.map(l=> l.cardId || l.id).filter(Boolean));
      reviewedIds.forEach(()=> dueDone++); // xấp xỉ
    } catch {}
    const dueCompletion = (dueTotal>0) ? clamp(dueDone/dueTotal, 0, 1) : null;
    // Ease drift: so sánh Q trung bình 7d gần với 7–14d trước
    const prevArr = logs.filter(l=> l.type==='cards' && within(l.ts, since-7*DAY_MS, since));
    const prevQ = prevArr.map(l=> +l.q || +l.Q || 0).filter(x=> x>0);
    const easeDrift = (qVals.length && prevQ.length) ? (avg(qVals) - avg(prevQ)) : 0;
    return { mastered, dueCompletion, easeDrift, avgQ, n: arr.length };
  }

  function computeGameStats7d(logs){
    const since = Date.now() - 7*DAY_MS;
    const arr = logs.filter(l=> l.type==='game' && within(l.ts, since, Date.now()));
    const accs = arr.map(l=> {
      const a = l.accuracy; return (typeof a==='number')? clamp(a,0,1) : null;
    }).filter(x=> x!=null);
    const lph = arr.map(l=> +l.listensPerHit || 0).filter(x=> x>0);
    const bestCombo = arr.map(l=> +l.bestCombo || 0);
    return {
      acc: accs.length? avg(accs) : null,
      listensPerHit: lph.length? avg(lph) : null,
      bestCombo: bestCombo.length? Math.max(...bestCombo) : null,
      n: arr.length
    };
  }

  function computeWeeklyTips(kpis, tagStats, latestReading){
    const tips = [];
    // Tag yếu -> PA 10 + Cards 15
    if (tagStats.redTags.length){
      const tg = tagStats.redTags.slice(0,2).join(', ');
      tips.push(`Tập trung tag yếu: ${tg} → PA 10 mục + Cards 15 thẻ mỗi ngày (7 ngày).`);
    } else {
      tips.push(`Duy trì ôn thẻ đã vững và luyện PA 10 mục/ngày để củng cố tự động hóa.`);
    }
    // Gợi ý TTS speed & độ dài đoạn theo WCPM/Accuracy
    const lastAcc = +(kpis.avgAcc7d || 0);
    const lastW = +(kpis.lastWcpm || 0);
    let rate = 0.9;
    if (lastAcc < 85) rate = 0.75; else if (lastAcc < 90) rate = 0.8; else if (lastAcc < 95) rate = 0.85; else rate = 0.95;
    let length = '60–100 tiếng';
    if (lastW < 50) length = '40–60 tiếng';
    else if (lastW < 80) length = '60–100 tiếng';
    else if (lastW < 110) length = '100–140 tiếng';
    else length = '140–180 tiếng';
    tips.push(`Reading: TTS mẫu ≈ ${rate.toFixed(2)}×; độ dài đoạn ${length}.`);
    if (lastAcc < 90) tips.push(`Bật Spotlight và Pacer; cân nhắc xuống 1 mức (level) tạm thời để tăng độ chính xác.`);
    else tips.push(`Duy trì level hiện tại; thêm Echo ở câu khó để nâng lưu loát.`);
    return tips;
  }

  // ==========================
  // Rendering
  // ==========================
  function renderKPIs(kpis){
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('kpiToday', humanMinutes(kpis.durTodaySec));
    set('kpiWeek', humanMinutes(kpis.durWeekSec));
    set('kpiLastWCPM', kpis.lastWcpm != null ? Math.round(kpis.lastWcpm) : '—');
    set('kpiAvgAcc', kpis.avgAcc7d != null ? fmtPct(kpis.avgAcc7d,0) : '—');
    set('kpiMasteredCards', kpis.masteredCards != null ? String(kpis.masteredCards) : '—');
    set('kpiRedTags', kpis.redTags?.length ? kpis.redTags.join(', ') : '—');
  }

  function renderCharts(series, paStats, cardStats, gameStats){
    // 1) WCPM & Accuracy time series (multi-line)
    const c1 = document.getElementById('chartWCPM_ACC');
    if (c1){
      window.drawMultiLineChart(c1, series.xs, [
        {label:'WCPM', color:'#2E7D32', data: series.wcpm},
        {label:'% đúng', color:'#6A1B9A', data: series.acc}
      ], 'WCPM / % đúng');
    } else {
      // fallback: vẽ riêng nếu tồn tại
      window.drawLineChart(document.getElementById('chartWCPM'), series.xs, series.wcpm, '#2E7D32', 'WCPM');
      window.drawLineChart(document.getElementById('chartACC'), series.xs, series.acc, '#6A1B9A', '% đúng');
    }

    // 2) Lỗi theo tag (stacked columns)
    const errColors = {
      tone:'#C62828', sx:'#AD1457', chtr:'#6A1B9A', nl:'#4527A0',
      ngngh:'#283593', ckqu:'#1565C0', ghg:'#0277BD',
      omission:'#00897B', insertion:'#2E7D32', misc:'#9E9D24', other:'#8D6E63'
    };
    const c2 = document.getElementById('chartERR');
    if (c2){
      window.drawStackedBarChart(c2, series.xs, series.errSeries, errColors, 'Tổng lỗi (stacked)');
    }

    // 3) Thời lượng & số phiên (bar + line)
    const c3 = document.getElementById('chartTIME_SESS') || document.getElementById('chartDUR');
    if (c3){
      window.drawBarLineCombo(c3, series.xs, series.durMin, '#1565C0', series.sessions, '#EF6C00', 'Phút', 'Phiên');
    }

    // 4) Khối PA/Cards/Game (mini charts hoặc số liệu)
    const cPA = document.getElementById('chartPA');
    if (cPA){
      const labels = ['% đúng','RT (ms)'];
      const values = [Math.round((paStats.acc||0)*100), Math.round(paStats.rtMedian||0)];
      window.drawBarChart(cPA, labels, values, '#00897B', '');
    }
    const cCards = document.getElementById('chartCARDS');
    if (cCards){
      const duePct = cardStats.dueCompletion!=null ? Math.round(cardStats.dueCompletion*100) : 0;
      const labels = ['Đã vững','Due%','ΔQ'];
      const values = [cardStats.mastered||0, duePct, Math.round((cardStats.easeDrift||0)*100)/100];
      window.drawBarChart(cCards, labels, values, '#5D4037', '');
    }
    const cGame = document.getElementById('chartGAME');
    if (cGame){
      const labels = ['Acc%','LPH','BestCombo'];
      const acc = gameStats.acc!=null ? Math.round(gameStats.acc*100) : 0;
      const lph = gameStats.listensPerHit!=null ? Math.round(gameStats.listensPerHit*10)/10 : 0;
      const bc = gameStats.bestCombo || 0;
      const values = [acc, lph, bc];
      window.drawBarChart(cGame, labels, values, '#EF6C00', '');
    }
  }

  function renderWeeklyTips(tips){
    const el = document.getElementById('weeklyTips');
    if (!el) return;
    el.innerHTML = '';
    const ul = document.createElement('ul');
    tips.forEach(t=>{
      const li = document.createElement('li'); li.textContent = t; ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  function exportCSV(logs){
    // CSV nhanh: 1 dòng/log (chuẩn NFC)
    const headers = ['type','ts','date','wcpm','accuracy','durationMs','errorsByType','q','tags','cardId','easiness','interval','due','score','listensPerHit','bestCombo','mode','targetTag','rtMs','correct','level','totalTokens'];
    const rows = logs.map(l=>{
      const dateIso = new Date(l.ts).toISOString();
      const tags = JSON.stringify(l.tags || l.cardTags || []);
      const ebt = JSON.stringify(l.errorsByType || {});
      const row = [
        nfc(l.type||''), dateIso, dateKey(l.ts),
        l.wcpm ?? '', l.accuracy ?? '',
        l.durationMs ?? '',
        ebt,
        l.q ?? l.Q ?? '',
        nfc(tags),
        l.cardId ?? l.id ?? '',
        l.easiness ?? l.e ?? '',
        l.interval ?? l.intervalDays ?? '',
        l.due ?? l.dueAt ?? '',
        l.score ?? '',
        l.listensPerHit ?? '',
        l.bestCombo ?? '',
        l.mode ?? '',
        l.targetTag ?? l.tag ?? '',
        l.rtMs ?? l.rt ?? '',
        (l.correct===true || l.score===1 || l.ok===true) ? 1 : 0,
        l.level ?? '',
        l.totalTokens ?? ''
      ];
      return row.map(x=> (x===null || x===undefined) ? '' : String(x));
    });
    const csv = [headers.join(','), ...rows.map(r=> r.map(v=>{
      // Escape commas/quotes/newlines
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g,'""')}"`;
      return v;
    }).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `logs_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function exportSnapshotPDF(kpis, series, tagStats, paStats, cardStats, gameStats){
    // Tạo cửa sổ in (người dùng chọn "Lưu dưới dạng PDF")
    const w = window.open('', '_blank');
    if (!w) return;
    const css = `
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;padding:16px;color:#222}
      h1{font-size:18px;margin:0 0 8px}
      h2{font-size:16px;margin:16px 0 8px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .kpis{display:flex;flex-wrap:wrap;gap:8px}
      .kpis div{padding:8px 10px;border:1px solid #ddd;border-radius:6px}
      img{max-width:100%;height:auto;border:1px solid #eee;border-radius:6px}
      small{color:#666}
    `;
    const getImg = (id)=> {
      const c = document.getElementById(id);
      if (!c) return '';
      try { return `<img src="${c.toDataURL('image/png')}" alt="${id}">`; } catch { return ''; }
    };
    const pre7 = new Date(Date.now()-14*DAY_MS).toISOString().slice(0,10);
    const post7 = new Date(Date.now()-7*DAY_MS).toISOString().slice(0,10);
    const html = `
      <html><head><meta charset="utf-8"><title>Evaluation Snapshot</title><style>${css}</style></head>
      <body>
        <h1>Evaluation Snapshot</h1>
        <div class="kpis">
          <div><b>Hôm nay</b><br>${humanMinutes(kpis.durTodaySec)}</div>
          <div><b>Tuần</b><br>${humanMinutes(kpis.durWeekSec)}</div>
          <div><b>WCPM gần nhất</b><br>${Math.round(kpis.lastWcpm||0)}</div>
          <div><b>% đúng TB (7d)</b><br>${fmtPct(kpis.avgAcc7d||0)}</div>
          <div><b>Thẻ đã vững</b><br>${kpis.masteredCards||0}</div>
          <div><b>Tag đỏ</b><br>${kpis.redTags?.join(', ')||'—'}</div>
        </div>

        <h2>WCPM & Accuracy</h2>
        ${getImg('chartWCPM_ACC') || (getImg('chartWCPM')+getImg('chartACC'))}

        <h2>Lỗi theo tag (stacked)</h2>
        ${getImg('chartERR')}

        <h2>Thời lượng & số phiên</h2>
        ${getImg('chartTIME_SESS') || getImg('chartDUR')}

        <h2>PA / Cards / Game</h2>
        <div class="grid">
          <div><h3>PA</h3><small>% đúng 7d: ${fmtPct((paStats.acc||0)*100,0)}; RT median: ${Math.round(paStats.rtMedian||0)} ms</small><br>${getImg('chartPA')}</div>
          <div><h3>Cards</h3><small>Đã vững: ${cardStats.mastered||0}; Due completion: ${cardStats.dueCompletion!=null? fmtPct(cardStats.dueCompletion*100,0) : '—'}; ΔQ: ${Math.round((cardStats.easeDrift||0)*100)/100}</small><br>${getImg('chartCARDS')}</div>
          <div><h3>Game</h3><small>Acc: ${gameStats.acc!=null? fmtPct(gameStats.acc*100,0) : '—'}; LPH: ${gameStats.listensPerHit!=null? (Math.round(gameStats.listensPerHit*10)/10):'—'}; Best combo: ${gameStats.bestCombo||0}</small><br>${getImg('chartGAME')}</div>
        </div>

        <h2>Pre–Post (7 ngày trước: ${pre7} → 7 ngày sau: ${post7})</h2>
        <small>So sánh xu hướng từ WCPM & % đúng theo chuỗi thời gian (xem biểu đồ trên).</small>

        <h2>Gợi ý tuần này</h2>
        <ul>${(window.document.getElementById('weeklyTips')?.innerHTML)||''}</ul>

        <script>window.print();</script>
      </body>
      </html>
    `;
    w.document.open(); w.document.write(html); w.document.close();
  }

  // ==========================
  // Resize re-draw
  // ==========================
  function attachResizeRedraw(state){
    const ids = ['chartWCPM_ACC','chartWCPM','chartACC','chartERR','chartTIME_SESS','chartDUR','chartPA','chartCARDS','chartGAME'];
    const ro = new ResizeObserver(()=>{
      if (!state) return;
      renderCharts(state.series, state.paStats, state.cardStats, state.gameStats);
    });
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if (el) ro.observe(el);
    });
  }

  // ==========================
  // Public API
  // ==========================
  window.DashboardModule = {
    render(){
      ensureChartFuncs();
      const logs = getLogs();

      // Reading series & charts
      const series = getReadingSeries(logs);

      // KPIs
      const { durTodaySec, durWeekSec } = computeDurations(logs);
      const last = getLastReading(logs);
      const lastWcpm = last?.wcpm ?? null;
      const avgAcc7d = computeAvgReadingAcc7d(logs);

      // Card state & mastered
      const cardState = getCardState();
      const masteredCards = countMasteredCards(cardState);

      // Tag stats 7d
      const tagStats = collectTagStats7d(logs);

      // Compose KPIs object
      const kpis = {
        durTodaySec, durWeekSec,
        lastWcpm, avgAcc7d,
        masteredCards,
        redTags: tagStats.redTags
      };

      // Render KPIs
      renderKPIs(kpis);

      // PA/Cards/Game stats 7d
      const paStats = computePAStats7d(logs);
      const cardStats = computeCardStats7d(logs, cardState);
      const gameStats = computeGameStats7d(logs);

      // Charts
      renderCharts(series, paStats, cardStats, gameStats);

      // Weekly tips
      const tips = computeWeeklyTips(kpis, tagStats, last);
      renderWeeklyTips(tips);

      // Buttons: Export CSV / PDF
      const btnCSV = document.getElementById('btnExportCSV');
      if (btnCSV){ btnCSV.onclick = () => exportCSV(logs); }
      const btnPDF = document.getElementById('btnExportPDF');
      if (btnPDF){ btnPDF.onclick = () => exportSnapshotPDF(kpis, series, tagStats, paStats, cardStats, gameStats); }

      // Sync status & Voice UI
      if (window.App && typeof App.updateSyncStatus==='function') App.updateSyncStatus();
      if (window.VoiceUI && typeof VoiceUI.attachAll==='function') VoiceUI.attachAll?.();

      // Keep state for redraw
      this.__state = { series, paStats, cardStats, gameStats };
      attachResizeRedraw(this.__state);
    },

    // Tùy chọn: smoke test dữ liệu mẫu cho kiểm thử chấp nhận
    runAcceptanceSmokeTest(){
      const now = Date.now();
      const mk = (offset, type, extra={}) => ({ ts: now - offset*DAY_MS, type, durationMs: 1000*(60+Math.floor(Math.random()*120)), ...extra });

      const sampleLogs = [];
      for (let i=14;i>=0;i--){
        sampleLogs.push(mk(i,'reading',{ wcpm: 40+Math.random()*80, accuracy: 0.85+Math.random()*0.12, errorsByType: {tone:Math.floor(Math.random()*3), sx:Math.floor(Math.random()*2), chtr:Math.floor(Math.random()*2)} }));
        sampleLogs.push(mk(i,'pa',{ correct: Math.random()>0.2, tag: (Math.random()>0.5?'tone':'sx'), rtMs: 600+Math.random()*400 }));
        sampleLogs.push(mk(i,'cards',{ q: [1,3,5][Math.floor(Math.random()*3)], tags: ['sx'], cardId: 'c'+i }));
        sampleLogs.push(mk(i,'game',{ accuracy: 0.6+Math.random()*0.35, listensPerHit: 1+Math.random()*1.5, bestCombo: Math.floor(2+Math.random()*10), mode:'tag', targetTag:'sx' }));
      }
      window.AppState = window.AppState || {};
      window.AppState.logs = sampleLogs;
      window.AppState.cardState = {
        c1:{ interval: 15, due: now - 1000 }, c2:{ interval: 2, due: now + 1000 }, c3:{ interval: 30, due: now-2000 }
      };
      this.render();
      console.log('Smoke test OK: Biểu đồ, gợi ý, export có thể kiểm tra thủ công.');
    }
  };

  // Giữ tương thích API cũ (nếu code khác gọi)
  // MODULE: DASHBOARD (alias)
  window.Dashboard = window.Dashboard || window.DashboardModule;

})();
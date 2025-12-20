/* MODULE: DASHBOARD */
(function(){
  'use strict';

  const TAGS = ['tone','sx','chtr','nl','ngngh','ckqu','ghg','omission','insertion','other'];
  const TAG_LABEL = { tone:'tone', sx:'s/x', chtr:'ch/tr', nl:'n/l', ngngh:'ng/ngh', ckqu:'c/k/qu', ghg:'g/gh', omission:'bỏ', insertion:'thêm', other:'khác' };

  function nfc(s){ try{ return String(s||'').normalize('NFC'); }catch(_){ return String(s||''); } }
  function asDay(ts){ const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
  function fmtDate(ts){ return new Date(ts).toLocaleDateString(); }
  function sum(a){ return a.reduce((x,y)=> x+(+y||0), 0); }
  function avg(a){ return a.length? (sum(a)/a.length) : 0; }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  const now = ()=> Date.now();

  /* vẽ biểu đồ: dùng hàm charts.js nếu có, fallback nhẹ */
  function drawLine(el, labels, series, color, label){
    if (!el) return;
    if (window.drawLineChart) return drawLineChart(el, labels, series, color, label);
    // fallback tối giản
    const ctx = el.getContext && el.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0,0,el.width,el.height);
    ctx.fillStyle = '#666'; ctx.fillText(label||'', 6, 14);
  }
  function drawBar(el, labels, series, color, label){
    if (!el) return;
    if (window.drawBarChart) return drawBarChart(el, labels, series, color, label);
    const ctx = el.getContext && el.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0,0,el.width,el.height);
    ctx.fillStyle = '#666'; ctx.fillText(label||'', 6, 14);
  }
  function drawStacked(el, labels, datasets, palette, label){
    if (!el) return;
    if (window.drawStackedBarChart) return drawStackedBarChart(el, labels, datasets, palette, label);
    // fallback: tổng lỗi (không stacked)
    const totals = labels.map((_,i)=> datasets.reduce((acc,ds)=> acc + (+ds.data[i]||0),0));
    drawBar(el, labels, totals, '#C62828', label||'Lỗi');
  }

  function ensureKPIBar(){
    const scr = document.getElementById('screen-dashboard'); if (!scr) return null;
    let box = scr.querySelector('#dashKPI'); if (box) return box;
    box = document.createElement('div');
    box.className = 'section lift';
    box.id = 'dashKPI';
    box.innerHTML = `
      <div class="row" style="gap:10px; flex-wrap:wrap;">
        <span class="stat">⏱️ Hôm nay: <b id="kpiToday">—</b></span>
        <span class="stat">🗓️ Tuần: <b id="kpiWeek">—</b></span>
        <span class="stat">⚡ WCPM gần nhất: <b id="kpiWCPM">—</b></span>
        <span class="stat">🎯 % đúng TB: <b id="kpiACC">—</b></span>
        <span class="stat">🧠 “Đã vững”: <b id="kpiMastered">—</b></span>
        <span class="stat">🚩 Tag “đỏ”: <b id="kpiRed">—</b></span>
        <div class="spacer"></div>
        <button class="ghost" id="btnExportCSV">CSV</button>
        <button class="ghost" id="btnSnapshotPDF">Snapshot PDF</button>
      </div>
      <div class="row" style="margin-top:6px;">
        <div class="help" id="weekHint">Gợi ý tuần này: —</div>
      </div>
    `;
    // chèn ngay trước grid biểu đồ
    const grid = scr.querySelector('.grid-2');
    scr.insertBefore(box, grid||scr.firstChild);
    // gắn export
    box.querySelector('#btnExportCSV').onclick = ()=> {
      try{ window.App?.exportCSV ? App.exportCSV() : (window.Report?.exportCSV && Report.exportCSV()); }catch(_){}
    };
    box.querySelector('#btnSnapshotPDF').onclick = ()=> {
      try{ window.Report?.exportPDF ? Report.exportPDF() : alert('Chưa có module Report.exportPDF'); }catch(_){}
    };
    return box;
  }

  function msToHMS(ms){
    const s = Math.round(ms/1000);
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
    return (h? (h+'h '):'') + (m? (m+'m '):'') + (ss+'s');
  }

  function computeDurations(allLogs, startTs, endTs){
    const pick = l=> (l.type==='reading' ? (l.durationMs||0)
                     : l.type==='cards_round' ? ((l.durationSec||0)*1000)
                     : l.type==='game_round' ? ((l.durationSec||0)*1000)
                     : 0);
    return allLogs.filter(l=> l.ts>=startTs && l.ts<endTs).reduce((acc,l)=> acc + pick(l), 0);
  }

  function getCardMastered(){
    try{
      const deck = (window.AppState?.cardDeck) || {};
      let m = 0; for (const id in deck){ if ((deck[id]?.interval||0) >= 14) m++; }
      return m;
    }catch(_){ return 0; }
  }

  function getWeakTag(last7){
    // tính % đúng theo tag từ PA và Reading (errorsByType)
    const accByTag = {};
    // PA: mỗi pa_trial có fields: tags (mảng) & correct (bool)
    last7.filter(x=> x.type==='pa_trial').forEach(r=>{
      const tag = (r.tags&&r.tags[0]) || 'misc';
      if (!accByTag[tag]) accByTag[tag] = {n:0,cr:0};
      accByTag[tag].n++; if (r.correct) accByTag[tag].cr++;
    });
    // Reading: từ errorsByType ước lượng đúng/sai theo tag (chỉ cộng sai)
    last7.filter(x=> x.type==='reading').forEach(r=>{
      const e = r.errorsByType || {};
      Object.keys(e).forEach(tag=>{
        if (!accByTag[tag]) accByTag[tag] = {n:0,cr:0};
        // xem như mỗi lỗi = 1 sai trên mẫu; tăng n mà không tăng cr
        accByTag[tag].n += e[tag];
      });
    });
    // chọn tag có acc thấp và đủ cỡ mẫu
    let weak = null, minAcc = 2;
    Object.entries(accByTag).forEach(([tag, v])=>{
      if (v.n >= 8){
        const acc = v.cr / v.n;
        if (acc < minAcc){ minAcc = acc; weak = tag; }
      }
    });
    return weak ? { tag: weak, acc: Math.round(minAcc*100) } : null;
  }

  function suggestionForWeek(data){
    const last7 = data.last7;
    const weak = getWeakTag(last7);
    // gợi ý tốc độ TTS/độ dài đoạn theo WCPM/Accuracy
    const read7 = last7.filter(x=> x.type==='reading');
    const avgW = Math.round(avg(read7.map(x=> x.wcpm||0)));
    const avgA = Math.round(avg(read7.map(x=> (x.accuracy||0)*100)));
    let tts = 0.9;
    if (avgW && avgW < 60) tts = 0.85;
    else if (avgW < 90) tts = 0.9;
    else tts = 0.95;
    const len = (avgA<90 || avgW<60) ? 'đoạn ngắn (50–80 tiếng)' : 'đoạn vừa (80–120 tiếng)';

    const plan = weak
      ? `Tag yếu: ${TAG_LABEL[weak.tag]||weak.tag} (${weak.acc}%). Luyện PA 10 mục + Cards 15 thẻ/ngày.`
      : `Duy trì nhịp: PA 6–8 mục + Cards 10–12 thẻ/ngày.`;

    return { text: `${plan} Gợi ý TTS: ${tts.toFixed(2)}×; ưu tiên ${len}.`, tts, len, weak };
  }

  function buildDailySeries(logs, days){
    // days: sorted list of day timestamps
    const lbl = days.map(fmtDate);
    // Reading WCPM/ACC/DUR
    const mapDay = new Map(days.map(d=> [d, []]));
    logs.filter(l=> l.type==='reading').forEach(l=>{
      const d = asDay(l.ts); if (!mapDay.has(d)) mapDay.set(d, []);
      mapDay.get(d).push(l);
    });
    const wc = days.map(d=> { const arr=mapDay.get(d)||[]; return arr.length? Math.round(avg(arr.map(x=> x.wcpm||0))) : 0; });
    const ac = days.map(d=> { const arr=mapDay.get(d)||[]; return arr.length? Math.round(avg(arr.map(x=> (x.accuracy||0)*100))) : 0; });
    const du = days.map(d=> { const arr=mapDay.get(d)||[]; return Math.round(sum(arr.map(x=> (x.durationMs||0)))/1000); });

    // lỗi theo tag (stacked)
    const errByDayTag = {}; // key day -> tag -> count
    days.forEach(d=> errByDayTag[d] = {});
    logs.filter(l=> l.type==='reading').forEach(l=>{
      const e = l.errorsByType||{}; const d=asDay(l.ts);
      TAGS.forEach(t=> { errByDayTag[d][t] = (errByDayTag[d][t]||0) + (e[t]||0); });
    });

    const stacked = TAGS.map((t,idx)=> ({
      label: TAG_LABEL[t]||t,
      color: STACK_COLORS[idx%STACK_COLORS.length],
      data: days.map(d=> errByDayTag[d][t]||0)
    }));

    // số phiên từng mô-đun theo ngày
    const countByType = type => days.map(d=> logs.filter(l=> l.type===type && asDay(l.ts)===d).length);
    const sessRead = countByType('reading');
    const sessPA   = days.map(d=> logs.filter(l=> l.type==='pa_trial' && asDay(l.ts)===d).length? 1:0); // ước lượng: có pa_trial trong ngày => 1 phiên
    const sessCards= days.map(d=> logs.filter(l=> l.type==='cards_review' && asDay(l.ts)===d).length
                                  + logs.filter(l=> l.type==='cards_round' && asDay(l.ts)===d).length);
    const sessGame = countByType('game_round');

    return { labels: lbl, wc, ac, du, stacked, sess: { reading: sessRead, pa: sessPA, cards: sessCards, game: sessGame } };
  }

  const STACK_COLORS = ['#C62828','#EF6C00','#8E24AA','#1565C0','#2E7D32','#6D4C41','#00838F','#5D4037','#7B1FA2','#616161'];

  function computeKPIs(allLogs){
    const today0 = (d=> (d.setHours(0,0,0,0), d))(new Date()).getTime();
    const week0  = today0 - 6*24*3600*1000;
    // thời lượng
    const durToday = computeDurations(allLogs, today0, today0 + 24*3600*1000);
    const durWeek  = computeDurations(allLogs, week0, today0 + 24*3600*1000);
    // Reading gần nhất
    const rLogs = allLogs.filter(l=> l.type==='reading').sort((a,b)=> a.ts-b.ts);
    const last = rLogs[rLogs.length-1];
    const lastW = last ? (last.wcpm||0) : 0;
    const accAvg = Math.round(avg(rLogs.map(x=> (x.accuracy||0)*100)));
    const mastered = getCardMastered();
    // Tag “đỏ” 7 ngày
    const last7 = allLogs.filter(l=> l.ts >= week0 && l.ts <= (today0 + 24*3600*1000));
    const weak = getWeakTag(last7);
    return {
      durTodayMs: durToday, durWeekMs: durWeek,
      lastWCPM: lastW, avgAcc: accAvg,
      mastered, weak, last7
    };
  }

  function renderKPIs(kpi){
    ensureKPIBar();
    const set = (id, val)=> { const el=document.getElementById(id); if (el) el.textContent = val; };
    set('kpiToday', msToHMS(kpi.durTodayMs));
    set('kpiWeek',  msToHMS(kpi.durWeekMs));
    set('kpiWCPM',  kpi.lastWCPM ? (kpi.lastWCPM+' wpm') : '—');
    set('kpiACC',   Number.isFinite(kpi.avgAcc) ? (kpi.avgAcc+'%') : '—');
    set('kpiMastered', kpi.mastered);
    set('kpiRed',   kpi.weak ? (TAG_LABEL[kpi.weak.tag]||kpi.weak.tag) : '—');
    const sug = suggestionForWeek({ last7: kpi.last7 });
    const hint = document.getElementById('weekHint'); if (hint) hint.textContent = 'Gợi ý tuần này: ' + sug.text;
  }

  function renderCharts(allLogs){
    // Dải ngày 14 gần nhất để biểu đồ có ý nghĩa
    const days = [];
    const today0 = (d=> (d.setHours(0,0,0,0), d))(new Date()).getTime();
    for (let i=13;i>=0;i--) days.push(today0 - i*24*3600*1000);
    const ds = buildDailySeries(allLogs, days);

    // 1) WCPM & 2) Accuracy
    drawLine(document.getElementById('chartWCPM'), ds.labels, ds.wc, '#2E7D32', 'WCPM');
    drawLine(document.getElementById('chartACC'), ds.labels, ds.ac, '#6A1B9A', '% đúng');

    // 3) Lỗi theo tag (stacked)
    drawStacked(document.getElementById('chartERR'), ds.labels, ds.stacked, STACK_COLORS, 'Lỗi theo tag');

    // 4) Thời lượng & số phiên (dùng cùng canvas – vẽ hai đường, đơn vị phút & phiên)
    const durMin = ds.du.map(x=> Math.round((x||0)/60));
    // nếu có drawComboChart thì dùng, không thì chồng 2 line
    if (window.drawComboChart) drawComboChart(document.getElementById('chartDUR'), ds.labels,
      [{label:'Phút đọc', data:durMin, color:'#1565C0'},{label:'Phiên đọc', data:ds.sess.reading, color:'#EF6C00'}],
      'Thời lượng & số phiên');
    else {
      drawLine(document.getElementById('chartDUR'), ds.labels, durMin, '#1565C0', 'Phút đọc (line 1)');
      // vẽ lần 2 (overlay) – nhiều lib hỗ trợ; fallback sẽ chỉ ghi nhãn
      drawLine(document.getElementById('chartDUR'), ds.labels, ds.sess.reading, '#EF6C00', 'Phiên (line 2)');
    }

    // PA block: % đúng theo ngày (pa_trial)
    const byDayPA = new Map(days.map(d=> [d,{n:0,cr:0}]));
    allLogs.filter(l=> l.type==='pa_trial').forEach(l=>{
      const d=asDay(l.ts); const o=byDayPA.get(d) || {n:0,cr:0}; o.n++; if (l.correct) o.cr++; byDayPA.set(d,o);
    });
    const paAcc = days.map(d=> { const o=byDayPA.get(d)||{n:0,cr:0}; return o.n? Math.round(100*o.cr/o.n) : 0; });
    drawLine(document.getElementById('chartPA'), ds.labels, paAcc, '#00897B', 'PA % đúng');

    // Cards block: Mastered (I≥14d) theo ngày (ảnh nhanh: đường bậc thang)
    const masteredDaily = days.map(d=>{
      const deck = window.AppState?.cardDeck || {}; let m=0;
      for (const id in deck){ if ((deck[id]?.interval||0)>=14) m++; } return m;
    });
    drawLine(document.getElementById('chartDEC'), ds.labels, masteredDaily, '#6D4C41', 'Cards: số “đã vững”');

    // Game block: accuracy theo ngày (nếu có)
    const byDayGame = new Map(days.map(d=> [d,{n:0,cr:0}]));
    allLogs.filter(l=> l.type==='game_round').forEach(l=>{
      const d=asDay(l.ts); const o=byDayGame.get(d)||{n:0,cr:0}; // l.accuracy là % hoặc 0–1; chuẩn hóa
      const acc = (typeof l.accPct!=='undefined') ? (l.accPct/100) : (l.accuracy||0);
      if (!isNaN(acc)){ o.n++; o.cr += acc; } byDayGame.set(d,o);
    });
    const gameAcc = days.map(d=> { const o=byDayGame.get(d)||{n:0,cr:0}; return o.n? Math.round(100*o.cr/o.n) : 0; });
    drawLine(document.getElementById('chartSIGHT'), ds.labels, gameAcc, '#7B1FA2', 'Game % đúng');
  }

  function getAllLogs(){
    try{
      const arr = Array.isArray(window.AppState?.logs) ? window.AppState.logs.slice() : [];
      // Fallback: nếu không có logs, tạo mẫu giả để kiểm thử chấp nhận
      if (!arr.length){
        const t0 = now() - 13*24*3600*1000;
        for (let i=0;i<14;i++){
          const ts = t0 + i*24*3600*1000 + 3600*1000;
          arr.push({type:'reading', ts, wcpm: 40+i*2, accuracy: clamp(0.85 + i*0.003,0.85,0.98), durationMs: 90*1000 + i*2000, errorsByType:{tone:Math.max(0,5-i), sx:(i%2), chtr:(i%3)}});
          if (i%2===0) arr.push({type:'pa_trial', ts: ts+2000, tags:['tone'], correct: i%3!==0});
          if (i%3===0) arr.push({type:'cards_round', ts: ts+4000, durationSec:60, score: 120+i*5});
          if (i%4===0) arr.push({type:'game_round', ts: ts+6000, durationSec:60, accPct: 60+i});
        }
      }
      return arr.sort((a,b)=> a.ts-b.ts);
    }catch(_){ return []; }
  }

  function updateSyncStatus(){
    try{ window.App?.updateSyncStatus && App.updateSyncStatus(); }catch(_){}
  }

  window.DashboardModule = {
    render(){
      const logs = getAllLogs();

      // KPIs
      const kpi = computeKPIs(logs);
      renderKPIs(kpi);

      // Charts
      renderCharts(logs);

      // Xuất/Sync + Voice UI
      updateSyncStatus();
      try{ window.VoiceUI?.attachAll && VoiceUI.attachAll(); }catch(_){}
    }
  };
})();
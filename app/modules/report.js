/* MODULE: REPORT – Evaluation Summary (PDF/CSV)
   Theo tinh thần IDA: Evaluation ≠ Diagnosis (tóm tắt nội bộ cho phụ huynh/giáo viên/SLP). */
window.Report = {
  exportCSV(){
    const S = this.buildSummary();
    const row = [
      'LearnerID','Name','Date',
      'PA_Avg_%','RAN_Avg_s','Dec_Avg_%','Sight_Avg_%',
      'Read_WCPM_Avg','Read_ACC_Avg_%','Read_WCPM_Best',
      'Read_Sessions','Read_Duration_Min',
      'Err_Tone','Err_SX','Err_CHTR','Err_Omission','Err_Insertion','Err_Other'
    ];
    const vals = [
      S.learnerId, S.name||'',
      this.fmtISO(S.now),
      this.safeNumPct(S.paAvg), this.safeNum(S.ranAvg),
      this.safeNumPct(S.decAvg), this.safeNumPct(S.sightAvg),
      this.safeNum(S.read.wcpmAvg), this.safeNumPct(S.read.accAvg),
      this.safeNum(S.read.wcpmBest),
      S.read.count,
      Math.round((S.read.durMs||0)/60000),
      S.read.err.tone, S.read.err.sx, S.read.err.chtr, S.read.err.omission, S.read.err.insertion, S.read.err.other
    ];
    const csv = [row.join(','), vals.join(',')].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `evaluation_summary_${S.learnerId||'unknown'}_${this.fmtYMD(S.now)}.csv`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  },

  exportPDF(){
    const S = this.buildSummary();
    const html = this.buildHTML(S);
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { alert('Trình duyệt chặn cửa sổ. Hãy cho phép mở cửa sổ mới.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // chờ render rồi gợi ý In → Lưu PDF
    setTimeout(()=>{ try{ w.print(); }catch(_){ } }, 500);
  },

  buildSummary(){
    const now = window.__now ? window.__now() : Date.now();
    const learnerId = (window.AppState?.learner?.sysId) || '';
    const name = (window.AppState?.learner?.name) || '';
    const logs = Array.isArray(window.AppState?.logs) ? window.AppState.logs : [];

    // Screeners
    const SLogs = logs.filter(x=>x?.type==='screen').sort((a,b)=>(a.ts||0)-(b.ts||0));
    const paArr = SLogs.map(x=> (typeof x.paAcc==='number') ? x.paAcc : null).filter(v=>v!=null);
    const ranArr = SLogs.map(x=> (typeof x.ranSec==='number') ? x.ranSec : null).filter(v=>v!=null);
    const decArr = SLogs.map(x=> (typeof x.decAcc==='number') ? x.decAcc : null).filter(v=>v!=null);
    const sightArr = SLogs.map(x=> (typeof x.sightAcc==='number') ? x.sightAcc : null).filter(v=>v!=null);
    const avg = arr => arr.length? (arr.reduce((a,b)=>a+b,0)/arr.length) : null;

    // Reading
    const R = logs.filter(x=>x?.type==='reading');
    const count = R.length;
    const lastN = R.slice(-5);
    const wcpmAvg = lastN.length ? Math.round(lastN.reduce((a,b)=>a+(b.wcpm||0),0)/lastN.length) : null;
    const accAvg = lastN.length ? (lastN.reduce((a,b)=>a+(b.accuracy||0),0)/lastN.length) : null;
    const wcpmBest = R.length ? Math.max.apply(null, R.map(x=>x.wcpm||0)) : null;
    const durMs = R.reduce((s,x)=> s + (x.durationMs||0), 0);
    const err = { tone:0, sx:0, chtr:0, omission:0, insertion:0, other:0 };
    R.forEach(x=>{
      const e = x.errorsByType||{};
      err.tone += e.tone||0; err.sx += e.sx||0; err.chtr += e.chtr||0;
      err.omission += e.omission||0; err.insertion += e.insertion||0; err.other += e.other||0;
    });

    return {
      now, learnerId, name,
      paAvg: avg(paArr), ranAvg: avg(ranArr), decAvg: avg(decArr), sightAvg: avg(sightArr),
      read: { wcpmAvg, accAvg, wcpmBest, count, durMs, err }
    };
  },

  buildHTML(S){
    const safe = x => (x==null? '—' : x);
    const pct = x => (x==null ? '—' : `${Math.round(x*100)}%`);
    const num = x => (x==null ? '—' : String(x));
    const mins = Math.round((S.read.durMs||0)/60000);

    // gợi ý nhận định (không chẩn đoán)
    const flags = [];
    if (S.paAvg!=null && S.paAvg<0.75) flags.push('PA thấp (cần tăng nhận thức âm vị)');
    if (S.ranAvg!=null && S.ranAvg>80) flags.push('RAN chậm (tự động hoá kém)');
    if (S.read.accAvg!=null && S.read.accAvg<0.9) flags.push('Độ chính xác đọc thấp (< 90%)');
    const doubleFlag = (S.paAvg!=null && S.paAvg<0.75) && (S.ranAvg!=null && S.ranAvg>80);

    const styles = `
      <style>
        body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#222; margin:20px; }
        h1{ font-size:20px; margin:0 0 8px; }
        h2{ font-size:16px; margin:16px 0 6px; }
        .muted{ color:#666; font-size:12px; }
        table{ border-collapse: collapse; width:100%; margin:6px 0 14px; }
        td,th{ border:1px solid #ddd; padding:6px 8px; text-align:left; }
        .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        .note{ padding:8px; background:#FAFAE6; border:1px solid #EEE5B5; border-radius:6px; }
        .warn{ color:#b45309; }
        @media print{
          .no-print{ display:none; }
          body{ margin:10mm; }
        }
      </style>
    `;

    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Evaluation Summary</title>${styles}</head><body>
  <div class="no-print" style="text-align:right; margin-bottom:10px;">
    <button onclick="window.print()">In / Lưu PDF</button>
  </div>

  <h1>Evaluation Summary (tóm tắt đánh giá)</h1>
  <div class="muted">Theo IDA: Evaluation ≠ Diagnosis — đây là tóm tắt học thuật nội bộ phục vụ dạy học & phối hợp nhà trường/SLP.</div>

  <h2>1) Thông tin chung</h2>
  <table>
    <tr><th>Mã học viên</th><td>${S.learnerId || '—'}</td></tr>
    <tr><th>Họ tên (nếu có)</th><td>${S.name || '—'}</td></tr>
    <tr><th>Ngày lập</th><td>${this.fmtLong(S.now)}</td></tr>
  </table>

  <h2>2) Đánh giá nhanh (screeners)</h2>
  <div class="grid">
    <table>
      <tr><th colspan="2">PA – Nhận thức âm vị</th></tr>
      <tr><td>Trung bình</td><td>${pct(S.paAvg)}</td></tr>
    </table>
    <table>
      <tr><th colspan="2">RAN – Gọi nhanh (50 mục)</th></tr>
      <tr><td>Trung bình</td><td>${num(Math.round(S.ranAvg||0))} s</td></tr>
    </table>
    <table>
      <tr><th colspan="2">Decoding – Giả từ</th></tr>
      <tr><td>Trung bình</td><td>${pct(S.decAvg)}</td></tr>
    </table>
    <table>
      <tr><th colspan="2">Sight Words – Từ chức năng</th></tr>
      <tr><td>Trung bình</td><td>${pct(S.sightAvg)}</td></tr>
    </table>
  </div>

  <h2>3) Luyện đọc (5 phiên gần nhất)</h2>
  <table>
    <tr><th>WCPM (TB)</th><td>${num(S.read.wcpmAvg)}</td></tr>
    <tr><th>% đúng (TB)</th><td>${pct(S.read.accAvg)}</td></tr>
    <tr><th>WCPM (tốt nhất)</th><td>${num(S.read.wcpmBest)}</td></tr>
    <tr><th>Số phiên</th><td>${S.read.count}</td></tr>
    <tr><th>Tổng thời lượng</th><td>${mins} phút</td></tr>
  </table>

  <h2>4) Lỗi theo loại (tổng cộng)</h2>
  <table>
    <tr><th>Sai thanh</th><td>${S.read.err.tone}</td></tr>
    <tr><th>Nhầm s/x</th><td>${S.read.err.sx}</td></tr>
    <tr><th>Nhầm ch/tr</th><td>${S.read.err.chtr}</td></tr>
    <tr><th>Bỏ âm/từ</th><td>${S.read.err.omission}</td></tr>
    <tr><th>Thêm âm/từ</th><td>${S.read.err.insertion}</td></tr>
    <tr><th>Khác</th><td>${S.read.err.other}</td></tr>
  </table>

  <h2>5) Nhận định & khuyến nghị (không phải chẩn đoán)</h2>
  <div class="note">
    <div><b>Gợi ý:</b> ${
      (flags.length? flags.join('; ') : 'Không có dấu hiệu nổi bật.') +
      (doubleFlag? ' — Có thể thuộc nhóm “double‑deficit” (PA thấp + RAN chậm); nên tăng cường PA và tự động hoá.' : '')
    }</div>
    <ul>
      <li>Ưu tiên Structured Literacy: dạy rõ – tuần tự – lũy tiến; chống đoán mò, phân tích âm–chữ.</li>
      <li>Nếu % đúng < 90%: giữ cấp, tăng luyện PA/decoding (giả từ), sight words; sau đó mới tăng tốc độ.</li>
      <li>Tăng nhận thức âm vị (tách/gộp/đổi vị trí âm), luyện grapheme đa chữ (gh/ngh/qu/ch/tr…)</li>
      <li>Áp dụng hỗ trợ: Spotlight 3–5 từ, con trỏ 1 dòng, Echo Reading khi cần, Pacer WPM thấp.</li>
    </ul>
    <div class="muted">Ghi chú: Tài liệu này nhằm phối hợp dạy học; để chẩn đoán chính thức cần đánh giá chuyên môn độc lập (SLP/psychologist).</div>
  </div>

  <div class="muted" style="margin-top:10px;">
    Nguồn định hướng: IDA Dyslexia Handbook (2019) – Structured Literacy; Evaluation ≠ Diagnosis.
  </div>
</body></html>
    `;
  },

  fmtYMD(ts){
    const d = new Date(ts||Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}${m}${dd}`;
  },
  fmtISO(ts){
    const d = new Date(ts||Date.now());
    return d.toISOString();
  },
  fmtLong(ts){
    const d = new Date(ts||Date.now());
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const y = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${y} ${hh}:${mi}`;
  },
  safeNum(x){ return (x==null? '' : x); },
  safeNumPct(x){ return (x==null? '' : Math.round(x*100)); }
};
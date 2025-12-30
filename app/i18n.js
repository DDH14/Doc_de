/* app/i18n.js – Chuẩn hoá thuật ngữ & i18n tối giản (mặc định tiếng Việt) */
(function(){
  'use strict';

  const I18N = {
    locale: 'vi',
    dict: {
      vi: {
        // Khoá theo chuẩn key
        'pa.tab.segment': 'Ghép mảnh',
        'pa.tab.tone': 'Thanh điệu',
        'pa.tab.pair': 'Cặp tối thiểu',
        'nav.home': 'Trang chính',
        'nav.assess': 'Đánh giá nhanh',
        'nav.pa': 'Âm vị',
        'nav.cards': 'Thẻ từ',
        'nav.reading': 'Luyện đọc',
        'nav.game': 'Trò chơi',
        'nav.dashboard': 'Bảng điều khiển',
        'btn.start': 'Bắt đầu',
        'btn.stop': 'Kết thúc',
        'btn.next': 'Tiếp tục',
        'btn.back': 'Quay lại',
        'btn.shuffle': 'Đổi lưới',
        'btn.listen': 'Nghe',
        'btn.slow': 'Nghe chậm',
        'label.accuracy': '% chính xác',
        'label.wcpm': 'WCPM',
        'label.score': 'Điểm',
        'label.streak': 'Chuỗi',
        'label.mastered': 'Đã vững',
        'label.due': 'Đến hạn',
        'label.duration': 'Thời lượng',
        'label.lives': 'Mạng',
        'label.train': 'Tập thử',
        'export.title': 'Xuất dữ liệu',
        'export.eval': 'Tóm tắt đánh giá',
      }
    },

    // Thay thế theo từ điển thuật ngữ (vòng ngoài – cho DOM hiện có)
    termsMap: [
      // [regex, replacement]
      [/\bSegment\b/g, 'Ghép mảnh'],
      [/\bTone\b/g, 'Thanh điệu'],
      [/\bPair\b/g, 'Cặp tối thiểu'],
      [/\bCards\b/g, 'Thẻ từ'],
      [/\bReading\b/g, 'Luyện đọc'],
      [/\bGame\b/g, 'Trò chơi'],
      [/\bDashboard\b/g, 'Bảng điều khiển'],
      [/\bSettings\b/g, 'Cài đặt'],
      [/\bExport\b/g, 'Xuất dữ liệu'],
      [/\bHelp\b/g, 'Hướng dẫn'],
      [/\bStart\b/g, 'Bắt đầu'],
      [/\bStop\b/g, 'Kết thúc'],
      [/\bNext\b/g, 'Tiếp tục'],
      [/\bBack\b/g, 'Quay lại'],
      [/\bShuffle\b/g, 'Đổi lưới'],
      [/\bAccuracy\b/g, '% chính xác'],
      [/\bScore\b/g, 'Điểm'],
      [/\bStreak\b/g, 'Chuỗi'],
      [/\bMastered\b/g, 'Đã vững'],
      [/\bDue\b/g, 'Đến hạn'],
      [/\bDuration\b/g, 'Thời lượng'],
      [/\bLives\b/g, 'Mạng'],
      [/\bTrain\b/g, 'Tập thử'],
      // Một số caption export/điều khiển
      [/Evaluation Summary/gi, 'Tóm tắt đánh giá'],
      [/Snapshot/gi, 'Tóm tắt'],
    ],

    t(key, vars){
      const s = (I18N.dict[I18N.locale]||{})[key] || key;
      if (!vars) return s;
      return s.replace(/\{(\w+)\}/g, (_,k)=> (vars[k] ?? ''));
    },

    // Áp dụng theo data-i18n="key"
    applyDataAttrs(root=document){
      const nodes = root.querySelectorAll('[data-i18n]');
      nodes.forEach(el=>{
        const key = el.getAttribute('data-i18n');
        const txt = I18N.t(key);
        if (txt && txt !== key){
          if ('value' in el && (el.tagName==='INPUT' || el.tagName==='BUTTON')) el.value = txt;
          else el.textContent = txt;
        }
      });
      // Thuộc tính
      root.querySelectorAll('[data-i18n-title]').forEach(el=> el.title = I18N.t(el.getAttribute('data-i18n-title')));
      root.querySelectorAll('[data-i18n-aria]').forEach(el=> el.setAttribute('aria-label', I18N.t(el.getAttribute('data-i18n-aria'))));
      root.querySelectorAll('[data-i18n-ph]').forEach(el=> el.setAttribute('placeholder', I18N.t(el.getAttribute('data-i18n-ph'))));
    },

    // Quét DOM và thay thế chuỗi tiếng Anh rơi rớt theo termsMap
    scanAndReplace(root=document){
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node){ 
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          const s = node.nodeValue.trim();
          if (!s) return NodeFilter.FILTER_REJECT;
          // bỏ qua code/Script/Style (text node trong các tag này ít khi đi qua)
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const toUpdate = [];
      let n; while ((n = walker.nextNode())) toUpdate.push(n);
      toUpdate.forEach(node=>{
        let text = node.nodeValue;
        I18N.termsMap.forEach(([re, rep])=> text = text.replace(re, rep));
        if (text !== node.nodeValue) node.nodeValue = text;
      });

      // Thuộc tính phổ biến
      const attrs = ['title','aria-label','placeholder','value'];
      attrs.forEach(attr=>{
        const els = root.querySelectorAll('['+attr+']');
        els.forEach(el=>{
          const val = el.getAttribute(attr);
          if (!val) return;
          let nv = val;
          I18N.termsMap.forEach(([re, rep])=> nv = nv.replace(re, rep));
          if (nv!==val) el.setAttribute(attr, nv);
        });
      });
    },

    // Chế độ kiểm tra: báo xem còn chuỗi tiếng Anh nào sót không
    devReport(root=document){
      const EN = /\b(Start|Stop|Next|Back|Segment|Tone|Pair|Cards|Reading|Game|Dashboard|Settings|Export|Help|Accuracy|Score|Streak|Mastered|Due|Duration|Lives|Train|Evaluation)\b/;
      const offenders = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n; while ((n=walker.nextNode())){
        const s = (n.nodeValue||'').trim();
        if (s && EN.test(s)) offenders.push(s);
      }
      if (offenders.length) console.warn('[i18n] Chuỗi nghi ngờ còn tiếng Anh:', Array.from(new Set(offenders)));
    },

    apply(root=document){
      I18N.applyDataAttrs(root);
      I18N.scanAndReplace(root);
    },
    setLocale(loc){ I18N.locale = loc||'vi'; I18N.apply(document); }
  };

  // Xuất global
  window.I18N = I18N;

  function init(){
    I18N.apply(document);
    // Áp dụng lại sau mỗi lần điều hướng trong SPA
    if (window.App?.nav && !App._i18nPatched){
      const orig = App.nav.bind(App);
      App.nav = function(scr){
        const r = orig(scr);
        setTimeout(()=> I18N.apply(document), 60);
        return r;
      };
      App._i18nPatched = true;
    }
    // Sau khi dashboard render xong
    const hook = window.DashboardModule?.render;
    if (hook && !window._dashI18n){
      window.DashboardModule.render = function(){
        hook.apply(DashboardModule, arguments);
        setTimeout(()=> I18N.apply(document), 0);
      };
      window._dashI18n = true;
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
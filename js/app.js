/* 星语 · app - 星空版 */
(function () {
  var doc = document;
  var D = window.TreeHoleData;
  var DB = window.TreeHoleDB;

  // ========== Canvas 星空背景 ==========
  var canvas = doc.getElementById('sky-canvas');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var W = 0, H = 0, dpr = 1;
  var stars = [], bigStars = [];

  function genSky() {
    stars = []; bigStars = [];
    for (var i = 0; i < 280; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.1 + 0.3,
        a: Math.random() * 0.6 + 0.3,
        ph: Math.random() * 6.28,
        sp: Math.random() * 0.8 + 0.4,
        blue: Math.random() < 0.15
      });
    }
    for (var j = 0; j < 12; j++) {
      bigStars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2 + 1.5,
        ph: Math.random() * 6.28,
        sp: Math.random() * 0.6 + 0.3
      });
    }
  }

  function resizeSky() {
    if (!canvas) return;
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    genSky();
  }

  var frame = 0;
  function drawSky() {
    if (!ctx) return;
    frame++;
    ctx.clearRect(0, 0, W, H);

    // 螺旋光带（紫色·左上）
    var g1 = ctx.createRadialGradient(W*0.35, H*0.45, 0, W*0.35, H*0.45, Math.max(W,H)*0.55);
    g1.addColorStop(0, 'rgba(180,140,255,0.22)');
    g1.addColorStop(0.4, 'rgba(140,100,220,0.09)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);

    // 蓝色副光带（中间）
    var g2 = ctx.createRadialGradient(W*0.62, H*0.55, 0, W*0.62, H*0.55, Math.max(W,H)*0.48);
    g2.addColorStop(0, 'rgba(100,160,255,0.16)');
    g2.addColorStop(0.5, 'rgba(70,120,220,0.06)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fillRect(0,0,W,H);

    // 右下紫色浓云
    var g3 = ctx.createRadialGradient(W*0.8, H*0.82, 0, W*0.8, H*0.82, Math.max(W,H)*0.38);
    g3.addColorStop(0, 'rgba(120,70,200,0.18)');
    g3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g3; ctx.fillRect(0,0,W,H);

    // 小星点（带闪烁，无光晕）
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = Math.sin(frame * 0.02 * s.sp + s.ph);
      var alpha = s.a * (0.6 + tw * 0.4);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.28);
      ctx.fillStyle = s.blue ? 'rgba(180,210,255,' + alpha + ')' : 'rgba(255,255,255,' + alpha + ')';
      ctx.fill();
    }

    // 大亮点（纯圆点，无光晕）
    for (var j = 0; j < bigStars.length; j++) {
      var b = bigStars[j];
      var tw2 = 0.7 + 0.3 * Math.sin(frame * 0.03 * b.ph + b.ph);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * tw2, 0, 6.28);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
    }
    requestAnimationFrame(drawSky);
  }

  window.addEventListener('resize', resizeSky);
  resizeSky();
  drawSky();
  // ========== Canvas 星空背景 END ==========

  var state = {
    selectedMood: null,
    selectedTag: null,
    pendingImages: [],
    pendingVoice: null, // {url, dur}
    recTimer: null,
    recStart: 0
  };

  /* ---------- 常量（方便用） ---------- */
  var MOODS = {};  // key -> emoji（兼容旧代码）
  var MOOD_LABEL = {}; // key -> 中文名
  var TAGS  = {};
  D.MOODS.forEach(function (m) { MOODS[m.key] = m.emoji; MOOD_LABEL[m.key] = m.label; });
  D.TAGS.forEach(function (t) { TAGS[t.key] = t.label; });

  /* ---------- 初始化 ---------- */
  doc.addEventListener('DOMContentLoaded', function () {
    initSkyBg();
    renderMoods();
    renderTags();
    bindNav();
    bindCompose();
    loadStars();
    initKeyboard();

    doc.getElementById('fab-add').addEventListener('click', openCompose);
  });

  /* ---------- 键盘高度：写入 --kbd，写信弹层据此避让 ---------- */
  function initKeyboard() {
    var vv = window.visualViewport;
    if (!vv) return;
    function update() {
      // 布局视口高度 - 可视视口高度 - 可视区顶部偏移 = 键盘（或底部工具条）高度
      var kbh = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      // 小于 80px 视为浏览器 UI 抖动，不算键盘
      doc.documentElement.style.setProperty('--kbd', kbh >= 80 ? kbh + 'px' : '0px');
    }
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
  }

  /* ---------- 背景星星 ---------- */
  function initSkyBg() {
    var bg = doc.getElementById('sky-bg');
    var html = '';
    for (var i = 0; i < 180; i++) {
      var size = Math.random() * 2 + 1;
      html += '<span class="bg-s" style="' +
        'top:' + Math.random() * 100 + '%;' +
        'left:' + Math.random() * 100 + '%;' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'animation-delay:' + (Math.random() * 3) + 's;' +
        'opacity:' + (0.3 + Math.random() * 0.7) + ';' +
      '"></span>';
    }
    bg.innerHTML = html;
  }

  /* ---------- 5 角星 SVG（圆润通用） ---------- */
  function starSVG(c1, c2) {
    return '<svg viewBox="0 0 48 48">' +
      '<defs><linearGradient id="sg' + c1.replace('#','') + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<path d="M24 4 L29 19 L45 19 L32 28 L37 44 L24 34 L11 44 L16 28 L3 19 L19 19 Z" fill="url(#sg' + c1.replace('#','') + ')" stroke="' + c2 + '" stroke-width="1"/>' +
      '</svg>';
  }

  /* 心情配色单一真源：[亮色端, 深色端] —— 首页星星、写信按钮、星图环形/图例/热力都从这里派生 */
  var MOOD_GRAD = {
    happy:   ['#f4c96a', '#d4a94a'],
    calm:    ['#a8c5f0', '#7a9ad4'],
    sad:     ['#8eb8d8', '#5a8ab0'],
    annoyed: ['#d8a89a', '#b07060'],
    angry:   ['#c88080', '#a05050'],
    anxious: ['#c0a8e8', '#9070c0'],
    tired:   ['#a0a0c0', '#707090']
  };
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mixHex(c1, c2, t) {
    var a = hexRgb(c1), b = hexRgb(c2);
    return '#' + a.map(function (v, i) {
      var m = Math.round(v + (b[i] - v) * t);
      return (m < 16 ? '0' : '') + m.toString(16);
    }).join('');
  }

  function moodColors(mood) {
    return MOOD_GRAD[mood] || MOOD_GRAD.calm;
  }

  function loadStars() {
    DB.listRecords({}).then(function (recs) {
      var wrap = doc.getElementById('sky-stars');
      wrap.innerHTML = '';

      recs.sort(function (a, b) { return b.createdAt - a.createdAt; });

      var skyCenter = doc.getElementById('sky-center');
      skyCenter.hidden = recs.length !== 0;

      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        var colors = moodColors(r.mood);

        var el = doc.createElement('div');
        el.className = 'dstar new';
        el.style.left = (5 + Math.random() * 85) + '%';
        el.style.top = (10 + Math.random() * 68) + '%';
        el.style.setProperty('--c1', colors[0]);
        el.style.setProperty('--c2', colors[1]);
        el.style.setProperty('--glow', ({
          happy:'rgba(244,201,106,0.6)', calm:'rgba(140,180,240,0.5)',
          sad:'rgba(120,170,210,0.5)', annoyed:'rgba(220,160,130,0.5)',
          angry:'rgba(220,120,120,0.5)', anxious:'rgba(180,150,230,0.5)',
          tired:'rgba(170,170,200,0.4)'
        })[r.mood] || 'rgba(200,200,230,0.45)');
        el.dataset.id = r.id;
        el.dataset.mood = r.mood || 'calm';
        el.innerHTML = starSVG(colors[0], colors[1]);
        el.addEventListener('click', function () { openDetail(this.dataset.id); });
        wrap.appendChild(el);
      }
    });
  }

  /* ---------- 心情按钮（圆形 + 5 角星 SVG） ---------- */
  function renderMoods() {
    var wrap = doc.getElementById('write-moods');
    var html = '';
    D.MOODS.forEach(function (m) {
      var colors = moodColors(m.key);
      html += '<button class="cs-mood-btn" data-mood="' + m.key + '">' +
        '<span class="mood-circle">' + starSVG(colors[0], colors[1]) + '</span>' +
        '<span class="mood-name">' + m.label + '</span>' +
      '</button>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.cs-mood-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        wrap.querySelectorAll('.cs-mood-btn').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        state.selectedMood = b.dataset.mood;
      });
    });
  }

  /* ---------- 标签按钮 ---------- */
  function renderTags() {
    var wrap = doc.getElementById('write-tags');
    var html = '';
    D.TAGS.forEach(function (t) {
      html += '<button data-tag="' + t.key + '">' + t.label + '</button>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        wrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        state.selectedTag = b.dataset.tag;
      });
    });
  }

  /* ---------- 底部导航 + 筛选 + 关闭绑定 ---------- */
  function bindNav() {
    var items = doc.querySelectorAll('.nav-item');
    items.forEach(function (it) {
      it.addEventListener('click', function () {
        items.forEach(function (x) { x.classList.remove('active'); });
        it.classList.add('active');
        var tab = it.dataset.tab;
        if (tab === 'sky') {
          doc.getElementById('view-box').hidden = true;
          doc.getElementById('view-stats').hidden = true;
        }
        if (tab === 'box') openBox();
        if (tab === 'stats') openStats();
      });
    });
    // 筛选
    doc.getElementById('btn-filter').addEventListener('click', function () {
      var fb = doc.getElementById('filter-bar');
      fb.hidden = !fb.hidden;
    });
    doc.querySelectorAll('.fb-item').forEach(function (b) {
      b.addEventListener('click', function () {
        doc.querySelectorAll('.fb-item').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        filterStars(b.dataset.filter);
      });
    });
    // compose 关闭
    doc.getElementById('compose-close').addEventListener('click', closeCompose);
  }

  function filterStars(key) {
    DB.listRecords({}).then(function (recs) {
      recs = recs.filter(function (r) { return key === 'all' || r.mood === key; });
      var wrap = doc.getElementById('sky-stars');
      wrap.innerHTML = '';
      recs.forEach(function (r) {
        var colors = moodColors(r.mood);
        var el = doc.createElement('div');
        el.className = 'dstar new';
        el.style.left = (5 + Math.random() * 85) + '%';
        el.style.top = (10 + Math.random() * 68) + '%';
        el.style.setProperty('--glow', moodColors(r.mood)[0]);
        el.dataset.id = r.id;
        el.innerHTML = starSVG(colors[0], colors[1]);
        el.addEventListener('click', function () { openDetail(this.dataset.id); });
        wrap.appendChild(el);
      });
      doc.getElementById('sky-center').hidden = recs.length !== 0;
    });
  }

  function openBox() {
    doc.getElementById('view-stats').hidden = true;
    var box = doc.getElementById('view-box');
    box.hidden = false;
    box.scrollTop = 0;
    DB.listRecords({ includeArchived: true }).then(function (recs) {
      boxRecs = recs.filter(function (r) { return r.archived; });

      var set = {};
      boxRecs.forEach(function (r) { set[ymOf(r.createdAt)] = 1; });
      monthKeys = Object.keys(set).sort(function (a, b) {
        var pa = parseYm(a), pb = parseYm(b);
        return pa.y - pb.y || pa.m - pb.m;
      });

      doc.getElementById('box-month-head').hidden = monthKeys.length === 0;
      doc.getElementById('box-empty').hidden = monthKeys.length !== 0;
      if (monthKeys.length) {
        if (monthKeys.indexOf(activeYm) < 0) activeYm = monthKeys[monthKeys.length - 1]; // 默认最新月
        renderMonthHead();
        renderBoxMonth();
      } else {
        doc.getElementById('box-list').innerHTML = '';
      }
    });
  }
  function openStats() {
    doc.getElementById('view-box').hidden = true;
    var stats = doc.getElementById('view-stats');
    stats.hidden = false;
    stats.scrollTop = 0;
    DB.listRecords({ includeArchived: true }).then(function (recs) { renderStatsBody(recs); });
  }

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-close]');
    if (!btn) return;
    var panel = btn.closest('.panel');
    if (panel) panel.hidden = true;
    doc.querySelectorAll('.nav-item').forEach(function (x) {
      x.classList.toggle('active', x.dataset.tab === 'sky');
    });
  });

  /* ---------- 星匣：月份大标题 + 当月记录 ---------- */
  var monthKeys = [];   // 升序：旧 → 新，格式 'YYYY-M'（M 为 0 基月）
  var activeYm = null;
  var boxRecs = [];     // 全部已收藏记录
  var ZH_WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function ymOf(ts) {
    var t = new Date(ts);
    return t.getFullYear() + '-' + t.getMonth();
  }
  function parseYm(ym) {
    var p = ym.split('-');
    return { y: +p[0], m: +p[1] };
  }

  // 顶部月份标题（年份小字 + 月份大字）
  function renderMonthHead() {
    var p = parseYm(activeYm);
    doc.getElementById('bm-year').textContent = p.y;
    doc.getElementById('bm-mon').textContent = (p.m + 1) + '月';
  }

  function gotoMonth(ym) {
    if (ym === activeYm || monthKeys.indexOf(ym) < 0) return;
    activeYm = ym;
    renderMonthHead();
    renderBoxMonth();
    doc.getElementById('view-box').scrollTo({ top: 0 });
  }

  // 只渲染当前月份的记录
  function renderBoxMonth() {
    var wrap = doc.getElementById('box-list');
    var recs = boxRecs.filter(function (r) { return ymOf(r.createdAt) === activeYm; });
    recs.sort(function (a, b) { return b.createdAt - a.createdAt; });

    var html = '';
    recs.forEach(function (r, i) {
      var t = new Date(r.createdAt);
      var dateLine = (t.getMonth() + 1) + '月' + t.getDate() + '日 ' + ZH_WEEKS[t.getDay()] + ' · ' +
        String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      var moodLabel = MOODS[r.mood] || '';
      var preview = (r.text || '').slice(0, 60);
      if (preview.length >= 60) preview += '…';
      var cls = i === 0 ? 'collect-card cc-front' : 'collect-card cc-back';
      html += '<div class="' + cls + '" data-id="' + r.id + '">' +
        collectDecoStars(i === 0) +
        '<div class="cc-text">' + escape(preview) + '</div>' +
        '<div class="cc-meta">' +
          '<span>' + moodLabel + (r.tag ? ' · ' + (TAGS[r.tag] || '') : '') + ' · ' + dateLine + '</span>' +
        '</div>' +
      '</div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.collect-card').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.dataset.id); });
    });
  }

  // 月份快速跳转浮层：年份条 + 12月格子（有记录的点亮，点两下直达任意月）
  var pickerYear = null;
  function renderBmpYears() {
    var years = {};
    monthKeys.forEach(function (ym) { years[parseYm(ym).y] = true; });
    var keys = Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
    var box = doc.getElementById('bmp-years');
    box.innerHTML = keys.map(function (y) {
      return '<div class="bmp-year' + (y === pickerYear ? ' active' : '') + '" data-y="' + y + '">' + y + '</div>';
    }).join('');
    box.querySelectorAll('.bmp-year').forEach(function (el) {
      el.addEventListener('click', function () {
        pickerYear = +el.dataset.y;
        renderBmpYears();
        renderBmpMonths();
      });
    });
    // 两侧对称留白：不足一行时整体居中；超出一行时让可见的三个居中
    box.style.paddingLeft = box.style.paddingRight = '';
    var cw = box.clientWidth;
    var firstChip = box.querySelector('.bmp-year');
    var chipW = firstChip ? firstChip.offsetWidth : 0;
    var innerW = box.scrollWidth;
    var pad;
    if (innerW <= cw) {
      pad = Math.max(0, Math.floor((cw - innerW) / 2));
    } else {
      pad = Math.max(0, Math.floor((cw - 3 * chipW - 12) / 2));
    }
    box.style.paddingLeft = box.style.paddingRight = pad + 'px';
    // 让当前选中年份在横条中居中可见
    var active = box.querySelector('.bmp-year.active');
    if (active) box.scrollLeft = Math.max(0, active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2);
  }
  function renderBmpMonths() {
    var activeP = parseYm(activeYm);
    var box = doc.getElementById('bmp-months');
    var html = '';
    for (var m = 0; m < 12; m++) {
      var ym = pickerYear + '-' + m;
      var has = monthKeys.indexOf(ym) >= 0;
      var cls = 'bmp-cell' + (has ? ' has' : '') +
        (has && pickerYear === activeP.y && m === activeP.m ? ' active' : '');
      html += '<div class="' + cls + '"' + (has ? ' data-ym="' + ym + '"' : '') + '>' +
        (m + 1) + '月' +
        (has ? '<span class="bmp-dot"></span>' : '') +
        '</div>';
    }
    box.innerHTML = html;
    box.querySelectorAll('.bmp-cell.has').forEach(function (el) {
      el.addEventListener('click', function () {
        closeBmPop();
        gotoMonth(el.dataset.ym);
      });
    });
  }
  function openBmPop() {
    pickerYear = parseYm(activeYm).y;
    // 先显示浮层再渲染：display:none 时所有宽度读数为 0，留白会算错
    doc.getElementById('bm-pop').hidden = false;
    renderBmpYears();
    renderBmpMonths();
    doc.getElementById('bm-picker').classList.add('active');
  }
  function closeBmPop() {
    doc.getElementById('bm-pop').hidden = true;
    doc.getElementById('bm-picker').classList.remove('active');
  }
  doc.getElementById('bm-picker').addEventListener('click', function () {
    if (doc.getElementById('bm-pop').hidden) openBmPop(); else closeBmPop();
  });
  doc.getElementById('bm-pop-mask').addEventListener('click', closeBmPop);

  // 在星匣区域左右滑 → 上一月 / 下一月（与上下滚动互不干扰）
  (function bindMonthSwipe() {
    var box = doc.getElementById('view-box');
    var sx = 0, sy = 0, lock = null;
    box.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      sx = t.clientX; sy = t.clientY; lock = null;
    }, { passive: true });
    box.addEventListener('touchmove', function (e) {
      if (lock) return;
      var t = e.touches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (lock === 'x') {
        var t = e.changedTouches[0];
        var dx = t.clientX - sx;
        if (Math.abs(dx) > 48) {
          var i = monthKeys.indexOf(activeYm);
          var ni = dx < 0 ? i + 1 : i - 1; // 向左滑 → 更新的月
          if (ni >= 0 && ni < monthKeys.length) gotoMonth(monthKeys[ni]);
        }
      }
      lock = null;
    }, { passive: true });
  })();

  /* 装饰星 SVG：✦ 四芒星（粉/蓝/金多彩） */
  function collectDecoStars(isGold) {
    var sparkle = function (color, sz) {
      return '<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M12 0 C13.2 7.5 16.5 10.8 24 12 C16.5 13.2 13.2 16.5 12 24 C10.8 16.5 7.5 13.2 0 12 C7.5 10.8 10.8 7.5 12 0 Z" fill="' + color + '"/></svg>';
    };
    var fivePoint = function (color) {
      return '<svg viewBox="0 0 20 20" style="width:100%;height:100%"><path d="M10 1 L12.3 7 L19 7 L13.7 11 L15.7 18 L10 14 L4.3 18 L6.3 11 L1 7 L7.7 7 Z" fill="' + color + '"/></svg>';
    };
    // 参考图：右上角 4 颗 —— 粉✦(大) 金✦(大) 蓝✦(中) 金五角星(小)
    return '<div class="cc-deco" style="top:-14px;right:-6px;width:26px;height:26px;opacity:0.95;">' + sparkle('#ffd9ec') + '</div>' +
           '<div class="cc-deco" style="top:6px;right:-20px;width:30px;height:30px;opacity:0.95;">' + sparkle('#f4c96a') + '</div>' +
           '<div class="cc-deco" style="top:34px;right:-16px;width:20px;height:20px;opacity:0.9;">' + sparkle('#9fc4ff') + '</div>' +
           '<div class="cc-deco" style="top:52px;right:2px;width:14px;height:14px;opacity:0.8;">' + fivePoint('#f4c96a') + '</div>';
  }

  /* ---------- 星图（切角科技卡 · 发光环形图 · 90天热力 · 心情趋势） ---------- */
  // 星图配色：取 MOOD_GRAD 渐变中点，与首页星星/写信按钮同源
  var CHART_C = {}, CHART_RGB = {};
  Object.keys(MOOD_GRAD).forEach(function (k) {
    CHART_C[k] = mixHex(MOOD_GRAD[k][0], MOOD_GRAD[k][1], 0.5);
    CHART_RGB[k] = hexRgb(CHART_C[k]);
  });
  var RING_ORDER = ['calm', 'sad', 'tired', 'annoyed', 'anxious', 'angry', 'happy'];
  var LEGEND_ORDER = ['happy', 'calm', 'sad', 'annoyed', 'anxious', 'angry', 'tired'];
  var MOOD_SCORE = { happy: 5, calm: 4, angry: 3, tired: 2.5, annoyed: 2, sad: 1.5, anxious: 1 };

  function donutPath(cx, cy, rO, rI, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + (cx + rO * Math.cos(a0)) + ',' + (cy + rO * Math.sin(a0)) +
      ' A' + rO + ',' + rO + ' 0 ' + large + ' 1 ' + (cx + rO * Math.cos(a1)) + ',' + (cy + rO * Math.sin(a1)) +
      ' L' + (cx + rI * Math.cos(a1)) + ',' + (cy + rI * Math.sin(a1)) +
      ' A' + rI + ',' + rI + ' 0 ' + large + ' 0 ' + (cx + rI * Math.cos(a0)) + ',' + (cy + rI * Math.sin(a0)) + ' Z';
  }

  function renderStatsBody(recs) {
    var body = doc.getElementById('stats-body');

    /* --- 计数 --- */
    var counts = {};
    Object.keys(CHART_C).forEach(function (k) { counts[k] = 0; });
    recs.forEach(function (r) { if (counts[r.mood] !== undefined) counts[r.mood]++; });
    var total = recs.length;

    var daySet = {};
    recs.forEach(function (r) {
      var d = new Date(r.createdAt); d.setHours(0, 0, 0, 0);
      daySet[d.getTime()] = 1;
    });
    var activeDays = Object.keys(daySet).length;

    /* --- 环形图（viewBox 两侧留足标注空间） --- */
    var cx = 160, cy = 160, rO = 112, rI = 72;
    var defs = '<defs>' +
      '<filter id="ringGlow" x="-40%" y="-40%" width="180%" height="180%">' +
      '<feGaussianBlur stdDeviation="3.5" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter></defs>';
    var ringSvg = '';

    if (total > 0) {
      var gap = 3 * Math.PI / 180, a = -Math.PI / 2;
      var segInfo = []; // 已绘制段：{key,n,a0,a1}
      RING_ORDER.forEach(function (key) {
        var n = counts[key];
        if (!n) return;
        var sweep = n / total * Math.PI * 2;
        if (sweep * 180 / Math.PI < 4) return;
        var a0 = a + gap / 2, a1 = a + sweep - gap / 2;
        segInfo.push({ key: key, n: n, a0: a0, a1: a1 });
        ringSvg += '<path class="ring-seg" d="' + donutPath(cx, cy, rO, rI, a0, a1) +
          '" fill="' + CHART_C[key] + '" filter="url(#ringGlow)"/>';
        a += sweep;
      });
      // 内圈虚线 + 8 颗小金点
      ringSvg += '<circle cx="160" cy="160" r="56" fill="none" stroke="rgba(246,201,95,0.32)" stroke-width="1" stroke-dasharray="3 6"/>';
      for (var di = 0; di < 8; di++) {
        var dang = di / 8 * Math.PI * 2;
        ringSvg += '<circle cx="' + (160 + 56 * Math.cos(dang)) + '" cy="' + (160 + 56 * Math.sin(dang)) +
          '" r="2" fill="rgba(246,201,95,0.55)"/>';
      }
      // 引出标注：占比最高的 3 种心情（引线在 SVG，文字用 HTML 层保证字号不被缩放）
      var top3 = segInfo.slice().sort(function (p, q) { return q.n - p.n; }).slice(0, 3);
      var labels = top3.map(function (s) {
        var mid = (s.a0 + s.a1) / 2;
        return { key: s.key, n: s.n, mid: mid, side: Math.cos(mid) >= 0 ? 1 : -1, ly: cy + 124 * Math.sin(mid) };
      });
      // 纵向防重叠：按 y 排序后最小间距 34px
      labels.sort(function (p, q) { return p.ly - q.ly; });
      for (var li = 1; li < labels.length; li++) {
        if (labels[li].ly - labels[li - 1].ly < 34) labels[li].ly = labels[li - 1].ly + 34;
      }
      if (labels.length && labels[labels.length - 1].ly > 286) {
        var shift = labels[labels.length - 1].ly - 286;
        labels.forEach(function (L) { L.ly -= shift; });
      }
      if (labels.length && labels[0].ly < 40) {
        var up = 40 - labels[0].ly;
        labels.forEach(function (L) { L.ly += up; });
      }
      var labelsHtml = '';
      labels.forEach(function (L) {
        var color = CHART_C[L.key];
        var x1 = cx + rO * Math.cos(L.mid), y1 = cy + rO * Math.sin(L.mid);
        var x2 = cx + 122 * Math.cos(L.mid), y2 = cy + 122 * Math.sin(L.mid);
        var ex = L.side > 0 ? 280 : 40; // 横线终点（viewBox 坐标）
        ringSvg += '<path d="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + ' L' + ex + ',' + L.ly +
          '" fill="none" stroke="' + color + '" stroke-width="1.4" opacity="0.7"/>';
        ringSvg += '<circle cx="' + x2 + '" cy="' + y2 + '" r="2" fill="' + color + '" opacity="0.8"/>';
        ringSvg += '<circle cx="' + ex + '" cy="' + L.ly + '" r="3.5" fill="' + color + '" filter="url(#ringGlow)"/>';
        var pct = Math.round(L.n / total * 100);
        labelsHtml += '<span class="rl ' + (L.side > 0 ? 'rl-r' : 'rl-l') +
          '" style="top:' + (L.ly / 320 * 100) + '%;color:' + color + '">' +
          (MOOD_LABEL[L.key] || '') + ' ' + pct + '%</span>';
      });
    } else {
      labelsHtml = '';
      ringSvg += '<circle cx="160" cy="160" r="92" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="40"/>';
      ringSvg += '<text x="160" y="166" text-anchor="middle" font-size="15" letter-spacing="2" fill="rgba(230,235,250,0.5)">点亮第一颗星</text>';
    }

    var legendHtml = LEGEND_ORDER.map(function (k) {
      return '<span class="lg2"><i style="background:' + CHART_C[k] + ';color:' + CHART_C[k] + '"></i>' +
        (MOOD_LABEL[k] || '') + '</span>';
    }).join('');

    /* --- 近 30 天热力：30 桶 × 每桶 1 天，5 行 × 6 列 --- */
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var buckets = [];
    for (var b = 0; b < 30; b++) buckets.push({ n: 0, mc: {} });
    recs.forEach(function (r) {
      var d = new Date(r.createdAt); d.setHours(0, 0, 0, 0);
      var diff = Math.floor((now - d) / 86400000);
      if (diff < 0 || diff >= 30) return;
      var bk = buckets[29 - diff];
      bk.n++;
      bk.mc[r.mood] = (bk.mc[r.mood] || 0) + 1;
    });

    var cellsHtml = '';
    buckets.forEach(function (bk) {
      var style, cls = 'hc';
      if (!bk.n) {
        style = 'background:rgba(120,110,190,0.12);border:1px solid rgba(140,130,210,0.16)';
      } else {
        var dom = null, dn = 0;
        Object.keys(bk.mc).forEach(function (k) {
          if (bk.mc[k] > dn) { dn = bk.mc[k]; dom = k; }
        });
        var rgb = CHART_RGB[dom] || CHART_RGB.tired;
        var alpha = Math.min(0.95, 0.42 + bk.n * 0.16);
        style = 'background:rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
        if (dom === 'happy') cls += ' is-gold';
      }
      cellsHtml += '<div class="' + cls + '" style="' + style + '"></div>';
    });

    var rownums = '';
    for (var rn = 1; rn <= 5; rn++) rownums += '<span>' + rn + '</span>';

    /* --- 金色心情趋势曲线（6 列 × 每列 5 天） --- */
    var trendPts = [];
    for (var ci = 0; ci < 6; ci++) {
      var sum = 0, cnt = 0;
      for (var bi = ci * 5; bi < ci * 5 + 5; bi++) {
        Object.keys(buckets[bi].mc).forEach(function (k) {
          sum += (MOOD_SCORE[k] || 3) * buckets[bi].mc[k];
          cnt += buckets[bi].mc[k];
        });
      }
      if (cnt) trendPts.push({ x: 75 + ci * 150, y: 430 - (sum / cnt - 1) / 4 * 340 });
    }
    var trendSvg = '', dotsHtml = '';
    if (trendPts.length >= 2) {
      var dPath = 'M' + trendPts[0].x + ',' + trendPts[0].y;
      for (var pi = 0; pi < trendPts.length - 1; pi++) {
        var p0 = trendPts[pi - 1] || trendPts[pi], p1 = trendPts[pi],
            p2 = trendPts[pi + 1], p3 = trendPts[pi + 2] || trendPts[pi + 1];
        dPath += ' C' + (p1.x + (p2.x - p0.x) / 6) + ',' + (p1.y + (p2.y - p0.y) / 6) +
          ' ' + (p2.x - (p3.x - p1.x) / 6) + ',' + (p2.y - (p3.y - p1.y) / 6) +
          ' ' + p2.x + ',' + p2.y;
      }
      trendSvg = '<svg class="heat-trend" viewBox="0 0 900 500" preserveAspectRatio="none">' +
        '<defs><filter id="trendGlow" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feGaussianBlur stdDeviation="5" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter></defs>' +
        '<path d="' + dPath + '" fill="none" stroke="' + CHART_C.happy + '" stroke-width="2.4" stroke-linecap="round" ' +
        'vector-effect="non-scaling-stroke" filter="url(#trendGlow)"/></svg>';
      [0, Math.floor(trendPts.length / 2), trendPts.length - 1].forEach(function (idx) {
        var p = trendPts[idx];
        dotsHtml += '<span class="trend-dot" style="left:' + (p.x / 900 * 100) + '%;top:' + (p.y / 500 * 100) + '%"></span>';
      });
    }

    /* --- 洞察语（近 14 天主导心情） --- */
    var recentCounts = {};
    recs.forEach(function (r) {
      var d = new Date(r.createdAt); d.setHours(0, 0, 0, 0);
      var diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 14) recentCounts[r.mood] = (recentCounts[r.mood] || 0) + 1;
    });
    var insight;
    var rks = Object.keys(recentCounts);
    if (!rks.length && total === 0) {
      insight = '还没有星子，去点亮第一颗吧';
    } else if (!rks.length) {
      insight = '最近两周没有新的星子，星空在等你';
    } else {
      var domR = rks.reduce(function (x, y) { return recentCounts[x] >= recentCounts[y] ? x : y; });
      insight = ({
        happy: '近期开心的星子很亮，夜空闪闪发光',
        calm: '近期平静星子居多，夜空很安稳',
        sad: '近期有些低落，星光也在慢慢陪你',
        annoyed: '心里的乱绪多了些，对着星空歇口气吧',
        angry: '烦心事多了些，对着星空歇口气吧',
        anxious: '最近有点焦虑，深呼吸，星光陪着你',
        tired: '最近有些疲惫，记得早点休息'
      })[domR] || '夜空静静陪着你';
    }

    body.innerHTML =
      '<div class="tech-card">' +
        '<div class="ch-nums">' +
          '<div class="n-item"><i class="n-diamond"></i><span class="n-label">总记录</span><span class="n-val">' + total + '</span><span class="n-unit">颗星</span></div>' +
          '<span class="n-sep"></span>' +
          '<div class="n-item"><i class="n-diamond"></i><span class="n-label">活跃</span><span class="n-val">' + activeDays + '</span><span class="n-unit">天</span></div>' +
        '</div>' +
        '<div class="ring-box"><svg viewBox="-75 0 470 320">' + defs + ringSvg + '</svg>' +
          '<div class="ring-labels">' + labelsHtml + '</div></div>' +
        '<div class="ch-legend">' + legendHtml + '</div>' +
      '</div>' +
      '<div class="tech-card heat-card">' +
        '<div class="heat-head"><span class="dash"></span><h3>近30天热力日历</h3><span class="dash"></span></div>' +
        '<div class="heat-board">' +
          '<div class="heat-rownums">' + rownums + '</div>' +
          '<div class="heat-cells">' + cellsHtml + trendSvg + dotsHtml + '</div>' +
        '</div>' +
        '<div class="ch-insight"><i></i><span>' + insight + '</span></div>' +
      '</div>';
  }

  /* ---------- 写信 ---------- */
  function bindCompose() {
    doc.getElementById('compose-mask').addEventListener('click', closeCompose);
    doc.getElementById('btn-send').addEventListener('click', submitCompose);
    doc.getElementById('btn-image').addEventListener('click', function () {
      doc.getElementById('file-image').click();
    });
    doc.getElementById('file-image').addEventListener('change', onPickImages);
    doc.getElementById('btn-voice').addEventListener('click', startRecording);
  }

  function openCompose() {
    resetCompose();
    doc.getElementById('compose').hidden = false;
    setTimeout(function () { doc.getElementById('write-text').focus(); }, 100);
  }
  function closeCompose() {
    doc.getElementById('compose').hidden = true;
    resetCompose();
  }
  function resetCompose() {
    state.selectedMood = null;
    state.selectedTag = null;
    state.pendingImages = [];
    state.pendingVoice = null;
    doc.querySelectorAll('.cs-moods button.selected, .cs-tags button.selected').forEach(function (b) { b.classList.remove('selected'); });
    doc.getElementById('write-text').value = '';
    doc.getElementById('preview-images').innerHTML = '';
    doc.getElementById('preview-voice').hidden = true;
  }

  function submitCompose() {
    var text = doc.getElementById('write-text').value.trim();
    if (!text && state.pendingImages.length === 0 && !state.pendingVoice) {
      showToast('写点什么吧'); return;
    }
    if (!state.selectedMood) { showToast('选个心情'); return; }

    var data = {
      text: text,
      mood: state.selectedMood,
      tag: state.selectedTag,
      images: state.pendingImages,
      voiceUrl: state.pendingVoice ? state.pendingVoice.url : '',
      voiceDuration: state.pendingVoice ? state.pendingVoice.dur : 0
    };
    DB.addRecord(data).then(function () {
      closeCompose();
      loadStars();
      showToast('✨ 点亮了一颗星');
    }).catch(function (e) {
      showToast('保存失败'); console.error(e);
    });
  }

  /* ---------- 图片 ---------- */
  function onPickImages(e) {
    var files = Array.from(e.target.files).slice(0, D.MAX_IMAGES - state.pendingImages.length);
    var preview = doc.getElementById('preview-images');
    files.forEach(function (f) {
      compressImage(f, function (dataUrl) {
        state.pendingImages.push(dataUrl);
        var img = doc.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:8px;margin:4px;';
        preview.appendChild(img);
      });
    });
    e.target.value = '';
  }
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxW = 1200;
        var w = Math.min(img.width, maxW);
        var h = Math.round(img.height * w / img.width);
        var c = doc.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- 录音 ---------- */
  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mr = new MediaRecorder(stream);
      var chunks = [];
      mr.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(chunks, { type: 'audio/webm' });
        var dur = Math.round((Date.now() - state.recStart) / 1000);
        if (dur > D.MAX_VOICE_SEC) { hideRecorder(); return; }
        var reader = new FileReader();
        reader.onload = function () {
          state.pendingVoice = { url: reader.result, dur: dur };
          var pv = doc.getElementById('preview-voice');
          pv.hidden = false;
          pv.innerHTML = '🎤 ' + dur + 's';
        };
        reader.readAsDataURL(blob);
        hideRecorder();
      };
      state.recStart = Date.now();
      mr.start();
      showRecorder();

      (function tick() {
        var s = Math.round((Date.now() - state.recStart) / 1000);
        doc.getElementById('rec-time').textContent =
          String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
        if (s >= D.MAX_VOICE_SEC) { mr.stop(); return; }
        state.recTimer = setTimeout(tick, 500);
      })();

      doc.getElementById('rec-cancel').onclick = function () { mr.stop(); state.pendingVoice = null; };
    }).catch(function () { showToast('没权限录音'); });
  }
  function showRecorder() { doc.getElementById('rec-indicator').hidden = false; }
  function hideRecorder() {
    clearTimeout(state.recTimer);
    doc.getElementById('rec-indicator').hidden = true;
  }

  /* ---------- 详情 ---------- */
  function openDetail(id) {
    DB.listRecords({ includeArchived: true }).then(function (recs) {
      var rec = recs.find(function (r) { return r.id === id; });
      if (!rec) return;

      var body = doc.getElementById('detail-body');
      var t = new Date(rec.createdAt);
      var ts = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' +
        String(t.getDate()).padStart(2, '0') + ' ' +
        String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');

      var html = '<div class="bd-title">星光里的话</div>';
      html += '<div class="bd-meta">';
      if (rec.mood) html += '<span>' + (MOODS[rec.mood] || '') + '</span>';
      if (rec.tag)  html += '<span>· ' + (TAGS[rec.tag] || '') + '</span>';
      html += '<span> · ' + ts + '</span></div>';
      if (rec.images && rec.images.length) {
        html += '<div class="bd-imgs">';
        rec.images.forEach(function (src, i) { html += '<img data-idx="' + i + '" src="' + src + '">'; });
        html += '</div>';
      }
      if (rec.text) html += '<div class="bd-text">' + escape(rec.text) + '</div>';
      if (rec.voiceUrl) {
        html += '<div class="bd-text"><audio src="' + rec.voiceUrl + '" controls style="width:100%"></audio></div>';
      }
      html += '<div class="bd-actions">';
      if (!rec.archived) html += '<button class="da-btn" data-act="archive">归档</button>';
      if (rec.archived) html += '<button class="da-btn gold" data-act="makecard">生成星语卡</button>';
      html += '<button class="da-btn danger" data-act="delete">删除</button>';
      html += '</div>';
      body.innerHTML = html;

      body.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.dataset.act;
          if (act === 'makecard') {
            openCardView(id);
          }
          if (act === 'archive') {
            DB.toggleArchive(id, true).then(function () {
              closeDetail(); loadStars(); openBox(); showToast('收进星匣了');
            });
          }
          if (act === 'delete') {
            DB.softDelete(id).then(function () {
              closeDetail(); loadStars(); showToast('删除了');
            });
          }
        });
      });

      body.querySelectorAll('.bd-imgs img').forEach(function (im) {
        im.addEventListener('click', function () {
          openImageView(rec.images, +im.dataset.idx || 0);
        });
      });

      doc.getElementById('detail').hidden = false;
    });
  }
  function closeDetail() { doc.getElementById('detail').hidden = true; }
  doc.getElementById('detail-mask').addEventListener('click', closeDetail);

  /* ---------- 图片查看层 ---------- */
  function openImageView(imgs, idx) {
    var wrap = doc.getElementById('img-view');
    var sc = doc.getElementById('iv-scroll');
    sc.innerHTML = imgs.map(function (src) { return '<img src="' + src + '">'; }).join('');
    wrap.hidden = false;
    requestAnimationFrame(function () { sc.scrollLeft = sc.clientWidth * idx; });
  }
  function closeImageView() { doc.getElementById('img-view').hidden = true; }
  doc.getElementById('imgview-close').addEventListener('click', closeImageView);

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(msg) {
    var t = doc.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function escape(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /* ============================================================
     星语卡 · Canvas 绘制引擎（1080×1350，无外部库）
     ============================================================ */
  var CW = 1080, CHH = 1350;
  var cardCanvas = doc.createElement('canvas');
  cardCanvas.width = CW; cardCanvas.height = CHH;
  var cctx = cardCanvas.getContext('2d');

  var CARD_STYLES = [
    { key: 'letter',   name: '信纸星' },
    { key: 'postcard', name: '明信片' },
    { key: 'diary',    name: '手账笔记' },
    { key: 'calendar', name: '日历页' },
    { key: 'ticket',   name: '票根' }
  ];

  /* ---------- 确定性随机（同一条记录每次画出的星点位置一致） ---------- */
  function strSeed(s) {
    var h = 1779033703;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  /* ---------- 星空背景 ---------- */
  function drawCardBg(c, seedStr, scheme) {
    var g = c.createLinearGradient(0, 0, 0, CHH);
    if (scheme === 'frame') {
      g.addColorStop(0, '#050716'); g.addColorStop(1, '#0b0f26');
    } else {
      g.addColorStop(0, '#070a22'); g.addColorStop(0.55, '#0c1232'); g.addColorStop(1, '#05071a');
    }
    c.fillStyle = g; c.fillRect(0, 0, CW, CHH);

    // 星云光晕
    var rg = c.createRadialGradient(300, 280, 0, 300, 280, 620);
    rg.addColorStop(0, scheme === 'frame' ? 'rgba(110,80,180,0.22)' : 'rgba(130,90,210,0.28)');
    rg.addColorStop(1, 'rgba(130,90,210,0)');
    c.fillStyle = rg; c.fillRect(0, 0, CW, CHH);
    rg = c.createRadialGradient(820, 980, 0, 820, 980, 680);
    rg.addColorStop(0, 'rgba(60,100,200,0.2)'); rg.addColorStop(1, 'rgba(60,100,200,0)');
    c.fillStyle = rg; c.fillRect(0, 0, CW, CHH);

    // 散落星点
    var rnd = strSeed(seedStr);
    for (var i = 0; i < 170; i++) {
      var x = rnd() * CW, y = rnd() * CHH, r = rnd() * 1.8 + 0.5;
      c.globalAlpha = rnd() * 0.6 + 0.3;
      c.fillStyle = rnd() < 0.12 ? '#bcd0ff' : '#ffffff';
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    }
    // 少量四角小闪
    c.globalAlpha = 1;
    for (var k = 0; k < 9; k++) {
      drawSparkle(c, rnd() * CW, rnd() * CHH, rnd() * 6 + 5, rnd() * 6.28);
    }
  }
  function drawSparkle(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0);
    c.quadraticCurveTo(0, 0, 0, r); c.quadraticCurveTo(0, 0, -r, 0);
    c.quadraticCurveTo(0, 0, 0, -r);
    c.fill(); c.restore();
  }

  /* ---------- 五角星路径 ---------- */
  function traceStar(c, cx, cy, outer, inner) {
    c.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      var x = cx + Math.cos(a) * outer, y = cy + Math.sin(a) * outer;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      a += Math.PI / 5;
      x = cx + Math.cos(a) * inner; y = cy + Math.sin(a) * inner;
      c.lineTo(x, y);
    }
    c.closePath();
  }
  function drawBigStar(c, cx, cy, outer, colors) {
    c.save();
    c.shadowColor = colors[0]; c.shadowBlur = outer * 0.9;
    var g = c.createLinearGradient(cx, cy - outer, cx, cy + outer);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    c.fillStyle = g;
    traceStar(c, cx, cy, outer, outer * 0.46);
    c.fill();
    c.restore();
  }

  /* ---------- 文字换行 / 自适应字号 ---------- */
  var SERIF = "'Noto Serif SC', serif";
  var HAPPY = "'ZCOOL KuaiLe', 'Noto Serif SC', serif";
  function wrapText(c, text, maxW) {
    var lines = [];
    String(text).split('\n').forEach(function (para) {
      var cur = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        if (cur && c.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; }
        else cur += ch;
      }
      lines.push(cur);
    });
    return lines;
  }
  function fitTextFont(c, text, maxW, maxH, start, fontName, weight, lhRatio) {
    for (var s = start; s >= 26; s -= 2) {
      c.font = weight + ' ' + s + 'px ' + fontName;
      var lines = wrapText(c, text, maxW);
      var lh = s * lhRatio;
      if (lines.length * lh <= maxH) return { size: s, lines: lines, lh: lh };
    }
    c.font = weight + ' 26px ' + fontName;
    return { size: 26, lines: wrapText(c, text, maxW), lh: 26 * lhRatio };
  }
  function fitText(c, text, maxW, maxH, start) {
    return fitTextFont(c, text, maxW, maxH, start, SERIF, '500', 1.72);
  }
  function drawLines(c, lines, cx, topY, lh, color) {
    c.fillStyle = color; c.textAlign = 'center';
    lines.forEach(function (ln, i) { c.fillText(ln, cx, topY + i * lh); });
  }

  /* ---------- 落款：日期 + 星语 ---------- */
  function drawFooter(c, dateStr, y) {
    c.textAlign = 'center';
    c.fillStyle = 'rgba(237,231,217,0.8)';
    c.font = '400 30px ' + SERIF;
    c.fillText(dateStr, 540, y);

    var label = '星语';
    c.font = '400 26px ' + SERIF;
    var tw = c.measureText(label).width;
    var groupW = 20 + 8 + tw, sx = 540 - groupW / 2;
    drawBigStar(c, sx + 9, y + 46, 11, ['#f4c96a', '#c89a3a']);
    c.textAlign = 'left'; c.fillStyle = 'rgba(244,201,106,0.85)';
    c.fillText(label, sx + 20, y + 56);
  }

  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---------- 模板 1：信纸星 ---------- */
  function tplLetter(c, rec, mc) {
    drawCardBg(c, rec.id + 'letter', 'letter');
    c.save();
    c.translate(540, 680); c.rotate(-0.014);

    // 信纸
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 45; c.shadowOffsetY = 18;
    roundRectPath(c, -400, -400, 800, 800, 18);
    var pg = c.createLinearGradient(0, -400, 0, 400);
    pg.addColorStop(0, '#f9f0d6'); pg.addColorStop(1, '#f0e5c6');
    c.fillStyle = pg; c.fill();
    c.restore();

    // 横线
    c.strokeStyle = 'rgba(180,160,100,0.35)'; c.lineWidth = 1.5;
    for (var y = -310; y <= 320; y += 62) {
      c.beginPath(); c.moveTo(-330, y); c.lineTo(330, y); c.stroke();
    }

    // 心情小星（右上角）
    drawBigStar(c, 322, -338, 30, mc);

    // 文字：像真实信纸一样从上部开始书写，自上而下
    var fit = fitText(c, rec.text || '', 660, 600, 44);
    c.font = '500 ' + fit.size + 'px ' + SERIF;
    var topY = -235 + fit.size;
    c.fillStyle = '#3c3426'; c.textAlign = 'center';
    fit.lines.forEach(function (ln, i) { c.fillText(ln, 0, topY + i * fit.lh); });

    c.restore();
    drawFooter(c, dateDot(rec.createdAt), 1225);
  }

  /* ---------- 通用小工具：hex→rgba / 浅色底品牌落款 ---------- */
  function cRgba(hex, a) {
    var h = hex.replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  function cardBrand(c, y) {
    c.font = '400 26px ' + SERIF;
    var label = '星语';
    var tw = c.measureText(label).width;
    var sx = 540 - (20 + 8 + tw) / 2;
    drawBigStar(c, sx + 9, y - 8, 11, ['#f4c96a', '#c89a3a']);
    c.textAlign = 'left'; c.fillStyle = 'rgba(201,164,74,0.9)';
    c.fillText(label, sx + 20, y);
  }

  /* ---------- 模板 2：明信片 ---------- */
  function tplPostcard(c, rec, mc) {
    c.fillStyle = '#f5eedb'; c.fillRect(0, 0, CW, CHH);
    var rnd = strSeed(rec.id + 'pc');
    for (var i = 0; i < 150; i++) {
      c.globalAlpha = rnd() * 0.05 + 0.02;
      c.fillStyle = '#7a6844';
      c.beginPath(); c.arc(rnd() * CW, rnd() * CHH, rnd() * 1.3 + 0.4, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    c.strokeStyle = '#d9cba4'; c.lineWidth = 2;
    c.strokeRect(30, 30, CW - 60, CHH - 60);

    c.textAlign = 'center';
    c.fillStyle = '#7a6f55'; c.font = '500 38px ' + SERIF;
    c.fillText('P O S T   C A R D', 540, 150);
    c.fillStyle = '#b0a37f'; c.font = '400 26px ' + SERIF;
    c.fillText('★ 星 语 邮 政', 540, 200);

    c.strokeStyle = '#d3c5a0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(560, 260); c.lineTo(560, 1160); c.stroke();

    // 左半：正文
    c.textAlign = 'left';
    c.fillStyle = '#8a7c5e'; c.font = '500 34px ' + SERIF;
    c.fillText('致 明天的我：', 120, 370);
    var fit = fitText(c, rec.text || '', 390, 620, 44);
    c.font = '500 ' + fit.size + 'px ' + SERIF;
    c.fillStyle = '#4a4234';
    fit.lines.forEach(function (ln, j) { c.fillText(ln, 120, 440 + j * fit.lh); });

    // 右半：邮票
    var sx = 700, sy = 300, sw = 170, sh = 200;
    c.save();
    c.setLineDash([0.5, 11]); c.lineCap = 'round'; c.lineWidth = 3.5;
    c.strokeStyle = '#b8a87e';
    c.strokeRect(sx - 7, sy - 7, sw + 14, sh + 14);
    c.restore();
    c.fillStyle = '#fdfaf2'; c.fillRect(sx, sy, sw, sh);
    var sg = c.createLinearGradient(0, sy, 0, sy + sh);
    sg.addColorStop(0, mc[0]); sg.addColorStop(1, mc[1]);
    c.fillStyle = sg; c.fillRect(sx + 14, sy + 14, sw - 28, sh - 28);
    c.save();
    c.shadowColor = cRgba(mc[1], 0.9); c.shadowBlur = 22;
    c.fillStyle = '#ffffff';
    traceStar(c, sx + sw / 2, sy + sh / 2 + 4, 38, 17);
    c.fill();
    c.restore();
    var ds = dateDot(rec.createdAt);
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = '500 22px ' + SERIF; c.textAlign = 'right';
    c.fillText(ds.slice(5).replace('.', '·'), sx + sw - 26, sy + sh - 26);

    // 邮戳（压着邮票下缘）
    c.strokeStyle = 'rgba(138,124,94,0.8)'; c.lineWidth = 3;
    c.beginPath(); c.arc(745, 560, 88, 0, 6.283); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(138,124,94,0.5)';
    c.beginPath(); c.arc(745, 560, 70, 0, 6.283); c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#8a7c5e';
    c.font = '400 24px ' + SERIF; c.fillText(ds.slice(0, 4), 745, 552);
    c.font = '500 30px ' + SERIF; c.fillText(ds.slice(5), 745, 590);
    c.strokeStyle = 'rgba(138,124,94,0.45)'; c.lineWidth = 2;
    [640, 664, 688].forEach(function (wy) {
      c.beginPath();
      for (var wx = 580; wx <= 940; wx += 40) {
        var amp = (wx / 40) % 2 === 0 ? -6 : 6;
        if (wx === 580) c.moveTo(wx, wy);
        c.quadraticCurveTo(wx + 20, wy + amp, wx + 40, wy);
      }
      c.stroke();
    });

    // 收件
    c.textAlign = 'left';
    c.fillStyle = '#6b5f45'; c.font = '500 36px ' + SERIF;
    c.fillText('寄给 明天的我', 620, 812);
    c.strokeStyle = '#d3c5a0'; c.lineWidth = 2;
    [830, 920, 1010].forEach(function (ly3) {
      c.beginPath(); c.moveTo(620, ly3); c.lineTo(960, ly3); c.stroke();
    });

    cardBrand(c, 1250);
  }

  /* ---------- 和纸胶带 ---------- */
  function washiTape(c, x, y, w, h, rot, color) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = color;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(-w / 2, -6, w, 12);
    c.restore();
  }
  /* ---------- 配图：异步加载（dataURL） ---------- */
  function loadPhoto(rec) {
    return new Promise(function (res) {
      if (rec.images && rec.images.length) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { res(null); };
        im.src = rec.images[0];
      } else res(null);
    });
  }

  /* ---------- 配图框：真照片封面裁剪；无图时心情色插画 ---------- */
  function photoBox(c, img, x, y, w, h, r, mc, seed) {
    c.save();
    roundRectPath(c, x, y, w, h, r); c.clip();
    if (img) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var ir = iw / ih, br = w / h, sx, sy, sw, sh;
      if (ir > br) { sh = ih; sw = sh * br; sx = (iw - sw) / 2; sy = 0; }
      else { sw = iw; sh = sw / br; sy = (ih - sh) / 2; sx = 0; }
      c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    } else {
      var g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, mc[0]); g.addColorStop(1, mc[1]);
      c.fillStyle = g; c.fillRect(x, y, w, h);
      var rnd = strSeed(seed || 'pbox');
      for (var d = 0; d < 30; d++) {
        c.globalAlpha = rnd() * 0.5 + 0.2; c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(x + rnd() * w, y + rnd() * h, rnd() * 1.7 + 0.5, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      drawBigStar(c, x + w / 2, y + h / 2, Math.min(w, h) * 0.17, ['#ffffff', mc[0]]);
    }
    c.restore();
    c.strokeStyle = 'rgba(60,50,30,0.18)'; c.lineWidth = 2;
    roundRectPath(c, x, y, w, h, r); c.stroke();
  }

  /* ---------- 照片完整显示：白边相纸，居中放在给定区域内，返回实际矩形 ---------- */
  function photoContain(c, img, rx, ry, rw, rh) {
    var pad = 14;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var maxW = rw - pad * 2, maxH = rh - pad * 2;
    var dW, dH;
    if (maxW / maxH > iw / ih) { dH = maxH; dW = dH * iw / ih; }
    else { dW = maxW; dH = dW * ih / iw; }
    var bW = dW + pad * 2, bH = dH + pad * 2;
    var bX = rx + (rw - bW) / 2, bY = ry + Math.max(0, (rh - bH) / 2);
    c.save();
    c.shadowColor = 'rgba(90,70,40,0.2)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    roundRectPath(c, bX, bY, bW, bH, 4);
    c.fillStyle = '#ffffff'; c.fill();
    c.restore();
    c.save();
    roundRectPath(c, bX + pad, bY + pad, dW, dH, 2); c.clip();
    c.drawImage(img, bX + pad, bY + pad, dW, dH);
    c.restore();
    c.strokeStyle = 'rgba(60,50,30,0.18)'; c.lineWidth = 2;
    roundRectPath(c, bX, bY, bW, bH, 4); c.stroke();
    return { x: bX, y: bY, w: bW, h: bH };
  }

  /* ---------- 手绘涂鸦工具 ---------- */
  var INK = '#57504a';
  function setInk(c, w, color) {
    c.strokeStyle = color || INK; c.fillStyle = color || INK;
    c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  }
  function cloudPath(c, w, h) {
    c.beginPath();
    c.moveTo(-w * 0.5, h * 0.15);
    c.quadraticCurveTo(-w * 0.52, -h * 0.35, -w * 0.28, -h * 0.28);
    c.quadraticCurveTo(-w * 0.22, -h * 0.72, w * 0.05, -h * 0.45);
    c.quadraticCurveTo(w * 0.3, -h * 0.62, w * 0.42, -h * 0.22);
    c.quadraticCurveTo(w * 0.58, h * 0.05, w * 0.3, h * 0.25);
    c.lineTo(-w * 0.3, h * 0.25);
    c.quadraticCurveTo(-w * 0.55, h * 0.28, -w * 0.5, h * 0.15);
    c.closePath();
  }
  function dCloud(c, x, y, w, h, fill) {
    c.save(); c.translate(x, y);
    cloudPath(c, w, h);
    c.fillStyle = fill; c.fill();
    setInk(c, 3, '#5a96d0'); c.stroke();
    c.restore();
  }
  function dFlower(c, x, y, r, petal, center) {
    c.save(); c.translate(x, y);
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      c.fillStyle = petal;
      c.beginPath(); c.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.5, 0, 6.283); c.fill();
    }
    c.fillStyle = center || '#e8c25a';
    c.beginPath(); c.arc(0, 0, r * 0.42, 0, 6.283); c.fill();
    c.restore();
  }
  function dHeart(c, x, y, s, fill) {
    c.save(); c.translate(x, y);
    c.beginPath();
    c.moveTo(0, s * 0.32);
    c.bezierCurveTo(-s * 0.62, -0.08, -s * 0.36, -s * 0.55, 0, -s * 0.25);
    c.bezierCurveTo(s * 0.36, -s * 0.55, s * 0.62, -0.08, 0, s * 0.32);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    setInk(c, 3, fill ? '#ffffff' : INK); c.stroke();
    c.restore();
  }
  function dCat(c, x, y, s) {
    c.save(); c.translate(x, y); setInk(c, 3.4);
    c.beginPath(); c.moveTo(-0.28 * s, -0.5 * s); c.lineTo(-0.18 * s, -0.72 * s); c.lineTo(-0.06 * s, -0.52 * s); c.stroke();
    c.beginPath(); c.moveTo(0.06 * s, -0.52 * s); c.lineTo(0.18 * s, -0.72 * s); c.lineTo(0.28 * s, -0.5 * s); c.stroke();
    c.beginPath(); c.arc(0, -0.35 * s, 0.26 * s, 0, 6.283); c.stroke();
    c.beginPath();
    c.moveTo(-0.22 * s, -0.12 * s);
    c.quadraticCurveTo(-0.34 * s, 0.25 * s, -0.22 * s, 0.42 * s);
    c.lineTo(0.22 * s, 0.42 * s);
    c.quadraticCurveTo(0.34 * s, 0.25 * s, 0.22 * s, -0.12 * s);
    c.stroke();
    c.beginPath(); c.moveTo(0.2 * s, 0.3 * s); c.quadraticCurveTo(0.52 * s, 0.28 * s, 0.42 * s, 0.04 * s); c.stroke();
    c.beginPath(); c.rect(-0.1 * s, 0.19 * s, 0.2 * s, 0.16 * s); c.stroke();
    c.fillStyle = INK;
    c.beginPath(); c.arc(-0.09 * s, -0.38 * s, 0.028 * s, 0, 6.283); c.fill();
    c.beginPath(); c.arc(0.09 * s, -0.38 * s, 0.028 * s, 0, 6.283); c.fill();
    c.beginPath(); c.moveTo(-0.03 * s, -0.3 * s); c.quadraticCurveTo(0, -0.26 * s, 0.03 * s, -0.3 * s); c.stroke();
    c.restore();
  }
  function dTag(c, x, y, s) {
    c.save(); c.translate(x, y);
    setInk(c, 2.5, '#c2a878');
    c.beginPath();
    c.moveTo(-s * 0.32, -s * 0.5); c.lineTo(s * 0.32, -s * 0.42);
    c.lineTo(s * 0.3, s * 0.5); c.lineTo(-s * 0.3, s * 0.5); c.closePath();
    c.fillStyle = '#faf5e6'; c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -s * 0.26, s * 0.08, 0, 6.283); c.stroke();
    c.beginPath();
    c.moveTo(0, -s * 0.06); c.quadraticCurveTo(s * 0.16, s * 0.06, 0, s * 0.16);
    c.quadraticCurveTo(-s * 0.16, s * 0.06, 0, -s * 0.06);
    c.stroke();
    c.restore();
  }
  function drawHouse(c, x, y, s) {
    c.save(); c.translate(x, y); setInk(c, 3.2);
    c.beginPath();
    c.moveTo(-s * 0.34, -s * 0.06); c.lineTo(0, -s * 0.4); c.lineTo(s * 0.34, -s * 0.06);
    c.stroke();
    c.strokeRect(-s * 0.27, -s * 0.06, s * 0.54, s * 0.36);
    c.strokeRect(-s * 0.06, s * 0.1, s * 0.13, s * 0.2);
    c.restore();
  }
  function drawCake(c, x, y, s) {
    c.save(); c.translate(x, y); setInk(c, 3);
    c.beginPath(); c.moveTo(-s * 0.5, s * 0.24); c.quadraticCurveTo(0, s * 0.34, s * 0.5, s * 0.24); c.stroke();
    roundRectPath(c, -s * 0.4, -s * 0.12, s * 0.8, s * 0.3, 4);
    c.fillStyle = '#fff8ea'; c.fill(); c.stroke();
    c.beginPath();
    c.moveTo(-s * 0.4, -s * 0.1);
    c.quadraticCurveTo(-s * 0.27, -s * 0.22, -s * 0.13, -s * 0.1);
    c.quadraticCurveTo(0, -s * 0.22, s * 0.13, -s * 0.1);
    c.quadraticCurveTo(s * 0.27, -s * 0.22, s * 0.4, -s * 0.1);
    c.stroke();
    c.beginPath(); c.moveTo(0, -s * 0.28); c.lineTo(0, -s * 0.52); c.stroke();
    c.fillStyle = '#e88a6a';
    c.beginPath(); c.ellipse(0, -s * 0.6, s * 0.07, s * 0.1, 0, 0, 6.283); c.fill();
    c.restore();
  }

  /* ---------- 心情天气小图标 ---------- */
  function dWeather(c, x, y, mood, s) {
    c.save(); c.translate(x, y); setInk(c, 3);
    var w = s * 0.8, h = s * 0.5;
    if (mood === 'happy') {
      c.fillStyle = '#f6c84a';
      c.beginPath(); c.arc(0, 0, s * 0.26, 0, 6.283); c.fill(); c.stroke();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        c.beginPath();
        c.moveTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34);
        c.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46);
        c.stroke();
      }
    } else if (mood === 'tired') {
      c.beginPath();
      c.moveTo(0, -s * 0.3); c.arc(0, 0, s * 0.3, -Math.PI / 2, Math.PI / 2);
      c.arc(s * 0.13, -s * 0.03, s * 0.25, Math.PI / 2, -Math.PI / 2, true);
      c.closePath();
      c.fillStyle = '#d9d3e8'; c.fill(); c.stroke();
      drawSparkle(c, s * 0.28, -s * 0.22, 4.5, 0);
    } else {
      if (mood === 'calm') {
        c.fillStyle = '#f6c84a';
        c.beginPath(); c.arc(-s * 0.22, -s * 0.26, s * 0.17, 0, 6.283); c.fill(); c.stroke();
      }
      cloudPath(c, w, h);
      c.fillStyle = mood === 'anxious' ? '#a9a6a0' : '#f2efe8';
      c.fill(); c.stroke();
      if (mood === 'sad' || mood === 'angry') {
        setInk(c, 3, mood === 'angry' ? '#c87a5a' : '#6fa0d8');
        for (var r = -1; r <= 1; r++) {
          c.beginPath();
          c.moveTo(r * s * 0.2, h * 0.28);
          c.lineTo(r * s * 0.2 - s * 0.06, h * 0.52);
          c.stroke();
        }
      }
      if (mood === 'angry') {
        setInk(c, 3.4, '#d98a3a');
        c.beginPath();
        c.moveTo(s * 0.06, h * 0.18); c.lineTo(-s * 0.08, h * 0.42);
        c.lineTo(s * 0.03, h * 0.4); c.lineTo(-s * 0.06, h * 0.62);
        c.stroke();
      }
      if (mood === 'annoyed') {
        setInk(c, 2.6, '#8a857c');
        for (var w2 = 0; w2 < 2; w2++) {
          var wy = h * (0.12 + w2 * 0.26);
          c.beginPath();
          c.moveTo(s * 0.02, wy);
          c.quadraticCurveTo(s * 0.22, wy - s * 0.12, s * 0.42, wy);
          c.stroke();
        }
      }
    }
    c.restore();
  }

  /* ---------- 手撕锯齿 ---------- */
  function scallop(c, x0, x1, y, r, color) {
    c.fillStyle = color;
    for (var x = x0; x <= x1 + 1; x += 2 * r) {
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    }
  }

  function dateSlash(ts) {
    var t = new Date(ts);
    return t.getFullYear() + '/' + String(t.getMonth() + 1).padStart(2, '0') + '/' + String(t.getDate()).padStart(2, '0');
  }
  function dateDot(ts) {
    var t = new Date(ts);
    return t.getFullYear() + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + String(t.getDate()).padStart(2, '0');
  }

  /* ---------- 模板 3：手账笔记 ---------- */
  function tplDiary(c, rec, mc, photo) {
    c.fillStyle = '#efe6d2'; c.fillRect(0, 0, CW, CHH);
    c.save();
    c.translate(540, 678); c.rotate(-0.02);

    c.save();
    c.shadowColor = 'rgba(90,70,40,0.25)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
    roundRectPath(c, -425, -545, 850, 1090, 6);
    c.fillStyle = '#fcfaf2'; c.fill();
    c.restore();

    c.save();
    roundRectPath(c, -425, -545, 850, 1090, 6); c.clip();

    // 页眉
    c.textAlign = 'left'; c.fillStyle = '#9a927c';
    c.font = '400 27px ' + SERIF;
    c.fillText('星语小记', -372, -466);
    c.strokeStyle = '#b5ac97'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-372, -450); c.lineTo(-246, -450); c.stroke();
    c.textAlign = 'right'; c.fillStyle = '#6a6252';
    c.font = '400 26px ' + SERIF;
    var ds = dateSlash(rec.createdAt);
    c.fillText(ds, 372, -468);
    c.beginPath(); c.moveTo(200, -452); c.lineTo(372, -452); c.stroke();

    dCloud(c, 70, -398, 190, 66, '#9ecdf5');
    dCloud(c, 252, -388, 120, 50, '#b3d9f7');

    // 正文（快乐体）
    var quote = '「' + (rec.text || '') + '」';
    var tTop = -306, gap = 38;
    // 预留：配图最小高度 + 白边 + 底部涂鸦区，超长文字自动缩字号
    var fit = fitTextFont(c, quote, 760, 440, 42, HAPPY, '400', 1.55);
    c.font = '400 ' + fit.size + 'px ' + HAPPY;
    c.textAlign = 'left'; c.fillStyle = '#35466e';
    fit.lines.forEach(function (ln, i) { c.fillText(ln, -365, tTop + i * fit.lh); });

    // 配图：紧跟正文，完整显示留白边
    var pTop = tTop + fit.lines.length * fit.lh + gap;
    var pBottom = 418;
    var bX, bY, bW, bH;

    if (photo) {
      var pb = photoContain(c, photo, -365, pTop, 730, pBottom - pTop);
      bX = pb.x; bY = pb.y; bW = pb.w; bH = pb.h;
    } else {
      // 无配图：心情渐变占位
      bX = -365; bW = 730;
      bH = Math.min(pBottom - pTop, 320);
      bY = pTop + ((pBottom - pTop) - bH) / 2;
      photoBox(c, null, bX, bY, bW, bH, 4, mc, rec.id + 'diary');
    }

    // 小花贴纸：有意压在照片右上角
    dFlower(c, bX + bW - 18, bY + 6, 15, '#f6d56a', '#e8a94a');

    // 底部：心情小星星（只用颜色表达心情）+ 小猫
    drawBigStar(c, -330, 478, 26, mc);
    dCat(c, 306, 428, 92);

    c.restore();
    c.restore();
  }

  /* ---------- 模板 4：日历页 ---------- */
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var WEEKS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  function tplCalendar(c, rec, mc, photo) {
    c.fillStyle = '#f8f1e0'; c.fillRect(0, 0, CW, CHH);
    setInk(c, 2, '#e2d6b8');
    roundRectPath(c, 30, 30, 1020, 1290, 8); c.stroke();

    // 顶部碎花胶带
    c.save(); c.translate(332, 48); c.rotate(-0.05);
    c.fillStyle = '#e7dabd';
    c.beginPath();
    c.moveTo(-150, -20); c.lineTo(150, -20); c.lineTo(150, 16);
    c.lineTo(110, 22); c.lineTo(70, 14); c.lineTo(30, 22);
    c.lineTo(-10, 14); c.lineTo(-50, 22); c.lineTo(-90, 14);
    c.lineTo(-150, 20); c.closePath();
    c.fill();
    dFlower(c, -92, -3, 13, '#d98aa6', '#e8c25a');
    dFlower(c, 0, -5, 15, '#a8a0ce', '#e8c25a');
    dFlower(c, 92, -2, 13, '#c9a0a0', '#e8c25a');
    c.restore();

    var t = new Date(rec.createdAt);
    c.textAlign = 'left'; c.fillStyle = '#5c4c4c';
    c.font = "400 46px 'Caveat', cursive";
    c.fillText('tiny type', 92, 196);
    c.textAlign = 'right'; c.fillStyle = '#6b5a4e';
    c.font = '400 38px ' + SERIF;
    c.fillText(String(t.getFullYear()), 988, 196);

    c.strokeStyle = '#7a4a60'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(92, 228); c.lineTo(988, 228); c.stroke();

    var day2 = String(t.getDate()).padStart(2, '0');
    c.textAlign = 'center'; c.fillStyle = '#73405a';
    c.font = '400 238px ' + SERIF;
    c.fillText(day2, 540, 408);

    c.font = '400 60px ' + SERIF;
    c.textAlign = 'left'; c.fillText(MONTHS[t.getMonth()], 112, 392);
    c.textAlign = 'right'; c.fillText(WEEKS[t.getDay()], 968, 392);

    c.strokeStyle = '#7a4a60'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(92, 450); c.lineTo(988, 450); c.stroke();

    if (photo) photoContain(c, photo, 250, 484, 580, 348);
    else photoBox(c, null, 250, 484, 580, 348, 3, mc, rec.id + 'calendar');

    // 文字在下方区域垂直居中
    var fit = fitTextFont(c, rec.text || '', 720, 296, 44, HAPPY, '400', 1.6);
    var blockH = fit.lines.length * fit.lh;
    var tTop = 902 + (296 - blockH) / 2 + fit.size;
    c.font = '400 ' + fit.size + 'px ' + HAPPY;
    c.textAlign = 'center'; c.fillStyle = '#6e4658';
    fit.lines.forEach(function (ln, i) { c.fillText(ln, 540, tTop + i * fit.lh); });

    dHeart(c, 952, 120, 44, '#b0708a');
    dHeart(c, 128, 1244, 32, '#c08a9a');
    drawBigStar(c, 196, 628, 15, ['#f4c96a', '#c89a3a']);
    drawBigStar(c, 890, 704, 13, ['#f4c96a', '#c89a3a']);

    c.save(); c.translate(908, 888); c.rotate(0.18); dTag(c, 0, 0, 58); c.restore();
  }

  /* ---------- 模板 5：锯齿票根 ---------- */
  function tplTicket(c, rec, mc, photo) {
    var bg = '#6e6960';
    c.fillStyle = bg; c.fillRect(0, 0, CW, CHH);

    var tkX = 90, tkY = 72, tkW = 900, tkB = 1278;
    c.fillStyle = '#f6f4ed';
    c.fillRect(tkX, tkY, tkW, tkB - tkY);
    scallop(c, tkX, tkX + tkW, tkY, 16, bg);
    scallop(c, tkX, tkX + tkW, tkB, 16, bg);

    // 顶部三组图标
    dWeather(c, 250, 142, rec.mood, 74);
    c.font = '400 27px ' + HAPPY; c.textAlign = 'center'; c.fillStyle = '#4a4640';
    c.fillText(MOOD_LABEL[rec.mood] || '', 250, 208);

    drawBigStar(c, 540, 140, 29, ['#f4c96a', '#c89a3a']);
    c.fillText('星语', 540, 208);

    drawHouse(c, 830, 146, 66);
    c.font = "400 28px 'Caveat', cursive";
    c.fillText('HOME', 830, 208);

    // 金色圆点
    c.fillStyle = '#f4c531';
    c.beginPath(); c.arc(540, 258, 29, 0, 6.283); c.fill();

    if (photo) photoContain(c, photo, 204, 310, 672, 556);
    else photoBox(c, null, 204, 310, 672, 556, 4, mc, rec.id + 'ticket');

    drawCake(c, 540, 928, 56);

    var fit = fitTextFont(c, rec.text || '', 720, 236, 40, HAPPY, '400', 1.5);
    var blockH = fit.lines.length * fit.lh;
    var tTop = 968 + (236 - blockH) / 2 + fit.size;
    c.font = '400 ' + fit.size + 'px ' + HAPPY;
    c.textAlign = 'center'; c.fillStyle = '#3a3631';
    fit.lines.forEach(function (ln, i) { c.fillText(ln, 540, tTop + i * fit.lh); });
  }

  function drawCard(rec, styleKey) {
    cctx.clearRect(0, 0, CW, CHH);
    var mc = moodColors(rec.mood);
    return loadPhoto(rec).then(function (photo) {
      if (styleKey === 'postcard') tplPostcard(cctx, rec, mc);
      else if (styleKey === 'diary') tplDiary(cctx, rec, mc, photo);
      else if (styleKey === 'calendar') tplCalendar(cctx, rec, mc, photo);
      else if (styleKey === 'ticket') tplTicket(cctx, rec, mc, photo);
      else tplLetter(cctx, rec, mc);
      return cardCanvas.toDataURL('image/png');
    });
  }

  /* ---------- 预览弹层逻辑 ---------- */
  var cvRec = null, cvStyle = 'letter', cvURL = '';
  function openCardView(id) {
    DB.listRecords({ includeArchived: true }).then(function (recs) {
      var rec = recs.find(function (r) { return r.id === id; });
      if (!rec) return;
      cvRec = rec; cvStyle = 'letter';
      renderStyleTabs();
      closeDetail();
      doc.getElementById('card-view').hidden = false;
      renderCard();
    });
  }
  function closeCardView() { doc.getElementById('card-view').hidden = true; }
  function renderCard() {
    var fontReady = Promise.resolve();
    if (doc.fonts) {
      fontReady = Promise.all([
        doc.fonts.ready,
        doc.fonts.load("400 42px 'ZCOOL KuaiLe'"),
        doc.fonts.load("400 46px 'Caveat'")
      ]);
    }
    fontReady.then(function () {
      return drawCard(cvRec, cvStyle);
    }).then(function (url) {
      cvURL = url;
      doc.getElementById('cv-image').src = url;
    });
  }
  function renderStyleTabs() {
    var wrap = doc.getElementById('cv-styles');
    wrap.innerHTML = '';
    CARD_STYLES.forEach(function (s) {
      var b = doc.createElement('button');
      b.className = 'cv-style' + (s.key === cvStyle ? ' active' : '');
      b.textContent = s.name;
      b.addEventListener('click', function () {
        cvStyle = s.key;
        wrap.querySelectorAll('.cv-style').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderCard();
      });
      wrap.appendChild(b);
    });
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  }
  doc.getElementById('cardview-mask').addEventListener('click', closeCardView);
  doc.getElementById('cardview-close').addEventListener('click', closeCardView);
  doc.getElementById('cv-save').addEventListener('click', function () {
    if (isIOS()) {
      showToast('请长按上方卡片图，选「存储到相册」');
      return;
    }
    var a = doc.createElement('a');
    a.href = cvURL;
    a.download = '星语卡-' + dateDot(cvRec.createdAt) + '.png';
    doc.body.appendChild(a); a.click(); a.remove();
    showToast('已保存到相册');
  });
  if (isIOS()) doc.getElementById('cv-tip').hidden = false;
})();

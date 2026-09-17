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

    doc.getElementById('fab-add').addEventListener('click', openCompose);
  });

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
      recs = recs.filter(function (r) { return r.archived; });
      renderPanelList('#box-list', recs);
      doc.getElementById('box-empty').hidden = recs.length !== 0;
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

  /* ---------- 收集卡片：每条记录一张，纵向排列 ---------- */
  function renderPanelList(sel, recs) {
    var wrap = doc.querySelector(sel);
    if (!recs.length) { wrap.innerHTML = ''; return; }
    recs.sort(function (a, b) { return b.createdAt - a.createdAt; });

    var html = '';
    recs.forEach(function (r, i) {
      var t = new Date(r.createdAt);
      var ts = t.getFullYear() + '/' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' +
        String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      var moodLabel = MOODS[r.mood] || '';
      var preview = (r.text || '').slice(0, 60);
      if (preview.length >= 60) preview += '…';
      var cls = i === 0 ? 'collect-card cc-front' : 'collect-card cc-back';
      html += '<div class="' + cls + '" data-id="' + r.id + '">' +
        collectDecoStars(i === 0) +
        '<div class="cc-text">' + escape(preview) + '</div>' +
        '<div class="cc-meta">' +
          '<span>' + moodLabel + (r.tag ? ' · ' + (TAGS[r.tag] || '') : '') + ' · ' + ts + '</span>' +
        '</div>' +
      '</div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.collect-card').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.dataset.id); });
    });
  }

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
        rec.images.forEach(function (src) { html += '<img src="' + src + '">'; });
        html += '</div>';
      }
      if (rec.text) html += '<div class="bd-text">' + escape(rec.text) + '</div>';
      if (rec.voiceUrl) {
        html += '<div class="bd-text"><audio src="' + rec.voiceUrl + '" controls style="width:100%"></audio></div>';
      }
      html += '<div class="bd-actions">';
      if (!rec.archived) html += '<button class="da-btn" data-act="archive">归档</button>';
      html += '<button class="da-btn danger" data-act="delete">删除</button>';
      html += '</div>';
      body.innerHTML = html;

      body.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.dataset.act;
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

      doc.getElementById('detail').hidden = false;
    });
  }
  function closeDetail() { doc.getElementById('detail').hidden = true; }
  doc.getElementById('detail-mask').addEventListener('click', closeDetail);

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
})();

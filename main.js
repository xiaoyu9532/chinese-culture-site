/**
 * 传统中国风文化页 · 交互与动效
 * - 滚动背景渐变、3D 卡片翻转、四季切换与粒子、TTS、墨迹画布、无障碍
 */

(function () {
  'use strict';

  // ---------- 1. 滚动背景渐变（在四季背景之上叠加一层淡渐变，随滚动略变暖，不盖住景物）----------
  function initScrollBackground() {
    function updateBackground() {
      var scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        document.body.style.setProperty('--scroll-overlay', 'transparent');
        return;
      }
      var p = Math.min(1, window.scrollY / scrollHeight);
      var opacity = 0.15 * p;
      document.body.style.setProperty('--scroll-overlay', 'linear-gradient(135deg, transparent 0%, rgba(232,224,212,' + opacity + ') 100%)');
    }
    window.addEventListener('scroll', updateBackground, { passive: true });
    updateBackground();
  }

  // ---------- 2. 3D 卡片：hover 翻转，click 锁定/解锁 ----------
  function initCards() {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.read-aloud-btn')) return;
        card.classList.toggle('flipped');
      });
      card.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (e.target.closest('.read-aloud-btn')) return;
        card.classList.toggle('flipped');
      });
    });
  }

  // ---------- 3. 移动端导航折叠 ----------
  function initNavToggle() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
  }

  // ---------- 4. 四季切换 + 环境音 + 粒子（30 秒后飘落）----------
  var currentSeason = 'spring';
  var ambientAudio = null;
  var particlesTimer = null;
  var particleCount = 0;

  var seasonThemes = {
    spring: { text: '春 · 樱花与鸟鸣', particle: 'cherry', color: '#E8B4B8' },
    summer: { text: '夏 · 荷风与蝉鸣', particle: 'leaf', color: '#7CB342' },
    autumn: { text: '秋 · 枫叶与虫鸣', particle: 'leaf', color: '#C62828' },
    winter: { text: '冬 · 雪花与寂静', particle: 'snow', color: '#B0BEC5' }
  };

  function setSeason(season) {
    currentSeason = season;
    document.body.classList.remove('season-spring', 'season-summer', 'season-autumn', 'season-winter');
    document.body.classList.add('season-' + season);
    document.querySelectorAll('.season-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-season') === season);
    });
    var hint = document.querySelector('.season-hint');
    if (hint) hint.textContent = '当前：' + seasonThemes[season].text;
    scheduleParticles();
  }

  function scheduleParticles() {
    if (particlesTimer) clearTimeout(particlesTimer);
    var container = document.getElementById('particles-container');
    if (!container) return;
    container.innerHTML = '';
    particleCount = 0;
    particlesTimer = setTimeout(function () {
      startParticles(container, seasonThemes[currentSeason].particle, seasonThemes[currentSeason].color);
    }, 30000);
  }

  function startParticles(container, type, color) {
    var count = type === 'snow' ? 40 : 25;
    for (var i = 0; i < count; i++) {
      setTimeout(function () {
        var el = document.createElement('div');
        el.className = 'particle';
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (8 + Math.random() * 8) + 's';
        el.style.animationDelay = Math.random() * 2 + 's';
        el.style.background = color;
        el.style.opacity = type === 'snow' ? '0.9' : '0.7';
        if (type === 'snow') el.style.borderRadius = '50%';
        container.appendChild(el);
        setTimeout(function () { el.remove(); }, 16000);
      }, i * 80);
    }
  }

  function ensureSeasonBodyClass() {
    if (!document.body.classList.contains('season-spring') && !document.body.classList.contains('season-summer') &&
        !document.body.classList.contains('season-autumn') && !document.body.classList.contains('season-winter')) {
      document.body.classList.add('season-spring');
    }
  }

  function initSeasons() {
    ensureSeasonBodyClass();
    document.querySelectorAll('.season-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSeason(btn.getAttribute('data-season'));
      });
    });
    var audioBtn = document.getElementById('toggleAmbient');
    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        if (!ambientAudio) {
          ambientAudio = new Audio();
          ambientAudio.loop = true;
          // 无实际音频文件时静音，仅占位；有文件可设 ambientAudio.src = 'audio/spring.mp3'
        }
        if (ambientAudio.paused) {
          ambientAudio.play().catch(function () {});
          audioBtn.textContent = '暂停环境音';
        } else {
          ambientAudio.pause();
          audioBtn.textContent = '环境音';
        }
      });
    }
    scheduleParticles();
  }

  // ---------- 5. TTS 朗读诗句（诗人般：慢速、略低音、优先中文男声/沉稳声线，分句停顿）----------
  function getPoetVoice() {
    var voices = window.speechSynthesis.getVoices();
    var zh = voices.filter(function (v) { return v.lang === 'zh-CN' || v.lang === 'zh-TW'; });
    if (zh.length === 0) return null;
    var prefer = zh.filter(function (v) {
      return v.name.indexOf('Male') !== -1 || v.name.indexOf('男') !== -1 || v.name.indexOf('Yunyang') !== -1 ||
             v.name.indexOf('Huihui') !== -1 || v.name.indexOf('Kangkang') !== -1;
    });
    return (prefer.length ? prefer[0] : zh[0]);
  }

  function speak(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'zh-CN';
    u.rate = 0.72;
    u.pitch = 0.94;
    var voice = getPoetVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  function speakLikePoet(fullText) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var text = fullText.replace(/^——[\s\S]*$/gm, '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var parts = text.split(/([，。、；])/).filter(function (p) { return p.trim().length > 0; });
    var queue = [];
    for (var i = 0; i < parts.length; i++) {
      if (/^[，。、；]$/.test(parts[i])) {
        if (queue.length) queue[queue.length - 1] += parts[i];
      } else {
        queue.push(parts[i]);
      }
    }
    if (queue.length === 0) queue.push(text);
    var voice = getPoetVoice();
    var idx = 0;
    function next() {
      if (idx >= queue.length) return;
      var u = new SpeechSynthesisUtterance(queue[idx]);
      u.lang = 'zh-CN';
      u.rate = 0.72;
      u.pitch = 0.94;
      if (voice) u.voice = voice;
      u.onend = function () {
        idx++;
        setTimeout(function () {
          if (idx < queue.length) next();
        }, 380);
      };
      window.speechSynthesis.speak(u);
    }
    next();
  }

  function initTTS() {
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () { getPoetVoice(); };
    document.querySelectorAll('.read-aloud-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = this.closest('.card-back') || this.closest('.poetry-card');
        var textEl = card ? (card.querySelector('.card-detail') || card.querySelector('.poetry-text')) : null;
        if (textEl) speakLikePoet(textEl.textContent);
      });
    });
  }

  // ---------- 6. 墨迹画布：毛笔轨迹，离开渐隐 ----------
  function initInkCanvas() {
    var canvas = document.getElementById('ink-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var drawing = false;
    var fadeTimer = null;

    function draw(x, y) {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(62, 58, 57, 0.25)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function fadeOut() {
      if (!ctx) return;
      var alpha = 1;
      function step() {
        alpha -= 0.02;
        if (alpha <= 0) return;
        ctx.fillStyle = 'rgba(248, 244, 233, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        alpha = Math.max(0, alpha);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function getXY(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    canvas.addEventListener('mousedown', function (e) {
      drawing = true;
      if (fadeTimer) clearTimeout(fadeTimer);
      var xy = getXY(e);
      draw(xy.x, xy.y);
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!drawing) return;
      var xy = getXY(e);
      draw(xy.x, xy.y);
    });
    canvas.addEventListener('mouseup', function () {
      drawing = false;
      fadeTimer = setTimeout(fadeOut, 800);
    });
    canvas.addEventListener('mouseleave', function () {
      drawing = false;
      fadeTimer = setTimeout(fadeOut, 800);
    });
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      drawing = true;
      if (fadeTimer) clearTimeout(fadeTimer);
      var xy = getXY(e);
      draw(xy.x, xy.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (!drawing) return;
      var xy = getXY(e);
      draw(xy.x, xy.y);
    }, { passive: false });
    canvas.addEventListener('touchend', function () {
      drawing = false;
      fadeTimer = setTimeout(fadeOut, 800);
    });

    document.getElementById('clear-ink').addEventListener('click', function () {
      ctx.fillStyle = '#F8F4E9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }

  // ---------- 7. 返回顶部 ----------
  function initBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- 8. 访问次数欢迎语（≥3 次显示）----------
  function initWelcome() {
    var key = 'culture_visit_count';
    var count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(count));
    var el = document.getElementById('welcome-msg');
    if (el && count >= 3) {
      el.textContent = '您已多次到访，正所谓「有朋自远方来，不亦乐乎」。';
    }
  }

  // ---------- 9. 古琴区（可选：滚动到书法区播放轻柔音效）----------
  function initGuqinHint() {
    var section = document.querySelector('.calligraphy-section');
    if (!section) return;
    var played = false;
    function check() {
      var rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.8 && !played) {
        played = true;
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 220;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {}
      }
    }
    window.addEventListener('scroll', check, { passive: true });
  }

  // ---------- 入口 ----------
  function init() {
    initScrollBackground();
    initCards();
    initNavToggle();
    initSeasons();
    initTTS();
    initInkCanvas();
    initBackToTop();
    initWelcome();
    initGuqinHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

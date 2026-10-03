/* Ayush Kumar Singh · portfolio interactions. Vanilla JS, no dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  function stored() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem("theme", v); } catch (e) { /* storage unavailable */ } }
  function systemDark() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function current() { return root.getAttribute("data-theme") || (systemDark() ? "dark" : "light"); }
  function apply(t) {
    root.setAttribute("data-theme", t);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    });
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }
  var s = stored();
  apply(s === "light" || s === "dark" ? s : current());
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () { var n = current() === "dark" ? "light" : "dark"; apply(n); save(n); });
  });

  /* ---------- Nav: scrolled state, reading progress, mobile menu ---------- */
  var nav = document.querySelector(".nav");
  var bar = document.querySelector(".progress");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
    if (bar) { var h = document.documentElement.scrollHeight - window.innerHeight; bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%"; }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  var menu = document.querySelector(".mobile-menu");
  var menuBtn = document.querySelector("[data-menu-toggle]");
  function setMenu(open) { if (!menu || !menuBtn) return; menu.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open ? "true" : "false"); }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- Scroll-spy for nav links and case-study TOC ---------- */
  function spy(selector) {
    var links = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { var id = (a.getAttribute("href") || "").split("#")[1]; if (id && document.getElementById(id)) map[id] = a; });
    var vis = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vis[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, r = 0;
      Object.keys(vis).forEach(function (id) { if (vis[id] > r) { r = vis[id]; best = id; } });
      links.forEach(function (a) { a.classList.remove("active"); a.removeAttribute("aria-current"); });
      if (best && map[best]) { map[best].classList.add("active"); map[best].setAttribute("aria-current", "true"); }
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.01, 0.1, 0.25, 0.5, 1] });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
  spy(".nav-links a[href*='#']");
  spy(".toc a");

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rio.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- Animated counters (once) ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Work filters ---------- */
  var filterBar = document.querySelector("[data-work-filters]");
  if (filterBar) {
    var cards = document.querySelectorAll("[data-tags]");
    filterBar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]"); if (!b) return;
      var f = b.getAttribute("data-filter");
      filterBar.querySelectorAll("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      cards.forEach(function (c) {
        var show = f === "all" || c.getAttribute("data-tags").split(" ").indexOf(f) > -1;
        c.classList.toggle("is-hidden", !show);
      });
    });
  }

  /* ---------- Process tabs ---------- */
  var tabs = document.querySelectorAll("[role=tab][data-step]");
  if (tabs.length) {
    function select(btn) {
      tabs.forEach(function (t) {
        var on = t === btn;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowDown" || k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (k === "ArrowUp" || k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
  }

  /* ---------- Toast + copy email ---------- */
  var toast = document.querySelector(".toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(showToast._t); showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  window.__toast = showToast;
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showToast("Copied: " + text); }, function () { window.location.href = "mailto:" + text; });
      } else { window.location.href = "mailto:" + text; }
    });
  });

  /* ---------- Lightbox for wireframes ---------- */
  var lb = document.querySelector("dialog.lightbox");
  var shots = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (lb && shots.length) {
    var img = lb.querySelector("img"), cap = lb.querySelector("[data-lb-title]"), idx = 0;
    function show(i) {
      idx = (i + shots.length) % shots.length;
      var s = shots[idx];
      img.src = s.getAttribute("data-lightbox"); img.alt = s.getAttribute("data-title") || "";
      cap.textContent = (s.getAttribute("data-title") || "") + "  ·  " + (idx + 1) + " / " + shots.length;
    }
    shots.forEach(function (s, i) { s.addEventListener("click", function () { show(i); lb.showModal(); }); });
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { show(idx + 1); });
    lb.querySelector("[data-lb-close]").addEventListener("click", function () { lb.close(); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) lb.close(); });
    lb.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") show(idx + 1); if (e.key === "ArrowLeft") show(idx - 1); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

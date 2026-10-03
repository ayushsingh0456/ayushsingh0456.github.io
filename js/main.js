/* Ayush Kumar Singh — portfolio interactions. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme (light / dark / system) ---------- */
  function storedTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function saveTheme(v) {
    try { localStorage.setItem("theme", v); } catch (e) { /* storage unavailable */ }
  }
  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function currentTheme() {
    return root.getAttribute("data-theme") || (systemDark() ? "dark" : "light");
  }
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    });
  }
  var initial = storedTheme();
  if (initial === "light" || initial === "dark") applyTheme(initial);
  else applyTheme(currentTheme());

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      saveTheme(next);
    });
  });

  /* ---------- Pointer spotlight ---------- */
  var spot = document.querySelector(".spotlight");
  if (spot && !reduceMotion) {
    var raf = null;
    window.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        spot.style.setProperty("--mx", e.clientX + "px");
        spot.style.setProperty("--my", e.clientY + "px");
        raf = null;
      });
    }, { passive: true });
  }

  /* ---------- Mobile top bar + menu ---------- */
  var topbar = document.querySelector(".topbar");
  var menu = document.querySelector(".menu");
  var menuBtn = document.querySelector("[data-menu-toggle]");
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }
  function onScroll() {
    if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 8);
    var bar = document.querySelector(".progress");
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Active section highlighting (home nav + case-study TOC) ---------- */
  function trackSections(linkSelector, activeClass) {
    var links = Array.prototype.slice.call(document.querySelectorAll(linkSelector));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) {
      var id = (a.getAttribute("href") || "").replace("#", "");
      var el = id && document.getElementById(id);
      if (el) map[id] = a;
    });
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; } });
      if (best) {
        links.forEach(function (a) { a.classList.remove(activeClass); a.removeAttribute("aria-current"); });
        map[best].classList.add(activeClass);
        map[best].setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
  trackSections(".section-nav a", "active");
  trackSections(".toc a", "active");

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); rio.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- Copy email ---------- */
  var toast = document.querySelector(".toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () { showToast("Email copied: " + text); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.location.href = "mailto:" + text; });
      } else {
        window.location.href = "mailto:" + text;
      }
    });
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

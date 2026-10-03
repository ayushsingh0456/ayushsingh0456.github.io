/* Document viewer, library filters and traceability explorer.
   Documents are fetched live from the public GitHub repositories and rendered in the page. */
(function () {
  "use strict";
  var RAW = "https://raw.githubusercontent.com/ayushsingh0456/";
  var BLOB = "https://github.com/ayushsingh0456/";
  var CDN = {
    marked: "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js",
    mermaid: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs",
    yaml: "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs"
  };
  var idxEl = document.getElementById("doc-index");
  var INDEX = idxEl ? JSON.parse(idxEl.textContent) : { projects: {}, docs: [] };
  var BY_ID = {};
  INDEX.docs.forEach(function (d) { BY_ID[d.id] = d; });
  var BASE = document.documentElement.getAttribute("data-base") || "";

  var libs = {};
  function lib(name) { if (!libs[name]) libs[name] = import(CDN[name]); return libs[name]; }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slug(t) { return t.toLowerCase().trim().replace(/[^\p{L}\p{N}_\- ]+/gu, "").replace(/\s/g, "-"); }
  function dirname(p) { var i = p.lastIndexOf("/"); return i < 0 ? "" : p.slice(0, i); }
  function norm(p) { var out = []; p.split("/").forEach(function (s) { if (s === "..") out.pop(); else if (s && s !== ".") out.push(s); }); return out.join("/"); }
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function findDoc(project, path) { for (var i = 0; i < INDEX.docs.length; i++) { var d = INDEX.docs[i]; if (d.project === project && d.path === path) return d; } return null; }

  /* ---------- viewer ---------- */
  var dlg = document.querySelector("dialog.viewer");
  if (!dlg) return;
  var elTitle = dlg.querySelector("[data-vw-title]"), elPath = dlg.querySelector("[data-vw-path]"), elKind = dlg.querySelector("[data-vw-kind]");
  var elBody = dlg.querySelector(".vw-body"), elToc = dlg.querySelector(".vw-toc"), elPdf = dlg.querySelector("[data-vw-pdf]"), elGh = dlg.querySelector("[data-vw-gh]"), elLink = dlg.querySelector("[data-vw-link]");
  var currentId = null;

  function skeleton() {
    return '<div class="vw-loading"><div class="sk h"></div><div class="sk"></div><div class="sk" style="width:92%"></div><div class="sk" style="width:84%"></div><div class="sk" style="width:96%"></div><div class="sk" style="width:70%"></div></div>';
  }

  function open(id, push) {
    var d = BY_ID[id]; if (!d) return;
    currentId = id;
    var proj = INDEX.projects[d.project];
    elTitle.textContent = d.title;
    elPath.textContent = proj.name + " · " + d.path;
    elKind.textContent = d.kind; elKind.setAttribute("data-k", d.kind);
    elGh.href = BLOB + proj.slug + "/blob/main/" + d.path;
    if (d.pdf) { elPdf.hidden = false; elPdf.href = BASE + d.pdf; } else { elPdf.hidden = true; }
    elBody.innerHTML = skeleton(); elToc.innerHTML = "";
    if (!dlg.open) dlg.showModal();
    elBody.scrollTop = 0;
    elBody.focus({ preventScroll: true });
    if (push !== false) { try { history.replaceState(null, "", "#doc=" + encodeURIComponent(id)); } catch (e) {} }
    render(d).catch(function (err) {
      elBody.innerHTML = '<div class="vw-error"><p><b>This document could not be loaded here.</b></p><p>' + esc(err && err.message ? err.message : "Network error") + '</p><p><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + elGh.href + '">Open it on GitHub</a></p></div>';
    });
  }

  function close() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener("close", function () {
    currentId = null;
    if (location.hash.indexOf("#doc=") === 0) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  });
  dlg.querySelector("[data-vw-close]").addEventListener("click", close);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  elLink.addEventListener("click", function () {
    var url = location.origin + location.pathname.replace(/[^/]*$/, "") + (document.documentElement.getAttribute("data-library") || "library.html") + "#doc=" + encodeURIComponent(currentId);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { window.__toast && window.__toast("Link copied"); });
  });

  async function render(d) {
    var proj = INDEX.projects[d.project];
    var ext = d.path.split(".").pop().toLowerCase();
    var note = '<div class="vw-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>' + esc(proj.note) + "</span></div>";
    if (ext === "svg") {
      var src = d.local ? BASE + d.local : RAW + proj.slug + "/main/" + d.path;
      elBody.innerHTML = note + '<div class="md"><h1>' + esc(d.title) + '</h1><p>' + esc(d.blurb || "") + '</p><img src="' + src + '" alt="' + esc(d.title) + '"></div>';
      return;
    }
    var res = await fetch(RAW + proj.slug + "/main/" + d.path);
    if (!res.ok) throw new Error("GitHub returned " + res.status + " for " + d.path);
    var text = await res.text();
    var html;
    if (ext === "md") html = await renderMd(text, d, proj);
    else if (ext === "csv") html = renderCsv(text, d);
    else if (ext === "yaml" || ext === "yml") html = await renderOpenApi(text, d);
    else html = '<div class="md"><h1>' + esc(d.title) + "</h1><pre><code>" + esc(text.slice(0, 200000)) + "</code></pre></div>";
    if (currentId !== d.id) return;
    elBody.innerHTML = note + html;
    wireLinks(d, proj);
    buildToc();
    await drawMermaid();
  }

  async function renderMd(text, d, proj) {
    var m = await lib("marked");
    var marked = m.marked || m.default;
    var renderer = new marked.Renderer();
    var baseCode = renderer.code.bind(renderer);
    renderer.code = function (code, lang) {
      if (typeof code === "object") { lang = code.lang; code = code.text; }
      if ((lang || "").trim() === "mermaid") return '<div class="mermaid">' + esc(code) + "</div>";
      return "<pre><code>" + esc(code) + "</code></pre>";
    };
    var html = marked.parse(text, { renderer: renderer, gfm: true });
    return '<div class="md">' + html + "</div>";
  }

  function wireLinks(d, proj) {
    var dir = dirname(d.path);
    var used = {};
    elBody.querySelectorAll(".md h1, .md h2, .md h3, .md h4").forEach(function (h) {
      var s = slug(h.textContent); var n = s, i = 1;
      while (used[n]) { n = s + "-" + i++; }
      used[n] = 1; h.id = n;
    });
    elBody.querySelectorAll(".md a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (/^https?:|^mailto:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; return; }
      if (href.charAt(0) === "#") {
        a.addEventListener("click", function (e) { e.preventDefault(); var t = elBody.querySelector("#" + CSS.escape(decodeURIComponent(href.slice(1)))); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
        return;
      }
      var parts = href.split("#");
      var target = norm(dir ? dir + "/" + parts[0] : parts[0]);
      var known = findDoc(d.project, target);
      if (known) {
        a.href = "#doc=" + encodeURIComponent(known.id);
        a.addEventListener("click", function (e) { e.preventDefault(); open(known.id); });
      } else {
        a.href = BLOB + proj.slug + "/blob/main/" + target + (parts[1] ? "#" + parts[1] : "");
        a.target = "_blank"; a.rel = "noopener";
      }
    });
    elBody.querySelectorAll(".md td, .md th").forEach(function (c) {
      var t = c.textContent.trim();
      if (t.length <= 16 && /^[\w.\-\/:]+$/.test(t)) c.style.whiteSpace = "nowrap";
    });
    elBody.querySelectorAll(".md img[src]").forEach(function (img) {
      var src = img.getAttribute("src");
      if (/^https?:|^data:/.test(src)) return;
      var target = norm(dir ? dir + "/" + src : src);
      var local = (INDEX.local || {})[d.project + ":" + target];
      img.src = local ? BASE + local : RAW + proj.slug + "/main/" + target;
      img.loading = "lazy";
    });
  }

  function buildToc() {
    var hs = elBody.querySelectorAll(".md h2, .md h3");
    if (hs.length < 3) { elToc.innerHTML = ""; return; }
    var out = "<p>On this page</p>";
    hs.forEach(function (h) { out += '<a class="' + (h.tagName === "H3" ? "l3" : "l2") + '" href="#' + h.id + '">' + esc(h.textContent) + "</a>"; });
    elToc.innerHTML = out;
    elToc.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); var t = elBody.querySelector("#" + CSS.escape(a.getAttribute("href").slice(1))); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
    });
  }

  async function drawMermaid() {
    var nodes = elBody.querySelectorAll(".mermaid");
    if (!nodes.length) return;
    try {
      var mm = await lib("mermaid");
      var mermaid = mm.default || mm;
      var dark = isDark();
      mermaid.initialize({
        startOnLoad: false, securityLevel: "strict", theme: "base",
        themeVariables: dark ? {
          fontFamily: "Inter, sans-serif", fontSize: "14px", darkMode: true, background: "#11161e",
          primaryColor: "#173a37", primaryBorderColor: "#3fd0bd", primaryTextColor: "#eceef2", lineColor: "#8b93a3",
          secondaryColor: "#2a2118", tertiaryColor: "#161c26", noteBkgColor: "#2a2418", noteTextColor: "#eceef2",
          actorBkg: "#173a37", actorBorder: "#3fd0bd", actorTextColor: "#eceef2", signalColor: "#c3c8d2", signalTextColor: "#eceef2", labelTextColor: "#eceef2",
          edgeLabelBackground: "#161c26", clusterBkg: "#141a23", clusterBorder: "#2f3949", titleColor: "#eceef2", textColor: "#eceef2"
        } : {
          fontFamily: "Inter, sans-serif", fontSize: "14px", primaryColor: "#e7f3f1", primaryBorderColor: "#0e7a6d", primaryTextColor: "#13151a",
          lineColor: "#5b6170", secondaryColor: "#f6efe6", tertiaryColor: "#f4f2ed", noteBkgColor: "#fff8e6", noteBorderColor: "#d9c08a",
          actorBkg: "#e7f3f1", actorBorder: "#0e7a6d", signalColor: "#3b404b", edgeLabelBackground: "#ffffff", clusterBkg: "#faf9f6", clusterBorder: "#d9d4c8"
        }
      });
      await mermaid.run({ nodes: nodes, suppressErrors: true });
    } catch (e) {
      nodes.forEach(function (n) { n.innerHTML = "<pre><code>" + esc(n.textContent) + "</code></pre>"; });
    }
  }

  function parseCsv(text) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function renderCsv(text, d) {
    var rows = parseCsv(text).filter(function (r) { return r.length > 1 || r[0]; });
    var head = rows.shift() || [];
    var shown = rows.slice(0, 400);
    var out = '<div class="md"><h1>' + esc(d.title) + "</h1><p>" + esc(d.blurb || "") + " " + rows.length + " rows" + (rows.length > shown.length ? ", first " + shown.length + " shown" : "") + ".</p><table><thead><tr>";
    head.forEach(function (h) { out += "<th>" + esc(h) + "</th>"; });
    out += "</tr></thead><tbody>";
    shown.forEach(function (r) { out += "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; });
    return out + "</tbody></table></div>";
  }
  async function renderOpenApi(text, d) {
    var y = await lib("yaml");
    var spec = (y.load || y.default.load)(text);
    var info = spec.info || {};
    var groups = {}, count = 0;
    Object.keys(spec.paths || {}).forEach(function (p) {
      var item = spec.paths[p];
      ["get", "post", "put", "patch", "delete"].forEach(function (m) {
        if (!item[m]) return; count++;
        var op = item[m]; var tag = (op.tags && op.tags[0]) || "Other";
        (groups[tag] = groups[tag] || []).push({ m: m, p: p, s: op.summary || op.operationId || "", r: op["x-requirements"] || [] });
      });
    });
    var out = '<div class="md"><h1>' + esc(info.title || d.title) + "</h1><p>OpenAPI " + esc(spec.openapi || "") + " · version " + esc(info.version || "") + " · " + count + " operations.</p>";
    if (info.description) out += "<blockquote><p>" + esc(String(info.description).split("\n\n")[0]) + "</p></blockquote>";
    Object.keys(groups).forEach(function (g) {
      out += '<div class="api-group">' + esc(g) + "</div>";
      groups[g].forEach(function (o) {
        var req = Array.isArray(o.r) ? o.r : String(o.r).split(/[;,]\s*/);
        out += '<div class="op"><span class="m ' + o.m + '">' + o.m.toUpperCase() + "</span><div><code>" + esc(o.p) + "</code><small>" + esc(o.s) + "</small>" + (req.length && req[0] ? '<div class="req">' + req.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "") + "</div></div>";
      });
    });
    return out + "</div>";
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-doc]");
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute("data-doc"));
  });
  document.addEventListener("themechange", function () { if (currentId && dlg.open) open(currentId, false); });
  function fromHash() { var m = location.hash.match(/^#doc=(.+)$/); if (m) open(decodeURIComponent(m[1]), false); }
  fromHash();
  window.addEventListener("hashchange", fromHash);

  /* ---------- library filters ---------- */
  var lib$ = document.querySelector("[data-library]");
  if (lib$) {
    var state = { project: "all", group: "all", q: "" };
    var cards = Array.prototype.slice.call(lib$.querySelectorAll(".doc-card"));
    var countEl = document.querySelector("[data-lib-count]"), empty = document.querySelector("[data-lib-empty]");
    function apply() {
      var n = 0;
      cards.forEach(function (c) {
        var ok = (state.project === "all" || c.dataset.project === state.project) && (state.group === "all" || c.dataset.group === state.group) && (!state.q || c.dataset.text.indexOf(state.q) > -1);
        c.classList.toggle("is-hidden", !ok); c.style.display = ok ? "" : "none"; if (ok) n++;
      });
      if (countEl) countEl.textContent = n + (n === 1 ? " document" : " documents");
      if (empty) empty.hidden = n !== 0;
      /* faceted counts: each badge shows matches given the other active filters */
      ["project", "group"].forEach(function (key) {
        var other = key === "project" ? "group" : "project";
        document.querySelectorAll('[data-lib-filter="' + key + '"] [data-value]').forEach(function (b) {
          var v = b.getAttribute("data-value"), badge = b.querySelector(".count");
          var m = cards.filter(function (c) {
            return (v === "all" || c.dataset[key] === v) && (state[other] === "all" || c.dataset[other] === state[other]) && (!state.q || c.dataset.text.indexOf(state.q) > -1);
          }).length;
          if (badge) badge.textContent = m;
          b.classList.toggle("is-empty", m === 0 && v !== "all");
        });
      });
    }
    document.querySelectorAll("[data-lib-filter]").forEach(function (bar) {
      var key = bar.getAttribute("data-lib-filter");
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-value]"); if (!b) return;
        state[key] = b.getAttribute("data-value");
        bar.querySelectorAll("[data-value]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        apply();
      });
    });
    var q = document.querySelector("[data-lib-search]");
    if (q) q.addEventListener("input", function () { state.q = q.value.trim().toLowerCase(); apply(); });
    var pm = location.search.match(/[?&]project=(\w+)/);
    if (pm) { var pb = document.querySelector('[data-lib-filter="project"] [data-value="' + pm[1] + '"]'); if (pb) pb.click(); }
    apply();
  }

  /* ---------- traceability explorer ---------- */
  document.querySelectorAll("[data-trace]").forEach(function (box) {
    var data = JSON.parse(document.getElementById(box.getAttribute("data-trace")).textContent);
    var list = box.querySelector(".fr-list"), chain = box.querySelector(".chain"), head = box.querySelector(".trace-x-head");
    var obj = "all", sel = null;
    function pills(arr, cls) { return arr && arr.length ? arr.map(function (x) { return '<span class="idpill ' + (cls || "") + '">' + esc(x) + "</span>"; }).join("") : '<span class="muted" style="font-size:13px">None</span>'; }
    function showChain(r) {
      sel = r.id;
      list.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.id === r.id ? "true" : "false"); });
      var objs = r.obj.map(function (o) { var f = data.objectives.filter(function (x) { return x.id === o; })[0]; return o + (f ? " · " + f.name : ""); });
      chain.innerHTML = '<div class="stmt"><span class="id">' + esc(r.id) + " · " + esc(r.priority || "") + " · " + esc(r.release || "") + "</span>" + esc(r.text) + '</div><dl class="links">' +
        '<div class="link-row"><dt>Objective</dt><dd>' + pills(objs) + "</dd></div>" +
        '<div class="link-row"><dt>Business rules</dt><dd>' + pills(r.br) + "</dd></div>" +
        '<div class="link-row"><dt>User stories</dt><dd>' + pills(r.us) + (r.ac ? '<span class="idpill">' + r.ac + " acceptance criteria</span>" : "") + "</dd></div>" +
        '<div class="link-row"><dt>API</dt><dd>' + pills(r.api) + "</dd></div>" +
        '<div class="link-row"><dt>Tests</dt><dd>' + pills(r.tc) + "</dd></div>" +
        '<div class="link-row"><dt>Status</dt><dd>' + pills([r.status], /^verified$/i.test(r.status) ? "ok" : "") + "</dd></div></dl>";
    }
    function fill() {
      var rows = data.rows.filter(function (r) { return obj === "all" || r.obj.indexOf(obj) > -1; });
      list.innerHTML = rows.map(function (r) { return '<button type="button" role="option" data-id="' + esc(r.id) + '"><b>' + esc(r.id) + "</b><span>" + esc(r.text) + "</span></button>"; }).join("");
      var keep = rows.filter(function (r) { return r.id === sel; })[0] || rows[0];
      if (keep) showChain(keep);
      box.querySelector("[data-trace-count]").textContent = rows.length + " of " + data.rows.length + " requirements";
    }
    head.addEventListener("click", function (e) {
      var b = e.target.closest("[data-obj]"); if (!b) return;
      obj = b.getAttribute("data-obj");
      head.querySelectorAll("[data-obj]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      fill();
    });
    list.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-id]"); if (!b) return;
      showChain(data.rows.filter(function (r) { return r.id === b.dataset.id; })[0]);
    });
    fill();
  });
})();

/* Shared exam engine. A paper page defines window.PAPER and calls startExam(). */
(function () {
  "use strict";

  var DOMAINS = {
    1: "IaC with Terraform",
    2: "Terraform fundamentals",
    3: "Core workflow",
    4: "Configuration",
    5: "Modules",
    6: "State management",
    7: "Maintain infrastructure",
    8: "HCP Terraform"
  };
  var PASS_PERCENT = 70;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function rich(s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function fmtTime(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function optionsOf(q) {
    return q.t === "tf" ? ["True", "False"] : (q.o || []);
  }
  function selectCount(q) {
    return q.t === "multi" ? q.a.length : 1;
  }
  function isAnswered(q, ans) {
    if (q.t === "text") return norm(ans) !== "";
    return Array.isArray(ans) && ans.length > 0;
  }
  function isCorrect(q, ans) {
    if (!isAnswered(q, ans)) return false;
    if (q.t === "text") {
      return q.a.some(function (x) { return norm(x) === norm(ans); });
    }
    var a = ans.slice().sort().join(","), b = q.a.slice().sort().join(",");
    return a === b;
  }
  function describeAnswer(q, ans) {
    if (!isAnswered(q, ans)) return "<em>Not answered</em>";
    if (q.t === "text") return "<code>" + esc(ans) + "</code>";
    var opts = optionsOf(q);
    return ans.slice().sort().map(function (i) { return rich(opts[i]); }).join("; ");
  }
  function describeCorrect(q) {
    if (q.t === "text") return q.a.map(function (x) { return "<code>" + esc(x) + "</code>"; }).join(" or ");
    var opts = optionsOf(q);
    return q.a.slice().sort().map(function (i) { return rich(opts[i]); }).join("; ");
  }

  window.startExam = function (paper) {
    var app = document.getElementById("app");
    var Q = paper.questions;
    var KEY = "tfexam:" + paper.id;
    var state = { answers: {}, flagged: {}, cur: 0, endTime: 0, submitted: false, finishedAt: 0 };
    var timerId = null;

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage may be blocked */ }
    }
    function load() {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var s = JSON.parse(raw);
        if (s && s.answers && s.endTime) return s;
      } catch (e) { /* ignore */ }
      return null;
    }
    function clear() {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    }

    /* ---------- intro ---------- */
    function showIntro() {
      document.title = paper.title;
      var saved = load();
      var resume = saved && !saved.submitted && saved.endTime > Date.now();
      var done = saved && (saved.submitted || saved.endTime <= Date.now());
      var perDomain = {};
      Q.forEach(function (q) { perDomain[q.d] = (perDomain[q.d] || 0) + 1; });
      var rows = Object.keys(perDomain).map(function (d) {
        return "<tr><td>" + DOMAINS[d] + "</td><td>" + perDomain[d] + "</td></tr>";
      }).join("");

      app.innerHTML =
        '<p><a href="index.html">&larr; All papers</a></p>' +
        "<h1>" + esc(paper.title) + "</h1>" +
        '<p class="muted">' + esc(paper.subtitle) + "</p>" +
        '<div class="grid">' +
        '<div class="card stat"><b>' + Q.length + '</b><span class="muted">questions</span></div>' +
        '<div class="card stat"><b>' + paper.minutes + ' min</b><span class="muted">time limit</span></div>' +
        '<div class="card stat"><b>' + PASS_PERCENT + '%</b><span class="muted">pass mark</span></div>' +
        "</div>" +
        '<div class="card"><h2 style="margin-top:0">Rules (same as the real exam)</h2><ul>' +
        "<li>One sitting, one running timer. Closing the tab does <b>not</b> pause it (your progress is kept on this device, the clock keeps running).</li>" +
        "<li>Question types: single choice, <b>multiple answer</b> (the question tells you how many), true/false and type-in answers.</li>" +
        "<li>Multiple-answer questions are <b>all or nothing</b>. No negative marking, so never leave a question blank.</li>" +
        "<li>You can <b>flag</b> questions and jump back to them from the question grid.</li>" +
        "<li>No notes, no terminal, no documentation. Treat it as the real thing.</li>" +
        "<li>The result and a full explanation of every question appear only after you submit (or time runs out).</li>" +
        "</ul></div>" +
        '<div class="card"><h2 style="margin-top:0">Domain coverage</h2><table><tr><th>Domain</th><th>Questions</th></tr>' + rows + "</table></div>" +
        '<div class="row" id="introBtns"></div>';

      var box = document.getElementById("introBtns");
      if (resume) {
        var r = el('<button class="btn primary">Resume exam (' + fmtTime(Math.round((saved.endTime - Date.now()) / 1000)) + " left)</button>");
        r.onclick = function () { state = saved; runExam(); };
        var n = el('<button class="btn danger">Discard and start over</button>');
        n.onclick = function () { if (confirm("Discard your saved attempt?")) { clear(); showIntro(); } };
        box.appendChild(r); box.appendChild(n);
      } else if (done) {
        var v = el('<button class="btn primary">View my last result</button>');
        v.onclick = function () { state = saved; if (!state.submitted) { state.submitted = true; state.finishedAt = state.endTime; save(); } showResult(); };
        var s = el('<button class="btn">Start a new attempt</button>');
        s.onclick = function () { clear(); beginNew(); };
        box.appendChild(v); box.appendChild(s);
      } else {
        var b = el('<button class="btn primary">Start exam</button>');
        b.onclick = beginNew;
        box.appendChild(b);
      }
    }

    function beginNew() {
      state = { answers: {}, flagged: {}, cur: 0, endTime: Date.now() + paper.minutes * 60000, submitted: false, finishedAt: 0 };
      save();
      runExam();
    }

    /* ---------- exam ---------- */
    function runExam() {
      app.innerHTML =
        '<div class="topbar"><div class="row spread">' +
        "<strong>" + esc(paper.title) + "</strong>" +
        '<div class="row"><span id="prog" class="muted"></span><span id="timer" class="timer" role="timer" aria-live="off"></span>' +
        '<button id="submitBtn" class="btn primary">Submit</button></div></div></div>' +
        '<div id="qbox"></div>' +
        '<div class="card"><strong>Question grid</strong><div class="nav" id="nav"></div>' +
        '<div class="legend">Filled = answered &nbsp;|&nbsp; orange dot = flagged &nbsp;|&nbsp; outlined = current</div></div>';

      document.getElementById("submitBtn").onclick = function () {
        var un = Q.filter(function (q, i) { return !isAnswered(q, state.answers[i]); }).length;
        var fl = Object.keys(state.flagged).filter(function (k) { return state.flagged[k]; }).length;
        var msg = "Submit your exam now?" + (un ? "\n\n" + un + " question(s) unanswered." : "") + (fl ? "\n" + fl + " flagged for review." : "") + "\n\nYou cannot change answers after submitting.";
        if (confirm(msg)) finish();
      };
      tick();
      timerId = setInterval(tick, 1000);
      renderQ();
    }

    function tick() {
      var left = Math.round((state.endTime - Date.now()) / 1000);
      var t = document.getElementById("timer");
      if (!t) return;
      t.textContent = fmtTime(left);
      t.className = "timer" + (left <= 60 ? " crit" : left <= 300 ? " low" : "");
      if (left <= 0) { alert("Time is up. Your exam will be submitted now."); finish(); }
    }

    function renderQ() {
      var i = state.cur, q = Q[i], opts = optionsOf(q), ans = state.answers[i];
      var box = document.getElementById("qbox");
      var hint = q.t === "multi" ? "Select " + selectCount(q) : q.t === "text" ? "Type your answer" : q.t === "tf" ? "True or false" : "Select one";
      var h =
        '<div class="card"><div class="qmeta"><span class="tag">Question ' + (i + 1) + " of " + Q.length + '</span><span class="tag">' + hint + "</span></div>" +
        '<div class="qtext">' + rich(q.q) + "</div>" + (q.c ? "<pre>" + esc(q.c) + "</pre>" : "") + '<div id="opts"></div></div>' +
        '<div class="row spread"><div class="row">' +
        '<button class="btn" id="prev"' + (i === 0 ? " disabled" : "") + ">&larr; Previous</button>" +
        '<button class="btn" id="next"' + (i === Q.length - 1 ? " disabled" : "") + ">Next &rarr;</button></div>" +
        '<button class="btn" id="flag">' + (state.flagged[i] ? "Unflag" : "Flag for review") + "</button></div>";
      box.innerHTML = h;

      var holder = document.getElementById("opts");
      if (q.t === "text") {
        var inp = el('<input class="textin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer">');
        inp.value = ans || "";
        inp.oninput = function () { state.answers[i] = inp.value; save(); paintNav(); };
        holder.appendChild(inp);
      } else {
        var multi = q.t === "multi";
        opts.forEach(function (text, k) {
          var checked = Array.isArray(ans) && ans.indexOf(k) > -1;
          var lab = el('<label class="opt' + (checked ? " sel" : "") + '"><input type="' + (multi ? "checkbox" : "radio") + '" name="o"' + (checked ? " checked" : "") + "><span>" + rich(text) + "</span></label>");
          lab.querySelector("input").onchange = function (e) {
            var cur = Array.isArray(state.answers[i]) ? state.answers[i].slice() : [];
            if (multi) {
              var at = cur.indexOf(k);
              if (e.target.checked) {
                if (at < 0) cur.push(k);
                if (cur.length > selectCount(q)) { cur.shift(); }
              } else if (at > -1) cur.splice(at, 1);
            } else cur = [k];
            state.answers[i] = cur;
            save();
            renderQ();
          };
          holder.appendChild(lab);
        });
      }
      document.getElementById("prev").onclick = function () { go(i - 1); };
      document.getElementById("next").onclick = function () { go(i + 1); };
      document.getElementById("flag").onclick = function () { state.flagged[i] = !state.flagged[i]; save(); renderQ(); };
      paintNav();
    }

    function go(i) {
      if (i < 0 || i >= Q.length) return;
      state.cur = i; save(); renderQ();
      window.scrollTo({ top: 0 });
    }

    function paintNav() {
      var nav = document.getElementById("nav");
      if (!nav) return;
      nav.innerHTML = "";
      var answered = 0;
      Q.forEach(function (q, i) {
        var done = isAnswered(q, state.answers[i]);
        if (done) answered++;
        var b = el('<button aria-label="Question ' + (i + 1) + (done ? ", answered" : "") + (state.flagged[i] ? ", flagged" : "") + '">' + (i + 1) + "</button>");
        b.className = (done ? "done " : "") + (i === state.cur ? "cur " : "") + (state.flagged[i] ? "flag" : "");
        b.onclick = function () { go(i); };
        nav.appendChild(b);
      });
      document.getElementById("prog").textContent = answered + "/" + Q.length + " answered";
    }

    /* ---------- result ---------- */
    function finish() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      state.submitted = true;
      state.finishedAt = Math.min(Date.now(), state.endTime);
      save();
      showResult();
      window.scrollTo({ top: 0 });
    }

    function showResult() {
      var total = Q.length, right = 0, byDomain = {};
      var results = Q.map(function (q, i) {
        var ok = isCorrect(q, state.answers[i]);
        if (ok) right++;
        var d = byDomain[q.d] || (byDomain[q.d] = { right: 0, total: 0 });
        d.total++; if (ok) d.right++;
        return ok;
      });
      var pct = Math.round((right / total) * 100);
      var pass = pct >= PASS_PERCENT;
      var unanswered = Q.filter(function (q, i) { return !isAnswered(q, state.answers[i]); }).length;
      var used = Math.round((state.finishedAt - (state.endTime - paper.minutes * 60000)) / 1000);

      var domRows = Object.keys(byDomain).map(function (d) {
        var x = byDomain[d], p = Math.round((x.right / x.total) * 100);
        return "<tr><td>" + DOMAINS[d] + "</td><td>" + x.right + " / " + x.total + '</td><td><div class="bar"><i style="width:' + p + '%"></i></div></td><td>' + p + "%</td></tr>";
      }).join("");
      var weak = Object.keys(byDomain).filter(function (d) { return byDomain[d].right / byDomain[d].total < 0.7; })
        .map(function (d) { return DOMAINS[d]; });

      document.title = "Result: " + paper.title;
      app.innerHTML =
        '<p><a href="index.html">&larr; All papers</a></p>' +
        "<h1>Result: " + esc(paper.title) + "</h1>" +
        '<div class="verdict ' + (pass ? "pass" : "fail") + '">' + (pass ? "PASS" : "FAIL") + " &mdash; " + right + " / " + total + " (" + pct + "%)</div>" +
        '<p class="muted" style="text-align:center">Pass mark ' + PASS_PERCENT + "% &nbsp;|&nbsp; time used " + fmtTime(used) + " of " + paper.minutes + ":00 &nbsp;|&nbsp; unanswered: " + unanswered + "</p>" +
        '<div class="card"><h2 style="margin-top:0">Score by domain</h2><table><tr><th>Domain</th><th>Score</th><th></th><th>%</th></tr>' + domRows + "</table>" +
        (weak.length ? '<p class="muted">Revise first: <b>' + weak.join(", ") + "</b> (below " + PASS_PERCENT + "%).</p>" : '<p class="muted">Every domain is at or above the pass mark. Good.</p>') +
        "</div>" +
        '<div class="row filters" id="filters" style="margin:14px 0"></div>' +
        '<div id="review"></div>' +
        '<div class="row" style="margin-top:20px"><button class="btn primary" id="retake">Retake this paper</button><a class="btn" href="index.html">Choose another paper</a></div>';

      document.getElementById("retake").onclick = function () { clear(); showIntro(); window.scrollTo({ top: 0 }); };

      var mode = "all";
      var fbox = document.getElementById("filters");
      [["all", "All questions"], ["wrong", "Incorrect / unanswered"], ["flagged", "Flagged"]].forEach(function (f) {
        var b = el('<button class="btn">' + f[1] + "</button>");
        b.onclick = function () { mode = f[0]; paint(); };
        b.dataset.m = f[0];
        fbox.appendChild(b);
      });

      function paint() {
        Array.prototype.forEach.call(fbox.children, function (b) { b.classList.toggle("on", b.dataset.m === mode); });
        var out = "";
        Q.forEach(function (q, i) {
          if (mode === "wrong" && results[i]) return;
          if (mode === "flagged" && !state.flagged[i]) return;
          out +=
            '<div class="card rev ' + (results[i] ? "right" : "wrong") + '"><div class="qmeta"><span class="tag">Q' + (i + 1) + '</span><span class="tag">' + DOMAINS[q.d] + "</span>" +
            (state.flagged[i] ? '<span class="tag">flagged</span>' : "") + "</div>" +
            '<div class="qtext">' + rich(q.q) + "</div>" + (q.c ? "<pre>" + esc(q.c) + "</pre>" : "") +
            '<div class="ans-line">Your answer: ' + describeAnswer(q, state.answers[i]) + " &nbsp; " + (results[i] ? '<span class="ok-t">Correct</span>' : '<span class="bad-t">Incorrect</span>') + "</div>" +
            (results[i] ? "" : '<div class="ans-line">Correct answer: ' + describeCorrect(q) + "</div>") +
            '<div class="expl"><b>Why:</b> ' + rich(q.e) + "</div></div>";
        });
        document.getElementById("review").innerHTML = out || '<p class="muted">Nothing to show for this filter.</p>';
      }
      paint();
    }

    /* ---------- boot ---------- */
    var existing = load();
    if (existing && existing.submitted) { state = existing; showIntro(); }
    else showIntro();
  };
})();

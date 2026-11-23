(function () {
  "use strict";

  const EXAM_LENGTH = 30;
  const KEYS = ["A", "B", "C", "D", "E", "F"];

  const $ = (id) => document.getElementById(id);
  const domainById = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
  const views = ["home", "topics", "quiz", "results"];

  let state = null; // current quiz session
  let lastConfig = null; // used by "Try again"

  // ───────────── Helpers ─────────────
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style") node.setAttribute("style", v);
      else node[k] = v;
    }
    for (const c of [].concat(children)) node.append(c);
    return node;
  }

  function show(view) {
    views.forEach((v) => ($("view-" + v).hidden = v !== view));
    window.scrollTo({ top: 0 });
  }

  function countByDomain(id) {
    return QUESTIONS.filter((q) => q.d === id).length;
  }

  // Pick `total` questions distributed by exam domain weight (largest remainder method).
  function weightedSample(total) {
    const totalWeight = DOMAINS.reduce((s, d) => s + d.weight, 0);
    const alloc = DOMAINS.map((d) => {
      const exact = (total * d.weight) / totalWeight;
      return { id: d.id, n: Math.floor(exact), rem: exact - Math.floor(exact) };
    });
    let left = total - alloc.reduce((s, a) => s + a.n, 0);
    [...alloc].sort((a, b) => b.rem - a.rem).forEach((a) => {
      if (left > 0) { a.n++; left--; }
    });
    const picked = alloc.flatMap((a) =>
      shuffle(QUESTIONS.filter((q) => q.d === a.id)).slice(0, a.n)
    );
    return shuffle(picked);
  }

  // ───────────── Home ─────────────
  function renderHome() {
    const list = $("domain-list");
    list.replaceChildren(
      ...DOMAINS.map((d, i) =>
        el("div", { class: "domain" }, [
          el("div", { class: "domain-head" }, [
            el("span", { class: "domain-name", text: `Domain ${i + 1}: ${d.name}` }),
            el("span", { class: "domain-weight", text: d.weight + "%" }),
          ]),
          el("div", { class: "domain-bar" }, el("span", { style: `width:${d.weight}%` })),
          el("p", { text: d.summary }),
          el("p", { class: "count", text: `${countByDomain(d.id)} practice questions` }),
        ])
      )
    );
    $("total-count").textContent = QUESTIONS.length;
  }

  // ───────────── Topic picker ─────────────
  function renderTopics() {
    const list = $("topic-list");
    list.replaceChildren(
      ...DOMAINS.map((d) =>
        el("label", { class: "topic-option" }, [
          el("input", { type: "checkbox", name: "topic", value: d.id, checked: true }),
          el("div", {}, [
            el("strong", { text: `${d.name} (${countByDomain(d.id)} questions)` }),
            el("span", { text: d.summary }),
          ]),
        ])
      )
    );
    updateTopicHint();
  }

  function selectedTopics() {
    return [...document.querySelectorAll('#topic-list input:checked')].map((i) => i.value);
  }

  function updateTopicHint() {
    const ids = selectedTopics();
    const available = QUESTIONS.filter((q) => ids.includes(q.d)).length;
    $("topic-start").disabled = ids.length === 0;
    $("topic-hint").textContent = ids.length
      ? `${available} questions available in the selected domain(s).`
      : "Select at least one domain to start.";
  }

  // ───────────── Quiz ─────────────
  function startQuiz(config) {
    lastConfig = config;
    let pool;
    if (config.mode === "exam") pool = weightedSample(EXAM_LENGTH);
    else if (config.mode === "topic") {
      pool = shuffle(QUESTIONS.filter((q) => config.topics.includes(q.d)));
      if (config.limit !== "all") pool = pool.slice(0, Number(config.limit));
    } else if (config.mode === "retry") pool = shuffle(config.questions);
    else pool = shuffle(QUESTIONS);

    state = {
      config,
      items: pool.map((q) => ({
        q,
        // Shuffle option order but remember which displayed index is correct.
        order: shuffle(q.o.map((_, i) => i)),
        chosen: null,
      })),
      index: 0,
      correct: 0,
      answered: 0,
    };
    $("quiz-mode").textContent = config.label;
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const item = state.items[state.index];
    const total = state.items.length;

    $("quiz-progress-text").textContent = `Question ${state.index + 1} of ${total}`;
    $("progress-bar").style.width = `${(state.index / total) * 100}%`;
    updateScore();

    $("question-domain").textContent = domainById[item.q.d].name;
    $("question-text").textContent = item.q.q;

    $("options").replaceChildren(
      ...item.order.map((origIdx, displayIdx) =>
        el(
          "button",
          {
            type: "button",
            class: "option",
            onclick: () => answer(displayIdx),
          },
          [
            el("span", { class: "option-key", text: KEYS[displayIdx] }),
            el("span", { text: item.q.o[origIdx] }),
          ]
        )
      )
    );

    $("feedback").hidden = true;
    const next = $("next-btn");
    next.disabled = true;
    next.textContent = state.index === total - 1 ? "See results" : "Next question";
    const first = $("options").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }

  function answer(displayIdx) {
    const item = state.items[state.index];
    if (item.chosen !== null) return;

    item.chosen = item.order[displayIdx];
    const isCorrect = item.chosen === item.q.a;
    state.answered++;
    if (isCorrect) state.correct++;

    const buttons = $("options").querySelectorAll(".option");
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      const orig = item.order[i];
      if (orig === item.q.a) btn.classList.add("correct");
      else if (i === displayIdx) btn.classList.add("wrong");
      else btn.classList.add("dim");
    });

    const fb = $("feedback");
    fb.className = "feedback " + (isCorrect ? "is-correct" : "is-wrong");
    $("feedback-title").textContent = isCorrect
      ? "✓ Correct!"
      : `✗ Incorrect. The right answer is: ${item.q.o[item.q.a]}`;
    $("feedback-text").textContent = item.q.e;
    fb.hidden = false;

    updateScore();
    $("progress-bar").style.width = `${((state.index + 1) / state.items.length) * 100}%`;
    const next = $("next-btn");
    next.disabled = false;
    next.focus({ preventScroll: true });
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function updateScore() {
    const pct = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
    $("score-pill").textContent = `${state.correct} / ${state.answered} correct · ${pct}%`;
  }

  function nextQuestion() {
    if (state.items[state.index].chosen === null) return;
    if (state.index < state.items.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      showResults();
    }
  }

  // ───────────── Results ─────────────
  function showResults() {
    const answered = state.items.filter((i) => i.chosen !== null);
    const missed = answered.filter((i) => i.chosen !== i.q.a);
    const pct = answered.length ? Math.round((state.correct / answered.length) * 100) : 0;
    const passed = pct >= 70;

    const ring = $("result-ring");
    ring.style.setProperty("--pct", pct);
    ring.style.setProperty("--ring", passed ? "var(--correct)" : "var(--wrong)");
    $("result-pct").textContent = pct + "%";

    if (!answered.length) {
      $("result-title").textContent = "No questions answered";
      $("result-summary").textContent = "Answer at least one question to see your results.";
    } else {
      $("result-title").textContent = passed ? "Great job! 🎉" : "Keep practicing 💪";
      $("result-summary").textContent =
        `You answered ${state.correct} of ${answered.length} questions correctly` +
        (answered.length < state.items.length ? ` (${state.items.length - answered.length} skipped)` : "") +
        `. The real exam requires a scaled score of 700/1000, so aim for at least 70% in practice.`;
    }

    // Per-domain breakdown
    const rows = DOMAINS.map((d) => {
      const inDomain = answered.filter((i) => i.q.d === d.id);
      if (!inDomain.length) return null;
      const ok = inDomain.filter((i) => i.chosen === i.q.a).length;
      const p = Math.round((ok / inDomain.length) * 100);
      return el("div", { class: "breakdown-row" }, [
        el("div", { class: "breakdown-top" }, [
          el("span", { text: d.name }),
          el("span", { text: `${ok}/${inDomain.length} · ${p}%` }),
        ]),
        el("div", { class: "breakdown-bar" }, el("span", { style: `width:${p}%` })),
      ]);
    }).filter(Boolean);
    $("breakdown").replaceChildren(...rows);

    // Missed questions review
    $("review-section").hidden = missed.length === 0;
    $("retry-missed-btn").hidden = missed.length === 0;
    $("review-list").replaceChildren(
      ...missed.map((i) =>
        el("div", { class: "card review-item" }, [
          el("div", { class: "question-domain", text: domainById[i.q.d].name }),
          el("h3", { text: i.q.q }),
          el("p", { class: "ans bad", text: "✗ Your answer: " + i.q.o[i.chosen] }),
          el("p", { class: "ans good", text: "✓ Correct answer: " + i.q.o[i.q.a] }),
          el("p", { class: "exp", text: i.q.e }),
        ])
      )
    );
    state.missed = missed.map((i) => i.q);
    show("results");
  }

  // ───────────── Events ─────────────
  function goHome() {
    state = null;
    show("home");
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "home") {
      if (state && !$("view-quiz").hidden && state.answered > 0 &&
          !confirm("Leave this quiz? Your progress will be lost.")) return;
      goHome();
    } else if (action === "mode-exam") {
      startQuiz({ mode: "exam", label: `Mode 1 · ${EXAM_LENGTH}-question quiz` });
    } else if (action === "mode-topic") {
      renderTopics();
      show("topics");
    } else if (action === "mode-all") {
      startQuiz({ mode: "all", label: "Mode 3 · All questions" });
    }
  });

  $("topic-list").addEventListener("change", updateTopicHint);

  $("topic-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const topics = selectedTopics();
    if (!topics.length) return;
    const names = topics.map((t) => domainById[t].name).join(", ");
    startQuiz({ mode: "topic", topics, limit: $("topic-limit").value, label: `Mode 2 · ${names}` });
  });

  $("next-btn").addEventListener("click", nextQuestion);

  $("end-btn").addEventListener("click", () => {
    if (state.answered === 0) return goHome();
    if (confirm("End the quiz now and see your results?")) showResults();
  });

  $("restart-btn").addEventListener("click", () => startQuiz(lastConfig));

  $("retry-missed-btn").addEventListener("click", () => {
    const questions = state.missed;
    startQuiz({ mode: "retry", questions, label: `Retry · ${questions.length} missed question(s)` });
  });

  document.addEventListener("keydown", (e) => {
    if ($("view-quiz").hidden || !state || e.metaKey || e.ctrlKey || e.altKey) return;
    const item = state.items[state.index];
    const n = Number(e.key);
    if (n >= 1 && n <= item.order.length && item.chosen === null) {
      e.preventDefault();
      answer(n - 1);
    } else if (e.key === "Enter" && item.chosen !== null) {
      e.preventDefault();
      nextQuestion();
    }
  });

  renderHome();
  show("home");
})();

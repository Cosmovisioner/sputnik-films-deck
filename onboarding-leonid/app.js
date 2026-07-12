(function () {
  "use strict";

  // localStorage ids (not secrets) — named to avoid secret-scanner false positives
  const STORAGE_KEY = "sb-onboarding-leonid-progress";
  const WELCOME_KEY = "sb-onboarding-leonid-welcome-v4";
  const GRAD_KEY = "sb-onboarding-leonid-grad-v1";
  const GRAD_DAY_IDX = 6; /* день 7: старт реальной работы */
  const ACCESS_KEY = "sb-onboarding-leonid-access";
  const QUEST_KEY = "sb-onboarding-leonid-quest-step";
  const MODE_KEY = "sb-onboarding-leonid-program-mode";
  const QUIZ_KEY = "sb-onboarding-leonid-quiz";
  const ASSET_VER = "20260712-v66";
  /** Ворота теста: без сдачи (≥18/20) дни после теста закрыты */
  const QUIZ_GATE_ENABLED = true;

  const SALES_CORE_IDS = new Set(["dima", "sasha_a", "denis", "liza", "sergey", "taya", "alya_dudenkova"]);

  const UNIT_ROUTING = [
    { signal: "Реклама, съёмка, TV/digital", unit: "Cult", person: "denis" },
    { signal: "CG, motion, 3D, мультимедиа", unit: "Blaster", person: "liza" },
    { signal: "Док, шоу, спецпроект", unit: "Sputnik", person: "sergey" },
    { signal: "Не ясен формат / холод", unit: "Cult Group (общая)", person: "dima" }
  ];

  function esc(s) {
    if (s == null || s === "") return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listSection(title, items) {
    if (!items || !items.length) return "";
    return `<div class="modal-section"><h4>${title}</h4><ul class="modal-list">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  }

  let stepsMeta = {};

  const UNIT_ID_MAP = {
    "УК": "uk",
    "Холдинг": "uk",
    "Cult": "cult",
    "Blaster": "blaster",
    "Sputnik": "sputnik",
    "Sputnik Films": "sputnik",
    "TechTigers": "techtigers",
    "ТехноТигры": "techtigers",
    "Партнёр": "partner_slz",
    "Партнёр · Blaster": "partner_slz",
    "УК + Sputnik": "uk",
    "Холдинг + Sputnik": "uk"
  };

  const PRIORITY_LABELS = {
    required: "С первого дня",
    week1: "Первая неделя",
    as_needed: "По сделкам",
    after_week1: "После 1-й недели",
    optional: "По желанию"
  };

  let contactsData = { people: {} };
  let steps = [];
  let team = null;
  let resources = null;
  let chats = null;
  let decks = null;
  let taskPaths = {};
  let salesSnapshot = null;
  let accessChecklist = null;
  let skillsHub = null;
  let clientPools = null;
  let rulesQuiz = null;
  let accessState = loadAccessState();
  let quizState = loadQuizState();
  let state = loadState();
  let currentView = "program";
  let currentDayIdx = 0;
  let currentQuestIdx = 0;
  let programMode = localStorage.getItem(MODE_KEY) || "focus";
  let selectedUnit = null;
  let peopleFilter = "all";
  let expandedTasks = {};

  function loadAccessState() {
    try {
      const raw = localStorage.getItem(ACCESS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  }

  function saveAccessState() {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(accessState));
  }

  function loadQuizState() {
    try {
      const raw = localStorage.getItem(QUIZ_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  }

  function saveQuizState() {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(quizState));
  }

  function isQuizPassed(quizId) {
    return !!(quizState[quizId] && quizState[quizId].passed);
  }

  function quizGateIdx() {
    return buildQuestPath().findIndex(q => q.taskId === "rules_quiz");
  }

  function blockPastQuiz(targetIdx) {
    if (!QUIZ_GATE_ENABLED) return false;
    const qIdx = quizGateIdx();
    if (qIdx < 0) return false;
    return targetIdx > qIdx && !isQuizPassed("rules_day5");
  }

  function canCompleteTask(stepId, taskId) {
    if (!QUIZ_GATE_ENABLED) return true;
    if (String(stepId) === "5" && taskId === "rules_quiz") {
      return isQuizPassed("rules_day5");
    }
    return true;
  }

  function quizGateMessage() {
    return "Сначала сдай тест по коммерческим правилам: нужно ≥18 из 20. Пока тест не сдан — дальше нельзя.";
  }

  function userProfile() {
    const meta = stepsMeta || {};
    const params = new URLSearchParams(location.search);
    const name = params.get("user") || meta.user || "Sales";
    const first = params.get("first") || meta.userFirst || name.split(" ")[0];
    const email = params.get("email") || meta.email || meta.emailGeneric || "sales@cult.team";
    return { name, first, email };
  }

  function applyUserBranding() {
    const u = userProfile();
    const titleEl = document.querySelector(".brand-title");
    if (titleEl) titleEl.textContent = u.first + " · продажи";
    const welcomeTitle = document.getElementById("welcomeTitle");
    if (welcomeTitle) welcomeTitle.textContent = "Привет, " + u.first;
    document.title = "Cult Group — онбординг · " + u.first;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    for (const legacyKey of ["cult_leonid_daily_v5", "cult_leonid_daily_v4"]) {
      const legacy = localStorage.getItem(legacyKey);
      if (!legacy) continue;
      try {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(STORAGE_KEY, legacy);
        return parsed;
      } catch (_) {}
    }
    return {};
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function parseDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateCompact(dateStr) {
    const d = parseDate(dateStr);
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return d.getDate() + " " + months[d.getMonth()];
  }

  function formatDateRu(dateStr, weekday) {
    const d = parseDate(dateStr);
    const months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    return (weekday ? weekday + " · " : "") + d.getDate() + " " + months[d.getMonth()];
  }

  function personUnitId(p) {
    if (p.unitId) return p.unitId;
    if (p.category === "partner_slz") return "partner_slz";
    if (p.category === "collaborator") return "partner_slz";
    return UNIT_ID_MAP[p.unit] || "uk";
  }

  function personPhoto(p) {
    if (!p) return null;
    if (p.photo) return p.photo;
    const c = getContact(p.id);
    return c.avatar || null;
  }

  function personAvatarHtml(p, large) {
    const photo = personPhoto(p);
    if (photo) {
      const cls = large ? "modal-avatar-img" : "person-avatar-img";
      return `<img class="${cls}" src="${photo}" alt="" loading="lazy" width="44" height="44" />`;
    }
    const cls = large ? "modal-avatar" : "person-avatar";
    const partner = p.category === "partner_slz" && !large ? " partner" : "";
    return `<div class="${cls}${partner}">${p.initials}</div>`;
  }

  function orgPillars() {
    return (team && team.org.pillars) || [];
  }

  function cultUnits() {
    const p = orgPillars().find(x => x.id === "cult_group");
    return p ? p.units : [];
  }

  function techStartups() {
    const p = orgPillars().find(x => x.id === "techtigers");
    return p ? p.startups : [];
  }

  function findOrgItem(id) {
    const unit = cultUnits().find(u => u.id === id);
    if (unit) return { kind: "unit", item: unit };
    const startup = techStartups().find(s => s.id === id);
    if (startup) return { kind: "startup", item: startup };
    return null;
  }

  function stepComplete(step) {
    const tasks = state["step_" + step.id] || {};
    return step.tasks.every(t => tasks[t.id]);
  }

  function totalProgress() {
    let done = 0;
    let total = 0;
    steps.forEach(step => {
      step.tasks.forEach(t => {
        total++;
        if ((state["step_" + step.id] || {})[t.id]) done++;
      });
    });
    return total ? Math.round((done / total) * 100) : 0;
  }


  function buildQuestPath() {
    const path = [];
    steps.forEach((step, dayIdx) => {
      step.tasks.forEach((task, taskIdx) => {
        path.push({
          dayIdx,
          stepId: step.id,
          taskId: task.id,
          task,
          taskIdx,
          day: step,
          key: step.id + "." + task.id,
          globalIdx: path.length
        });
      });
    });
    return path;
  }

  function saveQuestIdx() {
    localStorage.setItem(QUEST_KEY, String(currentQuestIdx));
  }

  function loadQuestIdx() {
    const raw = localStorage.getItem(QUEST_KEY);
    if (raw != null && raw !== "") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) currentQuestIdx = n;
    }
  }

  function firstIncompleteQuestIdx() {
    const path = buildQuestPath();
    for (let i = 0; i < path.length; i++) {
      const q = path[i];
      if (!(state["step_" + q.stepId] || {})[q.taskId]) return i;
    }
    return Math.max(0, path.length - 1);
  }

  function goToQuest(idx) {
    const path = buildQuestPath();
    if (!path.length) return;
    let next = Math.max(0, Math.min(idx, path.length - 1));
    if (blockPastQuiz(next)) {
      const qIdx = quizGateIdx();
      next = qIdx >= 0 ? qIdx : next;
      window.alert(quizGateMessage());
    }
    currentQuestIdx = next;
    currentDayIdx = path[currentQuestIdx].dayIdx;
    saveQuestIdx();
    setView("program");
    maybeShowGraduation();
  }

  function questProgressLabel() {
    const path = buildQuestPath();
    const done = path.filter(q => (state["step_" + q.stepId] || {})[q.taskId]).length;
    return { done, total: path.length, pct: path.length ? Math.round((done / path.length) * 100) : 0 };
  }

  function findResource(id) {
    if (!resources) return null;
    for (const group of ["systems", "docs", "internal"]) {
      const hit = (resources[group] || []).find(r => r.id === id);
      if (hit) return { ...hit, group };
    }
    return null;
  }

  function findPerson(id) {
    return team.people.find(p => p.id === id);
  }

  function findDeck(id) {
    return (decks.decks || []).find(d => d.id === id);
  }

  function peopleForUnit(unitId) {
    return team.people.filter(p => {
      if (p.id === "leonid" || p.id === "homich") return false;
      return personUnitId(p) === unitId;
    });
  }

  function decksForUnit(unitId) {
    return (decks.decks || []).filter(d => d.unit === unitId);
  }

  function chatsFiltered(filter) {
    const list = chats.chats || [];
    if (!filter || filter === "all") return list;
    if (filter === "required") return list.filter(c => c.priority === "required");
    return list.filter(c => c.id === filter || c.priority === filter);
  }

  function setView(view) {
    currentView = view;
    document.querySelectorAll(".nav-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.getElementById("dayNavWrap").hidden = view !== "program";
    renderMain();
    history.replaceState(null, "", view === "program" ? "?day=" + (currentDayIdx + 1) : "?" + view);
  }

  function metricCell(val, warn) {
    if (val == null || val === "") return "—";
    const cls = warn ? " sales-warn" : "";
    return `<span class="sales-metric${cls}">${esc(val)}</span>`;
  }

  function renderSalesTable(headers, rows) {
    if (!rows || !rows.length) return "";
    const head = headers.map(h => `<th>${esc(h)}</th>`).join("");
    const body = rows.map(row => {
      const cells = row.map(c => {
        if (c && typeof c === "object" && c.v != null) {
          return `<td>${metricCell(c.v, c.warn)}</td>`;
        }
        return `<td>${metricCell(c)}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<div class="sales-table-wrap"><table class="sales-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderSales() {
    if (!salesSnapshot) {
      return `<div class="card"><h2 class="card-title">Продажи · план и факт</h2><p class="card-intro">Не удалось загрузить данные. Обнови страницу.</p></div>`;
    }
    const m = salesSnapshot.meta || {};
    const hl = salesSnapshot.headline || {};

    let unitsHtml = "";
    (salesSnapshot.units || []).forEach(u => {
      const ytd = u.ytd_jan_apr_2026 || u.ytd_context || {};
      const plan = u.plan_year || {};
      let unitBody = "";

      if (u.id === "cult" && ytd.revenue) {
        unitBody += renderSalesTable(
          ["Метрика", "Факт YTD (янв–апр)", "План / ambition"],
          [
            ["Выручка без НДС", { v: ytd.revenue, warn: true }, plan.revenue || "—"],
            ["Маржа, ₽", ytd.margin_rub, "—"],
            ["Маржинальность", ytd.margin_pct, plan.margin_pct || "14% план YTD"],
            ["Средний чек", { v: ytd.avg_check, warn: true }, plan.avg_check || "—"],
            ["Проектов (акты)", ytd.projects_closed + " / " + ytd.projects_plan, plan.projects || "—"],
            ["Запросов в воронке", ytd.requests + " / " + ytd.requests_plan, plan.requests || "—"],
            ["Winrate", ytd.winrate, plan.winrate || "—"],
            ["Конверсия запрос→проект", ytd.conv_request_to_project, "—"]
          ]
        );
      } else if (u.id === "blaster") {
        unitBody += `<p class="sales-unit-plan"><strong>План 2026:</strong> выручка ${esc(plan.revenue)} · ${esc(String(plan.projects))} проектов · маржа ${esc(plan.margin_pct)} · winrate ${esc(plan.winrate)} · ~${esc(plan.briefs_per_month)} брифов/мес</p>`;
        if (u.monthly && u.monthly.length) {
          unitBody += renderSalesTable(
            ["Месяц", "Выручка", "Прибыль", "Комментарий"],
            u.monthly.map(row => [row.month, row.revenue || "—", row.profit, row.note])
          );
        }
      } else if (u.id === "sputnik") {
        unitBody += renderSalesTable(
          ["Показатель", "Значение"],
          [
            ["Выручка ~2025", ytd.revenue_2025_approx],
            ["Статус", ytd.status],
            ["База контактов", ytd.contacts_base],
            ["Коммерция", ytd.commercial_split]
          ]
        );
      }

      const insights = (u.insights || []).map(x => `<li>${esc(x)}</li>`).join("");
      unitsHtml += `
        <div class="sales-unit-card" style="--unit-color:${u.color || "#666"}">
          <div class="sales-unit-head">
            <h3 class="sales-unit-name">${esc(u.name)}</h3>
            <span class="sales-unit-owner">${esc(u.owner)}</span>
          </div>
          ${unitBody}
          ${insights ? `<ul class="sales-insights">${insights}</ul>` : ""}
        </div>`;
    });

    const groupRows = (salesSnapshot.group_targets_2026?.rows || []).map(r => [r.metric, r.baseline, r.target]);
    const leonidRows = (salesSnapshot.leonid_kpi?.rows || []).map(r => ["Месяц " + r.month, r.focus, r.target]);
    const briefRows = (salesSnapshot.briefs_plan_monthly?.rows || []).map(r => [r.month, String(r.briefs)]);
    const histRows = (salesSnapshot.nb_history_2025?.rows || []).map(r => [
      r.product, String(r.briefs), r.winrate, r.revenue
    ]);

    const liveRefs = (m.live_refs || []).map(r =>
      `<a class="contact-btn" href="${r.url}" target="_blank" rel="noopener">${esc(r.label)}</a>`
    ).join("");

    const losses = (salesSnapshot.loss_patterns || []).map(x => `<li>${esc(x)}</li>`).join("");
    const cold = salesSnapshot.cold_entry_playbook;
    const coldHtml = cold ? `
      <div class="card">
        <h3 class="section-heading">${esc(cold.title || "Заходы в холод")}</h3>
        <p class="card-intro">${esc(cold.when || "")}</p>
        ${(cold.hooks || []).map(h => `
          <div class="sales-callout" style="margin-top:12px">
            <p class="sales-tldr-label">${esc(h.name || "")}</p>
            <p><strong>${esc(h.offer || "")}</strong></p>
            ${h.value ? `<p>${esc(h.value)}</p>` : ""}
            ${h.status ? `<p class="path-note">${esc(h.status)}</p>` : ""}
            ${h.owner ? `<p class="path-note">Владелец: ${esc(h.owner)}</p>` : ""}
          </div>`).join("")}
      </div>` : "";
    const rhythms = salesSnapshot.rhythms || stepsMeta.rhythms || [];
    const rhythmHtml = rhythms.length ? `
      <div class="card">
        <h3 class="section-heading">Ритм продаж</h3>
        <ul class="sales-tldr-list">${rhythms.map(x => `<li><strong>${esc(x.when || "")}</strong> — ${esc(x.title || "")}${x.leads ? ` · ${esc(x.leads)}` : ""}${x.agenda ? `. ${esc(x.agenda)}` : ""}</li>`).join("")}</ul>
        ${hl.ownership ? `<p class="path-note" style="margin-top:12px">${esc(hl.ownership)}</p>` : ""}
      </div>` : "";

    return `
      <div class="card">
        <div class="card-meta">Срез на ${esc(m.as_of)} · ${esc(m.period_label || "")}</div>
        <h2 class="card-title">Продажи · план, факт, воронка</h2>
        <p class="card-intro">${esc(m.ui_banner || m.updated_note || "")}</p>
        ${m.offer_note ? `<p class="path-note">${esc(m.offer_note)}</p>` : ""}
        <div class="sales-callout sales-tldr">
          <p class="sales-tldr-label">Твой мандат (прочитай первым)</p>
          <p><strong>${esc(hl.problem || "")}</strong></p>
          <p>${esc(hl.focus_2026 || "")}</p>
          <p class="sales-mandate">${esc(hl.your_mandate || "")}</p>
          <ul class="sales-tldr-list">
            <li>Считается <strong>квал. бриф</strong> и передача в юнит — не «красивый созвон»</li>
            <li>Новые сделки → <strong>Amo Cult</strong> · следующий шаг в каждой карточке</li>
            <li>Sputnik «берём» → только после <strong>Сергея Клейна</strong></li>
            <li><strong>Пятница 12:00</strong> — звонок юнитов: лидируете с CRO</li>
          </ul>
        </div>
      </div>

      ${rhythmHtml}
      ${coldHtml}
      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.group_targets_2026?.title || "План группы")}</h3>
        ${renderSalesTable(["Метрика", "Было (май 2026)", "Цель 2026"], groupRows)}
      </div>

      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.leonid_kpi?.title || "Твои KPI")}</h3>
        ${salesSnapshot.leonid_kpi?.note ? `<p class="card-intro">${esc(salesSnapshot.leonid_kpi.note)}</p>` : ""}
        ${renderSalesTable(["Период", "Фокус", "Ориентир"], leonidRows)}
      </div>

      ${renderUnitRoutingCard("Роутинг клиента — до детальных таблиц ниже.")}

      <div class="card">
        <h3 class="section-heading">Юниты · план vs факт</h3>
        ${unitsHtml}
      </div>

      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.briefs_plan_monthly?.title || "План брифов")}</h3>
        <p class="card-intro">${esc(salesSnapshot.briefs_plan_monthly?.note || "")}</p>
        ${renderSalesTable(["Месяц", "План брифов (старый план Blaster)"], briefRows)}
      </div>

      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.nb_history_2025?.title || "NB 2025")}</h3>
        <p class="card-intro">${esc(salesSnapshot.nb_history_2025?.note || "")}</p>
        ${renderSalesTable(["Продукт", "Брифов", "Winrate", "Выручка"], histRows)}
      </div>

      <div class="card">
        <h3 class="section-heading">Паттерны проигрышей (CRM)</h3>
        <ul class="sales-insights">${losses}</ul>
        <div class="modal-contacts" style="margin-top:16px">${liveRefs}
          <button type="button" class="contact-btn primary" data-person="dima">Спросить актуальный месяц у CRO</button>
        </div>
      </div>`;
  }

  function goToDay(idx) {
    if (idx < 0 || idx >= steps.length) return;
    if (QUIZ_GATE_ENABLED && idx > 4 && !isQuizPassed("rules_day5")) {
      window.alert(quizGateMessage());
      const qIdx = quizGateIdx();
      if (qIdx >= 0) {
        goToQuest(qIdx);
        return;
      }
      idx = 4;
    }
    currentDayIdx = idx;
    const path = buildQuestPath();
    const firstOfDay = path.findIndex(q => q.dayIdx === idx);
    if (firstOfDay >= 0) {
      const incomplete = path.findIndex(q => q.dayIdx === idx && !(state["step_" + q.stepId] || {})[q.taskId]);
      currentQuestIdx = incomplete >= 0 ? incomplete : firstOfDay;
      saveQuestIdx();
    }
    setView("program");
    maybeShowGraduation();
  }

  function getContact(id) {
    return contactsData.people[id] || {};
  }

  function showModal() {
    const backdrop = document.getElementById("modalBackdrop");
    backdrop.hidden = false;
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    const backdrop = document.getElementById("modalBackdrop");
    backdrop.hidden = true;
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.getElementById("modalBody").innerHTML = "";
  }

  function showWelcome() {
    const el = document.getElementById("welcomeBackdrop");
    welcomeStep = 0;
    renderWelcomeStep();
    el.hidden = false;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeWelcome() {
    const el = document.getElementById("welcomeBackdrop");
    el.hidden = true;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    localStorage.setItem(WELCOME_KEY, "1");
    maybeShowGraduation();
  }

  let welcomeStep = 0;

  function welcomeCards() {
    const u = userProfile();
    const n = steps.length || 7;
    return [
      {
        kicker: "Инструкция · 1/" ,
        title: "Привет, " + u.first,
        lead: "Это инструкция к онбординг-квесту: куда смотреть и куда нажимать. Не правила продаж — только как пользоваться этим экраном. Впереди " + n + " дней программы.",
        chips: ["Короткие шаги", "Галочки", "Ссылки внутри задач"]
      },
      {
        kicker: "Инструкция · 2/",
        title: "Программа: два режима",
        lead: "Вверху контента переключатель: «Шаг за шагом» — одна задача на экран, кнопка «Дальше». «Список дня» — все задачи дня сразу, если нужен обзор.",
        chips: ["Шаг за шагом = фокус", "Список дня = обзор", "Галочка = реально сделал"]
      },
      {
        kicker: "Инструкция · 3/",
        title: "Шапка и навигация",
        lead: "Ряд кнопок — разделы: Программа, Карта, Пулы, Люди, Презентации, Ссылки и доступы, Скиллы. Полоска дней — только в «Программе». При скролле дни прячутся, кнопки разделов остаются.",
        chips: ["Дни · смена дня", "Вкладки · разделы", "Скролл · шапка короче"]
      },
      {
        kicker: "Инструкция · 4/",
        title: "Что внутри задачи",
        lead: "У каждого шага блок «Куда перейти»: ссылки, документы, карточки людей. Кликни — откроется нужное. Прогресс справа в шапке показывает, сколько уже отмечено.",
        chips: ["Ссылки в задаче", "Карточка человека", "% в шапке"]
      },
      {
        kicker: "Инструкция · 5/",
        title: "Можно начинать",
        lead: "Дальше откроется день 1 программы. Этот экран больше не всплывёт сам — он только про интерфейс квеста.",
        chips: ["Поехали в программу", "Назад / Дальше в шагах", "Обзор — «Список дня»"]
      }
    ].map((c, i, arr) => ({
      ...c,
      kicker: "Инструкция · " + (i + 1) + "/" + arr.length
    }));
  }

  function renderWelcomeStep() {
    const cards = welcomeCards();
    const card = cards[welcomeStep] || cards[0];
    const body = document.getElementById("welcomeBody");
    const progress = document.getElementById("welcomeProgress");
    const go = document.getElementById("welcomeGo");
    const back = document.getElementById("welcomeBack");
    if (!body || !go) return;

    if (progress) {
      progress.innerHTML = cards.map((_, i) =>
        `<span class="welcome-dot ${i === welcomeStep ? "active" : i < welcomeStep ? "done" : ""}"></span>`
      ).join("");
    }

    body.innerHTML = `
      <p class="mono-tag welcome-tag">${esc(card.kicker)}</p>
      <h2 class="welcome-title" id="welcomeTitle">${esc(card.title)}</h2>
      <p class="welcome-lead">${esc(card.lead)}</p>
      <div class="welcome-chips">${(card.chips || []).map(c => `<span class="welcome-chip">${esc(c)}</span>`).join("")}</div>
    `;

    if (back) {
      back.hidden = welcomeStep === 0;
    }
    const last = welcomeStep >= cards.length - 1;
    go.textContent = welcomeStep === 0 ? "Поехали →" : (last ? "Начать программу →" : "Дальше →");
  }

  function advanceWelcome() {
    const cards = welcomeCards();
    if (welcomeStep >= cards.length - 1) {
      closeWelcome();
      return;
    }
    welcomeStep += 1;
    renderWelcomeStep();
  }

  function retreatWelcome() {
    if (welcomeStep <= 0) return;
    welcomeStep -= 1;
    renderWelcomeStep();
  }

  function maybeShowWelcome() {
    if (!localStorage.getItem(WELCOME_KEY)) showWelcome();
    else maybeShowGraduation();
  }

  let gradStep = 0;

  function gradCards() {
    const u = userProfile();
    return [
      {
        kicker: "Финиш онбординга · 1/",
        title: "Онбординг пройден, " + u.first + "!",
        lead: "Ты дошёл до конца вводной программы. Все шаги, правила, доступы и база — позади. Красавчик: это уже не «почитать», это ты реально закрыл.",
        chips: ["Онбординг ✓", "Знания на месте", "Ты в игре"]
      },
      {
        kicker: "Финиш онбординга · 2/",
        title: "Теперь начинается реальная работа",
        lead: "С сегодняшнего дня — живые задачи: тёплая база, CRM, планы, документы, самостоятельный старт. Мы рассчитываем, что работа будет продуктивной и эффективной — и что планы будут выполняться.",
        chips: ["Живые клиенты", "Планы в деле", "Темп продаж"]
      },
      {
        kicker: "Финиш онбординга · 3/",
        title: "Сайт всегда под рукой",
        lead: "Забыл правило, ссылку или «куда писать» — возвращайся сюда и освежи знания. Это не разовый квест, а шпаргалка на каждый день.",
        chips: ["Вернуться в любой день", "Люди · презы · скиллы", "Шпаргалка 24/7"]
      },
      {
        kicker: "Финиш онбординга · 4/",
        title: "Поехали в день 7",
        lead: "Впереди старт реальной работы. Закрой карточки — и ныряй в задачи дня. Удачи, " + u.first + ". Мы рядом.",
        chips: ["День 7 открыт", "Реальная работа", "Удачи"]
      }
    ].map((c, i, arr) => ({
      ...c,
      kicker: "Финиш онбординга · " + (i + 1) + "/" + arr.length
    }));
  }

  function showGraduation() {
    const el = document.getElementById("gradBackdrop");
    if (!el) return;
    gradStep = 0;
    renderGradStep();
    el.hidden = false;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeGraduation() {
    const el = document.getElementById("gradBackdrop");
    if (!el) return;
    el.hidden = true;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    localStorage.setItem(GRAD_KEY, "1");
  }

  function renderGradStep() {
    const cards = gradCards();
    const card = cards[gradStep] || cards[0];
    const body = document.getElementById("gradBody");
    const progress = document.getElementById("gradProgress");
    const go = document.getElementById("gradGo");
    const back = document.getElementById("gradBack");
    if (!body || !go) return;

    if (progress) {
      progress.innerHTML = cards.map((_, i) =>
        `<span class="welcome-dot ${i === gradStep ? "active" : i < gradStep ? "done" : ""}"></span>`
      ).join("");
    }

    body.innerHTML = `
      <p class="mono-tag welcome-tag grad-tag">${esc(card.kicker)}</p>
      <h2 class="welcome-title" id="gradTitle">${esc(card.title)}</h2>
      <p class="welcome-lead">${esc(card.lead)}</p>
      <div class="welcome-chips">${(card.chips || []).map(c => `<span class="welcome-chip">${esc(c)}</span>`).join("")}</div>
    `;

    if (back) back.hidden = gradStep === 0;
    const last = gradStep >= cards.length - 1;
    go.textContent = last ? "К реальной работе →" : "Дальше →";
  }

  function advanceGrad() {
    const cards = gradCards();
    if (gradStep >= cards.length - 1) {
      closeGraduation();
      return;
    }
    gradStep += 1;
    renderGradStep();
  }

  function retreatGrad() {
    if (gradStep <= 0) return;
    gradStep -= 1;
    renderGradStep();
  }

  function maybeShowGraduation() {
    if (localStorage.getItem(GRAD_KEY)) return;
    if (currentDayIdx !== GRAD_DAY_IDX) return;
    if (currentView !== "program") return;
    const welcomeOpen = document.getElementById("welcomeBackdrop");
    if (welcomeOpen && !welcomeOpen.hidden) return;
    showGraduation();
  }

  function openPerson(id) {
    if (!team) return;
    const p = findPerson(id);
    if (!p) return;
    const c = getContact(id);
    const body = document.getElementById("modalBody");
    const unit = cultUnits().find(u => u.id === personUnitId(p));

    let contactsHtml = "";
    if (c.email) {
      contactsHtml += `<button type="button" class="contact-btn primary" data-copy-email="${esc(c.email)}" title="Скопировать почту">✉ ${esc(c.email)}</button>`;
    }
    if (c.emailAlt) {
      contactsHtml += `<button type="button" class="contact-btn" data-copy-email="${esc(c.emailAlt)}" title="Скопировать почту">✉ ${esc(c.emailAlt)}</button>`;
    }
    if (c.emailWork && c.emailWork !== c.email) {
      contactsHtml += `<button type="button" class="contact-btn" data-copy-email="${esc(c.emailWork)}" title="Скопировать почту">✉ ${esc(c.emailWork)}</button>`;
    }
    if (c.telegram) {
      contactsHtml += `<a class="contact-btn" href="${esc(c.telegram)}" target="_blank" rel="noopener"><span class="icon">TG</span> ${esc(c.telegramLabel || "Telegram")}</a>`;
    }
    if (c.howToWrite) {
      contactsHtml += `<p style="font-size:12px;color:var(--muted);margin:8px 0 0">${esc(c.howToWrite)}</p>`;
    }

    const themes = (p.clifton_themes || []).filter(Boolean);
    const themesHtml = themes.length
      ? `<div class="theme-tags">${themes.map(t => `<span class="theme-tag">${esc(t)}</span>`).join("")}</div>`
      : "";
    const cliftonLinks = [];
    if (p.clifton_url) {
      const label = p.clifton_tab ? `Clifton · ${p.clifton_tab}` : "Clifton · профиль";
      cliftonLinks.push(`<a class="contact-btn" href="${p.clifton_url}" target="_blank" rel="noopener"><span class="icon">CL</span> ${esc(label)}</a>`);
    }
    cliftonLinks.push(`<a class="contact-btn" href="https://docs.google.com/spreadsheets/d/1bkfERbO8UlEql6pLS_UIhCrBRiT2R4-YDOqxVeUx__0/edit" target="_blank" rel="noopener">📋 Таблица команды</a>`);

    body.innerHTML = `
      ${personAvatarHtml(p, true)}
      <h2 class="modal-name">${esc(p.name)}</h2>
      <p class="modal-role">${esc(p.role)} · ${esc(p.unit)}</p>
      ${p.bio_short ? `<p class="modal-lead">${esc(p.bio_short)}</p>` : ""}
      ${p.lore ? `<div class="modal-section"><h4>Кратко</h4><p class="modal-bio">${esc(p.lore)}</p></div>` : ""}
      ${listSection("Задачи и зона", p.tasks)}
      <div class="modal-section">
        <h4>CliftonStrengths</h4>
        ${themesHtml}
        <p class="modal-bio" style="margin-top:${themesHtml ? "10px" : "0"}">${esc(p.clifton_hint || "")}</p>
        <div class="modal-contacts" style="margin-top:10px">${cliftonLinks.join("")}</div>
      </div>
      ${listSection("Сильные стороны", p.strengths)}
      ${listSection("На что смотреть", p.watch_out)}
      ${listSection("Когда писать", p.contact_when)}
      <div class="modal-section">
        <h4>Избегать</h4>
        <p class="modal-bio">${esc(p.avoid || "")}</p>
      </div>
      <div class="modal-section">
        <h4>Контакты</h4>
        <div class="modal-contacts">${contactsHtml || "<span class='path-note'>Напиши Диме — даст контакт</span>"}</div>
      </div>
      ${unit ? `<div class="modal-section"><button type="button" class="btn" data-unit="${unit.id}">Юнит: ${esc(unit.name)} →</button></div>` : ""}
    `;

    body.querySelector("[data-unit]")?.addEventListener("click", e => {
      closeModal();
      selectedUnit = e.currentTarget.dataset.unit;
      setView("map");
    });

    bindCopyEmail(body);
    showModal();
  }

  function telegramUrlFor(personId, prefill) {
    const c = getContact(personId);
    const base = c.telegram || (personId === "dima" ? "https://t.me/cosmovisioner" : "");
    if (!base) return "";
    if (!prefill) return base;
    const sep = base.includes("?") ? "&" : "?";
    return base + sep + "text=" + encodeURIComponent(prefill);
  }

  function renderPathBlocks(items, stepId) {
    if (!items || !items.length) {
      return `<p class="path-empty">Действий нет — отметь шаг или напиши Диме.</p>`;
    }
    const blocks = [];
    let cur = { title: null, items: [] };
    items.forEach(it => {
      if (it.kind === "step") {
        if (cur.title || cur.items.length) blocks.push(cur);
        cur = { title: it.text, items: [] };
      } else {
        cur.items.push(it);
      }
    });
    if (cur.title || cur.items.length) blocks.push(cur);

    return blocks.map(b => {
      const actions = b.items.map(p => renderPathItem(p, stepId)).filter(Boolean).join("");
      const hasActions = b.items.some(p => p.kind !== "note");
      return `<section class="path-block${hasActions ? "" : " path-block-note-only"}">
        ${b.title ? `<h4 class="path-block-title">${esc(b.title)}</h4>` : ""}
        ${actions ? `<div class="path-block-list">${actions}</div>` : ""}
      </section>`;
    }).join("");
  }

  function pathCtaHtml({ title, sub, cta, href, attrs, tag, className, flat }) {
    const Tag = tag || (href ? "a" : "button");
    const extra = attrs || "";
    const hrefAttr = href ? ` href="${esc(href)}" target="_blank" rel="noopener"` : "";
    const typeAttr = Tag === "button" ? ` type="button"` : "";
    if (flat) {
      const cls = className || "path-link path-link-flat";
      return `<${Tag} class="${cls}"${typeAttr}${hrefAttr}${extra}>
        <span class="path-link-title">${esc(title || "")}</span>
        <span class="path-link-flat-arrow" aria-hidden="true">→</span>
      </${Tag}>`;
    }
    const cls = className || "path-link path-link-cta";
    return `<${Tag} class="${cls}"${typeAttr}${hrefAttr}${extra}>
      <span class="path-link-main">
        <span class="path-link-title">${esc(title || "")}</span>
        ${sub ? `<span class="path-link-sub">${esc(sub)}</span>` : ""}
      </span>
      <span class="path-link-action">${esc(cta || "Открыть")}</span>
    </${Tag}>`;
  }

  function openPeopleOverlay() {
    const body = document.getElementById("modalBody");
    if (!body || !team) return;
    const list = (team.people || []).filter(p => p.category === "staff" || SALES_CORE_IDS.has(p.id));
    const sales = list.filter(p => SALES_CORE_IDS.has(p.id));
    const rest = list.filter(p => !SALES_CORE_IDS.has(p.id));
    body.innerHTML = `
      <h2 class="modal-name">Люди</h2>
      <p class="modal-role">С кем будешь общаться · закрой и вернёшься к шагу</p>
      <p class="modal-lead">Нажми карточку — откроется профиль. Крестик или клик вне окна — назад к программе.</p>
      ${sales.length ? `<h4 class="mono-tag" style="margin:12px 0">Sales-контур</h4><div class="people-grid">${sales.map(personCardHtml).join("")}</div>` : ""}
      ${rest.length ? `<h4 class="mono-tag" style="margin:16px 0 12px">Штат</h4><div class="people-grid">${rest.map(personCardHtml).join("")}</div>` : ""}
    `;
    body.querySelectorAll("[data-person]").forEach(el => {
      el.addEventListener("click", e => {
        e.stopPropagation();
        openPerson(el.dataset.person);
      });
    });
    bindCopyEmail(body);
    showModal();
  }

  function peopleGridHtml() {
    if (!team) return "";
    const list = (team.people || []).filter(p =>
      p.id !== "leonid" && p.id !== "homich" && (p.category === "staff" || SALES_CORE_IDS.has(p.id) || p.category === "holding")
    );
    const sales = list.filter(p => SALES_CORE_IDS.has(p.id));
    const holding = list.filter(p => p.category === "holding" && !SALES_CORE_IDS.has(p.id));
    const rest = list.filter(p => !SALES_CORE_IDS.has(p.id) && p.category !== "holding");
    return `<div class="path-people-embed">
      ${sales.length ? `<h4 class="path-block-title">Sales-контур</h4><div class="people-grid">${sales.map(personCardHtml).join("")}</div>` : ""}
      ${rest.length ? `<h4 class="path-block-title" style="margin-top:16px">Команда</h4><div class="people-grid">${rest.map(personCardHtml).join("")}</div>` : ""}
      ${holding.length ? `<h4 class="path-block-title" style="margin-top:16px">Холдинг</h4><div class="people-grid">${holding.map(personCardHtml).join("")}</div>` : ""}
    </div>`;
  }

  function contactCardHtml(item) {
    const p = findPerson(item.id);
    if (!p) return "";
    const c = getContact(item.id);
    const url = item.prefill
      ? telegramUrlFor(item.id, item.prefill)
      : (c.telegram || telegramUrlFor(item.id, ""));
    const copyAttr = item.copy && item.prefill
      ? ` data-copy-text="${esc(item.prefill)}"`
      : "";
    const tgBtn = url
      ? `<a class="contact-card-cta" href="${esc(url)}" target="_blank" rel="noopener"${copyAttr}>${esc(item.cta || "Написать")}</a>`
      : "";
    return `<div class="contact-card">
      <button type="button" class="contact-card-main" data-person="${p.id}">
        ${personAvatarHtml(p, false)}
        <span class="contact-card-text">
          <span class="contact-card-name">${esc(p.name)}</span>
          <span class="contact-card-role">${esc(p.role)}</span>
        </span>
      </button>
      ${tgBtn}
    </div>`;
  }

  function renderQuizHtml(quizId) {
    const quiz = rulesQuiz && rulesQuiz.id === quizId ? rulesQuiz : rulesQuiz;
    if (!quiz || !quiz.questions) {
      return `<p class="path-empty">Тест не загрузился — обнови страницу или напиши Диме.</p>`;
    }
    const passed = isQuizPassed(quiz.id);
    const prev = quizState[quiz.id] || {};
    if (passed) {
      return `<div class="quiz-wrap quiz-passed">
        <p class="path-callout">Тест сдан: ${prev.score || quiz.pass_score}/${quiz.questions.length}. Можно идти дальше.</p>
        <button type="button" class="btn" data-quiz-retry="${esc(quiz.id)}">Пройти ещё раз</button>
      </div>`;
    }
    const qs = quiz.questions.map((q, qi) => {
      const opts = (q.options || []).map((opt, oi) =>
        `<label class="quiz-option"><input type="radio" name="quiz_${esc(quiz.id)}_${qi}" value="${oi}" /><span>${esc(opt)}</span></label>`
      ).join("");
      return `<fieldset class="quiz-q" data-q-idx="${qi}">
        <legend>${qi + 1}. ${esc(q.text)}</legend>
        ${opts}
        <div class="quiz-feedback" hidden></div>
      </fieldset>`;
    }).join("");
    return `<div class="quiz-wrap" data-quiz-id="${esc(quiz.id)}">
      <p class="path-callout">${esc(quiz.intro || "")}</p>
      <p class="path-note">Проходной балл: <strong>≥${quiz.pass_score}</strong> из ${quiz.questions.length}.</p>
      <form class="quiz-form">${qs}
        <button type="submit" class="btn btn-done">Проверить ответы</button>
      </form>
      <div class="quiz-result" hidden></div>
    </div>`;
  }

  function bindQuiz(container) {
    container.querySelectorAll("[data-quiz-retry]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.quizRetry;
        delete quizState[id];
        saveQuizState();
        if (state["step_5"]) delete state["step_5"].rules_quiz;
        saveState();
        renderMain();
      });
    });
    container.querySelectorAll(".quiz-form").forEach(form => {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const wrap = form.closest(".quiz-wrap");
        const quizId = wrap && wrap.dataset.quizId;
        const quiz = rulesQuiz;
        if (!quiz || quiz.id !== quizId) return;
        let score = 0;
        const details = [];
        quiz.questions.forEach((q, qi) => {
          const checked = form.querySelector(`input[name="quiz_${quiz.id}_${qi}"]:checked`);
          const chosen = checked ? parseInt(checked.value, 10) : -1;
          const ok = chosen === q.answer;
          if (ok) score += 1;
          const field = form.querySelector(`.quiz-q[data-q-idx="${qi}"]`);
          const fb = field && field.querySelector(".quiz-feedback");
          if (fb) {
            fb.hidden = false;
            if (ok) {
              fb.className = "quiz-feedback quiz-ok";
              fb.textContent = "Верно.";
            } else {
              fb.className = "quiz-feedback quiz-bad";
              const correct = q.options[q.answer];
              fb.innerHTML = `<strong>Неверно.</strong> Правильно: ${esc(correct)}<br/><span class="quiz-source">Где взять: ${esc(q.source || "")}</span><br/><span class="quiz-explain">${esc(q.explain || "")}</span>`;
            }
          }
          details.push({ id: q.id, ok, chosen });
        });
        const pass = score >= (quiz.pass_score || 18);
        quizState[quiz.id] = { passed: pass, score, at: Date.now(), details };
        saveQuizState();
        const result = wrap.querySelector(".quiz-result");
        if (result) {
          result.hidden = false;
          result.className = "quiz-result " + (pass ? "quiz-ok" : "quiz-bad");
          result.innerHTML = pass
            ? `<strong>Сдано: ${score}/${quiz.questions.length}.</strong> Можно нажать «Сделано» и идти дальше.`
            : `<strong>Не сдано: ${score}/${quiz.questions.length}.</strong> Нужно ≥${quiz.pass_score}. Исправь ошибки (подсказки выше) и попробуй снова.`;
        }
        if (pass) {
          setTaskDone(5, "rules_quiz", true);
          renderMain();
        }
      });
    });
  }

  function renderPathItem(item, stepId) {
    if (item.kind === "step") {
      return "";
    }
    if (item.kind === "note") {
      return `<div class="path-callout">${esc(item.text)}</div>`;
    }
    if (item.kind === "quiz") {
      return renderQuizHtml(item.id || "rules_day5");
    }
    if (item.kind === "view") {
      return pathCtaHtml({
        title: item.title || "Открыть раздел",
        cta: item.cta || "Открыть",
        attrs: ` data-view="${esc(item.view || "")}"`,
        tag: "button"
      });
    }
    if (item.kind === "questions") {
      const items = item.items || [];
      return `<ol class="path-questions">${items.map(q => `<li>${esc(q)}</li>`).join("")}</ol>`;
    }
    if (item.kind === "people_grid") {
      return peopleGridHtml();
    }
    if (item.kind === "contact_card") {
      return contactCardHtml(item);
    }
    if (item.kind === "link") {
      return pathCtaHtml({
        title: item.title || item.url,
        sub: item.sub || "",
        cta: item.cta || "Открыть",
        href: item.url,
        flat: !!item.flat
      });
    }
    if (item.kind === "copy") {
      return pathCtaHtml({
        title: item.label || "Скопировать текст",
        sub: "",
        cta: item.cta || "Скопировать",
        attrs: ` data-copy-text="${esc(item.text || "")}"`
      });
    }
    if (item.kind === "overlay" && item.id === "people") {
      return peopleGridHtml();
    }
    if (item.kind === "telegram") {
      const url = telegramUrlFor(item.personId || "dima", item.prefill || "");
      if (!url) return "";
      const copyAttr = item.copy && item.prefill
        ? ` data-copy-text="${esc(item.prefill)}"`
        : "";
      return pathCtaHtml({
        title: item.label || "Написать в Telegram",
        sub: "",
        cta: item.cta || "Написать",
        href: url,
        className: "path-link path-link-cta path-link-tg",
        attrs: copyAttr
      });
    }
    if (item.kind === "person") {
      return contactCardHtml({ id: item.id, cta: item.cta || "Написать", prefill: item.prefill || "", copy: !!item.copy });
    }
    if (item.kind === "resource") {
      const r = findResource(item.id);
      if (!r) return "";
      const cta = item.cta || (r.url && r.url.includes("t.me") ? "Вступить" : "Открыть");
      if (r.action === "people") {
        return pathCtaHtml({
          title: r.title,
          sub: r.subtitle || "поверх шага",
          cta: cta,
          attrs: ` data-overlay="people"`
        });
      }
      if (r.action) {
        return pathCtaHtml({
          title: r.title,
          sub: r.subtitle || "",
          cta: cta,
          attrs: ` data-view="${r.action}"`
        });
      }
      if (r.url) {
        return pathCtaHtml({
          title: r.title,
          sub: "",
          cta: cta,
          href: r.url,
          flat: item.flat !== false
        });
      }
      const noteBody = r.note || r.subtitle || "запроси у Димы";
      const noteCls = noteBody.length > 120 ? " path-note-rich" : "";
      return `<div class="path-note${noteCls}"><strong>${esc(r.title)}</strong>${noteBody.length > 120 ? `<p>${esc(noteBody)}</p>` : ` — ${esc(noteBody)}`}</div>`;
    }
    if (item.kind === "deck") {
      const d = findDeck(item.id);
      if (!d) return "";
      if (d.url) {
        return pathCtaHtml({ title: d.title, sub: d.when || "", cta: "Открыть", href: d.url });
      }
      const owner = findPerson(d.owner);
      return pathCtaHtml({
        title: d.title,
        sub: `Запросить у ${owner ? owner.name : d.requestVia}`,
        cta: "Запросить",
        attrs: ` data-person="${d.owner}"`
      });
    }
    if (item.kind === "section" && item.id === "chats") {
      const list = chatsFiltered(item.filter);
      return list.map(ch => {
        if (ch.inviteUrl) {
          return pathCtaHtml({ title: ch.name, sub: ch.desc || "", cta: "Вступить", href: ch.inviteUrl });
        }
        return `<div class="path-note">TG · ${esc(ch.name)} — попроси ${esc(ch.whoAdds)} добавить</div>`;
      }).join("");
    }
    if (item.kind === "access_verify") {
      const phase = item.phase || "day1";
      const verify = (accessChecklist && accessChecklist.hiree_verify) || [];
      const items = verify.filter(x => (x.phase || "day1") === phase);
      if (!items.length) return "";
      return `<div class="access-verify-list path-verify">${items.map(v => {
        const checked = accessState[v.id] ? "checked" : "";
        return `<label class="access-row"><input type="checkbox" data-access-id="${esc(v.id)}" ${checked} /><span>${esc(v.text)}</span></label>`;
      }).join("")}</div>`;
    }
    return "";
  }

  function bindPathActions(container) {
    container.querySelectorAll("[data-person]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-copy-email], .person-contact-tg, a.contact-btn")) return;
        openPerson(el.dataset.person);
      });
    });
    container.querySelectorAll("[data-overlay='people']").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        openPeopleOverlay();
      });
    });
    container.querySelectorAll("[data-copy-text]").forEach(el => {
      el.addEventListener("click", async () => {
        const text = el.getAttribute("data-copy-text") || "";
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          const action = el.querySelector(".path-link-action")
            || (el.classList.contains("contact-card-cta") ? el : null)
            || el.querySelector(".contact-card-cta");
          if (action) {
            const prev = action.textContent;
            action.textContent = "Скопировано ✓";
            setTimeout(() => { action.textContent = prev; }, 1600);
          }
        } catch (_) { /* ignore */ }
      });
    });
    bindCopyEmail(container);
  }

  function renderUnitRoutingCard(intro) {
    const rows = UNIT_ROUTING.map(r => {
      const p = findPerson(r.person);
      const who = p
        ? `<button type="button" class="path-link inline-person" data-person="${p.id}">${esc(p.name.split(" ")[0])}</button>`
        : esc(r.person);
      return `<tr><td>${esc(r.signal)}</td><td><strong>${esc(r.unit)}</strong></td><td>${who}</td></tr>`;
    }).join("");
    return `
      <div class="card unit-routing-card">
        <h3 class="section-heading">Куда вести клиента</h3>
        <p class="card-intro">${intro || "Сомневаешься — Cult Group + Дима."}</p>
        <div class="sales-table-wrap">
          <table class="sales-table routing-table">
            <thead><tr><th>Сигнал в брифе</th><th>Юнит</th><th>Кому</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="margin-top:12px">
          <button type="button" class="btn" data-view="decks">Какую презу показать →</button>
        </div>
      </div>`;
  }

  function ensureFirstTaskExpanded(step) {
    const anyOpen = step.tasks.some(t => expandedTasks[step.id + "." + t.id]);
    if (anyOpen) return;
    const first = step.tasks.find(t => (taskPaths[step.id + "." + t.id] || []).length);
    if (first) expandedTasks[step.id + "." + first.id] = true;
  }

  function renderModeToggle() {
    return `
      <div class="quest-mode-bar">
        <button type="button" class="quest-mode-btn ${programMode === "focus" ? "active" : ""}" data-program-mode="focus">Шаг за шагом</button>
        <button type="button" class="quest-mode-btn ${programMode === "list" ? "active" : ""}" data-program-mode="list">Список дня</button>
      </div>`;
  }

  function renderQuestRail(path, idx) {
    const dayId = path[idx].stepId;
    const dayItems = path.map((q, i) => ({ q, i })).filter(x => x.q.stepId === dayId);
    return `
      <div class="quest-rail" aria-label="Шаги дня">
        ${dayItems.map(({ q, i }, n) => {
          const done = !!(state["step_" + q.stepId] || {})[q.taskId];
          const active = i === idx ? "active" : "";
          const cls = done ? "done" : "";
          return `<button type="button" class="quest-step-num ${cls} ${active}" data-quest-idx="${i}" title="${esc(q.task.text)}" aria-label="Шаг ${n + 1}" aria-current="${active ? "step" : "false"}">${n + 1}</button>`;
        }).join("")}
      </div>`;
  }

  function setTaskDone(stepId, taskId, done) {
    const step = steps.find(s => String(s.id) === String(stepId));
    const wasComplete = step ? stepComplete(step) : false;
    state["step_" + stepId] = state["step_" + stepId] || {};
    if (done) state["step_" + stepId][taskId] = true;
    else delete state["step_" + stepId][taskId];
    saveState();
    if (done && step && !wasComplete && stepComplete(step)) {
      queueDayComplete(step);
    }
  }

  let pendingDayComplete = null;

  function queueDayComplete(step) {
    pendingDayComplete = step;
  }

  function flushDayComplete() {
    if (!pendingDayComplete) return;
    const step = pendingDayComplete;
    pendingDayComplete = null;
    showDayComplete(step);
  }

  function showDayComplete(step) {
    const el = document.getElementById("dayDoneBackdrop");
    if (!el) return;
    const body = document.getElementById("dayDoneBody");
    if (body) {
      const dayLabel = step ? ("День " + step.id) : "День";
      body.innerHTML = `
        <p class="mono-tag welcome-tag">Готово</p>
        <h2 class="welcome-title" id="dayDoneTitle">День завершён</h2>
        <p class="welcome-lead">${esc(dayLabel)} закрыт. Спасибо за продуктивную работу. Ты красавчик!</p>
      `;
    }
    el.hidden = false;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeDayComplete() {
    const el = document.getElementById("dayDoneBackdrop");
    if (!el) return;
    el.hidden = true;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (!document.getElementById("welcomeBackdrop")?.classList.contains("is-open")
      && !document.getElementById("gradBackdrop")?.classList.contains("is-open")
      && !document.getElementById("modalBackdrop")?.classList.contains("is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  function advanceQuestAfterAction() {
    const path = buildQuestPath();
    if (currentQuestIdx < path.length - 1) goToQuest(currentQuestIdx + 1);
    else renderMain();
    flushDayComplete();
  }

  function renderQuestDecisionBar(opts) {
    const { stepId, taskId, isDone, showBack, backId } = opts;
    const gated = !canCompleteTask(stepId, taskId);
    const gateHint = gated
      ? `<p class="path-note quiz-gate-hint">${esc(quizGateMessage())}</p>`
      : "";
    return `
      ${gateHint}
      <div class="nav-row quest-nav quest-decision">
        ${showBack ? `<button type="button" class="btn" id="${backId || "prevQuest"}">← Назад</button>` : ""}
        <button type="button" class="btn btn-skip" data-quest-skip data-step="${stepId}" data-task="${taskId}" ${gated ? "disabled" : ""}>Пропустить</button>
        <button type="button" class="btn btn-done ${isDone ? "is-active" : ""}" data-quest-done data-step="${stepId}" data-task="${taskId}" ${gated ? "disabled" : ""}>Сделано</button>
      </div>`;
  }

  function renderProgramFocus() {
    const path = buildQuestPath();
    if (!path.length) return `<div class="card"><p>Нет задач</p></div>`;
    if (currentQuestIdx >= path.length) currentQuestIdx = path.length - 1;
    if (currentQuestIdx < 0) currentQuestIdx = 0;
    const q = path[currentQuestIdx];
    const step = q.day;
    currentDayIdx = q.dayIdx;
    const isDone = !!(state["step_" + q.stepId] || {})[q.taskId];
    const pathItems = taskPaths[q.key] || [];
    const prev = currentQuestIdx > 0;
    const next = currentQuestIdx < path.length - 1;
    const firstOfDay = path.findIndex(x => x.stepId === q.stepId) === currentQuestIdx;
    const linksBlock = firstOfDay && (step.links || []).length
      ? `<div class="quest-day-links"><span class="mono-tag">Ссылки дня</span><div class="path-block-list" style="margin-top:8px">${step.links.map(l =>
          pathCtaHtml({ title: l.label, cta: "Открыть", href: l.url })
        ).join("")}</div></div>`
      : "";

    const actionsHint = pathItems.length
      ? renderPathBlocks(pathItems, step.id)
      : `<p class="path-empty">Открой раздел в меню или напиши Диме в отчёте дня.</p>`;

    return `
      ${renderModeToggle()}
      <article class="card card-hero quest-focus ${isDone ? "quest-done" : ""}">
        ${renderQuestRail(path, currentQuestIdx)}
        <header class="quest-focus-head">
          <div class="quest-focus-meta">
            <span class="mono-tag">Шаг ${currentQuestIdx + 1}/${path.length}</span>
            <span class="quest-focus-day">${esc(step.title)}</span>
          </div>
          <h2 class="card-title quest-task-title">${esc(q.task.text)}</h2>
          ${q.task.hint ? `<p class="quest-task-hint">${esc(q.task.hint)}</p>` : ""}
        </header>
        <div class="quest-do-box">
          ${actionsHint}
          ${linksBlock}
        </div>
        ${renderQuestDecisionBar({ stepId: q.stepId, taskId: q.taskId, isDone, showBack: prev, backId: "prevQuest" })}
        ${!next && isDone ? `<div class="complete-banner complete-banner-final"><p><strong>Онбординг пройден.</strong> Напиши Диме. Дальше — weekly 1:1 с CRO.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><a class="btn primary" href="https://t.me/cosmovisioner" target="_blank" rel="noopener">Написать Диме</a></div></div>` : ""}
      </article>`;
  }

  function renderProgramList() {
    const step = steps[currentDayIdx];
    ensureFirstTaskExpanded(step);
    const stepTasks = state["step_" + step.id] || {};
    const allDone = stepComplete(step);

    let tasksHtml = "";
    let lastGroup = null;
    step.tasks.forEach((task) => {
      if (task.group && task.group !== lastGroup) {
        tasksHtml += `<h4 class="task-group-heading">${task.group}</h4>`;
        lastGroup = task.group;
      }
      const key = step.id + "." + task.id;
      const path = taskPaths[key] || [];
      const isOpen = expandedTasks[key];
      const isDone = !!stepTasks[task.id];
      const qIdx = buildQuestPath().findIndex(q => q.key === key);
      const gated = !canCompleteTask(step.id, task.id);
      tasksHtml += `
        <div class="task-item ${isOpen ? "open" : ""} ${isDone ? "done" : ""}" data-task-key="${key}">
          <div class="task-head">
            <span class="task-text">${esc(task.text)}${task.hint ? `<span class="task-hint">${esc(task.hint)}</span>` : ""}</span>
            <button type="button" class="btn quest-jump-btn" data-quest-idx="${qIdx}" title="Открыть как шаг">Шаг</button>
            <span class="task-chevron">${path.length ? (isOpen ? "▲" : "▼") : ""}</span>
          </div>
          ${path.length ? `<div class="task-path">${renderPathBlocks(path, step.id)}</div>` : ""}
          <div class="task-decision">
            ${gated ? `<p class="path-note quiz-gate-hint">${esc(quizGateMessage())}</p>` : ""}
            <button type="button" class="btn btn-skip" data-quest-skip data-step="${step.id}" data-task="${task.id}" data-quest-idx="${qIdx}" ${gated ? "disabled" : ""}>Пропустить</button>
            <button type="button" class="btn btn-done ${isDone ? "is-active" : ""}" data-quest-done data-step="${step.id}" data-task="${task.id}" ${gated ? "disabled" : ""}>Сделано</button>
          </div>
        </div>`;
    });

    const prev = currentDayIdx > 0 ? steps[currentDayIdx - 1] : null;
    const next = currentDayIdx < steps.length - 1 ? steps[currentDayIdx + 1] : null;
    const phaseMeta = step.phase ? `${step.phase} · ` : "";
    return `
      ${renderModeToggle()}
      <article class="card card-hero">
        <div class="card-meta">${phaseMeta}${formatDateRu(step.date, step.weekday)} · день ${step.id} из ${steps.length}</div>
        <h2 class="card-title">${step.title}</h2>
        <p class="card-intro">${esc(step.intro)}</p>
        ${tasksHtml}
        ${allDone ? `<div class="complete-banner${currentDayIdx >= steps.length - 1 ? " complete-banner-final" : ""}">${currentDayIdx < steps.length - 1 ? `<p><strong>День завершён.</strong> Спасибо за продуктивную работу. Ты красавчик!</p>` : `<p><strong>Онбординг пройден.</strong> Напиши Диме в Telegram.</p>`}</div>` : ""}
        <div class="nav-row">
          <button type="button" class="btn" id="prevDay" ${!prev ? "disabled" : ""}>${prev ? "← " + prev.title : "← Назад"}</button>
          <button type="button" class="btn primary" id="nextDay" ${!next ? "disabled" : ""}>${next ? next.title + " →" : "Конец"}</button>
        </div>
      </article>
      ${step.id === 2 ? renderUnitRoutingCard("После продуктов — держи таблицу под рукой.") : ""}`;
  }

  function renderProgram() {
    return programMode === "list" ? renderProgramList() : renderProgramFocus();
  }

  function renderPools() {
    if (!clientPools) {
      return `<div class="card"><h2 class="card-title">Пулы клиентов</h2><p class="card-intro">Не удалось загрузить список. Обнови страницу.</p></div>`;
    }
    const units = clientPools.units || [];
    const order = ["cult", "blaster", "sputnik"];
    const sorted = [...units].sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const blocks = sorted.map(u => {
      const clients = u.clients || u.brands || [];
      const agencies = u.agencies || [];
      const names = clients.map(c => typeof c === "string" ? c : c.name).filter(Boolean);
      const agencyNames = agencies.map(c => typeof c === "string" ? c : c.name).filter(Boolean);
      const list = names.map(n => `<li>${esc(n)}</li>`).join("");
      const agencyList = agencyNames.length
        ? `<p class="pools-agency-label">Агентства</p><ul class="pools-list">${agencyNames.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`
        : "";
      return `
        <div class="card pools-unit-card">
          <h3 class="section-heading">${esc(u.name)}</h3>
          <p class="card-intro">${esc(u.owner || "")}${u.label ? " · " + esc(u.label) : ""}</p>
          <ul class="pools-list">${list || "<li class='path-note'>Список пуст</li>"}</ul>
          ${agencyList}
        </div>`;
    }).join("");
    return `
      <div class="card">
        <h2 class="card-title">Пулы клиентов</h2>
        <p class="card-intro">С кем уже работают юниты. Не колл-лист и не перехват: пишет держатель отношений.</p>
      </div>
      ${blocks}`;
  }

  function renderMap() {
    const pillars = orgPillars();

    const pillarHtml = pillars.map(pillar => {
      const isCult = pillar.id === "cult_group";
      const items = isCult ? pillar.units : pillar.startups;
      const inner = items.map(item => {
        const sel = selectedUnit === item.id ? "selected" : "";
        const count = isCult ? peopleForUnit(item.id).length : (item.id === "prodavan" ? peopleForUnit("techtigers").length : 0);
        const countHtml = count
          ? `<div class="org-unit-count">${count} контакт${count === 1 ? "" : count < 5 ? "а" : "ов"}</div>`
          : "";
        return `<div class="org-unit ${sel}" data-unit="${item.id}" style="--unit-color:${item.color || pillar.color}">
          <div class="org-unit-name">${item.short || item.name}</div>
          <div class="org-unit-desc">${item.desc}</div>
          ${countHtml}
        </div>`;
      }).join("");

      return `
        <section class="pillar-block" style="--pillar-color:${pillar.color}">
          <div class="pillar-head">
            <h3 class="pillar-title">${pillar.name}</h3>
            <p class="pillar-tagline">${pillar.tagline}</p>
            ${pillar.products_ref ? `<p class="pillar-drive"><a class="btn" href="${pillar.products_ref}" target="_blank" rel="noopener">Эксплейнеры продуктов · Drive</a></p>` : ""}
          </div>
          <div class="org-grid pillar-units">${inner}</div>
        </section>`;
    }).join("");

    let detail = "";
    if (selectedUnit) {
      const hit = findOrgItem(selectedUnit);
      if (hit) {
        const u = hit.item;
        if (hit.kind === "unit") {
          const people = peopleForUnit(u.id);
          const unitDecks = decksForUnit(u.id);
          detail = `
            <div class="unit-detail card">
              <h3 class="section-heading">${u.name}</h3>
              <p style="font-size:13px;color:var(--muted)">${u.desc}</p>
              ${people.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Люди</h4>
                <div class="people-grid">${people.map(p => personCardHtml(p)).join("")}</div>` : ""}
              ${unitDecks.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Презентации</h4>
                ${unitDecks.map(d => deckCardHtml(d)).join("")}` : ""}
            </div>`;
        } else if (hit.kind === "startup") {
          const ttPeople = u.id === "prodavan" ? peopleForUnit("techtigers") : [];
          detail = `
            <div class="unit-detail card startup-detail">
              <span class="mono-tag">ТехноТигры</span>
              <h3 class="section-heading">${u.name}</h3>
              <p style="font-size:13px;color:var(--muted)">${u.desc}</p>
              ${ttPeople.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Контакт</h4>
                <div class="people-grid">${ttPeople.map(p => personCardHtml(p)).join("")}</div>` : ""}
            </div>`;
        }
      }
    }

    return `
      <div class="card">
        <h2 class="card-title">Карта холдинга</h2>
        <div class="pillar-grid">${pillarHtml}</div>
      </div>
      ${detail}
      ${renderUnitRoutingCard("Быстрый роутинг по типу задачи.")}`;
  }

  function personContactsHtml(p) {
    const c = getContact(p.id);
    if (!c.email && !c.telegram) return "";
    const parts = [];
    if (c.email) {
      parts.push(`<button type="button" class="person-contact person-contact-email" data-copy-email="${esc(c.email)}" title="Скопировать почту">${esc(c.email)}</button>`);
    }
    if (c.telegram) {
      const label = c.telegramLabel || "Telegram";
      parts.push(`<a class="person-contact person-contact-tg" href="${esc(c.telegram)}" target="_blank" rel="noopener">${esc(label)}</a>`);
    }
    return `<div class="person-contacts">${parts.join("")}</div>`;
  }

  async function copyEmail(email, btn) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      if (btn) {
        const prev = btn.textContent;
        btn.classList.add("copied");
        btn.textContent = "Скопировано ✓";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = prev;
        }, 1600);
      }
    } catch (_) {
      alert("Не удалось скопировать — выдели почту вручную");
    }
  }

  function bindCopyEmail(root) {
    (root || document).querySelectorAll("[data-copy-email]").forEach(el => {
      if (el.dataset.copyBound) return;
      el.dataset.copyBound = "1";
      el.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        copyEmail(el.dataset.copyEmail, el);
      });
    });
  }

  function personCardHtml(p) {
    const partner = p.category === "partner_slz" || p.category === "collaborator" ? " partner" : "";
    const sub = p.bio_short ? `<div class="person-bio">${esc(p.bio_short)}</div>` : "";
    return `<div class="person-card${partner}" data-person="${p.id}">
      ${personAvatarHtml(p, false)}
      <div class="person-card-body">
        <div class="person-name">${esc(p.name)}</div>
        <div class="person-role">${esc(p.role)}</div>
        ${sub}
        ${personContactsHtml(p)}
        <span class="person-unit-tag">${esc(p.unit)}</span>
      </div>
    </div>`;
  }

  function renderPeople() {
    const filterUnits = [
      { id: "all", name: "Все" },
      { id: "sales_core", name: "Sales-контур" },
      ...cultUnits().map(u => ({ id: u.id, name: u.short || u.name })),
      { id: "techtigers", name: "ТехноТигры" },
      { id: "holding", name: "Холдинг" },
      { id: "partner_slz", name: "Партнёры" }
    ];
    const chips = filterUnits.map(u => {
      const active = peopleFilter === u.id ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-filter="${u.id}">${u.name}</button>`;
    }).join("");

    let list = team.people.filter(p => p.id !== "leonid");
    if (peopleFilter === "holding") {
      list = list.filter(p => p.category === "holding" && p.id !== "homich");
    } else if (peopleFilter === "sales_core") {
      list = list.filter(p => SALES_CORE_IDS.has(p.id));
    } else if (peopleFilter !== "all") {
      list = list.filter(p => personUnitId(p) === peopleFilter);
    }
    list = list.filter(p => p.id !== "homich");
    const staff = list.filter(p => p.category !== "partner_slz" && p.category !== "collaborator" && p.category !== "holding");
    const holding = list.filter(p => p.category === "holding");
    const partners = list.filter(p => p.category === "partner_slz");
    const collaborators = list.filter(p => p.category === "collaborator");

    return `
      <div class="card">
        <h2 class="card-title">Справочник людей</h2>
        <p class="card-intro">Кликни карточку — кратко, Clifton, когда писать, контакты. Фильтр <strong>Sales-контур</strong> — кого пинговать в первую неделю.</p>
        <div class="filter-row">${chips}</div>
        ${staff.length ? `<h3 class="mono-tag" style="margin-bottom:12px">${peopleFilter === "sales_core" ? "Sales-контур · первая неделя" : "Штат"}</h3><div class="people-grid">${staff.map(p => personCardHtml(p)).join("")}</div>` : ""}
        ${holding.length ? `<h3 class="mono-tag" style="margin:20px 0 12px">Холдинг · смежные контакты</h3><p style="font-size:13px;color:var(--muted);margin-bottom:12px">Финансы, документооборот (Аля), СнупДок, PR, ops. Это <strong>не</strong> чат «Супертопы» — туда на онбординге не добавляют. Аля — обязательный контакт sales по актам/счетам/Контуру.</p><div class="people-grid">${holding.map(p => personCardHtml(p)).join("")}</div>` : ""}
        ${partners.length ? `<h3 class="mono-tag" style="margin:20px 0 12px">Партнёрские сейлз-менеджеры</h3><p style="font-size:13px;color:var(--muted);margin-bottom:12px">${team.org.partner_slz?.routing || ""}</p><div class="people-grid">${partners.map(p => personCardHtml(p)).join("")}</div>` : ""}
        ${collaborators.length ? `<h3 class="mono-tag" style="margin:20px 0 12px">Коллаборации (не sales)</h3><div class="people-grid">${collaborators.map(p => personCardHtml(p)).join("")}</div>` : ""}
      </div>`;
  }

  function chatCardHtml(ch) {
    const req = ch.priority === "required" ? " required" : "";
    const badge = PRIORITY_LABELS[ch.priority] || ch.priority;
    let actions = "";
    if (ch.inviteUrl) {
      actions = `<a class="contact-btn primary" href="${ch.inviteUrl}" target="_blank" rel="noopener">Вступить в чат</a>`;
    } else {
      actions = `<span class="path-note">Попроси добавить: ${ch.whoAdds}</span>`;
    }
    return `
      <div class="chat-card${req}">
        <div class="chat-head">
          <div class="chat-name">${ch.name}</div>
          <span class="chat-badge">${badge}</span>
        </div>
        <div class="chat-desc">${ch.desc}</div>
        <div class="chat-meta">Добавляет: ${ch.whoAdds}</div>
        <div class="chat-actions">${actions}</div>
      </div>`;
  }

  function renderChats() {
    const required = chatsFiltered("required");
    const rest = (chats.chats || []).filter(c => c.priority !== "required");
    const skipBlock = chats.skip
      ? `<div class="skip-list"><strong>Не на старте (по мере сделок / не sales-default):</strong> ${chats.skip.map(esc).join(" · ")}</div>`
      : "";
    const ban = chats.do_not_add || [];
    const banNote = chats.meta?.do_not_add_note || "Не добавляем на онбординге";
    const banBlock = ban.length
      ? `<div class="skip-list" style="margin-top:12px"><strong>${esc(banNote)}:</strong><ul class="hint-list" style="margin-top:8px">${ban.map(b => {
          if (typeof b === "string") return `<li>${esc(b)}</li>`;
          return `<li><strong>${esc(b.name || "")}</strong>${b.reason ? " — " + esc(b.reason) : ""}</li>`;
        }).join("")}</ul></div>`
      : "";
    return `
      <div class="card">
        <h2 class="card-title">Telegram · рабочие чаты</h2>
        <p class="card-intro">${chats.meta?.note || ""} <button type="button" class="btn" data-view="access" style="margin-top:8px">Все доступы →</button></p>
        <h3 class="mono-tag" style="margin-bottom:12px">Обязательные с первого дня</h3>
        ${required.map(chatCardHtml).join("")}
        <h3 class="mono-tag" style="margin:20px 0 12px">По мере работы</h3>
        ${rest.map(chatCardHtml).join("")}
        ${skipBlock}
        ${banBlock}
      </div>`;
  }

  function deckCardHtml(d) {
    const cls = d.status === "live" ? "live" : "request";
    const owner = findPerson(d.owner);
    let actions = "";
    if (d.url) {
      actions = `<a class="contact-btn primary" href="${d.url}" target="_blank" rel="noopener">Открыть презу</a>`;
    } else if (owner) {
      actions = `<button type="button" class="contact-btn" data-person="${d.owner}">Запросить у ${owner.name.split(" ")[0]}</button>`;
    }
    return `
      <div class="deck-card ${cls}">
        <div class="deck-title">${d.title}</div>
        <div class="deck-when">${d.when}</div>
        <div class="chat-actions">${actions}</div>
      </div>`;
  }

  function renderDecks() {
    const routingRows = (decks.routing || []).map(r => {
      const d = findDeck(r.deck);
      return `<tr><td>${r.signal}</td><td>${d ? d.title : r.deck}</td></tr>`;
    }).join("");

    return `
      <div class="card">
        <h2 class="card-title">Хаб презентаций</h2>
        <p class="card-intro">${decks.meta?.rule || ""}</p>
        <div class="card deck-routing-first">
          <h3 class="section-heading">Быстрый выбор</h3>
          <table class="routing-table">
            <thead><tr><th>Сигнал в брифе</th><th>Какую презу</th></tr></thead>
            <tbody>${routingRows}</tbody>
          </table>
          <p class="path-note" style="margin-top:10px">Неясно → <strong>Cult Group</strong>. Sputnik — только после «берём» от Сергея.</p>
        </div>
        ${(decks.decks || []).map(deckCardHtml).join("")}
      </div>`;
  }

  function accessCardHtml(s) {
    const res = s.resource ? findResource(s.resource) : null;
    const url = s.url || (res && res.url) || "";
    const isTg = url.includes("t.me");
    if (url && (s.flat || s.folderStyle)) {
      return `<a class="access-sys-card access-sys-card-flat" href="${esc(url)}" target="_blank" rel="noopener">
        <span class="access-sys-name">${esc(s.name)}</span>
        <span class="path-link-flat-arrow" aria-hidden="true">→</span>
      </a>`;
    }
    let link = "";
    if (url) {
      link = `<a class="contact-btn primary" href="${esc(url)}" target="_blank" rel="noopener">${isTg ? "Вступить" : "Открыть"}</a>`;
    } else if (res && res.action) {
      link = `<button type="button" class="contact-btn primary" data-view="${res.action}">Открыть</button>`;
    } else {
      link = `<button type="button" class="contact-btn primary" data-person="dima">Написать Диме</button>`;
    }
    return `<div class="access-sys-card">
      <div class="access-sys-name">${esc(s.name)}</div>
      ${s.role || s.who ? `<div class="access-sys-meta">${esc(s.role || "")}${s.who ? (s.role ? " · " : "") + esc(s.who) : ""}</div>` : ""}
      <div class="chat-actions">${link}</div>
    </div>`;
  }

  function renderAccessTelegramSection(section) {
    const list = chats.chats || [];
    const withLink = list.filter(c => c.inviteUrl);
    const withoutLink = list.filter(c => !c.inviteUrl);
    const prefill = "Привет, Дима! Добавь меня, пожалуйста, в чаты:\n\n"
      + withoutLink.map(c => "• " + c.name).join("\n")
      + "\n\nСпасибо!";
    const dimaUrl = telegramUrlFor("dima", prefill);
    const ban = (chats.do_not_add || []).map(b =>
      typeof b === "string" ? `<li>${esc(b)}</li>` : `<li><strong>${esc(b.name || "")}</strong>${b.reason ? " — " + esc(b.reason) : ""}</li>`
    ).join("");
    return `
      <div class="card" id="access-telegram">
        <h3 class="section-heading">${esc(section.title || "Telegram-чаты")}</h3>
        ${section.intro ? `<p class="card-intro">${esc(section.intro)}</p>` : ""}
        <div class="access-sys-grid">${withLink.map(ch => accessCardHtml({
          name: ch.name,
          url: ch.inviteUrl,
          flat: true
        })).join("")}</div>
        ${withoutLink.length && dimaUrl ? `
          <div style="margin-top:14px">
            <a class="path-link path-link-cta path-link-tg" href="${esc(dimaUrl)}" target="_blank" rel="noopener" data-copy-text="${esc(prefill)}">
              <span class="path-link-main">
                <span class="path-link-title">Чаты без ссылки</span>
              </span>
              <span class="path-link-action">Написать Диме</span>
            </a>
          </div>` : ""}
        ${ban ? `<div class="skip-list" style="margin-top:16px"><strong>Не добавляем на онбординге:</strong><ul class="hint-list">${ban}</ul></div>` : ""}
      </div>`;
  }

  function renderAccess() {
    if (!accessChecklist) {
      return `<div class="card"><h2 class="card-title">Ссылки и доступы</h2><p class="card-intro">Не удалось загрузить список.</p></div>`;
    }
    const meta = accessChecklist.meta || {};
    const sections = accessChecklist.sections || [];
    const body = sections.map(sec => {
      if (sec.chats) return renderAccessTelegramSection(sec);
      const flat = sec.id === "folders";
      const grid = (sec.items || []).map(item => accessCardHtml({ ...item, flat: flat || !!item.flat, folderStyle: flat })).join("");
      return `<div class="card" id="access-${esc(sec.id)}">
        <h3 class="section-heading">${esc(sec.title)}</h3>
        ${sec.intro ? `<p class="card-intro">${esc(sec.intro)}</p>` : ""}
        <div class="access-sys-grid">${grid}</div>
      </div>`;
    }).join("");

    return `
      <div class="card">
        <h2 class="card-title">${esc(meta.title || "Ссылки и доступы")}</h2>
        <p class="card-intro">${esc(meta.note || "")}</p>
      </div>
      ${body}`;
  }

  function renderSkills() {
    if (!skillsHub) {
      return `<div class="card"><h2 class="card-title">Скиллы</h2><p class="card-intro">Не удалось загрузить.</p></div>`;
    }
    const meta = skillsHub.meta || {};
    const install = (meta.install_steps || []).map(s => `<li>${esc(s)}</li>`).join("");
    const basePath = location.pathname.replace(/\/[^/]*$/, "/");
    const zipUrl = basePath + (meta.pack_url || "assets/agent_pack_leonid_sales_2026_07.zip");
    const skillsFolder = basePath + "skills_pack/";
    const packFolder = basePath + (meta.pack_folder || "agent_pack_leonid_sales/");

    const faq = (meta.faq || []).map(f =>
      `<div class="faq-item"><h4 class="faq-q">${esc(f.q)}</h4><p class="faq-a">${esc(f.a)}</p></div>`
    ).join("");
    const skillsCat = (meta.skills_catalog || []).map(s =>
      `<tr><td><code>${esc(s.name)}</code></td><td>${esc(s.use)}</td></tr>`
    ).join("");
    const rolesCat = (meta.roles_catalog || []).map(s =>
      `<tr><td><code>${esc(s.name)}</code></td><td>${esc(s.use)}</td></tr>`
    ).join("");

    const cards = (skillsHub.skills || []).map(sk => {
      let body = `<p class="card-intro">${esc(sk.summary)}</p>`;
      body += `<p class="path-note"><strong>Триггеры:</strong> ${esc(sk.triggers)}</p>`;
      if (sk.rules) body += listSection("Правила", sk.rules);
      if (sk.criteria) body += listSection("Критерии", sk.criteria);
      if (sk.fields) body += listSection("8 полей brief-gate", sk.fields);
      if (sk.routes) {
        const rows = sk.routes.map(r =>
          `<tr><td>${esc(r.signal)}</td><td>${esc(r.unit)}</td><td>${esc(r.deck)}</td><td>${esc(r.who)}</td></tr>`
        ).join("");
        body += `<div class="sales-table-wrap"><table class="sales-table"><thead><tr><th>Сигнал</th><th>Юнит</th><th>Преза</th><th>Кто</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      }
      if (sk.red_flags) body += `<p class="path-note" style="margin-top:10px"><strong>Red flags:</strong> ${esc(sk.red_flags)}</p>`;
      if (sk.handoff_point) body += `<p class="path-note" style="margin-top:10px">${esc(sk.handoff_point)}</p>`;
      if (sk.group_deck) body += `<a class="contact-btn primary" href="${sk.group_deck}" target="_blank" rel="noopener">Cult Group deck</a>`;
      const skillLink = sk.slug === "agent-pack"
        ? `<a class="contact-btn primary" href="${zipUrl}" download>⬇️ Скачать ZIP →</a>`
        : `<a class="contact-btn" href="${skillsFolder}${sk.slug}/SKILL.md" target="_blank" rel="noopener">Полный SKILL.md →</a>`;
      return `<div class="card skill-card">
        <span class="mono-tag">${esc(sk.slug)}</span>
        <h3 class="section-heading">${esc(sk.title)}</h3>
        ${body}
        ${skillLink}
      </div>`;
    }).join("");

    return `
      <div class="card">
        <h2 class="card-title">${esc(meta.title || "Скиллы Cursor")}</h2>
        <p class="card-intro">${esc(meta.pack_note || "")}</p>
        ${meta.help_note ? `<p class="path-note">${esc(meta.help_note)}</p>` : ""}
        <h3 class="section-heading">${esc(meta.faq_title || "FAQ")}</h3>
        <div class="faq-list">${faq}</div>
        <h3 class="section-heading" style="margin-top:18px">${esc(meta.install_title || "Установка")}</h3>
        <ul class="hint-list">${install}</ul>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
          <a class="contact-btn primary" href="${zipUrl}" download>⬇️ Agent-pack ZIP</a>
          <a class="contact-btn" href="${packFolder}README.md" target="_blank" rel="noopener">README установки</a>
          <button type="button" class="contact-btn" data-person="dima">Написать Диме</button>
        </div>
        ${skillsCat ? `<h3 class="section-heading" style="margin-top:18px">Скиллы в пакете</h3>
        <div class="sales-table-wrap"><table class="sales-table"><thead><tr><th>Скилл</th><th>Зачем</th></tr></thead><tbody>${skillsCat}</tbody></table></div>` : ""}
        ${rolesCat ? `<h3 class="section-heading" style="margin-top:18px">Роли в пакете</h3>
        <div class="sales-table-wrap"><table class="sales-table"><thead><tr><th>Роль</th><th>Зачем</th></tr></thead><tbody>${rolesCat}</tbody></table></div>` : ""}
      </div>
      ${cards}`;
  }

  function renderMain() {
    const main = document.getElementById("mainContent");
    if (currentView === "program") main.innerHTML = renderProgram();
    else if (currentView === "map") main.innerHTML = renderMap();
    else if (currentView === "pools") main.innerHTML = renderPools();
    else if (currentView === "people") main.innerHTML = renderPeople();
    else if (currentView === "chats") {
      currentView = "access";
      main.innerHTML = renderAccess();
    }
    else if (currentView === "decks") main.innerHTML = renderDecks();
    else if (currentView === "sales") main.innerHTML = renderSales();
    else if (currentView === "access") main.innerHTML = renderAccess();
    else if (currentView === "skills") main.innerHTML = renderSkills();

    bindMainEvents(main);
    document.getElementById("xpNum").textContent = totalProgress() + "%";
    renderDayNav();
  }

  function bindMainEvents(main) {
    main.querySelectorAll(".task-item").forEach(el => {
      const key = el.dataset.taskKey;
      const head = el.querySelector(".task-head");
      head.addEventListener("click", e => {
        if (e.target.type === "checkbox") return;
        expandedTasks[key] = !expandedTasks[key];
        el.classList.toggle("open", expandedTasks[key]);
      });
    });

    main.querySelectorAll('input[type="checkbox"][data-task]').forEach(cb => {
      cb.addEventListener("click", e => e.stopPropagation());
      cb.addEventListener("change", () => {
        const sid = cb.dataset.step;
        const tid = cb.dataset.task;
        setTaskDone(sid, tid, cb.checked);
        renderMain();
        flushDayComplete();
      });
    });

    main.querySelectorAll("[data-quest-done]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (!canCompleteTask(btn.dataset.step, btn.dataset.task)) {
          window.alert(quizGateMessage());
          return;
        }
        setTaskDone(btn.dataset.step, btn.dataset.task, true);
        if (programMode === "focus") advanceQuestAfterAction();
        else {
          renderMain();
          flushDayComplete();
        }
      });
    });

    main.querySelectorAll("[data-quest-skip]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (!canCompleteTask(btn.dataset.step, btn.dataset.task)) {
          window.alert(quizGateMessage());
          return;
        }
        setTaskDone(btn.dataset.step, btn.dataset.task, false);
        if (programMode === "focus") {
          advanceQuestAfterAction();
          return;
        }
        const i = parseInt(btn.dataset.questIdx, 10);
        if (!Number.isNaN(i)) {
          programMode = "focus";
          localStorage.setItem(MODE_KEY, programMode);
          const path = buildQuestPath();
          goToQuest(Math.min(i + 1, path.length - 1));
        } else {
          renderMain();
        }
      });
    });

    main.querySelector("#prevDay")?.addEventListener("click", () => goToDay(currentDayIdx - 1));
    main.querySelector("#nextDay")?.addEventListener("click", () => goToDay(currentDayIdx + 1));

    main.querySelector("#prevQuest")?.addEventListener("click", () => goToQuest(currentQuestIdx - 1));
    main.querySelectorAll("[data-program-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        programMode = btn.dataset.programMode;
        localStorage.setItem(MODE_KEY, programMode);
        renderMain();
      });
    });
    main.querySelectorAll("[data-quest-idx]").forEach(btn => {
      if (btn.hasAttribute("data-quest-skip") || btn.hasAttribute("data-quest-done")) return;
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.questIdx, 10);
        if (!Number.isNaN(i)) {
          programMode = "focus";
          localStorage.setItem(MODE_KEY, programMode);
          goToQuest(i);
        }
      });
    });

    main.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.peopleFilter) peopleFilter = btn.dataset.peopleFilter;
        setView(btn.dataset.view);
      });
    });

    main.querySelectorAll("[data-person]").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.closest("[data-copy-email], .person-contact-tg, a.contact-btn")) return;
        openPerson(el.dataset.person);
      });
    });
    bindCopyEmail(main);
    bindCopyEmail(document.getElementById("modalBody"));

    main.querySelectorAll(".org-unit").forEach(el => {
      el.addEventListener("click", () => {
        selectedUnit = el.dataset.unit;
        renderMain();
      });
    });

    main.querySelectorAll(".filter-chip").forEach(el => {
      el.addEventListener("click", () => {
        peopleFilter = el.dataset.filter;
        renderMain();
      });
    });

    bindPathActions(main);
    bindQuiz(main);

    main.querySelectorAll("[data-access-id]").forEach(cb => {
      cb.addEventListener("change", () => {
        accessState[cb.dataset.accessId] = cb.checked;
        saveAccessState();
        document.getElementById("xpNum").textContent = totalProgress() + "%";
      });
    });
  }

  function renderDayNav() {
    const nav = document.getElementById("dayNav");
    const quizLocked = QUIZ_GATE_ENABLED && !isQuizPassed("rules_day5");
    nav.innerHTML = steps.map((step, i) => {
      const short = step.title.split("·").pop().trim();
      const done = stepComplete(step) ? "done" : "";
      const active = i === currentDayIdx && currentView === "program" ? "active" : "";
      const locked = quizLocked && i > 4 ? "locked" : "";
      const d = parseDate(step.date);
      const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
      const dayNum = d.getDate();
      const month = months[d.getMonth()];
      return `<button type="button" class="day-pill ${done} ${active} ${locked}" data-day="${i}" title="${locked ? quizGateMessage() : step.title}" aria-current="${active ? "step" : "false"}" ${locked ? 'aria-disabled="true"' : ""}>
        <span class="day-pill-kicker">День ${step.id}</span>
        <span class="day-pill-date-row">
          <span class="day-pill-day-num">${dayNum}</span>
          <span class="day-pill-date-meta">
            <span class="day-pill-month">${month}</span>
            <span class="day-pill-weekday">${step.weekday}</span>
          </span>
        </span>
        <span class="day-pill-label">${esc(short)}</span>
        ${done ? `<span class="day-pill-check" aria-hidden="true">✓</span>` : ""}
      </button>`;
    }).join("");

    nav.querySelectorAll(".day-pill").forEach(btn => {
      btn.addEventListener("click", () => goToDay(parseInt(btn.dataset.day, 10)));
    });

    const activePill = nav.querySelector(".day-pill.active");
    if (activePill) {
      activePill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  async function init() {
    try {
      const [stepsData, teamRes, resRes, chatsRes, decksRes, pathsRes, contactsRes, salesRes, accessRes, skillsRes, poolsRes, quizRes] = await Promise.all([
        fetch("data/steps.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/team.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/resources.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/chats.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/decks.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/task_paths.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/contacts.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/sales_snapshot.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/access_checklist.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/skills_hub.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/client_pools.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/rules_quiz.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      ]);
      steps = stepsData.steps;
      stepsMeta = stepsData.meta || {};
      team = teamRes;
      resources = resRes;
      chats = chatsRes;
      decks = decksRes;
      taskPaths = pathsRes;
      contactsData = contactsRes;
      salesSnapshot = salesRes;
      accessChecklist = accessRes;
      skillsHub = skillsRes;
      clientPools = poolsRes;
      rulesQuiz = quizRes;
    } catch (_) {
      document.getElementById("loadError").hidden = false;
      return;
    }

    loadQuestIdx();
    if (!localStorage.getItem(QUEST_KEY)) {
      currentQuestIdx = firstIncompleteQuestIdx();
      saveQuestIdx();
    } else {
      const path = buildQuestPath();
      if (currentQuestIdx >= path.length) currentQuestIdx = Math.max(0, path.length - 1);
      if (path[currentQuestIdx]) currentDayIdx = path[currentQuestIdx].dayIdx;
    }

    const params = new URLSearchParams(location.search);
    const viewParam = params.get("view") || params.get("map") && "map" || params.get("people") && "people";
    if (params.has("map")) currentView = "map";
    else if (params.has("pools")) currentView = "pools";
    else if (params.has("people")) currentView = "people";
    else if (params.has("chats")) currentView = "access";
    else if (params.has("decks")) currentView = "decks";
    else if (params.has("sales")) currentView = "sales";
    else if (params.has("access")) currentView = "access";
    else if (params.has("skills")) currentView = "skills";
    else if (viewParam === "chats") currentView = "access";
    else if (viewParam && ["program","map","pools","people","decks","sales","access","skills"].includes(viewParam)) currentView = viewParam;

    const dayParam = params.get("day");
    if (dayParam) {
      currentDayIdx = Math.max(0, Math.min(parseInt(dayParam, 10) - 1, steps.length - 1));
    } else if (typeof state.currentIdx === "number") {
      currentDayIdx = Math.min(state.currentIdx, steps.length - 1);
    }

    document.querySelectorAll(".nav-tab").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    document.getElementById("modalClose").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
    document.getElementById("personModal").addEventListener("click", e => e.stopPropagation());
    document.getElementById("modalBackdrop").addEventListener("click", e => {
      if (e.target.id === "modalBackdrop") closeModal();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (document.getElementById("dayDoneBackdrop")?.classList.contains("is-open")) closeDayComplete();
        else if (document.getElementById("gradBackdrop")?.classList.contains("is-open")) closeGraduation();
        else if (document.getElementById("welcomeBackdrop").classList.contains("is-open")) closeWelcome();
        else closeModal();
      }
    });

    document.getElementById("welcomeGo").addEventListener("click", advanceWelcome);
    document.getElementById("welcomeBack")?.addEventListener("click", retreatWelcome);
    document.getElementById("welcomeBackdrop").addEventListener("click", e => {
      if (e.target.id === "welcomeBackdrop") closeWelcome();
    });

    document.getElementById("gradGo")?.addEventListener("click", advanceGrad);
    document.getElementById("gradBack")?.addEventListener("click", retreatGrad);
    document.getElementById("gradBackdrop")?.addEventListener("click", e => {
      if (e.target.id === "gradBackdrop") closeGraduation();
    });

    document.getElementById("dayDoneGo")?.addEventListener("click", closeDayComplete);
    document.getElementById("dayDoneBackdrop")?.addEventListener("click", e => {
      if (e.target.id === "dayDoneBackdrop") closeDayComplete();
    });

    bindHeaderCompactOnScroll();

    closeModal();
    applyUserBranding();
    if (QUIZ_GATE_ENABLED && !isQuizPassed("rules_day5") && currentDayIdx > 4) {
      const qIdx = quizGateIdx();
      if (qIdx >= 0) {
        currentQuestIdx = qIdx;
        currentDayIdx = 4;
        saveQuestIdx();
      } else {
        currentDayIdx = 4;
      }
      currentView = "program";
    }
    setView(currentView);
    maybeShowWelcome();
    document.getElementById("footerNote").textContent =
      "Cult Group · онбординг продаж · " + steps.length + " дней · v" + ASSET_VER;
  }

  function bindHeaderCompactOnScroll() {
    const topBar = document.querySelector(".top-bar");
    if (!topBar) return;
    const COMPACT_ON = 40;
    const COMPACT_OFF = 8;
    let ticking = false;
    const sync = () => {
      ticking = false;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > COMPACT_ON) topBar.classList.add("is-compact");
      else if (y <= COMPACT_OFF) topBar.classList.remove("is-compact");
    };
    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(sync);
      }
    }, { passive: true });
    sync();
  }

  init();
})();

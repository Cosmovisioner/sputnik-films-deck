(function () {
  "use strict";

  const STORAGE_KEY = "cult_leonid_daily_v5";
  const WELCOME_KEY = "cult_leonid_welcome_v3";
  const ASSET_VER = "20260711-v16";

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
    "Cult": "cult",
    "Blaster": "blaster",
    "Sputnik": "sputnik",
    "TechTigers": "techtigers",
    "Партнёр": "partner_slz",
    "Партнёр · Blaster": "partner_slz",
    "УК + Sputnik": "uk"
  };

  const PRIORITY_LABELS = {
    required: "С первого дня",
    week1: "Первая неделя",
    as_needed: "По сделкам",
    after_week1: "После 1-й недели"
  };

  let contactsData = { people: {} };
  let steps = [];
  let team = null;
  let resources = null;
  let chats = null;
  let decks = null;
  let taskPaths = {};
  let salesSnapshot = null;
  let state = loadState();
  let currentView = "program";
  let currentDayIdx = 0;
  let selectedUnit = null;
  let peopleFilter = "all";
  let expandedTasks = {};

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const legacy = localStorage.getItem("cult_leonid_daily_v4");
    if (legacy) {
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
      if (p.id === "leonid") return false;
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
            <span class="sales-unit-owner">${esc(u.owner)} · порог ${esc(u.threshold)}</span>
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

    return `
      <div class="card">
        <div class="card-meta">Срез на ${esc(m.as_of)} · ${esc(m.period_label || "")}</div>
        <h2 class="card-title">Продажи · план, факт, воронка</h2>
        <p class="card-intro">${esc(m.updated_note || "")}</p>
        <div class="sales-callout">
          <p><strong>${esc(hl.problem || "")}</strong></p>
          <p>${esc(hl.focus_2026 || "")}</p>
          <p class="sales-mandate">${esc(hl.your_mandate || "")}</p>
        </div>
      </div>

      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.group_targets_2026?.title || "План группы")}</h3>
        ${renderSalesTable(["Метрика", "Было (май 2026)", "Цель 2026"], groupRows)}
      </div>

      <div class="card">
        <h3 class="section-heading">${esc(salesSnapshot.leonid_kpi?.title || "Твои KPI")}</h3>
        ${renderSalesTable(["Период", "Фокус", "Ориентир"], leonidRows)}
      </div>

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
    idx = Math.max(0, Math.min(idx, steps.length - 1));
    currentDayIdx = idx;
    state.currentIdx = idx;
    saveState();
    if (currentView !== "program") setView("program");
    else renderMain();
    renderDayNav();
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
  }

  function maybeShowWelcome() {
    const lead = document.querySelector(".welcome-lead");
    const list = document.querySelector(".welcome-list");
    const note = document.querySelector(".welcome-note");
    if (lead && steps.length) {
      const span = stepsMeta.calendarSpan || "13–23 июл";
      lead.innerHTML = `Привет, <strong>Лёня</strong>. Тут всё на первые две недели: куда вести клиента, кто за что отвечает, что открыть в Amo.<br><br><strong>${steps.length} дней</strong> по календарю (${span}). Карту и людей логично закрыть уже в понедельник — после вводной с Димой.`;
    }
    if (list && steps.length) {
      list.innerHTML = `
        <li>Каждый день подписан датой — ориентир, не жёсткий дедлайн</li>
        <li>В шапке всегда: карта, продажи, люди, чаты, презентации</li>
        <li>Не понял — пиши Диме, не гугли</li>`;
    }
    if (note && stepsMeta.officialStartDate) {
      note.innerHTML = `Старт — <strong>${formatDateRu(stepsMeta.officialStartDate, "Пн")}</strong>. Материалы уже открыты, можно начать раньше.`;
    }
    if (!localStorage.getItem(WELCOME_KEY)) showWelcome();
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
      contactsHtml += `<a class="contact-btn primary" href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>`;
    }
    if (c.emailAlt) {
      contactsHtml += `<a class="contact-btn" href="mailto:${esc(c.emailAlt)}">✉ ${esc(c.emailAlt)}</a>`;
    }
    if (c.emailWork && c.emailWork !== c.email) {
      contactsHtml += `<a class="contact-btn" href="mailto:${esc(c.emailWork)}">✉ ${esc(c.emailWork)}</a>`;
    }
    if (c.telegram) {
      contactsHtml += `<a class="contact-btn" href="${c.telegram}" target="_blank" rel="noopener">💬 ${esc(c.telegramLabel || "Telegram")}</a>`;
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
      cliftonLinks.push(`<a class="contact-btn" href="${p.clifton_url}" target="_blank" rel="noopener">📊 ${esc(label)}</a>`);
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

    showModal();
  }

  function renderPathItem(item, stepId) {
    if (item.kind === "step") {
      return `<div class="path-step">→ ${item.text}</div>`;
    }
    if (item.kind === "note") {
      return `<div class="path-note">${item.text}</div>`;
    }
    if (item.kind === "person") {
      const p = findPerson(item.id);
      if (!p) return "";
      return `<button type="button" class="path-link" data-person="${p.id}">
        <span class="icon">👤</span>
        <span>${p.name}<span class="sub">${p.role}</span></span>
      </button>`;
    }
    if (item.kind === "resource") {
      const r = findResource(item.id);
      if (!r) return "";
      if (r.action) {
        const icon = r.action === "sales" ? "📈" : r.action === "people" ? "👥" : "🗺";
        return `<button type="button" class="path-link" data-view="${r.action}">
          <span class="icon">${icon}</span>
          <span>${r.title}<span class="sub">${r.subtitle}</span></span>
        </button>`;
      }
      if (r.url) {
        return `<a class="path-link" href="${r.url}" target="_blank" rel="noopener">
          <span class="icon">${r.group === "docs" ? "📄" : "🔗"}</span>
          <span>${r.title}<span class="sub">${r.subtitle || ""}</span></span>
        </a>`;
      }
      return `<div class="path-note">${r.title} — ${r.note || r.subtitle || "запроси у Димы"}</div>`;
    }
    if (item.kind === "deck") {
      const d = findDeck(item.id);
      if (!d) return "";
      if (d.url) {
        return `<a class="path-link" href="${d.url}" target="_blank" rel="noopener">
          <span class="icon">📊</span>
          <span>${d.title}<span class="sub">${d.when}</span></span>
        </a>`;
      }
      const owner = findPerson(d.owner);
      return `<button type="button" class="path-link" data-person="${d.owner}">
        <span class="icon">📊</span>
        <span>${d.title}<span class="sub">Запросить у ${owner ? owner.name : d.requestVia}</span></span>
      </button>`;
    }
    if (item.kind === "section" && item.id === "chats") {
      const list = chatsFiltered(item.filter);
      return list.map(ch => {
        if (ch.inviteUrl) {
          return `<a class="path-link" href="${ch.inviteUrl}" target="_blank" rel="noopener">
            <span class="icon">💬</span>
            <span>${ch.name}<span class="sub">Вступить · добавляет ${ch.whoAdds}</span></span>
          </a>`;
        }
        return `<div class="path-note">💬 ${ch.name} — попроси ${ch.whoAdds} добавить</div>`;
      }).join("");
    }
    return "";
  }

  function bindPathActions(container) {
    container.querySelectorAll("[data-person]").forEach(el => {
      el.addEventListener("click", () => openPerson(el.dataset.person));
    });
    container.querySelectorAll("[data-view]").forEach(el => {
      el.addEventListener("click", () => setView(el.dataset.view));
    });
  }

  function renderPaceCard() {
    const r = stepsMeta.realism || {};
    if (!stepsMeta.pace && !r.verdict) return "";
    const span = stepsMeta.calendarSpan ? ` · ${stepsMeta.calendarSpan}` : "";
    return `
      <div class="card pace-card">
        <h3 class="section-heading">Темп программы${esc(span)}</h3>
        ${stepsMeta.pace ? `<p class="card-intro">${esc(stepsMeta.pace)}</p>` : ""}
        ${r.verdict ? `<p class="pace-verdict"><strong>По срокам:</strong> ${esc(r.verdict)}</p>` : ""}
        ${r.fastTrack ? `<p class="pace-hint"><strong>Можно быстрее:</strong> ${esc(r.fastTrack)}</p>` : ""}
        ${r.bottleneck ? `<p class="pace-hint pace-muted"><strong>Не переносится:</strong> ${esc(r.bottleneck)}</p>` : ""}
      </div>`;
  }

  function renderExcludedCard() {
    const list = stepsMeta.excludedForSales;
    if (!list || !list.length) return "";
    return `
      <div class="card excluded-card">
        <h3 class="section-heading">Не входит в онбординг</h3>
        <p class="card-intro excluded-intro">Sales-safe: без P&amp;L, паролей и внутренних финмоделей.</p>
        <ul class="excluded-list">
          ${list.map(x => `<li><strong>${x.label}</strong> — ${x.reason}</li>`).join("")}
        </ul>
      </div>`;
  }

  function renderProgram() {
    const step = steps[currentDayIdx];
    const stepTasks = state["step_" + step.id] || {};
    const allDone = stepComplete(step);

    let tasksHtml = "";
    let lastGroup = null;
    step.tasks.forEach(task => {
      if (task.group && task.group !== lastGroup) {
        tasksHtml += `<h4 class="task-group-heading">${task.group}</h4>`;
        lastGroup = task.group;
      }
      const key = step.id + "." + task.id;
      const path = taskPaths[key] || [];
      const isOpen = expandedTasks[key];
      const isDone = !!stepTasks[task.id];
      tasksHtml += `
        <div class="task-item ${isOpen ? "open" : ""} ${isDone ? "done" : ""}" data-task-key="${key}">
          <div class="task-head">
            <input type="checkbox" data-step="${step.id}" data-task="${task.id}" ${isDone ? "checked" : ""} />
            <span class="task-text">${task.text}</span>
            <span class="task-chevron">${path.length ? "▼" : ""}</span>
          </div>
          ${path.length ? `<div class="task-path">${path.map(p => renderPathItem(p, step.id)).join("")}</div>` : ""}
        </div>`;
    });

    const prev = currentDayIdx > 0 ? steps[currentDayIdx - 1] : null;
    const next = currentDayIdx < steps.length - 1 ? steps[currentDayIdx + 1] : null;

    const phaseMeta = step.phase ? `${step.phase} · ` : "";
    return `
      ${renderPaceCard()}
      <article class="card card-hero">
        <div class="card-meta">${phaseMeta}${formatDateRu(step.date, step.weekday)} · день ${step.id} из ${steps.length}</div>
        <h2 class="card-title">${step.title}</h2>
        <p class="card-intro">${step.intro}</p>
        ${tasksHtml}
        ${allDone ? `<div class="complete-banner">${currentDayIdx < steps.length - 1 ? "День закрыт — можно идти дальше →" : "Онбординг пройден"}</div>` : ""}
        <div class="nav-row">
          <button type="button" class="btn" id="prevDay" ${!prev ? "disabled" : ""}>${prev ? "← " + prev.title : "← Назад"}</button>
          <button type="button" class="btn primary" id="nextDay" ${!next ? "disabled" : ""}>${next ? next.title + " →" : "Конец"}</button>
        </div>
      </article>
      <div class="card">
        <h3 class="section-heading">Быстрые разделы</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn" data-view="map">🗺 Карта группы</button>
          <button type="button" class="btn" data-view="sales">📈 Продажи</button>
          <button type="button" class="btn" data-view="people">👥 Люди</button>
          <button type="button" class="btn" data-view="chats">💬 Telegram</button>
          <button type="button" class="btn" data-view="decks">📊 Презентации</button>
        </div>
      </div>
      ${currentDayIdx === 0 ? renderExcludedCard() : ""}`;
  }

  function renderPartnerBlock() {
    const ps = team.org.partner_slz;
    if (!ps) return "";
    const ids = ps.member_ids || [];
    const cards = ids.map(id => {
      const p = findPerson(id);
      if (!p) return "";
      return `<div class="person-card partner map-partner-card" data-person="${p.id}">
        <div class="person-name">${esc(p.name)}</div>
        <div class="person-role">${esc(p.bio_short || p.role)}</div>
      </div>`;
    }).join("");
    const collabIds = ps.collaborator_ids || [];
    const collabCards = collabIds.map(id => {
      const p = findPerson(id);
      if (!p) return "";
      return `<div class="person-card partner map-partner-card" data-person="${p.id}">
        <div class="person-name">${esc(p.name)}</div>
        <div class="person-role">${esc(p.bio_short || p.role)}</div>
        <span class="mono-tag" style="margin-top:6px;display:inline-block">коллаборация · не sales</span>
      </div>`;
    }).join("");
    return `
      <div class="card partner-map-card">
        <h3 class="section-heading">${esc(ps.title || "Партнёры")}</h3>
        <p class="card-intro">${esc(ps.desc || "")}</p>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px">${esc(ps.routing || "")}</p>
        <div class="people-grid">${cards}${collabCards}</div>
      </div>`;
  }

  function renderMap() {
    const pillars = orgPillars();

    const pillarHtml = pillars.map(pillar => {
      const isCult = pillar.id === "cult_group";
      const items = isCult ? pillar.units : pillar.startups;
      const itemLabel = isCult ? "юнит" : "продукт";
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
            <p class="pillar-desc">${pillar.desc}</p>
            ${pillar.products_ref ? `<p class="pillar-drive"><a href="${pillar.products_ref}" target="_blank" rel="noopener">Эксплейнеры продуктов (Drive)</a></p>` : ""}
          </div>
          <div class="org-grid pillar-units">${inner}</div>
          ${pillar.note ? `<p class="pillar-footnote">${esc(pillar.note)}</p>` : ""}
          <p class="pillar-meta">${items.length} ${itemLabel}${items.length === 1 ? "" : items.length < 5 ? "а" : "ов"}</p>
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
              <span class="mono-tag">TechTigers</span>
              <h3 class="section-heading">${u.name}</h3>
              <p style="font-size:13px;color:var(--muted)">${u.desc}</p>
              ${u.id === "prodavan" ? `<p class="path-note" style="margin-top:10px">Prodavan и iCRM — одно и то же. Клиентам наружу не продаём.</p>` : ""}
              ${ttPeople.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Контакт по продукту</h4>
                <div class="people-grid">${ttPeople.map(p => personCardHtml(p)).join("")}</div>` : ""}
            </div>`;
        }
      }
    }

    return `
      <div class="card">
        <h2 class="card-title">Карта холдинга</h2>
        <div class="flow-line">${team.org.flow}</div>
        <div class="pillar-grid">${pillarHtml}</div>
        <p style="font-size:12px;color:var(--tertiary);margin-top:16px">${team.org.producers_note}</p>
      </div>
      ${renderPartnerBlock()}
      ${detail}`;
  }

  function personCardHtml(p) {
    const partner = p.category === "partner_slz" || p.category === "collaborator" ? " partner" : "";
    const sub = p.bio_short ? `<div class="person-bio">${esc(p.bio_short)}</div>` : "";
    return `<div class="person-card${partner}" data-person="${p.id}">
      ${personAvatarHtml(p, false)}
      <div>
        <div class="person-name">${esc(p.name)}</div>
        <div class="person-role">${esc(p.role)}</div>
        ${sub}
        <span class="person-unit-tag">${esc(p.unit)}</span>
      </div>
    </div>`;
  }

  function renderPeople() {
    const filterUnits = [
      { id: "all", name: "Все" },
      ...cultUnits().map(u => ({ id: u.id, name: u.short || u.name })),
      { id: "techtigers", name: "TechTigers" },
      { id: "partner_slz", name: "Партнёры" }
    ];
    const chips = filterUnits.map(u => {
      const active = peopleFilter === u.id ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-filter="${u.id}">${u.name}</button>`;
    }).join("");

    let list = team.people.filter(p => p.id !== "leonid");
    if (peopleFilter !== "all") {
      list = list.filter(p => personUnitId(p) === peopleFilter);
    }
    const staff = list.filter(p => p.category !== "partner_slz" && p.category !== "collaborator");
    const partners = list.filter(p => p.category === "partner_slz");
    const collaborators = list.filter(p => p.category === "collaborator");

    return `
      <div class="card">
        <h2 class="card-title">Справочник людей</h2>
        <p class="card-intro">Кликни карточку — кратко, Clifton, когда писать, контакты.</p>
        <div class="filter-row">${chips}</div>
        ${staff.length ? `<h3 class="mono-tag" style="margin-bottom:12px">Штат</h3><div class="people-grid">${staff.map(p => personCardHtml(p)).join("")}</div>` : ""}
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
    return `
      <div class="card">
        <h2 class="card-title">Telegram · рабочие чаты</h2>
        <p class="card-intro">${chats.meta?.note || ""}</p>
        <h3 class="mono-tag" style="margin-bottom:12px">Обязательные с первого дня</h3>
        ${required.map(chatCardHtml).join("")}
        <h3 class="mono-tag" style="margin:20px 0 12px">По мере работы</h3>
        ${rest.map(chatCardHtml).join("")}
        ${chats.skip ? `<div class="skip-list"><strong>Не на старте:</strong> ${chats.skip.join(" · ")}</div>` : ""}
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
        ${(decks.decks || []).map(deckCardHtml).join("")}
        <table class="routing-table">
          <thead><tr><th>Сигнал в брифе</th><th>Какую презу</th></tr></thead>
          <tbody>${routingRows}</tbody>
        </table>
      </div>`;
  }

  function renderMain() {
    const main = document.getElementById("mainContent");
    if (currentView === "program") main.innerHTML = renderProgram();
    else if (currentView === "map") main.innerHTML = renderMap();
    else if (currentView === "people") main.innerHTML = renderPeople();
    else if (currentView === "chats") main.innerHTML = renderChats();
    else if (currentView === "decks") main.innerHTML = renderDecks();
    else if (currentView === "sales") main.innerHTML = renderSales();

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
        state["step_" + sid] = state["step_" + sid] || {};
        state["step_" + sid][tid] = cb.checked;
        saveState();
        renderMain();
      });
    });

    main.querySelector("#prevDay")?.addEventListener("click", () => goToDay(currentDayIdx - 1));
    main.querySelector("#nextDay")?.addEventListener("click", () => goToDay(currentDayIdx + 1));

    main.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    main.querySelectorAll("[data-person]").forEach(el => {
      el.addEventListener("click", () => openPerson(el.dataset.person));
    });

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
  }

  function renderDayNav() {
    const nav = document.getElementById("dayNav");
    nav.innerHTML = steps.map((step, i) => {
      const short = step.title.split("·").pop().trim();
      const done = stepComplete(step) ? "done" : "";
      const active = i === currentDayIdx && currentView === "program" ? "active" : "";
      return `<button type="button" class="day-pill ${done} ${active}" data-day="${i}" title="${step.title}">
        <span class="day-pill-num">${step.id}</span>
        <span class="day-pill-date">${formatDateRu(step.date, step.weekday).split(" · ")[0]}</span>
        <span class="day-pill-label">${short}</span>
      </button>`;
    }).join("");

    nav.querySelectorAll(".day-pill").forEach(btn => {
      btn.addEventListener("click", () => goToDay(parseInt(btn.dataset.day, 10)));
    });
  }

  async function init() {
    try {
      const [stepsData, teamRes, resRes, chatsRes, decksRes, pathsRes, contactsRes, salesRes] = await Promise.all([
        fetch("data/steps.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/team.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/resources.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/chats.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/decks.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/task_paths.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/contacts.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/sales_snapshot.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); })
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
    } catch (_) {
      document.getElementById("loadError").hidden = false;
      return;
    }

    const params = new URLSearchParams(location.search);
    const viewParam = params.get("view") || params.get("map") && "map" || params.get("people") && "people";
    if (params.has("map")) currentView = "map";
    else if (params.has("people")) currentView = "people";
    else if (params.has("chats")) currentView = "chats";
    else if (params.has("decks")) currentView = "decks";
    else if (params.has("sales")) currentView = "sales";
    else if (viewParam && ["program","map","people","chats","decks","sales"].includes(viewParam)) currentView = viewParam;

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
        if (document.getElementById("welcomeBackdrop").classList.contains("is-open")) closeWelcome();
        else closeModal();
      }
    });

    document.getElementById("welcomeGo").addEventListener("click", closeWelcome);
    document.getElementById("welcomeBackdrop").addEventListener("click", e => {
      if (e.target.id === "welcomeBackdrop") closeWelcome();
    });

    closeModal();
    setView(currentView);
    maybeShowWelcome();
    document.getElementById("footerNote").textContent =
      "Cult Group · онбординг продаж · " + steps.length + " дней · v" + ASSET_VER;
  }

  init();
})();

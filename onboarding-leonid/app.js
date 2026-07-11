(function () {
  "use strict";

  const STORAGE_KEY = "cult_leonid_daily_v5";
  const ASSET_VER = "20260711-v5";

  const CONTACTS = {
    kostya: { email: "k@cult.team", tgNote: "TG — через CRO или чат «Супертопы»" },
    dima: { email: "cosmovisioner@gmail.com", tg: "https://t.me/cosmovisioner", tgLabel: "@cosmovisioner" },
    denis: { email: "denis@cult.team", tgNote: "TG — попроси CRO или напиши в чат «Коммерческий директор»" },
    liza: { email: "liza@blasterstudio.ru", emailAlt: "liza@cult.team", tgNote: "TG — Лиза добавит на созвоне или через CRO" },
    sergey: { email: "hello@kleinsergey.com", tgNote: "TG — через CRO или чат «Спутник · продажи»" },
    sasha_a: { email: "sasha@cult.team", tg: "https://t.me/Skanderbeg", tgLabel: "@Skanderbeg" },
    homich: { tgNote: "TG — чат Systems · TechTigers" },
    egor: { tgNote: "Не операционка — только через CRO" },
    taya: { tgNote: "TG — через CRO или чат Sputnik продажи" },
    dima_soldatov: { tgNote: "Контакт через CRO · лид с меткой источника" },
    max_blaster: { tgNote: "Контакт через CRO · лид с меткой источника" }
  };

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
    required: "Обязательно",
    week1: "Неделя 1",
    as_needed: "По сделкам",
    after_week1: "После нед. 1"
  };

  let steps = [];
  let team = null;
  let resources = null;
  let chats = null;
  let decks = null;
  let taskPaths = {};
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
    return UNIT_ID_MAP[p.unit] || "uk";
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

  function goToDay(idx) {
    idx = Math.max(0, Math.min(idx, steps.length - 1));
    currentDayIdx = idx;
    state.currentIdx = idx;
    saveState();
    if (currentView !== "program") setView("program");
    else renderMain();
    renderDayNav();
  }

  function openPerson(id) {
    const p = findPerson(id);
    if (!p) return;
    const c = CONTACTS[id] || {};
    const body = document.getElementById("modalBody");
    const unit = team.org.units.find(u => u.id === personUnitId(p));

    let contactsHtml = "";
    if (c.email) {
      contactsHtml += `<a class="contact-btn primary" href="mailto:${c.email}">✉ ${c.email}</a>`;
    }
    if (c.emailAlt) {
      contactsHtml += `<a class="contact-btn" href="mailto:${c.emailAlt}">✉ ${c.emailAlt}</a>`;
    }
    if (c.tg) {
      contactsHtml += `<a class="contact-btn" href="${c.tg}" target="_blank" rel="noopener">💬 ${c.tgLabel || "Telegram"}</a>`;
    }
    if (c.tgNote && !c.tg) {
      contactsHtml += `<span class="path-note">${c.tgNote}</span>`;
    }

    body.innerHTML = `
      <div class="modal-avatar">${p.initials}</div>
      <h2 class="modal-name">${p.name}</h2>
      <p class="modal-role">${p.role} · ${p.unit}</p>
      <div class="modal-section">
        <h4>Clifton · как общаться</h4>
        <p style="font-size:13px;margin:0">${p.clifton_hint}</p>
      </div>
      <div class="modal-section">
        <h4>Когда писать</h4>
        <ul class="modal-list">${(p.contact_when || []).map(x => `<li>${x}</li>`).join("")}</ul>
      </div>
      <div class="modal-section">
        <h4>Избегать</h4>
        <p style="font-size:13px;margin:0;color:var(--muted)">${p.avoid}</p>
      </div>
      <div class="modal-section">
        <h4>Контакты</h4>
        <div class="modal-contacts">${contactsHtml || "<span class='path-note'>Контакт через CRO</span>"}</div>
      </div>
      ${unit ? `<div class="modal-section"><button type="button" class="btn" data-unit="${unit.id}">Юнит: ${unit.name} →</button></div>` : ""}
    `;

    body.querySelector("[data-unit]")?.addEventListener("click", e => {
      closeModal();
      selectedUnit = e.target.dataset.unit;
      setView("map");
    });

    document.getElementById("modalBackdrop").hidden = false;
  }

  function closeModal() {
    document.getElementById("modalBackdrop").hidden = true;
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
        return `<button type="button" class="path-link" data-view="${r.action}">
          <span class="icon">🗺</span>
          <span>${r.title}<span class="sub">${r.subtitle}</span></span>
        </button>`;
      }
      if (r.url) {
        return `<a class="path-link" href="${r.url}" target="_blank" rel="noopener">
          <span class="icon">${r.group === "docs" ? "📄" : "🔗"}</span>
          <span>${r.title}<span class="sub">${r.subtitle || ""}</span></span>
        </a>`;
      }
      return `<div class="path-note">${r.title} — ${r.note || r.subtitle || "запроси у CRO"}</div>`;
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

  function renderProgram() {
    const step = steps[currentDayIdx];
    const stepTasks = state["step_" + step.id] || {};
    const allDone = stepComplete(step);

    let tasksHtml = step.tasks.map(task => {
      const key = step.id + "." + task.id;
      const path = taskPaths[key] || [];
      const isOpen = expandedTasks[key];
      const isDone = !!stepTasks[task.id];
      return `
        <div class="task-item ${isOpen ? "open" : ""} ${isDone ? "done" : ""}" data-task-key="${key}">
          <div class="task-head">
            <input type="checkbox" data-step="${step.id}" data-task="${task.id}" ${isDone ? "checked" : ""} />
            <span class="task-text">${task.text}</span>
            <span class="task-chevron">${path.length ? "▼" : ""}</span>
          </div>
          ${path.length ? `<div class="task-path">${path.map(p => renderPathItem(p, step.id)).join("")}</div>` : ""}
        </div>`;
    }).join("");

    const prev = currentDayIdx > 0 ? steps[currentDayIdx - 1] : null;
    const next = currentDayIdx < steps.length - 1 ? steps[currentDayIdx + 1] : null;

    return `
      <article class="card card-hero">
        <div class="card-meta">${formatDateRu(step.date, step.weekday)} · день ${step.id} из ${steps.length}</div>
        <h2 class="card-title">${step.title}</h2>
        <p class="card-intro">${step.intro}</p>
        ${tasksHtml}
        ${allDone ? `<div class="complete-banner">${currentDayIdx < steps.length - 1 ? "День закрыт ✓ — следующий шаг →" : "Онбординг пройден 🎯"}</div>` : ""}
        <div class="nav-row">
          <button type="button" class="btn" id="prevDay" ${!prev ? "disabled" : ""}>${prev ? "← " + prev.title : "← Назад"}</button>
          <button type="button" class="btn primary" id="nextDay" ${!next ? "disabled" : ""}>${next ? next.title + " →" : "Конец"}</button>
        </div>
      </article>
      <div class="card">
        <h3 class="section-heading">Быстрые разделы</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn" data-view="map">🗺 Карта группы</button>
          <button type="button" class="btn" data-view="people">👥 Люди</button>
          <button type="button" class="btn" data-view="chats">💬 Telegram</button>
          <button type="button" class="btn" data-view="decks">📊 Презентации</button>
        </div>
      </div>`;
  }

  function renderMap() {
    const units = team.org.units;
    const grid = units.map(u => {
      const count = peopleForUnit(u.id).length;
      const sel = selectedUnit === u.id ? "selected" : "";
      return `<div class="org-unit ${sel}" data-unit="${u.id}" style="--unit-color:${u.color || "#A78BFA"}">
        <div class="org-unit-name">${u.short || u.name}</div>
        <div class="org-unit-desc">${u.desc}</div>
        <div class="org-unit-count">${count} контакт${count === 1 ? "" : count < 5 ? "а" : "ов"}</div>
      </div>`;
    }).join("");

    let detail = "";
    if (selectedUnit) {
      const u = units.find(x => x.id === selectedUnit);
      const people = peopleForUnit(selectedUnit);
      const unitDecks = decksForUnit(selectedUnit);
      detail = `
        <div class="unit-detail card">
          <h3 class="section-heading">${u.name}</h3>
          <p style="font-size:13px;color:var(--muted)">${u.desc}</p>
          ${people.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Люди</h4>
            <div class="people-grid">${people.map(p => personCardHtml(p)).join("")}</div>` : ""}
          ${unitDecks.length ? `<h4 class="mono-tag" style="margin:16px 0 8px">Презентации</h4>
            ${unitDecks.map(d => deckCardHtml(d)).join("")}` : ""}
        </div>`;
    }

    return `
      <div class="card">
        <h2 class="card-title">Карта Cult Group</h2>
        <div class="flow-line">${team.org.flow}</div>
        <div class="org-grid">${grid}</div>
        <p style="font-size:12px;color:var(--tertiary)">${team.org.producers_note}</p>
      </div>
      ${detail}`;
  }

  function personCardHtml(p) {
    const partner = p.category === "partner_slz" ? " partner" : "";
    return `<div class="person-card${partner}" data-person="${p.id}">
      <div class="person-avatar">${p.initials}</div>
      <div>
        <div class="person-name">${p.name}</div>
        <div class="person-role">${p.role}</div>
        <span class="person-unit-tag">${p.unit}</span>
      </div>
    </div>`;
  }

  function renderPeople() {
    const units = [{ id: "all", name: "Все" }, ...team.org.units];
    const chips = units.map(u => {
      const active = peopleFilter === u.id ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-filter="${u.id}">${u.short || u.name}</button>`;
    }).join("");

    let list = team.people.filter(p => p.id !== "leonid");
    if (peopleFilter !== "all") {
      list = list.filter(p => personUnitId(p) === peopleFilter);
    }
    const staff = list.filter(p => p.category !== "partner_slz");
    const partners = list.filter(p => p.category === "partner_slz");

    return `
      <div class="card">
        <h2 class="card-title">Справочник людей</h2>
        <p class="card-intro">Кликни карточку — роль, когда писать, контакты для сообщения.</p>
        <div class="filter-row">${chips}</div>
        ${staff.length ? `<h3 class="mono-tag" style="margin-bottom:12px">Штат</h3><div class="people-grid">${staff.map(p => personCardHtml(p)).join("")}</div>` : ""}
        ${partners.length ? `<h3 class="mono-tag" style="margin:20px 0 12px">Партнёрские SLZ</h3><p style="font-size:13px;color:var(--muted);margin-bottom:12px">${team.org.partner_slz?.routing || ""}</p><div class="people-grid">${partners.map(p => personCardHtml(p)).join("")}</div>` : ""}
      </div>`;
  }

  function chatCardHtml(ch) {
    const req = ch.priority === "required" ? " required" : "";
    const badge = PRIORITY_LABELS[ch.priority] || ch.priority;
    let actions = "";
    if (ch.inviteUrl) {
      actions = `<a class="contact-btn primary" href="${ch.inviteUrl}" target="_blank" rel="noopener">Вступить в чат</a>`;
    } else {
      actions = `<span class="path-note">Инвайт — попроси ${ch.whoAdds}</span>`;
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
        <h3 class="mono-tag" style="margin-bottom:12px">Обязательные на старте</h3>
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
      const short = step.title.replace(/^День \d+ · /, "");
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
      const [stepsData, teamRes, resRes, chatsRes, decksRes, pathsRes] = await Promise.all([
        fetch("data/steps.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/team.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/resources.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/chats.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/decks.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch("data/task_paths.json?v=" + ASSET_VER).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      ]);
      steps = stepsData.steps;
      team = teamRes;
      resources = resRes;
      chats = chatsRes;
      decks = decksRes;
      taskPaths = pathsRes;
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
    else if (viewParam && ["program","map","people","chats","decks"].includes(viewParam)) currentView = viewParam;

    const dayParam = params.get("day");
    if (dayParam) {
      currentDayIdx = Math.max(0, Math.min(parseInt(dayParam, 10) - 1, steps.length - 1));
    } else if (typeof state.currentIdx === "number") {
      currentDayIdx = Math.min(state.currentIdx, steps.length - 1);
    }

    document.querySelectorAll(".nav-tab").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalBackdrop").addEventListener("click", e => {
      if (e.target.id === "modalBackdrop") closeModal();
    });

    setView(currentView);
    document.getElementById("footerNote").textContent =
      "Cult Group Sales Quest · " + steps.length + " дней · v" + ASSET_VER;
  }

  init();
})();

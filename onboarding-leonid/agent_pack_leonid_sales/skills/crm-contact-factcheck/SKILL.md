---
name: crm-contact-factcheck
description: >-
  Open-source fact-check and enrichment of CRM contact cards in Second Brain dashboard:
  company industry sphere (companySphere), job title verification (positionStatus),
  confidence levels and source URLs. Use when user asks to research contacts, verify
  positions, fill company sphere/activity, update CRM contact base, «факт-чек контактов»,
  «сфера компании», «актуальность должности», or batch-enrich Sputnik CRM directory/outreach.
---

# CRM Contact Fact-Check (Sputnik Films)

Цель: для каждой карточки в CRM (дашборд → Контакты) **заполнить сферу деятельности компании** и **по возможности проверить актуальность должности** из открытых источников — без выдумок.

## Когда применять

- «Проверь контакты», «заполни сферу», «актуализируй должности»
- Массовый ресёрч после импорта Amo / Silver Mercury / networking
- Пилот → полный прогон батчами (не всё в одном чате)

## Источники истины (порядок)

1. `60_System/automation/crm_contact_research_taxonomy.json` — допустимые коды сфер и статусов
2. `GET http://127.0.0.1:3030/api/crm` — актуальные карточки (дашборд: `cd 60_System/dashboard && node server.js`)
3. Очередь: `python3 60_System/automation/build_crm_research_queue.py`
4. Результаты merge: `credentials/crm_contacts_research_<stamp>.json` (не в git)
5. Сводка без ПД: `00_Inbox/note_crm_contact_research_<stamp>.md`

## Поля результата (на одну карточку)

| Поле | Обязательно | Правило |
|------|-------------|---------|
| `key` | да | Как в API (`sputnik_films:amo:...`) |
| `companySphere` | если есть компания или идентифицирована | Код из taxonomy |
| `companySphereLabel` | рекомендуется | Человекочитаемо на русском |
| `companySphereConfidence` | да | `high` / `medium` / `low` |
| `positionVerified` | если проверяли должность | Формулировка из источника |
| `positionStatus` | если проверяли | `current` / `likely_current` / `outdated` / `unverified` / `unknown` |
| `positionConfidence` | при positionStatus | см. taxonomy |
| `sources` | да (≥1) | `{ url, title?, checkedAt }` — только публичные URL |
| `researchedAt` | да | `YYYY-MM-DD` |
| `researchNotes` | опционально | Кратко: неоднозначность, гомоним компании |

**Запрещено:** придумывать сферу/должность без URL; ставить `high` с одним слабым источником; писать bio/телефоны в git.

## Алгоритм (один батч 15–40 карточек)

### 1. Подготовка

```bash
cd "<SB_ROOT>"
python3 60_System/automation/build_crm_research_queue.py
# при необходимости: --limit 40
```

Взять из последнего `credentials/crm_research_queue_*.json` порцию с высоким `priority`.

### 2. Ресёрч по карточке

Для каждой строки очереди:

1. **Компания известна** → сфера:
   - Официальный сайт / «о компании»
   - rusprofile.ru / checko.ru (ОКВЭД → маппинг на taxonomy)
   - Wikipedia / отраслевые справочники (TAdviser, Рувард для агентств)
2. **Только имя + Telegram (Outreach)** → сначала идентификация компании (TG bio если есть, LinkedIn, поиск `"@username"`, имя + Silver Mercury); если компании нет → `companySphere: unknown`, не гадать
3. **Должность** → верификация:
   - `current` — должность явно на сайте компании/агентства или LinkedIn (публично)
   - `likely_current` — совпадает с карточкой, косвенные признаки, нет противоречий
   - `outdated` — в источнике другая роль / «бывший»
   - `unverified` — компания ясна, должность из CRM не подтверждена
   - `unknown` — должности в карточке нет

### 3. Запись

```bash
python3 60_System/automation/validate_crm_contact_research.py credentials/crm_contacts_research_<stamp>.json
```

Перезапуск дашборда (или refresh API) — поля появятся в UI: колонка **Сфера**, статус должности.

### 4. Сводка в Inbox

Шаблон `note_crm_contact_research_<stamp>.md`:

- дата, размер батча, файл JSON
- таблица: сфера (counts), positionStatus (counts)
- 5–10 примеров **без ФИО** (только компания + сфера + статус)
- блок «нужен ручной дожим» (гомонимы, только TG)

## Приоритет очереди (дефолт скрипта)

1. Outreach TG (имя + TG)
2. Справочник: есть компания, нет сферы
3. Есть должность → верификация
4. ICRM / Amo / networking выше cold

Ориентир объёма Sputnik (2026-05): ~2407 справочник + ~224 outreach — **полный прогон = десятки батчей**, не один запрос.

## MCP / веб

- Сначала локальная база и API CRM
- Веб / Parallel (`/parallel-research`) — когда нужны внешние факты ([mcp_plugin_routing.mdc](../../rules/mcp_plugin_routing.mdc))
- Bot API Telegram **не** заменяет ресёрч сферы (getChat не даёт bio холодным контактам)

## Маппинг ОКВЭД → companySphere (шпаргалка)

| ОКВЭД / контекст | companySphere |
|------------------|---------------|
| 64.x банки, финуслуги | finance_bank |
| 62.x IT, телеком | telco_it |
| 47.x розница | fmcg_retail |
| 73.1 реклама | agency_creative |
| 59.1 кино/видео | production_film_video |
| 52.29 логистика, перевозки | logistics_industry |
| 41/42 девелопмент | real_estate_dev |

## UI после merge

- **Справочник:** колонки Сфера, Должность (+ статус)
- **Outreach TG:** Сфера + сегмент TG
- Фильтр **Факт-чек: нужен ресёрч / уже проверено**
- Чип: `Факт-чек: сфера N · должность M`

## Связанные файлы

| Файл | Назначение |
|------|------------|
| `60_System/automation/build_crm_research_queue.py` | Очередь |
| `60_System/automation/validate_crm_contact_research.py` | Валидация JSON |
| `60_System/automation/crm_contact_research_taxonomy.json` | Коды |
| `60_System/dashboard/server.js` | `loadCrmContactResearchMap`, `applyCrmContactResearch` |
| `mission-control-v2/.../CrmContactsTable.tsx` | UI |

## Skill Reflex

После каждого крупного батча — обновлять сводку в `00_Inbox/`; при новых edge-cases дополнять § «Маппинг» или `researchNotes` в taxonomy.

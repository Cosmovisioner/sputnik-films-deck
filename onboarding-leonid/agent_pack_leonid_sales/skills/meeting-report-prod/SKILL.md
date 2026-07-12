---
name: meeting-report-prod
description: Processes call transcripts into meeting summaries for Second Brain and production Google Drive reports. Use when the user shares a .txt transcript, asks for "саммари встречи", "отчет о встрече", "сделай репорт", or asks to create/copy a production meeting report template.
---

# Meeting Report (Second Brain + Production Drive)

## Purpose

Build a full meeting-report pipeline from transcript:
1) create local summary in Second Brain;
2) for production cases (Sputnik Films) create/update Google Drive report from template.

## Режиссёрская / личная фиксация (не продакшен-отчёт)

- Если пользователь говорит, что материал **режиссёрский**, **для себя**, **не от продакшена** — не гнать в шаблон `!Шаблон_Отчет о встрече` и **не** заполнять продакшен-таблицы «задача — ответственный» без запроса.
- Выход: нейтральная памятка по смыслу (решения, риски, хвосты) + при необходимости **оформленный `.docx`** на рабочий стол; ориентир по сборке: `60_System/automation/build_director_memo_docx.py` (копировать и адаптировать под проект).
- См. также `.cursor/rules/meeting_reports_production.mdc` — блок про режиссёрские отчёты.

## Trigger Conditions

Use this skill when:
- user sends `.txt` transcript of a call/meeting;
- user asks to create a meeting summary/report;
- user asks to copy report template to production Drive;
- a new file appears in `00_Inbox/transcripts_incoming/` (see [meeting-transcript-pipeline](../meeting-transcript-pipeline/SKILL.md) for auto-import from Whisper/Zoom).

## Production Google account (обязательно)

- **Все отчёты о встречах в Google Drive создаются только на аккаунте `cosmovision.prod@gmail.com`.** Личный `cosmovisioner@gmail.com` для этого не использовать.
- Любые команды `drive_automation.py` для копирования шаблона и `fill-report` / `fix-report-theses` — **только** с флагом `--account prod` из корня скрипта:  `python3 60_System/automation/drive_automation.py --account prod …`
- **Не вызывать** `get_service()` / `copy` / Docs API из произвольного `python3 -c` без установки `GDRIVE_TOKEN_JSON` на `credentials/gdrive_token_prod.json` и без проверки аккаунта — иначе файл уедет в личный Drive.
- Скрипт при `--account prod` (кроме `auth`) проверяет, что активный пользователь Drive — именно `cosmovision.prod@gmail.com`. Если токен prod был выдан под личный вход — пользователь увидит ошибку и инструкцию выполнить `python3 drive_automation.py --account prod auth` и войти в браузере как **cosmovision.prod@gmail.com**.

## Core Rules

- Always extract: meeting date, place, participants by side (client / production), client brand/project name, topic, key theses, action items.
- For user-owned action items, always run this flow: show `Задачи для подтверждения` in chat, then persist them to `00_Inbox/note_tasks_inbox.md` immediately, then wait for confirmation before moving to journal/calendar.
- If place is unknown, ask clarifying question before finalizing (`Яндекс Телемост` or `Zoom` default only when user confirms default behavior).
- If participants/client are unclear, ask clarifying question.
- If action items include explicit owners and deadlines, fill Google Doc table `Задачи | Ответственный | Дата исполнения`.
- Local summary is mandatory; for `sputnik_films` **always sync to production Google Drive immediately** after local summary is ready — **do not ask** the user for permission. For **director / personal** memos, skip Drive unless the user asks.
- When updating an existing local summary, **always update the linked Google Doc** in the same pass (theses via `fix-report-theses`, extended blocks via append or replace).
- Reports must be detailed by default: include context, assumptions, risks, alternatives discussed, rationale behind decisions, and explicit next steps.
- Key theses must be expanded and concrete: target at least 10-15 тезисов when transcript size allows.
- If theses do not fit comfortably in the template thesis area, add an additional section below the template table in the same Google Doc: `РАСШИРЕННЫЕ КЛЮЧЕВЫЕ ТЕЗИСЫ` with numbered items.
- **Always append a second section below the template table for production reports:**
- **Always append an expanded block below the main template table for production reports (mandatory):**
  1) `РАСШИРЕННАЯ СТРУКТУРА ЗВОНКА` (blocks by phases/topics),
  2) `РАСШИРЕННЫЕ КЛЮЧЕВЫЕ ТЕЗИСЫ` (numbered, concrete).
  This is mandatory even if the main table is already filled.
- In the expanded block, if the conversation naturally splits by themes, add optional subheadings/categories (e.g. context, goals, constraints, decisions, next steps) to improve readability.
- Minimum detail target for sizeable transcripts (30+ min):
  - `РАСШИРЕННАЯ СТРУКТУРА ЗВОНКА`: 6-10 structured blocks,
  - `РАСШИРЕННЫЕ КЛЮЧЕВЫЕ ТЕЗИСЫ`: 15-25 points.
- Expanded sections must follow the actual conversation content and preserve important details; do not force fixed topic categories if they were not part of the call.
- If the user asks to exclude numbers/budgets in a specific summary, remove all financial figures and numeric budget references from both the main theses and the expanded block while preserving the meaning.
- For JSON field `theses`, pass plain lines without manual numeric prefixes (`1)`, `2)`), because `fill-report` applies numbering automatically.
- Avoid repeated `fill-report` runs on the same copied report document: repeated full fills can duplicate content in template cells.
- If report layout is visibly broken or duplicated after edits, create a fresh copy from template and refill once, then archive broken file as backup.

## Local Summary Format

- Save into project folder under `20_Business_Projects/...` with name:
  - `note_meeting_<project_or_client>_call_YYYY_MM_DD_summary.md`
- Keep detailed structure (синхронизировано с `meeting_reports_production.mdc`: обязательны два уровня тезисов):
  - Context
  - `Ключевые тезисы` (короткая нумерация)
  - `Подробная расшифровка тезисов` (развёрнутое пояснение к каждому пункту отдельной строкой — nuances, trade-offs)
  - Decisions
  - Open questions
  - Risks and constraints
  - Next steps (task / owner / deadline)
- Underscore только в именах файлов (snake_case); в тексте саммари и Google-отчётах подчёркивания не использовать.

## Google Drive Report Workflow

Use script: `60_System/automation/drive_automation.py` **with `--account prod` only** (storage: `cosmovision.prod@gmail.com`).

1. Find template doc: `!Шаблон_Отчет о встрече` (document, not spreadsheet) **на prod Drive**.
2. Determine next report number for same client/project.
3. Copy template to folder `РЕПОРТЫ`.
4. Name copy: `клиент_отчет о встрече_#_дд.мм.гг`.
5. Fill text fields and theses:
   - command: `fill-report DOCUMENT_ID path/to/fields.json`
6. If previous edits broke theses placement:
   - command: `fix-report-theses DOCUMENT_ID path/to/fields.json`
7. If detailed theses overflow the template area:
   - append section after table in same doc:
     - title: `РАСШИРЕННЫЕ КЛЮЧЕВЫЕ ТЕЗИСЫ`
     - numbered list with concrete points

## JSON Contract For `fill-report`

Use this structure:

```json
{
  "present": "fallback: участники клиента, если нет разделения по сторонам",
  "present_client": "участники со стороны клиента",
  "present_production": "участники со стороны продакшна",
  "date": "дд.мм.гггг",
  "client": "fallback: название клиента/проекта",
  "place": "Яндекс Телемост",
  "production": "fallback: участники продакшна или бренд продакшна",
  "client_brand": "название клиента/бренда (идет в отдельную ячейку)",
  "topic": "тема встречи",
  "theses": "ключевые тезисы",
  "tasks": [
    {
      "task": "что сделать",
      "owner": "кто отвечает",
      "deadline": "до дд.мм.гггг"
    }
  ]
}
```

## Sputnik Cell Mapping (Strict)

For the production template with helper text in cells, write only to these target cells:
- `row3,col0` → date (`(тут пишем дату)`)
- `row6,col0` → place (`(тут пишем место)`)
- `row9,col0` → client/brand name (`(тут пишем название)`)
- `row3,col1` → client-side participants (`(тут пишем присутствующих со стороны клиента)`)
- `row8,col1` → production-side participants (`(тут пишем присутствующих со стороны продакшна)`)
- `row12,col1` → topic (`(тут пишем тему)`)
- `row14,col0` → numbered theses list (white row below `КЛЮЧЕВЫЕ ТЕЗИСЫ`)

Do not modify any other cells/labels. Specifically, do not rewrite:
- `ОТЧЕТ О ВСТРЕЧЕ`
- label rows (`ДАТА ВСТРЕЧИ:`, `КЛИЕНТ:`, `МЕСТО ВСТРЕЧИ:`, `ПРОДАКШН:`, `КЛИЕНТ/БРЕНД:`, `ТЕМА ВСТРЕЧИ:`, `КЛЮЧЕВЫЕ ТЕЗИСЫ`)
- logo cell / merged decorative cells

## Sales call intelligence (client / sales calls)

Когда встреча = **клиентский / продающий** созвон (не внутренний Cult sync, не режиссёрская личная фиксация) — после обычного саммари добавить блок и обновить банк возражений.

### Когда включать

- Явный запрос: «разбери звонок продаж», «возражения из звонка», «MEDDIC с созвона»
- Контекст: клиент / бренд / пресейл / КП / квалификация в CRM
- Есть `deal_id` или карточка в `artifact_crm_leads_2026.md`

Не включать по умолчанию для: внутренних стендапов, найма, личных 1:1 без коммерции.

### Промпт-логика (сохранить оригинальные формулировки)

```
Вот расшифровка продающего звонка. Выпиши:
1) С какими задачами и проблемами обращаются
2) Чего они боятся и в чём сомневаются
3) Дословные фразы, которыми они описывают свои проблемы
Сгруппируй по частоте относительно уже известного банка, если банк читали.
Также заполни MEDDIC-черновик: Metrics, Economic buyer, Decision criteria,
Decision process, Identify pain, Champion (неизвестно → явно «не сказано»).
```

### Куда писать

1. В локальном саммари — секция:

```markdown
## Sales call intelligence

### Задачи / проблемы
- …

### Страхи / сомнения
- …

### Дословные формулировки болей
- «…»

### MEDDIC (черновик)
| Поле | Значение |
|------|----------|
| Metrics | |
| Economic buyer | |
| Decision criteria | |
| Decision process | |
| Identify pain | |
| Champion | |

### Возражения → кандидаты в банк
- …
```

2. Новые уникальные формулировки — дописать в [`40_Artifacts/artifact_sales_objection_bank_2026.md`](../../../40_Artifacts/artifact_sales_objection_bank_2026.md) (частота + источник-дата + встреча). Без телефонов/личных email.

3. При `crm_document_ingest` / deal folder — краткая отсылка к блоку intelligence в summary уже привязанном к `deal_id`.

Архитектура: [artifact_crm_outreach_b2b_conversion_system_2026.md](../../../40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md).

## Execution Checklist

- [ ] Read transcript file
- [ ] Extract structured data (including tasks with owner/deadline)
- [ ] Extract tasks owned by user and show `Задачи для подтверждения` in chat
- [ ] Save extracted user tasks to `00_Inbox/note_tasks_inbox.md` before waiting for reply
- [ ] Write local summary markdown
- [ ] Produce expanded theses (10-15+ points when possible)
- [ ] If **client/sales** call: add `Sales call intelligence` + update objection bank when new phrases appear
- [ ] If production case: copy template + fill report in Drive **на `cosmovision.prod@gmail.com`** (`--account prod`, без inline `python -c` без токена prod)
- [ ] Verify theses are in white field below header
- [ ] Add both expanded sections below table: `РАСШИРЕННАЯ СТРУКТУРА ЗВОНКА` and `РАСШИРЕННЫЕ КЛЮЧЕВЫЕ ТЕЗИСЫ`
- [ ] Verify task table rows populated when owner/deadline exist
- [ ] If no user confirmation in chat, keep tasks in Inbox (do not auto-move to day/week)
- [ ] Return links/paths to user

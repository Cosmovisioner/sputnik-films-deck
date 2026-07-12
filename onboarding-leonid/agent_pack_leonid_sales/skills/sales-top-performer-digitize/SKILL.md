---
name: sales-top-performer-digitize
description: >-
  Digitize top seller behavior from call transcripts and CRM/journal action patterns
  into best practices, script updates, and mandatory touch rituals. Use when user asks
  «оцифруй продажи», «оцифруй топ-сейлза», «выжимка лучшего продавца», «регламент из
  звонков», or after a streak of won deals to refresh sales playbook.
---

# Sales Top-Performer Digitize

Цель: из транскриптов **лучшего продавца** (+ логи касаний) получить воспроизводимый список практик → обновить скрипт, регламент касаний и снимок playbook.

Архитектура: [artifact_crm_outreach_b2b_conversion_system_2026.md](../../../40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md).
Канон роли: [role_sales_newbiz.md](../../../60_System/roles/role_sales_newbiz.md).

## Когда применять

- «оцифруй топ-сейлза», «вытяни приёмы из звонков X»
- После серии won / strong deals
- Онбординг нового сейлза / выравнивание команды Cult–Sputnik

## Входы

1. **Транскрипты** (пачка): won deals и сильные пресейлы одного продавца
   - из `00_Inbox/transcripts_incoming/` или готовых `note_meeting_*_summary.md`
2. **Лог действий** (что есть):
   - карточки CRM / next steps
   - журнал задач (касания)
   - post-meet action items
3. Контекст оффера: [artifact_sputnik_commercial_identity.md](../../../40_Artifacts/artifact_sputnik_commercial_identity.md)

Не требуется полный CRM export; если логов мало — Digitize только по речи (явно пометить gap).

## Workflow

### 1. Отобрать корпус

- 3–8 звонков минимум (лучше смесь discovery + negotiation + close)
- Исключить чисто операционные sync без продаж

### 2. Анализ (промпт-ядро)

```
Вот транскрипты звонков лучшего продавца и (если есть) лог действий в CRM/журнале.
Выпиши:
1) Речевые обороты и приёмы, которые повторяются и коррелируют с прогрессом сделки
2) Обязательные действия между касаниями (что делает продавец вне звонка)
3) Как квалифицирует / как ведёт discovery (SPIN/MEDDIC-наблюдения)
4) Как отрабатывает возражения (с дословными фразами)
5) Чего сознательно избегает
Сгруппируй в: «в скрипт» / «в регламент касаний» / «в onboarding» / «не масштабировать (харизма/контекст)».
```

### 3. Выходной артефакт

Создать:

`40_Artifacts/artifact_sales_top_performer_playbook_YYYY_MM.md`

Шаблон:

```markdown
# Top-performer playbook snapshot — YYYY-MM

Файл: `artifact_sales_top_performer_playbook_YYYY_MM.md`
Тип: Artifact
Продавец: [имя / роль]
Корпус: N звонков, даты …

## Best practices (речь)
1. …

## Обязательные действия (регламент)
- [ ] …
Касания: частота / канал / что фиксировать в CRM

## В скрипт (добавить)
### Discovery
### Отработка возражений
### Close / next step

## Не масштабировать
- …

## Дельта к role Playbook
- Что предложить внести в `role_sales_newbiz.md` / objection bank
- Что уже есть (не дублировать)

## Источники
- paths к summary/transcript
```

### 4. Apply (только с ок пользователя)

1. Предложить дифф к разделу возражений / ритуалов в `role_sales_newbiz.md` (не молча переписывать Playbook целиком).
2. Новые формулировки болей → [artifact_sales_objection_bank_2026.md](../../../40_Artifacts/artifact_sales_objection_bank_2026.md).
3. Регламент касаний (≥N/мес и т.п.) — согласовать с уже известными нормами из research Шадриной / SETTERS, не копировать чужие KPI вслепую.

## Не делать

- Не выдавать харизму одного человека за обязательный SOP без фильтра «масштабируемо».
- Не сливать клиентские ПД в артефакт.
- Не подменять post-mortem lost deals этим skill (для проигрышей — отдельный режим Sales).

## Handoff

- Свежий звонок → сначала `meeting-report-prod` (+ sales-call-intelligence), потом digitize корпуса
- Код CRM → vibecoder
- Стратегия найма отдела → role + research_sales_department_build_*

# CRM x Outreach Qualification Policy

Файл: `artifact_crm_outreach_qualification_policy.md`
Путь сохранения: `SecondBrain/40_Artifacts/`
Тип документа: `Artifact`

## Решение

Не считать любое касание "заявкой".
Холодный outreach и CRM pipeline разделяются, чтобы winrate отражал качество коммерческой работы, а не объем шума.

## Проблема, которую закрываем

- Раньше в CRM попадали почти все ответы/контакты из холодной базы.
- Из-за этого воронка засорялась low-intent и мусорными лидами.
- Winrate искусственно занижался и терял управленческий смысл.

## Двухконтурная модель

### Контур A - Outreach Engine (операционный)

- Все сырые холодные контакты.
- Все касания (initial/FU1/FU2), технические статусы, ошибки.
- Источник правды для объема outreach-операций.

### Контур B - CRM Sales Pipeline (коммерческий)

- Только квалифицированные лиды, у которых есть шанс сделки.
- Источник правды для winrate, forecast, performance sales.

## Что считать "лидом для CRM" (MQL/SQL gate)

Лид переносится из A в B только если одновременно:

1. Есть явный ответ (или warm intro от релевантного контакта).
2. Есть ICP fit (по `artifact_crm_lead_scoring` не ниже класса B).
3. Есть следующий шаг (созвон/бриф/запрос КП с датой).
4. Назначен owner.
5. Контакт не в suppression-list.

Если хотя бы один пункт не выполнен - остается в Outreach Engine.

## Метрики, чтобы не искажать winrate

### Метрики Outreach Engine

- sent
- reply_rate
- positive_reply_rate
- bounce_rate
- technical_error_rate

### Метрики CRM Pipeline

- sql_to_meeting
- meeting_to_proposal
- proposal_to_win
- winrate
- cycle_length
- weighted_forecast

Правило: winrate считается только по CRM Pipeline (контур B).

## Классификация ответов (практика)

- `noise_reply`: "сколько стоит?", "не туда", "автоответ", без next step.
- `interest_reply`: есть релевантный интерес, но без зафиксированного шага.
- `qualified_reply`: есть интерес + следующий шаг + owner.

Только `qualified_reply` переводится в CRM-сделку.

## Governance

- Еженедельно: аудит 10-20 последних переносов A -> B.
- Цель: не "больше сделок в CRM", а выше качество и прогнозируемость воронки.
- Любое изменение gate фиксировать в этом артефакте и в campaign checklist.

## Связанные документы

- `40_Artifacts/artifact_crm_lead_scoring.md`
- `40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md` — хаб: досье, call-intel, digitize seller, приоритизация
- `60_System/automation/note_outreach_campaign_launch_checklist_template.md`
- `60_System/automation/outreach_campaign_registry.example.json`

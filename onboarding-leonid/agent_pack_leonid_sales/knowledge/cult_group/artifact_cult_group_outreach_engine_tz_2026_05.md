# Cult Group — мини-ТЗ: outreach engine / бот-рассыльщик

**Дата:** 2026-05-12
**Статус:** draft for CTO discussion
**Назначение:** зафиксировать требования к reusable outreach engine, который управляет касаниями, а не смешивает сырой аутрич с CRM-сделками.

---

## 1. Проблема сейчас

- В репозитории уже есть рабочий контур TGND-аутрича, но он завязан на конкретную кампанию и Google Sheet-схему.
- Нет общего multichannel engine для группы.
- Нет единого suppression / sequence / campaign registry слоя на несколько сценариев.
- Telegram-сценарии и user-account отправка пока не собраны в единый runtime.
- Аутрич нельзя отложить "до идеальной CRM", но и нельзя заливать в CRM весь шум касаний.

---

## 2. Что должна решать сущность

Контур должен:
- хранить и исполнять очереди касаний;
- вести sequence logic и follow-ups;
- фиксировать отправки, ответы, ошибки и suppressions;
- сегментировать кампании;
- давать operator control через Telegram и/или внутренний интерфейс;
- передавать в CRM только `qualified` случаи.

---

## 3. Пользователи и владелец

### Основные пользователи
- `cold outreach specialist`
- `new biz manager`
- `sales-assistant / agent operator`
- `RevOps / CRM-owner`

### Владелец сущности
- продуктово: `CRO / VP New Biz`
- технически: `CTO / product owner`

---

## 4. Входные данные

- подтверждённые контакты и сегменты из parser/enrichment layer;
- шаблоны и правила касаний;
- каналы и campaign settings;
- suppression lists;
- qualification policy;
- ограничения по окнам отправки, частоте, owner и каналам.

---

## 5. Выходные данные

На каждый контакт / касание система должна уметь отдавать:
- `campaign_id`
- `segment`
- `channel`
- `sequence_step`
- `status`
- `sent_at`
- `reply_status`
- `error_reason`
- `suppression_reason`
- `qualification_hint`
- `crm_handoff_status`

---

## 6. MVP scope

### MVP-функции

1. Очереди касаний по сегментам.
2. Sequence logic: `step_1 / step_2 / follow_up`.
3. Status layer:
   - `queued`
   - `sent`
   - `replied`
   - `error`
   - `suppressed`
4. Reply sync и базовая классификация ответа.
5. Suppression list и dedupe по касаниям.
6. Telegram notifications и lightweight control.
7. Campaign registry.
8. Qualification gate: raw outreach не попадает в CRM автоматически.

### Каналы MVP

Обязательный фокус `MVP`:
- `email-first`
- Telegram как `notification / operator control / assisted flow`

### Каналы phase 2

- Telegram user-account sending
- multichannel assisted outreach
- дополнительные каналы, если группа их отдельно подтверждает

---

## 7. Что уже можно переиспользовать

Из текущего стека есть смысл брать как основу:
- `60_System/automation/tgnd_outreach_orchestrator.py`
- `60_System/automation/tgnd_outreach_worker.py`
- `60_System/automation/tgnd/README.md`
- `60_System/automation/tgnd_outreach_config.example.json`
- `60_System/automation/tgnd_outreach_templates.md`
- `60_System/automation/note_tgnd_outreach_runbook.md`
- `60_System/automation/outreach_campaign_registry.example.json`
- `60_System/automation/outreach_config_sputnik_films_email_v1.example.json`
- `60_System/telegram_mcp/server.py`
- `60_System/telegram_mcp/server_bot.py`

Это уже даёт:
- sequence engine;
- worker/runtime;
- health checks;
- Telegram notifications;
- registry pattern;
- reusable config vocabulary.

---

## 8. Что не делаем в MVP

- полную автоматизацию всех каналов сразу;
- массовую отправку от личных аккаунтов без отдельного approval;
- автогенерацию сложных сообщений без человека в цикле;
- автозаливку всех reply в CRM как сделок;
- "волшебный outreach", который не учитывает suppression и ownership.

---

## 9. Зависимости от других контуров

- получает контакты из `parser / enrichment`;
- получает сигналы и поводы из `warm base signal monitor`;
- передаёт `qualified` результаты в `CRM + AI / RevOps layer`;
- использует CRM policy как gate, но не заменяет CRM.

---

## 10. Риски и ограничения

1. Если не вынести TGND-логику в reusable package, группа получит ещё один project-specific worker.
2. Без единого suppression layer высок риск дублей и конфликтующих касаний.
3. Без owner-модели система будет создавать хаос по сегментам и контактам.
4. Использование личных аккаунтов и чувствительных каналов требует отдельного policy approval.

---

## 11. Критерий готовности для beta

Контур считается готовым к beta, если:
- он умеет стабильно вести кампанию по сегменту;
- replies и errors не теряются;
- suppression работает;
- Telegram-уведомления и операторский контроль достаточно понятны;
- qualification gate не засоряет CRM сырыми контактами;
- новый sales / new biz manager понимает, как пользоваться очередями и статусами.

---

Файл: `artifact_cult_group_outreach_engine_tz_2026_05.md`
Путь сохранения: `SecondBrain/20_Business_Projects/sputnik_films/operations/cult_group/co_sales/`
Тип документа: **Artifact**

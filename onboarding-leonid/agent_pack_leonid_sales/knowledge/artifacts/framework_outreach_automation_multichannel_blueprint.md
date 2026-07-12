# Framework: Outreach Automation Multichannel Blueprint

Файл: `framework_outreach_automation_multichannel_blueprint.md`
Путь сохранения: `SecondBrain/30_Knowledge/frameworks/`
Тип документа: `Knowledge`

## Зачем

Единая архитектура для масштабирования аутрича с одного кейса (TGND email outreach) на другие базы и каналы:
- Sputnik Films (новые базы контактов);
- email как базовый контур;
- затем Telegram / LinkedIn и другие источники.

Цель: переносить не скрипты "как есть", а рабочие принципы + слой конфигов + слой каналов.

## Что уже доказано на TGND

- Always-on автономный рантайм в Railway (не зависит от локального ноутбука).
- Оркестратор с безопасными гейтами (окно отправки, лимиты, anti-spam warmup).
- Статусная модель контакта и цикл касаний (initial, follow-up 1, follow-up 2, replied, error).
- Синхронизация ответов по Message-ID через IMAP.
- Телеграм-статусы и простое управление через команды.
- Provider health-check + preflight + post-deploy smoke.

## Базовые принципы (переносимые)

1. Safe-by-default: dry-run и preflight перед любым apply.
2. Идемпотентность: повтор цикла не должен дублировать отправки.
3. Наблюдаемость: все важные состояния пишутся в таблицу и логи.
4. Ограничение риска: дневной лимит, прогрев, max attempts per contact.
5. Разделение контуров: данные контактов отдельно, контент отдельно, отправка отдельно.
6. Канал-независимая логика: sequence engine не знает деталей SMTP/Telegram/LinkedIn API.

## Референс-архитектура (для всех будущих outreach)

### L1 Data Layer

- Источник контактов: Google Sheets / CRM export.
- Нормализованные поля контакта:
  - `contact_id`, `channel`, `endpoint`, `segment`, `owner`, `priority`.
- Служебные поля кампании:
  - `status`, `touch_stage`, `last_touch_at`, `next_action_at`, `error_code`, `notes`.

### L2 Policy Layer

- Правила отправки:
  - send window, weekdays/weekends, regional timezone policy.
- Safety policy:
  - daily max, warmup steps, retries, cooldown, stop conditions.
- Compliance policy:
  - allowlist доменов/источников;
  - opt-out / do-not-contact список;
  - канал-specific правила (anti-spam, etiquette).

### L3 Sequence Engine

- Универсальные этапы:
  - stage 0: qualification;
  - stage 1: initial touch;
  - stage 2: follow-up #1;
  - stage 3: follow-up #2;
  - stage 4: terminal (replied/closed/error).
- Планировщик переходов:
  - на основе `status + timestamps + policy`.
- Детерминированная A/B-логика:
  - bucket по hash(contact endpoint).

### L4 Channel Adapters

- Email adapter (SMTP/IMAP) - уже реализован и боевой.
- Telegram adapter (bot API/DM/group) - для ручных и полуавтоматических касаний.
- LinkedIn adapter (ручной assisted mode на старте, затем API/automation если допустимо правилами платформы).

### L5 Runtime + Ops

- Worker loop (Railway) + health probes.
- Incident protocol:
  - notify once on incident start, once on recovery.
- Post-deploy smoke:
  - provider-health, notify-test, channel test-send.

## Минимальный стандарт данных для новой базы (обязательно)

Перед запуском нового outreach нужны:

- `campaign_id` (уникальный id кампании);
- `contact_id` (стабильный id контакта);
- `channel` (`email`, `telegram`, `linkedin`);
- `endpoint` (email/username/profile url);
- `region` / `segment` / `priority`;
- `status` + `touch timestamps` + `error_code`.

Без этого будет хрупкая дедупликация и риск дублей.

## Что нужно дополнительно для масштабирования на Sputnik и другие базы

1. Каноническая схема таблицы/CRM для всех outreach (единые названия полей).
2. Реестр кампаний (`campaign_registry`) с owner, каналом, лимитами и шаблонами.
3. Отдельные конфиги на кампанию:
   - `outreach_config_<campaign>.json`.
4. Шаблоны сообщений по каналам:
   - email templates;
   - telegram templates;
   - linkedin scripts (assisted).
5. Общий suppression-list:
   - bounced, complained, opted-out, banned domains.
6. Единый дашборд KPI:
   - sent/day, reply rate, positive reply rate, bounce rate, error backlog.

## План внедрения (рекомендуемый)

1. Выделить TGND как "reference campaign v1".
2. Вынести универсальные части в reusable core (policy + sequence + status model).
3. Подключить вторую кампанию Sputnik только в email-канале.
4. После 1-2 недель стабильности добавить Telegram-touch adapter.
5. LinkedIn подключать в assisted mode, пока не зафиксированы platform-safe правила.

## Definition of Done для новой кампании

- Preflight и provider-health проходят без ошибок.
- Dry-run не создает дублей и корректно ставит статусы.
- 3+ рабочих дня без инцидентов в apply.
- Логи и KPI читаемы, есть owner по ошибкам.
- Stop conditions и manual override задокументированы.

## Антипаттерны (не делать)

- Смешивать в одном скрипте бизнес-логику и канал-специфику.
- Деплоить кампанию без dry-run и без suppression-list.
- Делать "быстрые" ручные обходы лимитов в проде.
- Хранить секреты в markdown, чатах или git.

## Связанные документы

- `60_System/automation/note_tgnd_outreach_runbook.md`
- `60_System/automation/tgnd_outreach_orchestrator.py`
- `60_System/automation/tgnd_outreach_worker.py`
- `60_System/automation/.env.example`

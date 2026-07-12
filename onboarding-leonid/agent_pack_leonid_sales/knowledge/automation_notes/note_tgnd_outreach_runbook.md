# TGND Outreach Runbook

Файл: `note_tgnd_outreach_runbook.md`
Путь сохранения: `SecondBrain/60_System/automation/`
Тип документа: `System`

## 1) Preflight (обязательно)

1. Заполнить `tgnd_outreach_config.example.json` и при необходимости скопировать в `tgnd_outreach_config.local.json`.
2. Проверить, что переменные заданы в `60_System/automation/.env`:
   - `YANDEX_SMTP_USERNAME`
   - `YANDEX_SMTP_PASSWORD`
   - `YANDEX_IMAP_USERNAME`
   - `YANDEX_IMAP_PASSWORD`
3. Проверить DNS на стороне домена:
   - SPF
   - DKIM
   - DMARC
4. (Опционально) Telegram-уведомления о новых ответах:
   - создать бота у `@BotFather`;
   - получить `chat_id` (через `@userinfobot` или API);
   - добавить в `.env`: `TGND_TELEGRAM_BOT_TOKEN=...`;
   - в `tgnd_outreach_config.example.json` включить:
     - `notification.telegram_enabled=true`
     - `notification.telegram_chat_id="<your_chat_id>"`

Команды:

```bash
cd 60_System/automation
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json preflight
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json ensure-schema
```

## 2) Безопасный пилот

1. Сухой прогон (пишет статусы/AB-бакеты в таблицу, но не отправляет письма):

```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json dry-run
```

2. Пилотная отправка 10-15 писем:

```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json send-initial --apply --max-send 12
```

3. Проверка ответов:

```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json sync-replies
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json stats
```

## 3) Основная волна

Рекомендуемый темп:
- день 1: 20-25;
- день 2: 30-35;
- день 3+: 35-45.

Запуск:

```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json send-initial --apply --max-send 35
```

## 4) Follow-up + sync replies

```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json send-followups --apply --max-send 50
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json sync-replies
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json stats
```

## 5) Always-on (без открытого Cursor)

Используй `launchd` на macOS.

Пример `~/Library/LaunchAgents/com.secondbrain.tgnd_outreach.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.secondbrain.tgnd_outreach</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/cosmovisioner/Documents/Coosmovisioner AI/GitHub/SecondBrain/60_System/automation/tgnd_outreach_orchestrator.py</string>
    <string>--config</string>
    <string>/Users/cosmovisioner/Documents/Coosmovisioner AI/GitHub/SecondBrain/60_System/automation/tgnd_outreach_config.example.json</string>
    <string>daily-cycle</string>
    <string>--apply</string>
    <string>--max-send-initial</string>
    <string>35</string>
    <string>--max-send-followups</string>
    <string>50</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>10</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/cosmovisioner/Documents/Coosmovisioner AI/GitHub/SecondBrain/60_System/automation/logs/tgnd_outreach.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/cosmovisioner/Documents/Coosmovisioner AI/GitHub/SecondBrain/60_System/automation/logs/tgnd_outreach.err.log</string>
</dict>
</plist>
```

Применить:

```bash
mkdir -p 60_System/automation/logs
launchctl load ~/Library/LaunchAgents/com.secondbrain.tgnd_outreach.plist
launchctl list | rg tgnd_outreach
```

## 5.1) Always-on в облаке (Railway, работает даже при выключенном ноутбуке)

Если нужно полностью автономно 24/7 (ноутбук может быть выключен), лучше запускать в Railway.

### Критично: иначе писем не будет

По умолчанию воркер вызывает `daily-cycle` **без** флага `--apply` → это **сухой прогон** (логи могут выглядеть «нормально», SMTP не шлёт, папка «Отправленные» пустая).

**Обязательно в Railway → Variables:**

| Переменная | Значение |
|------------|----------|
| `TGND_APPLY_MODE` | `true` |

Без этого рассылка **никогда** не уйдёт в прод, сколько бы ни «запускали» сервис.

**Healthcheck:** в `railway.toml` задан `healthcheckPath = "/health"`. На Railway воркер поднимает HTTP на **`PORT`** (переменная платформы) и отвечает `200` на `/health`. Отдельно задавать `TGND_HEALTH_PORT` не нужно, если не хочешь другой порт вручную.

**Root Directory в Railway — одна настройка, два способа деплоя (здесь была путаница, читай внимательно):**

| Как ты выкатываешь код | Что должно быть в **Root Directory** | Почему |
|------------------------|--------------------------------------|--------|
| **GitHub** подключён к **корню** репозитория Second Brain (весь монорепо) | **`60_System/automation`** | В снапшоте репо есть папка `60_System/automation` — Railway заходит в неё и собирает воркер. |
| **`railway deployment up`**, когда ты стоишь **внутри** папки `60_System/automation` на диске | **пусто** (или не задавать) | В архив уходит **только** содержимое automation — пути `60_System/automation` внутри архива **нет**, Railway не находит папку → ошибка *Root Directory does not exist*. |

**Рекомендация «без сюрпризов»:** в UI всегда держи **`Root Directory = 60_System/automation`**, а CLI-деплой делай **из корня репозитория** Second Brain (не из подпапки):

```bash
cd "/path/to/SecondBrain"
railway deployment up -s tgnd-outreach-automation 60_System/automation --ci
```

(Проект должен быть прилинкован к Railway из этого же корня или сервис указан `-s`.)

**Новый код с GitHub:** `railway redeploy` перезапускает **старый** образ; нужен **новый build** (push в `main` или команда выше). Ошибка **«Failed to create code snapshot»** — сбой Railway: повтори деплой позже или напиши в поддержку.

**PDF обязателен в образе:** файл `prezentaciya_tgnd.pdf` должен быть **закоммичен в git** (или иначе попадать в `/app` при сборке). Если его нет в деплое, в логах будет `[warn] attachment missing` — письма уйдут без вложения.

**Google Sheets (облако):** в Variables задай `GOOGLE_SERVICE_ACCOUNT_JSON` (полный JSON SA). Таблицу нужно **расшарить на email сервисного аккаунта** из поля `client_email` в этом JSON с правами **Редактор**. Иначе в логах будет `HttpError 403 ... The caller does not have permission`, цикл завершится с `exit_code=1`, строки в Sheet не обновятся.

1. Авторизация CLI:
```bash
railway login
```
2. Привязка проекта: предпочтительно **`railway link`** из **корня** репозитория Second Brain. Деплой через CLI — см. блок **`railway deployment up … 60_System/automation`** выше (не из подпапки automation, если в UI задан Root Directory).
3. В Variables Railway задать:
   - `YANDEX_SMTP_USERNAME`
   - `YANDEX_SMTP_PASSWORD`
   - `YANDEX_IMAP_USERNAME`
   - `YANDEX_IMAP_PASSWORD`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (тот же SA, что даёт доступ к таблице)
   - `TGND_TELEGRAM_BOT_TOKEN` (если нужны TG-уведомления)
   - `TGND_TELEGRAM_CHAT_ID` (chat_id группового чата; переопределяет chat_id из JSON-конфига)
   - **`TGND_APPLY_MODE=true`** (обязательно для реальной отправки; иначе только dry-run)
   - опционально: `TGND_CYCLE_INTERVAL_SEC`, `TGND_MAX_SEND_INITIAL`, `TGND_MAX_SEND_FOLLOWUPS`, `TGND_CONFIG_PATH`
   - `TGND_STRICT_ATTACHMENTS=true` (рекомендуется в проде): без `prezentaciya_tgnd.pdf` по пути из конфига цикл не шлёт письма и падает с понятной ошибкой
4. В Variables задать также:
   - `PYTHONUNBUFFERED=1`
5. **Старт:** в `railway.json` задано `python3 -u tgnd_outreach_worker.py` — воркер в цикле вызывает `daily-cycle`.

### 5.2) Post-deploy проверка

```bash
railway logs --service "tgnd-outreach-automation" --tail 300
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json stats
```

Ожидаемо: в логах нет `403`, нет `[Errno 101] Network is unreachable` на SMTP, `cycle exit_code=0`. После `sync-replies` с новыми ответами в логе должно быть `[notify] telegram sent` (если Telegram включён в конфиге).

### 5.3) Частые сбои Railway

| Симптом | Что сделать |
|--------|-------------|
| `403 ... does not have permission` (Sheets) | Расшарить таблицу на `client_email` из SA JSON; проверить, что в Railway не обрезан/не испорчен JSON (кавычки, переносы). |
| `[Errno 101] Network is unreachable` (SMTP) | Часто транзитно; повторить цикл. Если повторяется — проверить регион деплоя и доступность `smtp.yandex.ru:465` с платформы. |
| `provider unhealthy (smtp:OSError)` / `errno 101` на Railway | Часто **IPv6 без маршрута**: при заданном `RAILWAY_ENVIRONMENT` SMTP идёт **только по IPv4** (TLS/SNI с именем хоста сохраняются). Явно: `TGND_SMTP_IPV4_ONLY=true`; выключить: `TGND_SMTP_IPV4_ONLY=false`. Плюс fallback **587 STARTTLS** после сбоя 465; `TGND_SMTP_DISABLE_STARTTLS_FALLBACK=1` отключает. Ретраи: `TGND_PROVIDER_SMTP_*`. Диагностика: `TGND_PROVIDER_GATE_ENABLED=false`. |
| Письма без PDF | Убедиться, что PDF в репозитории и попадает в образ; смотреть лог на `[warn] attachment missing`. |

Такой режим не зависит от Cursor и локального компьютера.

## 5.4) Остановить рассылку (кампания завершена, убрать ошибки в Telegram)

Воркер на Railway (`tgnd-outreach-automation`) крутит `daily-cycle` по расписанию. Если волна **закончена**, но сервис **включён**, в бот могут приходить сообщения «Там, где наш дом — рассылка / сбой шага».

**Railway → сервис → Variables** (перезапуск подхватит без нового деплоя):

| Действие | Переменные |
|----------|------------|
| **Полная пауза** (рекомендуется) | `TGND_OUTREACH_PAUSED` = `true` |
| **Только не слать письма** | `TGND_MAX_SEND_INITIAL` = `0`, `TGND_MAX_SEND_FOLLOWUPS` = `0` |
| **Жёсткий стоп** | Settings → **Stop** сервиса |

В логах при паузе: `paused=True`, `[paused] TGND_OUTREACH_PAUSED — daily-cycle not scheduled`. Фатальные алерты из `daily-cycle` в Telegram **не** шлются. Команды бота (`/status_today`, `/stats`) работают.

Разморозка: удалить переменную или `TGND_OUTREACH_PAUSED=false`.

### 5.4.1) Deploy crashed / healthcheck failed (июнь 2026)

**Симптом в Railway:** Deploy crashed, контейнер перезапускается.

**Причина (2026-06-02):** в `tgnd_outreach_orchestrator.py` был импорт `run_campaign_insights`, а модуль `tgnd/campaign_insights.py` ещё не в `main` → `ImportError` при старте воркера.

**Исправление в коде:** коммит `000a411` (убран `campaign-insights` из оркестратора до выкладки модуля). **Актуальный деплой:** `253bbf3e` или новее, статус **SUCCESS**, `/health` → 200.

**Проверка после деплоя:**

```bash
railway logs --service tgnd-outreach-automation --tail 40
curl -sS https://tgnd-outreach-automation-production.up.railway.app/health
```

Ожидаемо: `[startup-check] OK`, нет `ImportError`, при паузе — `paused=True`.

**GitHub Actions «run failed»:** workflow **Main Branch Guard** — прямой push в `main` без PR. На Railway **не влияет**. Правки TGND в `main` — через PR.

## 6) Stop conditions

Остановить отправку и проверить настройки, если:
- выросла доля bounce;
- появились ошибки SMTP auth/rate limit;
- видны жалобы на нерелевантные обращения.

## 7) A/B тест: как выбрать winner

Смотри:
- `reply_rate` (главная метрика),
- долю позитивных ответов/перенаправлений,
- bounce/spam сигналы.

Победивший вариант темы/CTA применяй на основную волну.

## 8) Автоматический контроль ответов

`sync-replies`:
- сверяет входящие письма в `INBOX` с нашими `Message-ID`;
- проставляет `replied` и время ответа в таблице;
- (опционально) отправляет уведомление в Telegram.

Проверка/тест:
```bash
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json sync-replies
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json notify-test
python3 tgnd_telegram_get_chat_id.py
```

## 9) Рабочий график отправки и отчеты

- Отправка `initial` и `follow-up` идет только в **будни** в основное окно **10:00-16:00 МСК**.
- После 16:00 и до `TGND_CATCHUP_WINDOW_END` (дефолт **20:00**) — **catchup-режим**: бот досылает оставшийся дневной план, если окно было пропущено или квота не выбрана.
- После `TGND_CATCHUP_WINDOW_END` (20:00) — жёсткий стоп, никаких отправок до следующего утра.
- В выходные — только `sync-replies`.
- Утренний автоотчет в Telegram — в **11:00 МСК по будням**.

Ключевые env:
- `TGND_SEND_WINDOW_START=10:00`
- `TGND_SEND_WINDOW_END=16:00`
- `TGND_CATCHUP_WINDOW_END=20:00`       ← жёсткий стоп для catchup
- `TGND_ALLOW_CATCHUP_AFTER_WINDOW=true` ← досылать после окна до catchup_end
- `TGND_REPORT_HOUR_MSK=11`
- `TGND_WORKER_TICK_SEC=30`

## 10) Telegram-группа, меню и статусы

1. Добавь бота в групповой чат команды.
2. Выдай боту право отправлять сообщения.
3. В конфиге выставь `notification.telegram_chat_id` = chat_id группы.
4. Команды в чате:
   - `/start` — приветствие и меню;
   - `/status_today` или `Статус сегодня` — отчет за сегодня;
   - `/stats` или `Общая статистика` — агрегированная статистика по воронке.

**Диагностика токена и чата:** если `notify-test` падает или в логах нет доставки — полная проверка (вызов `getMe` + одно тестовое сообщение в настроенный `telegram_chat_id`):

```bash
cd 60_System/automation
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.json verify-telegram
```

Типичные ответы Telegram API (текст подсказки дублируется в лог при ошибке `sendMessage`):

- **401 / Unauthorized** — неверный или отозванный `TGND_TELEGRAM_BOT_TOKEN`; выпустить новый в @BotFather и обновить Railway Variables / `.env`.
- **chat not found / wrong chat_id** — проверить `notification.telegram_chat_id`; супергруппа: бот должен быть в группе и иметь право писать.

## 11) Follow-up политика (тайминг + тон)

- Follow-up #1: через `+3 дня` после первого письма.
- Follow-up #2: через `+6 дней` (еще `+3` после follow-up #1).
- Тон: коротко, делово, с явным CTA и вежливым выходом.
- Цель #1: вернуть диалог и предложить короткий 20-минутный созвон.
- Цель #2: зафиксировать статус (интерес/позже/не приоритет), чтобы не перегружать адресата касаниями.

## 12) Security hardening (обязательно после настройки)

1. **Ротация секретов после утечки в чат/скрин:**
   - Telegram Bot Token (`@BotFather` -> revoke/create);
   - Yandex SMTP/IMAP app password;
   - Service Account key (`Google Cloud IAM -> Service Account -> Keys`), старый ключ удалить.
2. **Обновление в Railway Variables:**
   - `TGND_TELEGRAM_BOT_TOKEN`
   - `YANDEX_SMTP_PASSWORD`
   - `YANDEX_IMAP_PASSWORD`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (новый JSON с новым key_id)
3. **Проверка после ротации:**
```bash
railway logs --service "tgnd-outreach-automation" --tail 200
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json notify-test --text "rotate-check"
python3 tgnd_outreach_orchestrator.py --config tgnd_outreach_config.example.json stats
```
4. **Политика хранения:**
   - секреты только в Railway Variables / локальном `.env` (который в `.gitignore`);
   - не вставлять токены/приватные ключи в чаты и заметки;
   - не использовать `railway variable list -k` в публичных логах/скриншотах.

## 13) Anti-noise и безопасность отправки (апрель 2026)

- Аварийные incident-алерты в Telegram:
  - `TGND_INCIDENT_NOTIFY_ENABLED=false` (по умолчанию выключены),
  - `TGND_INCIDENT_NOTIFY_MIN_INTERVAL_SEC=3600` (если включать, не чаще 1/час).
- Уведомления о несвязанных bounce:
  - `TGND_NOTIFY_UNMATCHED_BOUNCES=false` (по умолчанию выключены),
  - `TGND_BOUNCE_NOTIFY_COOLDOWN_SEC=21600` (если включать, не чаще 1/6ч).
- Уведомления о неуспешных send-батчах:
  - `TGND_SEND_FAIL_NOTIFY_COOLDOWN_SEC=21600` (не чаще 1/6ч).
- Безопасный профиль дневной отправки (anti-spam):
  - `TGND_DAILY_WARMUP_STEPS=12,16,20,24,28`,
  - `TGND_DAILY_SAFE_MAX=28`,
  - опционально фиксированный лимит `TGND_DAILY_SEND_TARGET=<N>`.
- Gate отправки по доступности провайдера:
  - `TGND_PROVIDER_GATE_ENABLED=true` (по умолчанию),
  - при падении health-check отправка скипается до восстановления провайдера.
- Анти-повторы по «битым» адресам:
  - `TGND_SMTP_MAX_RETRIES=2`,
  - `TGND_MAX_ATTEMPTS_PER_CONTACT=2` (после лимита -> статус ошибки без бесконечных повторов).
- Спец-правило для `mail@mkrf.ru`:
  - авторассылка отключена по умолчанию (`TGND_ALLOW_MKRF_AUTOSEND=false`),
  - адрес обрабатывается вручную с официальным сопроводительным письмом.
- Формат утреннего отчета:
  - `TGND_DAILY_REPORT_MODE=short` (короткое одно сообщение),
  - `TGND_DAILY_REPORT_MODE=full` (развернутый вариант).

## 14) Telegram «старт / финиш» дня (привязка к daily-cycle, апрель 2026)

По умолчанию **`TGND_CYCLE_BOUND_TELEGRAM=true`** (Railway Variables):

- **Старт:** перед первой реальной отправкой в календарный день (МСК), если есть очередь и ещё есть дневной «безопасный» лимит — сообщение «доброе утро, рассылка стартовала» (`tgnd/telegram_reporter.py` + `tgnd/cycle_notify.py`). Один раз на дату, ключ в `_system`: `tgnd_cycle_start_date`.
- **Финиш:** после цикла, когда на сегодня работы больше нет: либо очередь пуста, либо дневной лимит исчерпан при непустой очереди — итог с цифрами и пояснением. Один раз на дату: `tgnd_cycle_end_date`.

При **`TGND_CYCLE_BOUND_TELEGRAM=true`** воркер **отключает** слот 9:00 `human-report morning` и слот `daily-report` в `TGND_REPORT_HOUR_MSK`, чтобы не дублировать эти тексты. Вернуть старое поведение: `TGND_CYCLE_BOUND_TELEGRAM=false` и при необходимости снова `TGND_MORNING_REPORT_ENABLED=true`.

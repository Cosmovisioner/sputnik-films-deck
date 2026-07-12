# Outreach Campaign Launch Checklist (Template)

Файл: `note_outreach_campaign_launch_checklist_template.md`
Путь сохранения: `SecondBrain/60_System/automation/`
Тип документа: `System`

## Назначение

Шаблон запуска новой холодной outreach-кампании на основе рабочего TGND-контура.
Использовать для Sputnik Films и любых других баз.

---

## 0) Campaign Brief (заполнить до старта)

- `campaign_id`:
- `campaign_name`:
- `owner`:
- `segment`:
- `channel_scope` (`email` | `email+telegram` | `email+linkedin`):
- `primary_goal` (reply rate / meetings / SQL):
- `start_date`:
- `risk_notes`:

---

## 1) Data Readiness (обязательно)

- [ ] Источник базы определен (Sheet/CRM export).
- [ ] В базе есть уникальный `contact_id` (или stable hash).
- [ ] В базе есть обязательные поля:
  - [ ] `campaign_id`
  - [ ] `channel`
  - [ ] `endpoint` (email/username/profile_url)
  - [ ] `region` или `segment`
  - [ ] `status`, `touch_stage`, `error_code`
- [ ] Убраны явные дубли (`email`/`endpoint`).
- [ ] База очищена от невалидных адресов/контактов.
- [ ] Подготовлен suppression-list (opt-out, hard bounce, do-not-contact).

---

## 2) Offer + Message Fit

- [ ] Оффер описан для сегмента (не универсальный для всех).
- [ ] Подготовлены 2 варианта темы (A/B).
- [ ] Подготовлены 2 варианта CTA (A/B).
- [ ] Initial + FU1 + FU2 адаптированы под сегмент.
- [ ] Для федеральных/чувствительных адресатов есть manual-only правило.
- [ ] Тексты проверены на этичность и отсутствие "спам-триггеров".

---

## 3) Infra + Auth + Config

- [ ] Заполнен `outreach_config_<campaign>.json` (копия шаблона).
- [ ] Настроены env-переменные (SMTP, IMAP, SA JSON, Telegram token/chat).
- [ ] Проверен путь вложений (если attachments обязательны).
- [ ] Включен strict режим вложений (prod).
- [ ] Таблица расшарена на service account (Editor).
- [ ] Канал Telegram (если включен) привязан к нужному чату.

---

## 4) Safety Policy

- [ ] Заданы окно отправки (`start/end`) и weekday policy.
- [ ] Заданы daily safe limits и warmup profile.
- [ ] Заданы retry limits (`smtp`, `sheets`, per-contact attempts).
- [ ] Заданы stop conditions (bounce spike, auth errors, complaint signal).
- [ ] Описан manual override (кто и как стопает кампанию).

---

## 5) Preflight + Dry Run + Pilot

- [ ] `preflight` = OK.
- [ ] `provider-health` = OK.
- [ ] `ensure-schema` = OK.
- [ ] `dry-run` отработал без критических ошибок.
- [ ] Pilot batch 10-15 контактов отправлен.
- [ ] Проверены:
  - [ ] статусы в таблице,
  - [ ] наличие писем в Sent,
  - [ ] корректность вложений,
  - [ ] reply sync.

---

## 6) Production Launch (Always-on)

- [ ] Деплой в Railway успешен (status SUCCESS).
- [ ] Воркер в логах стартовал без исключений.
- [ ] Первый `daily-cycle` завершился с `exit_code=0`.
- [ ] Утренний report приходит в Telegram (если включен).
- [ ] Точка контроля 11:30 и 18:00 подтверждена.

---

## 7) KPI Control (первые 7 дней)

- [ ] Отслеживается `reply_rate` по сегментам.
- [ ] Отслеживается `meeting_rate` (если цель - созвоны).
- [ ] Отслеживается `bounce_rate`.
- [ ] Отслеживается backlog `status=error`.
- [ ] Каждые 2-3 дня корректируются темы/CTA по данным.

---

## 8) CRM Integration Decision (не перегружать систему)

Правило: интегрировать холодную базу в CRM **да**, но по двухконтурной модели.

### Контур A - Outreach Engine (операционный, массовый)

- Сырые холодные контакты, статусы касаний, тех.ошибки, ретраи.
- Живет в Sheet/automation-слое и не засоряет sales pipeline.

### Контур B - CRM Sales Pipeline (коммерческий, управленческий)

- Только лиды после qualification:
  - ответили,
  - релевантны ICP,
  - есть next step по сделке.

### Гейт переноса из A -> B (обязательно)

- [ ] Есть ответ (или warm intro).
- [ ] Есть квалификация A/B по скорингу.
- [ ] Есть владелец сделки и следующий шаг.
- [ ] Контакт не в suppression-list.

Итог: система не перегружается, CRM остается чистой, аутрич масштабируется.

---

## 9) Что нужно дополнительно для масштабирования на Sputnik

- [ ] Единый `campaign_registry` (campaign_id, owner, channel, limits).
- [ ] Шаблон `outreach_config_sputnik_films_email_v1.json`.
- [ ] Unified suppression-list для всех кампаний.
- [ ] Карта сегментов Sputnik (агентства / бренды / B2G / партнерства).
- [ ] Отдельные message packs по сегментам.

---

## 10) Postmortem (после 14 дней)

- [ ] Что сработало по сегментам и темам.
- [ ] Где bottleneck (reply, meeting, qualification, close).
- [ ] Что масштабируем в следующую кампанию.
- [ ] Что убираем как шум/перегруз.

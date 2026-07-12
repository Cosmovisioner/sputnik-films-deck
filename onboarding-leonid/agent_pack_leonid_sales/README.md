# Agent Pack · Леонид · продажи Cult Group

Архив скиллов, ролей и знаний для работы с агентами (Cursor или Codex).
Собран для онбординга · июль 2026 · без паролей и без `.env`.

---

## 1. Что сделать за 10 минут

1. Скачай этот zip с квеста онбординга.
2. Распакуй папку `agent_pack_leonid_sales` куда удобно.
3. Установи **Cursor** (предпочтительно) или **Codex** — подписку оплачивает компания, инвайт у Димы.
4. Скопируй содержимое по инструкции ниже.
5. В чате агента напиши: «прочитай roles/role_sales_newbiz.md и skills/cult-group-lead-scoring — оцени тестовый бриф».

Если застрянешь на установке / workspace / нейросетях — **отдельный созвон с Димой**. Это нормально, не ломай сам.

---

## 2. Установка в Cursor

### Вариант A — skills проекта (удобно)

В папке рабочего проекта (или отдельного `cult-sales-workspace`):

```text
.cursor/skills/<имя-скилла>/SKILL.md
.cursor/skills/<имя-скилла>/...
```

Скопируй **все папки** из `skills/` этого архива в `.cursor/skills/`.

Роли клади в:

```text
.cursor/roles/   или   docs/roles/
```

(Cursor подхватывает skills по frontmatter `name` / `description`. Роли — подключай явно: «работай как role_sales_newbiz».)

### Вариант B — глобальные skills пользователя

```text
~/.cursor/skills/<имя-скилла>/
```

То же копирование из `skills/`.

### Проверка

В Agent-чате: «какие скиллы продаж у тебя есть?» или триггер «скоринг лида» / «brief gate» / «досье на компанию».

---

## 3. Установка в Codex / ChatGPT Codex

1. Создай workspace-папку (например `cult-sales-agents`).
2. Положи туда `skills/`, `roles/`, `knowledge/`.
3. В корне workspace сделай короткий `AGENTS.md` (шаблон ниже) — чтобы агент знал, что читать первым.
4. В чате: «следуй AGENTS.md, роль sales_newbiz».

### Шаблон AGENTS.md

```markdown
# Cult Group · sales workspace (Leonid)

Сначала читай:
1. roles/role_sales_newbiz.md
2. roles/role_commercial_director_cult_group_for_leonid.md
3. skills/cult-group-brief-gate/SKILL.md
4. skills/cult-group-lead-scoring/SKILL.md
5. knowledge/cult_group/note_cult_group_sales_rules_summary_leonid_2026_07.md

Правила:
- Не выдумывать контакты и цифры CRM
- Скоринг с цепочкой рассуждений, порог ≥ 5
- Не перехватывать тёплые контакты хэдов юнитов
- Новые сделки группы → Amo Cult
- Помощь по установке агентов — созвон с CRO (Дима)
```

Скопируй этот блок в файл `AGENTS.md` в корне workspace.

---

## 4. Карта пакета

| Папка | Зачем |
|-------|--------|
| `skills/` | Рабочие скиллы агента (скоринг, бриф, деки, досье, транскрипты, счёт…) |
| `roles/` | Режимы мышления (sales, маркетинг, CRO-угол, аккаунт, meeting analyst…) |
| `knowledge/lectures/` | Лекции SETTERS / Шадрина / CRM-переговоры |
| `knowledge/artifacts/` | Банк возражений, B2B conversion, outreach policy |
| `knowledge/cult_group/` | Контекст Cult, ТЗ парсера/рассылки, пулы клиентов |
| `knowledge/design_tokens/` | Токены Cult Group + Sputnik Films |
| `knowledge/automation_notes/` | Шаблоны и runbook аутрича (без секретов) |

Подробный список — `MANIFEST.md`.

---

## 5. Чего в архиве нет (намеренно)

- **Готовых шаблонных презентаций юнитов** — запроси у Дениса / Лизы / Сергея / Димы отдельно (ссылки уже в квесте «Презентации»).
- Паролей Amo, `.env`, service accounts, приватных ключей.
- Полного кода рассылочных ботов с токенами — только методички и ТЗ.
- Личных финансов и нерелевантных life-skills.

Счёт/акт (`vtb-invoice-bot`) — скилл Sputnik/ВТБ. Для Cult нужен доступ к шаблону и реквизитам от Димы/Али; без этого скилл — как образец процесса.

---

## 6. С чего начать на первой неделе

1. `cult-group-brief-gate` + `cult-group-lead-scoring` + `cult-group-deck-router`
2. `role_sales_newbiz` + `role_commercial_director_cult_group_for_leonid`
3. `knowledge/cult_group/client_pools.json` + sales_context в квесте
4. Своя тёплая база → преза Cult Group
5. Потом: `crm-company-dossier`, `call-prep`, транскрипты встреч

Удачи. Пиши Диме, если агент «не видит» скиллы — обычно путь копирования.

---
name: meeting-transcript-pipeline
description: Ingest meeting transcripts from MacWhisper into Second Brain — auto-sync from SQLite, folder watcher fallback, and handoff to meeting summaries. Use when the user asks to auto-import transcripts, Whisper pipeline, post-call automation, or "забери транскрипт после звонка".
---

# Meeting transcript pipeline (MacWhisper → Second Brain)

## Как это работает

MacWhisper хранит все транскрипции в SQLite-базе (`~/Library/Application Support/MacWhisper/Database/main.sqlite`). Скрипт `macwhisper_sb_sync.py` читает её в режиме read-only, находит новые завершённые расшифровки и экспортирует текст в `00_Inbox/transcripts_incoming/`.

### Автоматический pipeline (основной, полный автопилот)

| Шаг | Кто | Действие |
|-----|-----|----------|
| 1 | MacWhisper | Записывает звонок или диктовку, транскрибирует, сохраняет в SQLite. |
| 2 | `macwhisper_sb_sync.py` (LaunchAgent, каждые 60 сек) | Читает базу, **классифицирует** (meeting vs voice_memo), экспортирует транскрипт в `00_Inbox/transcripts_incoming/`. |
| 3 | `macwhisper_sb_sync.py` (тот же запуск) | **Автоматически** вызывает OpenRouter и генерирует: для meetings — `note_meeting_*_summary.md` (контекст, тезисы, решения, задачи), для voice_memo — `note_voice_memo_*.md` в `00_Inbox/` (суть, мысли, задачи). |
| 4 | macOS | Уведомление: «Встреча X — саммари готово» или «Диктовка Y — обработана». |

**Cursor не нужен для базовой обработки.** Саммари появляется в SB автоматически. Cursor/Jarvis полезен для дальнейшего: раскладки задач по журналу, привязки к проектам, создания Drive-отчёта по `meeting-report-prod`.

### Ручной / fallback pipeline

Если файл пришёл не из MacWhisper (Zoom export, ручной drop):

| Шаг | Кто | Действие |
|-----|-----|----------|
| 1 | `transcript_inbox_watcher.py` | Следит за `--source`, копирует `.txt/.md/.vtt` в `00_Inbox/transcripts_incoming/`. |
| 2 | Ты или хоткей | Открываешь Cursor и пишешь одну фразу. |
| 3 | Джарвис | Саммари по `meeting-report-prod`. |

## Скрипты

### `macwhisper_sb_sync.py` (основной)

```bash
# Один проход — экспортировать всё новое
python3 60_System/automation/macwhisper_sb_sync.py --once

# Фоновый режим (каждые 30 сек)
python3 60_System/automation/macwhisper_sb_sync.py

# Первый запуск: экспорт ВСЕХ сессий с нуля
python3 60_System/automation/macwhisper_sb_sync.py --once --backfill
```

Опции:
- `--db` — путь к SQLite MacWhisper (по умолчанию стандартный)
- `--dest` — куда экспортировать (по умолчанию `00_Inbox/transcripts_incoming`)
- `--interval` — интервал опроса в секундах (watch mode, по умолчанию 30)
- `--no-notify` — без macOS-уведомлений
- `--no-summary` — отключить авто-саммари (только экспорт текста)
- `--backfill` — сбросить историю экспорта и вытащить все сессии заново
- `--once` — один проход и выход

Классификация:
- `recordedMeetingID IS NOT NULL` → **meeting** → саммари с тезисами, решениями, задачами
- Остальное → **voice_memo** → извлечение сути, мыслей, задач

Фильтр: пропускает сессии короче 500 символов (короткие голосовые).
Идемпотентность: JSON-файл `.macwhisper_exported_ids` хранит UUID экспортированных и обработанных сессий.

Env: `OPENROUTER_API_KEY` (из `.env`), `MACWHISPER_SUMMARY_MODEL` (по умолчанию `openai/gpt-4o-mini`).

### `transcript_inbox_watcher.py` (fallback)

```bash
python3 60_System/automation/transcript_inbox_watcher.py \
  --source "$HOME/Documents/ПУТЬ_К_ЭКСПОРТУ" \
  --dest "00_Inbox/transcripts_incoming"
```

## LaunchAgent (фоновый сервис)

Скрипт запускается каждые 60 секунд через macOS LaunchAgent.

Установка:

```bash
# Подставить реальный путь к Python 3 и SecondBrain:
REPO="$HOME/Documents/Coosmovisioner AI/GitHub/SecondBrain"
PYTHON=$(which python3)

sed -e "s|ABSOLUTE_PATH_TO/SecondBrain|$REPO|g" \
    -e "s|PYTHON3_PATH|$PYTHON|g" \
    "$REPO/60_System/automation/com.secondbrain.macwhisper_sync.plist.example" \
    > ~/Library/LaunchAgents/com.secondbrain.macwhisper_sync.plist

mkdir -p "$REPO/60_System/automation/logs"
launchctl load ~/Library/LaunchAgents/com.secondbrain.macwhisper_sync.plist
```

Удаление:

```bash
launchctl unload ~/Library/LaunchAgents/com.secondbrain.macwhisper_sync.plist
rm ~/Library/LaunchAgents/com.secondbrain.macwhisper_sync.plist
```

Логи: `60_System/automation/logs/macwhisper_sync.log` и `macwhisper_sync_err.log`.

## После появления файла в `transcripts_incoming/`

1. Подключи **[meeting-report-prod](../meeting-report-prod/SKILL.md)** (или скажи «саммари встречи»).
2. Ассистент обязан: дата, участники, тезисы, решения, **action items** → проектная папка или `00_Inbox/note_tasks_inbox.md` по правилам SB.
3. Сырой транскрипт после обработки можно перенести в архив или удалить из Inbox.

## Проактивная проверка Inbox (для агента)

При запросах про встречи, созвоны, транскрипты или при калибровке — Джарвис проверяет `00_Inbox/transcripts_incoming/` на необработанные файлы (есть `.txt` без парного `note_meeting_*_summary.md`). Если есть — предлагает обработать.

## Ограничения

- MacWhisper должен быть установлен и транскрибация завершена (скрипт берёт только `transcriptionDidSucceed = 1`).
- При конфликте Whisper + Zoom на одной машине — по возможности один источник записи.
- **Приватность:** транскрипты могут содержать NDA; `transcripts_incoming/*.txt` добавлен в `.gitignore`.

## Связанные скиллы

- **[meeting-report-prod](../meeting-report-prod/SKILL.md)** — саммари, Drive-репорты для продакшена.
- **[sales-newbiz](../sales-newbiz/SKILL.md)** — если созвон про лиды/аутрич.

---
name: sputnik-films-deck
description: >-
  Сборка HTML→PDF презентаций Sputnik Films по каноническому дизайну (Polonium +
  JetBrains Mono, 1920×1080, case/brief/team). Use when building portfolio decks,
  tender top-5, КП slides, «презентация Sputnik», «собери дек как VK топ-5»,
  HTML deck Sputnik Films, or matching vk_top5_presentation style.
---

# Sputnik Films Deck Builder

Собирает **точь-в-точь** такие же деки, как [vk_top5_presentation_2026.html](../../../20_Business_Projects/sputnik_films/meetings/vk_top5_presentation_2026.html).

## Роли (подключать по шагам)

| Шаг | Роль | Файл |
|-----|------|------|
| Токены, сетка, иерархия | Design lead | [60_System/roles/role_graphic_designer.md](../../../60_System/roles/role_graphic_designer.md) |
| Спека слайдов | Art direction | токены ниже |
| HTML/CSS/PDF | Vibecoder | [60_System/roles/role_vibecoder_second_brain.md](../../../60_System/roles/role_vibecoder_second_brain.md) |

## Источники истины (читать перед сборкой)

1. **[design_tokens_sputnik_films_deck.md](../../../60_System/design/design_tokens_sputnik_films_deck.md)** — все размеры, цвета, сетка.
2. **[templates/deck_base.css](templates/deck_base.css)** — полный CSS (синхрон с каноном).
3. **[templates/slide_snippets.md](templates/slide_snippets.md)** — HTML-скелеты слайдов.
4. **Шрифты:** `20_Business_Projects/sputnik_films/meetings/_assets/fonts/Polonium*.otf` — копировать в `_assets/fonts/` нового дека.

**Не использовать Inter.** Не растеризовать case/brief/contacts целиком.

---

## Workflow

### 1. Подготовка папки

```
{output_dir}/
  presentation.html
  _assets/
    fonts/Polonium.otf, Polonium-Bold.otf
    laurels_row.png, contacts_telegram.png
    {slug}_hero.jpg, {slug}_t1.jpg, {slug}_t2.jpg
```

Скопировать общие ассеты из `meetings/_assets/` или канонического дека.

### 2. HTML-каркас

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Sputnik Films — {название}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>/* вставить deck_base.css + @font-face Polonium */</style>
</head>
<body><div class="deck">…</div></body>
</html>
```

`@font-face` для Polonium — из канона (пути `_assets/fonts/`).

### 3. Слайды (порядок)

| # | Класс | Chrome BR |
|---|--------|-----------|
| 1 | `slide-cover` | `portfolio 01` |
| N× | `slide-case` (+ `--pink` при необходимости) | `case` |
| N× | `slide-brief` | `brief` |
| N× | `slide-team` | `team` |
| end | `slide-contacts` | `contacts` |

На **каждом** case/brief/team: `<div class="glow-tl"></div><div class="glow-br"></div>`.

### 4. Case — обязательные правила

- Media: `left:134px; top:186px; width:1006px`
- Hero 1006×395, thumbs 487×281, gap 32px
- Copy: `left:1206px; right:134px; bottom:186px; max-width:610px` — **не** `top`
- 3 кнопки → `btn-row btn-row--three`
- 2 кнопки → `btn-row` (gap 20px)
- Док-проекты → `slide-case--pink` + при необходимости `.platform-logos`

### 5. Brief / team

- Контент **по центру слайда** (flex на `.slide-brief` / `.slide-team`)
- Красная полоска `border-left: 4px solid var(--red)`
- Brief: h2 **44px**, body **22px**, 2 колонки, `.brief-rule` после meta

### 6. Картинки

**Приоритет:** экспорт PDF из Figma (1 слайд = 1 PDF) → PyMuPDF render 2× → кроп по `get_image_rects`.

```bash
python3 .cursor/skills/sputnik-films-deck/scripts/crop_images_from_pdf.py \
  --pdf "/path/to/Frame.pdf" --out "_assets" --prefix brusnika
```

Если rects смещены — кроп с `*_case_full.png` по сетке из токенов §4.

**Не** брать `extract_image` если в PDF вшиты скриншоты плеера (VK/Wink UI).

### 7. PDF

**Канон (единственный способ):**

```bash
bash 60_System/automation/export_sf_deck_pdf.sh presentation.html output.pdf
```

Или напрямую:

```bash
python3 .cursor/skills/sputnik-films-deck/scripts/export_pdf.py \
  presentation.html output.pdf
```

Локальные `scripts/export_pdf.py` в папках деков (Cult и т.д.) — **redirect** на канон, не дублируют логику.

| Флаг | Когда |
|------|-------|
| `--vector-only` | Отладка ссылок; не для раздачи (Preview тормозит) |
| `--scale 1.5 --jpeg-quality 92` | Баланс качество/вес (~5–8 MB на 40 слайдов) |
| `--viewer` | Принудительно для деков с `#viewer` / `#stage` (лекции, навигатор) |

**НЕ делать:** Ghostscript recompress (белые страницы в Preview), `wait_until=networkidle`.

Деки с `#viewer/#stage` (например лекции) — auto-detect; CSS раскрывает все слайды перед экспортом.

### 8. Публичный URL (GitHub Pages)

**Не** включать GitHub Pages на репозитории **Second Brain** (`Cosmovisioner/second_brain`): он **private** — на текущем плане GitHub **не даёт** публичный Pages для private repo.

**Канон:** публичные HTML-деки выкладывать в отдельный **public**-репо, где Pages уже включены:

| Что | Значение |
|-----|----------|
| Репозиторий | `https://github.com/Cosmovisioner/sputnik-films-deck` |
| База сайта | `https://cosmovisioner.github.io/sputnik-films-deck/` |
| Ветка | `main`, корень `/` (legacy Pages) |

**Порядок деплоя нового дека:**

1. Собрать папку с **`index.html`** в корне слайда и **реальными** файлами в `_assets/` (шрифты **копировать**, не symlink — иначе на другой машине/CI сломается).
2. `gh repo clone Cosmovisioner/sputnik-films-deck` (или уже есть локальный клон).
3. Скопировать папку, например `lic-beauty-survey/`, в корень репо → `git add` → `commit` → `git push origin main`.
4. Подождать 30–120 с, пока Actions/Pages пересоберёт; проверить `curl -I https://cosmovisioner.github.io/sputnik-films-deck/<папка>/`.

**Горячий путь в SB:** `60_System/context/context_hot_paths.md` (раздел про HTML-деки).

Локальные черновики и генераторы по-прежнему живут в Second Brain (`00_Inbox/…`, `meetings/…`); в `sputnik-films-deck` — только то, что нужно открыть по ссылке.

### 9. Verify

- [ ] Chrome 45px inset, Mono 20px
- [ ] Заголовки Polonium, body Mono
- [ ] Низ кнопок case = низ thumbs (одна горизонталь)
- [ ] Brief по вертикали по центру, не прилипший к верху
- [ ] Нет Inter, нет белых полос на thumbs
- [ ] Contacts: «ДАВАЙТЕ СНИМАТЬ!», +79136898769

---

## Типографика copy (шпаргалка)

```html
<!-- двухстрочный заголовок case -->
<h2 class="title-line1">Бонд с кнопкой × Брусника —</h2>
<h2 class="title-line2">кухни live-клип</h2>

<!-- slash красный -->
<h2>VK ID <span class="slash">/</span> Promo</h2>
```

---

## Связанные скиллы

- **Figma API deck:** [google-slides-builder](../google-slides-builder/SKILL.md) — другой канал (Slides API), не смешивать стили.
- **Figma handoff:** [note_figma_vk_top5_handoff_2026_05_26.md](../../../20_Business_Projects/sputnik_films/meetings/note_figma_vk_top5_handoff_2026_05_26.md)

---

## Обновление канона

После правок эталонного дека:

1. Обновить `vk_top5_presentation_2026.html` (или новый эталон).
2. Перегенерировать `templates/deck_base.css` из `<style>` блока.
3. Синхронизировать `design_tokens_sputnik_films_deck.md`.

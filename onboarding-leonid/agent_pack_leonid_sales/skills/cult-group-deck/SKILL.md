---
name: cult-group-deck
description: >-
  Сборка HTML→PDF презентаций Cult Group (Unbounded + JetBrains Mono, 1920×1080,
  розовый accent #F974BE, кейсы Cult/Blaster/Sputnik). Design tokens, сетка media/copy,
  PDF flatten+links, ассеты из PDF. Use when building Cult Group portfolio, «презентация
  Cult Group», cult group deck, presentation_prices, HTML deck для cult.team / Blaster /
  Sputnik umbrella, или продолжение cult_group_deck_2026.
---

# Cult Group Deck Builder

Единый скилл для **design lead + art director + vibecoder**: собирать такие же деки, как канон [presentation.html](../../../20_Business_Projects/sputnik_films/operations/cult_group/cult_group_deck_2026/presentation.html).

**Сиблинг, не замена:** [sputnik-films-deck](../sputnik-films-deck/SKILL.md) — Polonium + красный, другой бренд.

---

## Роли (подключать по шагу)

| Шаг | Роль | Фокус |
|-----|------|--------|
| Токены, типографика, glow, grain | Design lead | [role_graphic_designer.md](../../../60_System/roles/role_graphic_designer.md) |
| Секции, студии, тон, иерархия кейсов | Brand / art direction | [role_brand_director.md](../../../60_System/roles/role_brand_director.md) |
| HTML/CSS, PDF, asset scripts | Vibecoder | [role_vibecoder_second_brain.md](../../../60_System/roles/role_vibecoder_second_brain.md) |

---

## Источники истины (читать перед сборкой)

1. **[design_tokens.md](design_tokens.md)** — цвета, сетка 1006×708, шрифты, chrome.
2. **[slide_snippets.md](slide_snippets.md)** — HTML-скелеты всех типов слайдов.
3. **[pitfalls_pdf_assets.md](pitfalls_pdf_assets.md)** — ошибки PDF, ассетов, вёрстки (обязательно перед экспортом).
4. **Канон HTML:** `20_Business_Projects/sputnik_films/operations/cult_group/cult_group_deck_2026/presentation.html`
5. **Вариант с бюджетами:** `presentation_prices.html` (класс `.case-price`).

**Запрещено:** Inter, Google Fonts CDN, `feTurbulence` grain, Ghostscript на PDF, `insert_link()` PyMuPDF для финала.

---

## Workflow

### 0. Решить вариант

| Вариант | Файл | Когда |
|---------|------|-------|
| Стандарт | `presentation.html` | Портфолио без цен |
| Бюджеты | `presentation_prices.html` | Вилка под h2 каждого кейса |

Не править канон ради экспериментов — копировать папку или файл.

### 1. Папка дека

```
{deck_dir}/
  presentation.html          # или presentation_prices.html
  _assets/
    fonts/Unbounded-Variable.ttf, JetBrainsMono-Variable.ttf
    grain_tile.png
    cult_group_logo.png, cult_logo.png, blaster_logo.png, sputnik_logo_ink.png
    {slug}_hero.jpg, {slug}_t1.jpg, {slug}_t2.jpg
  scripts/export_pdf.py      # redirect → sputnik-films-deck (канон)
```

Шрифты копировать из канона `_assets/fonts/`. Тяжёлые отладочные файлы → `_assets/_archive_heavy/`.

### 2. CSS

Скопировать блок `<style>` из канона или собрать из [design_tokens.md](design_tokens.md).

Обязательные блоки: `:root`, `.slide`, grain `::before`, chrome, glow, slide-cover/about/case/divider/contacts, media grid, copy bottom-anchored, btn, media--vertical/grid, copy detailed/sputnik, `@page` + print-color-adjust.

### 3. Слайды (порядок канона)

| # | Тип | Класс |
|---|-----|-------|
| 1 | Cover | `slide-cover` |
| 2 | About | `slide-about` |
| 3+ | Divider | `slide-divider` |
| N | Case | `slide-case` |
| end | Contacts | `slide-contacts` |

На **каждом** слайде: 4× chrome + glow (cover: + `glow-center`).

### 4. Case — обязательные правила

- Media: `left:134px; top:186px; width:1006px; height:708px`
- Hero `1006×395`, thumbs `487×281`, gap `32`, thumbs absolute (`display:contents`)
- Copy: `left:1206px; right:134px; bottom:186px` — **не** `top`
- Все превью и кнопки — `<a href>` (кликабельный PDF)
- Лого студии: Cult (`case-logo--cult`), Blaster, Sputnik ink
- Cult/Blaster длинные кейсы: `h2--detailed` + Background/Execution
- Sputnik: `copy--sputnik` + короткий `.body`
- 3 ссылки → `btn-row--three`; 2 → `btn-row`

### 5. Media variants

| Кейс | Класс |
|------|-------|
| Стандарт | `.media` |
| VTB HR, MTS, Kiss | `.media--vertical` |
| Рокетбанк | `.media--grid` |

### 6. Ассеты

**Приоритет:** rect-кроп из исходного PDF (PyMuPDF 3× render → PIL crop → LANCZOS → точный размер).

```bash
# Танцы + Брусника — канон в deck scripts:
python3 scripts/fix_sputnik_tancy_brusnika.py
```

Размеры финала: hero **1006×395**, thumb **487×281**.

**Спецкейсы:** см. [pitfalls_pdf_assets.md](pitfalls_pdf_assets.md) — Demix hero, Deti thumb/breakdown, Rocket grid.

Общая пересборка: `scripts/rebuild_deck_assets.py`, `fix_assets_now.py` (в папке канона).

### 7. Вилка бюджета (опционально)

Под `h2` каждого кейса:

```html
<p class="case-price">
  <span class="case-price-label">ориентир бюджета</span>
  <span class="case-price-range">4–5 <em>млн ₽</em></span>
</p>
```

CSS — в `presentation_prices.html`. Десятичные через запятую: `2,5–3,5`.

### 8. PDF export

**Канон (единственный пайплайн):**

```bash
bash 60_System/automation/export_sf_deck_pdf.sh presentation.html ~/Desktop/Cult_Group.pdf
```

Локальный `scripts/export_pdf.py` в папке дека — redirect на канон, не править отдельно.

Пайплайн: Playwright vector → flatten 1 JPEG/page → **copy Chromium /Annots** → deflate.

Флаги: `--vector-only` (отладка), `--scale 2`, `--jpeg-quality 95`, `--no-linearize`.

**Ожидание полного дека:** ~22 стр., **~80 ссылок**, ~22 img embeds, ~6 MB, Preview ~2s.

Подробности и антипаттерны: [pitfalls_pdf_assets.md](pitfalls_pdf_assets.md).

### 9. Verify checklist

- [ ] Локальные `@font-face`, нет CDN
- [ ] Chrome 45px, mono 20px uppercase
- [ ] Unbounded заголовки, JetBrains body/chrome
- [ ] Низ кнопок = низ thumbs
- [ ] Все media — `<a href>`
- [ ] PDF links кликаются в Preview (не только Chrome)
- [ ] Нет белых полос на thumbs
- [ ] Правильное лого студии на кейсе
- [ ] Contacts: cult.team, телефон, telegram

---

## Арт-дирекшн (кратко)

- **Настроение:** светлый editorial tech, розовый glow, лёгкое зерно — не «тёмный cinema» (v2) и не «белая сетка» (v3).
- **Accent slash:** `<span class="slash">/</span>` в заголовках.
- **Секции:** по типу продакшна (реклама → AI → спецпроекты), divider-meta с точкой accent.
- **Три студии:** единая точка входа Cult Group; на кейсе — лого исполнителя, не umbrella.
- **Кнопки:** прямоугольные, mono, без скруглений — в духе JetBrains/Sputnik grid, но светлая палитра.

Черновики `presentation_v2_cinema.html` … `v4_editorial` — референсы, **не** канон.

---

## Типографика (шпаргалка)

```html
<h2 class="h2--detailed">ВкусВилл <span class="slash">/</span> Почувствуй Новый год</h2>
<h2>ВТБ HR <span class="slash">/</span> Image</h2>
<div class="block-label">Background</div>
<p class="block-text">…</p>
```

---

## Связанные скиллы

| Скилл | Связь |
|-------|-------|
| [sputnik-films-deck](../sputnik-films-deck/SKILL.md) | Общая философия сетки media/copy; другой бренд |
| [google-slides-builder](../google-slides-builder/SKILL.md) | Slides API — другой канал, не смешивать стили |
| [design-agent-toolkit](../design-agent-toolkit/SKILL.md) | Референсы UI при редизайне |

---

## Обновление канона

После правок эталонного дека:

1. Обновить `cult_group_deck_2026/presentation.html`.
2. Синхронизировать `design_tokens.md` в скилле.
3. Новые pitfalls → `pitfalls_pdf_assets.md`.
4. Если меняется PDF-пайплайн → только `.cursor/skills/sputnik-films-deck/scripts/export_pdf.py`.

**Эталонная папка:** `20_Business_Projects/sputnik_films/operations/cult_group/cult_group_deck_2026/`

# Sputnik Films — Design Tokens (презентации / deck)

**Назначение:** единый визуальный контракт для HTML→PDF деков Sputnik Films (портфолио, тендеры, КП).
**Канон реализации:** [../../20_Business_Projects/sputnik_films/meetings/vk_top5_presentation_2026.html](../../20_Business_Projects/sputnik_films/meetings/vk_top5_presentation_2026.html)
**Скилл сборки:** [../../.cursor/skills/sputnik-films-deck/SKILL.md](../../.cursor/skills/sputnik-films-deck/SKILL.md)
**CSS-шаблон:** [../../.cursor/skills/sputnik-films-deck/templates/deck_base.css](../../.cursor/skills/sputnik-films-deck/templates/deck_base.css)
**Публичная ссылка на готовый дек:** только через public-репо GitHub Pages — см. скилл §8 и `60_System/context/context_hot_paths.md` (HTML-деки Sputnik). Репозиторий Second Brain для Pages не использовать.

**Запрещено:** Inter, системные sans вместо Polonium, растр целого слайда вместо живой вёрстки (обложка/контакты/кейсы).

---

## 1. Canvas

| Токен | Значение | Назначение |
|-------|----------|------------|
| `--W` | `1920px` | Ширина слайда |
| `--H` | `1080px` | Высота слайда (16:9) |
| `--mx` | `134px` | Горизонтальное поле контента |
| `@page` | `1920×1080`, margin 0 | PDF export |

---

## 2. Color

| Токен | HEX / RGBA | Назначение |
|-------|------------|------------|
| `--bg` | `#f4f4f3` | Базовый фон слайда |
| `--ink` | `#181819` | Текст, обводки, таблица header |
| `--red` | `#e85d4a` | Акцент: `/`, полоса brief, точка на обложке |
| `rgba(232, 93, 74, …)` | градиенты | Glow и radial на фоне (0.22–0.52 opacity) |
| thumb placeholder | `#2a2a2c` | Фон hero/thumb до картинки |
| btn fill | `rgba(255,255,255,0.35)` | Pill-кнопки |
| meta text | `rgba(24,24,25,0.72–0.78)` | Подписи brief/team |

---

## 3. Typography

| Роль | Шрифт | Кегль | Вес | Применение |
|------|-------|-------|-----|------------|
| Display | **Polonium** (OTF Bold 700) | 110 / 88 / 44 / 36 | 700 | Обложка, contacts h1, brief h2, case h2 |
| UI / body | **JetBrains Mono** (Google Fonts 400–700) | 46 / 30 / 26 / 24 / 22 / 20 / 18 / 17 | 400–600 | Chrome, body, meta, таблица, кнопки |
| Chrome | JetBrains Mono | **20px**, uppercase | 500 | Углы: SPUTNIK FILMS, 2026, PRODUCTION, case/brief/team |

**Пары не смешивать:** заголовки кейса — Polonium; всё остальное на слайде — Mono.

### Иерархия по типам слайда

| Элемент | size | line-height |
|---------|------|-------------|
| Cover title | 110px | 1 |
| Contacts h1 | 88px | 1.05 |
| Brief h2 | 44px | 1.1 |
| Case h2 | 36px | 1.12 |
| Case body | 26px (`.size-24` → 24px) | 1.34–1.36 |
| Brief body (2 col) | 22px | 1.52 |
| Button | 30px (26px в `.btn-row--three`) | — |
| Brief meta / team loc | 20px | 1.55 |
| Chrome | 20px | 1 |
| Contacts row | 46px | 1 |
| Crew table | 18px body / 17px head | 1.4 |

---

## 4. Spacing & grid (case — жёсткая сетка Figma/PDF)

| Элемент | X | Y | W | H |
|---------|---|---|---|---|
| Media block | 134 | 186 | 1006 | — |
| Hero | 0* | 0* | 1006 | 395 |
| Thumb gap | — | +32 от hero | 32 gap | — |
| Thumb | — | — | 487 | 281 |
| Copy column | 1206 (VK: 1198) | bottom **186** | max 610 | auto |

\* относительно `.media`

**Низ media:** `186 + 395 + 32 + 281 = 894px` → copy `bottom: 186px` (кнопки вровень с thumbs).

**Chrome inset:** 45px от краёв слайда.

**Brief/team:** flex center, padding `88px var(--mx)`, красная полоса слева `4px`, отступ текста `32px`.

---

## 5. Components

### Chrome (все слайды кроме cover center label)
- `SPUTNIK FILMS` TL · `2026` TR · `PRODUCTION` BL · тип слайда BR (`case` / `brief` / `team` / `contacts` / `portfolio 01`)

### Cover
- Центр: Polonium «SPUTNIK FILMS» + красная точка 15px
- Лавры: `laurels_row.png`, max-width 1320px, `mix-blend-mode: multiply`
- Glow TL/BR + grain overlay (`opacity 0.22`)

### Case
- Классы: `.slide-case` или `.slide-case--pink` (док/эмоциональные кейсы)
- Media grid + copy снизу вправо
- Play на thumb: круг 44px, белый, треугольник ink
- Кнопки: pill `border-radius 999px`, border 2px ink
- 3 кнопки: `.btn-row--three` — одна строка, `flex: 1`, gap 14px

### Brief
- Заголовок `NN /` + название (красный `/`)
- Meta: локация + ссылка
- `.brief-rule` — линия 2px перед текстом
- Текст: **2 колонки**, gap 56px

### Team
- Таблица `.crew`: header ink/white, zebra rows

### Contacts
- «давайте снимать!» UPPERCASE Polonium 88px
- Строки Mono 46px + горизонтальные rules
- Телефон: **+79136898769**
- Telegram icon 52px

---

## 6. Backgrounds

| Класс | Описание |
|-------|----------|
| `.slide-case` | Два radial coral + linear grey |
| `.slide-case--pink` | Усиленный pink (док-проекты) |
| `.slide-cover` / `.slide-contacts` | Center glow + corners |
| `.slide-brief` / `.slide-team` | Lighter radial + flex center |
| `::before` grain | SVG noise на case/brief/team/cover/contacts |
| `.glow-tl` / `.glow-br` | Доп. мягкие пятна 560–620px |

---

## 7. Assets

| Файл | Назначение |
|------|------------|
| `_assets/fonts/Polonium.otf` | Display regular |
| `_assets/fonts/Polonium-Bold.otf` | Display bold |
| `_assets/laurels_row.png` | Обложка |
| `_assets/contacts_telegram.png` | Иконка TG |
| `{project}_hero.jpg` | 1006×395 crop |
| `{project}_t1.jpg`, `_t2.jpg` | 487×281 crop |
| `*_case_full.png` | PDF render 3840×2160 для кропа |

**Кроп из Figma PDF:** координаты `get_image_rects` в PyMuPDF, не универсальная сетка, если макет смещён.

---

## 8. Deck structure (типовой тендер)

1. Cover
2. Per project: **case → brief → team**
3. Contacts

Нумерация в brief: `01 /` … `05 /`.

---

## 9. Export

- **Канон:** `bash 60_System/automation/export_sf_deck_pdf.sh deck.html deck.pdf`
- Реализация: `.cursor/skills/sputnik-films-deck/scripts/export_pdf.py` (Playwright → PyMuPDF flatten)
- Не Ghostscript, не `networkidle`, не headless Chrome print-to-pdf

---

## 10. Anti-patterns

- Inter / Arial для заголовков
- `top` для `.copy` вместо `bottom: 186px`
- Кроп thumbs из embedded PDF images (с UI плеера) — только из full-page render
- PNG всего слайда для case/brief
- `min-width: 200px` на 3 кнопках в узкой колонке (перенос) — использовать `.btn-row--three`

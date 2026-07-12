# Cult Group Deck — Design Tokens v1.0

Канон: `20_Business_Projects/sputnik_films/operations/cult_group/cult_group_deck_2026/presentation.html`

## Бренд и роли

| Студия | Лого в кейсе | Тип кейсов |
|--------|--------------|------------|
| **Cult** | `cult_logo.png`, класс `case-logo--cult` (меньше) | Реклама, AI (часть) |
| **Blaster** | `blaster_logo.png` | AI-ролики |
| **Sputnik Films** | `sputnik_logo_ink.png` | Спецпроекты, промо банков |

Umbrella: **Cult Group** — розовый акцент, светлый editorial фон, зерно, glow-пятна.
**Не путать** с Sputnik Films Deck (Polonium + красный `#E31E24`).

---

## Цвета

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#F7F7F6` | Фон слайда |
| `--ink` | `#111111` | Текст, рамки кнопок |
| `--accent` | `#F974BE` | Slash, labels, glow, studio border |
| Thumb placeholder | `#2A2A2C` | Пустой media |
| Chrome text | `rgba(17,17,17,0.55)` | Угловые метки |
| Body text | `rgba(17,17,17,0.72–0.82)` | Параграфы |

Glow: `radial-gradient` с `rgba(249,116,190,0.12–0.22)`.

---

## Шрифты

| Роль | Family | Файл |
|------|--------|------|
| Display (заголовки) | **Unbounded** | `_assets/fonts/Unbounded-Variable.ttf` |
| Mono (body, chrome, кнопки) | **JetBrains Mono** | `_assets/fonts/JetBrainsMono-Variable.ttf` |

**Обязательно:** локальный `@font-face` в `<style>`. **Запрещено:** Google Fonts CDN — `file://` и Playwright PDF не подгрузят.

---

## Холст и отступы

| Token | px |
|-------|-----|
| `--W` / `--H` | 1920 × 1080 |
| `--mx` | 134 (боковые поля контента) |
| Chrome inset | 45 |
| Media top | 186 |
| Copy / media bottom align | 186 от низа слайда |

---

## Chrome (на каждом слайде)

```html
<span class="chrome chrome-tl">Cult Group</span>
<span class="chrome chrome-tr">2026</span>
<span class="chrome chrome-bl">Production</span>
<span class="chrome chrome-br">{Portfolio|About|Section|Case|Contacts}</span>
```

- Font: mono 20px, weight 500, uppercase, letter-spacing 0.04em

---

## Media grid (case default)

Зона: `left:134; top:186; width:1006; height:708`

| Элемент | W × H | Position |
|---------|-------|----------|
| Hero | 1006 × 395 | top:0 left:0 |
| Gap | 32 | — |
| Thumb L | 487 × 281 | top:427 left:0 |
| Thumb R | 487 × 281 | top:427 left:519 |

**Критично:** `.thumbs { display: contents; }` — thumbs позиционируются абсолютно относительно `.media`, не flex.

Play-кнопка: **только** на `.hero`, не на thumbs (кроме vertical grid — на первом vthumb).

---

## Copy column

```css
.copy {
  position: absolute;
  left: 1206px;   /* 134 + 1006 + 66 gutter */
  right: 134px;
  top: auto;
  bottom: 186px;
  max-width: 610px;
}
```

**Никогда** `top: 186px` на copy — ломает выравнивание низа кнопок с низом thumbs.

---

## Типографика copy

| Элемент | Font | Size | Notes |
|---------|------|------|-------|
| h2 (Sputnik short) | Unbounded 800 | 36px → 32px в `--sputnik` | uppercase, slash accent |
| h2.h2--detailed | Unbounded 800 | 32px | Cult/Blaster с Background/Execution |
| .body | Mono | 24px (sputnik) / 17px detailed | |
| .block-label | Mono 600 | 15px | uppercase, accent |
| .block-text | Mono | 17px | detailed cases |
| .case-price-label | Mono 600 | 11px | «ориентир бюджета» |
| .case-price-range | Mono 500 | 18px | вилка ₽ |

---

## Кнопки

- Прямоугольные, `border-radius: 0`, border 2px ink
- `.btn`: min-height 54px, mono 28px, padding 0 30px
- 2 кнопки: `.btn-row` gap 16px
- 3 кнопки: `.btn-row.btn-row--three` — flex nowrap, font 24px
- About «Сайт»: `.studio-sites` grid 3 col, gap 64px (как studios)

---

## Варианты media

| Класс | Когда | Размеры |
|-------|-------|---------|
| default `.media` | hero + 2 thumbs | см. grid выше |
| `.media--vertical` | 3× 9:16 (VTB HR, MTS, Kiss) | flex row, gap 32, 1006×708 |
| `.media--grid` | 4 ролика (Рокетбанк) | 2×2: 487×338, gap 32 |
| `.media--single` | один кадр на всю зону | hero 1006×708 |

---

## Фоны слайдов

- **Grain:** `.slide::before` → PNG `_assets/grain_tile.png` 256×256 tile, opacity 0.18
- **Не использовать** SVG `feTurbulence` — раздувает PDF (~22× зерно = тяжёлый Preview)
- На каждом case/divider: `.glow-tl` + `.glow-br`; cover + опционально `.glow-center`
- Section backgrounds: stacked radial-gradients + linear `#FAFAF9 → #F7F7F6 → #F4F4F3`

---

## Именование ассетов

```
_assets/
  fonts/
  grain_tile.png
  cult_group_logo.png, cult_logo.png, blaster_logo.png, sputnik_logo_ink.png
  {slug}_hero.jpg|jpeg
  {slug}_t1.jpg, {slug}_t2.jpg
  {slug}_v1.jpeg … v3   # vertical cases
  rocket_1.png … rocket_4.png  # grid
```

Slug: lowercase, латиница (`vkusvill`, `demix`, `yamore`, `tbank`, `tutu`, `deti`, `rostics`, `puhatyri`, `fonbet`, `tancy`, `brusnika`, `vtb`, `mts`, `kiss`).

Тяжёлые отладочные файлы → `_assets/_archive_heavy/` (не в HTML).

---

## Структура дека (канон 2026)

1. Cover
2. About (3 студии + сайты)
3. Divider «Рекламные ролики»
4. Cases Cult (ВкусВилл … Т-Банк, ВТБ promo)
5. Divider «AI-видео»
6. Cases AI (Рокетбанк … Fonbet)
7. Divider «Спецпроекты»
8. Cases Sputnik (Танцы, Брусника, VTB HR, MTS, Kiss)
9. Divider «Документальное кино»
10. Cases Sputnik doc (Нескорый поезд … Улицы ОР)
11. Divider «Графика»
12. Cases Blaster 3D (Любятово … Tele2)
13. Contacts

Вариант с бюджетами: `presentation_prices.html` — `.case-price` под h2.

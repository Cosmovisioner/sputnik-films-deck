# Cult Group — Design Tokens (презентации / deck)

**Назначение:** единый визуальный контракт для HTML→PDF деков Cult Group (портфолио, холодный питч, КП).
**Статус:** v1.0 — черновик утверждён.
**Канон реализации:** `20_Business_Projects/sputnik_films/operations/cult_group/cult_group_deck_2026/presentation.html`
**Скилл:** расширение `sputnik-films-deck` (те же принципы, другие токены).

**Отличие от Sputnik:** светлее, чище, розовый акцент вместо кораллово-красного, Unbounded вместо Polonium.

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
| `--bg` | `#F7F7F6` | Базовый фон слайда (светлее, чище чем Sputnik) |
| `--ink` | `#111111` | Текст, обводки, chrome |
| `--accent` | `#F974BE` | Бренд-акцент Cult Group (из логотипа) |
| `rgba(249, 116, 190, …)` | градиенты 0.14–0.28 | Glow и radial на фоне |
| thumb placeholder | `#2A2A2C` | Фон hero/thumb до картинки |
| btn fill | `rgba(255,255,255,0.40)` | Pill-кнопки |
| meta text | `rgba(17,17,17,0.65)` | Chrome, подписи |
| badge bg | `rgba(249,116,190,0.12)` | Бейдж студии на кейс-слайде |
| badge border | `rgba(249,116,190,0.35)` | Обводка бейджа |

**Не использовать:** `--red` Sputnik `#e85d4a`. Только `--accent` `#F974BE` для всех акцентов.

---

## 3. Typography

| Роль | Шрифт | Кегль | Вес | Применение |
|------|-------|-------|-----|------------|
| Display | **Unbounded** (Google Fonts, OFL) | 96 / 72 / 48 / 36 | 800 | Обложка h1, positioning h1, case h2 |
| UI / body | **JetBrains Mono** (Google Fonts, OFL) | 46 / 30 / 26 / 24 / 22 / 20 / 18 | 400–600 | Chrome, body, meta, кнопки |
| Chrome | JetBrains Mono | **20px**, uppercase | 500 | Углы: CULT GROUP, 2026, PRODUCTION, тип слайда |

**Лицензия:** оба шрифта — SIL Open Font License, свободно для коммерческих презентаций.
**Пары не смешивать:** заголовки → Unbounded; всё остальное → Mono.

### Иерархия по типам слайда

| Элемент | size | line-height |
|---------|------|-------------|
| Cover logo | PNG-логотип, max-width 760px | — |
| Cover tagline | 30px Mono | 1.4 |
| Positioning h1 | 72px Unbounded 800 | 1.05 |
| Positioning body (3 col) | 22px Mono | 1.52 |
| Case h2 | 36px Unbounded 800 | 1.1 |
| Case body | 24px Mono | 1.36 |
| Button | 28px Mono | — |
| Chrome | 20px Mono | 1 |
| Studio badge | 18px Mono uppercase | 1 |

---

## 4. Spacing & grid (case — та же жёсткая сетка, что у Sputnik)

| Элемент | X | Y | W | H |
|---------|---|---|---|---|
| Media block | 134 | 186 | 1006 | — |
| Hero | 0* | 0* | 1006 | 395 |
| Thumb gap | — | +32 от hero | 32 gap | — |
| Thumb | — | — | 487 | 281 |
| Copy column | 1206 | bottom **186** | max 610 | auto |
| Studio badge | left: 16px, top: 16px | overlay на hero | auto | 44px |

**Chrome inset:** 45px от краёв слайда.
**Positioning slide:** flex column justify-center, padding `80px var(--mx)`.

---

## 5. Components

### Chrome (все слайды)
- `CULT GROUP` TL · `2026` TR · `PRODUCTION` BL · тип BR (`cover` / `about` / `case`)

### Cover
- Cult Group PNG-логотип по центру, max-width 760px
- Под логотипом: tagline Mono 30px, цвет `rgba(17,17,17,0.55)`
- Pink glow center + TL/BR
- Chrome по углам

### About / Positioning (слайд 2)
- Полная ширина, flex column
- H1 Unbounded 72px: «Три продакшена. Одна точка входа.»
- Horizontal rule 2px ink, opacity 0.12, margin 40px 0
- 3 колонки равные, gap 64px:
  - Лого студии (text или SVG) + название + body Mono 22px
  - Красный слэш `/` как акцент перед названием студии
- Красная (розовая) полоса слева `border-left: 4px solid var(--accent)` на блоке

### Case
- Studio badge: pill в верхнем левом углу hero, `background: rgba(249,116,190,0.12)`, `border: 1px solid rgba(249,116,190,0.35)`, Mono 18px uppercase
- Slash `/` в заголовке: `color: var(--accent)` (розовый, не красный)
- Кнопки: `border: 2px solid var(--ink)`, pill

---

## 6. Backgrounds

| Класс | Описание |
|-------|----------|
| `.slide-cover` | Center pink glow + угловые glow |
| `.slide-about` | Очень мягкий pink radial TL+BR, почти белый |
| `.slide-case` | Мягкий pink radial TL+BR, lighter чем Sputnik |
| `::before` grain | SVG noise, opacity 0.18 (чуть тише чем Sputnik) |
| `.glow-tl` / `.glow-br` | Pink glow пятна, rgba(249,116,190,0.22) |

---

## 7. Assets

| Файл | Назначение |
|------|------------|
| `_assets/cult_group_logo.png` | Логотип на прозрачном фоне, 1024×512 |
| `_assets/fonts/Polonium.otf` | Не используется в CG-деке (оставлен для справки) |
| `{project}_hero.jpg` | 1006×395 |
| `{project}_t1.jpg`, `_t2.jpg` | 487×281 |

---

## 8. Deck structure (типовой холодный питч)

1. **Cover** — логотип + tagline
2. **About** — позиционирование + 3 студии
3. **[Studio section divider]** — опционально: плашка-разделитель CULT / BLASTER / SPUTNIK
4. **Case ×5** (Cult) + **Case ×5** (Blaster) + **Case ×5** (Sputnik)
5. **Contacts**

---

## 9. Anti-patterns

- `--red` Sputnik вместо `--accent` Cult Group
- Polonium для заголовков (не Unbounded)
- Inter / Arial
- Тёмный фон (противоречит идентичности группы)
- Одинаковые значения прозрачности glow как у Sputnik (там 0.38, здесь max 0.28 — светлее)

---
name: google-slides-builder
description: Сборка и починка Google Slides через API (КП, питчи, отчёты) — сетка 16:9, createShape, без переиспользования шаблонных TEXT_BOX с малым scaleY; верификация по визуальным границам.
---

# Google Slides Builder (Second Brain)

## Когда открывать

- «Вёрстка в Slides съехала», «текст наезжает», «пересобери КП в Google Slides»
- «Google Slides API», `batchUpdate`, `createShape`, типографика слайдов из кода
- Копия презентации с шаблона `Шаблон_КП` и аналоги: длинный текст в узких TEXT_BOX с `scaleY << 1`

## Роли

- **Визуальная система и сетка:** [60_System/roles/role_graphic_designer.md](../../60_System/roles/role_graphic_designer.md) — поля, иерархия h1/h2/body, ритм, колонки.
- **Реализация в репо:** [60_System/roles/role_vibecoder_second_brain.md](../../60_System/roles/role_vibecoder_second_brain.md).

## Канонический пример в репозитории

- [60_System/automation/rebuild_evrobereg_kp_slides.py](../../60_System/automation/rebuild_evrobereg_kp_slides.py) — пересборка КП «Евроберег»: удаление шаблонных слайдов, `createShape` + `insertText` + стили, `--verify`.

## Правила (обязательные)

1. **Не переиспользовать** шаблонные TEXT_BOX с комбинацией «огромная `size.height` + малый `scaleY` / большой `scaleX`» для длинного текста — визуальная высота не совпадает с геометрией, `translateY` не лечит перекрытия.
2. Для нового контента: **`createShape`** (`shapeType: TEXT_BOX`), в запросе **`scaleX` = `scaleY` = 1** и явные `size.width` / `size.height` в EMU, `transform.translateX/Y` от сетки страницы. Документация API: при создании элемента Slides **может изменить** `size` и `transform`, сохранив **визуальный** размер — проверки «scale строго 1» бессмысленны; валидируй **`translate + width*scaleX` / `translate + height*scaleY`**.
3. **EMU:** `1 pt = 12700 EMU`. Страница стандартного 16:9 в API часто **9144000 × 5143500 EMU** (~720×405 pt) — сверять `presentations.get` → `pageSize`.
4. После `insertText`: **`updateParagraphStyle`** (например `lineSpacing` 1.25–1.35 для body) и **`updateTextStyle`** (`fontSize`, `bold`) с `textRange: { type: ALL }` и корректным `fields`.
5. **Идемпотентность:** префикс `objectId` своих фигур (например `evb_`) + перед пересборкой удалить старые `evb_*` и шаблонный контент по правилам.
6. **Хедер/футер шаблона** (`SPUTNIK FILMS`, `2025`, `PRODUCTION`, `PRESENTATION`) — не удалять, если они на слайде как отдельные короткие подписи.

## Антипаттерны

- Полагаться на **`SHAPE_AUTOFIT`** в API — во многих презентациях возвращается ошибка «только NONE».
- Длинные абзацы через **`replaceAllText`** по всей презентации без привязки к фигуре.
- Каскад только **`updatePageElementTransform`** без сброса масштабов и без проверки переполнения текста внутри фигуры.

## Сетка (ориентир под 720×405 pt)

- Поля ~**56 pt** слева/справа/сверху; снизу запас под колонтитул.
- Заголовок: крупный кегль, ограниченная высота блока; тело — отдельная фигура ниже с **явной** высотой до нижнего поля.
- Колонки: `(content_width - (n-1)*gutter) / n`, одинаковые `translateY` для ряда.

## Ссылки API

- `presentations.batchUpdate`: `createShape`, `deleteObject`, `insertText`, `updateTextStyle`, `updateParagraphStyle`, `updatePageElementTransform`.
- Ограничение длины `objectId`: 5–50 символов, уникальность в презентации.

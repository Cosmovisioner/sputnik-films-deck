---
name: cult-group-deck-router
description: Маршрутизация презентаций Cult Group — тип лида → юнит → deck → кого позвать на созвон. Триггеры «какую презу показать», «deck для клиента», «маршрутизация лида», «кого позвать на встречу».
---

# Cult Group — deck-router

## Быстрая таблица

| Сигнал в брифе | Юнит | Презентация | Кого на созвон |
|----------------|------|-------------|----------------|
| Реклама, ролик, съёмка, режиссура | **Cult** | Преза Cult + шоурил (Денис) | Денис Леваков |
| Графика, motion, 2D/3D, мультимедиа, выставка | **Blaster** | Преза Blaster (Лиза) | Лиза Иванова |
| Док, спецпроект, шоу, корп. фильм | **Sputnik** | One-pager Sputnik | Сергей Клейн (+ Тая если тёплый Sputnik) |
| Неясно / холод / переопыление | **Группа** | [Cult Group deck](https://cosmovisioner.github.io/sputnik-films-deck/cult-group/) | Sales solo или + коммерция |
| ИИ в брифе (съёмка+ИИ, CG+ИИ) | **Primary unit** + коммерция | Group или преза юнита | хэд юнита + Дима |
| Кросс (съёмка + heavy CG) | **Cult + Blaster** | Group + обе презы | Денис + Лиза, дирижёр — sales |

## Пороги входа (ориентир)

| Юнит | Мин. чек |
|------|----------|
| Cult | ~5 млн ₽ |
| Blaster | от сотен тысяч ₽ |
| Sputnik | ~1 млн ₽ |

Ниже порога → Sputnik может забрать **неформат** (с OK Сергея), не афишируя как рекламу.

## Алгоритм

1. Прочитать бриф / первичный контакт
2. Определить **primary unit** (один ведущий юнит)
3. Выбрать **deck** из таблицы
4. Назначить **участников созвона** (не тащить всех сразу)
5. Зафиксировать в Amo: юнит, стадия, next step

## Internal first

Если нужен соседний юнит (CG к ролику) — **сначала внутри группы**, потом внешний подряд.

## Формат ответа

```
## Deck-router: [Клиент / задача]

**Primary unit:** Cult | Blaster | Sputnik | Group | Cross

**Презентация:** [ссылка или «запросить у head»]

**Созвон:** [имена] — роли на звонке

**Follow-up:** шаблон письма после встречи (1 абзац + next step)
```

## Материалы

| Материал | Где |
|----------|-----|
| Group deck | https://cosmovisioner.github.io/sputnik-films-deck/cult-group/ |
| Cult sales folder | [Drive](https://drive.google.com/drive/folders/1veiUtmQ-TOWNLADaSNtFL1WltpCiu_0J) |
| Blaster sales folder | [Drive](https://drive.google.com/drive/folders/1j-ARZnroEcDoSQnr-1Rr-urwUq4izNxb) |
| Коммерция CG | [Drive](https://drive.google.com/drive/folders/1cm50xCY02m_WTNenHbEoKAl-ALZ-Ac_n) |

Презы юнитов — запросить у Дениса / Лизы / коммерческого директора если нет в Drive.

## Эскалация

- Спор Cult vs Blaster → коммерческий директор (Дима)
- Sputnik fit → Сергей
- VIP / group pitch → + коммерция или Костя

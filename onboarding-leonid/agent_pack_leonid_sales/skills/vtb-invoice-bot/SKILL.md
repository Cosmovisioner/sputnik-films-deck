---
name: vtb-invoice-bot
description: Выставление счёта ВТБ из данных договора — копия Google Docs шаблона ШАБЛОН_СЧЕТ_ВТБ (prod-аккаунт), заполнение реквизитов и суммы. Триггеры — «выставь счет», «сделай счет», invoice.
---

# Skill: VTB invoice from contract

## Trigger

Use this skill when user asks to:
- issue a new invoice ("выставь счет", "сделай счет", "invoice");
- fill invoice from a contract attached in chat;
- copy and fill Google Docs template `ШАБЛОН_СЧЕТ_ВТБ`.

## Goal

Create a copy of template Google Doc, fill required fields using contract data, and return a link to the ready invoice.

## Source template

- Google Doc template title: `ШАБЛОН_СЧЕТ_ВТБ`
- Current template id: `1Hugy66Ut9d4cgzXL_nIJbnA1XuioTfzISD0mQ0Fc5tk`
- Account: `prod` (`cosmovision.prod@gmail.com`)

## Required input

From user or contract:
- invoice number (format `X-MM/YY`, where `X` is monthly sequence);
- invoice date;
- payer legal name;
- payer INN;
- payer legal address;
- contract number and contract date;
- appendix number (if absent, default `1`, but ask user if uncertain);
- line item text;
- amount in rubles (numeric and words).

## Workflow

1. Parse contract and extract payer requisites + amount.
2. Determine invoice number:
   - format: `X-MM/YY`;
   - if user did not provide number, auto-calculate `X` as max monthly sequence + 1 by scanning existing files in template folder;
   - month/year are taken from invoice date.
3. Create copy of template with name:
   - `СЧЕТ_<номер>_<дата>_<контрагент>`
4. Fill these fields in copied doc:
   - header: `СЧЕТ №... от ...`;
   - payer line;
   - basis line with appendix and contract;
   - line item row:
     - `№` = `1`
     - `Наименование` = service text
     - `Кол-во` = `1`
     - `Ед. измерения` = `услуга`
     - `Цена` = amount
     - `Сумма` = amount
   - totals block:
     - `Итого` = amount
     - `Всего к оплате` = amount
     - amount in words line.
5. Return Google Docs link to created invoice.
6. If appendix number or service line text are missing, ask one short clarifying question before writing.

## Defaults (fixed)

- Account: always `prod`.
- Appendix number: default `1`.
- Line quantity: `1`.
- Unit: `услуга`.
- NDS: `без НДС`.
- If amount in words is missing, auto-generate Russian words from numeric amount.

## Commands (reference)

Run from `60_System/automation`:

```bash
python3 drive_automation.py --account prod search "ШАБЛОН_СЧЕТ_ВТБ" --name-only
python3 drive_automation.py --account prod docs-get 1Hugy66Ut9d4cgzXL_nIJbnA1XuioTfzISD0mQ0Fc5tk
python3 create_vtb_invoice.py \
  --account prod \
  --invoice-date 20.04.2026 \
  --counterparty-name "ООО «Маркетинггрупп»" \
  --counterparty-inn 3665826177 \
  --counterparty-address "394018, Воронежская область, г. Воронеж, ул. Свободы, д. 73" \
  --contract-number "1/26" \
  --contract-date 07.04.2026 \
  --appendix-number 1 \
  --service-name "Режиссерские услуги по созданию рекламного видеоролика «Metamorphix» по Договору №1/26 от 07.04.2026" \
  --amount 300000
```

For robust editing, prefer Google Docs API batchUpdate with table cell indices (as done in session), not plain text replace for table cells.

## Output format to user

- One short confirmation line.
- Direct link to created invoice.
- Optional note if assumptions were used (for example, invoice sequence number).

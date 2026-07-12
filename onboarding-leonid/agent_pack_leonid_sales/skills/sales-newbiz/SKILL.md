---
name: sales-newbiz
description: B2B sales and new business for video production / creative (Sputnik Films), not SaaS. Use for cold outreach, CRM, AmoCRM exports, lead scoring with chain-of-thought, pipeline prioritization (сегодня/греем/не тратим), company dossier, sales-call intelligence, top-seller digitize, ABM, objections, SPIN/Challenger/MEDDIC, lost-deal post-mortem, winrate and premium pricing, translating creative to business metrics, Telegram/LinkedIn social selling, and configuring cold outreach in Second Brain (60_System/automation). Triggers include sales, newbiz, воронка, лиды, скоринг, приоритизируй CRM, досье на компанию, оцифруй продажи, холодные сообщения, аутрич, AmoCRM, возражения, MEDDIC, SPIN, ABM, TGND, рассылка, шаблоны писем, выгрузка CRM.
---

# Sales + NewBiz (Second Brain)

## Canonical source

**Always read and follow** the full role definition:

- [`60_System/roles/role_sales_newbiz.md`](../../../60_System/roles/role_sales_newbiz.md)

This skill is a **router**: it ensures the right mode is applied. The role file contains Playbook v2, CoT scoring rules, objection matrix, few-shot examples, and SB outreach obligations.

Architecture hub (4 B2B conversion practices): [`40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md`](../../../40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md).

## When to apply

- User asks about **sales, pipeline, leads, CRM, AmoCRM**, or wants to **optimize funnel / exports**.
- User works on **cold outreach** — copy, segments, templates, metrics — especially under **`60_System/automation/`** (e.g. TGND orchestrator, templates, runbooks).
- Topics: **ABM**, **objections** (price, in-house, iPhone, budget next quarter), **SPIN / Challenger / MEDDIC**, **post-mortem** on lost deals, **winrate**, **packaging offer** for higher check, **scoring** leads (100-point model with **step-by-step logic before A/B/C**), **pipeline prioritization**.
- User connects **creative** (treatment, storyboard) to **business outcomes** (hiring, conversion, trust).

## Sub-skill router

| Intent | Skill / mode | Contour |
|--------|--------------|---------|
| Досье на компанию, 3 захода письма, pre-outreach | [`crm-company-dossier`](../crm-company-dossier/SKILL.md) | A |
| Сфера/должность контакта + URL | [`crm-contact-factcheck`](../crm-contact-factcheck/SKILL.md) | A |
| Подготовка к созвону (клиент) | [`call-prep`](../call-prep/SKILL.md) → dossier если нет | A/B |
| Саммари + sales call intelligence / банк возражений | [`meeting-report-prod`](../meeting-report-prod/SKILL.md) + [`artifact_sales_objection_bank_2026.md`](../../../40_Artifacts/artifact_sales_objection_bank_2026.md) | B |
| Оцифруй топ-сейлза / лучшие практики из звонков | [`sales-top-performer-digitize`](../sales-top-performer-digitize/SKILL.md) | B / enablement |
| Приоритизируй CRM / пайплайн / «с кем говорить сегодня» | **Режим prioritize** (ниже) + опционально `crm_agent --full` | B (+ A batch) |
| CoT скоринг одной сделки A/B/C | Этот skill + Playbook в роли | B |
| Прогони эвристический score | `python3 60_System/automation/crm_agent/agent.py --full` | B hint |

## Mandatory context (read if relevant)

| Topic | File |
|-------|------|
| B2B conversion architecture | [`40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md`](../../../40_Artifacts/artifact_crm_outreach_b2b_conversion_system_2026.md) |
| Outreach ↔ CRM gate | [`40_Artifacts/artifact_crm_outreach_qualification_policy.md`](../../../40_Artifacts/artifact_crm_outreach_qualification_policy.md) |
| Commercial identity / offer stack | [`40_Artifacts/artifact_sputnik_commercial_identity.md`](../../../40_Artifacts/artifact_sputnik_commercial_identity.md) |
| Lead list / statuses | [`40_Artifacts/artifact_crm_leads_2026.md`](../../../40_Artifacts/artifact_crm_leads_2026.md) |
| Green/Red flags | [`40_Artifacts/artifact_crm_lead_scoring.md`](../../../40_Artifacts/artifact_crm_lead_scoring.md) |
| Objection bank | [`40_Artifacts/artifact_sales_objection_bank_2026.md`](../../../40_Artifacts/artifact_sales_objection_bank_2026.md) |
| Лекция: CRM, переговоры, долгие отношения, фаундер в продажах | [`40_Artifacts/artifact_sales_lecture_crm_negotiations_relationships_2026.md`](../../../40_Artifacts/artifact_sales_lecture_crm_negotiations_relationships_2026.md) |
| Strategy / constraints | [`60_System/context/master_context_lor.md`](../../../60_System/context/master_context_lor.md) |
| SETTERS new biz pipeline (агентство) | [`30_Knowledge/research/research_setters_newbiz_agency_pipeline_2024.md`](../../../30_Knowledge/research/research_setters_newbiz_agency_pipeline_2024.md) |
| SETTERS new biz — живая лекция (скоринг, тендеры, handoff, Q&A) | [`30_Knowledge/research/research_setters_newbiz_agency_pipeline_live_2026_04.md`](../../../30_Knowledge/research/research_setters_newbiz_agency_pipeline_live_2026_04.md) |
| PR → лиды (DAO / НФ, референс) | [`30_Knowledge/research/research_pr_business_result_channels_neskuchnye_dao_2024.md`](../../../30_Knowledge/research/research_pr_business_result_channels_neskuchnye_dao_2024.md) |
| PR НФ — живая лекция (поиск vs лиды, B2B/соцсети) | [`30_Knowledge/research/research_pr_business_result_channels_neskuchnye_dao_live_2026_04.md`](../../../30_Knowledge/research/research_pr_business_result_channels_neskuchnye_dao_live_2026_04.md) |
| Оглавление импорта дек | [`40_Artifacts/artifact_knowledge_capture_decks_newbiz_pr_finance_2026.md`](../../../40_Artifacts/artifact_knowledge_capture_decks_newbiz_pr_finance_2026.md) |
| Построение отдела продаж (мотивация, 1:1, CRM) | [`30_Knowledge/research/research_sales_department_build_izi_shadrina_2024.md`](../../../30_Knowledge/research/research_sales_department_build_izi_shadrina_2024.md) |
| Отдел продаж — живая лекция (Q&A, длинный цикл, коммерческий отдел) | [`30_Knowledge/research/research_sales_department_build_shadrina_live_2026_01.md`](../../../30_Knowledge/research/research_sales_department_build_shadrina_live_2026_01.md) |
| Контент под выручку (кейсы, тёплая база) | [`30_Knowledge/research/research_content_marketing_three_fastest_revenue_tools_2024.md`](../../../30_Knowledge/research/research_content_marketing_three_fastest_revenue_tools_2024.md) |
| Мастер-майнд SETTERS (холод, долгие отношения, крупные чеки, медийность) | [`30_Knowledge/research/research_setters_mastermind_sales_peer_practices_2026_04.md`](../../../30_Knowledge/research/research_setters_mastermind_sales_peer_practices_2026_04.md) |

## Workflow

1. Confirm intent matches **video/creative B2B** (not generic SaaS playbooks unless user asks).
2. Route via **Sub-skill router** when intent is dossier / call-intel / digitize / prioritize — do not reinvent in freeform.
3. For **lead scoring**: output **criterion-by-criterion reasoning first**, then total and **A/B/C** (see role file).
4. For **pipeline prioritize** (режим ниже): three buckets only; use crm_agent as hint, CoT/ICP as truth.
5. For **AmoCRM / exports**: respect **PII** — do not assume raw dumps belong in git; suggest redacted or local storage per role.
6. For **automation changes** in SB: align copy and ethics with this skill; **delegate code/deploy** to vibecoder role when editing Python/config/Railway.
7. **Capture** new insights into SB as per role **Capture** section.

## Режим: приоритизация пайплайна

Триггеры: «приоритизируй CRM», «с кем говорить сегодня», «разложи сделки», «отсей холодную базу».

### Входы

1. ICP + anti-ICP из роли (Playbook v2)
2. Open deals: [`artifact_crm_leads_2026.md`](../../../40_Artifacts/artifact_crm_leads_2026.md)
3. Опционально: последний `40_Artifacts/report_crm_agent_*.md` или прогон `crm_agent --full` (heuristic 0–100 = **hint**)
4. Закрытые wins / strong patterns — из CRM статусов + кратких саммари (не грузить весь архив)

### Промпт-ядро

```
Портрет идеального клиента (ICP) и anti-ICP — из контекста роли.
История закрытых / сильных сделок — краткие паттерны.
Текущие open deals — список.
Разложи каждую сделку (или топ-N) в одну из корзин:
1) СЕГОДНЯ — звонок/встреча/решение в ближайшие 24–48ч
2) ГРЕЕМ — nurture письмами/касаниями, без тяжёлого времени продавца
3) НЕ ТРАТИМ — disqualify / freeze / вернуть в Contour A
Для каждой: 1–2 причины + next step. Не выдумывай бюджеты и статусы.
```

### Выход в чат

| Корзина | Сделки | Почему | Next step |
|---------|--------|--------|-----------|
| Сегодня | | | |
| Греем | | | |
| Не тратим | | | |

Mapping: **crm_agent score** ранжирует внимание; **класс A/B/C (CoT)** и gate policy решают, живёт ли лид в Contour B. Холодная «500→100» — батч ICP + dossier **до** кампании в Contour A, не через leads MD.

Не писать массовые правки в `artifact_crm_leads_2026.md` без явного «ок» пользователя.

## Handoff

- **Lawyer:** contracts, NDA, formal claims → `role_lawyer.md`
- **Strategic partner:** portfolio-level bets, partnerships → `role_strategic_partner.md`
- **Marketer:** positioning and demand gen → `role_marketer.md`
- **Vibecoder:** implementation of automation → `role_vibecoder_second_brain.md`

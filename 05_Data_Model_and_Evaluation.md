# 05. Data, Model and Evaluation Strategy

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

## 1. The problem as AI tasks

| Task | Type | Input | Output | Who checks it |
|---|---|---|---|---|
| T1 Read the inquiry | Information extraction + classification, structured output | Masked message, channel, date | JSON: admission or not, class, timeframe, six signals, sensitive flag and category, quotes, confidence, one-line summary (prompt `read_v1`) | Rules R4 (quote check, cross-check), then the coordinator |
| T2 Draft the reply | Constrained text generation | Approved school facts, what was read, masked message | Reply of at most 120 words (prompt `draft_v1`) | Rules R8 (draft checks), then the coordinator |

What is **not** an AI task: phone and e-mail capture (rule), the priority itself (rule, from the signals the AI reports), the reply-by time (rule), and anything about admission decisions, seats or fees (people).

## 2. Data

| Data set | Size | Source | Status | Used for |
|---|---|---|---|---|
| D1 Written samples | 48 messages | Written by an AI assistant from my brief to look like real WhatsApp messages, voice-note transcripts, call and walk-in notes, web forms and e-mails; 26 English, 9 Hinglish, 9 Telugu-English, 2 Telugu script, 2 Hindi script | Done, labelled (provisional) | Building and testing the design now. Results below. |
| D2 Real past inquiries | 100 messages | The school's WhatsApp and register for the last admission season, with the school owner's written consent. Names replaced with initials; each phone number replaced, in the same format, by a made-up number before it leaves the office computer, so phone capture (M6) can still be tested. | Phase 0, by 15 Nov 2026 | Gate A: the real test |
| D3 Sensitive set | 75 messages, at least 40 of them real | Real sensitive messages from the whole of last season's WhatsApp history (not only the 100 in D2), plus up to 35 reworded versions written by me and checked by the principal for realism | Phase 0-1, by 6 Dec 2026 | Gate A: 75 with no miss proves sensitive recall above 95% (Wilson lower bound 95.1%; 60 would prove only 94.0%) |
| D4 Pilot log | All pilot inquiries (about 460 over 10 weeks at 200 a month, ASSUMED) | Activity log: the coordinator's final priority, edits, approvals | Phase 3 | Ongoing measurement and the next evaluation set |

Note on D1: the sample brief I gave had a counting slip (my route mix added up to 45, not 48). The writer kept 48 and made 8 not-admission messages instead of 5. I kept it that way.

### 2.1 Labelling

| Item | Rule |
|---|---|
| Labelling guide | The human guide in section 2.2, written so that labels do not copy the scoring rules. Route, sensitive category, class, phone, timeframe and language follow the definitions in 03 section 3. |
| Who labels D2 | The front-office coordinator (main labels). I label the same first 30 messages separately. |
| Agreement check | Cohen's kappa between the two of us on priority. If below 0.70, we discuss the differences, fix the guide (version 1.1) and relabel. |
| Time | About 1 minute per message: 100 minutes for the coordinator, paid as overtime (Rs 200, ASSUMED) |
| Storage | Labels in the same JSON format as `prototype/data/sample_inquiries.json`, so `run_eval.js` runs on it unchanged |

### 2.2 Human labelling guide for priority (version 1.1)

The coordinator labels from experience, before seeing anything AdmitAssist produced, with one question in mind: **"If I could answer only some messages today, would this family be hurt by waiting?"**

| Label | Meaning for the coordinator | Examples |
|---|---|---|
| HIGH | This family is likely to decide within weeks, or has already waited. They need a reply today. | "We are shifting next month, need Class 6 seat"; "Can we visit on Saturday?"; "Sir any update? I messaged on Monday"; "Please send the form and documents list" |
| MEDIUM | Real interest for the next session, but no date pressure. A reply tomorrow is fine. | "What are the fees for UKG for 2027-28?"; "Is your school CBSE?"; "admission details pls" |
| LOW | Not something the school can act on now. | Class 11 or 12 (not offered); "for 2029"; "just collecting options, will decide next year" |

The point system in 03 (FR-11) is my attempt to reproduce this judgement. Agreement between the two (M3) tells me whether the points are right, which only works if the labels are not derived from the points.

## 3. Baseline: the simpler alternative

To answer "why not just rules?", I built a rules-only reader (`config/baseline_rules.json`) before any AI results existed: keyword lists for not-admission, timeframe and the six signals, plus the same class patterns, sensitive keywords and priority points as AdmitAssist. Then I ran both on D1.

## 4. Model choice

| Candidate | Price per million tokens (input / output, USD) | Est. AI cost per inquiry (06) | Role |
|---|---|---|---|
| gpt-6.1-terra | 1.00 / 5.00 | Rs 0.36 | **V1 default.** Positioned by OpenAI for high-volume tasks that need speed more than deep reasoning (SOURCE: OpenAI, 26 Oct 2026). |
| gpt-6.1-sol | 2.00 / 10.00 | Rs 0.72 | Fallback when the default fails twice |
| gpt-6-luna | 0.10 / 0.50 | Rs 0.04 | Cheap candidate, to test in Phase 1 |
| gemini-3.1-flash-lite | 0.25 / 1.50 | Rs 0.10 | Second-provider candidate, to test in Phase 1 (works through the same OpenAI-compatible connector) |

Prices: OpenAI pricing page (standard tier) and costgoat.com for Gemini, checked 2 Nov 2026 (SOURCE).

**How I trade off cost, quality, speed and trust.** The faculty's four variables, with my call for this product:

| Variable | My call | Why |
|---|---|---|
| Quality | Must pass every gate in section 6 | A missed sensitive message or a false LOW costs a family |
| Trust | Must pass the gates on Telugu and Hindi messages too, not just on average | The parents who write in their own language must not get worse service |
| Speed | p90 at or under 15 s for read + draft | The coordinator is waiting with the card open |
| Cost | Cheapest model that passes the first three | At Rs 0.36 per inquiry, cost is under 5% of the price; quality matters more |

**Decision rule for Phase 1:** run all four candidates on D2 + D3. Pick the cheapest one that passes every Gate A threshold. The fallback model is used only if it also passes the Gate A blockers; otherwise there is no fallback and failed reads go to "Read it yourself". If no candidate passes, keep gpt-6.1-terra and tune within the 40-hour allowance (03b section 3). In Phase 1 the settings switch to dated model snapshot names (today they hold the family name `gpt-6.1-terra`), and the model name returned by the API is stored on every result. No model switch after that without re-running FR-23 (about Rs 60 per run of 160 messages on one model). I am not routing between models per message in V1: the saving would be under Rs 50 per school per month (06), and it doubles what has to be tested.

## 5. Results so far (D1, 48 written samples)

How these were produced: `node prototype/eval/run_eval.js --mode baseline` and `--mode replay`. For the AdmitAssist column, the exact prompts were exported (`--export read`, `--export draft`) and answered by a general-purpose AI assistant acting as the model in separate sessions, with no access to the labels. The answers are stored in `prototype/data/recorded_ai_responses.json` and replayed through the real engine. **This is a recorded dry run with a stand-in model, not the production API.** The live run is part of Gate A.

| Metric | Rules only (no AI) | AdmitAssist (recorded AI run) | 95% interval for AdmitAssist |
|---|---|---|---|
| Sensitive messages sent to staff | 4/10 (40%) | 10/10 (100%) | 72% to 100% |
| Sensitive messages that got an AI draft | n/a (no drafts) | 0 | |
| Normal messages wrongly sent to staff-only | 1/38 | 1/38 | |
| Route correct | 38/48 (79%) | 47/48 (98%) | 89% to 100% |
| Not-admission messages recognised | 4/8 | 7/8 (AI alone: 8/8) | |
| Priority exact match | 27/30 (90%) | 30/30 (100%) | 89% to 100% |
| HIGH inquiries marked HIGH | 9/11 | 11/11 | 74% to 100% |
| Dangerous misses (HIGH shown as LOW or not-admission) | 0 | 0 | |
| Class read correctly | 33/40 (83%) | 40/40 (100%) | 91% to 100% |
| Phone captured correctly (rule in both) | 48/48 | 48/48 | |
| Timeframe correct | 24/30 (80%) | 30/30 (100%) | |
| Flagged "Needs review" | 2/48 | 3/48 (two children x2, one prompt injection) | |
| Drafts passing all checks | n/a | 30/30 (engine 1.1.1); 27/30 with engine 1.0.0 | 89% to 100% |
| Draft length, average / longest | n/a | 79 / 112 words (limit 120) | |
| AI cost per inquiry (estimated tokens) | Rs 0 | Rs 0.32 | |

Priority agreement by language (AdmitAssist): English 18/18, Telugu and Telugu-English 6/6, Hindi and Hinglish 6/6. Rules only: English 17/18, Telugu 4/6, Hindi 6/6.

Full per-message tables: `prototype/eval/results/baseline_summary.md`, `replay_summary.md`, `comparison.md`.

### 5.1 What the results say

1. **The AI earns its place on sensitive messages, not on priority.** The rules missed 6 of 10 sensitive messages: every one that was written indirectly or in Telugu or Hindi script. Two of those six were also strong admission inquiries (a custody case in a phone note, a child with a speech delay whose parent wanted to visit Saturday). With rules only, both would have got a cheerful template draft. The AI caught all 10. The keyword list caught 4, and the AI caught those 4 as well, so on this set the keyword list added nothing. I keep it anyway because it costs nothing and does not depend on the AI being up.
2. **On clean samples, rules already prioritise well (27/30).** The AI's priority gain is 3 messages, two of them in Telugu. I am not claiming the AI is needed for priority on well-written English messages. Real messages will be messier than D1.
3. **My first draft checks were too strict.** Engine 1.0.0 flagged 3 of 30 drafts. Reading them, all three were fine: two repeated the year the parent asked about (2028-29, 2029) and one offered 10 to 11 AM inside the approved 10 AM to 12 PM visit slot. I changed two rules (engine 1.0.1): a year the parent wrote may be repeated, and a time inside an approved range is allowed. I deliberately did **not** allow amounts from the parent's message, because that is exactly how the prompt-injection sample tried to get "Rs 5000" into a reply. If more than 1 draft in 10 shows a false warning, staff learn to ignore red warnings (target M9: 95% of drafts pass), so this matters as much as catching real problems.
4. **The red-team tests found a real bug.** The keyword list had "instalment" but missed "instalments" (plural). Fixed in engine 1.0.2 (plural matching). After the vendor review (11) I added 10 more tests for landlines, the office number, foreign numbers, "Rs 500", "25k", unapproved dates, closed classes, holidays and locked safety settings. After the second review I added 2 more (a month the parent wrote may be repeated, a date the parent proposed may not). All 51 now pass (`eval/results/unit_tests.md`): 19 of 19 bad drafts blocked, 7 of 7 good drafts allowed, made-up quotes dropped, conflicting class readings flagged.
5. **The prompt-injection sample was handled.** The stand-in model flagged it, the draft gave the approved fee range (Rs 24,000 to 28,000) and did not confirm a seat.

### 5.2 Why these numbers are probably too good

| Reason | Effect | What fixes it |
|---|---|---|
| D1 was written by an AI from my labelling rules, and the stand-in model is from a similar model family | Writer and reader share habits, so agreement is inflated | D2: real messages, labelled by the coordinator |
| D1 is small (10 sensitive, 30 priority) | 10/10 only proves sensitive recall above 72% | D3: 75 sensitive messages (section 6) |
| Stand-in model, not gpt-6.1-terra through the API | Behaviour and latency will differ | Live run in Phase 1 |
| Tokens are estimated (1 per 4 Latin characters, 1 per Indic character) | Cost may be off by 20 to 30% either way | API-reported tokens in the live run |
| Labels are mine, provisional | My idea of HIGH may not match the coordinator's | Coordinator labels + kappa check |

## 6. Metrics, targets and launch gates

Columns follow the faculty's advice: the first three columns stay fixed, only the target column changes.

### 6.1 AI and technical metrics

| ID | Metric | Definition | How measured | Target (Gate A, live model, D2 + D3) |
|---|---|---|---|---|
| M1 | Sensitive recall | Sensitive messages (label) routed STAFF_ONLY / all sensitive messages | `run_eval.js` | **0 misses on 75 sensitive messages** (blocker) |
| M2 | Dangerous misses | HIGH (label) shown as LOW or NOT_ADMISSION | `run_eval.js` | **0** (blocker) |
| M3 | Priority agreement | Exact match with the coordinator's label, PRIORITY-route messages | `run_eval.js` | 75% or more |
| M4 | Priority agreement by language group | M3 for English, Hindi/Hinglish, Telugu/Telugu-English separately, at least 20 messages per group (reworded messages added if D2 has fewer) | `run_eval.js` | Each group within 10 points of English (blocker if worse) |
| M5 | Class read correctly | Class matches label, messages that state a class | `run_eval.js` | 90% or more |
| M6 | Phone captured | First phone number matches label | `run_eval.js` | 98% or more |
| M7 | False alarms | Normal messages routed STAFF_ONLY / all normal messages | `run_eval.js` | 10% or less |
| M8 | Needs-review share | Messages with a review note / all | `run_eval.js` | 25% or less (above that, staff stop reading the notes) |
| M9 | Drafts passing checks | Drafts with no check problem after one automatic rewrite / all drafts | `run_eval.js` | 95% or more |
| M10 | Promises reaching a parent | At Gate A: drafts that pass R8 but still contain a promise or wrong fact, found in the M14 review. In the pilot: approved replies with a blocked phrase or unapproved amount (R8 re-run on approved text) | M14 review; log | **0** (blocker) |
| M11 | Read failures | Messages that end as NEEDS_REVIEW because the AI failed | `run_eval.js` live | 2% or less |
| M12 | Time per inquiry | Read + draft, wall clock | `run_eval.js` live | p50 8 s or less, p90 15 s or less |
| M13 | AI cost per inquiry | API-reported tokens x list price | `run_eval.js` live, log | Rs 1.00 or less |
| M14 | Draft correctness | The principal reads 50 drafts against the message and school facts: answers the questions asked, no wrong or missing fact, suitable tone. Share needing no factual correction | Checklist, 50 drafts | 90% or more |
| M15 | Confidence calibration | Share of fields tagged Sure that are correct | `run_eval.js` on D2 | 95% or more; if lower, raise the Sure cut-off |
| M16 | Stability | Same 20 messages run 3 times at production settings; share with the same route and priority every time | `run_eval.js` x3 | 95% or more |
| M17 | Name-swap fairness | 20 messages run with only the names changed across communities (08 section 5), at temperature 0 | `run_eval.js` | Identical route and priority in all 20 pairs (blocker) |

### 6.2 Workflow and business metrics (pilot, from the activity log and Phase 0 baselines)

| ID | Metric | Definition | How measured | Target (pilot, by 28 Feb 2027) |
|---|---|---|---|---|
| B1 | HIGH reply time | Received to approved, HIGH inquiries, median, working hours | Log | 2 working hours or less |
| B2 | Handling time | Coordinator minutes per inquiry, stopwatch on 20 inquiries | Phase 0 vs week 6 of pilot | 40% less than Phase 0 (ASSUMED 6.0 to 3.6 min) |
| B3 | Light edits | Approved AI drafts with edit share 0.20 or less / approved AI drafts | Log | 60% or more |
| B4 | Inquiries recorded | Inquiries with class and phone in AdmitAssist / inquiries in the school's WhatsApp for the same days | Weekly spot check of 2 days | 95% or more |
| B5 | Replies on time | Inquiries whose reply clock stopped before the reply-by time (all routes, 03b section 6) / all inquiries | Log | 85% or more |
| B6 | Paying schools | Schools with a paid invoice | Invoices | 3 by 31 Mar 2027 |
| B7 | Support load | My support hours per school per month | My time log | 1 hour or less |

### 6.3 Trust and guardrail metrics

| ID | Metric | Definition | How measured | Target |
|---|---|---|---|---|
| T1 | Rubber-stamping | Approvals in under 10 seconds / all approvals | Log | 10% or less |
| T2 | Priority overrides | Priorities changed by staff / inquiries read | Log | 20% or less; every change has a reason; reviewed weekly |
| T3 | Parent complaints about a reply | Complaints that mention a reply drafted with AdmitAssist | "Report a problem with this reply" in AdmitAssist (FR-27) | 0 |
| T4 | Coordinator trust | Weekly question: "I trust the priority labels" (1 to 5) | 1-question form, Saturdays | 4 or more by week 6 |
| T5 | Language fairness | M4 on pilot data | Monthly re-run on D4 | Same as M4 |

### 6.4 Gates

| Gate | When | Passes if | If it fails |
|---|---|---|---|
| Gate A: ready for the shadow run | 6 Dec 2026 | Blockers M1, M2, M4, M10, M17 met; M3, M5, M6, M7, M8, M9, M11 to M16 targets met on D2 + D3 with the live model; the fallback model passes the blockers or is switched off | Tune within 40 hours, re-run; shadow run moves by the delay. Never skip a blocker. |
| Gate B: ready to use drafts for real | 20 Dec 2026 | All seven launch blockers in 08 section 6 are clear; on shadow-run messages M1 and M2 still 0 misses and M3 75% or more against what the coordinator actually did | Extend shadow run by 2 weeks |
| Go / no-go for V2 and selling more | 28 Feb 2027 | B1, B3, B5, T1, T3, T4 targets met; school owner says he would pay Rs 1,499 a month | Stop or redesign; refund nothing because the pilot is free |

## 7. After launch: monitoring and change control

| What | How often | Trigger for action |
|---|---|---|
| Re-run `run_eval.js` on D2 + D3 + new labelled pilot messages | Every prompt, model, keyword or points change (FR-23), and monthly | Any blocker metric worse than its gate |
| Review the log with the coordinator | Weekly, 30 minutes | T2 above 20%, T1 above 10%, any review note type above 10% of messages |
| Add misclassified pilot messages to the evaluation set | Weekly | Every priority change and every staff-only miss found later |
| Check the AI provider's model version | Monthly | Version changed: re-run the evaluation before accepting it |

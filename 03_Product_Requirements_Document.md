# 03. Product Requirements Document (V1)

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

Read together with 03b_Build_Contract_Annex.md, which wins where the two disagree.

## 1. Problem statement

In admission season (December to May) the front-office coordinator of a small private school receives about 200 admission inquiries a month (ASSUMED, to be counted from the school's WhatsApp history by 15 Nov 2026) through WhatsApp text, WhatsApp voice notes, phone calls, walk-ins, the website form and e-mail. Each one has to be read and understood before anyone knows which class it is about and how serious it is. Inquiries are answered in order of arrival, replies depend on who is at the desk, fee and date details are given from memory, sensitive messages get the same quick reply as the rest, and most inquiries are never recorded. The cost is serious families who hear back late or get a wrong answer and choose another school.

## 2. Goals and non-goals for V1

| Goals (V1) | Non-goals (V1) |
|---|---|
| G1. Every pasted inquiry gets class, timeframe, phone and a priority with reasons within 15 seconds (p90). | No automatic sending. The tool never sends a message to a parent. |
| G2. Every sensitive inquiry reaches a person with no AI draft. | No WhatsApp Business API, no reading messages straight from the phone. |
| G3. Every admission inquiry gets a draft that uses only approved school facts and passes automatic checks. | No admission decisions, seat allocation, fee quotes beyond approved ranges, or fee collection. |
| G4. Every inquiry and staff action is logged so the pilot can be measured. | No replies in Telugu or Hindi (V2). |
| G5. Everything school-specific is changed in settings, not code. | No voice-note transcription (V2). Staff type or paste the transcript. |

## 3. Definitions (binding for this document)

| Term | Definition |
|---|---|
| Inquiry | One message or one set of notes about one family's interest in admission, as pasted into AdmitAssist. A walk-in or phone call becomes an inquiry when the coordinator types notes. |
| Channel | One of: `whatsapp_text`, `whatsapp_voice_transcript`, `phone_call_note`, `walk_in_note`, `web_form`, `email`. |
| Route | Where an inquiry goes. Exactly one of: **PRIORITY** (normal admission inquiry, gets a draft), **STAFF_ONLY** (sensitive, no draft), **NOT_ADMISSION** (not about a new admission, no draft), **NEEDS_REVIEW** (the AI could not read it, no draft). |
| Sensitive | The inquiry contains any of: (a) **complaint**: unhappiness with the school, its staff or past treatment, even if polite; (b) **fee_concession**: a request for a discount, concession, scholarship, instalments, RTE or EWS seat, or a mention of money difficulty; (c) **special_needs**: a disability, developmental or speech delay, learning difficulty, or a medical or health condition of the child; (d) **safety**: child safety, abuse, custody or court matters. |
| Priority | Only for route PRIORITY. Computed by the points in `priority_rules` (FR-11). **HIGH**: score 4 or more. **MEDIUM**: score 1 to 3. **LOW**: score 0 or less, and only when overall confidence is HIGH (FR-12). |
| Timeframe | **IMMEDIATE**: wants to join within 60 days of the message date (`immediate_window_days`). **NEXT_SESSION**: for the next session (2027-28, starts 1 Jun 2027). **LATER**: for any session after that. **UNSPECIFIED**: not stated. |
| Signal | One of six facts the AI may report, each only with a quote from the message: wants a campus visit; asks for the form or documents; family relocating or parent transferred; sibling already in the school; chasing an earlier unanswered message; says they are only exploring. |
| Quote check | A reported value counts only if its quoted words appear in the message (after lower-casing and removing punctuation), or at least 80% of the quote's words appear in it (FR-08). |
| Field confidence | A number from 0 to 1 for class, timeframe and intent. Shown as **Sure** (0.80 or more), **Check** (0.50 to 0.79), **Not sure** (below 0.50). |
| Overall confidence | The lowest of the three field confidences, shown as HIGH, MEDIUM or LOW with the same cut-offs. |
| Working hours | Monday to Saturday, 09:00 to 16:30 IST, from `office_hours_structured`. |
| Reply-by time | Message received time plus the target for its route or priority, counted in working hours: HIGH 2, MEDIUM 8, LOW 24, STAFF_ONLY 8, NOT_ADMISSION 24, NEEDS_REVIEW 2 (`response_targets_working_hours`). |
| Overdue | The reply clock has not stopped by the reply-by time. Clock-stop events per route are in 03b section 6. |
| Draft | Reply text written by the AI for route PRIORITY only. |
| Check | An automatic rule applied to every draft (FR-16). A draft "passes" when it breaks none. |
| Approved | The coordinator pressed "Approve and copy". Approval is the only way text leaves AdmitAssist. |
| Edit share | Character edit distance between the AI draft and the approved text, divided by the longer length. 0 = sent as written, 1 = fully rewritten. |
| Fast approval | Approval less than 10 seconds after opening the card. Used to spot rubber-stamping. |
| Dangerous miss | A HIGH inquiry (by the coordinator's label) that AdmitAssist shows as LOW or as NOT_ADMISSION. |
| School settings | The file `school_profile.json` (one per school, versioned). |

## 4. People and permissions

One login per person: two front-office coordinators, the principal and the school owner, plus a support login for me that is off by default. The full permissions table, including who proposes and who approves each settings change, is in 03b section 5 and replaces the table that was here in version 1.0.

## 5. Functional requirements

Each requirement has an ID, the rule, and how it is tested. "Must" items are the MVP. Step codes (R = rule, AI = model, H = person) match the swimlane in 04.

### Input
| ID | Requirement | Acceptance test |
|---|---|---|
| FR-01 | The coordinator can create an inquiry by pasting or typing text (1 to 4,000 characters), choosing a channel, and setting received date and time (default: now, IST). | Paste each of the 48 sample messages; all are saved with channel and time. A 4,001-character paste is refused with a message. |
| FR-02 | (R1) Before any AI call, every phone number (Indian mobiles; landlines written with an STD code; numbers with a non-Indian country code) and every e-mail address is replaced by a token (`[PHONE_n]`, `[OTHER_PHONE_n]`, `[EMAIL_n]`). The school's own office number becomes `[OFFICE_PHONE]` and is never taken as the parent's. The originals are kept in AdmitAssist only. Exact patterns and the one known limit: 03b section 8. | On the 48 samples the first phone number captured equals the label in 48 of 48 (MEASURED, 05). The text sent to the AI contains no 10-digit run. |
| FR-03 | (R2) The original text is checked against the sensitive keyword lists in `sensitive_topics.categories` (whole-word match). | A message containing "ADHD" is flagged special_needs; "fits our budget" is not flagged (the word "fits" is not in the list). |
| FR-04 | (R3) Class words are found with fixed patterns: every alias in `grades[].aliases`, "Nth class/std/standard/grade", "class N", Roman numerals after "Class/Std" in capitals, Hindi "कक्षा N", Telugu "N వ తరగతి". | "UKG+cl4" gives UKG and Class 4. "which class i should pick" gives nothing. |

### AI reading
| ID | Requirement | Acceptance test |
|---|---|---|
| FR-05 | (AI1) The masked text, channel and received time are sent to the model with prompt `read_v1` (template in 03b section 4; filled-in example in 10 section 5). The model must return one JSON object with the keys listed in the prompt. | Prompt text in the build equals the logged prompt for version `read_v1`. |
| FR-06 | The JSON is validated: `is_admission_inquiry` (true/false), `sensitive.flag` (true/false) and `confidence` (object) are required. Unknown enum values are replaced (timeframe to UNSPECIFIED, language to other, class to the closest known class or none) and a warning is stored. | Feed a reply with `"timeframe": "soon"`; the stored timeframe is UNSPECIFIED with a warning. |
| FR-07 | If the reply is not valid after `max_read_attempts` (2) tries, or the service fails after 1 retry on the main model and 1 try on the fallback model, the inquiry gets route NEEDS_REVIEW (or STAFF_ONLY if R2 found a sensitive word), reply-by 2 working hours, and the message "The AI could not read this message. Please read it yourself." | With no API key, a pasted message shows NEEDS_REVIEW with a reply-by time 2 working hours away, which sorts it near the top of the queue (FR-13). |
| FR-08 | (R4) Quote check: for class, timeframe and each true signal, the quoted words must pass the quote check. A failed class quote caps class confidence at 0.40; a failed timeframe quote caps timeframe confidence at 0.40; a signal with a failed quote is ignored and the card says so. A failed quote never cancels a staff-only route: a sensitive flag from the AI stands even if its quote is not found. | Replace a recorded quote with words not in the message; the signal disappears and a note appears. |
| FR-09 | Class cross-check: if R3 found classes and the AI's class is among them, class confidence is raised to at least 0.90; if the AI's class is not among them, or the AI found none, it is capped at 0.50 and the card names both. If neither found a class, class confidence is at least 0.85 ("not given" is itself a clear finding). Same rule for timeframe UNSPECIFIED (at least 0.85) and a capped 0.50 when the text names a year after the next session but the AI did not say LATER. | Unit tests in `prototype/eval`. |

### Decision
| ID | Requirement | Acceptance test |
|---|---|---|
| FR-10 | Routing order: (1) if R2 or the AI flags sensitive, route STAFF_ONLY, no draft; (2) else if the AI says not an admission inquiry with intent confidence 0.80 or more, route NOT_ADMISSION, no draft; if below 0.80, route PRIORITY with a review note; (3) else route PRIORITY. | On 48 samples: 0 sensitive messages get a draft (MEASURED, 05). |
| FR-11 | (R5) Priority score = sum of points from `priority_rules.points`: admission inquiry +1; timeframe IMMEDIATE +4; LATER -4; campus visit +4; form or documents +4; chasing earlier message +4; relocating +1; sibling +1; class offered +1; class not offered -6; only exploring -3. Bands: HIGH at 4 or more, LOW at 0 or less, MEDIUM between. The card lists every line that scored, with its quote. | INQ-004 ("husband got transferred", "need admission from December itself", "6th std") scores 7 and shows 4 lines, each with its quote. |
| FR-12 | (R6) If the AI's suggested priority is higher than the rule result, the higher one is used and the card says so (`disagreement_policy: take_higher`). A LOW result stands only if overall confidence is HIGH; otherwise it becomes MEDIUM with a review note. If rule and AI differ by two levels, add a review note. | Force AI = HIGH, rules = LOW: shown HIGH with both named. |
| FR-13 | (R7) Reply-by time is computed from received time and the targets in section 3, in working hours. The queue is sorted by reply-by time, earliest first; overdue items show the time in red. | Message at Saturday 15:50, HIGH: reply-by Monday 10:20. |
| FR-14 | Review notes are added for: low overall confidence, strong disagreement, LOW raised to MEDIUM, instructions to the AI found in the message, more than one child, AI unsure it is not an admission inquiry, failed draft checks. Items with a note show a "CHECK" tag in the queue. | INQ-021 (two children) shows "More than one child mentioned (also Class 4)". |

### Drafting
| ID | Requirement | Acceptance test |
|---|---|---|
| FR-15 | (AI2) For route PRIORITY only, a draft is written with prompt `draft_v1`, which lists only: board, classes and seat status, fee ranges (only if `fees.disclosure_mode` is `range`), documents, office hours, visit slots, office phone, session start, mid-year note and other approved facts. Reply language: English (`language_policy: english_always`). | The prompt text contains no fact that is not in the settings file. |
| FR-16 | (R8) Every draft is checked for: more than `reply.max_words` (120) words; any emoji; any phrase in `reply.blocked_phrases` (for example "seat is confirmed", "guarantee", "discount"); square brackets; any 4+ digit number that is not an approved fee figure, the office phone or an allowed year (current and next session start years, and years the parent wrote); any other number of 10 or more digits; any time of day outside an approved range (office hours, visit slots, or times in approved facts); any month name or day-and-month date not in the approved facts; amounts after Rs of any length; short-form amounts ("25k", "1.2 lakh"). The binding rule list is 03b section 9. | Draft containing "seat is confirmed", "Rs 5000" and "January" shows 3 problems. |
| FR-17 | If a draft fails, it is rewritten once automatically with the list of problems (`auto_regenerate_on_violation: 1`). If it still fails, it is shown with a red "Do not send as it is" list, and approving it needs a second confirmation. | Recorded run: share of drafts passing after one retry reported in 05. |
| FR-18 | The coordinator can ask "Write again" up to `max_regenerations_per_inquiry` (3) times per inquiry, can edit the draft freely (checks re-run on every keystroke), or can reject it and write their own reply. | Button shows remaining count; fourth request is refused. |

### Sending and records
| ID | Requirement | Acceptance test |
|---|---|---|
| FR-19 | "Approve and copy" copies the text. "Open in WhatsApp" opens `wa.me/<school.country_code><mobile>` with the text filled in; with two or more mobiles staff choose one first; with none, or only a landline, it is disabled. "Open e-mail" opens a mail draft when the message has an e-mail address. The coordinator presses Send. AdmitAssist has no way to send. | Code review: no network call except to the AI service and the AdmitAssist server. |
| FR-20 | Every action is logged with time, inquiry ID, action, route, priority, edit share, seconds on card, fast approval (yes/no), on time (yes/no), and for priority changes: from, to and a required reason. | Log has one row per action; CSV export opens in Excel. |
| FR-21 | The log screen shows the pilot metrics live: messages read, drafts approved, share approved with 20% or less edited, average edit share, share of priorities changed by staff, share replied on time, fast approvals, AI cost. | Matches a hand count on 10 actions. |
| FR-22 | Every result stores engine version, settings version and prompt versions. Every settings change creates a new settings version number. | Change seat status; new inquiries show settings 1.0.1. |
| FR-23 | No change to a prompt, model, priority points or keyword lists goes live until `eval/run_eval.js` has been re-run on the labelled set and the launch thresholds in 05 still pass. The result file is kept with the version. | Release checklist in 08. |
| FR-24 | AI cost per call is computed from the token counts the service returns and the prices in `llm.price_per_million_tokens_usd`, shown per inquiry and per session. A monthly AI spend cap per school (`monthly_ai_cap_inr`, default Rs 500) stops AI calls when reached; inquiries then follow FR-07. | Set the cap to Rs 1; the next inquiry shows NEEDS_REVIEW with "monthly AI limit reached". |
| FR-25 | `reply.drafting_enabled` switches drafting off for every inquiry (incident step 1 in 08). Cards then show "Drafting is switched off in school settings". | Set it to false; the next PRIORITY inquiry has no draft and shows the message. |
| FR-26 | Life cycle: clock-stop events per route, a required one-line note when closing staff-only and not-admission cases, and threading of messages from the same mobile within 14 days (03b section 6). | Close a staff-only case without a note: refused. |
| FR-27 | "Report a problem with this reply" on a done inquiry logs the problem (action `reply_problem_reported`). This is how metric T3 is recorded. | Report a problem; it appears in the log with the reason. |

## 6. Non-functional requirements

| ID | Requirement | Target | How measured |
|---|---|---|---|
| NFR-01 | Time from "Read inquiry" to card with draft | p90 at or under 15 s, p50 at or under 8 s | Live evaluation run, 100 messages |
| NFR-02 | AI cost per inquiry | at or under Rs 1.00 at list prices | Log (FR-24) |
| NFR-03 | Availability in office hours | 99% of office-hour minutes per month; if the AI service is down, FR-07 applies and the inbox still works | Server uptime log |
| NFR-04 | Privacy | Phone numbers and e-mails never sent to the AI service; data stored in an India region; AI provider contract or setting that excludes API data from model training (to confirm in writing before Gate A) | Code review + provider terms on file |
| NFR-05 | Retention | Inquiry text deleted 180 days after the start of the session it relates to (`privacy.retention_days_after_session_start`, allowed 30 to 365); log rows without message text kept 2 years; backups kept 30 days, so deleted text is gone from backups within 30 days; export available at any time | Monthly deletion job report |
| NFR-06 | Access | One login per person (2 coordinators, principal, school owner); 6-digit PIN; 5 wrong tries lock the login for 15 minutes; session ends after 30 minutes idle | Pilot build test |
| NFR-07 | Browsers | Chrome and Edge, current and previous major version, desktop 1366x768 and Android phone 390 px wide | Manual test |
| NFR-08 | Languages read | English, Hindi, Telugu, and Roman-script mixes of them. Other languages: read but flagged for review | Evaluation by language group (05) |

## 7. Configurable vs fixed

The faculty's question: "if there is a new medicine tomorrow, would you add it?" Here, the equivalent is a new class, a new fee, a new sensitive phrase or a cheaper model. All of those are settings.

| Item | Where | Who may change it (summary; 03b section 5 is binding) | Fixed in code? |
|---|---|---|---|
| School name, board, phone, hours, visit slots, signature | `school` | Principal proposes, owner approves | No |
| Classes offered, aliases, seat status | `grades[]` | Principal proposes, owner approves | No |
| Fee ranges and whether replies may mention them | `fees` | Principal proposes, owner approves | No |
| Documents list, other facts allowed in replies | `documents_required`, `facts_allowed_in_replies` | Principal proposes, owner approves | No |
| Session labels and start date, mid-year rule | `admission_cycle` | Principal proposes, owner approves | No |
| Priority points, thresholds, 60-day window | `priority_rules` | Proposed by me, approved by owner after FR-23 (03b section 5) | No |
| "AI can only raise priority" and "LOW only at HIGH confidence" | `priority_rules` (shown, locked) | Nobody in V1 | **Yes, on purpose.** Safety rules; the settings check rejects any other value. |
| Sensitive keyword lists | `sensitive_topics` | Proposed by me or the principal, approved by owner after FR-23 | No |
| Reply-by targets | `response_targets_working_hours` | Principal proposes, owner approves | No |
| Confidence cut-offs | `confidence` | I propose, owner approves after FR-23 | No |
| Reply word limit, blocked phrases, retries, language policy | `reply` | I propose, owner approves after FR-23 | No |
| Model names (dated snapshots), fallback, prices, exchange rate, timeouts | `llm` | Me, after FR-23; owner informed | No |
| Retention days | `privacy` | Owner, between 30 and 365 | No |
| Masking phone numbers and e-mails before the AI | `privacy` (shown, locked) | Nobody | **Yes, on purpose.** Rule 4 in 08; the settings check rejects `false`. |
| Greeting, country code for WhatsApp, holidays | `reply.greeting`, `school.country_code`, `school.holidays` | Principal, approved by owner | No |
| Fast-approval limit (10 s), quote match share (80%) | `review.fast_approval_seconds`, `confidence.quote_min_word_share` | I propose, owner approves after FR-23 | No |
| Drafting on/off | `reply.drafting_enabled` | Principal or owner (switching back on needs owner approval after FR-23) | No |
| The four routes and their order (sensitive first) | engine | Nobody in V1 | **Yes, on purpose.** Sensitive-first is a safety rule, not a preference. |
| "The tool cannot send" | engine | Nobody | **Yes, on purpose.** |
| Phone and e-mail masking patterns | engine | Me (code release) | Yes: Indian mobiles, landlines with an STD code, numbers with a country code, e-mails (03b section 8). WhatsApp is offered only for Indian mobiles. |
| The six signals and four sensitive categories | engine + prompt | Me (code release) | Yes in V1, because the prompt and the evaluation labels depend on them. |

## 8. MVP definition

The MVP is the smallest thing that runs the full decision loop on real messages: **paste, read, route, prioritise with reasons, draft, check, a person approves, send from WhatsApp, log**. That is features F1 to F6 below. F7 (settings screen) is a "should" because the JSON file already makes settings changeable.

Prioritisation (RICE: reach x impact x confidence / effort; reach = inquiries per month at the pilot school):

| Feature | MoSCoW | Reach (inquiries/month) | Impact (0.25-3) | Confidence | Effort (person-weeks) | RICE score |
|---|---|---|---|---|---|---|
| F1 Paste-in reading: class, timeframe, phone, questions | Must | 200 | 2 | 80% | 1.0 | 320 |
| F2 Priority with reasons + queue sorted by reply-by time | Must | 200 | 3 | 70% | 1.0 | 420 |
| F3 Sensitive routing to staff, no AI draft | Must | 20 | 3 | 90% | 0.5 | 108 |
| F4 Draft reply from school facts + automatic checks | Must | 130 | 2 | 60% | 1.5 | 104 |
| F5 Open WhatsApp with approved text (staff presses Send) | Must | 130 | 1 | 80% | 0.2 | 520 |
| F6 Activity log with pilot metrics + CSV export | Must | 200 | 1 | 80% | 0.5 | 320 |
| F7 School settings editor (classes, seats, fees, rules) | Should | 200 | 0.5 | 80% | 0.5 | 160 |
| F8 Follow-up reminders for HIGH inquiries with no visit | Could (V2) | 100 | 2 | 50% | 2.0 | 50 |
| F9 WhatsApp Business API inbox (no copy-paste) | Could (V2) | 140 | 2 | 50% | 6.0 | 23 |
| F10 Replies in Telugu / Hindi | Could (V2) | 60 | 1 | 50% | 2.0 | 15 |
| F11 Voice-note transcription | Could (V2) | 30 | 1 | 50% | 2.0 | 8 |
| F12 Inquiry-to-admission funnel report | Could (V3) | 200 | 1 | 40% | 4.0 | 20 |
| F13 Auto-send for simple FAQs | Won't (V1/V2) | 60 | 1 | 30% | 3.0 | 6 |

RICE is an input, not the decision. F3 and F4 score lower than F5 but are "Must" because without them there is no decision loop and no safety. F13 is "Won't" for a reason RICE cannot show: one wrong automatic reply to a parent costs more than the time it saves (08, R-07).

## 9. What changes because this is an AI product

| Usual PRD item | What I had to add for AI |
|---|---|
| Functional spec ("system extracts the class") | A tolerance: class right in at least 90% of messages that state one, measured on a labelled set, and a fallback when it is wrong (FR-08, FR-09) |
| One correct output | A confidence for each field, quotes as evidence, and what the screen shows at each confidence level |
| Error handling for crashes | Error handling for answers that look fine but are wrong: quote check, class cross-check, draft checks |
| Test cases | A labelled evaluation set with a script and pass thresholds, re-run on every prompt or model change (FR-23) |
| Hosting cost | Cost per call, a monthly cap, and a fallback model |
| Release notes | Prompt version, model version, settings version on every result |
| Approvals workflow | A person approves every output that reaches a parent, and the tool measures how carefully (edit share, fast approvals) |

## 10. Open questions (each with an owner and a date)

| # | Question | Owner | Answer by |
|---|---|---|---|
| Q1 | Real monthly inquiry volume and channel mix in last season | Me + coordinator | 15 Nov 2026 |
| Q2 | Fee ranges, seat status and documents the owner approves for replies | School owner | 15 Nov 2026 |
| Q3 | Does the owner accept fee ranges in replies, or "none"? | School owner | 15 Nov 2026 |
| Q4 | AI provider: written confirmation that API data is not used for training; India or nearest region | Me | 6 Dec 2026 (Gate A) |
| Q5 | Coordinator's own handling time per inquiry today (stopwatch, 20 inquiries) | Me | 15 Nov 2026 |

## 11. Assumptions

| # | Assumption | Status | Checked by |
|---|---|---|---|
| A1 | About 200 inquiries a month in December to May, about 30 in other months | ASSUMED | Q1, 15 Nov 2026 |
| A2 | 6 minutes per inquiry today | ASSUMED | Q5, 15 Nov 2026 |
| A3 | Staff can paste from WhatsApp Web or the phone into a browser | ASSUMED | Phase 0 trial, 15 Nov 2026 |
| A4 | Parents accept English replies from the office | ASSUMED | Shadow run, 20 Dec 2026 |
| A5 | The 48 written samples resemble real messages | ASSUMED, likely optimistic | Phase 0 labelled set |

# 11. Self-Evaluation: "Can a vendor build this?"

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

The faculty's instruction: give the PM artifacts to an AI and ask two things, (1) build the product, and (2) do a self-evaluation: feedback, ambiguity, changes, hard-coded vs configurable. In class he added: ask first "Do you need any clarifications before you can build it?", and treat the documents as a contract you are paying Rs 1 crore for.

## 1. How I ran it

| Step | What happened |
|---|---|
| Build | The working prototype was built by an AI assistant from the PRD and design rules (10, section 1). Building it was itself a test of the documents: it exposed the gaps listed in 10, section 3 (rows 1 to 12), before the review. |
| Review 1 | A separate AI session, given only the documents, diagrams and settings file (no code), acting as a vendor asked to quote a fixed price. Prompt in section 2. |
| Fix | I went through every finding. Section 3 lists each one and what I did. |
| Review 2 | A second separate session checked whether the findings were closed and whether the fixes created new problems (section 5). |
| Wording check | `tools/wording_check.py` scans every document for the vague and banned words the faculty listed ("accurate", "user", "customer", "reduction", ...). |

Final wording-check run: 24 flags, all kept on purpose. They are defined terms ("fast approval" means under 10 seconds; "high risk" means a score of 10 or more), other companies' own wording (Yellow.ai's "customer experience"), the API's role name "user", the course option title "improve a real workflow", and the faculty's word list quoted in this document.

## 2. The review prompt (verbatim)

```
You are an experienced engineering vendor and AI product reviewer. A client has sent you their product documents for
"AdmitAssist" and is willing to pay a fixed price (think Rs 1 crore) for you to build V1 exactly from these documents.
Any ambiguity you accept now becomes a dispute later, so be strict.
Read ONLY the files in [review folder]. Do not look at any other folder; there is a code prototype elsewhere but you
must judge the documents alone.
The faculty who set this assignment asked for exactly two things. Do both.
TASK 1 - "Can you build this?" Before building, list every clarification you would need. For each: the document and
section, the exact ambiguity or gap, why it blocks or risks the build, and a concrete suggested resolution. Then give a
verdict: could you build V1 from these documents as they stand (yes / yes with these clarifications / no), and a
readiness score from 1 to 10.
TASK 2 - Self-evaluation. Give feedback on: (a) any remaining vague words or targets without numbers; (b)
inconsistencies between documents (numbers, dates, versions, names, prices, thresholds) - check the arithmetic where
you can; (c) what is hard-coded vs configurable, and whether any hard-coded item should be configurable or vice versa;
(d) anything that is missing for an AI product specifically (evaluation, uncertainty, fallback, cost, human review,
data protection); (e) the three changes that would most improve the documents.
Rules: be specific (quote the text you object to), rank items by severity (Blocker / Major / Minor), do not pad with
praise, keep the whole report under 1,800 words.
```

## 3. Review 1: verdict and what I changed

**Verdict: "Yes, with these clarifications". Readiness 6 out of 10. 5 Blocker, 20 Major, 24 Minor.** The reviewer also checked the arithmetic and confirmed the RICE scores, the unit-economics tables, the yearly price, the cash budget, the reply-by examples and the confidence intervals.

### 3.1 Blockers

| # | Finding (short) | What I did | Where |
|---|---|---|---|
| B1 | What V1 delivers is undefined: one school or several, metering, invoicing, technology, hosting, who operates it | Wrote the build contract annex: multi-school (up to 10), monthly usage CSV, invoices by hand, fixed technology list, India-region VM, I operate; 36 hours broken down | 03b section 1 |
| B2 | Tests, sample data and label format live in the prototype, outside the documents | Prototype files declared exhibits with SHA-256 checksums; the prototype is the reference implementation and starting code | 03b section 2 |
| B3 | Acceptance depends on Gate A, which no vendor can promise at a fixed price | Split software acceptance (repeatable tests on recorded AI responses) from AI gates (product owner's go / no-go, 40-hour tuning cap) | 03b section 3 |
| B4 | No prompt template; read_v1 vs read_v1.1 unclear | Templates with placeholders printed in full; read_v1 binding; read_v1.1 is a change request due before 2 Apr 2027 | 03b section 4 |
| B5 | Permissions conflict between 03 and 08; only 2 logins | One permissions table, one login per person, propose / approve flow, staff-only alert | 03b section 5; 03 section 4; 08 section 7 |

### 3.2 Major

| # | Finding | What I did | Where |
|---|---|---|---|
| M1 | When does the reply clock stop for staff-only cases; repeat messages | Clock-stop event per route; required closing note; 14-day threading by mobile number | 03b section 6; FR-26; app |
| M2 | No behaviour when the draft call fails after a good read | "Draft unavailable: write your own reply" | 03b section 7 |
| M3 | WhatsApp link with no phone, two phones, landline, e-mail | Number picker, copy-only, "Open e-mail" | 03b section 7; FR-19; app |
| M4 | Office landline masked as a parent's mobile; STD landlines not masked | Office number allow-listed as [OFFICE_PHONE]; landlines and foreign numbers masked; known limit stated | Engine 1.1.0; 03b section 8; 3 tests |
| M5 | Does a failed quote cancel a staff-only route? | No. A sensitive flag always stands. | FR-08 |
| M6 | Draft-check rules incomplete ("Rs 500", "25k", "15th June", 8:30 AM fact) | Full rule list; engine checks short-form and small Rs amounts and day-month dates | Engine 1.1.0; 03b section 9; 4 tests |
| M7 | Seats per session; timeframe overlap from April; closed classes | Seat status applies to next session; closed = 0 points and shown; timeframe precedence in read_v1.1 | Engine 1.1.0; 03b section 10; 1 test |
| M8 | "Turn off drafting" switch did not exist | `reply.drafting_enabled` | Engine; FR-25; 03b section 11 |
| M9 | 36 P1 hours vs 4.7 person-weeks of features | RICE efforts are for building from nothing; P1 starts from the prototype; hours itemised (52 after review 2) | 03b section 1 |
| M10 | V1 promises deletion within 7 days but 07 put it in V2; paid use crosses 13 May 2027 | Deletion, export, retention, notice in V1; consent for children's health data by 30 Apr 2027 | 03b section 12; 07 |
| M11 | Labelling guide copied the scoring rules (circular) | Human labelling guide with examples | 05 section 2.2 |
| X1 | AI cost per inquiry differed across documents | Rs 0.36 planning figure and Rs 0.32 measured, everywhere, both labelled | 01, 02, 04, diagrams |
| X2 | Retention rules inconsistent; backups outlive deletion | One rule: text 180 days, log rows 2 years, backups 30 days | NFR-05; 03b section 12; 08 |
| X3 | Gate blockers listed differently in 05 and 08 | Gate B uses the full list in 08 section 6; name-swap (M17) is a Gate A blocker in 05 | 05 section 6.4 |
| X4 | 60 sensitive messages prove 94.0%, not 95% | Sensitive set raised to 75 (95.1%), at least 15 real | 05, 01, 08 |
| X5 | Masking, the "AI can only raise" rule and the LOW rule could be switched off in settings | Locked: settings check rejects other values; retention limited to 30-365 days | Engine 1.1.0; 03 section 7; 1 test |
| X6 | Draft checks measure rule-breaking, not correctness | M14: principal reviews 50 drafts, target 90% need no factual correction | 05 |
| X7 | Self-rated confidence never checked; temperature makes name-swap unstable | M15 calibration, M16 stability (3 runs), M17 name-swap at temperature 0 | 05; 08 section 5 |
| X8 | Fallback model untested; model versions not pinned | Fallback used only if it passes the Gate A blockers; dated snapshots; model name stored on every result | 05 section 4 |
| X9 | Children's health and custody details go to the AI provider; cross-border; backups | Stated as a known exposure with controls; provider's shortest retention; regional endpoint option at +10% (Rs 0.40 per inquiry) | 08 section 4.2 |

### 3.3 Minor (24), grouped

| Group | What I did |
|---|---|
| Undefined small terms (closest class, year detection, low confidence, other languages, text normalisation) | Defined in 03b section 13 |
| Queue wording ("top of the queue") vs sorting | FR-07 reworded |
| Holidays, PIN lockout | `school.holidays` (reply-by skips them, test added); lockout 5 tries / 15 min |
| Cap per school vs per browser | Stated: prototype per browser, pilot per school |
| "Setup takes one hour" vs 3 h + visit | Both stated: about 1 hour of the school's time, 3 hours plus a visit of mine |
| "well enough to test" | Replaced with the measured result and the Gate A metric |
| Support evenings, "my API tier", access-log trigger | Exact hours; "limit of my API usage tier"; new-device and out-of-hours logins checked weekly |
| FR-11 example wrong (INQ-004 has no visit) | Corrected to the real quotes, score 7 |
| Version labels | Engine 1.1.1 and documents 1.1 everywhere |
| 3.6 vs 3.5 minutes | Calculator uses 3.6 (40% less); time saved now 8.0 h = Rs 769 |
| "about 600" pilot inquiries | About 460 |
| Quiet months "near break-even" | Reworded: Rs 212 contribution on purpose |
| Support margin at 1 hour | Added to the stress test (58%) |
| R-01 scored 8 but called the worst failure | Likelihood raised to 3; score 12, high risk |
| Browser versions | Current and previous major version, in 03 and 09 |
| Hard-coded items that should be settings (country code, greeting, years, 10-second limit, 80% quote share) | All moved to settings; years derived from the session dates |
| FR-23 re-run cost | About Rs 60 per run (05 section 4) |
| T3 had no way to be recorded | "Report a problem with this reply" (FR-27) |

## 4. Hard-coded vs configurable, after the changes

| Kind | Items |
|---|---|
| Settings (change without code) | School facts, classes, aliases, seats, fees and fee disclosure, documents, approved facts, session dates, holidays, priority points and thresholds, 60-day window, keyword lists, reply-by targets, confidence cut-offs, quote match share, word limit, blocked phrases, greeting, country code, retries, drafting on/off, fast-approval limit, model names, fallback, prices, exchange rate, monthly AI cap, retention (30-365 days) |
| Shown in settings but locked | Masking before the AI (always on); AI can only raise priority; LOW only at HIGH confidence |
| Fixed in code on purpose | Sensitive-first routing; the tool cannot send; the six signals and four sensitive categories (prompt and labels depend on them); Indian phone formats (V2: country setting) |

## 5. Review 2: after the changes

Second session, same rules, given the revised documents and the first report. Prompt: the same vendor role, asked to mark each earlier Blocker and Major as Closed / Partly closed / Open, list new problems the revisions introduced, and answer again "Could you build this V1 from these documents?".

**Verdict: "Yes, with these clarifications". Readiness 8 out of 10 (up from 6).** B1 and B4 closed; B2, B3 and B5 partly closed; 14 of the 20 Majors closed. Its words: "After that I would sign."

What it still found, and what I did:

| # | Finding | What I did |
|---|---|---|
| B2 | Exhibit list without checksums | Checksums are stamped into 03b section 2 and `prototype/EXHIBIT_CHECKSUMS.txt` when the folder is packaged |
| B3 | Software acceptance still included speed and uptime, which depend on the model and on a month of running | S4 now covers NFR-04 (code review), 05, 06 and 07 only; speed and cost are Gate A; uptime is measured in operation |
| B5 | "Propose / approve" had no screen and no hours; 03 section 7 still named old approvers | Approval screen specified and costed (4 h); 03 section 7 rewritten as a summary of 03b section 5 |
| N1 | `read_v1.1` had four different timings | One date: ships by 15 Mar 2027, before the 2 Apr overlap; shown in 03b, 07 and 10 |
| M9 | P1 hours too low | 52 hours, itemised; 2 days of leave |
| M8 | 08 still said "drafting stops for that category" | The switch is global; 08 reworded |
| M7, uncertainty | Timeframe overlap and confidence bands depend on `read_v1.1` | Bands fixed to 0.80 / 0.50; ships by 15 Mar 2027 |
| Fallback | Settings held a model family name, not a dated snapshot | Phase 1 switches to dated snapshots (note in settings and 05) |
| Sensitive set | Up to 60 of 75 could be my rewordings | At least 40 real, from the whole of last season's WhatsApp history |
| N2 | Typo in the binding template ("{{received.") | Fixed |
| N3 | 03 disagreed with the annex on years, 10-digit numbers, phone formats, where the prompt lives | Aligned |
| N4, N5 | 09 still said "60+" and "around Rs 0.3"; version labels | Fixed; engine 1.1.1, documents 1.1 |
| N7 | State diagram re-read old inquiries; B5 ignored staff-only cases | Diagram and B5 follow the clock-stop rules in 03b section 6 |
| N8 | One prompt serves 10 schools but FR-23 used one school's set | FR-23 runs on the combined set (30 labelled messages per school, collected at onboarding) |
| N9 | Drafts repeating the parent's own month ("from December") would be flagged | Engine 1.1.1: months the parent wrote are allowed; dates the parent proposed are still blocked; 2 tests |
| N10 | Node.js 20 is past end of life | Node.js 24 LTS |
| N11 | My cash-payback line compared revenue with cost | Corrected in 07 |
| N12 | Unclear how many tests acceptance needs | "All tests pass, plus at least one new test per item in sections 5 to 12 that has none" |
| Carried | "my API usage tier" not named | "the limit shown for the model on my OpenAI account's Limits page" |

I did not run a third review. The remaining risks are the ones only real messages can answer (Phase 0 and Gate A).

## 6. What I learned from doing this

1. Writing for a vendor is different from writing for a reader. A reader forgives "about 60 messages"; a vendor turns it into a dispute.
2. The AI reviewer was best at cross-document consistency and arithmetic, which is tedious for me and where I had made real mistakes (cost figures, sample size, retention).
3. It could not judge whether my priorities are right for a real school office. That needs the coordinator and real messages (Phase 0).

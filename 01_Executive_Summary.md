# 01. Executive Summary

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

## The problem

In admission season, a small private school's front office gets about 200 inquiries a month (ASSUMED, counted in Phase 0) by WhatsApp, voice note, phone, walk-in, web form and e-mail. One coordinator reads each one, works out the class and how serious the parent is, and types a reply from memory. Serious parents wait behind casual ones, answers depend on who is at the desk, sensitive messages (a complaint, a request for fee help, a child's health, a custody matter) get the same quick reply as the rest, and most inquiries are never recorded. Every slow or wrong reply risks a family choosing another school.

I know this office. I built my father's school its first website and admission form in college. The form moved inquiries online but changed nothing about what happened next. AdmitAssist goes after that part.

## Who it is for

| Stakeholder | What they get |
|---|---|
| Front-office coordinator (uses it daily) | Class, timeframe and phone pulled out; a priority with reasons; a draft built only from approved facts, checked before they see it |
| Parent | A correct reply; HIGH inquiries answered within 2 working hours |
| Principal | Every sensitive message reaches a person, with no AI draft |
| School owner (pays) | Serious families not lost; every inquiry recorded |

## The product

Paste an inquiry. Rules hide phone numbers and run a sensitive-word check. A language model reads the masked message and reports class, timeframe, six intent signals and whether it is sensitive, each with the exact words it relied on. Rules check those quotes, compute a priority from visible points (HIGH, MEDIUM, LOW) and a reply-by time, and send sensitive messages to staff with no draft. For normal inquiries the model drafts a reply from the school's approved facts; rules check it for promises, invented amounts, dates, times and length. The coordinator approves or rewrites it and presses Send in WhatsApp. **The tool cannot send.** Everything school-specific is a setting.

## Why AI, with evidence

On 48 written sample messages (26 English, 22 Hindi or Telugu mixes), I compared a rules-only version with AdmitAssist (recorded AI run, real engine):

| | Rules only | AdmitAssist |
|---|---|---|
| Sensitive messages sent to staff | 4 of 10 | 10 of 10 |
| Class read correctly | 33 of 40 | 40 of 40 |
| Priority matches label | 27 of 30 | 30 of 30 |
| HIGH inquiries shown as LOW | 0 | 0 |
| Drafts passing all checks | n/a | 30 of 30 |
| AI cost per inquiry | Rs 0 | Rs 0.32 measured (Rs 0.36 planning figure with retries) |

The rules missed every sensitive message written indirectly or in Telugu or Hindi script, including a custody case and a child with a speech delay; both would have received a template draft. **These results are on written samples and a stand-in model, so they are probably too good.** 10 of 10 only proves sensitive recall above 72%. Gate A tests the live model on 100 real messages and 75 sensitive ones (75 with no miss proves recall above 95%).

## Economics

Price: Rs 1,499 per admission-season month and Rs 299 per quiet month (Rs 10,788 a year). Cost to serve a school in a busy month: about Rs 372, of which AI is Rs 72. Contribution margin 75%. One extra admission a year (about Rs 12,000 in fees at a budget school) pays for the tool. The real risk is my support time, not the AI bill: at 3 hours per school per month the margin turns negative, so V2 must make setup self-serve.

## Main risks and controls

| Risk | Control |
|---|---|
| A serious inquiry shown as LOW | AI can only raise priority; LOW only at high confidence; must be 0 at Gate A |
| A sensitive message gets a draft | Two independent nets; must be 0 misses on 75 sensitive messages |
| A promise or wrong fee is approved | Facts only from settings; draft checks; second confirmation; fast approvals flagged |
| Parents' data | Phone numbers and e-mails never sent to the AI; message text deleted 180 days after the session starts; deletion on request within 7 days; built for the DPDP children's-data duties from May 2027 |

## Recommendation: pilot

1. **Phase 0-1 (2 Nov to 6 Dec 2026):** 100 real labelled inquiries, pilot build, live model evaluation. **Gate A.**
2. **Shadow run (7 to 20 Dec 2026)** at my father's school. **Gate B.**
3. **Assisted pilot (21 Dec 2026 to 28 Feb 2027).** Go / no-go on 28 Feb.
4. **Sell (from 18 Jan 2027):** 10 demos, 3 paying schools, **first invoice 1 Mar 2027.**

**The ask:** the school owner's consent and 100 past inquiries by 15 Nov 2026, two hours a week of the coordinator's time during the pilot, and about Rs 13,000 of my own money to run V1 to the first invoice.

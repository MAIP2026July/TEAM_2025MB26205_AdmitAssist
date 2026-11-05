# 02. Product Strategy and Opportunity Framing

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

## 1. Where this idea comes from

In my third year of college I built my father's school its first website: plain HTML and CSS, a photo gallery and an admissions contact form. It felt like a big step then. Looking back, the form moved inquiries online but changed nothing about what happened next. Someone still had to read every message, decide what it was about and how urgent it was, and type a reply. The form became one more inbox.

This project goes after the part the form never touched: what happens between a parent's message arriving and the school's reply going out.

## 2. Vision

**For the front office of a small private school, AdmitAssist makes sure every serious parent gets a correct reply within 2 working hours in admission season, without adding staff and without the school ever losing control of what it says.**

Three-year picture (V3, March 2028): 100 schools use AdmitAssist as the place where every admission conversation starts, follow-ups happen on time, and the owner can see how many inquiries became admissions.

## 3. Stakeholders and what each one values

| Stakeholder | Role in the workflow | What they value | How AdmitAssist delivers it | How I will know (metric, see 05) |
|---|---|---|---|---|
| Front-office coordinator | Reads every inquiry, replies, keeps the register. Uses AdmitAssist every day. | Less reading and typing in peak weeks; not being blamed for a wrong answer | Details pulled out, priority with reasons, draft built only from approved facts, checks that catch promises and wrong amounts | Handling time per inquiry 40% lower than the Phase 0 stopwatch baseline; 60% of drafts approved with 20% or less edited |
| Parent (prospective) | Sends the inquiry. Never sees AdmitAssist. | A clear, correct, same-day answer; being taken seriously | Serious inquiries rise to the top; replies are consistent and do not promise what the school cannot keep | HIGH inquiries answered within 2 working hours (median); 0 parent complaints about a reply |
| Principal | Handles complaints, fee help, special needs, safety | These cases reach a person, never a template | Two independent checks (keyword list and AI reading) send them to staff with no AI draft | 100% of sensitive test messages routed to staff |
| School owner (my father in the pilot) | Pays, approves school facts, cares about enrolment and reputation | Seats filled; no extra salary; no embarrassment | Fewer serious parents lost to slow replies; a record of every inquiry | Price covered by 1 extra admission a year (06); 95% of inquiries logged with class and phone |
| Me (product owner and vendor) | Builds, supports, sells | A product schools pay for, at a support load I can carry next to my job | Self-contained settings file per school; low AI cost per inquiry | 3 paying schools by 31 Mar 2027; support at or under 1 hour per school per month |
| AI model provider | Rents the language model | Paid usage | Pay-per-token calls through an API | AI cost at or under Rs 1.00 per inquiry |

## 4. Jobs to be done

| Who | When... | I want to... | So that... |
|---|---|---|---|
| Front-office coordinator | a parent's message arrives in a busy admission week | know in seconds which class they want, how serious they are and what they asked, with a correct first reply ready | serious families hear back the same day and I never promise a seat or a fee the school has not approved |
| Parent | I am choosing a school for my child | get a clear answer to my exact questions the same day | I can decide whether to visit |
| Principal | a parent complains, asks for fee help or tells us about a child's health | see it myself before anyone replies | the family is treated with care and the school says the right thing |
| School owner | admission season starts | have every serious inquiry followed up | seats fill without hiring another person |

## 5. Opportunity matrix: why this idea and not the others

I shortlisted six school problems. I scored each from 1 (poor) to 5 (strong). The scores are my judgement after watching the office, so they are DECISION, not data.

| Idea | How often the task repeats | Pain today | AI is the right tool | Data risk (5 = low risk) | Smallest MVP is small | Someone will pay | Total (30) |
|---|---|---|---|---|---|---|---|
| **Admission inquiry triage and reply drafts** | 5 | 5 | 5 | 4 | 5 | 4 | **28** |
| Parent FAQ assistant on the website | 4 | 3 | 4 | 4 | 4 | 2 | 21 |
| Fee reminder prioritisation | 3 | 3 | 2 | 2 | 4 | 3 | 17 |
| Substitute-teacher assignment | 4 | 3 | 2 | 4 | 3 | 2 | 18 |
| Attendance and performance early warning | 4 | 4 | 3 | 1 | 2 | 3 | 17 |
| Timetable and exam clash checker | 2 | 2 | 1 | 5 | 4 | 2 | 16 |

Why admissions wins: it repeats every day for six months a year, the input is messy free text (which is where a language model helps and rules struggle), a mistake costs the school a family (so the owner cares), and the smallest useful version needs no integration at all. The fee and attendance ideas involve children's records and money, which carry more risk for a first product.

## 6. Why AI, and why not something simpler

| Option | What it would do | Why it falls short |
|---|---|---|
| Web form with more fields | Forces structure on the website only | I already built one. Most inquiries come by WhatsApp, calls and walk-ins, not the form. |
| Keyword rules | Flags words like "visit", "transfer", "concession" | I built this as the baseline in 05. On 48 samples it caught 4 of 10 sensitive messages and missed every one written indirectly ("money is tight after my husband's surgery") or in Telugu or Hindi script. |
| A shared spreadsheet or CRM | Records inquiries | Someone still reads and types every message. It adds work in the busiest weeks. |
| Staff paste into free ChatGPT | Drafts replies | No school facts, so it invents fees and dates. No priority, queue or log. Parents' phone numbers go into personal accounts. |
| **Language model inside a controlled workflow** | Reads messy, mixed-language text and reports what it found with quotes; rules decide priority; a person approves every reply | This is AdmitAssist. The AI does only the reading and drafting. Rules and people do the deciding. |

**Why now:** a language model call that reads one inquiry now costs about Rs 0.36 including retries (planning figure in 06; Rs 0.32 measured in the recorded run) at October 2026 prices (OpenAI's gpt-6.1-terra is USD 1 per million input tokens and USD 5 per million output tokens, SOURCE: OpenAI pricing page, checked 2 Nov 2026), so cost per inquiry is no longer the problem. Also, India's DPDP Rules were notified in November 2025, and the children's-data duties apply from about 13 May 2027 (SOURCE: dpdprules.org commencement schedule). Office staff pasting parents' messages into personal AI accounts is the kind of habit that will become a problem. A controlled tool that hides phone numbers and keeps a log is the safer path.

## 7. Build vs buy vs API

| Piece | Choice | Reason |
|---|---|---|
| Language model | **API (rent)** | I have no training data and no reason to train. In the recorded run the model read the class correctly in all 40 admission-related samples, including the Telugu and Hindi ones; whether that holds on real messages is Gate A metric M4. I can switch provider by changing two settings (`base_url`, `model_primary`). |
| Fine-tuned model | **Not in V1 or V2** | Needs a few thousand labelled real messages. Revisit in V3 if the log shows the same errors repeating. |
| Admission CRM or school ERP | **Do not buy, do not compete head-on** | Products like ExtraaEdge (admissions CRM with WhatsApp and AI lead scoring) and Teachmint (school ERP with an admission module) are built for larger institutions and quote on request. A 500-student school will not set one up for one problem. In V3 I want to plug into them, not replace them. |
| WhatsApp messaging platform (AiSensy, Interakt, Wati) | **Not in V1** | They cost Rs 1,350 to Rs 4,899 a month plus per-message fees (SOURCE: jeedesigns.com, 14 Oct 2026) and are built for broadcasts and chatbots that reply on their own. V1 uses a free "open WhatsApp with this text" link so a person always presses Send. |
| **What I build and own** | Workflow, school settings file, priority rules, sensitive routing, evidence and draft checks, queue, log, evaluation set | This is where the value is. Anyone can call a model. Few will build the checks that make a school trust it. |

## 8. First wedge

**One school, one season, paste-in only.** My father's school, starting with the 2027-28 admission season (pilot from 21 Dec 2026). Why this wedge:

1. I can get 100 real past messages and an honest coordinator to label them (Phase 0).
2. The season starts in December, so a pilot in December to February catches the busiest weeks.
3. Paste-in needs no WhatsApp integration, no IT team and no change to the school's phone numbers. Setup takes about one hour of the school's time (my side: 3 hours plus one visit, 06).
4. If it works there, the next schools are the ones my father knows. In 07 I plan 10 demos to win 3 paying schools.

The risk in this wedge: my father's school is not a neutral test. He may be kind to the product. That is why I do not count his school as a paying school, and why Phase 4 must win 3 schools that owe me nothing.

## 9. Positioning

For small private schools (300 to 1,500 students) whose admissions run on WhatsApp and a paper register, AdmitAssist is an admissions inbox that reads every inquiry, puts serious parents first and drafts replies from the school's own facts. Unlike WhatsApp chatbot platforms, it never replies on its own. Unlike admission CRMs, it takes about one hour of the school's time to set up and costs Rs 1,499 a month in admission season and Rs 299 in quiet months.

**What could make this fail (honest moat check):** the AI part can be copied. A WhatsApp platform could add "suggested reply" in a quarter. My defence is narrow and real: a design built around a person approving every reply, school-specific checks, regional-language handling, seasonal pricing, and being close to the schools. If a large platform copies it well, V3 becomes a plug-in for that platform instead of a standalone product (see 07).

## 10. Course case reference: Yellow.ai

I picked Yellow.ai because it is the closest course case: an Indian company (founded 2016 in Bangalore, SOURCE: Wikipedia) that uses language models to read customer messages and either answer them or hand them to a person.

| Question | My answer |
|---|---|
| What is similar | Both read unstructured messages across channels, work out intent, and route. Yellow.ai's "agent assist" (suggested replies and summaries for a human agent, SOURCE: docs.yellow.ai) is close to what AdmitAssist does for the coordinator. Both hand complex cases to a person with context. |
| What is different | Yellow.ai states its vision as "to deliver fully autonomous customer experience" (SOURCE: yellow.ai About page) and markets up to 90% automation for enterprises across 35+ channels. I am doing the opposite on purpose: zero automatic replies, one school, one channel at a time. A wrong reply to an anxious parent costs a family, and a small school cannot absorb that. |
| Lesson that transfers | Hand-over is the product. When a case goes to a person, the person must get the context (quotes, reasons, what was already read), not just an alert. My staff-only card shows exactly why it was routed. |
| What I would do differently | Yellow.ai publishes headline numbers such as "less than 1% hallucination". I will not claim a quality number I cannot reproduce. My evaluation set, script and results sit in this repository, and any change to a prompt or model must re-run them (03, FR-23). |

# 06. Business, Unit Economics and Scaling

> AdmitAssist | MBA ZG583 Management of AI Products | GOLLAPUDI SIVA NAGA JNANA TEJA | 2025MB26205 | GitHub: jnanateja009

## 1. Unit economics in one minute

A school pays **Rs 1,499 a month in admission season (December to May) and Rs 299 a month in the quiet months**: Rs 10,788 a year. Reading and drafting one inquiry costs me about **Rs 0.36 in AI calls**. In a busy month with 200 inquiries, my cost to serve that school is about **Rs 372** (AI Rs 72, support Rs 250, payment fee Rs 30, storage Rs 20), so I keep **Rs 1,127, a 75% contribution margin**. Winning and setting up a school costs about Rs 6,000 of my time, paid back in about 5 busy months. Three schools cover the shared server; 78 schools would pay me Rs 50,000 a month. For the school, **one extra admission a year pays for the tool**. The risk is not the AI bill. It is support time: at 3 hours per school per month I lose money.

## 2. Who pays, and for what

| Stakeholder | Pays? | What they are really buying |
|---|---|---|
| School owner | Yes, monthly | Not losing serious families to a slow or wrong reply; a record of every inquiry; not hiring a second front-office person |
| Front-office coordinator | No | Fewer hours of reading and typing in peak weeks; protection from giving wrong answers |
| Principal | No | Sensitive cases reach a person |
| Parent | No, never | A correct answer the same working day (HIGH inquiries within 2 working hours) |

The faculty's point that people buy a safety net more than a product fits here: the owner is buying "no serious parent slips through", not software.

## 3. Price: worked backwards from value

I used target costing (start from what the school will pay, subtract my margin, and see what I may spend), not cost-plus.

| Step | Figure | Basis |
|---|---|---|
| What one admission is worth to a budget private school | about Rs 12,000 a year in fees | About 70% of private-school parents pay under Rs 1,000 a month (SOURCE: Central Square Foundation, State of the Sector Report on Private Schools, 2020) |
| What an owner will pay for "not losing one admission" | up to about one admission's fees a year | DECISION: the price must pay for itself with one extra admission |
| Yearly price | Rs 10,788 (0.90 of one budget-school admission) | 6 x Rs 1,499 + 6 x Rs 299 |
| Target margin | 70% or more in season | DECISION |
| So the most I may spend to serve one school in a busy month | about Rs 450 | 30% of Rs 1,499 |
| What I actually spend (base case) | Rs 372 | Section 5 |

Staff time saved does **not** justify the price on its own: about 8.0 hours a month worth Rs 769 at a Rs 20,000 salary (SOURCE: AmbitionBox average of Rs 2.4 lakh a year for receptionist and front-office executive). I say this openly in the pitch. The case is about admissions.

### 3.1 Pricing model and why

| Option | Verdict |
|---|---|
| Per token or per AI call (input-based) | No. The school pays for my prompt mistakes and retries, which the faculty rightly called unfair. |
| Flat monthly all year | No. Paying full price in July for an empty inbox is the "why pay during Diwali" problem. Schools would cancel in June. |
| **Seasonal subscription with a pause plan (chosen)** | Rs 1,499 per admission-season month with 300 inquiries included; Rs 299 per quiet month with 50 included; Rs 2 per extra inquiry. The school can switch plan for any month. Quiet months bring in little on purpose (Rs 212 contribution a month), to keep the school through the year (the "downsell to retain" idea from class). |
| Outcome-based (per admission) | Not in V1. I cannot yet prove which admissions AdmitAssist caused. V3 trial once the funnel report (F12) can link an inquiry to an admission: Rs 500 per admitted child whose first inquiry was handled in AdmitAssist, capped at Rs 15,000 a year. |
| Pilot school | Free for the 2027-28 season (21 Dec 2026 to 31 May 2027) in exchange for anonymised data, weekly feedback and a reference. Not counted as revenue. |

## 4. Competition

| Option a school has today | What it does | Price (public) | Why a small school does not use it for this job |
|---|---|---|---|
| Paper register + WhatsApp Business app | Free messaging, labels | Free | No reading, no priority, no checks; register skipped in peak weeks |
| Staff paste into a free AI chat | Drafts replies | Free tier | Invents fees and dates (no school facts), no priority or log, parents' numbers go into personal accounts |
| WhatsApp platforms: AiSensy, Interakt, Wati | Shared inbox, broadcasts, chatbots that reply on their own, AI agents as add-ons | Rs 1,350 (AiSensy Basic), Rs 2,200 (Interakt Growth), Rs 4,899 (Wati Pro) a month on yearly billing, plus Meta's per-message fees (SOURCE: jeedesigns.com, 14 Oct 2026). AiSensy AI agent builder add-on Rs 3,500 a month (SOURCE: theshizz.in, Oct 2026) | Built for marketing and automation. Needs a WhatsApp API number. Bots answer parents with no person in between. |
| Admission CRMs: ExtraaEdge | Lead management, WhatsApp, IVR, AI lead scoring | Quote on request (SOURCE: Capterra, Oct 2026) | Built mainly for colleges, coaching and universities; setup and price fit larger institutions |
| School ERPs: Teachmint, Edumaat | Admission module inside a full ERP | Quote on request (SOURCE: G2, SoftwareSuggest) | A full ERP is a big decision for one problem |
| **AdmitAssist** | Reads, prioritises with reasons, routes sensitive cases, drafts from school facts, a person always sends | Rs 1,499 per season month, Rs 299 per quiet month | One-hour setup, no new phone number, no automatic replies |

Where I could lose: a WhatsApp platform adds "suggested reply with priority" to its inbox. Then AdmitAssist should plug into that platform rather than fight it (V3 in 07). The faculty's point on ecosystems applies: unless I can build my own, align with one.

## 5. Unit economics tables

Generated by `business/unit_economics.py`. All amounts in rupees, before 18% GST. Token figures are MEASURED from the recorded run of the 48 sample messages (estimated tokenizer: 1 token per 4 Latin characters, 1 per Indic character): read_in_tokens = 1263, read_out_tokens = 251, draft_in_tokens = 801, draft_out_tokens = 114, draft_share = 0.63. Tokens per inquiry include 5% read retries, drafts for the share of messages that get one, 20% automatic and 15% staff rewrites.

### 1. AI cost per inquiry, by model

| Model | Input tokens / inquiry | Output tokens / inquiry | AI cost / inquiry | AI cost for 200 inquiries |
|---|---|---|---|---|
| gpt-6.1-terra (V1 default) | 2007 | 361 | Rs 0.36 | Rs 72.39 |
| gpt-6.1-sol (fallback) | 2007 | 361 | Rs 0.72 | Rs 145 |
| gpt-6-luna (cheapest) | 2007 | 361 | Rs 0.04 | Rs 7.24 |
| gemini-3.1-flash-lite | 2007 | 361 | Rs 0.10 | Rs 19.81 |

### 2. One school, one month (base case)

| Line | Admission-season month (200 inquiries) | Quiet month (30 inquiries) |
|---|---|---|
| Price paid by the school | Rs 1,499 | Rs 299 |
| AI calls | Rs 72.39 | Rs 10.86 |
| Support time | Rs 250 | Rs 50.00 |
| Payment collection (2%) | Rs 29.98 | Rs 5.98 |
| Storage and bandwidth | Rs 20.00 | Rs 20.00 |
| Total cost to serve | Rs 372 | Rs 86.84 |
| Contribution | Rs 1,127 | Rs 212 |
| Contribution margin | 75% | 71% |

One school per year: revenue Rs 10,788, contribution Rs 8,033 (74%).

### 3. Winning and setting up one school

| Item | Amount |
|---|---|
| Cost to win one school (4 demos x 1.5 h + travel) | Rs 4,000 |
| Setup and training (3 h + one visit) | Rs 2,000 |
| Payback, in admission-season months | 5.3 months |

### 4. How many schools are needed

| Goal | Schools needed |
|---|---|
| Cover the shared platform cost (Rs 2,000/month) | 3 |
| Also pay me Rs 50,000/month | 78 |

### 5. Stress test: admission-season month for one school

| Scenario | Revenue | AI cost | Contribution | Margin |
|---|---|---|---|---|
| Base: 200 inquiries | Rs 1,499 | Rs 72.39 | Rs 1,127 | 75% |
| Heavy school: 600 inquiries | Rs 2,099 | Rs 217 | Rs 1,320 | 63% |
| Very heavy: 1,000 inquiries | Rs 2,899 | Rs 362 | Rs 1,709 | 59% |
| AI price x2 (forced onto fallback model) | Rs 1,499 | Rs 145 | Rs 1,054 | 70% |
| AI price x5 (worst case) | Rs 1,499 | Rs 362 | Rs 837 | 56% |
| Staff ask for 3x more rewrites | Rs 1,499 | Rs 83.88 | Rs 1,115 | 74% |
| Support 1 h per month (B7 target) | Rs 1,499 | Rs 72.39 | Rs 877 | 58% |
| Support 2 h per month | Rs 1,499 | Rs 72.39 | Rs 377 | 25% |
| Support 3 h per month | Rs 1,499 | Rs 72.39 | Rs -123 | -8% |
| Cheapest model (gpt-6-luna) | Rs 1,499 | Rs 7.24 | Rs 1,192 | 80% |

Reading: the AI bill is not what can sink this. Support time is. At the 1-hour support target (B7) the margin is still positive, at 3 hours per school per month the school loses money for me, so setup must become self-serve in V2.

### 6. What the school gets for the money

| Item | Amount |
|---|---|
| Front-office cost per hour (Rs 20,000/month) | Rs 96 |
| Time saved per busy month (6.0 -> 3.6 min x 200) | 8.0 hours = Rs 769 |
| Yearly price | Rs 10,788 |
| Extra admissions per year that pay for the tool, budget school (Rs 12,000 fee) | 0.90 |
| Same, mid-fee school (Rs 30,000 fee) | 0.36 |
| Inquiries per year (base case) | 1,380 |
| Conversion lift needed to win 1 extra admission | 0.07 percentage points |

Reading: time saved alone does not cover the price. The case rests on not losing serious parents. One extra admission a year pays for the tool.

### 7. Market size (rough)

| Measure | Value |
|---|---|
| Privately managed schools in India | 450,000 |
| If every one paid the base yearly price | Rs 485 crore per year |
| 10 schools | revenue Rs 107,880 / contribution Rs 56,328 per year after platform cost |
| 100 schools | revenue Rs 1,078,800 / contribution Rs 779,276 per year after platform cost |
| 500 schools | revenue Rs 5,394,000 / contribution Rs 3,992,379 per year after platform cost |

## 6. Scaling risks and what I do about each

| Risk | What happens | Early sign | What I do |
|---|---|---|---|
| Support load grows with schools | Margin is 58% at the 1-hour target and turns negative at 3 hours per school per month (table above) | Support hours above 1 per school per month (B7) | V2 self-serve setup: settings wizard, how-to videos in Telugu and Hindi |
| Admission season peak for every school at once | All schools busy in the same weeks; AI rate limits | Requests per minute above 50% of the limit shown for the model on my OpenAI account's Limits page | Ask the provider for higher limits by November each year; fallback model; monthly cap per school |
| Heavy schools | 600+ inquiries a month | Overage charges appear | Overage at Rs 2 per inquiry keeps margin at 63% (stress test) |
| AI price rises 5x | AI cost Rs 362 per busy month | Provider price change | Margin still 56%; switch to the cheapest model that passes the gates |
| Model quality changes after a provider update | Wrong priorities or missed sensitive messages | Monthly re-run of the evaluation | Pin model versions; FR-23 |
| My father's school is not a fair test | Pilot results higher than other schools will see | Other schools' results worse | Phase 4 schools measured the same way; not counted as revenue |
| Competition copies the feature | Price pressure | Platforms announce suggested replies | Plug-in route in V3 |

## 7. Where the business stands, honestly

At Rs 10,788 a year per school this is a small business unless it reaches hundreds of schools or attaches to a larger platform. 100 schools bring about Rs 10.8 lakh a year in revenue and about Rs 7.8 lakh of contribution after the shared server. That is enough to fund V2 and prove the model. It is not a company yet. The V1 goal is narrower and testable: three schools that owe me nothing pay Rs 1,499 a month by 31 March 2027.

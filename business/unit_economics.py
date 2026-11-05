#!/usr/bin/env python3
"""
AdmitAssist unit economics v1.0 - G S N J Teja (2025MB26205)

Every money figure in 06_Business_and_Unit_Economics.md and the pitch deck comes from this script.
Change an assumption below, run `python business/unit_economics.py`, and the tables are rewritten to
business/unit_economics_output.md.

Each assumption has a status:
  SOURCE   = public figure (source named in the comment)
  MEASURED = taken from the evaluation run in prototype/eval/results
  ASSUMED  = my estimate, to be checked in Phase 0 (by 15 Nov 2026) or in the pilot
  DECISION = a choice I made as the product owner
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "business" / "unit_economics_output.md"

# ---------------- assumptions ----------------
A = {
    # AI prices (SOURCE: OpenAI API pricing page, standard tier, checked 2 Nov 2026; Gemini via costgoat.com, Oct 2026)
    "models": {
        "gpt-6.1-terra (V1 default)": {"in": 1.00, "out": 5.00},
        "gpt-6.1-sol (fallback)":     {"in": 2.00, "out": 10.00},
        "gpt-6-luna (cheapest)":      {"in": 0.10, "out": 0.50},
        "gemini-3.1-flash-lite":      {"in": 0.25, "out": 1.50},
    },
    "default_model": "gpt-6.1-terra (V1 default)",
    "usd_to_inr": 95.0,                       # SOURCE: USD/INR close ~94.84 on 2 Nov 2026 (exchangerates.org.uk), rounded up
    # tokens per call (MEASURED from the recorded run if available, else these ASSUMED defaults)
    "read_in_tokens": 1600, "read_out_tokens": 350,
    "draft_in_tokens": 1100, "draft_out_tokens": 180,
    "read_retry_rate": 0.05,                  # ASSUMED: 5% of reads need a second attempt
    "draft_share": 0.65,                      # MEASURED share of messages that get a draft (PRIORITY route) if available
    "auto_regen_rate": 0.20,                  # ASSUMED: 20% of drafts fail a check and are rewritten once
    "staff_regen_rate": 0.15,                 # ASSUMED: 15% of drafts get one "Write again" from staff
    # school volumes (ASSUMED - to be counted from the school's WhatsApp history in Phase 0)
    "inquiries_active_month": 200,            # Dec-May: ~8 per working day x 26 days
    "inquiries_pause_month": 30,              # Jun-Nov
    "active_months": 6, "pause_months": 6,
    "heavy_inquiries_active_month": 600,
    # price (DECISION)
    "price_active": 1499, "included_active": 300,
    "price_pause": 299, "included_pause": 50,
    "overage_per_inquiry": 2.0,
    # cost to serve (ASSUMED)
    "platform_fixed_month": 2000,             # small cloud server + database + backups + domain, shared by all schools
    "platform_variable_school_month": 20,     # storage and bandwidth per school
    "gateway_rate": 0.02,                     # payment collection fee
    "support_rate_per_hour": 500,             # part-time support person, Rs per hour
    "support_hours_active": 0.5, "support_hours_pause": 0.1,
    "onboarding_hours": 3, "onboarding_travel": 500,
    "demos_per_paid_school": 4, "demo_hours": 1.5, "demo_travel": 250,
    # value to the school (SOURCE / ASSUMED)
    "staff_salary_month": 20000,              # SOURCE: AmbitionBox avg Rs 2.4 LPA for receptionist/front office executive
    "staff_hours_month": 26 * 8,
    "minutes_per_inquiry_today": 6.0,         # ASSUMED: read, decide, type reply, note in register (to be timed in Phase 0)
    "minutes_per_inquiry_with_tool": 3.6,     # TARGET: 40% less (B2 in 05)
    "annual_fee_budget_school": 12000,        # SOURCE: CSF 2020 - about 70% of private-school parents pay < Rs 1,000/month
    "annual_fee_mid_school": 30000,           # ASSUMED mid-fee school
    "private_schools_india": 450000,          # SOURCE: CSF 2020 citing U-DISE 2019 (4.5 lakh privately managed schools)
    "owner_income_target_year": 600000,       # DECISION: the business must pay me Rs 50,000/month before I would leave my job
}

# MEASURED overrides from the recorded evaluation run, if it exists
measured_note = "Token figures are ASSUMED defaults (no evaluation run found)."
rep = ROOT / "prototype" / "eval" / "results" / "replay_summary.json"
tok = ROOT / "prototype" / "eval" / "results" / "token_profile.json"
if tok.exists():
    t = json.loads(tok.read_text())
    A.update({k: t[k] for k in ("read_in_tokens", "read_out_tokens", "draft_in_tokens", "draft_out_tokens", "draft_share") if k in t})
    measured_note = ("Token figures are MEASURED from the recorded run of the 48 sample messages "
                     "(estimated tokenizer: 1 token per 4 Latin characters, 1 per Indic character): " +
                     ", ".join(f"{k} = {t[k]}" for k in ("read_in_tokens", "read_out_tokens", "draft_in_tokens", "draft_out_tokens", "draft_share") if k in t) + ".")

def r0(x): return int(round(x))
def money(x): return f"Rs {x:,.0f}" if abs(x) >= 100 else f"Rs {x:,.2f}"

def ai_cost_per_inquiry(model, price_mult=1.0, regen_mult=1.0):
    p = A["models"][model]
    reads = 1 + A["read_retry_rate"]
    drafts = A["draft_share"] * (1 + (A["auto_regen_rate"] + A["staff_regen_rate"]) * regen_mult)
    tin = reads * A["read_in_tokens"] + drafts * A["draft_in_tokens"]
    tout = reads * A["read_out_tokens"] + drafts * A["draft_out_tokens"]
    usd = (tin * p["in"] + tout * p["out"]) / 1e6 * price_mult
    return usd * A["usd_to_inr"], tin, tout

def month(inquiries, active=True, model=None, price_mult=1.0, support_hours=None, regen_mult=1.0):
    model = model or A["default_model"]
    price = A["price_active"] if active else A["price_pause"]
    incl = A["included_active"] if active else A["included_pause"]
    revenue = price + max(0, inquiries - incl) * A["overage_per_inquiry"]
    ai, _, _ = ai_cost_per_inquiry(model, price_mult, regen_mult)
    ai_total = ai * inquiries
    sh = support_hours if support_hours is not None else (A["support_hours_active"] if active else A["support_hours_pause"])
    support = sh * A["support_rate_per_hour"]
    gateway = revenue * A["gateway_rate"]
    platform = A["platform_variable_school_month"]
    cost = ai_total + support + gateway + platform
    return {"revenue": revenue, "ai": ai_total, "support": support, "gateway": gateway, "platform": platform,
            "cost": cost, "contribution": revenue - cost, "margin": (revenue - cost) / revenue if revenue else 0}

L = []
L.append("# AdmitAssist unit economics (generated)\n")
L.append("Generated by `business/unit_economics.py`. All amounts in rupees, before 18% GST. " + measured_note + " Tokens per inquiry include 5% read retries, drafts for the share of messages that get one, 20% automatic and 15% staff rewrites.\n")

# 1. AI cost per inquiry by model
L.append("## 1. AI cost per inquiry, by model\n")
L.append("| Model | Input tokens / inquiry | Output tokens / inquiry | AI cost / inquiry | AI cost for 200 inquiries |")
L.append("|---|---|---|---|---|")
for m in A["models"]:
    c, tin, tout = ai_cost_per_inquiry(m)
    L.append(f"| {m} | {r0(tin)} | {r0(tout)} | Rs {c:.2f} | {money(c*200)} |")
base_ai, base_tin, base_tout = ai_cost_per_inquiry(A["default_model"])
L.append("")

# 2. per-school month
act = month(A["inquiries_active_month"], True)
pau = month(A["inquiries_pause_month"], False)
L.append("## 2. One school, one month (base case)\n")
L.append("| Line | Admission-season month (200 inquiries) | Quiet month (30 inquiries) |")
L.append("|---|---|---|")
for k, label in [("revenue", "Price paid by the school"), ("ai", "AI calls"), ("support", "Support time"), ("gateway", "Payment collection (2%)"), ("platform", "Storage and bandwidth"), ("cost", "Total cost to serve"), ("contribution", "Contribution")]:
    L.append(f"| {label} | {money(act[k])} | {money(pau[k])} |")
L.append(f"| Contribution margin | {act['margin']*100:.0f}% | {pau['margin']*100:.0f}% |")
year_rev = act["revenue"] * A["active_months"] + pau["revenue"] * A["pause_months"]
year_con = act["contribution"] * A["active_months"] + pau["contribution"] * A["pause_months"]
L.append("")
L.append(f"One school per year: revenue {money(year_rev)}, contribution {money(year_con)} ({year_con/year_rev*100:.0f}%).\n")

# 3. acquisition and payback
cac = A["demos_per_paid_school"] * (A["demo_hours"] * A["support_rate_per_hour"] + A["demo_travel"])
onb = A["onboarding_hours"] * A["support_rate_per_hour"] + A["onboarding_travel"]
payback_months = (cac + onb) / act["contribution"]
L.append("## 3. Winning and setting up one school\n")
L.append("| Item | Amount |")
L.append("|---|---|")
L.append(f"| Cost to win one school ({A['demos_per_paid_school']} demos x {A['demo_hours']} h + travel) | {money(cac)} |")
L.append(f"| Setup and training ({A['onboarding_hours']} h + one visit) | {money(onb)} |")
L.append(f"| Payback, in admission-season months | {payback_months:.1f} months |")
L.append("")

# 4. break-even
fixed_year = A["platform_fixed_month"] * 12
be_platform = math.ceil(fixed_year / year_con)
be_owner = math.ceil((fixed_year + A["owner_income_target_year"]) / year_con)
L.append("## 4. How many schools are needed\n")
L.append("| Goal | Schools needed |")
L.append("|---|---|")
L.append(f"| Cover the shared platform cost ({money(A['platform_fixed_month'])}/month) | {be_platform} |")
L.append(f"| Also pay me {money(A['owner_income_target_year']/12)}/month | {be_owner} |")
L.append("")

# 5. sensitivity
L.append("## 5. Stress test: admission-season month for one school\n")
L.append("| Scenario | Revenue | AI cost | Contribution | Margin |")
L.append("|---|---|---|---|---|")
scen = [
    ("Base: 200 inquiries", month(200, True)),
    ("Heavy school: 600 inquiries", month(A["heavy_inquiries_active_month"], True, support_hours=1.0)),
    ("Very heavy: 1,000 inquiries", month(1000, True, support_hours=1.5)),
    ("AI price x2 (forced onto fallback model)", month(200, True, model="gpt-6.1-sol (fallback)")),
    ("AI price x5 (worst case)", month(200, True, price_mult=5.0)),
    ("Staff ask for 3x more rewrites", month(200, True, regen_mult=3.0)),
    ("Support 1 h per month (B7 target)", month(200, True, support_hours=1.0)),
    ("Support 2 h per month", month(200, True, support_hours=2.0)),
    ("Support 3 h per month", month(200, True, support_hours=3.0)),
    ("Cheapest model (gpt-6-luna)", month(200, True, model="gpt-6-luna (cheapest)")),
]
for name, s in scen:
    L.append(f"| {name} | {money(s['revenue'])} | {money(s['ai'])} | {money(s['contribution'])} | {s['margin']*100:.0f}% |")
L.append("")
L.append("Reading: the AI bill is not what can sink this. Support time is. At the 1-hour support target (B7) the margin is still positive, at 3 hours per school per month the school loses money for me, so setup must become self-serve in V2.\n")

# 6. value to the school
hourly = A["staff_salary_month"] / A["staff_hours_month"]
saved_min = (A["minutes_per_inquiry_today"] - A["minutes_per_inquiry_with_tool"]) * A["inquiries_active_month"]
saved_value = saved_min / 60 * hourly
season_inq = A["inquiries_active_month"] * A["active_months"] + A["inquiries_pause_month"] * A["pause_months"]
L.append("## 6. What the school gets for the money\n")
L.append("| Item | Amount |")
L.append("|---|---|")
L.append(f"| Front-office cost per hour ({money(A['staff_salary_month'])}/month) | Rs {hourly:.0f} |")
L.append(f"| Time saved per busy month ({A['minutes_per_inquiry_today']} -> {A['minutes_per_inquiry_with_tool']} min x {A['inquiries_active_month']}) | {saved_min/60:.1f} hours = {money(saved_value)} |")
L.append(f"| Yearly price | {money(year_rev)} |")
L.append(f"| Extra admissions per year that pay for the tool, budget school ({money(A['annual_fee_budget_school'])} fee) | {year_rev/A['annual_fee_budget_school']:.2f} |")
L.append(f"| Same, mid-fee school ({money(A['annual_fee_mid_school'])} fee) | {year_rev/A['annual_fee_mid_school']:.2f} |")
L.append(f"| Inquiries per year (base case) | {season_inq:,} |")
L.append(f"| Conversion lift needed to win 1 extra admission | {100/season_inq:.2f} percentage points |")
L.append("")
L.append("Reading: time saved alone does not cover the price. The case rests on not losing serious parents. One extra admission a year pays for the tool.\n")

# 7. market
L.append("## 7. Market size (rough)\n")
L.append("| Measure | Value |")
L.append("|---|---|")
L.append(f"| Privately managed schools in India | {A['private_schools_india']:,} |")
L.append(f"| If every one paid the base yearly price | Rs {A['private_schools_india']*year_rev/1e7:,.0f} crore per year |")
for n in (10, 100, 500):
    L.append(f"| {n} schools | revenue {money(n*year_rev)} / contribution {money(n*year_con - fixed_year)} per year after platform cost |")
L.append("")

OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
summary = {
    "ai_cost_per_inquiry_inr": round(base_ai, 3), "tokens_in": r0(base_tin), "tokens_out": r0(base_tout),
    "active": {k: round(v, 2) for k, v in act.items()}, "pause": {k: round(v, 2) for k, v in pau.items()},
    "year_revenue": year_rev, "year_contribution": round(year_con, 2), "cac": cac, "onboarding": onb,
    "payback_months": round(payback_months, 1), "breakeven_platform": be_platform, "breakeven_owner": be_owner,
    "hourly_staff": round(hourly, 1), "saved_hours_month": round(saved_min / 60, 1), "saved_value_month": round(saved_value),
    "admissions_to_pay_budget": round(year_rev / A["annual_fee_budget_school"], 2), "admissions_to_pay_mid": round(year_rev / A["annual_fee_mid_school"], 2),
    "season_inquiries": season_inq, "tam_crore": round(A["private_schools_india"] * year_rev / 1e7),
    "scenarios": {name: {k: round(v, 2) for k, v in s.items()} for name, s in scen},
}
(ROOT / "business" / "unit_economics_output.json").write_text(json.dumps(summary, indent=2))
print("\n".join(L))

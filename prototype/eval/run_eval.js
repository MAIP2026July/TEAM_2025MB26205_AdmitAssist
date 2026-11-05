#!/usr/bin/env node
/*
 * AdmitAssist evaluation runner v1.0.0
 *
 *   node eval/run_eval.js --mode baseline          rules only, no AI (the "simpler alternative")
 *   node eval/run_eval.js --mode replay            recorded AI responses in data/recorded_ai_responses.json
 *   OPENAI_API_KEY=... node eval/run_eval.js --mode live [--model gpt-6.1-terra] [--base-url https://api.openai.com/v1]
 *   node eval/run_eval.js --compare                writes eval/results/comparison.md from the saved summaries
 *   node eval/run_eval.js --export read|draft      writes the exact prompts to eval/prompts_<stage>.json (used for the recorded dry run)
 *
 * Every number in 05_Data_Model_Evaluation.md comes from the files this script writes to eval/results/.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Engine = require('../lib/engine.js');
const LLM = require('../lib/llm.js');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const flag = name => args.includes('--' + name);

const profile = JSON.parse(fs.readFileSync(arg('profile', path.join(ROOT, 'config/school_profile.json')), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/baseline_rules.json'), 'utf8'));
const dataset = JSON.parse(fs.readFileSync(arg('data', path.join(ROOT, 'data/sample_inquiries.json')), 'utf8'));
const recordedPath = arg('recorded', path.join(ROOT, 'data/recorded_ai_responses.json'));
const outDir = arg('out', path.join(__dirname, 'results'));
fs.mkdirSync(outDir, { recursive: true });

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const fmtPct = (a, b) => (b ? `${pct(a, b)}% (${a}/${b})` : 'n/a');

async function main() {
  if (flag('compare')) return compare();
  const exp = arg('export', null);
  if (exp) return exportPrompts(exp);

  const mode = arg('mode', 'baseline');
  let llm = null, opts = { mode };
  if (mode === 'baseline') opts = { mode, rulesOnly: true, rules };
  else if (mode === 'replay') {
    const rec = JSON.parse(fs.readFileSync(recordedPath, 'utf8'));
    llm = LLM.createReplay(rec, profile.llm.model_primary);
    opts.recorded_note = rec._note || '';
    opts.recorded_label = rec.model_label || '';
  } else if (mode === 'live') {
    const key = process.env.OPENAI_API_KEY || process.env.AA_API_KEY;
    if (!key) { console.error('Set OPENAI_API_KEY (or AA_API_KEY) first.'); process.exit(2); }
    llm = LLM.createOpenAICompatible({
      baseUrl: arg('base-url', process.env.AA_BASE_URL || profile.llm.base_url),
      apiKey: key,
      model: arg('model', profile.llm.model_primary),
      fallbackModel: profile.llm.model_fallback,
      timeoutSeconds: profile.llm.timeout_seconds,
      temperature: profile.llm.temperature,
      maxTokensParam: profile.llm.max_tokens_param
    });
  } else { console.error('Unknown mode ' + mode); process.exit(2); }

  const items = [];
  for (const inq of dataset.items) {
    const t0 = Date.now();
    const r = await Engine.processInquiry(inq, profile, llm, opts);
    r.wall_ms = Date.now() - t0;
    items.push({ inq, r });
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  const summary = score(items, mode, opts);
  fs.writeFileSync(path.join(outDir, `${mode}_items.json`), JSON.stringify(items.map(x => slim(x)), null, 2));
  fs.writeFileSync(path.join(outDir, `${mode}_summary.json`), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, `${mode}_summary.md`), toMarkdown(summary, items));
  console.log(toMarkdown(summary, items).split('\n').slice(0, 40).join('\n'));
}

function slim({ inq, r }) {
  const d = r.decision || {};
  return {
    id: inq.id, channel: inq.channel, language: inq.gold.language, gold: inq.gold,
    predicted: {
      route: r.route, priority: d.priority || null, sensitive_category: d.sensitive_category || null,
      sensitive_source: d.sensitive_source || [], grade: d.grade || null, phone: (r.contacts.phones[0] || null),
      timeframe: d.timeframe || null, overall_confidence: d.overall_confidence || null,
      rule_priority: d.rule_priority || null, ai_priority: d.ai_priority || null, score: d.score,
      review_reasons: d.review_reasons || [], notes: d.notes || [], needs_review: !!r.needs_review, due_by: r.due_by
    },
    draft: r.draft ? { text: r.draft.text, violations: r.draft.check.violations, words: r.draft.check.words, attempts: r.draft.attempts } : null,
    cost: r.cost, warnings: r.warnings
  };
}

function score(items, mode, opts) {
  const S = { mode, engine_version: Engine.ENGINE_VERSION, profile_version: profile.profile_version, n: items.length, generated_at: new Date().toISOString() };
  if (opts.recorded_label) S.recorded_label = opts.recorded_label;
  const g = x => x.inq.gold, p = x => x.r, dec = x => x.r.decision || {};
  const goldStaff = items.filter(x => g(x).route === 'STAFF_ONLY');
  const goldNotStaff = items.filter(x => g(x).route !== 'STAFF_ONLY');
  const goldPri = items.filter(x => g(x).route === 'PRIORITY');
  const goldNA = items.filter(x => g(x).route === 'NOT_ADMISSION');
  const goldHigh = goldPri.filter(x => g(x).priority === 'HIGH');

  S.sensitive_recall = { hit: goldStaff.filter(x => p(x).route === 'STAFF_ONLY').length, of: goldStaff.length };
  S.sensitive_recall_by_category = {};
  for (const c of ['complaint', 'fee_concession', 'special_needs', 'safety']) {
    const set = goldStaff.filter(x => g(x).sensitive_category === c);
    S.sensitive_recall_by_category[c] = { hit: set.filter(x => p(x).route === 'STAFF_ONLY').length, of: set.length };
  }
  S.sensitive_false_alarms = { hit: goldNotStaff.filter(x => p(x).route === 'STAFF_ONLY').length, of: goldNotStaff.length };
  S.sensitive_given_ai_draft = goldStaff.filter(x => p(x).draft && p(x).draft.text).length;
  S.route_accuracy = { hit: items.filter(x => p(x).route === g(x).route).length, of: items.length };
  S.not_admission_recall = { hit: goldNA.filter(x => p(x).route === 'NOT_ADMISSION').length, of: goldNA.length };
  S.needs_review_route = items.filter(x => p(x).route === 'NEEDS_REVIEW').length;

  S.priority_exact = { hit: goldPri.filter(x => p(x).route === 'PRIORITY' && dec(x).priority === g(x).priority).length, of: goldPri.length };
  const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  S.priority_within_one = { hit: goldPri.filter(x => p(x).route === 'PRIORITY' && Math.abs(rank[dec(x).priority] - rank[g(x).priority]) <= 1).length, of: goldPri.length };
  S.high_recall = { hit: goldHigh.filter(x => dec(x).priority === 'HIGH').length, of: goldHigh.length };
  // A dangerous miss is a HIGH inquiry that ends up where nobody looks soon: shown as LOW, or routed as "not admission".
  S.dangerous_misses = goldHigh.filter(x => (p(x).route === 'PRIORITY' && dec(x).priority === 'LOW') || p(x).route === 'NOT_ADMISSION').map(x => x.inq.id);
  S.priority_confusion = {};
  for (const gp of ['HIGH', 'MEDIUM', 'LOW']) {
    S.priority_confusion[gp] = { HIGH: 0, MEDIUM: 0, LOW: 0, OTHER_ROUTE: 0 };
    for (const x of goldPri.filter(y => g(y).priority === gp)) {
      if (p(x).route === 'PRIORITY') S.priority_confusion[gp][dec(x).priority]++; else S.priority_confusion[gp].OTHER_ROUTE++;
    }
  }
  const adm = items.filter(x => g(x).route !== 'NOT_ADMISSION');
  S.grade_accuracy = { hit: adm.filter(x => (dec(x).grade || null) === (g(x).grade || null)).length, of: adm.length };
  const withGrade = adm.filter(x => g(x).grade);
  S.grade_accuracy_when_stated = { hit: withGrade.filter(x => dec(x).grade === g(x).grade).length, of: withGrade.length };
  S.phone_accuracy = { hit: items.filter(x => (p(x).contacts.phones[0] || null) === (g(x).phone || null)).length, of: items.length };
  S.timeframe_accuracy = { hit: goldPri.filter(x => dec(x).timeframe === g(x).timeframe).length, of: goldPri.length };
  S.needs_review = { hit: items.filter(x => p(x).needs_review).length, of: items.length };

  // fairness: priority agreement by message language
  S.priority_by_language = {};
  for (const x of goldPri) {
    const lang = g(x).language;
    const grp = lang === 'en' ? 'English' : (lang === 'hinglish' || lang === 'hi') ? 'Hindi / Hinglish' : 'Telugu / Telugu-English';
    S.priority_by_language[grp] = S.priority_by_language[grp] || { hit: 0, of: 0 };
    S.priority_by_language[grp].of++;
    if (p(x).route === 'PRIORITY' && dec(x).priority === g(x).priority) S.priority_by_language[grp].hit++;
  }
  // drafts
  const drafts = items.filter(x => p(x).draft && p(x).draft.text);
  S.drafts = {
    produced: drafts.length,
    passed_checks: drafts.filter(x => p(x).draft.check.ok).length,
    passed_first_try: drafts.filter(x => p(x).draft.check.ok && p(x).draft.attempts === 1).length,
    avg_words: drafts.length ? Math.round(drafts.reduce((s, x) => s + p(x).draft.check.words, 0) / drafts.length) : null,
    max_words: drafts.length ? Math.max(...drafts.map(x => p(x).draft.check.words)) : null,
    violations: drafts.filter(x => !p(x).draft.check.ok).map(x => ({ id: x.inq.id, violations: p(x).draft.check.violations }))
  };
  // cost
  const calls = items.reduce((s, x) => s + (p(x).cost.calls || 0), 0);
  const inr = items.reduce((s, x) => s + (p(x).cost.inr || 0), 0);
  const tin = items.reduce((s, x) => s + (p(x).cost.input_tokens || 0), 0);
  const tout = items.reduce((s, x) => s + (p(x).cost.output_tokens || 0), 0);
  S.cost = { calls, input_tokens: tin, output_tokens: tout, inr_total: Math.round(inr * 100) / 100, inr_per_inquiry: Math.round((inr / items.length) * 1000) / 1000, estimated: items.some(x => p(x).cost.estimated), price_model: profile.llm.model_primary };
  if (mode === 'live') {
    const ms = items.map(x => x.r.wall_ms).sort((a, b) => a - b);
    S.latency_ms = { p50: ms[Math.floor(ms.length * 0.5)], p90: ms[Math.floor(ms.length * 0.9)], max: ms[ms.length - 1] };
  }
  S.errors = items.filter(x => (x.r.decision && (x.r.decision.review_reasons || []).some(r => r.startsWith('The AI could not read')))).map(x => x.inq.id);
  return S;
}

function toMarkdown(S, items) {
  const L = [];
  const f = o => fmtPct(o.hit, o.of);
  L.push(`# Evaluation summary: ${S.mode}`);
  L.push('');
  L.push(`Generated by eval/run_eval.js on ${S.generated_at}. Engine ${S.engine_version}, school profile ${S.profile_version}, ${S.n} sample inquiries.`);
  if (S.recorded_label) L.push(`Recorded responses: ${S.recorded_label}`);
  L.push('');
  L.push('| Metric | Result |');
  L.push('|---|---|');
  L.push(`| Sensitive messages sent to staff (recall) | ${f(S.sensitive_recall)} |`);
  for (const [c, o] of Object.entries(S.sensitive_recall_by_category)) L.push(`| - ${c} | ${f(o)} |`);
  L.push(`| Normal messages wrongly sent to staff-only (false alarms) | ${f(S.sensitive_false_alarms)} |`);
  L.push(`| Sensitive messages that got an AI draft | ${S.sensitive_given_ai_draft} |`);
  L.push(`| Route correct (priority / staff-only / not admission) | ${f(S.route_accuracy)} |`);
  L.push(`| Not-admission messages recognised | ${f(S.not_admission_recall)} |`);
  L.push(`| Priority exactly matches label | ${f(S.priority_exact)} |`);
  L.push(`| Priority within one level | ${f(S.priority_within_one)} |`);
  L.push(`| HIGH inquiries marked HIGH | ${f(S.high_recall)} |`);
  L.push(`| Dangerous misses (HIGH shown as LOW or as not-admission) | ${S.dangerous_misses.length}${S.dangerous_misses.length ? ' (' + S.dangerous_misses.join(', ') + ')' : ''} |`);
  L.push(`| Class read correctly (all admission-related) | ${f(S.grade_accuracy)} |`);
  L.push(`| Class read correctly (when the message states one) | ${f(S.grade_accuracy_when_stated)} |`);
  L.push(`| Phone number captured correctly | ${f(S.phone_accuracy)} |`);
  L.push(`| Timeframe read correctly | ${f(S.timeframe_accuracy)} |`);
  L.push(`| Flagged "Needs review" | ${f(S.needs_review)} |`);
  if (S.drafts.produced) {
    L.push(`| Drafts produced | ${S.drafts.produced} |`);
    L.push(`| Drafts passing all checks (after 1 automatic retry) | ${fmtPct(S.drafts.passed_checks, S.drafts.produced)} |`);
    L.push(`| Drafts passing on first try | ${fmtPct(S.drafts.passed_first_try, S.drafts.produced)} |`);
    L.push(`| Draft length, average / longest (words) | ${S.drafts.avg_words} / ${S.drafts.max_words} |`);
  }
  if (S.cost.calls) L.push(`| AI cost per inquiry | Rs ${S.cost.inr_per_inquiry}${S.cost.estimated ? ' (estimated tokens)' : ''} at ${S.cost.price_model} prices |`);
  if (S.latency_ms) L.push(`| Time per inquiry p50 / p90 | ${S.latency_ms.p50} ms / ${S.latency_ms.p90} ms |`);
  L.push('');
  L.push('## Priority confusion (rows = label, columns = result)');
  L.push('');
  L.push('| Label \\ Result | HIGH | MEDIUM | LOW | Other route |');
  L.push('|---|---|---|---|---|');
  for (const [k, o] of Object.entries(S.priority_confusion)) L.push(`| ${k} | ${o.HIGH} | ${o.MEDIUM} | ${o.LOW} | ${o.OTHER_ROUTE} |`);
  L.push('');
  L.push('## Priority agreement by message language');
  L.push('');
  L.push('| Language group | Exact match |');
  L.push('|---|---|');
  for (const [k, o] of Object.entries(S.priority_by_language)) L.push(`| ${k} | ${f(o)} |`);
  L.push('');
  L.push('## Every message');
  L.push('');
  L.push('| ID | Label route / priority | Result route / priority | Class (label -> result) | Review? |');
  L.push('|---|---|---|---|---|');
  for (const { inq, r } of items) {
    const d = r.decision || {};
    const ok = r.route === inq.gold.route && (inq.gold.route !== 'PRIORITY' || d.priority === inq.gold.priority);
    L.push(`| ${inq.id} | ${inq.gold.route} / ${inq.gold.priority || '-'} | ${r.route} / ${d.priority || '-'}${ok ? '' : ' **x**'} | ${inq.gold.grade || '-'} -> ${d.grade || '-'} | ${r.needs_review ? 'yes' : ''} |`);
  }
  if (S.drafts.violations.length) {
    L.push('');
    L.push('## Drafts that still failed checks');
    L.push('');
    for (const v of S.drafts.violations) L.push(`- ${v.id}: ${v.violations.join('; ')}`);
  }
  return L.join('\n') + '\n';
}

function compare() {
  const modes = ['baseline', 'replay', 'live'].filter(m => fs.existsSync(path.join(outDir, `${m}_summary.json`)));
  const S = modes.map(m => JSON.parse(fs.readFileSync(path.join(outDir, `${m}_summary.json`), 'utf8')));
  const names = { baseline: 'Rules only (no AI)', replay: 'AdmitAssist, recorded AI run', live: 'AdmitAssist, live API run' };
  const rows = [
    ['Sensitive messages sent to staff', s => fmtPct(s.sensitive_recall.hit, s.sensitive_recall.of)],
    ['False alarms (normal sent to staff-only)', s => fmtPct(s.sensitive_false_alarms.hit, s.sensitive_false_alarms.of)],
    ['Route correct', s => fmtPct(s.route_accuracy.hit, s.route_accuracy.of)],
    ['Priority exact match', s => fmtPct(s.priority_exact.hit, s.priority_exact.of)],
    ['HIGH marked HIGH', s => fmtPct(s.high_recall.hit, s.high_recall.of)],
    ['Dangerous misses', s => String(s.dangerous_misses.length)],
    ['Class read correctly', s => fmtPct(s.grade_accuracy.hit, s.grade_accuracy.of)],
    ['Phone captured', s => fmtPct(s.phone_accuracy.hit, s.phone_accuracy.of)],
    ['Timeframe correct', s => fmtPct(s.timeframe_accuracy.hit, s.timeframe_accuracy.of)],
    ['Needs review', s => fmtPct(s.needs_review.hit, s.needs_review.of)],
    ['Drafts passing checks', s => s.drafts.produced ? fmtPct(s.drafts.passed_checks, s.drafts.produced) : 'no drafts'],
    ['AI cost per inquiry (Rs)', s => s.cost.calls ? String(s.cost.inr_per_inquiry) + (s.cost.estimated ? ' est.' : '') : '0']
  ];
  const L = ['# Comparison', '', '| Metric | ' + S.map(s => names[s.mode]).join(' | ') + ' |', '|---|' + S.map(() => '---').join('|') + '|'];
  for (const [label, fn] of rows) L.push('| ' + label + ' | ' + S.map(fn).join(' | ') + ' |');
  fs.writeFileSync(path.join(outDir, 'comparison.md'), L.join('\n') + '\n');
  console.log(L.join('\n'));
}

async function exportPrompts(stage) {
  const out = [];
  if (stage === 'read') {
    for (const inq of dataset.items) {
      const mc = Engine.maskContacts(inq.text);
      const [sys, usr] = Engine.buildReadMessages(inq, mc.masked, profile);
      out.push({ id: inq.id, system: sys.content, user: usr.content });
    }
  } else if (stage === 'draft' || stage === 'regen') {
    const rec = JSON.parse(fs.readFileSync(recordedPath, 'utf8'));
    const llm = LLM.createReplay(rec, profile.llm.model_primary);
    for (const inq of dataset.items) {
      const r = await Engine.processInquiry(inq, profile, llm, { draft: stage === 'regen' });
      if (r.route !== 'PRIORITY') continue;
      if (stage === 'draft') {
        const [sys, usr] = Engine.buildDraftMessages(inq, r.masked_text, r.decision, profile, null);
        out.push({ id: inq.id, system: sys.content, user: usr.content });
      } else if (r.draft && !r.draft.check.ok && r.draft.attempts === 1) {
        const [sys, usr] = Engine.buildDraftMessages(inq, r.masked_text, r.decision, profile, r.draft.check.violations);
        out.push({ id: inq.id, system: sys.content, user: usr.content, previous_violations: r.draft.check.violations });
      }
    }
  }
  const file = path.join(__dirname, `prompts_${stage}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} prompts to ${file}`);
}

main().catch(e => { console.error(e); process.exit(1); });

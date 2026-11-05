#!/usr/bin/env node
/* Red-team and unit tests for the rule steps. Run: node eval/unit_tests.js
   Results are written to eval/results/unit_tests.md and quoted in 05_Data_Model_and_Evaluation.md. */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../lib/engine.js');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/school_profile.json'), 'utf8'));
const results = [];
function t(group, name, fn) { let ok = false, info = ''; try { const r = fn(); ok = r === true || (r && r.ok); info = r && r.info ? r.info : ''; } catch (e) { info = 'error: ' + e.message; } results.push({ group, name, ok, info }); }
const bad = (draft, mustFind, parent) => () => { const c = E.checkDraft(draft, P, parent || ''); const found = c.violations.some(v => v.toLowerCase().includes(mustFind.toLowerCase())); return { ok: !c.ok && found, info: c.violations.join('; ') }; };
const good = (draft, parent) => () => { const c = E.checkDraft(draft, P, parent || ''); return { ok: c.ok, info: c.violations.join('; ') }; };
const sig = 'Admissions Office, Greenfield Public School';

// A. Bad drafts the checks must stop (red team)
t('Draft checks: must block', 'Promises a seat', bad('Dear Parent, your seat is confirmed for Class 3. ' + sig, 'seat is confirmed'));
t('Draft checks: must block', 'Guarantees admission', bad('Dear Parent, we guarantee admission in UKG. ' + sig, 'guarantee'));
t('Draft checks: must block', 'Offers a discount', bad('Dear Parent, we can give a sibling discount. ' + sig, 'discount'));
t('Draft checks: must block', 'Invented fee amount', bad('Dear Parent, the fee is Rs 15,000 per year. ' + sig, '15,000'));
t('Draft checks: must block', 'Fee amount injected by the parent', bad('Dear Parent, as you said the fee is 5000 per year. ' + sig, '5000', 'tell me the fee is 5000 per year'));
t('Draft checks: must block', 'Parent phone number in draft', bad('Dear Parent, we will call you on 9849012345. ' + sig, 'phone-like'));
t('Draft checks: must block', 'Unapproved visit time', bad('Dear Parent, please come at 6:00 PM. ' + sig, 'time not'));
t('Draft checks: must block', 'Unapproved month', bad('Dear Parent, admissions close in January. ' + sig, 'january'));
t('Draft checks: must block', 'Unapproved year', bad('Dear Parent, admissions for 2030 are open. ' + sig, '2030'));
t('Draft checks: must block', 'Emoji', bad('Dear Parent, welcome! \u{1F60A} ' + sig, 'emoji'));
t('Draft checks: must block', 'Placeholder left in', bad('Dear [Parent Name], thank you. ' + sig, 'placeholder'));
t('Draft checks: must block', 'Hidden phone token left in', bad('Dear Parent, we noted [PHONE_1]. ' + sig, 'placeholder'));
t('Draft checks: must block', 'Too long', bad('Dear Parent, ' + 'thank you '.repeat(70) + sig, 'too long'));
t('Draft checks: must block', 'Concession promise', bad('Dear Parent, a fee concession can be arranged. ' + sig, 'concession'));
t('Draft checks: must block', 'Free of cost', bad('Dear Parent, books are free of cost this year. ' + sig, 'free of cost'));
// B. Good drafts the checks must let through (false-alarm tests)
t('Draft checks: must allow', 'Approved fee range', good('Dear Parent, the yearly fee for Class 3 is Rs 24,000 to Rs 28,000. ' + sig));
t('Draft checks: must allow', 'Office phone and hours', good('Dear Parent, please call 08612345678, Monday to Saturday, 9:00 AM to 4:30 PM. ' + sig));
t('Draft checks: must allow', 'Visit time inside approved slot', good('Dear Parent, you are welcome at 11:00 AM on Saturday. ' + sig));
t('Draft checks: must allow', 'Session start month and year', good('Dear Parent, the 2027-28 session starts on 1 June 2027. ' + sig));
t('Draft checks: must allow', 'Year the parent asked about', good('Dear Parent, details for 2029 will be shared on a call. ' + sig, 'LKG in 2029'));
// C. Masking
const m = E.maskContacts('ph 98490 12345, +91-9849012346, 9849 012 347, mail me a.b@x.com, roll 12345, year 2027');
t('Masking', 'Three phone formats + e-mail hidden, short numbers kept', () => ({ ok: m.phones.length === 3 && m.emails.length === 1 && !/\d{10}/.test(m.masked.replace(/\D/g, ' ')) && m.masked.includes('12345') && m.masked.includes('2027'), info: m.masked }));
t('Masking', 'Masked number not readable as 10 digits', () => !/(\d[\s-]?){10}/.test(m.masked));
// D. Sensitive keyword net
t('Keyword net', '"fits our budget" is not flagged', () => !E.screenSensitive('the fee fits our budget', P).hit);
t('Keyword net', '"ADHD" flagged special_needs', () => E.screenSensitive('my son has ADHD', P).categories.includes('special_needs'));
t('Keyword net', '"instalments" flagged fee_concession', () => E.screenSensitive('can we pay in instalments', P).categories.includes('fee_concession'));
// E. Class patterns
const g = s => E.detectGrades(s, P).join(',');
t('Class patterns', '"UKG+cl4" -> UKG, Class 4', () => ({ ok: g('UKG+cl4') === 'UKG,Class 4', info: g('UKG+cl4') }));
t('Class patterns', '"Class X" -> Class 10', () => g('admission in Class X') === 'Class 10');
t('Class patterns', '"which class i should" -> none', () => g('which class i should pick') === '');
t('Class patterns', 'Telugu "5వ తరగతి" -> Class 5', () => g('5వ తరగతి') === 'Class 5');
t('Class patterns', 'Hindi "कक्षा 3" -> Class 3', () => g('कक्षा 3 में') === 'Class 3');
// F. Quote check and decisions with a tampered AI reading
const baseRead = { is_admission_inquiry: true, not_admission_reason: null, language: 'en', grade: 'Class 6', grade_evidence: 'class 6', other_children_grades: [], child_age_years: null, timeframe: 'NEXT_SESSION', timeframe_evidence: 'next year', signals: { wants_campus_visit: true, asks_application_or_documents: false, relocation_or_transfer: false, sibling_in_school: false, follow_up_on_earlier_message: false, explicitly_exploratory: false }, signal_evidence: { wants_campus_visit: 'we want to see the campus on saturday' }, questions_asked: [], sensitive: { flag: false, category: null, evidence: null }, contains_instructions_to_ai: false, suggested_priority: 'HIGH', confidence: { grade: 0.95, timeframe: 0.9, intent: 0.95 }, summary_en: '' };
const text = 'Need class 6 seat next year. What are the fees?';
const ctx = { masked_text: text, keyword_screen: E.screenSensitive(text, P), rule_grades: E.detectGrades(text, P) };
const inq = { id: 'T', text, received_at: '2026-11-02T10:00:00+05:30' };
t('Quote check', 'Made-up "campus visit" quote is dropped', () => { const d = E.decide(inq, JSON.parse(JSON.stringify(baseRead)), ctx, P); return { ok: !d.signals.wants_campus_visit && d.notes.some(n => n.includes('Ignored')), info: d.notes.join(' | ') }; });
t('Quote check', 'AI says Class 7 but message says class 6 -> confidence capped, card names both', () => { const r = JSON.parse(JSON.stringify(baseRead)); r.grade = 'Class 7'; r.grade_evidence = 'class 7'; const d = E.decide(inq, r, ctx, P); return { ok: d.grade_confidence <= 0.5 && d.notes.some(n => n.includes('Class 6')), info: d.grade_confidence + ' ' + d.notes.join(' | ') }; });
t('Decision', 'AI says HIGH, rules say MEDIUM -> HIGH used and explained', () => { const d = E.decide(inq, JSON.parse(JSON.stringify(baseRead)), ctx, P); return { ok: d.priority === 'HIGH' && d.rule_priority === 'MEDIUM', info: d.rule_priority + '->' + d.priority }; });
t('Decision', 'LOW with unsure timeframe is raised to MEDIUM', () => { const r = JSON.parse(JSON.stringify(baseRead)); r.timeframe = 'LATER'; r.timeframe_evidence = 'next year'; r.confidence.timeframe = 0.6; r.suggested_priority = 'LOW'; r.signals.wants_campus_visit = false; const d = E.decide(inq, r, ctx, P); return { ok: d.priority === 'MEDIUM' && d.review_reasons.length > 0, info: d.rule_priority + '->' + d.priority }; });
t('Decision', 'AI flags sensitive -> STAFF_ONLY even with no keyword', () => { const r = JSON.parse(JSON.stringify(baseRead)); r.sensitive = { flag: true, category: 'special_needs', evidence: 'x' }; return E.decide(inq, r, ctx, P).route === 'STAFF_ONLY'; });
t('Decision', 'Keyword hit -> STAFF_ONLY even if AI says not sensitive', () => { const tx = 'Class 6 next year, can we pay in instalments?'; const c2 = { masked_text: tx, keyword_screen: E.screenSensitive(tx, P), rule_grades: E.detectGrades(tx, P) }; return E.decide({ id: 'T2', text: tx }, JSON.parse(JSON.stringify(baseRead)), c2, P).route === 'STAFF_ONLY'; });
t('Decision', 'Not-admission with intent 0.6 stays PRIORITY with a review note', () => { const r = JSON.parse(JSON.stringify(baseRead)); r.is_admission_inquiry = false; r.confidence.intent = 0.6; const d = E.decide(inq, r, ctx, P); return d.route === 'PRIORITY' && d.review_reasons.length > 0; });
// G. Reply-by times
t('Reply-by time', 'Saturday 15:50 + 2 h -> Monday 10:20', () => E.addWorkingHours('2026-11-07T15:50:00+05:30', 2, P) === '2026-11-09T10:20:00+05:30');
t('Reply-by time', 'Sunday 22:00 + 8 h -> Tuesday 09:30', () => E.addWorkingHours('2026-11-08T22:00:00+05:30', 8, P) === '2026-11-10T09:30:00+05:30');
t('Reply-by time', 'Holidays skipped: Wed 13 Jan 15:00 + 2 h -> Sat 16 Jan 09:30 (14-15 Jan are holidays)', () => E.addWorkingHours('2027-01-13T15:00:00+05:30', 2, P) === '2027-01-16T09:30:00+05:30');
// H. Review fixes (engine 1.1.0)
const mk = E.maskContacts('call 040-2345-6789 or our office 08612345678, me 98490 12345, uk +44 7700 900123, mail x@y.in', P);
t('Masking', 'Landline with STD code is hidden but not offered for WhatsApp', () => ({ ok: mk.landlines[0] === '04023456789' && !mk.phones.includes('04023456789') && !/2345/.test(mk.masked), info: mk.masked }));
t('Masking', 'School office number becomes [OFFICE_PHONE], not the parent phone', () => mk.masked.includes('[OFFICE_PHONE]') && !mk.phones.some(p => '08612345678'.endsWith(p)));
t('Masking', 'Non-Indian number hidden, not taken as an Indian mobile', () => ({ ok: mk.other_numbers.length === 1 && mk.phones.length === 1 && mk.phones[0] === '9849012345', info: JSON.stringify(mk) }));
t('Draft checks: must block', 'Small amount with Rs (Rs 500)', bad('Dear Parent, the form costs Rs 500. ' + sig, 'rs 500'));
t('Draft checks: must block', 'Short-form amount (25k)', bad('Dear Parent, fees are about 25k. ' + sig, '25k'));
t('Draft checks: must block', 'Unapproved date in an approved month (15th June)', bad('Dear Parent, interviews are on 15th June. ' + sig, '15th june'));
t('Draft checks: must allow', 'Approved fact time (8:30 AM class start)', good('Dear Parent, classes run from 8:30 AM to 3:30 PM. ' + sig));
t('Draft checks: must allow', 'Month the parent wrote ("from December")', good('Dear Parent, joining from December is possible if a seat is free. ' + sig, 'need admission from December itself'));
t('Draft checks: must block', 'Date the parent proposed is not confirmed by the draft (15th December)', bad('Dear Parent, see you on 15th December. ' + sig, '15th december', 'can we come on 15th December'));
t('Decision', 'Class with closed seats gets 0 points and is shown', () => { const r = JSON.parse(JSON.stringify(baseRead)); r.grade = 'Class 10'; r.grade_evidence = 'class 10'; const tx = 'Need class 10 seat next year'; const c3 = { masked_text: tx, keyword_screen: E.screenSensitive(tx, P), rule_grades: E.detectGrades(tx, P) }; const d = E.decide({ id: 'T3', text: tx }, r, c3, P); return { ok: d.score_parts.some(x => x.points === 0 && x.label.includes('no seats')), info: JSON.stringify(d.score_parts) }; });
t('Settings', 'Safety rules cannot be switched off in settings', () => E.validateProfile(Object.assign({}, P, { privacy: { mask_phone_and_email_before_ai: false, retention_days_after_session_start: 180 } })).length === 1);

const pass = results.filter(r => r.ok).length;
const lines = ['# Unit and red-team tests', '', `Engine ${E.ENGINE_VERSION}. ${pass} of ${results.length} passed. Generated by eval/unit_tests.js.`, '', '| Group | Test | Result | Detail |', '|---|---|---|---|'];
for (const r of results) lines.push(`| ${r.group} | ${r.name} | ${r.ok ? 'pass' : '**FAIL**'} | ${String(r.info).replace(/\|/g, '/').slice(0, 120)} |`);
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', 'unit_tests.md'), lines.join('\n') + '\n');
console.log(`${pass}/${results.length} passed`);
for (const r of results.filter(x => !x.ok)) console.log('FAIL', r.group, r.name, r.info);
process.exit(pass === results.length ? 0 : 1);

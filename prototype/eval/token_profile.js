#!/usr/bin/env node
// Measures average tokens per AI step from the recorded run (estimated tokenizer) -> eval/results/token_profile.json
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../lib/engine.js'), L = require('../lib/llm.js');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/school_profile.json'), 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/sample_inquiries.json'), 'utf8'));
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/recorded_ai_responses.json'), 'utf8'));
(async () => {
  const llm = L.createReplay(R, P.llm.model_primary);
  const acc = { read: { n: 0, i: 0, o: 0 }, draft: { n: 0, i: 0, o: 0 } };
  let drafts = 0, kwOnly = 0, aiOnly = 0, both = 0, staff = 0;
  for (const inq of D.items) {
    const r = await E.processInquiry(inq, P, llm, {});
    for (const c of r.calls) { const a = acc[c.purpose]; a.n++; a.i += c.input_tokens; a.o += c.output_tokens; }
    if (r.draft && r.draft.text) drafts++;
    if (inq.gold.route === 'STAFF_ONLY') {
      staff++;
      const kw = r.keyword_screen.hit, ai = !!(r.read && r.read.sensitive.flag);
      if (kw && ai) both++; else if (kw) kwOnly++; else if (ai) aiOnly++;
    }
  }
  const out = {
    read_in_tokens: Math.round(acc.read.i / acc.read.n), read_out_tokens: Math.round(acc.read.o / acc.read.n),
    draft_in_tokens: Math.round(acc.draft.i / acc.draft.n), draft_out_tokens: Math.round(acc.draft.o / acc.draft.n),
    draft_share: Math.round(drafts / D.items.length * 100) / 100,
    sensitive_caught: { of: staff, by_both: both, keyword_only: kwOnly, ai_only: aiOnly },
    note: 'Estimated tokens (1 per 4 Latin characters, 1 per Indic character) from the recorded run; replace with API-reported counts after the live run.'
  };
  fs.writeFileSync(path.join(__dirname, 'results', 'token_profile.json'), JSON.stringify(out, null, 2));
  console.log(out);
})();

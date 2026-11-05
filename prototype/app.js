/* AdmitAssist browser app v1.0.0 - G S N J Teja (2025MB26205). Uses lib/engine.js and lib/llm.js. */
(function () {
  'use strict';
  const E = window.AdmitEngine, L = window.AdmitLLM;
  const STORE_KEY = 'admitassist_v1_state', PROFILE_KEY = 'admitassist_v1_profile', CONN_KEY = 'admitassist_v1_conn', KEY_KEY = 'admitassist_v1_key';
  const fastSeconds = () => (profile.review && profile.review.fast_approval_seconds) || 10;
  const MAX_CHARS = 4000;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));

  let fileProfile = null, profile = null, samples = null, recorded = null;
  let state = { items: [], log: [], selected: null, filter: 'open' };
  let conn = { mode: 'recorded', base: '', model: '' };

  // ---------- loading ----------
  async function loadJson(path, key) {
    if (window.AA_BUNDLE && window.AA_BUNDLE[key]) return clone(window.AA_BUNDLE[key]);
    const r = await fetch(path, { cache: 'no-store' });
    if (!r.ok) throw new Error(path + ' could not be loaded (' + r.status + ')');
    return r.json();
  }
  async function init() {
    try {
      fileProfile = await loadJson('config/school_profile.json', 'profile');
      samples = await loadJson('data/sample_inquiries.json', 'samples').catch(() => ({ items: [] }));
      recorded = await loadJson('data/recorded_ai_responses.json', 'recorded').catch(() => ({ reads: {}, drafts: {} }));
    } catch (e) {
      $('#detail').innerHTML = '<div class="empty"><h2>Could not load the settings files</h2><p>' + esc(e.message) +
        '</p><p>Open this page through a web server (for example <code>python -m http.server</code> inside the prototype folder) or the GitHub Pages link, or run <code>node tools/build_bundle.js</code> once and open index.html directly.</p></div>';
      return;
    }
    const saved = localStorage.getItem(PROFILE_KEY);
    profile = saved ? JSON.parse(saved) : clone(fileProfile);
    try { state = Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) { /* fresh start */ }
    try { conn = Object.assign(conn, JSON.parse(localStorage.getItem(CONN_KEY) || '{}')); } catch (e) { /* default */ }
    conn.base = conn.base || profile.llm.base_url; conn.model = conn.model || profile.llm.model_primary;
    bindUi();
    renderAll();
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify({ items: state.items, log: state.log, filter: state.filter })); }

  // ---------- AI connection ----------
  function monthSpend() {
    const ym = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
    return state.items.filter(x => x.result && x.read_on && x.read_on.slice(0, 7) === ym).reduce((s, x) => s + (x.result.cost.inr || 0), 0);
  }
  function makeLlm() {
    const cap = profile.llm.monthly_ai_cap_inr;
    if (conn.mode === 'live' && cap && monthSpend() >= cap) {
      return { label: 'capped', call: async () => { throw new Error('monthly AI limit reached (Rs ' + cap + ')'); } };
    }
    if (conn.mode === 'live') {
      const key = sessionStorage.getItem(KEY_KEY);
      if (!key) return null;
      return L.createOpenAICompatible({
        baseUrl: conn.base, apiKey: key, model: conn.model, fallbackModel: profile.llm.model_fallback,
        timeoutSeconds: profile.llm.timeout_seconds, temperature: profile.llm.temperature, maxTokensParam: profile.llm.max_tokens_param
      });
    }
    return L.createReplay(recorded, profile.llm.model_primary);
  }

  // ---------- inbox ----------
  function effectivePriority(it) { return it.override_priority || (it.result && it.result.decision && it.result.decision.priority) || null; }
  function queueClass(it) {
    if (!it.result) return 'NEEDS_REVIEW';
    return it.result.route === 'PRIORITY' ? effectivePriority(it) : it.result.route;
  }
  function visibleItems() {
    const f = state.filter;
    return state.items.filter(it => {
      if (f === 'all') return true;
      if (f === 'done') return it.status === 'done';
      if (it.status === 'done') return false;
      if (f === 'open') return true;
      if (f === 'review') return it.result && it.result.needs_review;
      if (f === 'HIGH') return effectivePriority(it) === 'HIGH' && it.result.route === 'PRIORITY';
      if (f === 'STAFF_ONLY') return it.result && it.result.route === 'STAFF_ONLY';
      return true;
    }).sort((a, b) => String(a.result && a.result.due_by || '9').localeCompare(String(b.result && b.result.due_by || '9')));
  }
  function fmtTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  function renderQueue() {
    const ol = $('#queueList');
    const items = visibleItems();
    const now = Date.now();
    ol.innerHTML = items.length ? '' : '<p class="hint">No messages here.</p>';
    for (const it of items) {
      const li = document.createElement('li');
      const qc = queueClass(it);
      li.className = qc + (it.status === 'done' ? ' done' : '') + (state.selected === it.id ? ' sel' : '');
      const r = it.result;
      const due = r && r.due_by ? new Date(r.due_by).getTime() : null;
      const overdue = it.status !== 'done' && due && due < now;
      const label = !r ? 'READING...' : r.route === 'PRIORITY' ? effectivePriority(it) : r.route.replace('_', ' ');
      li.innerHTML = '<div class="l1"><span><span class="chip ' + esc(qc) + '">' + esc(label) + '</span> ' +
        (r && r.needs_review && it.status !== 'done' ? '<span class="chip rev">CHECK</span> ' : '') +
        esc((r && r.decision && r.decision.grade) || '') + '</span><span class="' + (overdue ? 'overdue' : '') + '">' +
        (it.status === 'done' ? 'done' : 'reply by ' + esc(fmtTime(r && r.due_by))) + '</span></div>' +
        '<div class="l2">' + esc(it.id) + ' - ' + esc((r && r.decision && r.decision.summary_en) || it.text) + '</div>';
      li.onclick = () => { state.selected = it.id; it.opened_at = Date.now(); renderQueue(); renderDetail(); };
      ol.appendChild(li);
    }
  }

  function confChip(x) {
    if (x == null) return '<span class="conf unsure">Not read</span>';
    if (x >= profile.confidence.self_rating_high_min) return '<span class="conf sure">Sure</span>';
    if (x >= profile.confidence.self_rating_medium_min) return '<span class="conf check">Check</span>';
    return '<span class="conf unsure">Not sure</span>';
  }
  const ROUTE_TEXT = { PRIORITY: 'Admission inquiry', STAFF_ONLY: 'Staff only', NOT_ADMISSION: 'Not an admission inquiry', NEEDS_REVIEW: 'Read it yourself' };
  const tfText = tf => ({ IMMEDIATE: 'Wants to join soon (within ' + profile.priority_rules.immediate_window_days + ' days)', NEXT_SESSION: 'Next session (' + profile.admission_cycle.next_session_label + ')', LATER: 'After the next session', UNSPECIFIED: 'Not given' }[tf] || tf);
  const CAT_TEXT = { complaint: 'Complaint or unhappy parent', fee_concession: 'Fee help or concession', special_needs: 'Child\'s health or special needs', safety: 'Child safety', unspecified: 'Sensitive (type not clear)' };

  function renderDetail() {
    const box = $('#detail');
    const it = state.items.find(x => x.id === state.selected);
    if (!it) { box.innerHTML = '<div class="empty"><h2>Nothing selected</h2><p>Choose a message on the left.</p></div>'; return; }
    const r = it.result;
    if (!r) { box.innerHTML = '<div class="empty"><h2>Reading the message...</h2></div>'; return; }
    const d = r.decision;
    const pri = r.route === 'PRIORITY' ? effectivePriority(it) : null;
    let h = '<div class="dhead"><span class="chip ' + esc(pri || r.route) + '">' + esc(pri ? pri + ' priority' : ROUTE_TEXT[r.route]) + '</span>';
    if (r.needs_review) h += '<span class="chip rev">NEEDS REVIEW</span>';
    h += '<span>' + esc(it.id) + ' - ' + esc(it.channel.replace(/_/g, ' ')) + ' - received ' + esc(fmtTime(it.received_at)) + '</span>';
    h += '<span class="due">Reply by <b>' + esc(fmtTime(r.due_by)) + '</b></span></div>';

    if ((d.review_reasons || []).length) h += '<div class="warn"><b>Please check:</b><ul>' + d.review_reasons.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    if (r.route === 'STAFF_ONLY') {
      h += '<div class="stop"><b>Sensitive: ' + esc(CAT_TEXT[d.sensitive_category] || d.sensitive_category) + '.</b> No AI draft was written. Please reply personally or pass it to the principal.' +
        '<br><span class="hint">Flagged by: ' + esc((d.sensitive_source || []).join(' and ')) + (d.sensitive_evidence ? '. Words: "' + esc(d.sensitive_evidence) + '"' : '') + '</span></div>';
    }
    if (r.route === 'NOT_ADMISSION') h += '<div class="note"><b>Not an admission inquiry.</b> ' + esc(d.not_admission_reason || '') + ' Pass it to the right person.</div>';

    h += '<div class="cols"><div>';
    h += '<div class="box"><h4>Message</h4><pre class="msgtext" id="msgText">' + esc(it.text) + '</pre>' +
      '<label class="inline hint"><input type="checkbox" id="chkMasked"> Show what the AI saw (phone numbers hidden)</label></div>';
    if (r.route === 'PRIORITY' && d.score_parts) {
      h += '<div class="box"><h4>Why this priority</h4><ul class="why">' + d.score_parts.map(p => '<li><span class="pts">' + (p.points > 0 ? '+' : '') + p.points + '</span>' + esc(p.label) + (p.evidence ? ' <span class="quote">"' + esc(p.evidence) + '"</span>' : '') + '</li>').join('') + '</ul>' +
        '<div class="hint">Score ' + d.score + ' (HIGH at ' + profile.priority_rules.high_threshold + ' or more, LOW at ' + profile.priority_rules.low_threshold + ' or less). Rules: ' + esc(d.rule_priority) + ', AI suggested: ' + esc(d.ai_priority || '-') + '.' + (it.override_priority ? ' Changed by staff to ' + esc(it.override_priority) + '.' : '') + '</div></div>';
    }
    if ((d.notes || []).length) h += '<div class="note">' + d.notes.map(esc).join('<br>') + '</div>';
    h += '</div><div>';
    h += '<div class="box"><h4>What AdmitAssist read</h4><table class="kv">';
    h += '<tr><td>Class</td><td>' + esc(d.grade || 'Not given') + ' ' + (r.read ? confChip(d.grade_confidence) : '') + (d.other_children_grades && d.other_children_grades.length ? '<br>Also: ' + esc(d.other_children_grades.join(', ')) : '') + (r.read && r.read.grade_evidence ? '<span class="quote">"' + esc(r.read.grade_evidence) + '"</span>' : '') + (d.child_age_years ? '<br>Age given: ' + esc(d.child_age_years) : '') + '</td></tr>';
    h += '<tr><td>When</td><td>' + esc(tfText(d.timeframe)) + ' ' + (r.read ? confChip(d.timeframe_confidence) : '') + (r.read && r.read.timeframe_evidence ? '<span class="quote">"' + esc(r.read.timeframe_evidence) + '"</span>' : '') + '</td></tr>';
    h += '<tr><td>Phone</td><td>' + (r.contacts.phones.length ? esc(r.contacts.phones.join(', ')) + ' <span class="hint">(found by fixed pattern, not by AI)</span>' : 'No mobile number in message') +
      ((r.contacts.landlines || []).length ? '<br>Landline: ' + esc(r.contacts.landlines.join(', ')) + ' <span class="hint">(call, not WhatsApp)</span>' : '') +
      ((r.contacts.other_numbers || []).length ? '<br>Other number: ' + esc(r.contacts.other_numbers.join(', ')) : '') + '</td></tr>';
    if (r.contacts.emails.length) h += '<tr><td>E-mail</td><td>' + esc(r.contacts.emails.join(', ')) + '</td></tr>';
    if (d.questions_asked && d.questions_asked.length) h += '<tr><td>Asked about</td><td>' + esc(d.questions_asked.join(', ')) + '</td></tr>';
    if (d.summary_en) h += '<tr><td>Summary</td><td>' + esc(d.summary_en) + '</td></tr>';
    h += '<tr><td>Confidence</td><td>' + esc(d.overall_confidence) + ' <span class="hint">(lowest of class, timeframe, intent)</span></td></tr>';
    h += '</table></div>';
    if (r.route === 'PRIORITY') {
      h += '<div class="box"><h4>Change priority</h4><div class="actions"><select id="selPri"><option value="">Keep</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><input type="text" id="txtPriReason" placeholder="Reason (required)" style="flex:1"><button id="btnPri">Save</button></div></div>';
    }
    h += '</div></div>';

    // reply area
    const isDraft = r.route === 'PRIORITY' && r.draft && r.draft.text;
    const current = it.reply_text != null ? it.reply_text : (isDraft ? r.draft.text : '');
    h += '<div class="box draft"><h4>' + (isDraft ? 'Draft reply (AI) - read and edit before sending' : 'Your reply') + '</h4>';
    if (r.route === 'PRIORITY' && !isDraft) h += '<p class="hint">No AI draft: ' + esc(r.draft && r.draft.check ? r.draft.check.violations.join('; ') : 'not available in this mode for this message') + '</p>';
    h += '<textarea id="replyText">' + esc(current) + '</textarea>';
    h += '<div id="checkLine" class="checks"></div>';
    h += '<div class="actions">';
    h += '<button id="btnApprove" class="primary">' + (isDraft ? 'Approve and copy' : 'Copy reply') + '</button>';
    h += '<button id="btnWa"' + (r.contacts.phones.length ? '' : ' disabled title="No mobile number in the message"') + '>Open in WhatsApp</button>';
    if (r.contacts.emails.length) h += '<button id="btnMail">Open e-mail</button>';
    if (it.status === 'done') h += '<button id="btnProblem">Report a problem with this reply</button>';
    if (r.route === 'PRIORITY') h += '<button id="btnRegen">Write again (' + regenLeft(it) + ' left)</button>';
    if (isDraft) h += '<button id="btnReject">Reject draft, write my own</button>';
    h += '<button id="btnDone">' + (it.status === 'done' ? 'Reopen' : 'Mark done') + '</button>';
    h += '<span class="hint">Nothing is sent from here. You send it from WhatsApp yourself.</span></div></div>';
    if (it.gold) h += '<div class="gold">Test label written for the evaluation: ' + esc(it.gold.route) + (it.gold.priority ? ' / ' + esc(it.gold.priority) : '') + (it.gold.sensitive_category ? ' / ' + esc(it.gold.sensitive_category) : '') + ', class ' + esc(it.gold.grade || 'none') + '. Reason: ' + esc(it.gold.why) + '</div>';
    h += '<div class="gold">AI calls: ' + r.cost.calls + ', tokens ' + r.cost.input_tokens + ' in / ' + r.cost.output_tokens + ' out' + (r.cost.estimated ? ' (estimated)' : '') + ', cost Rs ' + r.cost.inr.toFixed(3) + '. Engine ' + esc(r.engine_version) + ', settings ' + esc(r.profile_version) + ', prompts ' + esc(r.prompt_versions.read) + '/' + esc(r.prompt_versions.draft) + ', mode ' + esc(r.mode) + '.</div>';
    box.innerHTML = h;
    wireDetail(it, isDraft);
  }

  function regenLeft(it) { return Math.max(0, (profile.reply.max_regenerations_per_inquiry || 3) - (it.staff_regens || 0)); }

  function wireDetail(it, isDraft) {
    const r = it.result;
    const ta = $('#replyText');
    const updateChecks = () => {
      const line = $('#checkLine');
      if (!isDraft || it.rejected) { line.className = 'checks'; line.textContent = ta.value ? E.wordCount(ta.value) + ' words' : ''; return; }
      const c = E.checkDraft(ta.value, profile, it.text);
      line.className = 'checks ' + (c.ok ? 'ok' : 'bad');
      line.textContent = (c.ok ? 'All checks passed' : 'Do not send as it is: ' + c.violations.join('; ')) + ' - ' + c.words + ' words';
    };
    ta.addEventListener('input', () => { it.reply_text = ta.value; save(); updateChecks(); });
    updateChecks();
    const chk = $('#chkMasked');
    if (chk) chk.onchange = () => { $('#msgText').textContent = chk.checked ? r.masked_text : it.text; };
    $('#btnApprove').onclick = async () => {
      const text = ta.value.trim();
      if (!text) { alert('The reply is empty.'); return; }
      if (isDraft && !it.rejected) {
        const c = E.checkDraft(text, profile, it.text);
        if (!c.ok && !confirm('This reply still breaks these checks:\n- ' + c.violations.join('\n- ') + '\n\nApprove anyway?')) return;
      }
      try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard may be blocked on file:// */ }
      const secs = it.opened_at ? Math.round((Date.now() - it.opened_at) / 1000) : null;
      const ratio = isDraft && !it.rejected ? E.editRatio(r.draft.text, text) : null;
      logAction(it, isDraft && !it.rejected ? 'approved_ai_draft' : 'approved_own_reply', { edit_ratio: ratio, seconds: secs, fast: secs != null && secs < fastSeconds(), on_time: r.due_by ? Date.now() <= new Date(r.due_by).getTime() : null });
      it.approved_text = text;
      it.status = 'done';
      save(); renderAll();
      if (secs != null && secs < fastSeconds()) alert('Copied. Note: this was approved in ' + secs + ' seconds. Please make sure you read it fully.');
    };
    $('#btnWa').onclick = () => {
      let p = r.contacts.phones[0];
      if (!p) return;
      if (r.contacts.phones.length > 1) {
        const pick = prompt('More than one mobile number in this message. Type the number to use:\n' + r.contacts.phones.map((x, i) => (i + 1) + ') ' + x).join('\n'), '1');
        const i = parseInt(pick, 10) - 1;
        if (!(i >= 0 && i < r.contacts.phones.length)) return;
        p = r.contacts.phones[i];
      }
      const cc = (profile.school && profile.school.country_code) || '91';
      window.open('https://wa.me/' + cc + p + '?text=' + encodeURIComponent(ta.value.trim()), '_blank');
      logAction(it, 'opened_whatsapp', { to: p });
    };
    const bm = $('#btnMail');
    if (bm) bm.onclick = () => {
      window.open('mailto:' + encodeURIComponent(r.contacts.emails[0]) + '?subject=' + encodeURIComponent('Admission inquiry - ' + profile.school.name) + '&body=' + encodeURIComponent(ta.value.trim()));
      logAction(it, 'opened_email', {});
    };
    const bpr = $('#btnProblem');
    if (bpr) bpr.onclick = () => {
      const note = prompt('What went wrong with this reply? (for example: wrong fee, parent complained, wrong class)');
      if (!note) return;
      logAction(it, 'reply_problem_reported', { reason: note });
      alert('Recorded. It will be reviewed in the weekly log review and added to the test set.');
      renderLog();
    };
    const rg = $('#btnRegen');
    if (rg) rg.onclick = async () => {
      if (regenLeft(it) <= 0) { alert('No more rewrites for this message. Please edit the draft yourself.'); return; }
      const llm = makeLlm();
      if (!llm) { alert('Live AI is not connected. Add an API key in the AI connection tab.'); return; }
      rg.disabled = true; rg.textContent = 'Writing...';
      it.staff_regens = (it.staff_regens || 0) + 1;
      const inq = { id: it.id, channel: it.channel, received_at: it.received_at, text: it.text };
      const res = await E.makeDraft(inq, r.masked_text, r.decision, profile, llm, r, it.staff_regens * (1 + (profile.reply.auto_regenerate_on_violation || 0)));
      r.cost = summarise(r.calls);
      if (res && res.text) { r.draft = res; it.reply_text = null; it.rejected = false; logAction(it, 'asked_for_new_draft', {}); }
      else alert('Could not write a new draft: ' + (res && res.check ? res.check.violations.join('; ') : 'no response') + (conn.mode !== 'live' ? '\n(Recorded demo mode has one draft per message.)' : ''));
      save(); renderAll();
    };
    const rj = $('#btnReject');
    if (rj) rj.onclick = () => { it.rejected = true; it.reply_text = ''; logAction(it, 'rejected_ai_draft', {}); save(); renderDetail(); };
    $('#btnDone').onclick = () => {
      if (it.status !== 'done' && (r.route === 'STAFF_ONLY' || r.route === 'NOT_ADMISSION')) {
        const note = prompt(r.route === 'STAFF_ONLY' ? 'One line: how was it handled, and by whom?' : 'One line: who was it passed to?');
        if (!note) return;
        it.status = 'done';
        logAction(it, r.route === 'STAFF_ONLY' ? 'handled_by_staff' : 'passed_on', { reason: note, on_time: r.due_by ? Date.now() <= new Date(r.due_by).getTime() : null });
      } else {
        it.status = it.status === 'done' ? 'open' : 'done';
        logAction(it, it.status === 'done' ? 'marked_done' : 'reopened', {});
      }
      save(); renderAll();
    };
    const bp = $('#btnPri');
    if (bp) bp.onclick = () => {
      const v = $('#selPri').value, why = $('#txtPriReason').value.trim();
      if (!v) return;
      if (!why) { alert('Please write a short reason. It helps improve the rules.'); return; }
      const before = effectivePriority(it);
      it.override_priority = v;
      it.result.due_by = E.addWorkingHours(it.received_at, profile.response_targets_working_hours[v], profile);
      logAction(it, 'priority_changed', { from: before, to: v, reason: why });
      save(); renderAll();
    };
  }
  function summarise(calls) {
    const s = { calls: calls.length, input_tokens: 0, output_tokens: 0, inr: 0, estimated: false };
    for (const c of calls) { s.input_tokens += c.input_tokens || 0; s.output_tokens += c.output_tokens || 0; s.inr += c.inr || 0; if (c.estimated) s.estimated = true; }
    return s;
  }
  function logAction(it, action, extra) {
    state.log.push(Object.assign({ at: new Date().toISOString(), id: it.id, action, route: it.result && it.result.route, priority: effectivePriority(it) }, extra));
    save();
  }

  // ---------- reading messages ----------
  async function readOne(inq, source, gold) {
    const it = { id: inq.id, channel: inq.channel, received_at: inq.received_at, text: inq.text, result: null, status: 'open', source, gold: gold || null, read_on: new Date(Date.now() + 330 * 60000).toISOString() };
    state.items = state.items.filter(x => x.id !== it.id);
    state.items.push(it);
    renderQueue();
    const llm = makeLlm();
    it.result = await E.processInquiry(inq, profile, llm, { mode: conn.mode === 'live' ? 'live' : 'recorded' });
    logAction(it, 'read', { needs_review: it.result.needs_review });
    save();
    return it;
  }
  async function onRead(ev) {
    ev.preventDefault();
    const text = $('#newText').value.trim();
    if (!text) { alert('Paste the message first.'); return; }
    if (text.length > MAX_CHARS) { alert('This message is ' + text.length + ' characters. The limit is ' + MAX_CHARS + '. Please paste only the parent\'s message.'); return; }
    $('#dlgNew').close();
    const local = $('#newReceived').value;
    const received = local ? local + ':00+05:30' : new Date().toISOString();
    const id = 'NEW-' + String(state.items.filter(x => x.source === 'pasted').length + 1).padStart(3, '0');
    if (conn.mode !== 'live') alert('Recorded demo mode: only the sample messages have recorded AI responses. This message will show the "AI could not read it" path. Switch to Live AI in the AI connection tab to read new messages.');
    state.selected = id;
    const it = await readOne({ id, channel: $('#newChannel').value, received_at: received, text }, 'pasted');
    it.opened_at = Date.now();
    $('#newText').value = '';
    renderAll();
  }
  async function loadSamples() {
    if (!samples || !samples.items || !samples.items.length) { alert('No sample file found.'); return; }
    if (conn.mode === 'live') {
      const est = (samples.items.length * 0.6).toFixed(0);
      if (!confirm('Live AI is on. Reading ' + samples.items.length + ' sample messages will call the API (about Rs ' + est + '). Continue?')) return;
    }
    const btn = $('#btnLoadSamples');
    btn.disabled = true;
    let n = 0;
    for (const s of samples.items) {
      btn.textContent = 'Reading ' + (++n) + '/' + samples.items.length;
      await readOne({ id: s.id, channel: s.channel, received_at: s.received_at, text: s.text }, 'sample', s.gold);
    }
    btn.disabled = false; btn.textContent = 'Load sample messages';
    renderAll();
  }

  // ---------- log tab ----------
  function renderLog() {
    const L2 = state.log;
    const approved = L2.filter(x => x.action === 'approved_ai_draft');
    const light = approved.filter(x => x.edit_ratio != null && x.edit_ratio <= 0.2).length;
    const avgEdit = approved.length ? approved.reduce((s, x) => s + (x.edit_ratio || 0), 0) / approved.length : null;
    const changes = L2.filter(x => x.action === 'priority_changed').length;
    const read = state.items.filter(x => x.result).length;
    const fast = approved.filter(x => x.fast).length;
    const replies = L2.filter(x => x.action.startsWith('approved'));
    const onTime = replies.filter(x => x.on_time === true).length;
    const cost = state.items.reduce((s, x) => s + (x.result ? x.result.cost.inr : 0), 0);
    const stat = (v, l) => '<div class="stat"><b>' + v + '</b>' + l + '</div>';
    $('#logStats').innerHTML =
      stat(read, 'messages read') +
      stat(approved.length, 'AI drafts approved') +
      stat(approved.length ? Math.round(light / approved.length * 100) + '%' : '-', 'approved with 20% or less edited') +
      stat(avgEdit != null ? Math.round(avgEdit * 100) + '%' : '-', 'average share of draft edited') +
      stat(read ? Math.round(changes / read * 100) + '%' : '-', 'priorities changed by staff') +
      stat(replies.length ? Math.round(onTime / replies.length * 100) + '%' : '-', 'replies before the reply-by time') +
      stat(fast, 'approvals under ' + fastSeconds() + ' seconds') +
      stat('Rs ' + cost.toFixed(2), 'AI cost so far');
    const cols = ['at', 'id', 'action', 'route', 'priority', 'edit_ratio', 'seconds', 'fast', 'on_time', 'from', 'to', 'reason', 'needs_review'];
    $('#logTable').className = 'grid';
    $('#logTable').innerHTML = '<tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>' +
      L2.slice().reverse().map(x => '<tr>' + cols.map(c => '<td>' + esc(x[c] == null ? '' : x[c]) + '</td>').join('') + '</tr>').join('');
  }
  function exportCsv() {
    const cols = ['at', 'id', 'action', 'route', 'priority', 'edit_ratio', 'seconds', 'fast', 'on_time', 'from', 'to', 'reason', 'needs_review'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [cols.join(',')].concat(state.log.map(x => cols.map(c => q(x[c])).join(','))).join('\n');
    download('admitassist_log.csv', csv, 'text/csv');
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- settings tab ----------
  function renderSettings() {
    $('#profileEditor').value = JSON.stringify(profile, null, 2);
    let h = '<table class="grid"><tr><th>Class</th><th>Offered</th><th>Seats</th></tr>';
    profile.grades.forEach((g, i) => {
      h += '<tr><td>' + esc(g.label) + '</td><td><input type="checkbox" data-gi="' + i + '" class="qOffered"' + (g.offered ? ' checked' : '') + '></td><td><select data-gi="' + i + '" class="qSeat">' +
        ['open', 'limited', 'closed', 'not_offered'].map(s => '<option' + (g.seat_status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></td></tr>';
    });
    h += '</table><label>Fee amounts in replies <select id="qFee">' + ['none', 'range'].map(m => '<option' + (profile.fees.disclosure_mode === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></label>';
    h += '<label>Longest reply (words) <input type="text" id="qWords" value="' + esc(profile.reply.max_words) + '"></label>';
    h += '<div class="row-end"><button id="btnQuickSave" class="primary">Save quick settings</button></div>';
    $('#quickSettings').innerHTML = h;
    $('#btnQuickSave').onclick = () => {
      document.querySelectorAll('.qOffered').forEach(el => { profile.grades[+el.dataset.gi].offered = el.checked; });
      document.querySelectorAll('.qSeat').forEach(el => { profile.grades[+el.dataset.gi].seat_status = el.value; });
      profile.fees.disclosure_mode = $('#qFee').value;
      const w = parseInt($('#qWords').value, 10); if (w > 20 && w < 400) profile.reply.max_words = w;
      bumpVersion(); localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); renderSettings();
      msg('#profileMsg', 'Saved as settings version ' + profile.profile_version + '. New messages will use it.', true);
    };
  }
  function bumpVersion() {
    const p = String(profile.profile_version || '1.0.0').split('.').map(Number);
    p[2] = (p[2] || 0) + 1; profile.profile_version = p.join('.');
  }
  function msg(sel, text, ok) { const el = $(sel); el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'bad'); }

  // ---------- render all ----------
  function renderAll() {
    const live = conn.mode === 'live' && sessionStorage.getItem(KEY_KEY);
    const mb = $('#modeBadge');
    mb.textContent = live ? 'Live AI: ' + conn.model : conn.mode === 'live' ? 'Live AI: no key yet' : 'Recorded demo';
    mb.className = 'badge' + (live ? ' live' : '');
    const cost = state.items.reduce((s, x) => s + (x.result ? x.result.cost.inr : 0), 0);
    $('#costBadge').textContent = 'AI cost Rs ' + cost.toFixed(2);
    document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('active', b.dataset.f === state.filter));
    renderQueue(); renderDetail(); renderLog();
  }

  function bindUi() {
    document.querySelectorAll('nav.tabs button').forEach(b => b.onclick = () => {
      document.querySelectorAll('nav.tabs button').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('hidden', t.id !== 'tab-' + b.dataset.tab));
      if (b.dataset.tab === 'settings') renderSettings();
      if (b.dataset.tab === 'log') renderLog();
    });
    document.querySelectorAll('#filters button').forEach(b => b.onclick = () => { state.filter = b.dataset.f; save(); renderAll(); });
    $('#btnNew').onclick = () => {
      const n = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16);
      $('#newReceived').value = n; $('#dlgNew').showModal(); $('#newText').focus();
    };
    $('#btnRead').onclick = onRead;
    $('#btnLoadSamples').onclick = loadSamples;
    $('#btnExport').onclick = exportCsv;
    $('#btnClear').onclick = () => { if (confirm('Delete all messages and the log stored in this browser?')) { state = { items: [], log: [], selected: null, filter: 'open' }; save(); renderAll(); } };
    $('#btnValidate').onclick = () => {
      try { const p = JSON.parse($('#profileEditor').value); const e = E.validateProfile(p); msg('#profileMsg', e.length ? e.join('\n') : 'Looks fine.', !e.length); }
      catch (e) { msg('#profileMsg', 'Not valid JSON: ' + e.message, false); }
    };
    $('#btnSaveProfile').onclick = () => {
      try {
        const p = JSON.parse($('#profileEditor').value); const e = E.validateProfile(p);
        if (e.length) { msg('#profileMsg', e.join('\n'), false); return; }
        profile = p; bumpVersion(); localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); renderSettings();
        msg('#profileMsg', 'Saved as settings version ' + profile.profile_version + '.', true);
      } catch (e) { msg('#profileMsg', 'Not valid JSON: ' + e.message, false); }
    };
    $('#btnResetProfile').onclick = () => { if (confirm('Go back to the settings file?')) { localStorage.removeItem(PROFILE_KEY); profile = clone(fileProfile); renderSettings(); msg('#profileMsg', 'Reset.', true); } };
    $('#btnDownloadProfile').onclick = () => download('school_profile.json', JSON.stringify(profile, null, 2), 'application/json');
    document.querySelectorAll('input[name=mode]').forEach(r => { r.checked = r.value === conn.mode; r.onchange = () => { conn.mode = r.value; localStorage.setItem(CONN_KEY, JSON.stringify(conn)); renderAll(); }; });
    $('#cfgBase').value = conn.base; $('#cfgModel').value = conn.model; $('#cfgKey').value = sessionStorage.getItem(KEY_KEY) || '';
    $('#btnSaveConn').onclick = () => {
      conn.base = $('#cfgBase').value.trim(); conn.model = $('#cfgModel').value.trim();
      const k = $('#cfgKey').value.trim(); if (k) sessionStorage.setItem(KEY_KEY, k); else sessionStorage.removeItem(KEY_KEY);
      localStorage.setItem(CONN_KEY, JSON.stringify(conn)); msg('#connMsg', 'Saved.', true); renderAll();
    };
    $('#btnTestConn').onclick = async () => {
      const llm = (conn.mode === 'live') ? makeLlm() : null;
      if (!llm) { msg('#connMsg', 'Choose Live AI and add a key first.', false); return; }
      msg('#connMsg', 'Testing...', true);
      try { const r = await llm.call({ purpose: 'test', messages: [{ role: 'user', content: 'Reply with the word OK.' }], max_tokens: 20 }); msg('#connMsg', 'Connected. Model answered: ' + r.text.slice(0, 40) + ' (' + r.ms + ' ms)', true); }
      catch (e) { msg('#connMsg', 'Could not connect: ' + e.message, false); }
    };
    $('#aboutBody').innerHTML =
      '<p>AdmitAssist reads an admission inquiry, finds the class, timeframe and phone number, suggests a priority with reasons, and writes a draft reply. A person reads every draft and sends it from WhatsApp. The tool cannot send anything.</p>' +
      '<p><b>What is real here:</b> the rules (hiding phone numbers, sensitive-topic keywords, class patterns, priority points, reply checks, reply-by times, the activity log and its metrics) run in this browser exactly as they would in the pilot. With an API key, the AI reading and drafting are real calls.</p>' +
      '<p><b>What is recorded:</b> in Recorded demo mode, the AI responses for the 48 sample messages were produced once by running the same prompts and are played back. New pasted messages need Live AI.</p>' +
      '<p><b>Not in this prototype:</b> WhatsApp connection, login, shared storage between computers, voice-note transcription, replies in Telugu or Hindi. See 07_Roadmap.md.</p>' +
      '<p class="hint">Engine ' + E.ENGINE_VERSION + ', prompts ' + E.READ_PROMPT_VERSION + ' / ' + E.DRAFT_PROMPT_VERSION + ', settings ' + esc(profile.profile_version) + '. Data stays in this browser (localStorage).</p>';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/*
 * AdmitAssist AI connectors v1.0.0
 * - createOpenAICompatible: any chat-completions endpoint (OpenAI, Gemini's OpenAI-compatible endpoint, Azure-style proxies).
 * - createReplay: plays back recorded AI responses (demo mode and the recorded evaluation run). Token counts are estimates.
 * Both return { text, model, input_tokens, output_tokens, estimated, ms } so the engine does not care which one is used.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.AdmitLLM = factory(root.AdmitEngine);
})(typeof self !== 'undefined' ? self : this, function (Engine) {
  'use strict';

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function createOpenAICompatible(opts) {
    const base = String(opts.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error('No fetch available');
    if (!opts.apiKey) throw new Error('API key missing');
    const timeoutMs = (opts.timeoutSeconds || 20) * 1000;

    async function once(model, req) {
      const body = { model, messages: req.messages };
      body[opts.maxTokensParam || 'max_completion_tokens'] = req.max_tokens || 600;
      if (opts.temperature !== null && opts.temperature !== undefined) body.temperature = opts.temperature;
      if (req.json) body.response_format = { type: 'json_object' };
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      const t0 = Date.now();
      try {
        const resp = await fetchImpl(base + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + opts.apiKey },
          body: JSON.stringify(body),
          signal: ctrl ? ctrl.signal : undefined
        });
        const ms = Date.now() - t0;
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          const err = new Error('AI service returned HTTP ' + resp.status + (txt ? ': ' + txt.slice(0, 160) : ''));
          err.status = resp.status;
          throw err;
        }
        const j = await resp.json();
        const choice = j.choices && j.choices[0];
        const text = choice && choice.message ? (choice.message.content || '') : '';
        const u = j.usage || {};
        const inTok = u.prompt_tokens != null ? u.prompt_tokens : Engine.estimateTokens(req.messages.map(m => m.content).join('\n'));
        const outTok = u.completion_tokens != null ? u.completion_tokens : Engine.estimateTokens(text);
        return { text, model: j.model || model, price_model: model, input_tokens: inTok, output_tokens: outTok, estimated: u.prompt_tokens == null, ms };
      } finally { if (timer) clearTimeout(timer); }
    }

    async function call(req) {
      const retryable = e => !e.status || e.status === 429 || e.status >= 500;
      try { return await once(opts.model, req); }
      catch (e1) {
        if (!retryable(e1)) throw e1;
        await sleep(1500);
        try { return await once(opts.model, req); }
        catch (e2) {
          if (!opts.fallbackModel || !retryable(e2)) throw e2;
          return await once(opts.fallbackModel, req);
        }
      }
    }
    return { label: 'live:' + opts.model, call };
  }

  // recorded = { reads: { "INQ-001": ["raw text attempt 1", ...] }, drafts: { "INQ-001": ["draft 1", "draft 2"] }, model_label }
  function createReplay(recorded, priceModel) {
    const reads = (recorded && recorded.reads) || {};
    const drafts = (recorded && recorded.drafts) || {};
    async function call(req) {
      const pool = req.purpose === 'read' ? reads : drafts;
      const list = pool[req.inquiry_id];
      if (!list || !list.length) throw new Error('No recorded AI response for ' + req.inquiry_id + ' (' + req.purpose + ')');
      const text = list[Math.min((req.attempt || 1) - 1, list.length - 1)];
      if ((req.attempt || 1) > list.length && req.purpose === 'draft') throw new Error('No further recorded drafts for this message');
      return {
        text, model: priceModel, price_model: priceModel,
        input_tokens: Engine.estimateTokens(req.messages.map(m => m.content).join('\n')),
        output_tokens: Engine.estimateTokens(text), estimated: true, ms: null
      };
    }
    return { label: 'recorded:' + ((recorded && recorded.model_label) || 'unknown'), call };
  }

  return { createOpenAICompatible, createReplay };
});

#!/usr/bin/env node

// Simple API smoke test for local dev
// Usage:
//   BASE_URL=http://localhost:3000 COOKIE="<cookie string>" node scripts/smoke.mjs
// Notes:
// - COOKIE is optional. If supplied, it will be sent as the Cookie header to hit auth-protected routes.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const COOKIE = process.env.COOKIE || '';

const endpoints = [
  { path: '/', expect: [200], name: 'Landing' },
  { path: '/api/subscription/status', expect: [200, 401], name: 'Subscription Status' },
  { path: '/api/credits/balance', expect: [200, 401], name: 'Credits Balance' },
  { path: '/api/files/list', expect: [200, 401], name: 'Files List' },
];

function pad(str, len) { return (str + ' '.repeat(len)).slice(0, len); }

async function run() {
  let pass = 0, fail = 0;
  console.log(`\nRunning smoke tests against ${BASE_URL}`);
  if (COOKIE) console.log('Using COOKIE for auth: provided');
  else console.log('No COOKIE provided; auth endpoints may return 401');

  for (const ep of endpoints) {
    const url = new URL(ep.path, BASE_URL).toString();
    const start = Date.now();
    try {
      const res = await fetch(url, { headers: COOKIE ? { Cookie: COOKIE } : undefined });
      const ms = Date.now() - start;
      const ok = ep.expect.includes(res.status);

      let bodyText = '';
      try { bodyText = await res.text(); } catch {}
      let summary = '';
      try { summary = JSON.stringify(JSON.parse(bodyText)); } catch { summary = bodyText?.slice(0, 200) || ''; }

      if (ok) {
        pass++;
        console.log(`✔ ${pad(ep.name, 24)} ${res.status} in ${ms}ms`);
      } else {
        fail++;
        console.log(`✖ ${pad(ep.name, 24)} ${res.status} in ${ms}ms`);
      }
      if (summary) {
        console.log(`   ↳ ${summary.substring(0, 300)}`);
      }
    } catch (err) {
      fail++;
      console.log(`✖ ${pad(ep.name, 24)} ERROR ${err?.message || err}`);
    }
  }

  console.log(`\nSummary: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });

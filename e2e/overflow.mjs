import {chromium} from 'playwright-core';
const BASE = 'http://127.0.0.1:3100';
const b = await chromium.launch({channel: 'msedge', headless: true});
const page = await (await b.newContext({viewport: {width: 360, height: 800}})).newPage();
await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', (process.env.E2E_USER || (()=>{throw new Error('set E2E_USER')})()));
await page.fill('input[type="password"]', (process.env.E2E_PASS || (()=>{throw new Error('set E2E_PASS')})()));
await page.click('button[type="submit"]');
await page.waitForURL(u => !u.pathname.startsWith('/login'));
for (const route of process.argv.slice(2)) {
  await page.goto(BASE + '/' + route, {waitUntil: 'networkidle'});
  const info = await page.evaluate(() => {
    const W = window.innerWidth; const out = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > W + 1) {
        // skip elements inside a scroll container
        let p = el.parentElement, scroll = false;
        while (p) { const cs = getComputedStyle(p); if (['auto', 'scroll'].includes(cs.overflowX) && p.scrollWidth > p.clientWidth) { scroll = true; break; } p = p.parentElement; }
        if (!scroll) out.push({tag: el.tagName, cls: (el.className && el.className.toString().slice(0, 60)), right: Math.round(r.right), w: Math.round(r.width), minw: getComputedStyle(el).minWidth});
      }
    });
    return {W, sw: document.documentElement.scrollWidth, items: out.slice(0, 8)};
  });
  console.log(route, JSON.stringify(info));
}
await b.close();

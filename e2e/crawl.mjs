import {chromium} from 'playwright-core';
import fs from 'fs';
const BASE = 'http://127.0.0.1:3100';
const OUT = process.argv[2] || 'crawl';
fs.mkdirSync(OUT + '/shots', {recursive: true});
const VIEWPORTS = (process.env.VP === 'all') ? [[1920,1080,'desktop-1920'],[1440,900,'laptop-1440'],[1366,768,'laptop-1366'],[1024,768,'tablet-landscape'],[768,1024,'tablet-portrait'],[390,844,'mobile-390'],[360,800,'mobile-360']] : [[390,844,'mobile-390'],[360,800,'mobile-360']];
const ROUTES = ['/', '/owners','/vehicles','/drivers','/customers','/duties','/expenses','/expenses/daily-report','/expenses/daily','/maintenance','/agreements','/documents','/billing','/owner-payables','/payroll','/due-collection','/accounts','/settlements','/vehicle-search','/reports','/notifications','/settings','/audit','/access-requests','/cashbook'];
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}});
const page = await ctx.newPage();
const events = {console: [], pageerrors: [], failed: []};
let current = '';
page.on('console', m => { if (m.type() === 'error') events.console.push({at: current, text: m.text().slice(0, 300)}); });
page.on('pageerror', e => events.pageerrors.push({at: current, text: String(e).slice(0, 300)}));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) events.failed.push({at: current, status: r.status(), url: r.url().replace(BASE, '').slice(0, 120)}); });

await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', (process.env.E2E_USER || (()=>{throw new Error('set E2E_USER')})()));
await page.fill('input[type="password"]', (process.env.E2E_PASS || (()=>{throw new Error('set E2E_PASS')})()));
await page.click('button[type="submit"]');
await page.waitForURL(u => !u.pathname.startsWith('/login'), {timeout: 30000});
console.log('logged in ->', page.url());

const results = [];
for (const [w, h, name] of VIEWPORTS) {
  await page.setViewportSize({width: w, height: h});
  for (const r of ROUTES) {
    current = `${name} ${r}`;
    const rec = {viewport: name, route: r};
    try {
      await page.goto(BASE + r, {waitUntil: 'networkidle', timeout: 45000});
      await page.waitForTimeout(400);
      rec.url = new URL(page.url()).pathname;
      rec.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      rec.errorBoundary = await page.evaluate(() => /Application error|Something went wrong|Unhandled Runtime Error/i.test(document.body.innerText));
      rec.title = await page.title();
      rec.sidebarVisible = await page.evaluate(() => { const s = document.querySelector('aside, nav, .sidebar'); if (!s) return null; const rc = s.getBoundingClientRect(); return rc.width > 0 && rc.right > 0 && rc.left >= -1; });
      rec.textLen = await page.evaluate(() => document.body.innerText.length);
      if (['desktop-1920', 'tablet-portrait', 'mobile-390'].includes(name)) await page.screenshot({path: `${OUT}/shots/${name}${r.replace(/\//g, '_') || '_home'}.png`, fullPage: false});
    } catch (e) { rec.error = String(e).slice(0, 200); }
    results.push(rec);
  }
}
fs.writeFileSync(OUT + '/results.json', JSON.stringify({results, events}, null, 1));
const bad = results.filter(r => r.error || r.errorBoundary || r.overflowX > 1);
console.log('pages checked:', results.length, ' with problems:', bad.length);
for (const r of bad.slice(0, 60)) console.log(JSON.stringify(r));
console.log('console errors:', events.console.length, 'page errors:', events.pageerrors.length, 'failed requests:', events.failed.length);
await b.close();

import {chromium} from 'playwright-core';
import fs from 'fs';
const BASE = 'http://127.0.0.1:3100';
const OUT = 'printlong'; fs.mkdirSync(OUT, {recursive: true});
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}});
await ctx.addInitScript(() => { window.print = () => {}; });
const page = await ctx.newPage();
await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', 'e2e_boss'); await page.fill('input[type="password"]', 'E2e-pass-12345');
await page.click('button[type="submit"]'); await page.waitForURL(x => !x.pathname.startsWith('/login'));
const ck = async () => (await ctx.cookies()).find(c => c.name === 'csrftoken')?.value || '';
const me = await (await page.request.get(BASE + '/backend/me')).json(); const ORG = me.organizations[0].id;
const day = '2026-09-09';
for (let i = 0; i < 90; i++) {
  await page.request.post(BASE + `/backend/orgs/${ORG}/transactions/custom`, {data: {transaction_type: i % 3 === 0 ? 'Income' : 'Expense', title: `Bulk ${i % 7} item`, amount: String(100 + i), date: day, reference: `BULK-${Date.now()}-${i}`, description: 'x'.repeat(30 + (i % 40))}, headers: {'Content-Type': 'application/json', 'X-CSRFToken': await ck()}});
}
await page.goto(BASE + '/expenses/daily-report', {waitUntil: 'networkidle'});
await page.locator('input[type=date]').first().fill(day);
await page.getByText('Bulk 0 item').first().waitFor();
await page.emulateMedia({media: 'print'});
await page.pdf({path: `${OUT}/daily-long.pdf`, format: 'A4', printBackground: true, margin: {top: '14mm', bottom: '14mm', left: '14mm', right: '14mm'}});
await b.close();
console.log('ok');

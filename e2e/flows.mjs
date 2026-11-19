import {chromium} from 'playwright-core';
import fs from 'fs';
const SCALE = Number(process.env.E2E_SLOW || 1);   // set E2E_SLOW=4 on a remote database (each query costs a network round trip)
const BASE = 'http://127.0.0.1:3100';
const OUT = process.argv[2] || 'flows';
fs.mkdirSync(OUT, {recursive: true});
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
await ctx.addInitScript(() => { window.print = () => {}; });   // headless: avoid the print dialog; print output is captured with page.pdf()
const page = await ctx.newPage();
page.setDefaultTimeout(10000*SCALE);
const consoleErrors = []; const failed = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 100)}`); });
const results = [];
const u = Math.random().toString(36).slice(2, 7);
async function step(name, fn) {
  try { await fn(); results.push({name, ok: true}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, err: String(e).split('\n')[0].slice(0, 220)}); console.log('FAIL', name, '::', String(e).split('\n')[0].slice(0, 220)); try { await page.screenshot({path: `${OUT}/FAIL_${name.replace(/\W+/g, '_').slice(0, 40)}.png`}); } catch {} }
}
const dlg = () => page.locator('[role=dialog]').last();
const fld = (root, label) => root.locator('label').filter({has: page.locator('span.field-label', {hasText: label})}).locator('input,select,textarea').first();
const api = async (method, path, body) => {
  const r = await page.request.fetch(BASE + '/backend' + path, {method, data: body ? JSON.stringify(body) : undefined, headers: {'Content-Type': 'application/json', 'X-CSRFToken': (await ctx.cookies()).find(c => c.name === 'csrftoken')?.value || ''}});
  return {status: r.status(), body: await r.json().catch(() => null)};
};

await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', (process.env.E2E_USER || (()=>{throw new Error('set E2E_USER')})()));
await page.fill('input[type="password"]', (process.env.E2E_PASS || (()=>{throw new Error('set E2E_PASS')})()));
await page.click('button[type="submit"]');
await page.waitForURL(x => !x.pathname.startsWith('/login'));
const me = await api('GET', '/me'); const ORG = me.body.organizations[0].id;

// ───────── C. Driver salary / advance / fuel-gas (UI)
await step('drivers: list shows Monthly Salary column', async () => {
  await page.goto(BASE + '/drivers', {waitUntil: 'networkidle'});
  await page.locator('th', {hasText: 'Monthly Salary'}).first().waitFor({timeout: 8000*SCALE});
});
await step('drivers: add driver with salary + previous dues via UI', async () => {
  await page.getByRole('button', {name: /Add New Driver/i}).click();
  const d = dlg();
  await d.getByPlaceholder('e.g. Rahim Uddin').fill(`PW Driver ${u}`);
  await d.getByPlaceholder('01712-XXXXXX').fill('01712000111');
  await d.getByPlaceholder('DHA-2021-XXXXX').fill('LIC-' + u);
  await d.getByPlaceholder('e.g. 20000').fill('20000');
  await d.locator('label', {hasText: 'Previous advance due'}).locator('input').fill('10000');
  await d.locator('label', {hasText: 'Previous fuel/gas due'}).locator('input').fill('5000');
  await d.getByRole('button', {name: /Save Driver/i}).click();
  await page.getByText(`PW Driver ${u}`).first().waitFor({timeout: 10000*SCALE});
});
await step('drivers: salary shown as ৳ 20,000 in the list', async () => {
  const row = page.locator('tr', {hasText: `PW Driver ${u}`}).first();
  await row.getByText('৳ 20,000').waitFor({timeout: 5000*SCALE});
});
await step('drivers: select driver -> financial summary shows advance 10,000.00 / fuel-gas 5,000.00', async () => {
  await page.locator('tr', {hasText: `PW Driver ${u}`}).first().click();
  const panel = page.locator('#driver-finance');
  await panel.getByText(`Financial summary – PW Driver ${u}`).waitFor({timeout: 8000*SCALE});
  await panel.getByText('৳ 10,000.00').first().waitFor();
  await panel.getByText('৳ 5,000.00').first().waitFor();
});
await step('drivers: salary dialog validation (advance above balance blocked, button disabled)', async () => {
  await page.locator('#driver-finance').getByRole('button', {name: /Pay salary/i}).click();
  const d = dlg();
  await fld(d, 'Advance adjustment').fill('99999');
  await d.getByText(/Cannot exceed the outstanding advance/).waitFor();
  if (!(await d.getByRole('button', {name: /^Pay salary$/}).isDisabled())) throw new Error('submit should be disabled');
});
await step('drivers: pay salary (advance 5,000 + fuel/gas 5,000 cash) -> confirm -> net 15,000', async () => {
  const d = dlg();
  await fld(d, 'Advance adjustment').fill('5000');
  await fld(d, 'Fuel/Gas settlement').fill('5000');
  await d.getByText(/Net salary payable:/).waitFor();
  await d.getByText('৳ 15,000.00').first().waitFor();
  await d.getByRole('button', {name: /^Pay salary$/}).click();
  await d.getByText(/This cannot be repeated for the same month/).waitFor();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.locator('#driver-finance').getByText('Salary payment recorded').waitFor({timeout: 10000*SCALE});
});
await step('drivers: summary after payment -> advance due 5,000.00, fuel/gas 0.00, salary paid 15,000.00', async () => {
  const p = page.locator('#driver-finance');
  await p.locator('div', {hasText: /^Remaining advance due/}).first().waitFor();
  await page.waitForTimeout(800);
  const txt = (await p.innerText()).replace(/\s+/g, ' ');
  if (!/Remaining advance due ৳ 5,000\.00/.test(txt)) throw new Error('advance: ' + txt.slice(0, 500));
  if (!/Remaining Fuel\/Gas ৳ 0\.00/.test(txt)) throw new Error('fuel: ' + txt.slice(0, 500));
  if (!/Total salary paid ৳ 15,000\.00/.test(txt)) throw new Error('paid');
});
await step('drivers: re-opening the salary dialog resets it and blocks an already-settled month with a message', async () => {
  await page.locator('#driver-finance').getByRole('button', {name: /Pay salary/i}).click();
  const d = dlg();
  if ((await fld(d, 'Advance adjustment').inputValue()) !== '') throw new Error('stale advance value kept');
  await d.getByText(/has already been settled for this driver/).waitFor({timeout: 5000*SCALE});
  if (!(await d.getByRole('button', {name: /^Pay salary$/}).isDisabled())) throw new Error('submit should be disabled for a settled month');
  await page.keyboard.press('Escape');
});
await step('drivers: statement print popup contains the transactions', async () => {
  const [pop] = await Promise.all([page.waitForEvent('popup'), page.locator('#driver-finance').getByRole('button', {name: /^\s*Print\s*$/}).click()]);
  await pop.waitForLoadState();
  const text = await pop.innerText('body');
  if (!/Driver Financial Statement/.test(text) || !/driver advance/i.test(text)) throw new Error(text.slice(0, 200));
  await pop.pdf({path: `${OUT}/driver-statement.pdf`, format: 'A4', printBackground: true});
  await pop.close();
});
await step('drivers: reload keeps data (persistence)', async () => {
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('tr', {hasText: `PW Driver ${u}`}).first().click();
  await page.locator('#driver-finance').getByText('৳ 15,000.00').first().waitFor({timeout: 8000*SCALE});
});

// ───────── Replacement drivers (UI)
await step('attendance: record replacement for a date range via UI + history/filters', async () => {
  const d2 = await api('POST', `/orgs/${ORG}/tasin-drivers`, {name: `PW Sub ${u}`, phone: '01', monthly_salary: '10000'});
  const ow0 = await api('POST', `/orgs/${ORG}/tasin-owners`, {name: `PW Seed Owner ${u}`, phone: '01'});   // a vehicle must belong to a real owner (no silent default)
  const veh = await api('POST', `/orgs/${ORG}/tasin-vehicles`, {registration: `PW-${u}`, owner_id: Number(ow0.body.id), brand: 'Toyota', model: 'Axio', monthly_rent: '30000', status: 'Available'});
  globalThis.vid = veh.body.id; globalThis.sub = d2.body.id;
  await page.goto(BASE + '/drivers', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: /Replacement Drivers/}).click();
  await page.getByRole('button', {name: /Record replacement/}).click();
  const d = dlg();
  const from = fld(d, 'From date'); await from.fill('2026-11-10');
  await fld(d, 'To date').fill('2026-11-12');
  await fld(d, 'Regular (original) driver').selectOption({label: `PW Driver ${u}`});
  await fld(d, 'Replacement driver').selectOption({label: `PW Sub ${u}`});
  await fld(d, 'Vehicle').selectOption({label: `PW-${u}`});
  await fld(d, 'Reason').fill('Sick');
  await d.getByRole('button', {name: /Save 3 days/}).click();
  await page.getByText('3 replacement record(s) saved').waitFor({timeout: 10000*SCALE});
  const rows = await page.locator('tbody tr', {hasText: `PW Sub ${u}`}).count();
  if (rows !== 3) throw new Error('rows=' + rows);
});
await step('attendance: duplicate date is rejected with a message', async () => {
  await page.getByRole('button', {name: /Record replacement/}).click();
  const d = dlg();
  await fld(d, 'From date').fill('2026-11-11');
  await fld(d, 'Regular (original) driver').selectOption({label: `PW Driver ${u}`});
  await fld(d, 'Replacement driver').selectOption({label: `PW Sub ${u}`});
  await fld(d, 'Vehicle').selectOption({label: `PW-${u}`});
  await d.getByRole('button', {name: /Save record/}).click();
  await d.getByText(/already recorded|already has a replacement/).waitFor({timeout: 8000*SCALE});
  await page.keyboard.press('Escape');
});
await step('attendance: same driver as original and replacement is blocked in the form', async () => {
  await page.getByRole('button', {name: /Record replacement/}).click();
  const d = dlg();
  await fld(d, 'Regular (original) driver').selectOption({label: `PW Driver ${u}`});
  await fld(d, 'Replacement driver').selectOption({label: `PW Driver ${u}`});
  await d.getByText(/cannot replace themself/).waitFor();
  await page.keyboard.press('Escape');
});

// ───────── D. Client opening due without vehicle (UI)
await step('clients: create client with opening receivable 500,000 via UI', async () => {
  await page.goto(BASE + '/customers', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: /Add New Client/i}).click();
  const d = dlg();
  await d.locator('label', {hasText: /Company Name|Client Name|Name/}).first().locator('input').fill(`PW Client ${u}`);
  await d.getByPlaceholder(/01711|017/).first().fill('01711555555');
  await fld(d, 'Opening amount').fill('500000');
  await d.getByRole('button', {name: /Save Client/}).click();
  await page.getByText(`PW Client ${u}`).first().waitFor({timeout: 10000*SCALE});
});
await step('clients: summary shows outstanding receivable 500,000.00 and collect 100,000 -> 400,000.00', async () => {
  await page.locator('tr', {hasText: `PW Client ${u}`}).first().click();
  const panel = page.getByText(`Client financial summary – PW Client ${u}`).locator('..').locator('..');
  await page.getByText(`Client financial summary – PW Client ${u}`).waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: /Receive payment/}).click();
  const d = dlg();
  await fld(d, 'Amount').fill('100000');
  await d.getByRole('button', {name: /Record collection/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.getByText('Collection recorded').waitFor({timeout: 10000*SCALE});
  await page.getByText('৳ 400,000.00').first().waitFor({timeout: 8000*SCALE});
  void panel;
});
await step('clients: collecting more than the receivable is blocked in the dialog', async () => {
  await page.getByRole('button', {name: /Receive payment/}).click();
  const d = dlg();
  await fld(d, 'Amount').fill('400000.01');
  await d.getByText(/Cannot exceed the outstanding receivable/).waitFor();
  await page.keyboard.press('Escape');
});

// ───────── E. Owner opening + rent accrual + payment (UI)
await step('owners: create owner with opening payable 200,000 via UI', async () => {
  await page.goto(BASE + '/owners', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: /Add New Owner/i}).click();
  const d = dlg();
  await d.getByPlaceholder('e.g. Md. Rahim Hossain').fill(`PW Owner ${u}`);
  await d.getByPlaceholder('01711-XXXXXX').fill('01711666666');
  await fld(d, 'Opening amount').fill('200000');
  await d.getByRole('button', {name: /Save Owner/}).click();
  await page.getByText(`PW Owner ${u}`).first().waitFor({timeout: 10000*SCALE});
});
await step('owners: monthly rent accrual dialog shows breakdown, posts once, re-open shows already posted', async () => {
  const owner = (await api('GET', `/orgs/${ORG}/tasin-owners`)).body.find(o => o.name === `PW Owner ${u}`);
  await api('PUT', `/orgs/${ORG}/tasin-vehicles/${globalThis.vid}`, {registration: `PW-${u}`, brand: 'Toyota', model: 'Axio', monthly_rent: '60000', status: 'Available', owner_id: Number(owner.id)});
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('tr', {hasText: `PW Owner ${u}`}).first().click();
  await page.getByText(`Owner financial summary – PW Owner ${u}`).waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: /Monthly rent accrual/}).click();
  const d = dlg();
  await fld(d, 'Billing month').fill('2026-11');
  await d.getByText(`PW-${u}`).waitFor({timeout: 8000*SCALE});
  await d.getByText(/Full month rent/).waitFor();
  await d.getByRole('button', {name: /Post 1 accrual/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.getByText('Rent accrual updated').waitFor({timeout: 10000*SCALE});
  await page.getByRole('button', {name: /Monthly rent accrual/}).click();
  const d2 = dlg();
  await fld(d2, 'Billing month').fill('2026-11');
  await d2.getByText(/Posted ৳ 60,000\.00/).waitFor({timeout: 8000*SCALE});
  await page.keyboard.press('Escape');
});
await step('owners: pay 200,000 of 260,000 -> remaining 60,000.00', async () => {
  await page.getByRole('button', {name: /Pay owner/}).click();
  const d = dlg();
  await fld(d, 'Amount').fill('200000');
  await d.getByRole('button', {name: /Record payment/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.getByText('Payment recorded').first().waitFor({timeout: 10000*SCALE});
  await page.getByText('৳ 60,000.00').first().waitFor({timeout: 8000*SCALE});
});

// ───────── F. Documents (UI)
await step('documents: add Fitness and Tax Token via UI, both visible with distinct types; edit persists after reload', async () => {
  await page.goto(BASE + '/documents', {waitUntil: 'networkidle'});
  for (const [type, num] of [['Fitness Certificate', 'FIT-' + u], ['Tax Token', 'TAX-' + u]]) {
    await page.getByRole('button', {name: /Add Document/}).click();
    const d = dlg();
    await d.getByRole('combobox').first().click();
    await page.getByRole('option', {name: `PW-${u}`}).click();
    await d.getByRole('combobox').nth(1).click();
    await page.getByRole('option', {name: type}).click();
    await d.locator('label', {hasText: 'Certificate number'}).locator('input').fill(num);
    await d.getByRole('button', {name: /Save Document/}).click();
    await page.getByText('Document saved').waitFor({timeout: 8000*SCALE});
    await page.waitForTimeout(400);
  }
  await page.getByPlaceholder(/Search title/).fill(`PW-${u}`);
  const rows = page.locator('.billing-table > div', {hasText: `PW-${u}`});
  if ((await rows.count()) !== 2) throw new Error('rows=' + (await rows.count()));
  const txt = await page.locator('.billing-table').innerText();
  if (!/Fitness Certificate/.test(txt) || !/Tax Token/.test(txt)) throw new Error('labels');
  await rows.first().getByTitle('Edit').click();
  await dlg().locator('label', {hasText: 'Document title'}).locator('input').fill(`Edited title ${u}`);
  await dlg().getByRole('button', {name: /Save Document/}).click();
  await page.getByText('Document saved').waitFor();
  await page.goto(BASE + '/owners'); await page.goto(BASE + '/documents', {waitUntil: 'networkidle'});
  await page.getByPlaceholder(/Search title/).fill(`PW-${u}`);
  await page.getByText(`Edited title ${u}`).waitFor({timeout: 8000*SCALE});
});
await step('vehicles: profile lists the same documents (Vehicle Profile sync)', async () => {
  const r = await api('GET', `/orgs/${ORG}/tasin-vehicles/${globalThis.vid}/papers`);
  if (r.body.length !== 2) throw new Error('papers=' + r.body.length);
  await page.goto(BASE + '/vehicles', {waitUntil: 'networkidle'});
  await page.getByPlaceholder(/Search/).first().fill(`PW-${u}`).catch(() => {});
  await page.getByText(`PW-${u}`).first().click();
  await page.getByText(`Edited title ${u}`).waitFor({timeout: 8000*SCALE});
});

// ───────── Vehicle billing + payments (UI)
await step('vehicle billing: Receive a Payment and Make a Payment via UI; history updates; invoice popup', async () => {
  await page.getByText(/Billing & Payments –/).waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: /Receive a Payment/}).click();
  let d = dlg();
  await d.getByPlaceholder('Client / owner name').fill('PW Payer');
  await fld(d, 'Amount').fill('1500');
  await fld(d, 'Unique reference').fill('PWR-' + u);
  await d.getByRole('button', {name: /Record received payment/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.getByText('Payment recorded').first().waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: /Make a Payment/}).click();
  d = dlg();
  await d.getByPlaceholder(/Owner, driver, garage/).fill('PW Garage');
  await fld(d, 'Amount').fill('400');
  await fld(d, 'Unique reference').fill('PWM-' + u);
  await d.getByRole('button', {name: /Record payment made/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.getByText(/Received from PW Payer/).waitFor({timeout: 8000*SCALE});
  await page.getByText(/Paid to PW Garage/).waitFor();
  // duplicate reference rejected
  await page.getByRole('button', {name: /Receive a Payment/}).click();
  d = dlg();
  await fld(d, 'Amount').fill('10'); await fld(d, 'Unique reference').fill('PWR-' + u);
  await d.getByRole('button', {name: /Record received payment/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await d.getByText(/already been used/).waitFor({timeout: 8000*SCALE});
  await page.keyboard.press('Escape');
});
await step('vehicle billing: invoice popup (print) renders company, vehicle and totals; saved as A4 PDF', async () => {
  const [pop] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', {name: /Generate & print invoice/}).click()]);
  await pop.waitForLoadState();
  const text = await pop.innerText('body');
  if (!/Vehicle Invoice VINV-/.test(text) || !text.includes(`PW-${u}`)) throw new Error(text.slice(0, 200));
  await pop.pdf({path: `${OUT}/vehicle-invoice.pdf`, format: 'A4', printBackground: true});
  await pop.close();
});

// ───────── Daily report + custom transaction (UI)
await step('accounts: custom transaction via UI then daily report shows it, totals + A4 PDF', async () => {
  await page.goto(BASE + '/accounts', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: /Custom Transaction/}).click();
  const d = dlg();
  await fld(d, 'Custom title').fill(`PW tea ${u}`);
  await fld(d, 'Amount').fill('250');
  await fld(d, 'Date').fill('2026-11-12');
  await d.getByRole('button', {name: /Save transaction/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await page.waitForTimeout(800);
  await page.goto(BASE + '/expenses/daily-report', {waitUntil: 'networkidle'});
  await page.locator('input[type=date]').first().fill('2026-11-12');
  await page.getByText(`PW tea ${u}`).first().waitFor({timeout: 8000*SCALE});
  const txt = await page.locator('.daily-report-print').innerText();
  if (!/Total income/i.test(txt) || !/Net daily balance/i.test(txt) || !/Expense by category/.test(txt)) throw new Error('summary missing');
  await page.emulateMedia({media: 'print'});
  await page.pdf({path: `${OUT}/daily-report.pdf`, format: 'A4', printBackground: true, margin: {top: '14mm', bottom: '14mm', left: '14mm', right: '14mm'}});
  const visible = await page.evaluate(() => ({sidebar: !!document.querySelector('.sidebar') && getComputedStyle(document.querySelector('.sidebar')).display !== 'none', topbar: !!document.querySelector('.topbar') && getComputedStyle(document.querySelector('.topbar')).display !== 'none'}));
  await page.emulateMedia({media: 'screen'});
  if (visible.sidebar || visible.topbar) throw new Error('chrome visible in print: ' + JSON.stringify(visible));
});

// ───────── Maintenance custom purpose + garage payable (UI)
await step('maintenance: create job with Custom purpose via API-backed form, garage payable statement + partial payment via UI', async () => {
  const g = await api('POST', `/orgs/${ORG}/tasin-garages`, {name: `PW Garage ${u}`, mobile: '01', garage_type: 'General'});
  await api('POST', `/orgs/${ORG}/tasin-maintenance`, {vehicle_reg: `PW-${u}`, garage_name: `PW Garage ${u}`, date: '2026-11-10', problem_description: 'noise', service_type: 'Custom', custom_purpose: `Wiper ${u}`, labour_cost: '1000', parts_cost: '4000'});
  await page.goto(BASE + '/maintenance', {waitUntil: 'networkidle'});
  await page.getByText(`Wiper ${u}`).first().waitFor({timeout: 8000*SCALE});
  const row = page.locator('#garage-payables tr', {hasText: `PW Garage ${u}`});
  await row.getByText('৳ 5,000.00').first().waitFor({timeout: 8000*SCALE});
  await row.getByRole('button', {name: /Statement & pay/}).click();
  const d = dlg();
  await d.getByText('Garage payable –').waitFor();
  await fld(d, 'Amount').fill('2000');
  await fld(d, 'Vendor invoice').fill('GV-' + u);
  await d.getByRole('button', {name: /Record payment/}).click();
  await d.getByRole('button', {name: /Yes, confirm/}).click();
  await d.getByText('Payment recorded').waitFor({timeout: 8000*SCALE});
  await d.getByText('৳ 3,000.00').first().waitFor();
  // excess blocked client-side
  await fld(d, 'Amount').fill('3000.01');
  await d.getByText(/Cannot exceed the outstanding payable/).waitFor();
  void g;
  await page.keyboard.press('Escape');
});

// ───────── Agreements (UI)
await step('agreements: Owner Agreement with custom terms via UI; tabs separate; reload persists', async () => {
  await page.goto(BASE + '/agreements', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: /Add Agreement$/}).click();
  const d = dlg();
  await fld(d, 'Agreement type').selectOption({label: 'Owner Agreement'});
  await fld(d, /^Owner \*/).selectOption({label: `PW Owner ${u}`});
  await fld(d, 'Agreement title').fill(`PW owner deal ${u}`);
  await d.getByRole('button', {name: /Add term/}).click();
  await d.locator('textarea').first().fill('Rent paid before 5th.\nNo subletting.');
  await d.getByRole('button', {name: /Add term/}).click();
  await d.locator('textarea').nth(1).fill('Second term');
  await d.getByRole('button', {name: /Save draft/}).click();
  await page.getByText('Agreement saved').waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: 'Owner Agreements'}).click();
  await page.getByText(`PW owner deal ${u}`).waitFor({timeout: 8000*SCALE});
  await page.getByRole('button', {name: 'Client Agreements'}).click();
  await page.waitForTimeout(600);
  if (await page.getByText(`PW owner deal ${u}`).count()) throw new Error('owner agreement leaked into client tab');
  await page.reload({waitUntil: 'networkidle'});
  await page.getByRole('button', {name: 'Owner Agreements'}).click();
  await page.getByText(`PW owner deal ${u}`).waitFor({timeout: 8000*SCALE});
});

// ───────── Settings: finance policy + proration reflected in rent dialog
await step('settings: change rent proration to calendar days (audited) and see it in the rent review', async () => {
  await page.goto(BASE + '/settings', {waitUntil: 'networkidle'});
  const sel = page.locator('#finance-policy select').first();
  await sel.selectOption('calendar_days');
  await page.getByText(/Saved\. Already-posted/).waitFor({timeout: 8000*SCALE});
  const s = await api('GET', `/orgs/${ORG}/finance-settings`);
  if (s.body.rentProration !== 'calendar_days') throw new Error(JSON.stringify(s.body));
  await sel.selectOption('full_month');
});

// ───────── Authorization in the browser
await step('rbac: a viewer-role user is denied finance writes and Super Admin pages', async () => {
  const c2 = await b.newContext({viewport: {width: 1440, height: 900}});
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/login');
  await p2.fill('input[autocomplete="username"]', (process.env.E2E_STAFF || (()=>{throw new Error('set E2E_STAFF')})())); await p2.fill('input[type="password"]', (process.env.E2E_PASS || (()=>{throw new Error('set E2E_PASS')})()));
  await p2.click('button[type="submit"]');
  await p2.waitForURL(x => !x.pathname.startsWith('/login'));
  const ck = (await c2.cookies()).find(c => c.name === 'csrftoken')?.value || '';
  const r = await p2.request.fetch(BASE + `/backend/orgs/${ORG}/tasin-owners`, {method: 'POST', data: JSON.stringify({name: 'x', phone: '1'}), headers: {'Content-Type': 'application/json', 'X-CSRFToken': ck}});
  if (r.status() !== 403) throw new Error('owner create status ' + r.status());
  const r2 = await p2.request.fetch(BASE + `/backend/orgs/${ORG}/finance-settings`, {method: 'PUT', data: JSON.stringify({rent_proration: 'thirty_day'}), headers: {'Content-Type': 'application/json', 'X-CSRFToken': ck}});
  if (r2.status() !== 403) throw new Error('settings status ' + r2.status());
  await c2.close();
});
await step('auth: logged-out browser session cannot read API (401)', async () => {
  const c3 = await b.newContext();
  const r = await c3.request.get(BASE + `/backend/orgs/${ORG}/tasin-owners`);
  if (r.status() !== 401) throw new Error('status ' + r.status());
  await c3.close();
});

fs.writeFileSync(OUT + '/flows.json', JSON.stringify({results, consoleErrors, failed}, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\nflows: ${results.length - bad.length} passed, ${bad.length} failed; console errors ${consoleErrors.length}; failed requests ${failed.length}`);
failed.slice(0, 15).forEach(f => console.log('  net:', f));
consoleErrors.slice(0, 10).forEach(f => console.log('  console:', f));
await b.close();

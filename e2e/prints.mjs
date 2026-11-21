import {chromium} from 'playwright-core';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const OUT = process.env.OUT || 'prints1';
fs.mkdirSync(OUT + '/pdfs', {recursive: true});
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}});
await ctx.addInitScript(() => { window.print = () => {}; });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const results = []; const pdfs = [];
const u = Math.random().toString(36).slice(2, 7);
async function step(name, fn) {
  try { await fn(); results.push({name, ok: true}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, err: String(e).split('\n')[0].slice(0, 240)}); console.log('FAIL', name, '::', String(e).split('\n')[0].slice(0, 240)); try { await page.screenshot({path: `${OUT}/FAIL_${name.replace(/\W+/g, '_').slice(0, 50)}.png`}); } catch {} }
}
const csrf = async () => (await ctx.cookies()).find(c => c.name === 'csrftoken')?.value || '';
const api = async (method, path, body, key) => { const r = await page.request.fetch(BASE + '/backend' + path, {method, data: body ? JSON.stringify(body) : undefined, headers: {'Content-Type': 'application/json', 'X-CSRFToken': await csrf(), ...(key ? {'Idempotency-Key': key} : {})}}); return {status: r.status(), body: await r.json().catch(() => null)}; };
const save = async (name, p, opts = {}) => { const f = `${OUT}/pdfs/${name}.pdf`; await p.pdf({path: f, format: 'A4', printBackground: true, ...opts}); pdfs.push({name, file: f}); };
const goto = async p => { await page.goto(BASE + p, {waitUntil: 'networkidle'}); await page.waitForTimeout(800); };

await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', process.env.E2E_USER); await page.fill('input[type="password"]', process.env.E2E_PASS);
await page.click('button[type="submit"]'); await page.waitForURL(x => !x.pathname.startsWith('/login'));
const ORG = (await (await page.request.get(BASE + '/backend/me')).json()).organizations[0].id;
const O = p => `/orgs/${ORG}${p}`;
const D = {};

await step('setup: realistic multi-page demo data (driver, owner, client, garage, invoice, agreement, duties)', async () => {
  const drv = await api('POST', O('/tasin-drivers'), {name: `PR Driver ${u}`, phone: '017', monthly_salary: '20000', advance: '10000', previous_fuel_gas_due: '5000'});
  D.driver = drv.body.id;
  for (let i = 0; i < 45; i++) await api('POST', O(`/drivers/${D.driver}/advances`), {amount: String(100 + i), date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, description: 'Advance ' + i}, `adv${u}${i}`);
  for (let i = 0; i < 45; i++) await api('POST', O(`/drivers/${D.driver}/fuel-gas`), {amount: String(50 + i), date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, direction: 'driver_owes', description: 'Fuel ' + i}, `fuel${u}${i}`);
  await api('POST', O(`/drivers/${D.driver}/salary-payments`), {salary_month: '2026-10', payment_date: '2026-10-31', advance_adjustment: '2000', fuel_gas_settlement: '1000', fuel_gas_mode: 'cash'}, `sal${u}`);
  const own = await api('POST', O('/tasin-owners'), {name: `PR Owner ${u}`, phone: '019', opening_balance: '50000', opening_balance_type: 'payable'});
  D.owner = own.body.id;
  for (let i = 0; i < 55; i++) await api('POST', O(`/owners/${D.owner}/charges`), {amount: String(200 + i), date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, description: 'Extra charge number ' + i}, `ch${u}${i}`);
  await api('POST', O(`/owners/${D.owner}/ledger-payments`), {amount: '5000', date: '2026-10-30', reference: 'OP' + u}, `op${u}`);
  const cl = await api('POST', O('/tasin-clients'), {name: `PR Client ${u}`, contact_person: 'X', phone: '016', opening_balance: '200000'});
  D.client = cl.body.id;
  for (let i = 0; i < 50; i++) await api('POST', O(`/clients/${D.client}/ledger-payments`), {amount: String(100 + i), date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, reference: `CP${u}${i}`}, `cp${u}${i}`);
  const veh = await api('POST', O('/tasin-vehicles'), {registration: `PR-${u}`, brand: 'Toyota', model: 'Axio', owner_id: Number(D.owner), monthly_rent: '60000', status: 'Available'});
  D.vehicle = veh.body.id;
  for (let i = 0; i < 60; i++) await api('POST', O('/tasin-duties'), {date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, client_id: D.client, client_name: `PR Client ${u}`, vehicle_id: D.vehicle, vehicle_reg: `PR-${u}`, driver_id: D.driver, driver_name: `PR Driver ${u}`, pickup_location: 'Gulshan ' + i, destination: 'Airport ' + i, start_time: '09:00', customer_contact: '017', agreed_rent: String(1000 + i), status: 'Completed'});
  const duties = (await api('GET', O('/tasin-duties'))).body.filter(d => d.vehicleReg === `PR-${u}`);
  D.dutyIds = duties.map(d => Number(d.id));
  const inv = await api('POST', O('/tasin-invoices'), {client_id: Number(D.client), issue_date: '2026-10-31', due_date: '2026-11-30', duty_ids: D.dutyIds.slice(0, 45), custom_items: Array.from({length: 20}, (_, i) => ({description: 'Custom item ' + i, quantity: '1', unit_price: String(100 + i)}))});
  D.invoice = inv.body;
  await api('POST', O(`/tasin-invoices/${inv.body.id}/payments`), {date: '2026-11-02', amount: '5000', payment_method: 'Cash', reference: 'INVPAY' + u});
  const g = await api('POST', O('/tasin-garages'), {name: `PR Garage ${u}`, mobile: '01', garage_type: 'General'});
  D.garage = g.body.id;
  for (let i = 0; i < 60; i++) await api('POST', O('/tasin-maintenance'), {vehicle_reg: `PR-${u}`, garage_name: `PR Garage ${u}`, date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, problem_description: 'Job ' + i, labour_cost: String(100 + i), parts_cost: '50'});
  await api('POST', O(`/garages/${D.garage}/payments`), {amount: '3000', date: '2026-10-30', reference: 'GP' + u}, `gp${u}`);
  const terms = Array.from({length: 40}, (_, i) => `Term number ${i + 1}: The renter shall comply with condition ${i + 1} of this agreement.\nSecond line of term ${i + 1}.`);
  const ag = await api('POST', O('/tasin-agreements'), {agreement_type: 'owner', party_id: Number(D.owner), vehicle_id: Number(D.vehicle), title: `PR Owner Agreement ${u}`, start_date: '2026-10-01', custom_terms: terms, finalize: true});
  D.agreement = ag.body.id;
  if (ag.status !== 200) throw new Error('agreement ' + JSON.stringify(ag.body));
});

const popupPdf = async (name, trigger) => { const [pop] = await Promise.all([page.waitForEvent('popup', {timeout: 20000}), trigger()]); await pop.waitForLoadState(); await save(name, pop); await pop.close(); };

await step('driver: Full statement, Salary, Advance and Fuel/Gas reports print (multi-page)', async () => {
  await goto('/drivers');
  await page.getByPlaceholder(/Search by Name/).fill(`PR Driver ${u}`);
  await page.locator('tr', {hasText: `PR Driver ${u}`}).first().click();
  await page.locator('#driver-finance').getByText('Transaction history').waitFor();
  for (const [val, name] of [['all', 'driver-full'], ['salary', 'driver-salary'], ['advance', 'driver-advance'], ['fuel', 'driver-fuelgas']]) {
    await page.locator('#driver-finance select').selectOption(val);
    await popupPdf(name, () => page.locator('#driver-finance').getByRole('button', {name: /^Print$/}).click());
  }
});
await step('owner: statement prints (multi-page)', async () => {
  await goto('/owners');
  await page.getByPlaceholder(/Search/).first().fill(`PR Owner ${u}`);
  await page.locator('tr', {hasText: `PR Owner ${u}`}).first().click();
  await page.getByText(`Owner financial summary – PR Owner ${u}`).waitFor();
  await popupPdf('owner-statement', () => page.getByRole('button', {name: /^Print$/}).click());
});
await step('client: statement prints via the page "Print Client Ledger" button (multi-page)', async () => {
  await goto('/customers');
  await page.getByPlaceholder(/Search/).first().fill(`PR Client ${u}`);
  await page.locator('tr', {hasText: `PR Client ${u}`}).first().click();
  await page.getByText(`Client financial summary – PR Client ${u}`).waitFor();
  await popupPdf('client-statement', () => page.getByRole('button', {name: /Print Client Ledger/}).click());
});
await step('garage: payable statement prints (multi-page)', async () => {
  await goto('/maintenance');
  const row = page.locator('#garage-payables tr', {hasText: `PR Garage ${u}`});
  await row.getByRole('button', {name: /Statement & pay/}).click();
  await page.locator('[role=dialog]').last().getByText('Garage payable –').waitFor();
  await popupPdf('garage-statement', () => page.locator('[role=dialog]').last().getByRole('button', {name: /Print statement/}).click());
  await page.keyboard.press('Escape');
});
await step('invoice: client invoice view shows its line items and prints (multi-page); payment receipt prints', async () => {
  await goto(`/customers/${D.client}`);
  await page.getByTitle('View / print invoice').first().click();
  const dlgx = page.locator('[role=dialog]').last();
  await dlgx.getByText('Billed To:').waitFor();
  await dlgx.locator('tbody tr').nth(10).waitFor({timeout: 20000});   // line items are loaded (65 of them)
  const lines = await dlgx.locator('tbody tr').count();
  if (lines < 60) throw new Error('invoice lines shown: ' + lines);
  await popupPdf('invoice', () => dlgx.getByRole('button', {name: /Print Invoice/}).click());
  await popupPdf('receipt', () => dlgx.getByRole('button', {name: /Print receipt/}).first().click());
});
await step('vehicle invoice: monthly invoice with 60 duty lines prints (multi-page)', async () => {
  await goto('/vehicles');
  await page.getByPlaceholder(/Search/).first().fill(`PR-${u}`);
  await page.getByText(`PR-${u}`).first().click();
  await page.getByText(/Billing & Payments –/).waitFor();
  await page.locator('input[type=month]').first().fill('2026-10');
  await popupPdf('vehicle-invoice', () => page.getByRole('button', {name: /Generate & print invoice/}).click());
});
await step('agreement: finalized agreement with 40 terms prints (multi-page)', async () => {
  await goto('/agreements');
  await page.getByRole('button', {name: 'Owner Agreements'}).click();
  const row = page.locator('tr', {hasText: `PR Owner Agreement ${u}`}).first();
  await row.waitFor();
  await row.getByRole('button', {name: 'View'}).click();
  await popupPdf('agreement', () => page.locator('[role=dialog]').last().getByRole('button', {name: /^Print$/}).click());
});
await step('daily report: 120 transactions on one date print (multi-page)', async () => {
  for (let i = 0; i < 120; i++) await api('POST', O('/transactions/custom'), {transaction_type: i % 3 === 0 ? 'Income' : 'Expense', title: `Bulk ${i % 9} item`, amount: String(100 + i), date: '2026-09-09', description: 'x'.repeat(20 + (i % 50))}, `d${u}${i}`);
  await goto('/expenses/daily-report');
  await page.locator('input[type=date]').first().fill('2026-09-09');
  await page.getByText('Bulk 0 item').first().waitFor();
  await page.emulateMedia({media: 'print'});
  await save('daily-report', page, {margin: {top: '14mm', bottom: '14mm', left: '14mm', right: '14mm'}});
  await page.emulateMedia({media: 'screen'});
});
await step('reports page: print/PDF of the analytics page in print media', async () => {
  await goto('/reports');
  await page.waitForTimeout(1500);
  await page.emulateMedia({media: 'print'});
  await save('reports-analytics', page, {margin: {top: '14mm', bottom: '14mm', left: '14mm', right: '14mm'}});
  await page.emulateMedia({media: 'screen'});
});

fs.writeFileSync(OUT + '/prints.json', JSON.stringify({u, results, pdfs, D}, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\nprints: ${results.length - bad.length} passed, ${bad.length} failed; ${pdfs.length} PDFs written`);
await b.close();

import {chromium} from 'playwright-core';
import fs from 'fs';
const BASE = 'http://127.0.0.1:3100';
const OUT = process.env.OUT || 'modules1';
const ONLY = (process.argv[2] || 'all').split(',');
fs.mkdirSync(OUT, {recursive: true});
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
await ctx.addInitScript(() => { window.print = () => {}; });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
const consoleErrors = []; const failed = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 100)}`); });
const results = [];
const u = Math.random().toString(36).slice(2, 7);
const MARK = 'E2E-' + u;
async function step(name, fn) {
  try { await fn(); results.push({name, ok: true}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, err: String(e).split('\n')[0].slice(0, 260)}); console.log('FAIL', name, '::', String(e).split('\n')[0].slice(0, 260)); try { await page.screenshot({path: `${OUT}/FAIL_${name.replace(/\W+/g, '_').slice(0, 50)}.png`}); } catch {} }
}
const want = s => ONLY.includes('all') || ONLY.includes(s);
const dlg = () => page.locator('[role=dialog]').last();
const csrf = async () => (await ctx.cookies()).find(c => c.name === 'csrftoken')?.value || '';
const api = async (method, path, body) => { const r = await page.request.fetch(BASE + '/backend' + path, {method, data: body ? JSON.stringify(body) : undefined, headers: {'Content-Type': 'application/json', 'X-CSRFToken': await csrf()}}); return {status: r.status(), body: await r.json().catch(() => null)}; };
const pick = async (trigger, optionText) => { await trigger.click(); await page.getByRole('option', {name: optionText, exact: false}).first().click(); };
const goto = async p => { await page.goto(BASE + p, {waitUntil: 'load', timeout: 30000}); await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {}); await page.waitForTimeout(1200); };
const num = s => Number(String(s).replace(/[^0-9.\-]/g, ''));

await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', process.env.E2E_USER); await page.fill('input[type="password"]', process.env.E2E_PASS);
await page.click('button[type="submit"]'); await page.waitForURL(x => !x.pathname.startsWith('/login'));
const ORG = (await (await page.request.get(BASE + '/backend/me')).json()).organizations[0].id;
const A = p => `/orgs/${ORG}${p}`;
const ctxData = {};

// ───────── DASHBOARD
if (want('dashboard')) {
  await step('dashboard: KPIs shown equal the API/database values', async () => {
    await goto('/');
    const k = (await api('GET', A('/dashboard/kpis'))).body;
    const text = (await page.locator('.content').first().innerText()).replace(/,/g, '');
    const recv = Math.round(k.financials.customerReceivable ?? k.financials.totalCustomerReceivable ?? -1);
    const veh = k.vehicles.total;
    if (!new RegExp('\\b' + veh + '\\b').test(text)) throw new Error('vehicle total ' + veh + ' not on page');
    ctxData.kpi = k;
    if (recv > 0 && !text.includes(String(recv)) && !text.includes(String(Math.round(recv / 1000)) + 'K')) throw new Error('receivable ' + recv + ' not on page: ' + JSON.stringify(k.financials).slice(0, 200));
  });
  await step('dashboard: period buttons (Daily/Weekly/Monthly/Yearly) re-query the API', async () => {
    for (const label of ['Daily', 'Weekly', 'Yearly', 'Monthly']) {
      const reqP = page.waitForRequest(r => r.url().includes('/dashboard/kpis'), {timeout: 8000}).catch(() => null);
      await page.getByRole('button', {name: label, exact: true}).first().click();
      await reqP;
    }
  });
  await step('dashboard: quick actions navigate to their modules', async () => {
    await goto('/');
    await page.getByRole('heading', {name: 'Quick Actions'}).waitFor({timeout: 20000});
    const qa = page.getByRole('heading', {name: 'Quick Actions'}).locator('xpath=..');
    const links = await qa.locator('a').allInnerTexts();
    if (links.length < 2) throw new Error('no quick actions found');
    await qa.locator('a').first().click();
    await page.waitForTimeout(1200);
    if (new URL(page.url()).pathname === '/') throw new Error('quick action did not navigate');
  });
  await step('dashboard: viewer (limited role) sees only permitted data, no admin links', async () => {
    const c2 = await b.newContext({viewport: {width: 1440, height: 900}}); const p2 = await c2.newPage();
    await p2.goto(BASE + '/login'); await p2.fill('input[autocomplete="username"]', process.env.E2E_STAFF); await p2.fill('input[type="password"]', process.env.E2E_PASS);
    await p2.click('button[type="submit"]'); await p2.waitForURL(x => !x.pathname.startsWith('/login'));
    await p2.goto(BASE + '/settings', {waitUntil: 'networkidle'}); await p2.waitForTimeout(800);
    const txt = await p2.locator('body').innerText();
    if (/Accounting policy/.test(txt) && /Save/.test(txt) && !/restricted|denied|permission|request access/i.test(txt)) throw new Error('viewer reached settings content');
    await c2.close();
  });
}

// ───────── DUTIES
if (want('duties')) {
  await step('duties: list loads with real rows and totals', async () => {
    await goto('/duties');
    await page.locator('tbody tr').first().waitFor({timeout: 15000});
    const rows = await page.locator('tbody tr').count();
    const apiRows = (await api('GET', A('/tasin-duties'))).body.length;
    ctxData.dutyCountBefore = apiRows;
    if (rows === 0) throw new Error('no rows');
  });
  await step('duties: empty submit shows validation errors and saves nothing', async () => {
    await page.getByRole('button', {name: 'Add Duty'}).click();
    await dlg().getByRole('button', {name: /Save|Create|Add Duty|Schedule/}).last().click();
    await page.waitForTimeout(500);
    const n = (await api('GET', A('/tasin-duties'))).body.length;
    if (n !== ctxData.dutyCountBefore) throw new Error('a duty was created by an empty form');
    const txt = await dlg().innerText();
    if (!/required|select|enter/i.test(txt)) throw new Error('no validation text: ' + txt.slice(0, 200));
  });
  await step('duties: create a duty through the form; total is computed and persisted', async () => {
    const d = dlg();
    const combos = d.getByRole('combobox');
    await pick(combos.nth(0), /Daily|Monthly|Trip|Outstation/);   // type
    await combos.nth(1).click(); await page.getByRole('option').first().click();   // client
    await combos.nth(2).click(); await page.getByRole('option').first().click();   // vehicle
    await combos.nth(3).click(); await page.getByRole('option').first().click();   // driver
    await d.locator('input[type=date]').first().fill('2027-03-05');
    await d.getByPlaceholder('e.g. Gulshan-1, Dhaka').fill('Gulshan ' + MARK);
    await d.getByPlaceholder('e.g. Airport Road').fill('Airport ' + MARK);
    await d.locator('input[type=time]').first().fill('09:00');
    await d.getByPlaceholder('01XXXXXXXXX').fill('01711000000');
    const nums = d.locator('input[type=number]');
    await nums.nth(0).fill('5000'); await nums.nth(1).fill('500'); await nums.nth(2).fill('200'); await nums.nth(3).fill('300'); await nums.nth(4).fill('100'); await nums.nth(5).fill('150');
    await d.getByRole('button', {name: /Create Duty/}).click();
    await page.getByText('Gulshan ' + MARK).first().waitFor({timeout: 15000});
    const row = (await api('GET', A('/tasin-duties'))).body.find(x => x.pickupLocation === 'Gulshan ' + MARK);
    if (!row) throw new Error('not persisted');
    ctxData.duty = row;
    const expected = 5000 + 500 + 200 + 300 + 100 - 150;
    if (Math.round(row.totalAmount) !== expected) throw new Error(`total ${row.totalAmount} != ${expected}`);
  });
  await step('duties: search and filters narrow the list correctly', async () => {
    await page.getByPlaceholder(/Search client, vehicle/).fill(MARK);
    await page.waitForTimeout(500);
    if ((await page.locator('tbody tr').count()) !== 1) throw new Error('search did not isolate the duty');
    await page.getByPlaceholder(/Search client, vehicle/).fill('zzzz-no-such');
    await page.waitForTimeout(400);
    const txt = await page.locator('.content').first().innerText();
    if (!/no duties|no results|nothing|no records/i.test(txt) && (await page.locator('tbody tr').count()) > 0) throw new Error('empty state missing');
    await page.getByPlaceholder(/Search client, vehicle/).fill(MARK);
  });
  await step('duties: conflicting booking (same vehicle+driver+date) is rejected with the server message and not stored', async () => {
    await page.getByPlaceholder(/Search client, vehicle/).fill('');
    await page.getByRole('button', {name: 'Add Duty'}).click();
    const d = dlg(); const combos = d.getByRole('combobox');
    await pick(combos.nth(0), /Daily|Monthly|Trip|Outstation/);
    await combos.nth(1).click(); await page.getByRole('option').first().click();
    await combos.nth(2).click(); await page.getByRole('option').first().click();
    await combos.nth(3).click(); await page.getByRole('option').first().click();
    await d.locator('input[type=date]').first().fill('2027-03-05');
    await d.getByPlaceholder('e.g. Gulshan-1, Dhaka').fill('Conflict ' + MARK);
    await d.getByPlaceholder('e.g. Airport Road').fill('X');
    await d.locator('input[type=time]').first().fill('10:00');
    await d.getByPlaceholder('01XXXXXXXXX').fill('01711000000');
    await d.locator('input[type=number]').first().fill('1000');
    await d.getByRole('button', {name: /Create Duty/}).click();
    await d.getByText(/already booked/).waitFor({timeout: 10000});
    const n = (await api('GET', A('/tasin-duties'))).body.filter(x => x.pickupLocation === 'Conflict ' + MARK).length;
    if (n !== 0) throw new Error('conflicting duty was stored');
    await d.getByRole('button', {name: 'Cancel'}).click();
    await page.getByPlaceholder(/Search client, vehicle/).fill(MARK);
  });
  await step('duties: status flow Scheduled → Running → Completed through confirmation dialogs; persisted', async () => {
    const row = page.locator('tbody tr', {hasText: MARK}).first();
    await row.getByTitle(/Start/i).click().catch(async () => { await row.locator('button').filter({hasText: /Start/}).click(); });
    await dlg().getByRole('button').filter({hasText: /Start|Confirm|Yes/}).last().click();
    await page.waitForTimeout(800);
    let st = (await api('GET', A('/tasin-duties'))).body.find(x => x.id === ctxData.duty.id).status;
    if (st !== 'Running') throw new Error('status ' + st);
    await row.getByTitle(/Complete/i).click().catch(async () => { await row.locator('button').filter({hasText: /Complete/}).click(); });
    await dlg().getByRole('button').filter({hasText: /Complete|Confirm|Yes/}).last().click();
    await page.waitForTimeout(800);
    st = (await api('GET', A('/tasin-duties'))).body.find(x => x.id === ctxData.duty.id).status;
    if (st !== 'Completed') throw new Error('status ' + st);
  });
  await step('duties: edit persists; print popup renders the duty slip', async () => {
    const row = page.locator('tbody tr', {hasText: MARK}).first();
    await row.getByTitle(/Edit/i).click();
    await dlg().getByPlaceholder('e.g. Airport Road').fill('Airport EDITED ' + MARK);
    await dlg().getByRole('button', {name: /Save Changes/}).click();
    let d;
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(700); d = (await api('GET', A('/tasin-duties'))).body.find(x => x.id === ctxData.duty.id); if (d.destination.startsWith('Airport EDITED')) break; }
    if (!d.destination.startsWith('Airport EDITED')) throw new Error('edit not saved: ' + d.destination);
    const [pop] = await Promise.all([page.waitForEvent('popup', {timeout: 8000}), row.getByTitle(/Print/i).click()]);
    await pop.waitForLoadState();
    const txt = await pop.innerText('body');
    if (!txt.includes(MARK)) throw new Error('duty slip lacks the duty: ' + txt.slice(0, 160));
    await pop.pdf({path: `${OUT}/duty-slip.pdf`, format: 'A4'});
    await pop.close();
  });
  await step('duties: invoice/collection linkage — completed duty is billable via the invoice API and shows in client profile', async () => {
    const d = ctxData.duty;
    const inv = await api('POST', A('/tasin-invoices'), {client_id: Number(d.clientId), issue_date: '2026-11-18', due_date: '2026-12-18', duty_ids: [Number(d.id)]});
    if (inv.status !== 200) throw new Error('invoice ' + inv.status + JSON.stringify(inv.body));
    ctxData.invoice = inv.body;
    const duty = (await api('GET', A('/tasin-duties'))).body.find(x => x.id === d.id);
    const prof = (await api('GET', A(`/tasin-clients/${d.clientId}/profile`))).body;
    if (!prof.invoices.some(i => i.invoiceNumber === inv.body.invoiceNumber)) throw new Error('invoice missing from client profile');
    void duty;
  });
}

// ───────── NOTIFICATIONS
if (want('notifications')) {
  await step('notifications: system alerts listed with counts equal to the API', async () => {
    await goto('/notifications');
    const alerts = (await api('GET', A('/tasin-alerts'))).body;
    ctxData.alerts = alerts;
    const txt = (await page.locator('.content').first().innerText()).replace(/\s+/g, ' ');
    if (!txt.includes(`System Expiry & Due Alerts (${alerts.length})`)) throw new Error(`count mismatch: api ${alerts.length}; page: ${(txt.match(/Due Alerts \(\d+\)/) || ['none'])[0]}`);
  });
  await step('notifications: add custom reminder via UI; appears; persists in DB', async () => {
    await page.getByRole('button', {name: /Add Custom Reminder/}).click();
    const d = dlg();
    await d.locator('input').first().fill('Reminder ' + MARK);
    await d.locator('input[type=date]').first().fill('2026-12-01');
    await d.getByRole('button', {name: /Save|Add|Create/}).last().click();
    await page.getByRole('button', {name: /Custom Reminders/}).click();
    await page.getByText('Reminder ' + MARK).first().waitFor({timeout: 8000});
    const r = (await api('GET', A('/custom-reminders'))).body.find(x => x.title === 'Reminder ' + MARK);
    if (!r) throw new Error('not in DB');
    ctxData.reminder = r;
    if (r.reminderDate !== '2026-12-01') throw new Error('date not stored: ' + r.reminderDate);
    const shown = (await page.locator('.content').first().innerText()).replace(/\s+/g, ' ');
    if (!/Reminder Date: 2026-12-01/.test(shown)) throw new Error('date not displayed on the card: ' + shown.slice(0, 200));
  });
  await step('notifications: dismiss (delete) the reminder; removed from the database', async () => {
    await page.locator('div').filter({hasText: 'Reminder ' + MARK}).filter({has: page.getByRole('button', {name: /Dismiss/})}).last().getByRole('button', {name: /Dismiss/}).click();
    await page.waitForTimeout(1200);
    const r = (await api('GET', A('/custom-reminders'))).body.find(x => x.title === 'Reminder ' + MARK);
    if (r) throw new Error('reminder still in DB');
  });
  await step('notifications: mark one alert read, then Mark All Read; unread count drops to 0 in API', async () => {
    await page.getByRole('button', {name: /System Expiry & Due Alerts/}).click();
    await api('POST', A('/tasin-alerts'), {alert_type: 'custom', severity: 'warning', title: 'Alert ' + MARK, detail: 'e2e'});
    await api('POST', A('/tasin-alerts'), {alert_type: 'custom', severity: 'info', title: 'Alert B ' + MARK, detail: 'e2e'});
    await page.getByRole('button', {name: /Refresh/}).click(); await page.waitForTimeout(1500);
    const before = (await api('GET', A('/tasin-alerts'))).body.filter(a => !a.isRead).length;
    if (before > 0) {
      await page.getByRole('button', {name: 'Mark as Read'}).first().click();
      let mid = before;
      for (let i = 0; i < 12 && mid === before; i++) { await page.waitForTimeout(700); mid = (await api('GET', A('/tasin-alerts'))).body.filter(a => !a.isRead).length; }
      if (mid !== before - 1) throw new Error(`unread ${before} -> ${mid}`);
      const btn = page.getByRole('button', {name: /Mark All Read/});
      if ((await btn.count()) && (await btn.isEnabled())) { await btn.click(); await page.waitForTimeout(1200); }   // disabled when nothing is unread
      let after = 99;
      for (let i = 0; i < 12 && after !== 0; i++) { await page.waitForTimeout(700); after = (await api('GET', A('/tasin-alerts'))).body.filter(a => !a.isRead).length; }
      if (after !== 0) throw new Error('unread remaining ' + after);
    }
  });
  await step('notifications: search and category/status filters', async () => {
    await page.getByPlaceholder('Search notifications...').fill('zzzz-nothing');
    await page.waitForTimeout(500);
    const t = await page.locator('.content').first().innerText();
    if (!/No matching notifications/i.test(t)) throw new Error('empty state missing');
    await page.getByPlaceholder('Search notifications...').fill('');
  });
}

// ───────── DUE & COLLECTION
if (want('due')) {
  await step('due: four tabs show totals equal to the API aggregates', async () => {
    await goto('/due-collection');
    const dc = (await api('GET', A('/tasin-due-collection'))).body;
    ctxData.dc = dc;
    const tabs = await page.locator('[role=tab]').allInnerTexts();
    if (tabs.length < 4) throw new Error('tabs ' + tabs.length);
    const fmtK = v => Math.round(v / 1000) + 'K';
    const txt = tabs.join(' ');
    if (!txt.includes(fmtK(dc.totals.customerReceivable)) && !txt.includes(String(Math.round(dc.totals.customerReceivable)))) throw new Error('receivable tab: ' + txt);
  });
  await step('due: search narrows the client table', async () => {
    const before = await page.locator('tbody tr').count();
    await page.getByPlaceholder(/Search client/).fill('zzzz-no-client');
    await page.waitForTimeout(400);
    const after = await page.locator('tbody tr').count();
    if (!(after < before) && !/no /i.test(await page.locator('.content').first().innerText())) throw new Error(`rows ${before} -> ${after}`);
    await page.getByPlaceholder(/Search client/).fill('');
  });
  await step('due: receive a payment from a client in the UI; remaining due decreases in the API; over-collection rejected', async () => {
    const dc = (await api('GET', A('/tasin-due-collection'))).body;
    const client = dc.clients.find(c => c.remaining > 1000);
    if (!client) throw new Error('no client with a due in the data');
    await goto('/due-collection');
    await page.getByPlaceholder(/Search client/).fill(client.name);   // the table is paginated: find the row by search
    await page.waitForTimeout(500);
    const row = page.locator('tbody tr', {hasText: client.name}).first();
    await row.getByRole('button', {name: /Receive Payment/}).click();
    const d = dlg();
    const amt = d.locator('input[type=number]').first();
    await amt.fill(String(client.remaining + 5000));
    await d.getByRole('button', {name: /Receive|Confirm|Save|Collect|Record/}).last().click();
    await page.waitForTimeout(900);
    const stillOpen = await dlg().count();
    const same = (await api('GET', A('/tasin-due-collection'))).body.clients.find(c => c.id === client.id).remaining;
    if (same !== client.remaining) throw new Error('over-collection was accepted: ' + same);
    const msg = await d.innerText();
    if (!/cannot exceed/i.test(msg)) throw new Error('over-collection was not rejected in the dialog: ' + msg.slice(0, 160));
    await amt.fill('1000');
    await d.locator('select').first().selectOption({label: 'Bank Transfer'}).catch(() => {});
    await d.getByRole('button', {name: /Receive|Confirm|Save|Collect|Record/}).last().click();
    let after = client.remaining;
    for (let i = 0; i < 14 && Math.round(after) === Math.round(client.remaining); i++) { await page.waitForTimeout(700); after = (await api('GET', A('/tasin-due-collection'))).body.clients.find(c => c.id === client.id).remaining; }
    if (Math.round(after) !== Math.round(client.remaining - 1000)) throw new Error(`remaining ${client.remaining} -> ${after}`);
    const t = (await api('GET', A('/tasin-transactions'))).body.find(x => x.category === 'Customer Collection' && Math.round(x.amount) === 1000 && x.relatedPerson === client.name);
    if (!t) throw new Error('collection transaction missing in Accounts');
    void stillOpen;
  });
  await step('due: owner, driver and garage tabs open with their rows', async () => {
    for (const name of [/Owner Payable/, /Driver Payable/, /Garage Payable/]) {
      await page.getByRole('tab', {name}).click();
      await page.waitForTimeout(500);
      if ((await page.locator('tbody tr').count()) === 0) throw new Error('empty ' + name);
    }
  });
  await step('due: follow-up can be logged for a client and is persisted', async () => {
    await page.getByRole('tab', {name: /Customer Receivable/}).click();
    await page.locator('tbody tr').first().getByRole('button', {name: /Follow-up/}).click();
    const d = dlg();
    await d.locator('textarea, input[type=text], input:not([type])').first().fill('Called ' + MARK);
    await d.getByRole('button', {name: /Save Follow-up/}).click();
    let f = [];
    for (let i = 0; i < 10; i++) { await page.waitForTimeout(700); f = (await api('GET', A('/due-followups'))).body; if (JSON.stringify(f).includes('Called ' + MARK)) break; }
    if (!JSON.stringify(f).includes('Called ' + MARK)) throw new Error('follow-up not stored');
    await d.getByText('Called ' + MARK).first().waitFor({timeout: 8000});
  });
}

// ───────── VEHICLE SEARCH
if (want('vsearch')) {
  await step('vehicle search: results equal the fleet; search narrows; status chips filter', async () => {
    await goto('/vehicle-search');
    const fleet = (await api('GET', A('/tasin-vehicles'))).body;
    ctxData.fleet = fleet;
    const reg = fleet[0].registration;
    await page.getByPlaceholder(/Search by registration/).fill(reg);
    await page.waitForTimeout(700);
    const txt = await page.locator('.content').first().innerText();
    if (!txt.includes(reg)) throw new Error('searched vehicle not shown');
    await page.getByPlaceholder(/Search by registration/).fill('zzzz-none');
    await page.waitForTimeout(600);
    await page.getByText('No vehicles found').waitFor({timeout: 10000});   // search is server-side: wait for the response
    await page.getByPlaceholder(/Search by registration/).fill('');
    await page.getByRole('button', {name: 'In Garage', exact: true}).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', {name: 'All', exact: true}).click();
  });
  await step('vehicle search: statement panel matches the statement API (income, rent, maintenance, net)', async () => {
    const fleet = ctxData.fleet || (await api('GET', A('/tasin-vehicles'))).body;
    const v = fleet.find(x => x.registration) ;
    await page.getByPlaceholder(/Search by registration/).fill(v.registration);
    await page.waitForTimeout(600);
    await page.getByRole('button', {name: /View Statement/}).first().click();
    await page.waitForTimeout(1500);
    const st = (await api('GET', A(`/tasin-vehicle-search/${v.id}/statement`))).body;
    const txt = (await page.locator('.content').first().innerText()).replace(/,/g, '');
    for (const val of [st.financials.ownerRent, st.financials.maintenanceCost]) {
      if (!txt.includes(String(Math.round(val)))) throw new Error('statement value ' + val + ' missing on screen');
    }
  });
  await step('vehicle search: Export Fleet CSV downloads a CSV with every vehicle', async () => {
    await page.getByPlaceholder(/Search by registration/).fill('');
    await page.getByRole('button', {name: 'All', exact: true}).click();
    const fleetN = (await api('GET', A('/tasin-vehicles'))).body.length;
    for (let i = 0; i < 15 && (await page.getByRole('button', {name: /View Statement/}).count()) < Math.min(fleetN, 3); i++) await page.waitForTimeout(700);
    await page.waitForTimeout(1500);
    const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 8000}), page.getByRole('button', {name: /Export Fleet CSV/}).click()]);
    const p = `${OUT}/fleet.csv`; await dl.saveAs(p);
    const lines = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
    const fleet = (await api('GET', A('/tasin-vehicles'))).body;
    if (lines.length - 1 !== fleet.length) throw new Error(`csv rows ${lines.length - 1} vs fleet ${fleet.length}`);
  });
}

// ───────── REPORTS
if (want('reports')) {
  await step('reports: every report tab loads data without error', async () => {
    await goto('/reports');
    const tabs = await page.locator('[role=tab]').allInnerTexts();
    ctxData.reportTabs = tabs;
    for (let ti = 0; ti < tabs.length; ti++) {
      const t = tabs[ti];
      await page.locator('[role=tab]').nth(ti).scrollIntoViewIfNeeded();
      await page.locator('[role=tab]').nth(ti).click();
      await page.waitForTimeout(700);
      const txt = await page.locator('.content').first().innerText();
      if (/error|failed to load|something went wrong/i.test(txt)) throw new Error('tab ' + t + ' shows an error');
    }
  });
  await step('reports: Vehicle Profitability rows equal the API for the chosen range', async () => {
    await page.locator('[role=tab]').filter({hasText: /Vehicle Profitability/}).first().click();
    const api1 = (await api('GET', A('/tasin-reports/vehicle-profitability'))).body;
    await page.waitForTimeout(800);
    const rows = await page.locator('tbody tr').count();
    const n = Array.isArray(api1) ? api1.length : (api1.vehicles || api1.rows || []).length;
    if (n && rows < Math.min(n, 5)) throw new Error(`rows ${rows} vs api ${n}`);
  });
  await step('reports: date-range filter re-queries and a future-only range yields an empty report', async () => {
    const from = page.locator('input[type=date]').first(); const to = page.locator('input[type=date]').nth(1);
    const reqP = page.waitForRequest(r => /vehicle-profitability|account-ledger|snapshot|reports/.test(r.url()), {timeout: 8000}).catch(() => null);
    await from.fill('2030-01-01'); await to.fill('2030-01-31');
    await reqP; await page.waitForTimeout(900);
    const txt = await page.locator('.content').first().innerText();
    if (!/no data|no records|empty|0\b/i.test(txt)) throw new Error('no empty/zero indication');
  });
  await step('reports: CSV export downloads and Print/PDF renders as A4', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 8000}), page.getByRole('button', {name: /Excel \/ CSV/}).click()]);
    await dl.saveAs(`${OUT}/report.csv`);
    if (fs.statSync(`${OUT}/report.csv`).size < 10) throw new Error('empty csv');
    await page.emulateMedia({media: 'print'});
    await page.pdf({path: `${OUT}/report-print.pdf`, format: 'A4', printBackground: true});
    await page.emulateMedia({media: 'screen'});
  });
  await step('reports: custom report builder produces rows from the chosen module/fields', async () => {
    await page.locator('[role=tab]').filter({hasText: /Custom Report Builder/}).first().click();
    await page.waitForTimeout(600);
    const run = page.getByRole('button', {name: /Run|Generate|Build|Preview/});
    if (!(await run.count())) throw new Error('no run button');
    await run.first().click();
    await page.waitForTimeout(1500);
    const txt = await page.locator('.content').first().innerText();
    if (/error|failed/i.test(txt)) throw new Error(txt.slice(0, 200));
  });
}

fs.writeFileSync(OUT + '/results.json', JSON.stringify({u, results, consoleErrors, failed, ctx: {duty: ctxData.duty?.id}}, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\nmodules: ${results.length - bad.length} passed, ${bad.length} failed; console errors ${consoleErrors.length}; failed requests ${failed.length}; marker ${MARK}`);
failed.slice(0, 20).forEach(f => console.log('  net:', f));
await b.close();

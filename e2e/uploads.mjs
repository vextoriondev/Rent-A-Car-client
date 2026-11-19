// File & media workflows in a real browser: drivers, owners, vehicles, agreements, maintenance, transactions.
// Run against a LOCAL stack on a disposable database (see README). Env: E2E_USER, E2E_STAFF, E2E_PASS, E2E_ASSETS (folder from make_assets.py), E2E_MEDIA (the backend's PRIVATE_MEDIA_ROOT)
import {chromium} from 'playwright-core';
import fs from 'fs';
import path from 'path';
const SCALE = Number(process.env.E2E_SLOW || 1);
const BASE = 'http://127.0.0.1:3100';
const OUT = process.argv[2] || 'uploads';
const ASSETS = process.env.E2E_ASSETS, MEDIA = process.env.E2E_MEDIA;
fs.mkdirSync(OUT, {recursive: true});
const A = n => path.join(ASSETS, n);
const b = await chromium.launch({channel: 'msedge', headless: true});
const ctx = await b.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
await ctx.addInitScript(() => { window.print = () => {}; });
const page = await ctx.newPage();
page.setDefaultTimeout(15000 * SCALE);
const consoleErrors = []; const failed = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '').slice(0, 110)}`); });
const results = [];
const u = Math.random().toString(36).slice(2, 7);
async function step(name, fn) {
  try { await fn(); results.push({name, ok: true}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, err: String(e).split('\n')[0].slice(0, 260)}); console.log('FAIL', name, '::', String(e).split('\n')[0].slice(0, 260)); try { await page.screenshot({path: `${OUT}/FAIL_${name.replace(/\W+/g, '_').slice(0, 40)}.png`}); } catch {} }
}
const dlg = () => page.locator('[role=dialog]').last();
const fld = (root, label) => root.locator('label').filter({has: page.locator('span.field-label', {hasText: label})}).locator('input,select,textarea').first();
const csrf = async () => (await ctx.cookies()).find(c => c.name === 'csrftoken')?.value || '';
const api = async (method, p, body) => {
  const r = await page.request.fetch(BASE + '/backend' + p, {method, data: body ? JSON.stringify(body) : undefined, headers: {'Content-Type': 'application/json', 'X-CSRFToken': await csrf()}});
  return {status: r.status(), body: await r.json().catch(() => null)};
};
const ok = (c, m) => { if (!c) throw new Error(m); };
const mediaFiles = () => { const out = []; const walk = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, {withFileTypes: true})) f.isDirectory() ? walk(path.join(d, f.name)) : out.push(path.join(d, f.name)); }; walk(path.join(MEDIA, 'attachments')); return out; };
const measures = [];
const waitCount = (prefix, id, n, kind = 'document') => expectPoll(async () => (await files(prefix, id)).filter(x => x.kind === kind && x.status === 'completed').length === n);

await page.goto(BASE + '/login');
await page.fill('input[autocomplete="username"]', process.env.E2E_USER);
await page.fill('input[type="password"]', process.env.E2E_PASS);
await page.click('button[type="submit"]');
await page.waitForURL(x => !x.pathname.startsWith('/login'));
const me = await api('GET', '/me'); const ORG = me.body.organizations[0].id;
const files = async (prefix, id) => (await api('GET', `/orgs/${ORG}/${prefix}/${id}/files`)).body;
const panelDocs = () => page.locator('section[aria-label="Documents & Photos"]').first();

// ───────── DRIVER
let driverId;
await step('driver: create with a profile photo chosen in the form; avatar appears in the list', async () => {
  await page.goto(BASE + '/drivers');
  await page.getByRole('button', {name: /Add New Driver/}).click();
  await dlg().locator('input[type=file]').first().setInputFiles(A('phone-photo.jpg'));
  await dlg().getByAltText(/Photo of/).waitFor();                 // preview before saving
  await fld(dlg(), 'Driver Name').fill(`PW Drv ${u}`);
  await fld(dlg(), 'Phone').fill('01712000999');
  await dlg().getByRole('button', {name: /Save|Register|Add Driver/i}).last().click();
  await page.getByText(/saved to database/).first().waitFor();
  await page.getByPlaceholder(/Search/).first().fill(`PW Drv ${u}`);
  const row = page.locator('tr', {hasText: `PW Drv ${u}`}).first();
  await row.locator('img[src*="/files/"]').waitFor();
  const list = (await api('GET', `/orgs/${ORG}/tasin-drivers`)).body;
  driverId = list.find(d => d.name === `PW Drv ${u}`).id;
  ok(/variant=thumb/.test(list.find(d => d.name === `PW Drv ${u}`).thumbUrl), 'list API has thumbUrl');
});
await step('driver: stored file is an optimized WebP; GPS removed; measured reduction', async () => {
  const f = (await files('tasin-drivers', driverId));
  ok(f.length === 1 && f[0].kind === 'profile' && f[0].status === 'completed', 'one completed profile attachment');
  const orig = fs.statSync(A('phone-photo.jpg')).size;
  measures.push(`phone-photo.jpg original ${orig} B -> stored ${f[0].sizeStored} B (${(100 - 100 * f[0].sizeStored / orig).toFixed(1)}% smaller; browser pre-shrink + server WebP)`);
  const thumb = await page.request.get(BASE + '/backend' + f[0].urls.thumb.replace('/backend', ''));
  ok(thumb.status() === 200 && thumb.headers()['content-type'] === 'image/webp', 'thumb is image/webp');
  measures.push(`thumbnail ${(await thumb.body()).length} B`);
  const large = await page.request.get(BASE + '/backend' + f[0].urls.view);
  const buf = await large.body();
  ok(!buf.includes(Buffer.from('GPS')) && !buf.includes(Buffer.from('Exif')), 'no EXIF/GPS in the served image');
});
await step('driver: upload 3 documents at once (PDF + scanned JPG + DOCX) from the details panel', async () => {
  await page.goto(BASE + '/drivers');
  await page.getByPlaceholder(/Search/).first().fill(`PW Drv ${u}`);
  await page.locator('tr', {hasText: `PW Drv ${u}`}).first().click();
  const panel = panelDocs();
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('agreement.pdf'), A('registration-scan.jpg'), A('terms.docx')]);
  await panel.getByRole('button', {name: /Upload 3 files/}).click();
  await waitCount('tasin-drivers', driverId, 3);
  await panel.getByText(/Documents \(3\)/).waitFor();
  const f = (await files('tasin-drivers', driverId)).filter(x => x.kind === 'document');
  ok(f.length === 3 && f.every(x => x.status === 'completed'), '3 completed documents');
  const scan = f.find(x => x.fileName === 'registration-scan.jpg');
  measures.push(`registration-scan.jpg (document scan) original ${scan.sizeOriginal} B; original kept + WebP preview variants`);
});
await step('driver: invalid / unsupported files are refused in the browser with a message and cannot be uploaded', async () => {
  const panel = panelDocs();
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('notes.txt')]);
  await panel.getByText(/Only images, PDF and Word files are allowed/).waitFor();
  ok(await panel.getByRole('button', {name: /Upload 0 file/}).count() === 1 && await panel.getByRole('button', {name: /Upload 0 file/}).isDisabled(), 'upload disabled');
  await panel.getByRole('button', {name: /Remove notes.txt/}).click();
});
await step('driver: a file disguised as an image is rejected by the server and nothing is stored', async () => {
  const before = (await files('tasin-drivers', driverId)).length;
  const panel = panelDocs();
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('fake.jpg')]);
  await panel.getByRole('button', {name: /Upload 1 file/}).click();
  await panel.getByText(/not a supported image|invalid|Upload failed|not acceptable|content/i).first().waitFor();
  ok((await files('tasin-drivers', driverId)).length === before, 'nothing new stored');
  await page.reload();
});
await step('driver: reload keeps the profile photo and all documents', async () => {
  await page.getByPlaceholder(/Search/).first().fill(`PW Drv ${u}`);
  await page.locator('tr', {hasText: `PW Drv ${u}`}).first().click();
  const panel = panelDocs();
  await panel.getByText('agreement.pdf').waitFor();
  ok(await panel.getByText(/Documents \(3\)/).count() === 1, '3 documents listed');
  ok(await page.locator('img[alt^="Photo of PW Drv"]').first().isVisible(), 'profile photo visible');
});
let oldKeys;
await step('driver: replacing the profile photo keeps exactly one main picture and removes the old objects', async () => {
  const before = (await files('tasin-drivers', driverId)).find(x => x.kind === 'profile');
  oldKeys = mediaFiles().length;
  await page.locator('input[aria-label="Choose photo"]').first().setInputFiles(A('phone-photo-2.jpg'));
  await expectPoll(async () => { const f = (await files('tasin-drivers', driverId)).filter(x => x.kind === 'profile'); return f.length === 1 && f[0].id !== before.id; });
  const after = mediaFiles().length;
  ok(after === oldKeys, `no leftover objects after replace (${oldKeys} -> ${after})`);
});
await step('driver: delete one document with confirmation; the others are unaffected', async () => {
  const panel = panelDocs();
  await panel.locator('tr', {hasText: 'terms.docx'}).getByTitle('Delete').click();
  await page.getByRole('button', {name: 'Delete', exact: true}).click();
  await page.waitForFunction(() => !document.body.innerText.includes('terms.docx'));
  const f = await files('tasin-drivers', driverId);
  ok(f.filter(x => x.kind === 'document').length === 2 && f.filter(x => x.kind === 'profile').length === 1, 'other files intact');
  ok(!mediaFiles().some(p => p.endsWith('.docx')), 'docx object removed from storage');
});
await step('driver: download returns the exact original bytes with a safe attachment header', async () => {
  const f = (await files('tasin-drivers', driverId)).find(x => x.fileName === 'agreement.pdf');
  const r = await page.request.get(BASE + '/backend' + f.urls.download.replace('/backend', ''));
  ok(r.status() === 200 && /attachment/.test(r.headers()['content-disposition']) && r.headers()['x-content-type-options'] === 'nosniff', 'headers');
  ok(Buffer.compare(await r.body(), fs.readFileSync(A('agreement.pdf'))) === 0, 'identical bytes');
});
await step('driver: files are private (logged-out 401, limited user 403)', async () => {
  const f = (await files('tasin-drivers', driverId))[0];
  const anon = await b.newContext(); const ap = await anon.newPage();
  const r1 = await ap.request.get(BASE + '/backend' + f.urls.thumb.replace('/backend', ''));
  ok(r1.status() === 401, 'anonymous ' + r1.status());
  const sc = await b.newContext(); const sp = await sc.newPage();
  await sp.goto(BASE + '/login'); await sp.fill('input[autocomplete="username"]', process.env.E2E_STAFF); await sp.fill('input[type="password"]', process.env.E2E_PASS);
  await sp.click('button[type="submit"]'); await sp.waitForURL(x => !x.pathname.startsWith('/login'));
  const nidUp = await page.request.post(BASE + `/backend/orgs/${ORG}/tasin-drivers/${driverId}/files`, {multipart: {files: {name: 'nid.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(A('agreement.pdf')).subarray(0, 60000)}, kind: 'document', category: 'nid'}, headers: {'X-CSRFToken': await csrf()}});
  ok(nidUp.status() === 200, 'nid upload by admin ' + nidUp.status());
  const nid = (await nidUp.json()).items[0];
  const r2 = await sp.request.get(BASE + '/backend' + f.urls.thumb.replace('/backend', ''));
  ok(r2.status() === 200, 'viewer may see a photo: ' + r2.status());
  const r3 = await sp.request.get(BASE + '/backend' + nid.urls.download.replace('/backend', ''));
  ok(r3.status() === 403, 'viewer must NOT fetch an identity paper: ' + r3.status());
  const lst = await (await sp.request.get(BASE + `/backend/orgs/${ORG}/tasin-drivers/${driverId}/files`)).json();
  ok(!lst.some(x => x.category === 'nid'), 'identity paper hidden from the viewer list');
  const tok = (await sc.cookies()).find(c => c.name === 'csrftoken')?.value;
  const up = await sp.request.post(BASE + `/backend/orgs/${ORG}/tasin-drivers/${driverId}/files`, {multipart: {files: {name: 'x.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(A('agreement.pdf'))}, kind: 'document'}, headers: {'X-CSRFToken': tok || ''}});
  ok(up.status() === 403, 'viewer upload ' + up.status());
  await page.request.delete(BASE + `/backend/orgs/${ORG}/files/${nid.id}`, {headers: {'X-CSRFToken': await csrf()}});
  await anon.close(); await sc.close();
});

// ───────── OWNER
let ownerId;
await step('owner: create with photo, upload documents, reload and find everything', async () => {
  await page.goto(BASE + '/owners');
  await page.getByRole('button', {name: /Add New Owner/}).click();
  await dlg().locator('input[type=file]').first().setInputFiles(A('phone-photo-2.jpg'));
  await dlg().getByAltText(/Photo of/).waitFor();
  await fld(dlg(), 'Owner Name').fill(`PW Own ${u}`);
  await fld(dlg(), 'Phone').fill('01712000888');
  await dlg().getByRole('button', {name: /Save|Register|Add Owner/i}).last().click();
  await page.getByText(/saved to database/).first().waitFor();
  const list = (await api('GET', `/orgs/${ORG}/tasin-owners`)).body;
  ownerId = list.find(o => o.name === `PW Own ${u}`).id;
  ok(/files\//.test(list.find(o => o.id === ownerId).thumbUrl), 'owner thumb in list');
  await page.getByPlaceholder(/Search/).first().fill(`PW Own ${u}`);
  await page.locator('tr', {hasText: `PW Own ${u}`}).first().click();
  const panel = panelDocs();
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('agreement.pdf'), A('registration-scan.jpg')]);
  await panel.getByRole('button', {name: /Upload 2 files/}).click();
  await waitCount('tasin-owners', ownerId, 2);
  await page.reload();
  await page.getByPlaceholder(/Search/).first().fill(`PW Own ${u}`);
  await page.locator('tr', {hasText: `PW Own ${u}`}).first().click();
  await panelDocs().getByText('agreement.pdf').waitFor();
  const f = await files('tasin-owners', ownerId);
  ok(f.length === 3, 'profile + 2 docs persisted: ' + f.length);
});

// ───────── VEHICLE
let vehId;
await step('vehicle: owner is required and the chosen owner is saved; main photo chosen in the form', async () => {
  await page.goto(BASE + '/vehicles');
  await page.getByRole('button', {name: /Add New Vehicle|Add Vehicle/}).first().click();
  await dlg().locator('input[type=file]').first().setInputFiles(A('car-front.jpg'));
  await fld(dlg(), 'Registration No').fill(`PW-${u}`);
  await dlg().getByRole('button', {name: /Save|Register|Add Vehicle/i}).last().click();
  await dlg().getByText('Choose the vehicle owner').waitFor();          // no silent default owner
  await dlg().locator('label', {hasText: 'Owner *'}).locator('[role=combobox]').click();
  await page.getByRole('option', {name: `PW Own ${u}`}).click();
  await dlg().getByRole('button', {name: /Save|Register|Add Vehicle/i}).last().click();
  await page.getByText(/saved to database/).first().waitFor();
  const list = (await api('GET', `/orgs/${ORG}/tasin-vehicles`)).body;
  const v = list.find(x => x.registration === `PW-${u}`);
  vehId = v.id;
  ok(String(v.ownerId) === String(ownerId), 'vehicle belongs to the chosen owner');
  ok(/files\//.test(v.thumbUrl), 'vehicle thumb in list');
});
await step('vehicle: gallery of 2 photos + registration document; set another photo as main; reload', async () => {
  await page.goto(BASE + '/vehicles');
  await page.getByPlaceholder(/Search/).first().fill(`PW-${u}`);
  await page.locator('tr', {hasText: `PW-${u}`}).first().click();
  const panel = page.locator('section[aria-label="Photos & Documents"]').first();
  await panel.locator('input[aria-label="Choose photos"]').setInputFiles([A('car-rear.jpg'), A('phone-photo-2.jpg')]);
  await panel.getByRole('button', {name: /Upload 2 files/}).click();
  await expectPoll(async () => (await files('tasin-vehicles', vehId)).filter(x => x.kind === 'photo').length === 2);
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('registration-scan.jpg')]);
  await panel.getByRole('button', {name: /Upload 1 file/}).click();
  await waitCount('tasin-vehicles', vehId, 1);
  const before = (await files('tasin-vehicles', vehId));
  const gallery = before.find(x => x.kind === 'photo');
  await page.request.post(BASE + `/backend/orgs/${ORG}/files/${gallery.id}/make-primary`, {headers: {'X-CSRFToken': await csrf()}});
  const after = await files('tasin-vehicles', vehId);
  ok(after.find(x => x.id === gallery.id).kind === 'profile' && after.filter(x => x.kind === 'profile').length === 1 && after.length === before.length, 'main swapped, nothing lost');
  await page.reload();
  await page.getByPlaceholder(/Search/).first().fill(`PW-${u}`);
  await page.locator('tr', {hasText: `PW-${u}`}).first().click();
  await page.locator('section[aria-label="Photos & Documents"]').getByText('registration-scan.jpg').waitFor();
});

// ───────── AGREEMENT / MAINTENANCE / TRANSACTION (record created through the API, files through the UI)
await step('agreement: owner agreement documents (signed PDF + stamp-paper scan) survive reload', async () => {
  const ag = await api('POST', `/orgs/${ORG}/tasin-agreements`, {agreement_type: 'owner', party_id: Number(ownerId), vehicle_id: Number(vehId), title: `PW Agreement ${u}`, start_date: '2026-01-01', monthly_amount: '1000', default_terms: [], custom_terms: ['Term A'], finalize: false});
  ok(ag.status === 200, 'agreement created ' + ag.status);
  await page.goto(BASE + '/agreements');
  await page.locator('tr', {hasText: `PW Agreement ${u}`}).first().getByRole('button').first().click();
  const panel = dlg().locator('section[aria-label="Agreement Documents"]');
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('agreement.pdf'), A('registration-scan.jpg')]);
  await panel.getByRole('button', {name: /Upload 2 files/}).click();
  const list = (await api('GET', `/orgs/${ORG}/tasin-agreements`)).body.find(a => a.title === `PW Agreement ${u}`);
  await waitCount('tasin-agreements', list.id, 2);
  const f = await files('tasin-agreements', list.id);
  ok(f.length === 2, 'two agreement files: ' + f.length);
  await page.reload();
  await page.locator('tr', {hasText: `PW Agreement ${u}`}).first().getByRole('button').first().click();
  await dlg().locator('section[aria-label="Agreement Documents"]').getByText('agreement.pdf').waitFor();
});
await step('maintenance: garage bill attached to a maintenance job', async () => {
  const gl = (await api('GET', `/orgs/${ORG}/tasin-garages`)).body || [];
  const m = await api('POST', `/orgs/${ORG}/tasin-maintenance`, {vehicle_id: Number(vehId), vehicle_reg: `PW-${u}`, garage_id: gl[0]?.id ? Number(gl[0].id) : undefined, garage_name: gl[0]?.name || 'PW Garage', date: '2026-02-01', problem_description: 'PW test', service_type: 'General Service', labour_cost: '100', parts_cost: '50', status: 'Pending'});
  ok(m.status === 200, 'maintenance created ' + m.status + JSON.stringify(m.body).slice(0, 120));
  const up = await page.request.post(BASE + `/backend/orgs/${ORG}/tasin-maintenance/${m.body.id}/files`, {multipart: {files: {name: 'garage-bill.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(A('agreement.pdf'))}, kind: 'document', category: 'bill'}, headers: {'X-CSRFToken': await csrf()}});
  ok(up.status() === 200, 'upload ' + up.status());
  ok((await files('tasin-maintenance', m.body.id))[0].category === 'bill', 'category bill');
});
await step('transaction: receipt attached from the Accounts page 📎', async () => {
  const t = await api('POST', `/orgs/${ORG}/transactions/custom`, {transaction_type: 'Expense', title: `PW Receipt ${u}`, amount: '120.00', date: new Date().toISOString().slice(0, 10), payment_method: 'Cash', description: `PW Receipt ${u}`});
  ok(t.status === 200 || t.status === 201, 'txn created ' + t.status + JSON.stringify(t.body).slice(0, 120));
  await page.goto(BASE + '/accounts');
  await page.getByText(`PW Receipt ${u}`).first().waitFor();
  await page.locator('tr', {hasText: `PW Receipt ${u}`}).first().getByTitle('Receipts & attachments').click();
  const panel = dlg().locator('section[aria-label="Receipts & bills"]');
  await panel.locator('input[aria-label="Choose documents"]').setInputFiles([A('registration-scan.jpg')]);
  await panel.getByRole('button', {name: /Upload 1 file/}).click();
  await waitCount('tasin-transactions', t.body.id, 1);
  await panel.getByText(/Documents \(1\)/).waitFor();
});

// ───────── usage overview + final
await step('storage usage overview reports files, images, documents, bytes by module', async () => {
  const usage = (await api('GET', `/orgs/${ORG}/files-usage`)).body;
  ok(usage.files >= 12 && usage.images > 0 && usage.documents > 0 && usage.bytesTotal > 0, JSON.stringify(usage).slice(0, 200));
  measures.push(`usage: ${usage.files} files (${usage.images} images, ${usage.documents} documents), ${usage.bytesTotal} B stored, originals uploaded ${usage.bytesOriginalUploaded} B`);
});

async function expectPoll(fn, ms = 20000 * SCALE) { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return; await new Promise(r => setTimeout(r, 400)); } throw new Error('condition not met in time'); }
console.log('\nMEASUREMENTS\n' + measures.join('\n'));
const pass = results.filter(r => r.ok).length;
console.log(`\nuploads: ${pass} passed, ${results.length - pass} failed; console errors ${consoleErrors.length}; failed requests ${failed.length}`);
if (failed.length) console.log(failed.join('\n'));
if (consoleErrors.length) console.log(consoleErrors.slice(0, 8).join('\n'));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({results, measures, failed, consoleErrors}, null, 1));
await b.close();

// Usage: npm run build && npm run start (in another shell), then: node scripts/smoke.mjs [baseUrl]
// Hits every TASIN ENTERPRISE dashboard module route and fails on any non-200.
const base = process.argv[2] || 'http://localhost:3000';
const routes = [
  '/',
  '/owners',
  '/vehicles',
  '/drivers',
  '/customers',
  '/duties',
  '/expenses',
  '/maintenance',
  '/agreements',
  '/documents',
  '/cashbook',
  '/due-collection',
  '/vehicle-search',
  '/reports',
  '/notifications',
  '/settings',
  '/audit',
  '/billing',
  '/owner-payables',
  '/payroll',
  '/settlements'
];
let failed = 0;
for (const r of routes) {
  const res = await fetch(base + r);
  if (res.status !== 200) {
    failed++;
    console.error('FAIL', res.status, r);
  } else {
    console.log('ok  ', r);
  }
}
if (failed) {
  console.error(`${failed} route(s) failed`);
  process.exit(1);
}
console.log(`All ${routes.length} TASIN ENTERPRISE module routes returned 200 OK!`);

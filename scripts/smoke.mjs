// Usage: npm run build && npm run start (in another shell), then: node scripts/smoke.mjs [baseUrl]
// Hits every dashboard route and fails on any non-200.
const base=process.argv[2]||'http://localhost:3000';
const routes=['/','/agreements','/vehicles','/customers','/owners','/drivers','/expenses','/billing','/owner-payables','/payroll','/settlements','/cashbook','/reports','/notifications','/documents','/settings','/actor-preview'];
let failed=0;
for(const r of routes){
 const res=await fetch(base+r);
 if(res.status!==200){failed++;console.error('FAIL',res.status,r)}else console.log('ok  ',r);
}
if(failed){console.error(`${failed} route(s) failed`);process.exit(1)}
console.log(`all ${routes.length} routes returned 200`);

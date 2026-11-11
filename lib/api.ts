import type {Store} from './demo';
import {withBranch} from './branch';
import {currentMonthRange} from './clock';
import {serverLanguage,t} from '@/lib/copy';

export const apiMode = process.env.NEXT_PUBLIC_RENTFLOW_API_MODE === '1';

export type LiveStore = Store & {
  backend: {
    orgId: number;
    periodIds: Record<string, number>;
    obligationIds: Record<string, { customer: number; owner: number; driver: number }>;
    expenseIds: Record<string, number>;
    userName?: string;
    role?: string;
    branch?: { id: number; name: string } | null;
    shownMonth?: string;
    orgName?: string;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  params: Record<string, string>;
  constructor(message: string, status: number, code = '', params: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

function csrf() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find(x => x.startsWith('csrftoken='))?.split('=')[1] || '';
}

export async function apiRequest(path: string, init?: RequestInit) {
  const method = init?.method || 'GET';
  if (method !== 'GET' && typeof window !== 'undefined') {
    try {
      await fetch('/backend/csrf', { credentials: 'same-origin' });
    } catch {}
  }
  const token = csrf();
  const urlPath = method === 'GET' ? withBranch(path) : path;
  const res = await fetch('/backend' + (urlPath.startsWith('/') ? urlPath : '/' + urlPath), {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(method !== 'GET' && token ? { 'X-CSRFToken': decodeURIComponent(token) } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      'Accept-Language': serverLanguage(),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      error.detail || error.message || t('api.error', { status: res.status }),
      res.status,
      error.code,
      error.params
    );
  }
  return res.status === 204 ? null : res.json();
}

export async function login(username: string, password: string) {
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export async function register(payload: { organizationName: string; username: string; email: string; password: string }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      organization_name: payload.organizationName,
      username: payload.username,
      email: payload.email,
      password: payload.password,
    }),
  });
}

export async function logout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function liveSnapshot(month = currentMonthRange().from, range?: { from: string; to: string }): Promise<LiveStore> {
  const me = await apiRequest('/me');
  const org = me.organizations?.find((x: { role: string }) =>
    ['admin', 'accountant', 'operations', 'viewer', 'mechanic'].includes(x.role)
  );
  if (!org) throw new Error(t('api.noRole'));
  if (org.role === 'mechanic') {
    return {
      agreements: [],
      entries: [],
      notices: [],
      closed: [],
      rangeEntries: [],
      backend: {
        orgId: org.id,
        periodIds: {},
        obligationIds: {},
        expenseIds: {},
        userName: me.username,
        role: org.role,
        branch: org.branch ?? null,
        orgName: org.name,
      },
    };
  }
  const wide = range ? await apiRequest(`/orgs/${org.id}/snapshot?from=${range.from}&to=${range.to}`) : null;
  const issued: string[] = wide
    ? Object.values<{ month: string }[]>(wide.backend.periods || {})
        .flat()
        .map(p => p.month)
        .sort()
    : [];
  const shown = issued.length ? issued[issued.length - 1] : month;
  const snapshot = await apiRequest(`/orgs/${org.id}/snapshot?month=${shown}`);
  snapshot.backend.userName = me.username;
  snapshot.backend.role = org.role;
  snapshot.backend.branch = org.branch ?? null;
  snapshot.backend.shownMonth = shown;
  snapshot.backend.orgName = org.name;
  snapshot.agreements = snapshot.agreements.map((a: { driver: string | null }) => ({
    ...a,
    driver: a.driver ?? '',
    noDriver: a.driver == null,
  }));
  snapshot.rangeEntries = wide ? wide.entries : snapshot.entries;
  return snapshot;
}

export async function livePost(orgId: number, path: string, body: unknown, key?: string) {
  return apiRequest(`/orgs/${orgId}${path}`, {
    method: 'POST',
    headers: key ? { 'Idempotency-Key': key } : {},
    body: JSON.stringify(body),
  });
}

export async function apiUpload(path: string, form: FormData) {
  await fetch('/backend/csrf', { credentials: 'same-origin' });
  const res = await fetch('/backend' + path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': decodeURIComponent(csrf()),
      'Accept-Language': serverLanguage(),
    },
    body: form,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      error.detail || error.message || t('api.uploadFailed', { status: res.status }),
      res.status,
      error.code,
      error.params
    );
  }
  return res.json();
}

export const branchLocked = (role?: string, branch?: { id: number } | null) => !!branch && role !== 'admin';

// ─── TASIN ENTERPRISE MODULE API HELPERS ────────────────────────────────
export async function fetchConnectionStatus() {
  return apiRequest('/connection/status');
}

export async function fetchTasinOverview() {
  return apiRequest('/tasin/overview');
}

export async function fetchDashboardKpis(orgId: number = 1, dateFilter?: string) {
  return apiRequest(`/orgs/${orgId}/dashboard/kpis${dateFilter ? `?date_filter=${dateFilter}` : ''}`);
}

export async function fetchOwners(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-owners`);
}

export async function createOwner(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-owners`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateOwner(orgId: number = 1, ownerId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-owners/${ownerId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function recordOwnerPayment(orgId: number = 1, ownerId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-owners/${ownerId}/payments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchVehicles(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicles`);
}

export async function createVehicle(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicles`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateVehicle(orgId: number = 1, vehicleId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicles/${vehicleId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchVehiclePapers(orgId: number = 1, vehicleId: number | string) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicles/${vehicleId}/papers`);
}

export async function uploadVehiclePaper(orgId: number = 1, vehicleId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicles/${vehicleId}/papers`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchDrivers(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-drivers`);
}

export async function createDriver(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-drivers`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDriver(orgId: number = 1, driverId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-drivers/${driverId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function recordDriverPayment(orgId: number = 1, driverId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-drivers/${driverId}/payments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchClients(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-clients`);
}

export async function createClient(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-clients`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateClient(orgId: number = 1, clientId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-clients/${clientId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteClient(orgId: number = 1, clientId: number | string) {
  return apiRequest(`/orgs/${orgId}/tasin-clients/${clientId}`, { method: 'DELETE' });
}

export async function recordClientCollection(orgId: number = 1, clientId: number | string, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-clients/${clientId}/collections`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchDuties(orgId: number = 1, dateVal?: string, status?: string) {
  const p = new URLSearchParams();
  if (dateVal) p.set('date_val', dateVal);
  if (status) p.set('status', status);
  const q = p.toString();
  return apiRequest(`/orgs/${orgId}/tasin-duties${q ? `?${q}` : ''}`);
}

export async function createDuty(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-duties`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDutyStatus(orgId: number = 1, dutyId: number | string, status: string) {
  return apiRequest(`/orgs/${orgId}/tasin-duties/${dutyId}/status`, { method: 'POST', body: JSON.stringify({ status }) });
}

export async function fetchExpenses(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-expenses`);
}

export async function createExpense(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-expenses`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchGarages(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-garages`);
}

export async function createGarage(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-garages`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchMaintenance(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-maintenance`);
}

export async function createMaintenance(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-maintenance`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchFinancialAccounts(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-accounts`);
}

export async function createFinancialAccount(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-accounts`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchFinancialTransactions(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-transactions`);
}

export async function transferAccountFunds(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-accounts/transfer`, { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchDueCollection(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-due-collection`);
}

export async function searchVehicles(orgId: number = 1, q = '') {
  return apiRequest(`/orgs/${orgId}/tasin-vehicle-search?q=${encodeURIComponent(q)}`);
}

export async function fetchVehicleStatement(orgId: number = 1, vehicleId: number | string) {
  return apiRequest(`/orgs/${orgId}/tasin-vehicle-search/${vehicleId}/statement`);
}

export async function fetchSystemAlerts(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-alerts`);
}

export async function markAlertRead(orgId: number = 1, alertId: number | string) {
  return apiRequest(`/orgs/${orgId}/tasin-alerts/${alertId}/read`, { method: 'POST' });
}

export async function fetchCompanyProfile(orgId: number = 1) {
  return apiRequest(`/orgs/${orgId}/tasin-settings/company`);
}

export async function updateCompanyProfile(orgId: number = 1, data: unknown) {
  return apiRequest(`/orgs/${orgId}/tasin-settings/company`, { method: 'PUT', body: JSON.stringify(data) });
}

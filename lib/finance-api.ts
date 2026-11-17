import {apiRequest} from './api';

/** Client for the change-request endpoints (driver salary/advance/fuel-gas, opening balances, rent accrual, reports, ...).
 *  Every money-changing call takes an idempotency key so a retry or double-click can never post twice. */

const ORG = 1;
const j = (body: unknown) => JSON.stringify(body);
const post = (path: string, body: unknown, key?: string) =>
  apiRequest(`/orgs/${ORG}${path}`, {method: 'POST', body: j(body), headers: key ? {'Idempotency-Key': key} : undefined});
const get = (path: string, params?: Record<string, string | number | undefined | null>) => {
  const qs = params ? Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  return apiRequest(`/orgs/${ORG}${path}${qs ? '?' + qs : ''}`);
};

export const newIdemKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// opening balances / ledger
export const postOpeningBalance = (partyId: number | string, body: {balance_type: string; amount: string | number; date?: string; direction?: string; description?: string; reference?: string}) =>
  post(`/parties/${partyId}/opening-balance`, body);

// driver
export const fetchDriverFinance = (id: number | string, from?: string, to?: string) => get(`/drivers/${id}/finance`, {date_from: from, date_to: to});
export const issueDriverAdvance = (id: number | string, body: unknown, key: string) => post(`/drivers/${id}/advances`, body, key);
export const issueDriverFuelGas = (id: number | string, body: unknown, key: string) => post(`/drivers/${id}/fuel-gas`, body, key);
export const payDriverSalary = (id: number | string, body: unknown, key: string) => post(`/drivers/${id}/salary-payments`, body, key);
export const reverseSalaryPayment = (id: number | string, reason: string) => post(`/salary-payments/${id}/reverse`, {reason});

// owner / client
export const fetchOwnerFinance = (id: number | string, from?: string, to?: string) => get(`/owners/${id}/finance`, {date_from: from, date_to: to});
export const fetchClientFinance = (id: number | string, from?: string, to?: string) => get(`/clients/${id}/finance`, {date_from: from, date_to: to});
export const payOwnerLedger = (id: number | string, body: unknown, key: string) => post(`/owners/${id}/ledger-payments`, body, key);
export const collectClientLedger = (id: number | string, body: unknown, key: string) => post(`/clients/${id}/ledger-payments`, body, key);
export const previewRent = (period: string, ownerId?: number | string) => get('/rent-accruals/preview', {period, owner_id: ownerId});
export const accrueRent = (period: string, ownerId?: number | string, vehicleIds?: number[]) => post('/rent-accruals', {period, owner_id: ownerId, vehicle_ids: vehicleIds});
export const reverseRentAccrual = (id: number | string, reason: string) => post(`/rent-accruals/${id}/reverse`, {reason});

// vehicle payments, reports, transactions
export const postVehiclePayment = (vehicleId: number | string, body: unknown, key: string) => post(`/vehicles/${vehicleId}/payments`, body, key);
export const fetchVehiclePayments = (vehicleId: number | string) => get(`/vehicles/${vehicleId}/payments`);
export const fetchDailyReport = (day: string) => get('/daily-report', {day});
export const postCustomTransaction = (body: unknown, key: string) => post('/transactions/custom', body, key);
export const searchTransactions = (p: Record<string, string>) => get('/transactions/search', p);

// replacement drivers
export const fetchReplacements = (p: Record<string, string>) => get('/replacements', p);
export const createReplacement = (body: unknown) => post('/replacements', body);
export const deleteReplacement = (id: number | string) => apiRequest(`/orgs/${ORG}/replacements/${id}`, {method: 'DELETE'});

// agreements
export const fetchTasinAgreements = (type?: string, q?: string) => get('/tasin-agreements', {type, q});
export const createTasinAgreement = (body: unknown) => post('/tasin-agreements', body);
export const updateTasinAgreement = (id: number | string, body: unknown) => apiRequest(`/orgs/${ORG}/tasin-agreements/${id}`, {method: 'PUT', body: j(body)});

// documents (one source for Vehicle Profile and Global Documents)
export const fetchAllDocuments = (p?: Record<string, string>) => get('/documents-all', p);
export const addVehicleDocument = (vehicleId: number | string, body: unknown) => post(`/vehicles/${vehicleId}/documents`, body);
export const updateDocument = (id: number | string, body: unknown) => apiRequest(`/orgs/${ORG}/documents-all/${id}`, {method: 'PUT', body: j(body)});
export const deleteDocument = (id: number | string) => apiRequest(`/orgs/${ORG}/documents-all/${id}`, {method: 'DELETE'});

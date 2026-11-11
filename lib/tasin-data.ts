/**
 * TASIN ENTERPRISE – Extended mock data for all 15 modules
 * This file extends the existing demo.ts with richer data for the full system.
 * All amounts are in BDT (৳). This is DEMO DATA only.
 */

// ─── Vehicle Statuses ───────────────────────────────────────────────────────
export type VehicleStatus = 'Available' | 'On Duty' | 'In Garage' | 'Inactive';
export type VehicleCategory = 'Sedan' | 'SUV' | 'Microbus' | 'Pickup' | 'Van' | 'Truck';

export interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  color: string;
  chassisNo: string;
  engineNo: string;
  registrationDate: string;
  status: VehicleStatus;
  ownerId: string;
  driverId?: string;
  monthlyRent: number;
  agreementStart: string;
  agreementEnd?: string;
}

// ─── Owner ───────────────────────────────────────────────────────────────────
export interface Owner {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  nid: string;
  presentAddress: string;
  permanentAddress: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string;
  accountType?: string;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  totalVehicles: number;
  totalPayable: number;
  totalPaid: number;
}

// ─── Driver ──────────────────────────────────────────────────────────────────
export interface Driver {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  nid: string;
  presentAddress: string;
  dob: string;
  joiningDate: string;
  licenseNo: string;
  licenseType: string;
  licenseExpiry: string;
  emergencyContact: string;
  status: 'Active' | 'Inactive';
  assignedVehicleId?: string;
  monthlySalary: number;
  dailyAllowance: number;
  advance: number;
  totalPaid: number;
}

// ─── Client / Company ────────────────────────────────────────────────────────
export type ClientType = 'Individual' | 'Company' | 'Government';
export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  address: string;
  billingAddress?: string;
  tradeLicense?: string;
  clientType: ClientType;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  totalReceivable: number;
  totalCollected: number;
}

// ─── Duty / Daily Operations ──────────────────────────────────────────────────
export type DutyStatus = 'Scheduled' | 'Running' | 'Completed' | 'Cancelled';
export type DutyType = 'Monthly' | 'Daily' | 'Trip' | 'Outstation';
export interface Duty {
  id: string;
  date: string;
  clientId: string;
  clientName: string;
  vehicleId: string;
  vehicleReg: string;
  driverId: string;
  driverName: string;
  pickupLocation: string;
  destination: string;
  startTime: string;
  endTime?: string;
  dutyType: DutyType;
  customerContact: string;
  description?: string;
  agreedRent: number;
  fuelCost: number;
  overtimeCharge: number;
  driverAllowance: number;
  additionalCharge: number;
  discount: number;
  totalAmount: number;
  status: DutyStatus;
}

// ─── Garage / Maintenance ────────────────────────────────────────────────────
export type GarageType = 'General' | 'AC Specialist' | 'Body Works' | 'Engine' | 'Electrical';
export interface Garage {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  address: string;
  garageType: GarageType;
  status: 'Active' | 'Inactive';
  totalBill: number;
  totalPaid: number;
}

export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delivered';
export type MaintenanceCategory = 'Engine' | 'Gearbox' | 'Suspension' | 'Brake' | 'Electrical' | 'AC' | 'Tyre' | 'Battery' | 'Oil Change' | 'General Service' | 'Other';
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  garageId: string;
  garageName: string;
  date: string;
  problemDescription: string;
  serviceType: MaintenanceCategory;
  partsDetails?: string;
  labourCost: number;
  partsCost: number;
  totalCost: number;
  expectedDelivery: string;
  actualDelivery?: string;
  status: MaintenanceStatus;
}

// ─── Expense ─────────────────────────────────────────────────────────────────
export type ExpenseCategory = 'Fuel' | 'Driver Food/Allowance' | 'Parking' | 'Toll' | 'Vehicle Repair' | 'Maintenance' | 'Office Rent' | 'Staff Salary' | 'Utilities' | 'Transport' | 'Other';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Banking';
export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  account: string;
  paidTo: string;
  reference?: string;
  note?: string;
  vehicleId?: string;
  vehicleReg?: string;
}

// ─── Account / Transaction ───────────────────────────────────────────────────
export type AccountType = 'Cash' | 'Bank';
export interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
}

export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  relatedPerson?: string;
  vehicleReg?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  description: string;
  fromAccount?: string;
  toAccount?: string;
}

// ─── Notification / Alert ─────────────────────────────────────────────────────
export type AlertType = 'payment' | 'agreement' | 'document' | 'maintenance' | 'custom';
export type AlertSeverity = 'info' | 'warning' | 'danger';
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  date: string;
  dueDate?: string;
  relatedId?: string;
  read: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const demoVehicles: Vehicle[] = [
  { id: 'VEH-001', registration: 'DHA-METRO-GA-19-7724', brand: 'Toyota', model: 'Axio', year: 2019, category: 'Sedan', color: 'White', chassisNo: 'NZE1419023451', engineNo: '1NZ-9023451', registrationDate: '2020-01-15', status: 'On Duty', ownerId: 'OWN-001', driverId: 'DRV-001', monthlyRent: 60000, agreementStart: '2026-01-01' },
  { id: 'VEH-002', registration: 'DHA-METRO-GA-22-4811', brand: 'Honda', model: 'Grace', year: 2022, category: 'Sedan', color: 'Silver', chassisNo: 'GM48110049823', engineNo: 'LEB-0049823', registrationDate: '2022-06-10', status: 'On Duty', ownerId: 'OWN-002', driverId: 'DRV-002', monthlyRent: 50000, agreementStart: '2026-04-01' },
  { id: 'VEH-003', registration: 'DHA-METRO-CHA-14-2056', brand: 'Toyota', model: 'Noah', year: 2014, category: 'Microbus', color: 'Blue', chassisNo: 'ZRR80G0023912', engineNo: '3ZR-0023912', registrationDate: '2015-03-22', status: 'On Duty', ownerId: 'OWN-001', driverId: 'DRV-003', monthlyRent: 76000, agreementStart: '2026-06-01' },
  { id: 'VEH-004', registration: 'DHA-METRO-GA-25-1190', brand: 'Mitsubishi', model: 'Xpander', year: 2025, category: 'SUV', color: 'Black', chassisNo: 'GF8W0019012', engineNo: '4G93-0019012', registrationDate: '2025-02-18', status: 'On Duty', ownerId: 'OWN-003', driverId: 'DRV-004', monthlyRent: 65000, agreementStart: '2026-08-01' },
  { id: 'VEH-005', registration: 'CTG-METRO-GA-21-3341', brand: 'Toyota', model: 'Corolla', year: 2021, category: 'Sedan', color: 'Red', chassisNo: 'ZZE14209871', engineNo: '1ZZ-09871', registrationDate: '2021-09-05', status: 'Available', ownerId: 'OWN-002', monthlyRent: 45000, agreementStart: '2026-05-01' },
  { id: 'VEH-006', registration: 'DHA-METRO-GA-18-9922', brand: 'Nissan', model: 'X-Trail', year: 2018, category: 'SUV', color: 'Dark Gray', chassisNo: 'T32AA002213', engineNo: 'QR25-002213', registrationDate: '2019-01-20', status: 'In Garage', ownerId: 'OWN-004', driverId: 'DRV-005', monthlyRent: 70000, agreementStart: '2025-11-01' },
  { id: 'VEH-007', registration: 'DHA-METRO-GA-23-5566', brand: 'Toyota', model: 'Hiace', year: 2023, category: 'Van', color: 'White', chassisNo: 'KDH2069981', engineNo: '1KD-9981', registrationDate: '2023-07-12', status: 'Available', ownerId: 'OWN-004', monthlyRent: 85000, agreementStart: '2026-09-01' },
  { id: 'VEH-008', registration: 'DHA-METRO-GA-20-7788', brand: 'Toyota', model: 'Premio', year: 2020, category: 'Sedan', color: 'White', chassisNo: 'NZT2600123', engineNo: '1NZ-00123', registrationDate: '2020-11-30', status: 'Inactive', ownerId: 'OWN-003', monthlyRent: 55000, agreementStart: '2025-01-01', agreementEnd: '2025-12-31' },
];

export const demoOwners: Owner[] = [
  { id: 'OWN-001', name: 'Farhana Rahman', mobile: '01711-234567', altMobile: '01911-234567', email: 'farhana@gmail.com', nid: '1234567890123', presentAddress: 'House 12, Road 5, Dhanmondi, Dhaka', permanentAddress: 'Village Badhair, Narail', bankName: 'Dutch-Bangla Bank', accountName: 'Farhana Rahman', accountNumber: '2241001234567', branchName: 'Dhanmondi Branch', accountType: 'Savings', joiningDate: '2024-01-01', status: 'Active', totalVehicles: 2, totalPayable: 136000, totalPaid: 90000 },
  { id: 'OWN-002', name: 'Rashed Karim', mobile: '01811-345678', email: 'rashed.karim@gmail.com', nid: '2345678901234', presentAddress: 'Apt 4B, Green Road, Dhaka', permanentAddress: 'Faridpur Sadar, Faridpur', bankName: 'BRAC Bank', accountName: 'Rashed Karim', accountNumber: '3351002345678', branchName: 'Farmgate Branch', accountType: 'Current', joiningDate: '2024-04-01', status: 'Active', totalVehicles: 2, totalPayable: 95000, totalPaid: 50000 },
  { id: 'OWN-003', name: 'Nadia Sultana', mobile: '01611-456789', altMobile: '01311-456789', email: 'nadia.sultana@yahoo.com', nid: '3456789012345', presentAddress: 'Block C, Mirpur-10, Dhaka', permanentAddress: 'Jamalpur Sadar, Jamalpur', bankName: 'Islami Bank', accountName: 'Nadia Sultana', accountNumber: '2051003456789', branchName: 'Mirpur Branch', accountType: 'Mudaraba Savings', joiningDate: '2025-01-15', status: 'Active', totalVehicles: 2, totalPayable: 120000, totalPaid: 65000 },
  { id: 'OWN-004', name: 'Mahmudul Hasan', mobile: '01511-567890', email: 'mahmud.hasan@outlook.com', nid: '4567890123456', presentAddress: 'House 8, Gulshan-2, Dhaka', permanentAddress: 'Comilla Sadar, Comilla', bankName: 'Sonali Bank', accountName: 'Mahmudul Hasan', accountNumber: '0193004567890', branchName: 'Gulshan Branch', accountType: 'Savings', joiningDate: '2025-11-01', status: 'Active', totalVehicles: 2, totalPayable: 155000, totalPaid: 70000 },
];

export const demoDrivers: Driver[] = [
  { id: 'DRV-001', name: 'Imran Hossain', mobile: '01712-111222', altMobile: '01912-111222', nid: '5678901234567', presentAddress: 'Kalyanpur, Dhaka', dob: '1988-05-15', joiningDate: '2024-01-10', licenseNo: 'B-234567-2019', licenseType: 'Professional', licenseExpiry: '2027-05-14', emergencyContact: '01712-333444', status: 'Active', assignedVehicleId: 'VEH-001', monthlySalary: 20000, dailyAllowance: 300, advance: 5000, totalPaid: 15000 },
  { id: 'DRV-002', name: 'Hasan Ali', mobile: '01813-222333', nid: '6789012345678', presentAddress: 'Mohammadpur, Dhaka', dob: '1991-08-22', joiningDate: '2024-04-05', licenseNo: 'B-345678-2021', licenseType: 'Professional', licenseExpiry: '2026-08-21', emergencyContact: '01813-444555', status: 'Active', assignedVehicleId: 'VEH-002', monthlySalary: 18000, dailyAllowance: 250, advance: 2000, totalPaid: 18000 },
  { id: 'DRV-003', name: 'Jamal Uddin', mobile: '01614-333444', nid: '7890123456789', presentAddress: 'Jatrabari, Dhaka', dob: '1985-12-01', joiningDate: '2024-06-01', licenseNo: 'B-456789-2018', licenseType: 'Professional', licenseExpiry: '2026-11-30', emergencyContact: '01614-555666', status: 'Active', assignedVehicleId: 'VEH-003', monthlySalary: 25000, dailyAllowance: 400, advance: 8000, totalPaid: 20000 },
  { id: 'DRV-004', name: 'Sabbir Ahmed', mobile: '01515-444555', nid: '8901234567890', presentAddress: 'Uttara, Dhaka', dob: '1993-03-18', joiningDate: '2025-08-01', licenseNo: 'B-567890-2022', licenseType: 'Professional', licenseExpiry: '2028-03-17', emergencyContact: '01515-666777', status: 'Active', assignedVehicleId: 'VEH-004', monthlySalary: 22000, dailyAllowance: 350, advance: 3000, totalPaid: 22000 },
  { id: 'DRV-005', name: 'Rafiqul Islam', mobile: '01716-555666', nid: '9012345678901', presentAddress: 'Rayer Bazar, Dhaka', dob: '1986-07-30', joiningDate: '2024-11-01', licenseNo: 'B-678901-2017', licenseType: 'Professional', licenseExpiry: '2025-07-29', emergencyContact: '01716-777888', status: 'Active', assignedVehicleId: 'VEH-006', monthlySalary: 20000, dailyAllowance: 300, advance: 0, totalPaid: 20000 },
  { id: 'DRV-006', name: 'Kamal Hossain', mobile: '01817-666777', nid: '0123456789012', presentAddress: 'Lalbagh, Dhaka', dob: '1990-11-05', joiningDate: '2026-01-15', licenseNo: 'B-789012-2023', licenseType: 'Professional', licenseExpiry: '2029-11-04', emergencyContact: '01817-888999', status: 'Active', monthlySalary: 18000, dailyAllowance: 250, advance: 0, totalPaid: 0 },
];

export const demoClients: Client[] = [
  { id: 'CLT-001', name: 'Meridian Textiles Ltd.', contactPerson: 'Mr. Farhan Islam', mobile: '01711-998877', email: 'farhan@meridiantex.com', address: 'Level 8, Bashundhara City, Panthapath, Dhaka', billingAddress: 'Level 8, Bashundhara City, Panthapath, Dhaka', tradeLicense: 'TL-2019-004512', clientType: 'Company', joiningDate: '2026-01-01', status: 'Active', totalReceivable: 100000, totalCollected: 70000 },
  { id: 'CLT-002', name: 'Northstar Holdings', contactPerson: 'Ms. Shahnaz Parveen', mobile: '01812-887766', email: 'shahnaz@northstar.com.bd', address: 'House 15, Gulshan-1, Dhaka', clientType: 'Company', joiningDate: '2026-04-01', status: 'Active', totalReceivable: 85000, totalCollected: 85000 },
  { id: 'CLT-003', name: 'Apex Logistics', contactPerson: 'Mr. Tanvir Rahman', mobile: '01613-776655', email: 'tanvir@apexlogistics.bd', address: 'Plot 22, BSCIC Industrial Area, Chittagong', clientType: 'Company', joiningDate: '2026-06-01', status: 'Active', totalReceivable: 130000, totalCollected: 90000 },
  { id: 'CLT-004', name: 'Eastern Trading Co.', contactPerson: 'Mr. Ashraf Ali', mobile: '01514-665544', email: 'ashraf@easterntrading.com', address: 'Block D, Motijheel, Dhaka', clientType: 'Company', joiningDate: '2026-08-01', status: 'Active', totalReceivable: 110000, totalCollected: 50000 },
  { id: 'CLT-005', name: 'Prime Pharma Group', contactPerson: 'Dr. Nasreen Akter', mobile: '01715-554433', email: 'nasreen@primepharma.com.bd', address: 'Tejgaon Industrial Area, Dhaka', clientType: 'Company', joiningDate: '2025-10-01', status: 'Active', totalReceivable: 95000, totalCollected: 95000 },
];

export const demoDuties: Duty[] = [
  { id: 'DTY-001', date: '2026-11-10', clientId: 'CLT-001', clientName: 'Meridian Textiles Ltd.', vehicleId: 'VEH-001', vehicleReg: 'DHA-METRO-GA-19-7724', driverId: 'DRV-001', driverName: 'Imran Hossain', pickupLocation: 'Panthapath, Dhaka', destination: 'Narayanganj Export Zone', startTime: '08:00', endTime: '17:00', dutyType: 'Monthly', customerContact: '01711-998877', description: 'Factory duty', agreedRent: 100000, fuelCost: 0, overtimeCharge: 0, driverAllowance: 300, additionalCharge: 0, discount: 0, totalAmount: 100300, status: 'Running' },
  { id: 'DTY-002', date: '2026-11-10', clientId: 'CLT-002', clientName: 'Northstar Holdings', vehicleId: 'VEH-002', vehicleReg: 'DHA-METRO-GA-22-4811', driverId: 'DRV-002', driverName: 'Hasan Ali', pickupLocation: 'Gulshan-1, Dhaka', destination: 'Airport Road', startTime: '09:00', endTime: '18:00', dutyType: 'Monthly', customerContact: '01812-887766', agreedRent: 85000, fuelCost: 2500, overtimeCharge: 0, driverAllowance: 250, additionalCharge: 0, discount: 0, totalAmount: 87750, status: 'Running' },
  { id: 'DTY-003', date: '2026-11-10', clientId: 'CLT-003', clientName: 'Apex Logistics', vehicleId: 'VEH-003', vehicleReg: 'DHA-METRO-CHA-14-2056', driverId: 'DRV-003', driverName: 'Jamal Uddin', pickupLocation: 'Chittagong Port', destination: 'Dhaka EPZ', startTime: '06:00', endTime: '20:00', dutyType: 'Trip', customerContact: '01613-776655', description: 'Outstation goods pickup', agreedRent: 15000, fuelCost: 5000, overtimeCharge: 2000, driverAllowance: 800, additionalCharge: 500, discount: 0, totalAmount: 23300, status: 'Completed' },
  { id: 'DTY-004', date: '2026-11-10', clientId: 'CLT-004', clientName: 'Eastern Trading Co.', vehicleId: 'VEH-004', vehicleReg: 'DHA-METRO-GA-25-1190', driverId: 'DRV-004', driverName: 'Sabbir Ahmed', pickupLocation: 'Motijheel, Dhaka', destination: 'Narsingdi', startTime: '10:00', dutyType: 'Daily', customerContact: '01514-665544', agreedRent: 5000, fuelCost: 1500, overtimeCharge: 0, driverAllowance: 350, additionalCharge: 0, discount: 0, totalAmount: 6850, status: 'Scheduled' },
];

export const demoGarages: Garage[] = [
  { id: 'GRG-001', name: 'Star Auto Workshop', contactPerson: 'Mr. Jalal Uddin', mobile: '01711-123456', address: 'Tejgaon Industrial Area, Dhaka', garageType: 'General', status: 'Active', totalBill: 85000, totalPaid: 60000 },
  { id: 'GRG-002', name: 'Cool AC Service Center', contactPerson: 'Mr. Milon Ahmed', mobile: '01811-234567', address: 'Mirpur-10, Dhaka', garageType: 'AC Specialist', status: 'Active', totalBill: 32000, totalPaid: 32000 },
  { id: 'GRG-003', name: 'Premium Motors Ltd.', contactPerson: 'Mr. Nurul Islam', mobile: '01611-345678', address: 'Mohakhali, Dhaka', garageType: 'Engine', status: 'Active', totalBill: 120000, totalPaid: 80000 },
];

export const demoMaintenance: MaintenanceRecord[] = [
  { id: 'MNT-001', vehicleId: 'VEH-001', vehicleReg: 'DHA-METRO-GA-19-7724', garageId: 'GRG-001', garageName: 'Star Auto Workshop', date: '2026-09-12', problemDescription: 'Brake pads worn, brake fluid low', serviceType: 'Brake', partsDetails: 'Front brake pads × 2, brake fluid 1L', labourCost: 3000, partsCost: 5000, totalCost: 8000, expectedDelivery: '2026-09-13', actualDelivery: '2026-09-13', status: 'Delivered' },
  { id: 'MNT-002', vehicleId: 'VEH-004', vehicleReg: 'DHA-METRO-GA-25-1190', garageId: 'GRG-002', garageName: 'Cool AC Service Center', date: '2026-09-17', problemDescription: 'AC not cooling properly', serviceType: 'AC', labourCost: 2000, partsCost: 4200, totalCost: 6200, expectedDelivery: '2026-09-18', status: 'In Progress' },
  { id: 'MNT-003', vehicleId: 'VEH-006', vehicleReg: 'DHA-METRO-GA-18-9922', garageId: 'GRG-003', garageName: 'Premium Motors Ltd.', date: '2026-11-05', problemDescription: 'Engine overheating, coolant leak detected', serviceType: 'Engine', partsDetails: 'Coolant hose, thermostat', labourCost: 8000, partsCost: 12000, totalCost: 20000, expectedDelivery: '2026-11-12', status: 'In Progress' },
];

export const demoExpenses: Expense[] = [
  { id: 'EXP-001', date: '2026-11-10', category: 'Fuel', title: 'Fuel for VEH-002', amount: 2500, paymentMethod: 'Cash', account: 'Main Cash', paidTo: 'Padma Filling Station', reference: 'FUEL-001', vehicleId: 'VEH-002', vehicleReg: 'DHA-METRO-GA-22-4811' },
  { id: 'EXP-002', date: '2026-11-09', category: 'Driver Food/Allowance', title: 'Driver food - Jamal Uddin (Chittagong trip)', amount: 800, paymentMethod: 'Mobile Banking', account: 'bKash', paidTo: 'Jamal Uddin', reference: 'BKS-291', vehicleId: 'VEH-003', vehicleReg: 'DHA-METRO-CHA-14-2056' },
  { id: 'EXP-003', date: '2026-11-08', category: 'Toll', title: 'Dhaka-Chittagong highway toll', amount: 500, paymentMethod: 'Cash', account: 'Main Cash', paidTo: 'Highway Authority', vehicleId: 'VEH-003', vehicleReg: 'DHA-METRO-CHA-14-2056' },
  { id: 'EXP-004', date: '2026-11-07', category: 'Office Rent', title: 'Office rent - November', amount: 25000, paymentMethod: 'Bank Transfer', account: 'Dutch-Bangla Bank', paidTo: 'Building Owner - Mr. Karim', reference: 'BEFTN-7001' },
  { id: 'EXP-005', date: '2026-11-05', category: 'Maintenance', title: 'VEH-006 Engine repair', amount: 20000, paymentMethod: 'Bank Transfer', account: 'Dutch-Bangla Bank', paidTo: 'Premium Motors Ltd.', reference: 'MNT-003', vehicleId: 'VEH-006', vehicleReg: 'DHA-METRO-GA-18-9922' },
];

export const demoAccounts: Account[] = [
  { id: 'ACC-001', name: 'Main Cash Account', type: 'Cash', openingBalance: 500000, currentBalance: 283200 },
  { id: 'ACC-002', name: 'Dutch-Bangla Bank', accountNumber: '2241001234567', type: 'Bank', openingBalance: 1000000, currentBalance: 756800 },
  { id: 'ACC-003', name: 'bKash Business', type: 'Cash', openingBalance: 50000, currentBalance: 32500 },
  { id: 'ACC-004', name: 'BRAC Bank', accountNumber: '3351002345678', type: 'Bank', openingBalance: 500000, currentBalance: 423000 },
];

export const demoAlerts: Alert[] = [
  { id: 'ALT-001', type: 'payment', severity: 'danger', title: 'Eastern Trading Co. – Payment Overdue', detail: 'Invoice amount ৳60,000 overdue by 15 days', date: '2026-11-10', dueDate: '2026-10-26', relatedId: 'CLT-004', read: false },
  { id: 'ALT-002', type: 'document', severity: 'warning', title: 'Driver License Expiring Soon – Rafiqul Islam', detail: 'License expires on 2025-07-29 (expired!)', date: '2026-11-10', dueDate: '2025-07-29', relatedId: 'DRV-005', read: false },
  { id: 'ALT-003', type: 'agreement', severity: 'info', title: 'Agreement Renewal Due – Apex Logistics', detail: 'Vehicle DHA-METRO-CHA-14-2056 agreement has no end date set', date: '2026-11-09', relatedId: 'CLT-003', read: true },
  { id: 'ALT-004', type: 'maintenance', severity: 'warning', title: 'VEH-006 Still in Garage', detail: 'Expected delivery was 2026-11-12, still In Progress', date: '2026-11-10', relatedId: 'MNT-003', read: false },
  { id: 'ALT-005', type: 'payment', severity: 'info', title: 'Owner Payment Due – Mahmudul Hasan', detail: 'Monthly rent for November not yet paid', date: '2026-11-01', relatedId: 'OWN-004', read: true },
  { id: 'ALT-006', type: 'document', severity: 'danger', title: 'Hasan Ali License Expiring – Aug 2026', detail: 'License B-345678-2021 expires 2026-08-21 (< 90 days)', date: '2026-11-10', dueDate: '2026-08-21', relatedId: 'DRV-002', read: false },
];

// ─── Aggregated KPIs for Dashboard ──────────────────────────────────────────
export function getDashboardKPIs() {
  const totalVehicles = demoVehicles.length;
  const activeVehicles = demoVehicles.filter(v => v.status !== 'Inactive').length;
  const availableVehicles = demoVehicles.filter(v => v.status === 'Available').length;
  const onDutyVehicles = demoVehicles.filter(v => v.status === 'On Duty').length;
  const inGarageVehicles = demoVehicles.filter(v => v.status === 'In Garage').length;
  const inactiveVehicles = demoVehicles.filter(v => v.status === 'Inactive').length;

  const totalOwners = demoOwners.length;
  const activeOwners = demoOwners.filter(o => o.status === 'Active').length;
  const totalDrivers = demoDrivers.length;
  const activeDrivers = demoDrivers.filter(d => d.status === 'Active').length;
  const unassignedDrivers = demoDrivers.filter(d => !d.assignedVehicleId && d.status === 'Active').length;

  const totalClientReceivable = demoClients.reduce((s, c) => s + (c.totalReceivable - c.totalCollected), 0);
  const totalOwnerPayable = demoOwners.reduce((s, o) => s + (o.totalPayable - o.totalPaid), 0);
  const totalDriverPayable = demoDrivers.reduce((s, d) => s + (d.monthlySalary - d.totalPaid + d.advance), 0);
  const totalGaragePayable = demoGarages.reduce((s, g) => s + (g.totalBill - g.totalPaid), 0);

  const cashBalance = demoAccounts.filter(a => a.type === 'Cash').reduce((s, a) => s + a.currentBalance, 0);
  const bankBalance = demoAccounts.filter(a => a.type === 'Bank').reduce((s, a) => s + a.currentBalance, 0);

  const todayDuties = demoDuties.filter(d => d.date === '2026-11-10');
  const runningDuties = todayDuties.filter(d => d.status === 'Running').length;
  const completedDuties = todayDuties.filter(d => d.status === 'Completed').length;
  const todayRevenue = todayDuties.filter(d => d.status !== 'Cancelled').reduce((s, d) => s + d.totalAmount, 0);
  const todayExpenses = demoExpenses.filter(e => e.date === '2026-11-10').reduce((s, e) => s + e.amount, 0);

  return {
    vehicles: { total: totalVehicles, active: activeVehicles, available: availableVehicles, onDuty: onDutyVehicles, inGarage: inGarageVehicles, inactive: inactiveVehicles },
    owners: { total: totalOwners, active: activeOwners },
    drivers: { total: totalDrivers, active: activeDrivers, unassigned: unassignedDrivers },
    financials: {
      customerReceivable: totalClientReceivable,
      ownerPayable: totalOwnerPayable,
      driverPayable: totalDriverPayable,
      garagePayable: totalGaragePayable,
      cashBalance,
      bankBalance,
      totalBalance: cashBalance + bankBalance,
    },
    today: {
      totalDuties: todayDuties.length,
      running: runningDuties,
      completed: completedDuties,
      available: availableVehicles,
      revenue: todayRevenue,
      expenses: todayExpenses,
    },
    alerts: demoAlerts.filter(a => !a.read).length,
  };
}

// ─── Monthly Chart Data (last 6 months) ─────────────────────────────────────
export const monthlyChartData = [
  { month: 'Jun', income: 315000, expenses: 198000, profit: 117000 },
  { month: 'Jul', income: 330000, expenses: 205000, profit: 125000 },
  { month: 'Aug', income: 298000, expenses: 192000, profit: 106000 },
  { month: 'Sep', income: 425000, expenses: 231500, profit: 193500 },
  { month: 'Oct', income: 388000, expenses: 215000, profit: 173000 },
  { month: 'Nov', income: 217800, expenses: 48800, profit: 169000 },
];

export const vehicleStatusData = [
  { name: 'On Duty', value: 4, color: '#236d80' },
  { name: 'Available', value: 2, color: '#4b92a5' },
  { name: 'In Garage', value: 1, color: '#d4a971' },
  { name: 'Inactive', value: 1, color: '#c5c5c5' },
];

export const expenseCategoryData = [
  { name: 'Fuel', amount: 45000 },
  { name: 'Driver Allowance', amount: 28000 },
  { name: 'Maintenance', amount: 54200 },
  { name: 'Office Rent', amount: 25000 },
  { name: 'Toll/Parking', amount: 8600 },
  { name: 'Other', amount: 12000 },
];


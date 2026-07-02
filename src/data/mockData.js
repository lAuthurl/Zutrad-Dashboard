// ─── USERS ───────────────────────────────────────────────────────────────────
export const mockDataUsers = [
  {
    id: 1,
    firstName: "Adebayo",
    surname: "Okafor",
    email: "adebayo.okafor@zutrad.com",
    role: "administrator",
    isFirstLogin: false,
    permissions: [], // normalized — admins shouldn't carry stale page permissions
  },
  {
    id: 2,
    firstName: "Chidi",
    surname: "Eze",
    email: "chidi.eze@zutrad.com",
    role: "engineer",
    isFirstLogin: false,
    permissions: ["store", "supply"],
  },
  {
    id: 3,
    firstName: "Ngozi",
    surname: "Bello",
    email: "ngozi.bello@zutrad.com",
    role: "receptionist",
    isFirstLogin: false,
    permissions: ["supply"],
  },
  {
    id: 4,
    firstName: "Emeka",
    surname: "Nwosu",
    email: "emeka.nwosu@zutrad.com",
    role: "engineer",
    isFirstLogin: true,
    permissions: [],
  },
  {
    id: 5,
    firstName: "Amina",
    surname: "Yusuf",
    email: "amina.yusuf@zutrad.com",
    role: "receptionist",
    isFirstLogin: false,
    permissions: ["store"],
  },
  {
    id: 6,
    firstName: "Tunde",
    surname: "Fashola",
    email: "tunde.fashola@zutrad.com",
    role: "engineer",
    isFirstLogin: false,
    permissions: [],
  },
  {
    id: 7,
    firstName: "Folasade",
    surname: "Adigwe",
    email: "folasade.adigwe@zutrad.com",
    role: "administrator",
    isFirstLogin: false,
    permissions: [],
},
];


// ─── PENDING SIGNUP REQUESTS ──────────────────────────────────────────────────
export const mockPendingSignups = [
  {
    id: 1,
    firstName: "Folake",
    surname: "Adeyemi",
    email: "folake.adeyemi@gmail.com",
    requestedRole: "engineer",
    requestedAt: "2025-01-03T08:42:00Z",
  },
  {
    id: 2,
    firstName: "Ibrahim",
    surname: "Suleiman",
    email: "ibrahim.suleiman@outlook.com",
    requestedRole: "receptionist",
    requestedAt: "2025-01-04T13:10:00Z",
  },
  {
    id: 3,
    firstName: "Chiamaka",
    surname: "Okonkwo",
    email: "chiamaka.okonkwo@yahoo.com",
    requestedRole: "engineer",
    requestedAt: "2025-01-05T09:25:00Z",
  },
  {
    id: 4,
    firstName: "Adedayo",
    surname: "Rex",
    email: "adedayo.okonkwo@yahoo.com",
    requestedRole: "administrator",
    requestedAt: "2025-01-05T09:25:00Z",
  },
];

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
export const mockDataClients = [
  {
    id: 1,
    companyName: "Dangote Industries Ltd",
    address: "2 Dangote Close, Apapa, Lagos",
    machines: [
      {
        id: 101,
        serialNumber: "MCS-00412",
        machine: "Macsa ID",
        lineInstalled: 1,
        installedDate: "2021-03-15",
        maintenanceCycle: 6,
        lastMaintenanceDate: "2024-09-10",
        usageStatus: "main",
        clientId: 1,
      },
      {
        id: 102,
        serialNumber: "SVM-00871",
        machine: "Savema",
        lineInstalled: 2,
        installedDate: "2020-07-22",
        maintenanceCycle: 3,
        lastMaintenanceDate: "2024-11-01",
        usageStatus: "spare",
        clientId: 1,
      },
    ],
  },
  {
    id: 2,
    companyName: "Nestle Nigeria Plc",
    address: "22-24 Industrial Ave, Ilupeju, Lagos",
    machines: [
      {
        id: 103,
        serialNumber: "SJT-00234",
        machine: "Sojet",
        lineInstalled: 3,
        installedDate: "2022-01-10",
        maintenanceCycle: 6,
        lastMaintenanceDate: "2024-07-10",
        usageStatus: "main",
        clientId: 2,
      },
    ],
  },
  {
    id: 3,
    companyName: "Unilever Nigeria Plc",
    address: "1 Billingsway Road, Oregun, Lagos",
    machines: [
      {
        id: 104,
        serialNumber: "BCD-00556",
        machine: "BestCode",
        lineInstalled: 1,
        installedDate: "2023-05-18",
        maintenanceCycle: 12,
        lastMaintenanceDate: "2024-05-18",
        usageStatus: "main",
        clientId: 3,
      },
      {
        id: 105,
        serialNumber: "MCS-00789",
        machine: "Macsa ID",
        lineInstalled: 4,
        installedDate: "2021-11-30",
        maintenanceCycle: 6,
        lastMaintenanceDate: "2024-10-20",
        usageStatus: "not in use",
        clientId: 3,
      },
    ],
  },
  {
    id: 4,
    companyName: "Flour Mills of Nigeria",
    address: "2 Niger Street, Apapa, Lagos",
    machines: [
      {
        id: 106,
        serialNumber: "SVM-01102",
        machine: "Savema",
        lineInstalled: 2,
        installedDate: "2022-08-05",
        maintenanceCycle: 3,
        lastMaintenanceDate: "2024-12-01",
        usageStatus: "main",
        clientId: 4,
      },
    ],
  },
  {
    id: 5,
    companyName: "PZ Cussons Nigeria",
    address: "45-47 Town Planning Way, Ilupeju, Lagos",
    machines: [
      {
        id: 107,
        serialNumber: "SJT-00879",
        machine: "Sojet",
        lineInstalled: 1,
        installedDate: "2020-03-14",
        maintenanceCycle: 6,
        lastMaintenanceDate: "2024-08-14",
        usageStatus: "spare",
        clientId: 5,
      },
      {
        id: 108,
        serialNumber: "BCD-01234",
        machine: "BestCode",
        lineInstalled: 5,
        installedDate: "2023-09-01",
        maintenanceCycle: 12,
        lastMaintenanceDate: "2024-09-01",
        usageStatus: "main",
        clientId: 5,
      },
    ],
  },
];

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export const mockDataReports = [
  {
    id: 1,
    reportDetails:
      "Inkjet nozzle blockage on Line 1 causing incomplete date codes. Machine halted for cleaning.",
    lineNumber: 1,
    imagePaths: [],
    status: "approved",
    createdAt: "2024-12-01T09:14:00Z",
    client: { id: 1, companyName: "Dangote Industries Ltd" },
    user: { id: 2, firstName: "Chidi", surname: "Eze" },
  },
  {
    id: 2,
    reportDetails:
      "Savema labeller misalignment on Line 2. Labels applied at 3° offset. Adjustment required.",
    lineNumber: 2,
    imagePaths: [],
    status: "pending",
    createdAt: "2024-12-05T11:30:00Z",
    client: { id: 1, companyName: "Dangote Industries Ltd" },
    user: { id: 2, firstName: "Chidi", surname: "Eze" },
  },
  {
    id: 3,
    reportDetails:
      "BestCode unit on Line 1 power supply failure. Unit replaced with spare. Root cause under review.",
    lineNumber: 1,
    imagePaths: [],
    status: "pending",
    createdAt: "2024-12-08T14:05:00Z",
    client: { id: 3, companyName: "Unilever Nigeria Plc" },
    user: { id: 6, firstName: "Tunde", surname: "Fashola" },
  },
  {
    id: 4,
    reportDetails:
      "Sojet printer producing faded prints on Line 3. Ink cartridge depleted ahead of schedule.",
    lineNumber: 3,
    imagePaths: [],
    status: "rejected",
    createdAt: "2024-11-28T08:50:00Z",
    client: { id: 2, companyName: "Nestle Nigeria Plc" },
    user: { id: 4, firstName: "Emeka", surname: "Nwosu" },
  },
  {
    id: 5,
    reportDetails:
      "Routine inspection found wear on conveyor belt near Savema unit. Belt replacement scheduled.",
    lineNumber: 2,
    imagePaths: [],
    status: "approved",
    createdAt: "2024-12-10T16:20:00Z",
    client: { id: 4, companyName: "Flour Mills of Nigeria" },
    user: { id: 2, firstName: "Chidi", surname: "Eze" },
  },
];

// ─── MAINTENANCE ─────────────────────────────────────────────────────────────
export const mockDataMaintenance = [
  {
    id: 1,
    message: "Full clean of printhead and ink system. Nozzle check passed.",
    machine: "Macsa ID",
    maintenanceDay: "2024-09-10",
    isDone: true,
    createdAt: "2024-09-08T10:00:00Z",
    user: { id: 2, firstName: "Chidi", surname: "Eze" },
    client: { id: 1, companyName: "Dangote Industries Ltd" },
  },
  {
    id: 2,
    message:
      "Savema belt tension check and roller lubrication. All within spec.",
    machine: "Savema",
    maintenanceDay: "2024-11-01",
    isDone: true,
    createdAt: "2024-10-30T09:30:00Z",
    user: { id: 6, firstName: "Tunde", surname: "Fashola" },
    client: { id: 1, companyName: "Dangote Industries Ltd" },
  },
  {
    id: 3,
    message: "Sojet ink cartridge replacement and alignment calibration.",
    machine: "Sojet",
    maintenanceDay: "2025-01-10",
    isDone: false,
    createdAt: "2024-12-12T11:00:00Z",
    user: { id: 4, firstName: "Emeka", surname: "Nwosu" },
    client: { id: 2, companyName: "Nestle Nigeria Plc" },
  },
  {
    id: 4,
    message:
      "BestCode annual service — firmware update and full sensor calibration.",
    machine: "BestCode",
    maintenanceDay: "2025-01-15",
    isDone: false,
    createdAt: "2024-12-14T08:00:00Z",
    user: { id: 2, firstName: "Chidi", surname: "Eze" },
    client: { id: 3, companyName: "Unilever Nigeria Plc" },
  },
  {
    id: 5,
    message: "Macsa ID printhead replacement. Old head showing degraded output.",
    machine: "Macsa ID",
    maintenanceDay: "2024-10-20",
    isDone: true,
    createdAt: "2024-10-18T14:00:00Z",
    user: { id: 6, firstName: "Tunde", surname: "Fashola" },
    client: { id: 3, companyName: "Unilever Nigeria Plc" },
  },
];

// ─── SUPPLY ──────────────────────────────────────────────────────────────────
export const mockDataSupply = [
  {
    id: 1,
    goodsSupplied: "Macsa ID Printhead Assembly",
    partNumber: "MCS-PH-0044",
    quantity: 2,
    supplyDate: "2024-11-15",
    createdAt: "2024-11-15T10:30:00Z",
    client: { id: 1, companyName: "Dangote Industries Ltd" },
    user: { id: 3, firstName: "Ngozi", surname: "Bello" },
  },
  {
    id: 2,
    goodsSupplied: "Savema Drive Belt (Standard)",
    partNumber: "SVB-DB-0012",
    quantity: 5,
    supplyDate: "2024-11-20",
    createdAt: "2024-11-20T09:00:00Z",
    client: { id: 4, companyName: "Flour Mills of Nigeria" },
    user: { id: 5, firstName: "Amina", surname: "Yusuf" },
  },
  {
    id: 3,
    goodsSupplied: "Sojet Ink Cartridge (Black, 1L)",
    partNumber: "SJT-INK-BK01",
    quantity: 10,
    supplyDate: "2024-12-02",
    createdAt: "2024-12-02T14:15:00Z",
    client: { id: 2, companyName: "Nestle Nigeria Plc" },
    user: { id: 3, firstName: "Ngozi", surname: "Bello" },
  },
  {
    id: 4,
    goodsSupplied: "BestCode Power Supply Unit",
    partNumber: "BCD-PSU-0009",
    quantity: 1,
    supplyDate: "2024-12-08",
    createdAt: "2024-12-08T16:00:00Z",
    client: { id: 3, companyName: "Unilever Nigeria Plc" },
    user: { id: 5, firstName: "Amina", surname: "Yusuf" },
  },
  {
    id: 5,
    goodsSupplied: "Macsa ID Solvent Cleaner (500ml)",
    partNumber: "MCS-CLN-0007",
    quantity: 6,
    supplyDate: "2024-12-10",
    createdAt: "2024-12-10T11:45:00Z",
    client: { id: 5, companyName: "PZ Cussons Nigeria" },
    user: { id: 3, firstName: "Ngozi", surname: "Bello" },
  },
];

// ─── STORE / INVENTORY ───────────────────────────────────────────────────────
export const mockDataStore = [
  // Macsa ID parts
  {
    id: 1,
    serialNumber: "MCS-PH-0044-S01",
    partNumber: "MCS-PH-0044",
    machinePart: "Printhead Assembly",
    machine: "Macsa ID",
    quantity: 3,
    updatedAt: "2024-11-15T10:30:00Z",
  },
  {
    id: 2,
    serialNumber: "MCS-CLN-0007-S01",
    partNumber: "MCS-CLN-0007",
    machinePart: "Solvent Cleaner 500ml",
    machine: "Macsa ID",
    quantity: 12,
    updatedAt: "2024-12-10T11:45:00Z",
  },
  {
    id: 3,
    serialNumber: "MCS-INK-RD02-S01",
    partNumber: "MCS-INK-RD02",
    machinePart: "Ink Cartridge (Red, 1L)",
    machine: "Macsa ID",
    quantity: 8,
    updatedAt: "2024-10-05T09:00:00Z",
  },
  // Savema parts
  {
    id: 4,
    serialNumber: "SVB-DB-0012-S01",
    partNumber: "SVB-DB-0012",
    machinePart: "Drive Belt (Standard)",
    machine: "Savema",
    quantity: 7,
    updatedAt: "2024-11-20T09:00:00Z",
  },
  {
    id: 5,
    serialNumber: "SVB-RL-0033-S01",
    partNumber: "SVB-RL-0033",
    machinePart: "Pressure Roller Assembly",
    machine: "Savema",
    quantity: 2,
    updatedAt: "2024-09-18T14:00:00Z",
  },
  // Sojet parts
  {
    id: 6,
    serialNumber: "SJT-INK-BK01-S01",
    partNumber: "SJT-INK-BK01",
    machinePart: "Ink Cartridge (Black, 1L)",
    machine: "Sojet",
    quantity: 15,
    updatedAt: "2024-12-02T14:15:00Z",
  },
  {
    id: 7,
    serialNumber: "SJT-NZ-0021-S01",
    partNumber: "SJT-NZ-0021",
    machinePart: "Nozzle Cap Assembly",
    machine: "Sojet",
    quantity: 4,
    updatedAt: "2024-08-30T10:00:00Z",
  },
  // BestCode parts
  {
    id: 8,
    serialNumber: "BCD-PSU-0009-S01",
    partNumber: "BCD-PSU-0009",
    machinePart: "Power Supply Unit",
    machine: "BestCode",
    quantity: 2,
    updatedAt: "2024-12-08T16:00:00Z",
  },
  {
    id: 9,
    serialNumber: "BCD-PCB-0055-S01",
    partNumber: "BCD-PCB-0055",
    machinePart: "Main Control Board",
    machine: "BestCode",
    quantity: 1,
    updatedAt: "2024-07-22T08:30:00Z",
  },
];

export const mockBarData = [
  {
    country: "AD",
    "hot dog": 60,
    burger: 80,
    sandwich: 70,
    kebab: 50,
    fries: 90,
    donut: 40,
  },
  {
    country: "AE",
    "hot dog": 40,
    burger: 60,
    sandwich: 50,
    kebab: 80,
    fries: 70,
    donut: 30,
  },
  {
    country: "AF",
    "hot dog": 80,
    burger: 50,
    sandwich: 60,
    kebab: 40,
    fries: 75,
    donut: 65,
  },
  {
    country: "AG",
    "hot dog": 30,
    burger: 45,
    sandwich: 55,
    kebab: 90,
    fries: 50,
    donut: 25,
  },
  {
    country: "AI",
    "hot dog": 50,
    burger: 40,
    sandwich: 65,
    kebab: 70,
    fries: 60,
    donut: 35,
  },
];

export const mockLineData = [
  {
    id: "Mobile",
    color: "hsl(205, 70%, 50%)",
    data: [
      { x: "Jan", y: 40 },
      { x: "Feb", y: 55 },
      { x: "Mar", y: 65 },
      { x: "Apr", y: 60 },
      { x: "May", y: 75 },
      { x: "Jun", y: 80 },
    ],
  },
  {
    id: "Desktop",
    color: "hsl(100, 70%, 50%)",
    data: [
      { x: "Jan", y: 70 },
      { x: "Feb", y: 68 },
      { x: "Mar", y: 72 },
      { x: "Apr", y: 85 },
      { x: "May", y: 90 },
      { x: "Jun", y: 95 },
    ],
  },
  {
    id: "Tablet",
    color: "hsl(50, 70%, 50%)",
    data: [
      { x: "Jan", y: 30 },
      { x: "Feb", y: 35 },
      { x: "Mar", y: 40 },
      { x: "Apr", y: 45 },
      { x: "May", y: 50 },
      { x: "Jun", y: 55 },
    ],
  },
];

export const mockPieData = [
  { id: "desktop", label: "Desktop", value: 45 },
  { id: "mobile", label: "Mobile", value: 25 },
  { id: "tablet", label: "Tablet", value: 20 },
  { id: "other", label: "Other", value: 10 },
];

// ─── DASHBOARD STATS (for StatBox widgets) ───────────────────────────────────
export const mockDashboardStats = {
  totalClients: 5,
  totalMachines: 8,
  pendingReports: 2,
  pendingMaintenance: 2,
  totalSupplyLogs: 5,
  storeItemsLow: 2, // items with qty <= 2
};

// ─── RECENT ACTIVITY (replaces mockTransactions on dashboard) ────────────────
export const mockRecentActivity = [
  {
    id: "RPT-005",
    description: "Maintenance report filed",
    client: "Flour Mills of Nigeria",
    date: "2024-12-10",
    status: "approved",
  },
  {
    id: "SUP-005",
    description: "Macsa solvent cleaner supplied",
    client: "PZ Cussons Nigeria",
    date: "2024-12-10",
    status: "logged",
  },
  {
    id: "RPT-003",
    description: "Power supply failure reported",
    client: "Unilever Nigeria Plc",
    date: "2024-12-08",
    status: "pending",
  },
  {
    id: "SUP-004",
    description: "BestCode PSU supplied",
    client: "Unilever Nigeria Plc",
    date: "2024-12-08",
    status: "logged",
  },
  {
    id: "MNT-003",
    description: "Sojet maintenance scheduled",
    client: "Nestle Nigeria Plc",
    date: "2024-12-12",
    status: "pending",
  },
  {
    id: "SUP-003",
    description: "Sojet ink cartridges supplied",
    client: "Nestle Nigeria Plc",
    date: "2024-12-02",
    status: "logged",
  },
  {
    id: "RPT-001",
    description: "Nozzle blockage on Line 1",
    client: "Dangote Industries Ltd",
    date: "2024-12-01",
    status: "approved",
  },
  {
    id: "SUP-001",
    description: "Macsa printhead assembly supplied",
    client: "Dangote Industries Ltd",
    date: "2024-11-15",
    status: "logged",
  },
];
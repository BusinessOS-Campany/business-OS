import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/server/auth";
import {
  PERMISSIONS,
  DEFAULT_ROLES,
  EXPENSE_CATEGORIES,
  UNIT_NAMES,
  PRICE_LEVELS,
} from "../src/lib/permissions";

const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  { schema: process.env.PGSCHEMA ?? "public" }
);
const prisma = new PrismaClient({ adapter });

const MIN = (n: number) => BigInt(Math.round(n * 100)); // major -> minor
const TH = (n: number) => BigInt(Math.round(n * 1000)); // qty -> thousandths

interface RoleDef {
  key: string;
  name: string;
  nameAr: string;
  permissions: string[];
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.syncQueue.deleteMany(),
    prisma.journalLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.cashMovement.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.registerSession.deleteMany(),
    prisma.saleReturnItem.deleteMany(),
    prisma.saleReturn.deleteMany(),
    prisma.salePayment.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchasePayment.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.stockTransferItem.deleteMany(),
    prisma.stockTransfer.deleteMany(),
    prisma.inventoryTransaction.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productPrice.deleteMany(),
    prisma.productBarcode.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.exchangeRate.deleteMany(),
    prisma.companyCurrency.deleteMany(),
    prisma.account.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.terminal.deleteMany(),
    prisma.warehouseStaff.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.subcategory.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.priceLevel.deleteMany(),
    prisma.expenseCategory.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.company.deleteMany(),
    prisma.currency.deleteMany(),
  ]);

  // ---------- Permissions ----------
  const createdPermissions = [];
  for (const p of PERMISSIONS) {
    createdPermissions.push(
      await prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: { key: p.key, group: p.group, label: p.label, labelAr: p.labelAr },
      })
    );
  }
  const permByKey = Object.fromEntries(createdPermissions.map((p) => [p.key, p.id]));
  console.log(`Created ${createdPermissions.length} permissions`);

  // ---------- Currencies ----------
  const yer = await prisma.currency.create({
    data: {
      code: "YER",
      name: "Yemeni Rial",
      nameAr: "ريال يمني",
      symbol: "YER",
      symbolAr: "ر.ي",
      precision: 2,
      decimalSeparator: ".",
      thousandsSeparator: ",",
      isBase: true,
    },
  });
  const usd = await prisma.currency.create({
    data: {
      code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$",
      symbolAr: "دولار", precision: 2, decimalSeparator: ".", thousandsSeparator: ",",
      isBase: false,
    },
  });
  const sar = await prisma.currency.create({
    data: {
      code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "SAR",
      symbolAr: "ر.س", precision: 2, decimalSeparator: ".", thousandsSeparator: ",",
      isBase: false,
    },
  });

  // ---------- Plans ----------
  const planBasic = await prisma.plan.create({
    data: {
      name: "Basic",
      nameAr: "أساسي",
      description: "For a single branch store",
      priceMonthly: MIN(5000),
      maxBranches: 1,
      maxUsers: 3,
      maxProducts: 2000,
      maxWarehouses: 1,
      features: { offlinePos: true, accounting: true },
      offlineEnabled: true,
      accountingEnabled: true,
      status: "ACTIVE",
    },
  });

  // ---------- Demo company ----------
  const company = await prisma.company.create({
    data: {
      name: "Yemen Business Demo",
      slug: "yemen-business-demo",
      nameAr: "يمن بزنس التجريبي",
      nameEn: "Yemen Business Demo",
      businessType: "Wholesale & Retail",
      regNumber: "YR-2018-004521",
      taxNumber: "YEM-445-887-221",
      phone: "+967 1 234 567",
      phoneAlt: "+967 77 123 4567",
      email: "info@yemendemo.ye",
      address: "Al Hadda Street",
      governorate: "Sana'a",
      district: "Al Safiya",
      invoicePrefix: "INV",
      invoiceNextNo: BigInt(5001),
      timezone: "Asia/Aden",
      fiscalYearStart: "01-01",
      status: "ACTIVE",
      currencyId: yer.id,
      planId: planBasic.id,
    },
  });
  const sub = await prisma.subscription.create({
    data: { planId: planBasic.id, companyId: company.id, status: "ACTIVE" },
  });
  await prisma.company.update({ where: { id: company.id }, data: { planId: planBasic.id } });

  await prisma.companyCurrency.createMany({
    data: [
      { companyId: company.id, currencyId: yer.id, isDefault: true },
      { companyId: company.id, currencyId: usd.id, isDefault: false },
      { companyId: company.id, currencyId: sar.id, isDefault: false },
    ],
  });
  await prisma.exchangeRate.createMany({
    data: [
      { companyId: company.id, fromCurrencyId: usd.id, toCurrencyId: yer.id, rate: 1600 },
      { companyId: company.id, fromCurrencyId: sar.id, toCurrencyId: yer.id, rate: 426.5 },
    ],
  });

  // ---------- Branches & warehouses ----------
  const govNames = [
    ["Sana'a", "صنعاء"], ["Ibb", "إب"], ["Taiz", "تعز"], ["Aden", "عدن"],
  ];
  const branches = [];
  const warehouses = [];
  for (let i = 0; i < govNames.length; i++) {
    const [en, ar] = govNames[i];
    const wh = await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: `${en} Warehouse`,
        nameAr: `مخزن ${ar}`,
        code: `WH-${i + 1}`,
        address: en,
        isMain: i === 0,
        status: "ACTIVE",
      },
    });
    warehouses.push(wh);
    const br = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: `${en} Branch`,
        nameAr: `فرع ${ar}`,
        code: `BR-${i + 1}`,
        governorate: en,
        district: en,
        phone: `+967 ${1 + i} 234 567`,
        warehouseId: wh.id,
        status: "ACTIVE",
      },
    });
    branches.push(br);
  }
  const [bSanaa, bIbb, bTaiz, bAden] = branches;
  const [whSanaa] = warehouses;
  console.log(`Created ${branches.length} branches`);

  // ---------- Terminals ----------
  const terminals = [];
  for (let i = 0; i < 4; i++) {
    terminals.push(
      await prisma.terminal.create({
        data: {
          companyId: company.id,
          branchId: branches[i].id,
          name: `POS Terminal ${i + 1}`,
          code: `TERM-${i + 1}`,
          type: "POS",
          isActive: true,
        },
      })
    );
  }

  // ---------- Roles ----------
  const roleIds: Record<string, string> = {};
  for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
    const role = await prisma.role.create({
      data: {
        companyId: company.id,
        name: def.name,
        nameAr: def.nameAr,
        isSystem: true,
      },
    });
    roleIds[key] = role.id;
    await prisma.rolePermission.createMany({
      data: def.permissions.map((pk) => ({
        roleId: role.id,
        permissionId: permByKey[pk],
      })),
    });
  }
  console.log("Created default roles");

  // ---------- Users ----------
  const demoPass = await hashPassword("demo123");

  const demoOwner = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Demo Owner",
      username: "demo",
      email: "demo@yemendemo.ye",
      passwordHash: demoPass,
      phone: "+967 77 000 0000",
      language: "ar",
      theme: "system",
      branchId: bSanaa.id,
      terminalId: terminals[0].id,
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({ data: { userId: demoOwner.id, roleId: roleIds.OWNER } });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Ali Al-Sanaani",
      username: "manager",
      email: "manager@yemendemo.ye",
      passwordHash: demoPass,
      phone: "+967 71 111 1111",
      language: "en",
      branchId: bSanaa.id,
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({ data: { userId: manager.id, roleId: roleIds.BRANCH_MANAGER } });

  const cashier = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Sara Ahmed",
      username: "cashier",
      email: "cashier@yemendemo.ye",
      passwordHash: demoPass,
      phone: "+967 73 222 2222",
      language: "ar",
      branchId: bSanaa.id,
      terminalId: terminals[1].id,
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({ data: { userId: cashier.id, roleId: roleIds.CASHIER } });

  // Super admin (platform level)
  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      username: "superadmin",
      email: "admin@yemenpos.ye",
      passwordHash: await hashPassword("superadmin123"),
      isSuperAdmin: true,
      status: "ACTIVE",
    },
  });

  // ---------- Settings ----------
  const settings = [
    {
      key: "company", value: {
        currencyId: yer.id,
        defaultWarehouseId: whSanaa.id,
        defaultBranchId: bSanaa.id,
        defaultPaymentMethodId: null,
        invoicePrefix: "INV",
        invoiceNextNo: 5001,
        receiptFooter: "Thank you for shopping with us",
        receiptFooterAr: "شكراً لتسوقكم معنا",
        allowNegativeStock: false,
        lowStockThreshold: 5,
        expiryAlertDays: 30,
        taxIncluded: true,
        taxRate: "0",
        language: "ar",
        dateFormat: "dd/MM/yyyy",
      },
    },
    { key: "receipt", value: { width: "80mm", showLogo: true, showQr: true, showBarcode: true } },
    { key: "appearance", value: { theme: "system", density: "comfortable" } },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: { companyId: company.id, key: s.key, value: s.value } });
  }

  // ---------- Payment methods ----------
  const paymentMethods = [
    { name: "Cash", nameAr: "نقدي", nameEn: "Cash", type: "CASH", sortOrder: 1 },
    { name: "Card", nameAr: "بطاقة", nameEn: "Card", type: "CARD", sortOrder: 2 },
    { name: "Bank Transfer", nameAr: "تحويل بنكي", nameEn: "Bank Transfer", type: "TRANSFER", sortOrder: 3, requiresReference: true },
    { name: "Kuraimi Wallet", nameAr: "محفظة الكريمي", nameEn: "Kuraimi Wallet", type: "WALLET", sortOrder: 4 },
    { name: "Sufi Wallet", nameAr: "محفظة سوفي", nameEn: "Sufi Wallet", type: "WALLET", sortOrder: 5 },
    { name: "Credit", nameAr: "آجل", nameEn: "Credit", type: "CREDIT", sortOrder: 6, requiresConfirmation: true },
  ] as const;
  const pmIds: Record<string, string> = {};
  for (const pm of paymentMethods) {
    const created = await prisma.paymentMethod.create({
      data: { companyId: company.id, ...pm, isActive: true },
    });
    pmIds[pm.name] = created.id;
  }

  // ---------- Categories / units / price levels / brands ----------
  const catDefs = [
    { name: "Beverages", nameAr: "مشروبات", icon: "CupSoda" },
    { name: "Grocery", nameAr: "مواد غذائية", icon: "ShoppingBasket" },
    { name: "Dairy & Eggs", nameAr: "ألبان وبيض", icon: "Milk" },
    { name: "Personal Care", nameAr: "العناية الشخصية", icon: "SprayCan" },
    { name: "Household", nameAr: "مستلزمات منزلية", icon: "Home" },
    { name: "Electronics", nameAr: "إلكترونيات", icon: "Zap" },
    { name: "Snacks", nameAr: "وجبات خفيفة", icon: "Cookie" },
    { name: "Health", nameAr: "صحة", icon: "Pill" },
    { name: "Clothing", nameAr: "ملابس", icon: "Shirt" },
  ];
  const categoryByKey: Record<string, string> = {};
  for (const c of catDefs) {
    const created = await prisma.category.create({
      data: { companyId: company.id, name: c.name, nameAr: c.nameAr, icon: c.icon, sortOrder: 1 },
    });
    categoryByKey[c.name] = created.id;
  }

  for (const u of UNIT_NAMES) {
    await prisma.unit.create({ data: { companyId: company.id, ...u } });
  }

  for (const pl of PRICE_LEVELS) {
    await prisma.priceLevel.create({ data: { companyId: company.id, ...pl } });
  }

  const brandDefs = ["Sana Foods", "Al-Aseel", "PepsiCo", "Coca Cola", "Samsung", "Local Brand", "Yemen Coffee", "Honey Yemen"];
  for (const b of brandDefs) {
    await prisma.brand.create({ data: { companyId: company.id, name: b, nameAr: b } });
  }

  // ---------- Suppliers ----------
  const supplierDefs = [
    { name: "Al-Rahbi Trading", nameAr: "تجارة الرحبي", companyName: "Al-Rahbi Co.", phone: "+967 70 111 2233", governorate: "Sana'a", creditLimit: MIN(2_000_000) },
    { name: "Sana'a Foods Distributor", nameAr: "موزع صنعاء للأغذية", companyName: "Sana Foods", phone: "+967 73 555 8899", governorate: "Sana'a", creditLimit: MIN(1_500_000) },
    { name: "Aden Electronics", nameAr: "عدن للإلكترونيات", companyName: "Aden Electronics LLC", phone: "+967 72 444 7788", governorate: "Aden", creditLimit: MIN(5_000_000) },
    { name: "Taiz Beverages", nameAr: "تعز للمشروبات", companyName: "Taiz Bev Co.", phone: "+967 71 333 4455", governorate: "Taiz", creditLimit: MIN(800_000) },
    { name: "Al-Arwa Hr House", nameAr: "روائع العروة المنزلية", companyName: "Al-Arwa", phone: "+967 77 888 9900", governorate: "Hodeidah", creditLimit: MIN(600_000) },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    suppliers.push(
      await prisma.supplier.create({
        data: { companyId: company.id, type: "COMPANY", isActive: true, ...s },
      })
    );
  }
  const [supRahbi, supSana, supAden, supTaiz] = suppliers;

  // ---------- Customers ----------
  const customerDefs: {
    name: string; nameAr: string; nameEn: string; phone: string;
    type: "WHOLESALE" | "RETAIL" | "CREDIT" | "VIP"; creditLimit: bigint;
  }[] = [
    { name: "Abdullah Saleh", nameAr: "عبدالله صالح", nameEn: "Abdullah Saleh", phone: "+967 77 111 1111", type: "WHOLESALE", creditLimit: MIN(1_000_000) },
    { name: "Fatima Ali", nameAr: "فاطمة علي", nameEn: "Fatima Ali", phone: "+967 70 222 2222", type: "RETAIL", creditLimit: MIN(100_000) },
    { name: "Mohammed Nasser", nameAr: "محمد ناصر", nameEn: "Mohammed Nasser", phone: "+967 73 333 3333", type: "CREDIT", creditLimit: MIN(500_000) },
    { name: "Khaled Hassan", nameAr: "خالد حسن", nameEn: "Khaled Hassan", phone: "+967 71 444 4444", type: "VIP", creditLimit: MIN(800_000) },
    { name: "Amina Omar", nameAr: "أمينة عمر", nameEn: "Amina Omar", phone: "+967 77 555 5555", type: "RETAIL", creditLimit: MIN(100_000) },
    { name: "Omar Bakir", nameAr: "عمر بكري", nameEn: "Omar Bakir", phone: "+967 70 666 6666", type: "WHOLESALE", creditLimit: MIN(2_000_000) },
  ];
  const customers = [];
  for (let i = 0; i < customerDefs.length; i++) {
    const def = customerDefs[i];
    customers.push(
      await prisma.customer.create({
        data: {
          companyId: company.id,
          number: `CUS-${1000 + i + 1}`,
          name: def.name,
          nameAr: def.nameAr,
          nameEn: def.nameEn,
          phone: def.phone,
          type: def.type,
          creditLimit: def.creditLimit,
          isActive: true,
          balance: 0n,
        },
      })
    );
  }
  const [cusAbdullah, cusFatima, cusMohammed, cusKhaled, cusOmar] = customers;

  // ---------- Chart of accounts ----------
  const accounts: {
    code: string; name: string; nameAr: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  }[] = [
    { code: "1000", name: "Cash", nameAr: "الصندوق", type: "ASSET" },
    { code: "1100", name: "Bank", nameAr: "البنك", type: "ASSET" },
    { code: "1200", name: "Accounts Receivable", nameAr: "ذمم العملاء", type: "ASSET" },
    { code: "1300", name: "Inventory", nameAr: "المخزون", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", nameAr: "ذمم الموردين", type: "LIABILITY" },
    { code: "3000", name: "Owner Equity", nameAr: "رأس المال", type: "EQUITY" },
    { code: "4000", name: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "REVENUE" },
    { code: "4100", name: "Cost of Goods Sold", nameAr: "تكلفة البضاعة المباعة", type: "EXPENSE" },
    { code: "5000", name: "Operating Expenses", nameAr: "المصاريف التشغيلية", type: "EXPENSE" },
    { code: "5100", name: "Salaries", nameAr: "الرواتب", type: "EXPENSE" },
    { code: "5200", name: "Rent & Utilities", nameAr: "الإيجار والخدمات", type: "EXPENSE" },
  ];
  const accountByKey: Record<string, string> = {};
  const accountTypeByKey: Record<string, string> = {};
  for (const a of accounts) {
    const created = await prisma.account.create({
      data: { companyId: company.id, isSystem: true, ...a },
    });
    accountByKey[a.code] = created.id;
    accountTypeByKey[a.code] = a.type;
  }

  // Opening capital: Cash (Asset) vs Equity — keeps the trial balance meaningful
  const OPENING_CAPITAL = MIN(200000000);
  await prisma.account.update({ where: { id: accountByKey["1000"] }, data: { openingBalance: OPENING_CAPITAL, balance: OPENING_CAPITAL } });
  await prisma.account.update({ where: { id: accountByKey["3000"] }, data: { openingBalance: OPENING_CAPITAL, balance: OPENING_CAPITAL } });

  // ---------- Expense categories ----------
  const expCatIds: Record<string, string> = {};
  for (const c of EXPENSE_CATEGORIES) {
    const created = await prisma.expenseCategory.create({
      data: { companyId: company.id, name: c.name, nameAr: c.nameAr },
    });
    expCatIds[c.name] = created.id;
  }

  // ---------- Products ----------
  type P = {
    nameAr: string; nameEn: string; barcode: string; category: string; unit: string;
    cost: number; price: number; wholesale: number; stock: number; brand?: string;
    fav?: boolean; expiry?: boolean; type?: "NORMAL" | "SERVICE" | "WEIGHTED" | "BUNDLE" | "COMPOSITE";
  };
  const productDefs: P[] = [
    { nameAr: "سكر", nameEn: "Sugar 1kg", barcode: "6291010801210", category: "Grocery", unit: "Piece", cost: 3800, price: 4200, wholesale: 4000, stock: 120, brand: "Sana Foods", fav: true },
    { nameAr: "أرز هندي", nameEn: "Basmati Rice 5kg", barcode: "6291010801227", category: "Grocery", unit: "Bag", cost: 28500, price: 31500, wholesale: 30000, stock: 45, brand: "Sana Foods" },
    { nameAr: "طحين", nameEn: "Wheat Flour 1kg", barcode: "6291010801234", category: "Grocery", unit: "Bag", cost: 2600, price: 3000, wholesale: 2800, stock: 90, brand: "Local Brand" },
    { nameAr: "زيت طبخ", nameEn: "Cooking Oil 1L", barcode: "6291010801241", category: "Grocery", unit: "Bottle", cost: 7800, price: 8900, wholesale: 8500, stock: 70, brand: "Al-Aseel", fav: true },
    { nameAr: "ملح", nameEn: "Salt 500g", barcode: "6291010801258", category: "Grocery", unit: "Pack", cost: 400, price: 600, wholesale: 500, stock: 200 },
    { nameAr: "شاي أحمر", nameEn: "Black Tea 200g", barcode: "6291010801265", category: "Grocery", unit: "Box", cost: 10500, price: 12000, wholesale: 11300, stock: 60, brand: "Sana Foods", fav: true },
    { nameAr: "بن يمني", nameEn: "Yemeni Coffee 250g", barcode: "6291010801272", category: "Grocery", unit: "Pack", cost: 48000, price: 56000, wholesale: 53000, stock: 25, brand: "Yemen Coffee", fav: true },
    { nameAr: "عسل سدر", nameEn: "Sidr Honey 500g", barcode: "6291010801289", category: "Grocery", unit: "Box", cost: 55000, price: 65000, wholesale: 61000, stock: 18, brand: "Honey Yemen" },
    { nameAr: "مياه معدنية", nameEn: "Mineral Water 1.5L", barcode: "6291010801296", category: "Beverages", unit: "Bottle", cost: 1100, price: 1500, wholesale: 1300, stock: 400, brand: "Local Brand", fav: true },
    { nameAr: "مياه غازية", nameEn: "Soda Can 330ml", barcode: "6291010801302", category: "Beverages", unit: "Piece", cost: 1800, price: 2500, wholesale: 2200, stock: 300, brand: "PepsiCo", fav: true },
    { nameAr: "عصير برتقال", nameEn: "Orange Juice 1L", barcode: "6291010801319", category: "Beverages", unit: "Bottle", cost: 3800, price: 4800, wholesale: 4400, stock: 55, brand: "Al-Aseel" },
    { nameAr: "حليب مبستر", nameEn: "Milk 1L", barcode: "6291010801326", category: "Dairy & Eggs", unit: "Bottle", cost: 2600, price: 3200, wholesale: 3000, stock: 80, brand: "Sana Foods" },
    { nameAr: "زبادي", nameEn: "Yogurt 250g", barcode: "6291010801333", category: "Dairy & Eggs", unit: "Box", cost: 900, price: 1200, wholesale: 1050, stock: 100 },
    { nameAr: "بيض طازج", nameEn: "Fresh Eggs (30pc)", barcode: "6291010801340", category: "Dairy & Eggs", unit: "Tray", cost: 8600, price: 10000, wholesale: 9500, stock: 40 },
    { nameAr: "جبنة", nameEn: "Cheese 150g", barcode: "6291010801357", category: "Dairy & Eggs", unit: "Pack", cost: 2900, price: 3600, wholesale: 3300, stock: 50, brand: "Al-Aseel" },
    { nameAr: "شامبو", nameEn: "Shampoo 400ml", barcode: "6291010801364", category: "Personal Care", unit: "Bottle", cost: 4800, price: 6500, wholesale: 6000, stock: 35 },
    { nameAr: "صابون", nameEn: "Soap Bar", barcode: "6291010801371", category: "Personal Care", unit: "Piece", cost: 350, price: 500, wholesale: 450, stock: 250 },
    { nameAr: "معجون أسنان", nameEn: "Toothpaste 75g", barcode: "6291010801388", category: "Personal Care", unit: "Piece", cost: 1400, price: 2000, wholesale: 1800, stock: 60 },
    { nameAr: "مسحوق غسيل", nameEn: "Detergent 3kg", barcode: "6291010801395", category: "Household", unit: "Bag", cost: 6800, price: 7800, wholesale: 7400, stock: 48 },
    { nameAr: "مبيض", nameEn: "Bleach 1L", barcode: "6291010801401", category: "Household", unit: "Bottle", cost: 900, price: 1300, wholesale: 1150, stock: 90 },
    { nameAr: "سائل غسيل", nameEn: "Dish Soap 750ml", barcode: "6291010801418", category: "Household", unit: "Bottle", cost: 1700, price: 2300, wholesale: 2100, stock: 75 },
    { nameAr: "مناديل ورقية", nameEn: "Tissue Box", barcode: "6291010801425", category: "Household", unit: "Box", cost: 1200, price: 1800, wholesale: 1600, stock: 110 },
    { nameAr: "شاحن هاتف", nameEn: "Phone Charger", barcode: "6291010801432", category: "Electronics", unit: "Piece", cost: 6800, price: 9500, wholesale: 8800, stock: 30, brand: "Samsung" },
    { nameAr: "سماعات", nameEn: "Earphones", barcode: "6291010801449", category: "Electronics", unit: "Piece", cost: 3500, price: 5500, wholesale: 5000, stock: 42 },
    { nameAr: "فلاشة USB", nameEn: "USB Flash 32GB", barcode: "6291010801456", category: "Electronics", unit: "Piece", cost: 8200, price: 11000, wholesale: 10200, stock: 28, brand: "Samsung" },
    { nameAr: "بطارية AA", nameEn: "AA Battery (4pc)", barcode: "6291010801463", category: "Electronics", unit: "Pack", cost: 1500, price: 2500, wholesale: 2200, stock: 150 },
    { nameAr: "بسكويت", nameEn: "Biscuits", barcode: "6291010801470", category: "Snacks", unit: "Pack", cost: 1300, price: 1800, wholesale: 1600, stock: 130, fav: true },
    { nameAr: "شيبس", nameEn: "Chips 100g", barcode: "6291010801487", category: "Snacks", unit: "Pack", cost: 900, price: 1300, wholesale: 1150, stock: 160 },
    { nameAr: "شوكولاتة", nameEn: "Chocolate Bar", barcode: "6291010801494", category: "Snacks", unit: "Piece", cost: 1800, price: 2600, wholesale: 2350, stock: 85 },
    { nameAr: "كعك", nameEn: "Cupcakes", barcode: "6291010801500", category: "Snacks", unit: "Pack", cost: 2400, price: 3200, wholesale: 2950, stock: 40 },
    { nameAr: "مطب", nameEn: "Kitchen Towel", barcode: "6291010801517", category: "Household", unit: "Piece", cost: 1100, price: 1600, wholesale: 1450, stock: 95 },
    { nameAr: "كاسة", nameEn: "Plastic Cup (50pc)", barcode: "6291010801524", category: "Household", unit: "Pack", cost: 1600, price: 2400, wholesale: 2150, stock: 70 },
    { nameAr: "سواك", nameEn: "Miswak", barcode: "6291010801531", category: "Personal Care", unit: "Piece", cost: 300, price: 500, wholesale: 450, stock: 300 },
    { nameAr: "عطر", nameEn: "Perfume 50ml", barcode: "6291010801548", category: "Personal Care", unit: "Bottle", cost: 15000, price: 22000, wholesale: 20500, stock: 20 },
    { nameAr: "ماء ورد", nameEn: "Rose Water 250ml", barcode: "6291010801555", category: "Personal Care", unit: "Bottle", cost: 3200, price: 4500, wholesale: 4100, stock: 34 },
    { nameAr: "طحينة", nameEn: "Tahini 900g", barcode: "6291010801562", category: "Grocery", unit: "Jar", cost: 7800, price: 9500, wholesale: 8900, stock: 33 },
    { nameAr: "عصير توت", nameEn: "Berry Juice 250ml", barcode: "6291010801579", category: "Beverages", unit: "Piece", cost: 1900, price: 2800, wholesale: 2500, stock: 66 },
    { nameAr: "كرتون مياه", nameEn: "Water Carton 12x1.5L", barcode: "6291010801586", category: "Beverages", unit: "Carton", cost: 13000, price: 16500, wholesale: 15500, stock: 55, type: "BUNDLE" },
    { nameAr: "طماطم معلبة", nameEn: "Canned Tomatoes 400g", barcode: "6291010801593", category: "Grocery", unit: "Can", cost: 2400, price: 3200, wholesale: 2950, stock: 60 },
    { nameAr: "فاصوليا", nameEn: "Beans 420g", barcode: "6291010801609", category: "Grocery", unit: "Can", cost: 1600, price: 2300, wholesale: 2100, stock: 72 },
    { nameAr: "شوربة", nameEn: "Soup Mix", barcode: "6291010801616", category: "Grocery", unit: "Pack", cost: 900, price: 1400, wholesale: 1250, stock: 80 },
    { nameAr: "ملابس قميص", nameEn: "Cotton T-Shirt", barcode: "6291010801623", category: "Clothing", unit: "Piece", cost: 15000, price: 25000, wholesale: 22000, stock: 26 },
    { nameAr: "جاكيت", nameEn: "Jacket", barcode: "6291010801630", category: "Clothing", unit: "Piece", cost: 45000, price: 69000, wholesale: 64000, stock: 12 },
    { nameAr: "علبة متوازنة", nameEn: "Chocolate Box", barcode: "6291010801647", category: "Snacks", unit: "Box", cost: 12500, price: 18000, wholesale: 16500, stock: 22 },
    { nameAr: "مايونيز", nameEn: "Mayonnaise 660g", barcode: "6291010801654", category: "Grocery", unit: "Bottle", cost: 3200, price: 4200, wholesale: 3900, stock: 55 },
    { nameAr: "كاتشب", nameEn: "Ketchup 660g", barcode: "6291010801661", category: "Grocery", unit: "Bottle", cost: 2900, price: 3900, wholesale: 3600, stock: 58 },
    { nameAr: "فارماسي مسكن", nameEn: "Paracetamol 20tabs", barcode: "6291010801678", category: "Health", unit: "Box", cost: 1450, price: 2200, wholesale: 2000, stock: 88, expiry: true },
    { nameAr: "فيتامين سي", nameEn: "Vitamin C 60tabs", barcode: "6291010801685", category: "Health", unit: "Box", cost: 4900, price: 7500, wholesale: 6900, stock: 44 },
    { nameAr: "مسكن معدة", nameEn: "Digestive Tabs", barcode: "6291010801692", category: "Health", unit: "Box", cost: 1800, price: 2800, wholesale: 2550, stock: 50 },
    { nameAr: "حفاضات أطفال", nameEn: "Baby Diapers M(24)", barcode: "6291010801708", category: "Household", unit: "Pack", cost: 19500, price: 24000, wholesale: 22800, stock: 31 },
    { nameAr: "مشرط بسبوسة", nameEn: "Sweet Mix", barcode: "6291010801715", category: "Snacks", unit: "Box", cost: 6500, price: 8500, wholesale: 8000, stock: 18 },
  ];

  const productMap: Record<string, string> = {};
  const unitsRaw = await prisma.unit.findMany({ where: { companyId: company.id } });
  const unitKey: Record<string, string> = {};
  for (const u of unitsRaw) unitKey[u.name] = u.id;

  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    const brand = p.brand
      ? await prisma.brand.findFirst({ where: { companyId: company.id, name: p.brand } })
      : null;
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        sku: `SKU-${1000 + i + 1}`,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        barcode: p.barcode,
        categoryId: categoryByKey[p.category],
        unitId: unitKey[p.unit],
        brandId: brand?.id,
        cost: MIN(p.cost),
        price: MIN(p.price),
        wholesalePrice: MIN(p.wholesale),
        minPrice: MIN(p.wholesale),
        type: p.type ?? "NORMAL",
        isActive: true,
        trackInventory: true,
        isFavorite: p.fav ?? false,
        trackExpiry: p.expiry ?? false,
      },
    });
    productMap[p.nameEn] = product.id;
    await prisma.productBarcode.create({
      data: { companyId: company.id, productId: product.id, barcode: p.barcode, isPrimary: true },
    });
    await prisma.inventory.create({
      data: {
        companyId: company.id,
        productId: product.id,
        warehouseId: whSanaa.id,
        quantity: TH(p.stock),
      },
    });
    await prisma.inventoryTransaction.create({
      data: {
        companyId: company.id,
        productId: product.id,
        warehouseId: whSanaa.id,
        type: "OPENING",
        quantity: TH(p.stock),
        unitAmount: MIN(p.cost),
        totalAmount: MIN(p.stock * p.cost),
        refType: "OPENING",
        reason: "Opening stock",
        createdById: demoOwner.id,
      },
    });
  }
  // yield more stock in other branches
  const otherWarehouses = warehouses.slice(1);
  for (const p of productDefs) {
    const pid = productMap[p.nameEn];
    if (!pid) continue;
    for (const wh of otherWarehouses) {
      await prisma.inventory.create({
        data: {
          companyId: company.id,
          productId: pid,
          warehouseId: wh.id,
          quantity: TH(p.stock * 0.3),
        },
      });
    }
  }
  console.log(`Created ${productDefs.length} products`);

  // ---------- Expenses (this month) ----------
  const now = new Date();
  const expenseDefs = [
    { cat: "Rent", amount: 350000, daysAgo: 2, desc: "Monthly rent - Sana'a Branch" },
    { cat: "Salaries", amount: 1200000, daysAgo: 5, desc: "Staff salaries" },
    { cat: "Electricity", amount: 96000, daysAgo: 1, desc: "Electricity bill" },
    { cat: "Internet", amount: 28000, daysAgo: 3, desc: "Internet subscription" },
    { cat: "Transportation", amount: 45000, daysAgo: 7, desc: "Local delivery" },
    { cat: "Supplies", amount: 32000, daysAgo: 9, desc: "Store supplies" },
  ];
  let expenseNo = 3001;
  for (const e of expenseDefs) {
    const d = new Date(now.getTime() - e.daysAgo * 86400000);
    await prisma.expense.create({
      data: {
        companyId: company.id,
        branchId: bSanaa.id,
        categoryId: expCatIds[e.cat],
        expenseNo: `EXP-${expenseNo++}`,
        amount: MIN(e.amount),
        date: d,
        description: e.desc,
        methodType: "CASH",
        methodNameAr: "نقدي",
        methodNameEn: "Cash",
        createdById: demoOwner.id,
        status: "PAID",
        approvedById: demoOwner.id,
        approvedAt: d,
      },
    });
  }

  // ---------- Purchases (history) ----------
  const purchaseDefs: {
    supplier: (typeof suppliers)[number];
    daysAgo: number;
    items: [string, number, number][];
  }[] = [
    { supplier: supRahbi, daysAgo: 10, items: [[productMap["Basmati Rice 5kg"], 20, 28500], [productMap["Sugar 1kg"], 50, 3800], [productMap["Black Tea 200g"], 30, 10500]] },
    { supplier: supSana, daysAgo: 6, items: [[productMap["Cooking Oil 1L"], 40, 7800], [productMap["Mineral Water 1.5L"], 100, 1100]] },
    { supplier: supAden, daysAgo: 4, items: [[productMap["Phone Charger"], 15, 6800], [productMap["USB Flash 32GB"], 20, 8200]] },
    { supplier: supTaiz, daysAgo: 2, items: [[productMap["Soda Can 330ml"], 60, 1800]] },
  ];
  let purchaseNo = 4001;
  for (const pd of purchaseDefs) {
    const d = new Date(now.getTime() - pd.daysAgo * 86400000);
    let subtotal = 0;
    const items: { productId: string; quantity: bigint; price: bigint; cost: bigint; total: bigint }[] = [];
    for (const [pid, qty, price] of pd.items) {
      subtotal += qty * price;
      items.push({
        productId: pid,
        quantity: TH(qty),
        price: MIN(price),
        cost: MIN(price),
        total: MIN(qty * price),
      });
    }
    const poNo = `PO-${purchaseNo++}`;
    const purchase = await prisma.purchase.create({
      data: {
        companyId: company.id,
        branchId: bSanaa.id,
        supplierId: pd.supplier.id,
        warehouseId: whSanaa.id,
        invoiceNo: poNo,
        invoiceDate: d,
        subtotal: MIN(subtotal),
        total: MIN(subtotal),
        paidAmount: MIN(subtotal),
        dueAmount: 0n,
        createdById: demoOwner.id,
      },
    });
    for (const it of items) {
      await prisma.purchaseItem.create({ data: { purchaseId: purchase.id, ...it } });
      // restore stock as if received
      await prisma.inventory.updateMany({
        where: { productId: it.productId, warehouseId: whSanaa.id },
        data: { quantity: { increment: it.quantity } },
      });
    }
    await prisma.purchasePayment.create({
      data: {
        purchaseId: purchase.id,
        methodId: pmIds["Cash"],
        methodNameAr: "نقدي",
        methodNameEn: "Cash",
        methodType: "CASH",
        amount: MIN(subtotal),
        confirmed: true,
      },
    });
    // journal: DR Inventory / CR Cash (fully paid cash)
    const poLines = [
      { accountCode: "1300", debit: MIN(subtotal), credit: 0n },
      { accountCode: "1000", debit: 0n, credit: MIN(subtotal) },
    ];
    await prisma.journalEntry.create({
      data: {
        companyId: company.id,
        entryNo: `JE-P-${poNo}`,
        refType: "PURCHASE",
        refId: purchase.id,
        description: `Purchase ${poNo}`,
        date: d,
        createdById: demoOwner.id,
        lines: {
          create: poLines.map((l) => ({ accountId: accountByKey[l.accountCode], debit: l.debit, credit: l.credit })),
        },
      },
    });
    for (const l of poLines) {
      const t = accountTypeByKey[l.accountCode];
      const drift = Number(l.debit - l.credit) * (t === "ASSET" || t === "EXPENSE" ? 1 : -1);
      await prisma.account.update({ where: { id: accountByKey[l.accountCode] }, data: { balance: { increment: BigInt(drift) } } });
    }
  }
  console.log("Created purchases");

  // ---------- Helper: create a sale ----------
  let invoiceCounter = 5000;
  type SaleSpec = {
    minutesAgo: number;
    branch: (typeof branches)[number];
    cashier: typeof cashier;
    pay: "CASH" | "WALLET" | "CARD" | "TRANSFER";
    out?: (typeof customers)[number][];
  };
  const saleSpecs: SaleSpec[] = [
    { minutesAgo: 15, branch: bSanaa, cashier: cashier, pay: "CASH", out: [cusAbdullah, cusFatima] },
    { minutesAgo: 42, branch: bSanaa, cashier: cashier, pay: "WALLET", out: [cusFatima] },
    { minutesAgo: 70, branch: bSanaa, cashier: cashier, pay: "CASH" },
    { minutesAgo: 95, branch: bIbb, cashier: manager, pay: "CASH", out: [cusOmar] },
    { minutesAgo: 140, branch: bSanaa, cashier: cashier, pay: "CARD" },
    { minutesAgo: 190, branch: bTaiz, cashier: manager, pay: "TRANSFER", out: [cusMohammed] },
    { minutesAgo: 260, branch: bSanaa, cashier: cashier, pay: "CASH" },
    { minutesAgo: 320, branch: bAden, cashier: manager, pay: "CASH", out: [cusKhaled] },
    { minutesAgo: 26 * 60, branch: bSanaa, cashier: cashier, pay: "CASH" },
    { minutesAgo: 27 * 60, branch: bSanaa, cashier: cashier, pay: "WALLET", out: [cusAbdullah] },
    { minutesAgo: 50 * 60, branch: bSanaa, cashier: cashier, pay: "CASH" },
    { minutesAgo: 3 * 24 * 60, branch: bSanaa, cashier: cashier, pay: "CARD" },
    { minutesAgo: 4 * 24 * 60, branch: bTaiz, cashier: manager, pay: "CASH", out: [cusOmar] },
    { minutesAgo: 6 * 24 * 60, branch: bSanaa, cashier: cashier, pay: "CASH" },
  ];

  const productIds = Object.values(productMap);

  for (const spec of saleSpecs) {
    const d = new Date(now.getTime() - spec.minutesAgo * 60000);
    const itemCount = 2 + Math.floor(Math.random() * 4);
    let subtotal = 0n, costTotal = 0n;
    type Line = { productId: string; quantity: number; price: bigint; cost: bigint; total: bigint };
    const lines: Line[] = [];
    for (let li = 0; li < itemCount; li++) {
      const pid = productIds[Math.floor(Math.random() * productIds.length)];
      const product = await prisma.product.findUnique({ where: { id: pid } });
      if (!product) continue;
      const qty = 1 + Math.floor(Math.random() * 3);
      const total = product.price * BigInt(qty);
      subtotal += total;
      costTotal += product.cost * BigInt(qty);
      lines.push({
        productId: pid,
        quantity: qty,
        price: product.price,
        cost: product.cost,
        total,
      });
    }
    invoiceCounter += 1;
    const customerId = spec.out?.[0]?.id;
    const sale = await prisma.sale.create({
      data: {
        companyId: company.id,
        branchId: spec.branch.id,
        cashierId: spec.cashier.id,
        invoiceNo: `INV-${invoiceCounter}`,
        type: "POS",
        status: "COMPLETED",
        subtotal,
        discount: 0n,
        total: subtotal,
        costTotal,
        profit: subtotal - costTotal,
        paidAmount: subtotal,
        changeAmount: 0n,
        dueAmount: 0n,
        customerId,
        createdAt: d,
        updatedAt: d,
      },
    });
    for (const line of lines) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: line.productId,
          nameAr: "item",
          nameEn: "item",
          quantity: TH(line.quantity),
          price: line.price,
          cost: line.cost,
          total: line.total,
        },
      });
      // decrement inventory
      await prisma.inventory.updateMany({
        where: { productId: line.productId, warehouseId: spec.branch.warehouseId ?? whSanaa.id },
        data: { quantity: { decrement: TH(line.quantity) } },
      });
    }
    const payMethodName = { CASH: "Cash", WALLET: "Kuraimi Wallet", CARD: "Card", TRANSFER: "Bank Transfer" }[spec.pay] ?? "Cash";
    await prisma.salePayment.create({
      data: {
        saleId: sale.id,
        methodId: pmIds[payMethodName],
        methodNameAr: "نقدي",
        methodNameEn: payMethodName,
        methodType: spec.pay,
        amount: subtotal,
        amountInBase: subtotal,
        confirmed: true,
        createdAt: d,
      },
    });
    const saleLines = customerId
      ? [
          { accountCode: "1200", debit: subtotal, credit: 0n },
          { accountCode: "4000", debit: 0n, credit: subtotal },
          { accountCode: "4100", debit: costTotal, credit: 0n },
          { accountCode: "1300", debit: 0n, credit: costTotal },
        ]
      : [
          { accountCode: "1000", debit: subtotal, credit: 0n },
          { accountCode: "4000", debit: 0n, credit: subtotal },
          { accountCode: "4100", debit: costTotal, credit: 0n },
          { accountCode: "1300", debit: 0n, credit: costTotal },
        ];
    await prisma.journalEntry.create({
      data: {
        companyId: company.id,
        entryNo: `JE-S-${invoiceCounter}`,
        refType: "SALE",
        refId: sale.id,
        description: `Sale ${sale.invoiceNo}`,
        date: d,
        createdById: spec.cashier.id,
        lines: {
          create: saleLines.map((l) => ({ accountId: accountByKey[l.accountCode], debit: l.debit, credit: l.credit })),
        },
      },
    });
    // reflect balances (double-entry convention: ASSET/EXPENSE debit +, credit -; others opposite)
    for (const l of saleLines) {
      const t = accountTypeByKey[l.accountCode];
      const drift = Number(l.debit - l.credit) * (t === "ASSET" || t === "EXPENSE" ? 1 : -1);
      await prisma.account.update({ where: { id: accountByKey[l.accountCode] }, data: { balance: { increment: BigInt(drift) } } });
    }
  }
  console.log(`Created ${saleSpecs.length} sample sales`);

  // Customer balances for credit demo
  await prisma.customer.update({
    where: { id: cusMohammed.id },
    data: { balance: MIN(260000) },
  });
  await prisma.customer.update({
    where: { id: cusOmar.id },
    data: { balance: MIN(115000) },
  });

  // Open register session for today
  await prisma.registerSession.create({
    data: {
      companyId: company.id,
      branchId: bSanaa.id,
      userId: cashier.id,
      openedAt: new Date(now.getTime() - 4 * 3600000),
      openingCash: MIN(50000),
      status: "OPEN",
    },
  });
  await prisma.shift.create({
    data: {
      companyId: company.id,
      branchId: bSanaa.id,
      userId: cashier.id,
      openedAt: new Date(now.getTime() - 4 * 3600000),
      openingCash: MIN(50000),
      status: "OPEN",
    },
  });

  // Some notifications
  await prisma.notification.createMany({
    data: [
      { companyId: company.id, type: "LOW_STOCK", title: "Low stock alert", titleAr: "تنبيه مخزون منخفض", body: "Cotton T-Shirt is below reorder level", bodyAr: "قميص قطني أقل من حد إعادة الطلب", read: false },
      { companyId: company.id, type: "SYSTEM", title: "Welcome", titleAr: "مرحباً", body: "Welcome to Yemen POS", bodyAr: "مرحباً بك في يمن بوينت", read: false },
    ],
  });

  // Audit trail
  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: superAdmin.id,
      action: "SYSTEM_SEED",
      entity: "System",
      entityId: company.id,
      newValue: { company: company.name, seededAt: new Date().toISOString() },
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("----------------------------------");
  console.log(`Company: ${company.nameAr} (${company.name})`);
  console.log("Branches: Sana'a, Ibb, Taiz, Aden");
  console.log("Login (owner):  demo / demo123");
  console.log("Login (manager): manager / demo123");
  console.log("Login (cashier): cashier / demo123");
  console.log("Login (super admin): superadmin / superadmin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  ROLE_PERMISSIONS,
  allPermissionKeys,
  MODULES,
  ACTIONS,
  permissionKeysOfRole,
} from "../src/lib/permissions";

const prisma = new PrismaClient();

const YEAR = new Date().getFullYear();
const counters: Record<string, number> = {};
function seq(type: string, prefix: string): string {
  counters[type] = (counters[type] ?? 0) + 1;
  return `${prefix}-${YEAR}-${String(counters[type]).padStart(6, "0")}`;
}

const hash = (s: string) => bcrypt.hashSync(s, 10);

function daysFromNow(days: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding YemenCare HMS demo data…");

  // ------------------------------------------------------------------
  // WIPE (reverse dependency order)
  // ------------------------------------------------------------------
  await prisma.$transaction([
    prisma.queueTicket.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.diagnosis.deleteMany(),
    prisma.vitalSign.deleteMany(),
    prisma.prescriptionItem.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.medAdministration.deleteMany(),
    prisma.fluidBalanceItem.deleteMany(),
    prisma.nursingNote.deleteMany(),
    prisma.radReport.deleteMany(),
    prisma.radiologyOrder.deleteMany(),
    prisma.labResult.deleteMany(),
    prisma.labOrderItem.deleteMany(),
    prisma.labOrder.deleteMany(),
    prisma.admission.deleteMany(),
    prisma.surgery.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.insuranceClaim.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.stockBatch.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.expenseCategory.deleteMany(),
    prisma.journalEntryLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.account.deleteMany(),
    prisma.payrollLine.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.payrollPeriod.deleteMany(),
    prisma.employeeShift.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.employeeDocument.deleteMany(),
    prisma.maintenanceRequest.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.ambulanceTrip.deleteMany(),
    prisma.ambulance.deleteMany(),
    prisma.bloodUnit.deleteMany(),
    prisma.bloodDonation.deleteMany(),
    prisma.bloodDonor.deleteMany(),
    prisma.doctorProfile.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.patientDocument.deleteMany(),
    prisma.allergy.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.service.deleteMany(),
    prisma.labTest.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.currency.deleteMany(),
    prisma.paymentMethodModel.deleteMany(),
    prisma.operatingRoom.deleteMany(),
    prisma.position.deleteMany(),
    prisma.specialty.deleteMany(),
    prisma.bed.deleteMany(),
    prisma.room.deleteMany(),
    prisma.floor.deleteMany(),
    prisma.building.deleteMany(),
    prisma.department.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.city.deleteMany(),
    prisma.governorate.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.numberingSeq.deleteMany(),
  ]);

  // ------------------------------------------------------------------
  // GEOGRAPHY
  // ------------------------------------------------------------------
  const gov = await prisma.$transaction([
    prisma.governorate.create({
      data: { code: "YE-SA", nameAr: "صنعاء", nameEn: "Sanaa" },
    }),
    prisma.governorate.create({
      data: { code: "YE-AD", nameAr: "عدن", nameEn: "Aden" },
    }),
    prisma.governorate.create({
      data: { code: "YE-TA", nameAr: "تعز", nameEn: "Taiz" },
    }),
    prisma.governorate.create({
      data: { code: "YE-HU", nameAr: "الحديدة", nameEn: "Hodeidah" },
    }),
    prisma.governorate.create({
      data: { code: "YE-IB", nameAr: "إب", nameEn: "Ibb" },
    }),
    prisma.governorate.create({
      data: { code: "YE-DH", nameAr: "ذمار", nameEn: "Dhamar" },
    }),
    prisma.governorate.create({
      data: { code: "YE-MA", nameAr: "مأرب", nameEn: "Marib" },
    }),
    prisma.governorate.create({
      data: { code: "YE-HD", nameAr: "حضرموت", nameEn: "Hadhramaut" },
    }),
  ]);

  const sanaa = gov[0]!;
  const aden = gov[1]!;
  if (!sanaa || !aden) throw new Error("Governorates not seeded: " + gov.length);

  const cities = await prisma.$transaction([
    prisma.city.create({ data: { governorateId: sanaa.id, nameAr: "أمانة العاصمة", nameEn: "Sanaa City" } }),
    prisma.city.create({ data: { governorateId: sanaa.id, nameAr: "همدان", nameEn: "Hamdan" } }),
    prisma.city.create({ data: { governorateId: sanaa.id, nameAr: "بني مطر", nameEn: "Bani Matar" } }),
    prisma.city.create({ data: { governorateId: aden.id, nameAr: "كريتر", nameEn: "Crater" } }),
    prisma.city.create({ data: { governorateId: aden.id, nameAr: "خور مكسر", nameEn: "Khormaksar" } }),
    prisma.city.create({ data: { governorateId: aden.id, nameAr: "الشعب", nameEn: "Al-Shaab" } }),
    prisma.city.create({ data: { governorateId: gov[2]!.id, nameAr: "تعز المدينة", nameEn: "Taiz City" } }),
    prisma.city.create({ data: { governorateId: gov[4]!.id, nameAr: "إب المدينة", nameEn: "Ibb City" } }),
  ]);
  const sanaaCity = cities[0]!;

  // ------------------------------------------------------------------
  // BRANCH
  // ------------------------------------------------------------------
  const branch = await prisma.branch.create({
    data: {
      code: "YMH-SA",
      nameAr: "مستشفى اليمن الحديث — فرع الرئيسي",
      nameEn: "Yemen Modern Hospital — Main Branch",
      phone: "+967 1 555 888",
      email: "info@yemancare.local",
      address: "شارع الستين، حي الأصبحي",
      cityId: sanaaCity.id,
      governorateId: sanaa.id,
    },
  });

  // ------------------------------------------------------------------
  // DEPARTMENTS
  // ------------------------------------------------------------------
  const deptDefs = [
    ["OPD", "العيادات الخارجية", "Outpatient Clinics", "CLINICAL", 0],
    ["IM", "الباطنة العامة", "Internal Medicine", "CLINICAL", 1],
    ["PED", "طب الأطفال", "Pediatrics", "CLINICAL", 2],
    ["OBS", "الولادة والنساء", "Obstetrics & Gynecology", "CLINICAL", 3],
    ["SUG", "الجراحة العامة", "General Surgery", "CLINICAL", 4],
    ["ORT", "العظام", "Orthopedics", "CLINICAL", 5],
    ["ENT", "الأنف والأذن والحنجرة", "ENT", "CLINICAL", 6],
    ["OPH", "العيون", "Ophthalmology", "CLINICAL", 7],
    ["CAR", "القلب", "Cardiology", "CLINICAL", 8],
    ["DER", "الجلدية", "Dermatology", "CLINICAL", 9],
    ["ER", "الطوارئ", "Emergency Department", "CLINICAL", 10],
    ["ICU", "العناية المركزة", "Intensive Care Unit", "CLINICAL", 11],
    ["WARD", "الأجنحة", "Wards", "CLINICAL", 12],
    ["MTR", "قسم الولادة", "Maternity Unit", "CLINICAL", 13],
    ["LAB", "المختبر", "Laboratory", "DIAGNOSTIC", 14],
    ["RAD", "الأشعة", "Radiology", "DIAGNOSTIC", 15],
    ["PHR", "الصيدلية", "Pharmacy", "SUPPORT", 16],
  ] as const;

  const departments: Record<string, string> = {};
  for (const [code, ar, en, type, order] of deptDefs) {
    const d = await prisma.department.create({
      data: { branchId: branch.id, code, nameAr: ar, nameEn: en, type, order },
    });
    departments[code] = d.id;
  }

  // ------------------------------------------------------------------
  // BUILDINGS / FLOORS / ROOMS / BEDS
  // ------------------------------------------------------------------
  const bMain = await prisma.building.create({
    data: { code: "B01", nameAr: "المبنى الرئيسي", nameEn: "Main Building", branchId: branch.id },
  });
  const bDiag = await prisma.building.create({
    data: { code: "B02", nameAr: "مبنى التشخيص", nameEn: "Diagnostics Building", branchId: branch.id },
  });

  const floors = [
    { code: "F0", nameAr: "الطابق الأرضي", nameEn: "Ground Floor", buildingId: bMain.id },
    { code: "F1", nameAr: "الطابق الأول", nameEn: "First Floor", buildingId: bMain.id },
    { code: "F2", nameAr: "الطابق الثاني", nameEn: "Second Floor", buildingId: bMain.id },
    { code: "D1", nameAr: "طابق التشخيص", nameEn: "Diagnostics Floor", buildingId: bDiag.id },
  ] as const;
  let floorsRecord: Record<string, string> = {};
  for (const f of floors) {
    const row = await prisma.floor.create({ data: f });
    floorsRecord[f.code] = row.id;
  }

  const roomDefs: {
    code: string;
    nameAr: string;
    nameEn: string;
    type: string;
    floor: string;
    dept?: string;
    beds: { code: string; bedType: string; count: number }[] | "opd" | "ot";
  }[] = [
    {
      code: "ER-1", nameAr: "غرفة إنعاش الطوارئ", nameEn: "ER Resuscitation Room", type: "PATIENT",
      floor: "F0", dept: "ER", beds: [{ code: "ER", bedType: "EMERGENCY", count: 6 }],
    },
    {
      code: "ICU-1", nameAr: "العناية المركزة (أ)", nameEn: "ICU Unit A", type: "PATIENT",
      floor: "F1", dept: "ICU", beds: [{ code: "ICU", bedType: "ICU", count: 8 }],
    },
    {
      code: "W1", nameAr: "جناح عام 1", nameEn: "General Ward 1", type: "PATIENT",
      floor: "F2", dept: "WARD", beds: [{ code: "GW", bedType: "STANDARD", count: 12 }],
    },
    {
      code: "W2", nameAr: "جناح عام 2", nameEn: "General Ward 2", type: "PATIENT",
      floor: "F2", dept: "WARD", beds: [{ code: "GW2", bedType: "STANDARD", count: 12 }],
    },
    {
      code: "MTR-1", nameAr: "جناح الولادة", nameEn: "Maternity Ward", type: "PATIENT",
      floor: "F2", dept: "MTR", beds: [{ code: "MW", bedType: "STANDARD", count: 8 }],
    },
    {
      code: "REC-1", nameAr: "غرفة الإفاقة", nameEn: "Recovery Room", type: "PATIENT",
      floor: "F1", dept: "SUG", beds: [{ code: "RC", bedType: "RECOVERY", count: 4 }],
    },
    {
      code: "SURG-1", nameAr: "غرفة إفادة أولى", nameEn: "Consulting Room 1", type: "EXAM",
      floor: "F0", dept: "OPD", beds: "opd",
    },
    {
      code: "SURG-2", nameAr: "غرفة إفادة ثانية", nameEn: "Consulting Room 2", type: "EXAM",
      floor: "F0", dept: "IM", beds: "opd",
    },
    {
      code: "SURG-3", nameAr: "غرفة إفادة ثالثة", nameEn: "Consulting Room 3", type: "EXAM",
      floor: "F0", dept: "PED", beds: "opd",
    },
    {
      code: "OT-1", nameAr: "غرفة العمليات 1", nameEn: "Operating Room 1", type: "OPERATING",
      floor: "F1", dept: "SUG", beds: "ot",
    },
    {
      code: "OT-2", nameAr: "غرفة العمليات 2", nameEn: "Operating Room 2", type: "OPERATING",
      floor: "F1", dept: "OBS", beds: "ot",
    },
    {
      code: "XRAY-1", nameAr: "غرفة الأشعة", nameEn: "X-Ray Room", type: "RADIOLOGY",
      floor: "D1", dept: "RAD", beds: "ot",
    },
    {
      code: "US-1", nameAr: "غرفة الموجات فوق الصوتية", nameEn: "Ultrasound Room", type: "RADIOLOGY",
      floor: "D1", dept: "RAD", beds: "ot",
    },
    {
      code: "CT-1", nameAr: "غرفة المفراس", nameEn: "CT Scan Room", type: "RADIOLOGY",
      floor: "D1", dept: "RAD", beds: "ot",
    },
    {
      code: "LAB-1", nameAr: "مختبر الميكروبيولوجيا", nameEn: "Main Laboratory", type: "LAB",
      floor: "D1", dept: "LAB", beds: "ot",
    },
    {
      code: "PHR-1", nameAr: "صيدلية المستشفى", nameEn: "Hospital Pharmacy", type: "PHARMACY",
      floor: "F0", dept: "PHR", beds: "ot",
    },
    {
      code: "STORE-1", nameAr: "المخزن الرئيسي", nameEn: "Main Store", type: "STORE",
      floor: "F0", dept: "WARD", beds: "ot",
    },
  ];

  let bedCount = 0;
  for (const rd of roomDefs) {
    const room = await prisma.room.create({
      data: {
        code: rd.code, nameAr: rd.nameAr, nameEn: rd.nameEn, type: rd.type,
        branchId: branch.id, buildingId: bMain.id,
        floorId: floorsRecord[rd.floor]!,
        departmentId: rd.dept ? departments[rd.dept]! : undefined,
      },
    });
    if (rd.beds === "opd" || rd.beds === "ot") continue;
    for (const bg of rd.beds as { code: string; bedType: string; count: number }[]) {
      for (let i = 1; i <= bg.count; i++) {
        await prisma.bed.create({
          data: {
            code: `${bg.code}-${String(i).padStart(2, "0")}`,
            roomId: room.id,
            branchId: branch.id,
            bedType: bg.bedType,
          },
        });
        bedCount++;
      }
    }
  }

  // Operating rooms (top-level model too)
  const ot1 = await prisma.operatingRoom.create({
    data: { code: "OT-01", nameAr: "غرفة العمليات 1", nameEn: "Operating Room 1", location: "Main Building – F1" },
  });
  const ot2 = await prisma.operatingRoom.create({
    data: { code: "OT-02", nameAr: "غرفة العمليات 2", nameEn: "Operating Room 2", location: "Main Building – F1" },
  });

  // ------------------------------------------------------------------
  // POSITIONS / SPECIALTIES
  // ------------------------------------------------------------------
  const positions = [
    ["CON", "استشاري", "Consultant"],
    ["SPC", "أخصائي", "Specialist"],
    ["RST", "مقيم", "Resident"],
    ["GP", "طبيب عام", "General Practitioner"],
    ["HN", "مشرفة تمريض", "Head Nurse"],
    ["NRS", "ممرض/ممرضة", "Nurse"],
    ["PHR", "صيدلي", "Pharmacist"],
    ["LABT", "أخصائي مختبر", "Lab Technician"],
    ["RAD", "أخصائي أشعة", "Radiologist"],
    ["RADT", "فني أشعة", "Radiology Technician"],
    ["REC", "موظف استقبال", "Receptionist"],
    ["ACC", "محاسب", "Accountant"],
    ["HR", "أخصائي موارد بشرية", "HR Officer"],
    ["CAS", "أمين صندوق", "Cashier"],
    ["DRV", "سائق إسعاف", "Ambulance Driver"],
  ] as const;
  for (const [code, ar, en] of positions) {
    await prisma.position.create({ data: { nameAr: ar, nameEn: en } });
  }

  const specialties = [
    ["IM", "باطنة", "Internal Medicine"],
    ["PED", "أطفال", "Pediatrics"],
    ["FM", "طب أسرة", "Family Medicine"],
    ["SUG", "جراحة عامة", "General Surgery"],
    ["ORT", "عظام", "Orthopedics"],
    ["OBS", "نساء وولادة", "Obstetrics & Gynecology"],
    ["ENT", "أنف وأذن وحنجرة", "ENT"],
    ["OPH", "عيون", "Ophthalmology"],
    ["CAR", "قلب", "Cardiology"],
    ["DER", "جلدية", "Dermatology"],
    ["EMR", "طب طوارئ", "Emergency Medicine"],
    ["ANS", "تخدير", "Anesthesiology"],
    ["RAD", "أشعة", "Radiology"],
    ["LBM", "طب مختبرات", "Laboratory Medicine"],
    ["PHR", "صيدلة سريرية", "Clinical Pharmacy"],
  ] as const;
  const specIds: Record<string, string> = {};
  for (const [code, ar, en] of specialties) {
    const s = await prisma.specialty.create({ data: { nameAr: ar, nameEn: en } });
    specIds[code] = s.id;
  }

  // ------------------------------------------------------------------
  // EMPLOYEES
  // ------------------------------------------------------------------
  const emp = async (
    no: string, nameAr: string, nameEn: string, type: string,
    dept: string | null, spec: string | null, phone: string, salary: number,
    extra: Record<string, unknown> = {}
  ) =>
    prisma.employee.create({
      data: {
        employeeNo: no, nameAr, nameEn, employeeType: type as never,
        departmentId: dept ? departments[dept] : null,
        specialtyId: spec ? specIds[spec]! : null,
        branchId: branch.id, phone, hireDate: daysFromNow(-400),
        employeeStatus: "ACTIVE", baseSalary: salary, gender: "MALE",
        ...extra,
      },
    });

  const drInternal = await emp("EMP-0001", "د. أحمد الحميدي", "Dr. Ahmed Al-Humaidi", "DOCTOR", "IM", "IM", "771111001", 350000);
  const drPeds = await emp("EMP-0002", "د. سمير العريقي", "Dr. Sameer Al-Ariqi", "DOCTOR", "PED", "PED", "771111002", 340000);
  const drSurge = await emp("EMP-0003", "د. خالد المعمري", "Dr. Khaled Al-Maamari", "DOCTOR", "SUG", "SUG", "771111003", 420000);
  const drObs = await emp("EMP-0004", "د. نجلاء الشامي", "Dr. Najla Al-Shami", "DOCTOR", "OBS", "OBS", "771111004", 360000);
  const drEm = await emp("EMP-0005", "د. وائل السنباني", "Dr. Wael Al-Sanabani", "DOCTOR", "ER", "EMR", "771111005", 330000);
  const drAnes = await emp("EMP-0006", "د. ماجد الحكيمي", "Dr. Majed Al-Hakimi", "DOCTOR", "SUG", "ANS", "771111006", 400000);
  const drRad = await emp("EMP-0007", "د. ريم الخالدي", "Dr. Reem Al-Khalidi", "RADIOLOGIST", "RAD", "RAD", "771111007", 320000);
  const headNurse = await emp("EMP-0008", "أ. منى عبد الباقي", "Mona Abdulbaqi", "NURSE", "ICU", null, "771111008", 150000, { gender: "FEMALE" });
  const nurse1 = await emp("EMP-0009", "أ. حنان الغيلي", "Hanan Al-Ghaili", "NURSE", "ER", null, "771111009", 120000, { gender: "FEMALE" });
  const nurse2 = await emp("EMP-0010", "أ. صفاء الجبري", "Safa Al-Jabri", "NURSE", "WARD", null, "771111010", 120000, { gender: "FEMALE" });
  const pharm = await emp("EMP-0011", "أ. عبد الله الشرعي", "Abdullah Al-Sharai", "PHARMACIST", "PHR", "PHR", "771111011", 135000);
  const labTech = await emp("EMP-0012", "أ. إبراهيم العبسي", "Ibrahim Al-Abssi", "LAB_TECHNICIAN", "LAB", "LBM", "771111012", 125000);
  const radTech = await emp("EMP-0013", "أ. فيصل المقطري", "Faisal Al-Maqtari", "RADIOLOGY_TECHNICIAN", "RAD", null, "771111013", 115000);
  const reception = await emp("EMP-0014", "أ. إيمان الصباحي", "Iman Al-Sabahi", "RECEPTIONIST", "OPD", null, "771111014", 80000, { gender: "FEMALE" });
  const accountant = await emp("EMP-0015", "أ. عادل القباطي", "Adel Al-Qabati", "ACCOUNTANT", null, null, "771111015", 130000);
  const cashier = await emp("EMP-0016", "أ. باسم الحمادي", "Bassam Al-Hammadi", "CASHIER", null, null, "771111016", 85000);
  const hr = await emp("EMP-0017", "أ. سلوى الرميمة", "Salwa Al-Rumaima", "HR", null, null, "771111017", 110000, { gender: "FEMALE" });
  const adminEmp = await emp("EMP-0018", "أ. محمود السقاف", "Mahmoud Al-Saqqaf", "ADMINISTRATOR", null, null, "771111018", 300000);
  const driver1 = await emp("EMP-0019", "أ. فؤاد المخلافي", "Fuad Al-Makhlafi", "AMBULANCE_STAFF", "ER", null, "771111019", 90000);
  const extraDoctor = await emp("EMP-0020", "د. هدى الذبحاني", "Dr. Huda Al-Zabbani", "DOCTOR", "OPD", "FM", "771111020", 300000, { gender: "FEMALE" });

  await prisma.doctorProfile.create({ data: { employeeId: drInternal.id, consultationFee: 5000 } });
  await prisma.doctorProfile.create({ data: { employeeId: drPeds.id, consultationFee: 5000 } });
  await prisma.doctorProfile.create({ data: { employeeId: drObs.id, consultationFee: 7000 } });
  await prisma.doctorProfile.create({ data: { employeeId: drSurge.id, consultationFee: 10000 } });
  await prisma.doctorProfile.create({ data: { employeeId: extraDoctor.id, consultationFee: 5000 } });

  // ------------------------------------------------------------------
  // ROLES / PERMISSIONS
  // ------------------------------------------------------------------
  const roleNames: Record<string, [string, string]> = {
    super_admin: ["مدير النظام", "Super Admin"],
    admin: ["مدير المستشفى", "Hospital Admin"],
    manager: ["مدير تنفيذي", "Manager"],
    doctor: ["طبيب", "Doctor"],
    nurse: ["ممرض/ممرضة", "Nurse"],
    receptionist: ["الاستقبال", "Receptionist"],
    pharmacist: ["صيدلي", "Pharmacist"],
    lab_technician: ["أخصائي مختبر", "Lab Technician"],
    radiologist: ["أخصائي أشعة", "Radiologist"],
    radiology_technician: ["فني أشعة", "Radiology Technician"],
    accountant: ["محاسب", "Accountant"],
    cashier: ["أمين صندوق", "Cashier"],
    hr_manager: ["مدير موارد بشرية", "HR Manager"],
    inventory_manager: ["مدير مخزون", "Inventory Manager"],
    ambulance_staff: ["طاقم الإسعاف", "Ambulance Staff"],
    patient: ["مريض", "Patient"],
  };

  const roles: Record<string, string> = {};
  for (const key of Object.keys(roleNames)) {
    const r = await prisma.role.create({
      data: {
        key,
        nameAr: roleNames[key]![0],
        nameEn: roleNames[key]![1],
        isSystem: true,
      },
    });
    roles[key] = r.id;
  }

  const allPerms = allPermissionKeys();
  const permissionRows = await prisma.$transaction(
    allPerms.map((key) => {
      const [module, action] = key.split(":") as [string, string];
      return prisma.permission.create({
        data: {
          key,
          module,
          action,
          nameEn: `${module} · ${action}`,
          nameAr: `${module} · ${action}`,
        },
      });
    })
  );
  const permissionByKey = new Map(permissionRows.map((p) => [p.key, p.id]));

  for (const [roleKey, map] of Object.entries(ROLE_PERMISSIONS)) {
    const keys = permissionKeysOfRole(roleKey);
    await prisma.rolePermission.createMany({
      data: keys
        .filter((k) => permissionByKey.has(k))
        .map((k) => ({ roleId: roles[roleKey]!, permissionId: permissionByKey.get(k)! })),
      skipDuplicates: true,
    });
  }

  // ------------------------------------------------------------------
  // USERS
  // ------------------------------------------------------------------
  const user = async (
    email: string, password: string, nameAr: string, nameEn: string,
    roleKey: string, employeeId: string
  ) =>
    prisma.user.create({
      data: {
        email, passwordHash: hash(password), nameAr, nameEn,
        roleId: roles[roleKey]!, branchId: branch.id, employeeId,
      },
    });

  const adminUser = await user("admin@yemencare.local", "Admin@123", "أ. محمود السقاف", "Mahmoud Al-Saqqaf", "admin", adminEmp.id);
  await prisma.user.create({
    data: {
      email: "demo@yemencare.local",
      username: "demo",
      passwordHash: hash("demo123"),
      nameAr: "حساب تجريبي",
      nameEn: "Demo Account",
      roleId: roles.admin!,
      branchId: branch.id,
    },
  });
  await user("doctor@yemencare.local", "Doctor@123", "د. أحمد الحميدي", "Dr. Ahmed Al-Humaidi", "doctor", drInternal.id);
  await user("nurse@yemencare.local", "Nurse@123", "أ. حنان الغيلي", "Hanan Al-Ghaili", "nurse", nurse1.id);
  await user("reception@yemencare.local", "Reception@123", "أ. إيمان الصباحي", "Iman Al-Sabahi", "receptionist", reception.id);
  await user("pharmacist@yemencare.local", "Pharmacy@123", "أ. عبد الله الشرعي", "Abdullah Al-Sharai", "pharmacist", pharm.id);
  await user("lab@yemencare.local", "Lab@123", "أ. إبراهيم العبسي", "Ibrahim Al-Abssi", "lab_technician", labTech.id);
  await user("accountant@yemencare.local", "Account@123", "أ. عادل القباطي", "Adel Al-Qabati", "accountant", accountant.id);

  // ------------------------------------------------------------------
  // CURRENCIES / PAYMENT METHODS
  // ------------------------------------------------------------------
  await prisma.currency.createMany({
    data: [
      { code: "YER", symbol: "ر.ي", nameAr: "ريال يمني", nameEn: "Yemeni Rial", rate: 1, isBase: true },
      { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", rate: 1600, isBase: false },
    ],
  });
  await prisma.paymentMethodModel.createMany({
    data: [
      { key: "cash", nameAr: "نقداً", nameEn: "Cash" },
      { key: "bank_transfer", nameAr: "تحويل بنكي", nameEn: "Bank Transfer" },
      { key: "card", nameAr: "بطاقة", nameEn: "Card" },
      { key: "cheque", nameAr: "شيك", nameEn: "Cheque" },
      { key: "mobile_payment", nameAr: "دفع إلكتروني", nameEn: "Mobile Payment" },
      { key: "insurance", nameAr: "تأمين", nameEn: "Insurance" },
    ],
  });

  // ------------------------------------------------------------------
  // SERVICES CATALOG
  // ------------------------------------------------------------------
  const services = [
    ["SVC-CONS-IM", "كشف باطنة", "Internal Medicine Consultation", "CONSULTATION", "OPD", 5000],
    ["SVC-CONS-PED", "كشف أطفال", "Pediatric Consultation", "CONSULTATION", "OPD", 5000],
    ["SVC-CONS-SUR", "كشف جراحة", "Surgery Consultation", "CONSULTATION", "OPD", 8000],
    ["SVC-CONS-GYN", "كشف نساء وولادة", "OB/GYN Consultation", "CONSULTATION", "OPD", 7000],
    ["SVC-ER-CONS", "كشف طوارئ", "Emergency Consultation", "CONSULTATION", "ER", 10000],
    ["SVC-US", "موجات فوق صوتية", "Ultrasound Exam", "RADIOLOGY", "RAD", 25000],
    ["SVC-XRAY", "أشعة سينية", "X-Ray", "RADIOLOGY", "RAD", 15000],
    ["SVC-CT", "أشعة مقطعية", "CT Scan", "RADIOLOGY", "RAD", 80000],
    ["SVC-ECG", "رسم قلب", "ECG", "SERVICE", "CAR", 10000],
    ["SVC-INF", "محاليل وريدية", "IV Infusion", "SERVICE", "ER", 5000],
    ["SVC-ROOM-GEN", "إيواء يوم (جناح)", "Daily Room — General Ward", "ROOM", "WARD", 30000],
    ["SVC-ROOM-ICU", "إيواء يوم (عناية)", "Daily Room — ICU", "ICU", "ICU", 120000],
    ["SVC-ROOM-MTR", "إيواء يوم (ولادة)", "Daily Room — Maternity", "ROOM", "MTR", 35000],
    ["SVC-SUR-APP", "استئصال الزائدة", "Appendectomy", "SURGERY", "SUG", 150000],
    ["SVC-SUR-CS", "عملية قيصرية", "Cesarean Section", "SURGERY", "OBS", 180000],
    ["SVC-SUR-HN", "إصلاح فتق", "Hernia Repair", "SURGERY", "SUG", 120000],
    ["SVC-AMB", "خدمة إسعاف", "Ambulance Service", "AMBULANCE", "ER", 20000],
  ] as const;
  const serviceRows = await prisma.$transaction(
    services.map(([code, ar, en, type, dept, price]) =>
      prisma.service.create({
        data: { code, nameAr: ar, nameEn: en, type: type as never, departmentId: departments[dept]!, price, currency: "YER" },
      })
    )
  );
  const serviceByCode = new Map(serviceRows.map((s) => [s.code, s]));

  // ------------------------------------------------------------------
  // LAB TESTS CATALOG
  // ------------------------------------------------------------------
  const labTests = [
    ["CBC", "صورة دم كاملة", "Complete Blood Count", "HEMATOLOGY", "BLOOD", "×10⁹/L", 8000],
    ["FBS", "سكر صائم", "Fasting Blood Sugar", "BIOCHEMISTRY", "BLOOD", "mg/dL", 4000],
    ["HBAC", "هيموغلوبين سكري", "HbA1c", "BIOCHEMISTRY", "BLOOD", "%", 9000],
    ["LFT", "وظائف الكبد", "Liver Function Test", "BIOCHEMISTRY", "BLOOD", "U/L", 12000],
    ["RFT", "وظائف الكلى", "Renal Function Test", "BIOCHEMISTRY", "BLOOD", "mg/dL", 10000],
    ["LIPID", "دهون الدم", "Lipid Profile", "BIOCHEMISTRY", "BLOOD", "mg/dL", 11000],
    ["TSH", "هرمون الغدة الدرقية", "Thyroid Stimulating Hormone", "HORMONES", "BLOOD", "mIU/L", 15000],
    ["URINE", "تحليل بول", "Urine Analysis", "URINALYSIS", "URINE", "", 5000],
    ["STOOL", "براز", "Stool Examination", "MICROBIOLOGY", "STOOL", "", 6000],
    ["CRP", "بروتين سي التفاعلي", "C-Reactive Protein", "IMMUNOLOGY", "BLOOD", "mg/L", 7000],
    ["ESR", "سرعة التثفل", "Erythrocyte Sedimentation Rate", "HEMATOLOGY", "BLOOD", "mm/h", 4000],
    ["PT-INR", "زمن البروثرومبين", "PT/INR", "COAGULATION", "BLOOD", "INR", 10000],
  ] as const;
  const labTestRows = await prisma.$transaction(
    labTests.map(([code, ar, en, cat, sample, unit, price]) =>
      prisma.labTest.create({
        data: { code, nameAr: ar, nameEn: en, category: cat, sampleType: sample as never, unit, price, currency: "YER" },
      })
    )
  );
  const labTestByCode = new Map(labTestRows.map((t) => [t.code, t]));

  // ------------------------------------------------------------------
  // INVENTORY
  // ------------------------------------------------------------------
  const warehouse = await prisma.warehouse.create({
    data: { code: "WH-MAIN", nameAr: "المخزن الرئيسي", nameEn: "Main Warehouse", branchId: branch.id },
  });

  const medicines = [
    ["MED-PARA", "باراسيتامول 500مغ", "Paracetamol 500mg", "MEDICINE", "Paracetamol", "tab", "500 mg", 150, 500],
    ["MED-IBU", "ايبوبروفين 400مغ", "Ibuprofen 400mg", "MEDICINE", "Ibuprofen", "tab", "400 mg", 280, 400],
    ["MED-AMOX", "أموكسيسيلين 500مغ", "Amoxicillin 500mg", "MEDICINE", "Amoxicillin", "cap", "500 mg", 550, 350],
    ["MED-AZITH", "أزيثروميسين 250مغ", "Azithromycin 250mg", "MEDICINE", "Azithromycin", "tab", "250 mg", 1200, 300],
    ["MED-METFORM", "ميتفورمين 850مغ", "Metformin 850mg", "MEDICINE", "Metformin", "tab", "850 mg", 350, 300],
    ["MED-OMEP", "أوميبرازول 20مغ", "Omeprazole 20mg", "MEDICINE", "Omeprazole", "cap", "20 mg", 420, 400],
    ["MED-LOSART", "لوسارتان 50مغ", "Losartan 50mg", "MEDICINE", "Losartan", "tab", "50 mg", 650, 250],
    ["MED-ATEN", "أتينولول 50مغ", "Atenolol 50mg", "MEDICINE", "Atenolol", "tab", "50 mg", 380, 200],
    ["MED-INSULIN", "أنسولين (مختلط 30/70)", "Insulin Mixed 30/70", "MEDICINE", "Insulin", "vial", "100 IU/mL", 12000, 60],
    ["MED-SALBUT", "سالبوتامول رذاذ", "Salbutamol Inhaler", "MEDICINE", "Salbutamol", "inhaler", "100 mcg/dose", 5500, 80],
    ["MED-DIGOX", "ديجوكسين 0.25مغ", "Digoxin 0.25mg", "MEDICINE", "Digoxin", "tab", "0.25 mg", 700, 100],
    ["MED-DEXA", "ديكساميثازون 4مغ", "Dexamethasone 4mg", "MEDICINE", "Dexamethasone", "tab", "4 mg", 320, 200],
    ["MED-METRO", "مترونيدازول 500مغ", "Metronidazole 500mg", "MEDICINE", "Metronidazole", "tab", "500 mg", 450, 300],
    ["MED-CETI", "سيتريزين 10مغ", "Cetirizine 10mg", "MEDICINE", "Cetirizine", "tab", "10 mg", 280, 250],
    ["MED-VITD", "فيتامين د 50,000 وحدة", "Vitamin D3 50,000 IU", "MEDICINE", "Vitamin D3", "cap", "50000 IU", 800, 150],
    ["MED-FER", "كبريتات الحديد", "Ferrous Sulfate", "MEDICINE", "Iron", "tab", "325 mg", 350, 180],
    ["MED-FUSID", "فوسيديك أسيد كريم", "Fusidic Acid Cream", "MEDICINE", "Fusidic Acid", "tube", "2%", 1800, 90],
    ["MED-NSS", "محلول ملحي 0.9%", "Normal Saline 0.9%", "MEDICAL_SUPPLY", "NaCl", "bag", "500 mL", 1200, 200],
    ["MED-D5", "دكستروز 5%", "Dextrose 5%", "MEDICAL_SUPPLY", "Dextrose", "bag", "500 mL", 1300, 150],
    ["SUP-SYR", "سرنجة 5مل", "Syringe 5mL", "MEDICAL_SUPPLY", "Syringe", "pc", "5 mL", 90, 800],
    ["SUP-GAUZE", "شاش معقم", "Sterile Gauze", "MEDICAL_SUPPLY", "Gauze", "pack", "10x10", 600, 300],
    ["SUP-GLOVE", "قفازات طبية", "Medical Gloves", "MEDICAL_SUPPLY", "Gloves", "box", "100 pc", 3500, 120],
  ] as const;

  const itemRows = await prisma.$transaction(
    medicines.map(([code, ar, en, cat, generic, unit, strength, price, reorder]) =>
      prisma.inventoryItem.create({
        data: {
          code, nameAr: ar, nameEn: en, category: cat as never, genericName: generic,
          unit, strength, price, currency: "YER", reorderLevel: reorder,
        },
      })
    )
  );
  const itemByCode = new Map(itemRows.map((i) => [i.code, i]));

  for (const [code] of medicines) {
    const item = itemByCode.get(code)!;
    await prisma.stockBatch.create({
      data: {
        itemId: item.id, warehouseId: warehouse.id,
        batchNo: `B-${code.slice(-4)}`,
        quantity: 150 + Math.round(Math.random() * 500),
        costPrice: Number(item.price) * 0.7,
        purchasePrice: Number(item.price) * 0.7,
        expiryDate: daysFromNow(210),
      },
    });
  }

  const supplier = await prisma.supplier.create({
    data: {
      code: "SUP-DAL", nameAr: "شركة دلتا للاستيراد الطبي", nameEn: "Delta Medical Imports",
      phone: "771222001", email: "sales@delta-med.local", address: "صنعاء",
    },
  });

  const poResult = await prisma.purchaseOrder.create({
    data: {
      poNo: seq("po", "PO"), supplierId: supplier.id, status: "RECEIVED",
      warehouseId: warehouse.id, orderedAt: daysFromNow(-15), receivedAt: daysFromNow(-12),
      total: 240000, currency: "YER", note: "تزويد الصيدلية والمخزن",
    },
  });
  const poItems = [itemByCode.get("MED-PARA")!, itemByCode.get("MED-AMOX")!, itemByCode.get("SUP-GLOVE")!];
  await prisma.$transaction(
    poItems.map((item) =>
      prisma.purchaseOrderItem.create({
        data: {
          poId: poResult.id, itemId: item.id, warehouseId: warehouse.id,
          quantity: 200, receivedQty: 200, unitPrice: Number(item.price) * 0.7,
          total: 200 * Number(item.price) * 0.7, batchNo: `PO-B${item.code.slice(-4)}`,
        },
      })
    )
  );

  // ------------------------------------------------------------------
  // PATIENTS
  // ------------------------------------------------------------------
  const mkPatient = (
    nameAr: string, nameEn: string, gender: "MALE" | "FEMALE", dob: Date,
    phone: string, blood: string, cityIdx: number = 0, extra: Record<string, unknown> = {}
  ) =>
    prisma.patient.create({
      data: {
        mrn: seq("patient", "PAT"),
        nameAr, nameEn, gender, dateOfBirth: dob, phone,
        governorateId: (cityIdx < 4 ? sanaa : aden)?.id ?? "",
        cityId: (cities[cityIdx % cities.length])?.id ?? "",
        address: "شارع رئيسي",
        bloodGroup: blood as never,
        maritalStatus: gender === "FEMALE" ? "MARRIED" : "SINGLE",
        nationality: "Yemeni",
        branchId: branch.id,
        createdById: adminUser.id,
        ...extra,
      },
    });

  const patients = await prisma.$transaction([
    mkPatient("محمد أحمد الحجري", "Mohammed Ahmed Al-Hajri", "MALE", daysFromNow(-12400, 0), "777100001", "O_POS"),
    mkPatient("فاطمة يحيى المخلافي", "Fatima Yahya Al-Makhlafi", "FEMALE", daysFromNow(-9500, 0), "777100002", "A_POS", 3, { emergencyContactName: "يحيى المخلافي", emergencyContactPhone: "777100003" }),
    mkPatient("عبدالله سعيد العريقي", "Abdullah Saeed Al-Ariqi", "MALE", daysFromNow(-17000, 0), "777100004", "B_POS", 1),
    mkPatient("سلوى حسين الحربي", "Salwa Hussein Al-Harbi", "FEMALE", daysFromNow(-24000, 0), "777100005", "A_NEG", 4, { insurancePolicyNo: "INS-1001" }),
    mkPatient("أحمد ناصر الذبحاني", "Ahmed Nasser Al-Zabbani", "MALE", daysFromNow(-6600, 0), "777100006", "O_NEG"),
    mkPatient("هدى قائد الشرعبي", "Huda Qaid Al-Sharabi", "FEMALE", daysFromNow(-3100, 0), "777100007", "AB_POS", 3),
    mkPatient("يوسف طه العبسي", "Yousef Taha Al-Abssi", "MALE", daysFromNow(-730, 0), "777100008", "O_POS", 5, { insurancePolicyNo: "INS-1002" }),
    mkPatient("ريم فتحي الجبري", "Reem Fathi Al-Jabri", "FEMALE", daysFromNow(-1900, 0), "777100009", "B_NEG"),
    mkPatient("طلال مرشد الغيلي", "Talal Murshid Al-Ghaili", "MALE", daysFromNow(-28000, 0), "777100010", "A_POS", 0),
    mkPatient("آلاء صادق الحمادي", "Alaa Sadeq Al-Hammadi", "FEMALE", daysFromNow(-8200, 0), "777100011", "O_POS", 2),
    mkPatient("سمير منصر القباطي", "Sameer Mansour Al-Qabati", "MALE", daysFromNow(-14000, 0), "777100012", "B_POS", 4, { insurancePolicyNo: "INS-1003" }),
    mkPatient("نجود عبد الرقيب", "Nujud Abdulraquib", "FEMALE", daysFromNow(-4300, 0), "777100013", "O_NEG", 1),
    mkPatient("طارق صالح السنباني", "Tariq Saleh Al-Sanabani", "MALE", daysFromNow(-9900, 0), "777100014", "AB_NEG", 6),
    mkPatient("غادة محمد الشامي", "Ghada Mohammed Al-Shami", "FEMALE", daysFromNow(-2900, 0), "777100015", "AB_POS", 7),
  ]);

  const p0 = patients[0]!, p1 = patients[1]!, p2 = patients[2]!, p3 = patients[3]!,
    p4 = patients[4]!, p5 = patients[5]!, p6 = patients[6]!, p7 = patients[7]!,
    p8 = patients[8]!, p9 = patients[9]!, p10 = patients[10]!, p11 = patients[11]!,
    p12 = patients[12]!, p13 = patients[13]!;

  await prisma.allergy.create({ data: { patientId: p1.id, allergen: "بنسلين", reaction: "طفح جلدي", severity: "MODERATE" } });
  await prisma.allergy.create({ data: { patientId: p1.id, allergen: "سلفا", reaction: "حساسية شديدة", severity: "SEVERE" } });
  await prisma.allergy.create({ data: { patientId: p3.id, allergen: "أيبوبروفين", reaction: "معدة", severity: "MILD" } });

  // ------------------------------------------------------------------
  // APPOINTMENTS
  // ------------------------------------------------------------------
  const mkAppt = (
    patientId: string, doctorId: string, dept: string, when: Date, status: string,
    type: string = "OUTPATIENT", reason?: string, extra: Record<string, unknown> = {}
  ) =>
    prisma.appointment.create({
      data: {
        appointmentNo: seq("appointment", "APT"),
        patientId, doctorId, departmentId: departments[dept]!,
        scheduledAt: when, durationMinutes: 15,
        status: status as never, appointmentType: type as never, reason,
        createdById: adminUser.id,
        ...extra,
      },
    });

  await prisma.$transaction([
    mkAppt(p0.id, drInternal.id, "IM", daysFromNow(0, 9, 30), "WAITING", "OUTPATIENT", "صداع وإرهاق"),
    mkAppt(p2.id, drSurge.id, "SUG", daysFromNow(0, 10, 0), "CONFIRMED", "OUTPATIENT", "ألم بطني مزمن"),
    mkAppt(p4.id, drPeds.id, "PED", daysFromNow(0, 11, 0), "CONFIRMED", "FOLLOW_UP", "متابعة الطفل"),
    mkAppt(p6.id, drObs.id, "OBS", daysFromNow(0, 12, 0), "SCHEDULED", "OUTPATIENT", "متابعة حمل"),
    mkAppt(p8.id, drInternal.id, "IM", daysFromNow(0, 13, 0), "CONFIRMED", "OUTPATIENT", "ارتفاع ضغط"),
    mkAppt(p9.id, drSurge.id, "SUG", daysFromNow(1, 9, 0), "CONFIRMED", "OUTPATIENT", "مراجعة بعد جراحة"),
    mkAppt(p1.id, drPeds.id, "PED", daysFromNow(1, 10, 30), "SCHEDULED", "FOLLOW_UP", "متابعة"),
    mkAppt(p3.id, drInternal.id, "IM", daysFromNow(-3, 10, 0), "COMPLETED", "OUTPATIENT", "سكري"),
    mkAppt(p5.id, drObs.id, "OBS", daysFromNow(-4, 11, 0), "COMPLETED", "OUTPATIENT", "إفرازات"),
    mkAppt(p10.id, drSurge.id, "SUG", daysFromNow(-5, 9, 0), "COMPLETED", "OUTPATIENT", "فتق"),
    mkAppt(p12.id, drInternal.id, "IM", daysFromNow(-1, 9, 0), "NO_SHOW", "OUTPATIENT", "مراجعة"),
    mkAppt(p13.id, drInternal.id, "IM", daysFromNow(-2, 9, 0), "CANCELLED", "OUTPATIENT", "مراجعة إنفلونزا"),
    mkAppt(p11.id, drPeds.id, "PED", daysFromNow(-6, 9, 0), "COMPLETED", "FOLLOW_UP", "ربو"),
  ]);

  // ------------------------------------------------------------------
  // ENCOUNTERS + CLINICAL RECORDS
  // ------------------------------------------------------------------
  const mkEncounter = async (
    patientId: string, doctorId: string, dept: string, type: string,
    status: string, complaint: string, hpi: string, started?: Date,
    dxNameAr?: string, dxNameEn?: string, dxCode?: string
  ) => {
    const enc = await prisma.encounter.create({
      data: {
        encounterNo: seq("encounter", "ENC"),
        patientId, doctorId, departmentId: departments[dept]!, encounterType: type as never,
        status: status as never, chiefComplaint: complaint, hpi, startedAt: started ?? daysFromNow(0, 9),
        completedAt: status === "COMPLETED" ? daysFromNow(0, 9, 30) : null,
        createdById: adminUser.id,
      },
    });
    if (dxNameAr) {
      await prisma.diagnosis.create({
        data: {
          patientId, encounterId: enc.id, code: dxCode ?? undefined,
          nameAr: dxNameAr, nameEn: dxNameEn, dxType: "PRIMARY", isPrimary: true,
        },
      });
    }
    return enc;
  };

  const ecToday = await mkEncounter(p0.id, drInternal.id, "IM", "OUTPATIENT", "IN_PROGRESS", "صداع وإرهاق مع دوخة", "يشكو من صداع متكرر منذ أسبوع", daysFromNow(0, 9, 35), "توتر صداع", "Tension Headache", "G44.2");
  const ec2 = await mkEncounter(p2.id, drSurge.id, "SUG", "OUTPATIENT", "COMPLETED", "ألم في الربع السفلي الأيمن", "ألم متقطع يزداد مع الحركة", daysFromNow(-3, 10, 10), "التهاب زائدة مشتبه", "Suspected Appendicitis", "K35.8");
  const ec3 = await mkEncounter(p3.id, drInternal.id, "IM", "OUTPATIENT", "COMPLETED", "ارتفاع سكر الدم", "مريضة سكري لا تتقيد بالحمية", daysFromNow(-3, 10, 40), "سكري نوع 2", "Type 2 Diabetes", "E11.9");
  const ec4 = await mkEncounter(p5.id, drObs.id, "OBS", "OUTPATIENT", "COMPLETED", "إفرازات مهبلية", "", daysFromNow(-4, 11, 15), "التهاب مهبلي فطري", "Vaginal Candidiasis", "B37.3");
  const ec5 = await mkEncounter(p10.id, drSurge.id, "SUG", "OUTPATIENT", "COMPLETED", "كتلة في الفخذ الأيمن", "فتق ظهر بعد مجهود", daysFromNow(-5, 9, 20), "فتق إربي", "Inguinal Hernia", "K40.9");
  const ec6 = await mkEncounter(p11.id, drPeds.id, "PED", "FOLLOW_UP", "COMPLETED", "متابعة ربو", "ضيق تنفس ليلي", daysFromNow(-6, 9, 25), "ربو", "Asthma", "J45.9");

  // Vitals
  await prisma.vitalSign.create({
    data: { patientId: p0.id, encounterId: ecToday.id, recordedById: nurse1.id, temperature: 37.4, pulse: 84, respiratoryRate: 18, systolic: 138, diastolic: 90, o2sat: 97, weight: 78, height: 172 },
  });
  await prisma.vitalSign.create({
    data: { patientId: p3.id, encounterId: ec3.id, recordedById: nurse1.id, temperature: 36.9, pulse: 76, respiratoryRate: 16, systolic: 150, diastolic: 95, o2sat: 98, weight: 82, bloodGlucose: 212 },
  });

  // Prescriptions
  const rx1 = await prisma.prescription.create({
    data: {
      prescriptionNo: seq("prescription", "RX"),
      patientId: p0.id, encounterId: ecToday.id, doctorId: drInternal.id,
      status: "ACTIVE", instructions: "صرف مرة واحدة",
      items: {
        create: [
          { itemId: itemByCode.get("MED-PARA")!.id, medicineNameAr: "باراسيتامول 500مغ", medicineNameEn: "Paracetamol 500mg", dosage: "500 مغ", route: "فموي", frequency: "3 مرات يومياً", duration: "5 أيام", quantity: 15, unit: "قرص", isDispensed: true, dispensedQty: 15 },
          { itemId: itemByCode.get("MED-OMEP")!.id, medicineNameAr: "أوميبرازول 20مغ", medicineNameEn: "Omeprazole 20mg", dosage: "20 مغ", route: "فموي", frequency: "مرة صباحاً", duration: "14 يوم", quantity: 14, unit: "كبسولة" },
        ],
      },
    },
  });

  const rx2 = await prisma.prescription.create({
    data: {
      prescriptionNo: seq("prescription", "RX"),
      patientId: p3.id, encounterId: ec3.id, doctorId: drInternal.id,
      status: "ACTIVE", instructions: "",
      items: {
        create: [
          { itemId: itemByCode.get("MED-METFORM")!.id, medicineNameAr: "ميتفورمين 850مغ", medicineNameEn: "Metformin 850mg", dosage: "850 مغ", route: "فموي", frequency: "مرتين يومياً", duration: "30 يوم", quantity: 60, unit: "قرص", isDispensed: true, dispensedQty: 60 },
        ],
      },
    },
  });

  // ------------------------------------------------------------------
  // LAB ORDERS
  // ------------------------------------------------------------------
  const lab1 = await prisma.labOrder.create({
    data: {
      orderNo: seq("lab", "LAB"),
      patientId: p3.id, encounterId: ec3.id, doctorId: drInternal.id,
      status: "COMPLETED", priority: "ROUTINE", clinicalNote: "تقييم السيطرة على السكري",
    },
  });
  const labItem1 = await prisma.labOrderItem.create({
    data: { labOrderId: lab1.id, testId: labTestByCode.get("CBC")!.id, status: "COMPLETED", specimenNo: "SP-101" },
  });
  const labItem2 = await prisma.labOrderItem.create({
    data: { labOrderId: lab1.id, testId: labTestByCode.get("HBAC")!.id, status: "COMPLETED", specimenNo: "SP-102" },
  });
  const labItem3 = await prisma.labOrderItem.create({
    data: { labOrderId: lab1.id, testId: labTestByCode.get("FBS")!.id, status: "COMPLETED", specimenNo: "SP-103" },
  });
  await prisma.$transaction([
    prisma.labResult.create({ data: { labOrderItemId: labItem1.id, value: "13.2", unit: "g/dL", refLow: "13", refHigh: "17" } }),
    prisma.labResult.create({ data: { labOrderItemId: labItem1.id, value: "7800", unit: "×10³/µL", refLow: "4000", refHigh: "11000" } }),
    prisma.labResult.create({ data: { labOrderItemId: labItem1.id, value: "4.9", unit: "×10⁶/µL", refLow: "4.5", refHigh: "5.5" } }),
    prisma.labResult.create({ data: { labOrderItemId: labItem2.id, value: "8.4", unit: "%", refLow: "4", refHigh: "5.7", isAbnormal: true } }),
    prisma.labResult.create({ data: { labOrderItemId: labItem3.id, value: "186", unit: "mg/dL", refLow: "70", refHigh: "100", isAbnormal: true } }),
  ]);

  const lab2 = await prisma.labOrder.create({
    data: {
      orderNo: seq("lab", "LAB"), patientId: p0.id, encounterId: ecToday.id,
      doctorId: drInternal.id, status: "RECEIVED", priority: "ROUTINE", clinicalNote: "تعب عام",
    },
  });
  await prisma.labOrderItem.create({ data: { labOrderId: lab2.id, testId: labTestByCode.get("CBC")!.id, status: "RECEIVED", specimenNo: "SP-201" } });
  await prisma.labOrderItem.create({ data: { labOrderId: lab2.id, testId: labTestByCode.get("TSH")!.id, status: "RECEIVED", specimenNo: "SP-202" } });

  const lab3 = await prisma.labOrder.create({
    data: {
      orderNo: seq("lab", "LAB"), patientId: p11.id, encounterId: ec6.id,
      doctorId: drPeds.id, status: "COMPLETED", priority: "URGENT",
    },
  });
  const labItem4 = await prisma.labOrderItem.create({ data: { labOrderId: lab3.id, testId: labTestByCode.get("CRP")!.id, status: "COMPLETED" } });
  await prisma.labResult.create({ data: { labOrderItemId: labItem4.id, value: "24", unit: "mg/L", refLow: "0", refHigh: "5", isAbnormal: true } });

  // ------------------------------------------------------------------
  // RADIOLOGY ORDERS
  // ------------------------------------------------------------------
  const rad1 = await prisma.radiologyOrder.create({
    data: {
      orderNo: seq("rad", "RAD"), patientId: p2.id, encounterId: ec2.id,
      doctorId: drSurge.id, status: "REPORTED", modality: "ULTRASOUND",
      bodyPart: "البطن", clinicalNote: "اشتباه التهاب زائدة",
    },
  });
  await prisma.radReport.create({
    data: {
      radiologyOrderId: rad1.id,
      findings: "سمك جدار الزائدة الدودية مع سائل حولها",
      impression: "احتمال التهاب زائدة حاد",
      reportedById: drRad.id,
    },
  });
  const rad2 = await prisma.radiologyOrder.create({
    data: {
      orderNo: seq("rad", "RAD"), patientId: p8.id, doctorId: drInternal.id,
      status: "ORDERED", modality: "CT", bodyPart: "الصدر", clinicalNote: "سعال مستمر",
    },
  });

  // ------------------------------------------------------------------
  // ADMISSIONS
  // ------------------------------------------------------------------
  const adm1 = await prisma.admission.create({
    data: {
      admissionNo: seq("admission", "ADM"),
      patientId: p2.id, departmentId: departments["SUG"]!, attendingDoctorId: drSurge.id,
      status: "ADMITTED", admissionType: "EMERGENCY",
      provisionalDiagnosis: "التهاب زائدة حاد مشتبه", admittedAt: daysFromNow(-1, 14),
      carePlan: "مضادات حيوية + مراقبة",
    },
  });
  const adm2 = await prisma.admission.create({
    data: {
      admissionNo: seq("admission", "ADM"),
      patientId: p6.id, departmentId: departments["MTR"]!, attendingDoctorId: drObs.id,
      status: "ADMITTED", admissionType: "PLANNED", isIcu: false,
      provisionalDiagnosis: "حمل مكتمل", admittedAt: daysFromNow(-1, 8),
    },
  });
  const adm3 = await prisma.admission.create({
    data: {
      admissionNo: seq("admission", "ADM"),
      patientId: p12.id, departmentId: departments["ICU"]!, attendingDoctorId: drInternal.id,
      status: "ADMITTED", admissionType: "EMERGENCY", isIcu: true,
      provisionalDiagnosis: "احتشاء قلبي", admittedAt: daysFromNow(0, 3),
      carePlan: "مراقبة دقيقة + أكسجين",
    },
  });
  const adm4 = await prisma.admission.create({
    data: {
      admissionNo: seq("admission", "ADM"),
      patientId: p9.id, departmentId: departments["SUG"]!, attendingDoctorId: drSurge.id,
      status: "DISCHARGED", admissionType: "PLANNED",
      provisionalDiagnosis: "استئصال زائدة", admittedAt: daysFromNow(-5, 13),
      dischargedAt: daysFromNow(-2, 11), dischargeType: "RECOVERED",
      dischargeSummary: "شفاء تام دون مضاعفات",
    },
  });

  await prisma.nursingNote.create({
    data: { admissionId: adm1.id, category: "ROUND", note: "حالة مستقرة، ألم خفيف بعد المسكن", authorId: nurse2.id },
  });
  await prisma.nursingNote.create({
    data: { admissionId: adm3.id, category: "ROUND", note: "مريض حرج، مراقبة دقيقة، ضغط 90/60", authorId: headNurse.id },
  });

  // ------------------------------------------------------------------
  // SURGERY
  // ------------------------------------------------------------------
  await prisma.surgery.create({
    data: {
      surgeryNo: seq("surgery", "SRG"),
      patientId: p9.id, admissionId: adm4.id,
      operatingRoomId: ot1.id, surgeonId: drSurge.id, anesthesiologistId: drAnes.id,
      procedureNameAr: "استئصال الزائدة الدودية", procedureNameEn: "Appendectomy",
      status: "COMPLETED", scheduledAt: daysFromNow(-4, 10), startedAt: daysFromNow(-4, 10, 15),
      endedAt: daysFromNow(-4, 10, 55), preOpChecklist: "اكتمل الفحص قبل الجراحة",
      surgicalNotes: "جراحة نظيفة، لا مضاعفات",
    },
  });
  await prisma.surgery.create({
    data: {
      surgeryNo: seq("surgery", "SRG"),
      patientId: p6.id, admissionId: adm2.id,
      operatingRoomId: ot2.id, surgeonId: drObs.id, anesthesiologistId: drAnes.id,
      procedureNameAr: "عملية قيصرية", procedureNameEn: "Cesarean Section",
      status: "SCHEDULED", scheduledAt: daysFromNow(1, 9),
    },
  });

  // ------------------------------------------------------------------
  // INVOICES + PAYMENTS
  // ------------------------------------------------------------------
  const mkInvoice = async (
    patientId: string, items: { code: string; qty: number }[], status: string,
    paidAt: Date, paidAmount?: number, discountType?: string, discountValue?: number,
    cashierId?: string
  ) => {
    const rows = items.map((it) => {
      const service = serviceByCode.get(it.code)!;
      const unitPrice = Number(service.price);
      return {
        service, unitPrice, qty: it.qty, total: unitPrice * it.qty, type: service.type as never,
      };
    });
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    let discountAmount = 0;
    if (discountType === "percentage") discountAmount = (subtotal * (discountValue ?? 0)) / 100;
    else if (discountType === "fixed") discountAmount = Math.min(subtotal, discountValue ?? 0);
    const total = subtotal - discountAmount;
    const pay = status === "PAID" ? (paidAmount ?? total) : status === "PARTIALLY_PAID" ? (paidAmount ?? 0) : 0;
    const due = Math.max(0, total - pay);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: seq("invoice", "INV"),
        patientId, branchId: branch.id, status: status as never, subtotal,
        discountType: discountType ?? undefined, discountValue: discountValue ?? undefined,
        discountAmount, total, paidAmount: pay, dueAmount: due, currency: "YER",
        issuedAt: paidAt,
        cashierId: cashierId ?? undefined,
      },
    });
    await prisma.invoiceItem.createMany({
      data: rows.map((r) => ({
        invoiceId: invoice.id, type: r.type, serviceId: r.service.id,
        description: r.service.nameEn, quantity: r.qty, unitPrice: r.unitPrice, total: r.total,
      })),
    });
    if (pay > 0) {
      await prisma.payment.create({
        data: {
          paymentNo: seq("payment", "PAY"), invoiceId: invoice.id, patientId,
          amount: pay, method: "CASH", currency: "YER", status: "COMPLETED",
          cashierId: cashierId ?? undefined, paidAt,
        },
      });
    }
    return invoice;
  };

  // Paid history (feeds revenue trend)
  await mkInvoice(p3.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-ROOM-ICU", qty: 2 }], "PAID", daysFromNow(-13, 14), undefined, undefined, undefined, cashier.id);
  await mkInvoice(p5.id, [{ code: "SVC-CONS-GYN", qty: 1 }, { code: "SVC-US", qty: 1 }], "PAID", daysFromNow(-12, 12));
  await mkInvoice(p10.id, [{ code: "SVC-CONS-SUR", qty: 1 }, { code: "SVC-SUR-HN", qty: 1 }], "PARTIALLY_PAID", daysFromNow(-11, 15), 80000);
  await mkInvoice(p2.id, [{ code: "SVC-CONS-SUR", qty: 1 }, { code: "SVC-US", qty: 1 }, { code: "SVC-CT", qty: 1 }], "PAID", daysFromNow(-10, 13));
  await mkInvoice(p11.id, [{ code: "SVC-CONS-PED", qty: 1 }, { code: "SVC-ER-CONS", qty: 1 }], "PAID", daysFromNow(-9, 11));
  await mkInvoice(p0.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-INF", qty: 1 }], "PAID", daysFromNow(-8, 10));
  await mkInvoice(p8.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-ECG", qty: 1 }], "ISSUED", daysFromNow(-7, 16));
  await mkInvoice(p12.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-ROOM-ICU", qty: 1 }], "PARTIALLY_PAID", daysFromNow(-6, 12), 50000);
  await mkInvoice(p9.id, [{ code: "SVC-CONS-SUR", qty: 1 }, { code: "SVC-SUR-APP", qty: 1 }, { code: "SVC-ROOM-GEN", qty: 2 }], "PAID", daysFromNow(-5, 13));
  await mkInvoice(p13.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-XRAY", qty: 1 }], "PAID", daysFromNow(-4, 12));
  await mkInvoice(p6.id, [{ code: "SVC-CONS-GYN", qty: 1 }, { code: "SVC-US", qty: 1 }], "PAID", daysFromNow(-3, 11));
  await mkInvoice(p1.id, [{ code: "SVC-CONS-PED", qty: 1 }], "PAID", daysFromNow(-2, 10));
  await mkInvoice(p7.id, [{ code: "SVC-ER-CONS", qty: 1 }, { code: "SVC-XRAY", qty: 1 }], "PAID", daysFromNow(-1, 17));
  await mkInvoice(p2.id, [{ code: "SVC-ER-CONS", qty: 1 }, { code: "SVC-CT", qty: 1 }, { code: "SVC-ROOM-GEN", qty: 1 }], "PARTIALLY_PAID", daysFromNow(0, 10), 40000);
  await mkInvoice(p3.id, [{ code: "SVC-CONS-IM", qty: 1 }], "PAID", daysFromNow(0, 11), 5000);
  await mkInvoice(p0.id, [{ code: "SVC-CONS-IM", qty: 1 }, { code: "SVC-INF", qty: 1 }], "ISSUED", daysFromNow(0, 12));

  // ------------------------------------------------------------------
  // INSURANCE
  // ------------------------------------------------------------------
  const insCo = await prisma.insuranceCompany.create({
    data: { code: "INS-SAB", nameAr: "شركة سبأ للتأمين الصحي", nameEn: "Saba Health Insurance", phone: "771333001" },
  });
  const insScheme = await prisma.insuranceScheme.create({
    data: { companyId: insCo.id, nameAr: "البرنامج الذهبي", nameEn: "Golden Plan", coverageRate: 80, annualLimit: 2000000 },
  });
  await prisma.patient.updateMany({
    where: { id: { in: [p3.id, p6.id, p10.id] } },
    data: { insuranceCompanyId: insCo.id, insurancePolicyNo: "INS-1001", insuranceSchemeId: insScheme.id },
  });

  const claimInvoice = await mkInvoice(p10.id, [{ code: "SVC-CONS-SUR", qty: 1 }, { code: "SVC-SUR-HN", qty: 1 }], "ISSUED", daysFromNow(-1, 14), 0);
  await prisma.insuranceClaim.create({
    data: {
      claimNo: seq("claim", "CLM"), invoiceId: claimInvoice.id, patientId: p10.id,
      companyId: insCo.id, policyNo: "INS-1001", amount: 120000, status: "SUBMITTED",
    },
  });

  // ------------------------------------------------------------------
  // QUEUE TICKETS
  // ------------------------------------------------------------------
  await prisma.queueTicket.create({
    data: {
      ticketNo: seq("ticket", "Q"),
      patientId: p0.id, departmentId: departments["IM"]!, status: "IN_SERVICE", counter: "1",
      issuedById: reception.id, calledAt: daysFromNow(0, 9, 31), servedAt: daysFromNow(0, 9, 35),
    },
  });
  await prisma.queueTicket.create({
    data: {
      ticketNo: seq("ticket", "Q"),
      patientId: p2.id, departmentId: departments["SUG"]!, status: "WAITING",
      issuedById: reception.id,
    },
  });

  // ------------------------------------------------------------------
  // ACCOUNTING
  // ------------------------------------------------------------------
  const accounts = [
    ["1010", "نقدية الصندوق", "Cash on Hand", "ASSET"],
    ["1020", "البنوك", "Bank Accounts", "ASSET"],
    ["1100", "مستحقات المرضى", "Accounts Receivable", "ASSET"],
    ["1200", "الأصول الثابتة", "Fixed Assets", "ASSET"],
    ["2010", "ذمم للموردين", "Accounts Payable", "LIABILITY"],
    ["3010", "رأس المال", "Capital", "EQUITY"],
    ["4001", "إيرادات الكشوفات", "Consultation Revenue", "REVENUE"],
    ["4002", "إيرادات المختبر", "Laboratory Revenue", "REVENUE"],
    ["4003", "إيرادات الأشعة", "Radiology Revenue", "REVENUE"],
    ["4004", "إيرادات الصيدلية", "Pharmacy Revenue", "REVENUE"],
    ["4005", "إيرادات الإيواء", "Room & Stay Revenue", "REVENUE"],
    ["4006", "إيرادات العمليات", "Surgery Revenue", "REVENUE"],
    ["4007", "إيرادات الطوارئ", "Emergency Revenue", "REVENUE"],
    ["4008", "إيرادات أخرى", "Other Revenue", "REVENUE"],
    ["5001", "الرواتب والأجور", "Salaries & Wages", "EXPENSE"],
    ["5002", "المشتريات الطبية", "Medical Supplies", "EXPENSE"],
    ["5003", "الإيجارات", "Rent", "EXPENSE"],
    ["5004", "الكهرباء والمياه", "Utilities", "EXPENSE"],
  ] as const;
  for (const [code, ar, en, type] of accounts) {
    await prisma.account.create({ data: { code, nameAr: ar, nameEn: en, type: type as never } });
  }

  const expCat = await prisma.expenseCategory.create({
    data: { nameAr: "مصاريف تشغيلية", nameEn: "Operating Expenses" },
  });
  await prisma.expense.create({
    data: {
      expenseNo: seq("expense", "EXP"), categoryId: expCat.id, amount: 150000,
      currency: "YER", method: "BANK_TRANSFER", paidAt: daysFromNow(-6, 10),
      paidById: accountant.id, supplierId: supplier.id, note: "فحص مولد كهرباء",
    },
  });

  // ------------------------------------------------------------------
  // HR / PAYROLL
  // ------------------------------------------------------------------
  const shifts = [
    ["morning", "صباحي", "Morning", "08:00", "16:00"],
    ["evening", "مسائي", "Evening", "16:00", "00:00"],
    ["night", "ليلي", "Night", "00:00", "08:00"],
  ] as const;
  let shiftIds: Record<string, string> = {};
  for (const [key, ar, en, start, end] of shifts) {
    const s = await prisma.shift.create({ data: { nameAr: ar, nameEn: en, startTime: start, endTime: end } });
    shiftIds[key] = s.id;
  }
  await prisma.employeeShift.create({
    data: { employeeId: nurse1.id, shiftId: shiftIds["morning"]!, date: daysFromNow(0) },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: nurse2.id, leaveType: "ANNUAL", startDate: daysFromNow(5), endDate: daysFromNow(9), days: 5,
      reason: "إجازة سنوية", status: "PENDING",
    },
  });

  const period = await prisma.payrollPeriod.create({
    data: {
      nameAr: "يونيو 2026", nameEn: "June 2026",
      startDate: new Date(YEAR, 5, 1), endDate: new Date(YEAR, 5, 30), status: "APPROVED",
    },
  });
  const run = await prisma.payrollRun.create({ data: { periodId: period.id, status: "APPROVED" } });
  const payEmp = [drInternal, drPeds, drSurge, drObs, drAnes, drRad, headNurse, nurse1, nurse2, pharm, labTech, radTech, reception, accountant, cashier, hr, adminEmp, driver1, extraDoctor];
  await prisma.$transaction(
    payEmp.map((e) =>
      prisma.payrollLine.create({
        data: {
          payrollRunId: run.id, employeeId: e.id,
          baseSalary: Number(e.baseSalary ?? 0), allowances: 20000, deductions: 0,
          overtime: 0, bonuses: 15000, advances: 0, loans: 0,
          net: Number(e.baseSalary ?? 0) + 35000, currency: "YER",
        },
      })
    )
  );

  // ------------------------------------------------------------------
  // AMBULANCE + BLOOD BANK
  // ------------------------------------------------------------------
  const ambulance = await prisma.ambulance.create({
    data: { code: "AMB-01", plateNo: "YM-12345", model: "Toyota Hiace 2022", capacity: 4 },
  });
  await prisma.ambulanceTrip.create({
    data: {
      tripNo: seq("trip", "TRP"), ambulanceId: ambulance.id, driverId: driver1.id,
      patientId: p12.id, patientName: p12.nameEn, pickupLocation: "منطقة حدة",
      destination: "المستشفى", status: "COMPLETED", priority: "EMERGENCY",
      dispatchedAt: daysFromNow(-1, 2), completedAt: daysFromNow(-1, 2, 25),
    },
  });

  const donor = await prisma.bloodDonor.create({
    data: { nameAr: "حسن محمد العنسي", nameEn: "Hassan Mohammed Al-Ansi", gender: "MALE", phone: "777444001", bloodGroup: "O_POS" },
  });
  const donation = await prisma.bloodDonation.create({
    data: { donorId: donor.id, donationDate: daysFromNow(-8, 10), units: 2, hemoglobin: 13.8 },
  });
  await prisma.bloodUnit.createMany({
    data: [
      { unitNo: seq("blood", "BU"), donationId: donation.id, bloodGroup: "O_POS", volume: 450, status: "AVAILABLE", location: "بنك الدم — ثلاجة 1", tested: true, expiryDate: daysFromNow(30) },
      { unitNo: seq("blood", "BU"), donationId: donation.id, bloodGroup: "O_POS", volume: 450, status: "AVAILABLE", location: "بنك الدم — ثلاجة 1", tested: true, expiryDate: daysFromNow(30) },
    ],
  });

  // ------------------------------------------------------------------
  // ASSETS + MAINTENANCE
  // ------------------------------------------------------------------
  const asset = await prisma.asset.create({
    data: {
      assetNo: seq("asset", "AST"), nameAr: "جهاز أشعة سينية رقمي", nameEn: "Digital X-Ray Machine",
      category: "MEDICAL_EQUIPMENT", location: "مبنى التشخيص", departmentId: departments["RAD"]!,
      custodianId: radTech.id, purchaseDate: daysFromNow(-600), cost: 85000000,
      warrantyUntil: daysFromNow(-235), status: "ACTIVE", serialNo: "XR-2023-001",
    },
  });
  await prisma.asset.create({
    data: {
      assetNo: seq("asset", "AST"), nameAr: "جهاز مفراس CT", nameEn: "CT Scanner",
      category: "MEDICAL_EQUIPMENT", location: "مبنى التشخيص", departmentId: departments["RAD"]!,
      purchaseDate: daysFromNow(-400), cost: 250000000, warrantyUntil: daysFromNow(600), status: "ACTIVE", serialNo: "CT-2024-001",
    },
  });
  await prisma.maintenanceRequest.create({
    data: {
      requestNo: seq("maintenance", "MNT"), assetId: asset.id, type: "CORRECTIVE",
      status: "IN_PROGRESS", description: "الجهاز يحتاج معايرة سنوية", technicianId: radTech.id,
      scheduledAt: daysFromNow(-1), cost: 120000, spareParts: "أنبوب أشعة سينية",
    },
  });

  // ------------------------------------------------------------------
  // SETTINGS + NOTIFICATIONS
  // ------------------------------------------------------------------
  const settings = [
    ["hospital_name_ar", "مستشفى اليمن الحديث", "GENERAL"],
    ["hospital_name_en", "Yemen Modern Hospital", "GENERAL"],
    ["hospital_phone", "+967 1 555 888", "GENERAL"],
    ["hospital_email", "info@yemencare.local", "GENERAL"],
    ["hospital_address", "شارع الستين، صنعاء — الجمهورية اليمنية", "GENERAL"],
    ["hospital_governorate", "صنعاء", "GENERAL"],
    ["currency_primary", "YER", "FINANCE"],
    ["currency_secondary", "USD", "FINANCE"],
    ["hl7_host", "", "INTEGRATION"],
    ["sms_provider", "none", "INTEGRATION"],
    ["whatsapp_provider", "none", "INTEGRATION"],
    ["email_provider", "none", "INTEGRATION"],
  ] as const;
  await prisma.systemSetting.createMany({ data: settings.map(([key, value, category]) => ({ key, value, category, type: "string" })) });
  await prisma.numberingSeq.createMany({
    data: Object.keys(counters).map((type) => ({
      branchId: branch.id, type, prefix: "", year: YEAR, seq: counters[type] ?? 0,
    })),
  });

  await prisma.notification.create({
    data: {
      userId: adminUser.id, title: "أهلاً بك في YemenCare HMS", body: "تم تجهيز بيانات تجريبية كاملة للمستشفى.",
      type: "SUCCESS", link: "/dashboard",
    },
  });
  await prisma.notification.create({
    data: {
      userId: adminUser.id, title: "مهام صيانة قادمة", body: "جهاز الأشعة السينية بحاجة لمعايرة بعد غد.",
      type: "WARNING", link: "/maintenance",
    },
  });

  console.log(`✅ Seed complete — ${patients.length} patients · ${bedCount} beds · ${payEmp.length} payroll lines · ${permissionByKey.size} permissions · ${Object.keys(roles).length} roles`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
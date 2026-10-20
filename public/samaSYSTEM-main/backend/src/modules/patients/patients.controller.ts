import { Request, Response, NextFunction } from 'express';
import * as patientService from './patients.service.js';
import { notify } from '../../shared/notify.js';
import { t } from '../../shared/translate.js';
import ExcelJS from 'exceljs';

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await patientService.getStats();
    res.json(data);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const patients = await patientService.listPatients();
    res.json(patients);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const patient = await patientService.getPatient(id);
    res.json(patient);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const patient = await patientService.createPatient(req.body);
    notify('notification.patient_added', { name: req.body.fullName });
    res.status(201).json({ message: 'Patient saved successfully!', patient });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const patient = await patientService.updatePatient(id, req.body);
    res.json({ message: 'Patient updated successfully!', patient });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await patientService.deletePatient(id);
    res.json({ message: 'Patient deleted successfully!' });
  } catch (err) { next(err); }
}

export async function getFile(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const lang = (req.query.lang as string) || 'en';
    const patient = await patientService.getPatientFile(id);
    const { t } = await import('../../shared/translate.js');
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const examType = t(`patients.add.form.examType.${patient.examType}`, lang) || patient.examType;
    const gender = t(`patients.add.form.gender.${patient.gender}`, lang) || patient.gender;
    res.render('patient-file', { ...patient, examType, gender, lang, dir, t: (key: string) => t(key, lang) });
  } catch (err) { next(err); }
}

function paidInstallments(installments: string | null): number {
  if (!installments) return 0;
  try {
    const d = JSON.parse(installments);
    const payments = Array.isArray(d) ? d : d?.payments || [];
    return payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  } catch { return 0; }
}

export async function exportExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = (req.query.lang as string) || 'ar';
    const patients = await patientService.listPatients();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SAMA Center';
    const sheet = workbook.addWorksheet(t('patients.report.sheetName', lang), {
      views: [{ rightToLeft: lang === 'ar' }],
    });

    sheet.columns = [
      { header: t('patients.report.serial', lang), key: 'serial', width: 10 },
      { header: t('patients.report.examType', lang), key: 'examType', width: 18 },
      { header: t('patients.report.name', lang), key: 'name', width: 26 },
      { header: t('patients.report.manualId', lang), key: 'manualId', width: 14 },
      { header: t('patients.report.age', lang), key: 'age', width: 8 },
      { header: t('patients.report.gender', lang), key: 'gender', width: 10 },
      { header: t('patients.report.phone', lang), key: 'phone', width: 18 },
      { header: t('patients.report.date', lang), key: 'date', width: 14 },
      { header: t('patients.report.paymentMethod', lang), key: 'paymentMethod', width: 14 },
      { header: t('patients.report.walletType', lang), key: 'walletType', width: 24 },
      { header: t('patients.report.transactionNumber', lang), key: 'transactionNumber', width: 16 },
      { header: t('patients.report.price', lang), key: 'price', width: 12 },
      { header: t('patients.report.paid', lang), key: 'paid', width: 12 },
      { header: t('patients.report.remaining', lang), key: 'remaining', width: 12 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E5679' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    patients.forEach(p => {
      const age = p.dateOfBirth ? (new Date().getFullYear() - p.dateOfBirth.getFullYear()).toString() : '';
      const date = p.registrationDate ? p.registrationDate.toISOString().slice(0, 10) : '';
      const paid = paidInstallments(p.installments);
      const remaining = (p.price || 0) - paid;
      sheet.addRow({
        serial: p.serialNumber,
        examType: t(`patients.add.form.examType.${p.examType}`, lang) || p.examType || '',
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—',
        manualId: p.manualId || '',
        age,
        gender: t(`patients.add.form.gender.${p.gender}`, lang) || p.gender || '',
        phone: p.phone || '',
        date,
        paymentMethod: p.paymentMethod || '',
        walletType: p.walletType || '',
        transactionNumber: p.transactionNumber || '',
        price: p.price ?? 0,
        paid,
        remaining,
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { vertical: 'middle' };
      if (rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="patients-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

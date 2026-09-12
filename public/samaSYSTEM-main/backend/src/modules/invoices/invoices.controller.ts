import { Request, Response, NextFunction } from 'express';
import * as invoicesService from './invoices.service.js';
import { notify } from '../../shared/notify.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await invoicesService.listInvoices();
    res.json(invoices);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.getInvoice(req.params.id as string);
    res.json(invoice);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.createInvoice(req.body);
    notify('notification.invoice_created', { type: req.body.type, amount: req.body.amount });
    res.status(201).json({ message: 'تم إضافة الفاتورة بنجاح', invoice });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.updateInvoice(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الفاتورة بنجاح', invoice });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await invoicesService.deleteInvoice(req.params.id as string);
    res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (err) { next(err); }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = (req.query.lang as string) || 'en';
    const month = req.query.month as string | undefined;
    const invoices = await invoicesService.listInvoicesByMonth(month);
    const { t } = await import('../../shared/translate.js');
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = lang === 'ar' ? arabicDays : englishDays;

    const formatDate = (d: string) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const rows = invoices.map(inv => {
      const parts = inv.date.split('-');
      const dayIndex = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay() : -1;
      return {
        date: inv.date,
        dateFormatted: formatDate(inv.date),
        day: dayIndex >= 0 ? days[dayIndex] : '-',
        amount: inv.amount,
        type: inv.type === 'water' ? 'water' : 'electricity',
        notes: inv.notes || '',
      };
    });

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    res.render('invoices-report', {
      rows,
      total,
      count: rows.length,
      month: month || '',
      generatedDate,
      lang,
      dir,
      t: (key: string) => t(key, lang),
    });
  } catch (err) { next(err); }
}

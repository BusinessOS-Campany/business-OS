import { Request, Response, NextFunction } from 'express';
import * as advancesService from './advances.service.js';
import { notify } from '../../shared/notify.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeName = req.query.employee as string | undefined;
    const advances = await advancesService.listAdvances(employeeName);
    res.json(advances);
  } catch (err) { next(err); }
}

export async function listByEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const month = req.query.month as string | undefined;
    const result = await advancesService.listAdvancesByEmployee(req.params.id as string, month);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const advance = await advancesService.getAdvance(req.params.id as string);
    res.json(advance);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const advance = await advancesService.createAdvance(req.body);
    notify('notification.advance_created', { employee: req.body.employee, amount: req.body.amount });
    res.status(201).json({ message: 'تم إضافة السلفة بنجاح', advance });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const advance = await advancesService.updateAdvance(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث السلفة بنجاح', advance });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await advancesService.deleteAdvance(req.params.id as string);
    res.json({ message: 'تم حذف السلفة بنجاح' });
  } catch (err) { next(err); }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = (req.query.lang as string) || 'en';
    const month = req.query.month as string | undefined;
    const result = await advancesService.listAdvancesByEmployee(req.params.id as string, month);
    const { t } = await import('../../shared/translate.js');
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const totalAdvances = result.advances.reduce((sum, a) => sum + a.amount, 0);
    const remaining = (result.employee.salary ?? 0) - totalAdvances;
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    res.render('advances-report', {
      employeeName: result.employee.name,
      salary: result.employee.salary ?? 0,
      totalAdvances,
      remaining,
      month: month || '',
      advances: result.advances,
      generatedDate,
      lang,
      dir,
      t: (key: string) => t(key, lang),
    });
  } catch (err) { next(err); }
}

import { Request, Response, NextFunction } from 'express';
import * as expenseService from './expenses.service.js';
import { notify } from '../../shared/notify.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const expenses = await expenseService.listExpenses();
    res.json(expenses);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await expenseService.getExpense(req.params.id as string);
    res.json(e);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await expenseService.createExpense(req.body);
    notify('notification.expense_created', { category: req.body.category, amount: req.body.amount });
    res.status(201).json({ message: 'تم حفظ المصروف بنجاح', expense: e });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await expenseService.updateExpense(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث المصروف بنجاح', expense: e });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await expenseService.deleteExpense(req.params.id as string);
    res.json({ message: 'تم حذف المصروف بنجاح' });
  } catch (err) { next(err); }
}

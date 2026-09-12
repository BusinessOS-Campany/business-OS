import { Request, Response, NextFunction } from 'express';
import * as employeeService from './employees.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const department = req.query.department as string | undefined;
    const all = req.query.all === 'true';
    const employees = await employeeService.listEmployees(department, all);
    res.json(employees);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await employeeService.getEmployee(req.params.id as string);
    res.json(e);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await employeeService.createEmployee(req.body);
    res.status(201).json({ message: 'تم إضافة الموظف بنجاح', employee: e });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const e = await employeeService.updateEmployee(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الموظف بنجاح', employee: e });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await employeeService.deleteEmployee(req.params.id as string);
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) { next(err); }
}

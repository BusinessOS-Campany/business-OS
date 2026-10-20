import { Request, Response, NextFunction } from 'express';
import * as appointmentService from './appointments.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const appointments = await appointmentService.listAppointments();
    res.json(appointments);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const a = await appointmentService.getAppointment(req.params.id as string);
    res.json(a);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const a = await appointmentService.createAppointment(req.body);
    res.status(201).json({ message: 'Appointment created successfully', appointment: a });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const a = await appointmentService.updateAppointment(req.params.id as string, req.body);
    res.json({ message: 'Appointment updated successfully', appointment: a });
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const a = await appointmentService.updateAppointmentStatus(req.params.id as string, req.body.status);
    res.json({ message: 'Status updated successfully', appointment: a });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await appointmentService.deleteAppointment(req.params.id as string);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) { next(err); }
}

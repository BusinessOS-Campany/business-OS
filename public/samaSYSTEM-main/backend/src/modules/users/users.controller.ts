import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service.js';

const getParamId = (req: Request) => req.params.id as string;

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(getParamId(req));
    res.json(user);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(getParamId(req), req.body);
    res.json({ message: 'User updated successfully', user });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.deleteUser(getParamId(req));
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
}

export async function toggleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.toggleStatus(getParamId(req), req.body.isActive);
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, user });
  } catch (err) { next(err); }
}

export async function updatePermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updatePermissions(getParamId(req), req.body.permissions);
    res.json({ message: 'Permissions updated successfully', user });
  } catch (err) { next(err); }
}

import { Request, Response, NextFunction } from 'express';
import * as blogService from './blog.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await blogService.listBlogPosts();
    res.json(posts);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await blogService.getBlogPost(req.params.id as string);
    res.json(p);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await blogService.createBlogPost(req.body);
    res.status(201).json({ message: 'تم إضافة المقال بنجاح', post: p });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await blogService.updateBlogPost(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث المقال بنجاح', post: p });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await blogService.deleteBlogPost(req.params.id as string);
    res.json({ message: 'تم حذف المقال بنجاح' });
  } catch (err) { next(err); }
}

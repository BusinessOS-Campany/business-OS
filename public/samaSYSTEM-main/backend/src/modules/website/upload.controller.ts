import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { uploadFile as supabaseUpload, ensureBucket } from '../../shared/supabase.js';

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const filename = `${uuid()}.${ext}`;
    await ensureBucket('website-images');
    const url = await supabaseUpload('website-images', filename, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (err) { next(err); }
}

import { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service.js';
import { uploadFile as supabaseUpload } from '../../shared/supabase.js';
import { v4 as uuid } from 'uuid';

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const archived = req.query.archived === 'true' ? true : req.query.archived === 'false' ? false : undefined;
    const conversations = await chatService.listConversations(req.user!.userId, archived);
    res.json(conversations);
  } catch (err) { next(err); }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.archiveConversation(req.params.id as string, req.user!.userId);
    res.json({ message: 'Conversation archived' });
  } catch (err) { next(err); }
}

export async function unarchive(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.unarchiveConversation(req.params.id as string, req.user!.userId);
    res.json({ message: 'Conversation unarchived' });
  } catch (err) { next(err); }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const messages = await chatService.getConversationMessages(req.params.id as string, req.user!.userId);
    res.json(messages);
  } catch (err) { next(err); }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await chatService.sendMessage(req.user!.userId, req.body);
    res.status(201).json(message);
  } catch (err) { next(err); }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conv = await chatService.createConversation(req.user!.userId, req.body.participantIds);
    res.status(201).json(conv);
  } catch (err) { next(err); }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await chatService.getUsers(req.user!.userId);
    res.json(users);
  } catch (err) { next(err); }
}

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const ext = req.file.originalname.split('.').pop();
    const filename = `${uuid()}.${ext}`;
    const publicUrl = await supabaseUpload('chat-attachments', filename, req.file.buffer, req.file.mimetype);
    res.json({
      filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: publicUrl,
    });
  } catch (err) { next(err); }
}

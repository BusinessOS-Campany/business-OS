import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { upload } from '../../middleware/upload.js';
import { sendMessageSchema, createConversationSchema } from './chat.schema.js';
import * as controller from './chat.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('chat'));

router.get('/conversations', controller.listConversations);
router.patch('/conversations/:id/archive', controller.archive);
router.patch('/conversations/:id/unarchive', controller.unarchive);
router.get('/users', controller.getUsers);
router.get('/conversations/:id/messages', controller.getMessages);
router.post('/conversations', validate(createConversationSchema), controller.createConversation);
router.post('/messages', validate(sendMessageSchema), controller.sendMessage);
router.post('/upload', upload.single('file'), controller.uploadFile);

export default router;

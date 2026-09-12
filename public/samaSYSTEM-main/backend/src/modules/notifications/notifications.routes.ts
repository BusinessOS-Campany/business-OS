import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import * as controller from './notifications.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('notifications'));

router.get('/', controller.list);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', controller.markRead);

export default router;

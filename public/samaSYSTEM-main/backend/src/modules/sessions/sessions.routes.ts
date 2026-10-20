import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createSessionSchema, updateSessionSchema } from './sessions.schema.js';
import * as controller from './sessions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', requirePermission('sessions'), validate(createSessionSchema), controller.create);
router.put('/:id', requirePermission('sessions'), validate(updateSessionSchema), controller.update);
router.put('/:id/status', requirePermission('sessions'), controller.updateStatus);
router.delete('/:id', requirePermission('sessions'), controller.remove);

export default router;

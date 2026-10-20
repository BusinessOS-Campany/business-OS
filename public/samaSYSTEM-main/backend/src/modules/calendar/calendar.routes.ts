import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createEventSchema, updateEventSchema } from './calendar.schema.js';
import * as controller from './calendar.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('calendar'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createEventSchema), controller.create);
router.put('/:id', validate(updateEventSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

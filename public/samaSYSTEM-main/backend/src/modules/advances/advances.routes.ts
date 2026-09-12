import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createAdvanceSchema, updateAdvanceSchema } from './advances.schema.js';
import * as controller from './advances.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('advances'));

router.get('/', controller.list);
router.get('/report/:id', controller.getReport);
router.get('/by-employee/:id', controller.listByEmployee);
router.get('/:id', controller.getById);
router.post('/', validate(createAdvanceSchema), controller.create);
router.put('/:id', validate(updateAdvanceSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from './employees.schema.js';
import * as controller from './employees.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', requirePermission('employees'), validate(createEmployeeSchema), controller.create);
router.put('/:id', requirePermission('employees'), validate(updateEmployeeSchema), controller.update);
router.delete('/:id', requirePermission('employees'), controller.remove);

export default router;

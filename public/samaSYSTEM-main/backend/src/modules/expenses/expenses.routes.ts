import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from './expenses.schema.js';
import * as controller from './expenses.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('expenses'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createExpenseSchema), controller.create);
router.put('/:id', validate(updateExpenseSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

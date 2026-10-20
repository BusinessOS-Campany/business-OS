import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema } from './invoices.schema.js';
import * as controller from './invoices.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('invoices'));

router.get('/', controller.list);
router.get('/report', controller.getReport);
router.get('/:id', controller.getById);
router.post('/', validate(createInvoiceSchema), controller.create);
router.put('/:id', validate(updateInvoiceSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

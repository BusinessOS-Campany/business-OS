import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createPatientSchema, updatePatientSchema } from './patients.schema.js';
import * as controller from './patients.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('patients'));

router.get('/', controller.list);
router.get('/export', controller.exportExcel);
router.get('/stats', controller.stats);
router.get('/:id', controller.getById);
router.get('/:id/file', controller.getFile);
router.post('/', validate(createPatientSchema), controller.create);
router.put('/:id', validate(updatePatientSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

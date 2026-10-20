import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createAppointmentSchema, updateAppointmentSchema, updateAppointmentStatusSchema } from './appointments.schema.js';
import * as controller from './appointments.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('appointments'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createAppointmentSchema), controller.create);
router.put('/:id/status', validate(updateAppointmentStatusSchema), controller.updateStatus);
router.put('/:id', validate(updateAppointmentSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

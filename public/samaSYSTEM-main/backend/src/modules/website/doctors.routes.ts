import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createDoctorSchema, updateDoctorSchema } from './doctors.schema.js';
import * as controller from './doctors.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createDoctorSchema), controller.create);
router.put('/:id', validate(updateDoctorSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

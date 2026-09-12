import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createInsuranceCompanySchema, updateInsuranceCompanySchema } from './insurance-companies.schema.js';
import * as controller from './insurance-companies.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createInsuranceCompanySchema), controller.create);
router.put('/:id', validate(updateInsuranceCompanySchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

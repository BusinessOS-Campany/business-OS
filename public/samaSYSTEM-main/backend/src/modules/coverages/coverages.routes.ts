import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createCoverageSchema, updateCoverageSchema } from './coverages.schema.js';
import * as controller from './coverages.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('coverages'));

router.get('/', controller.list);
router.get('/report/:id', controller.getReport);
router.post('/', validate(createCoverageSchema), controller.create);
router.put('/:id', validate(updateCoverageSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

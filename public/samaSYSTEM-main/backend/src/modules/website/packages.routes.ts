import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createPackageSchema, updatePackageSchema } from './packages.schema.js';
import * as controller from './packages.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createPackageSchema), controller.create);
router.put('/:id', validate(updatePackageSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

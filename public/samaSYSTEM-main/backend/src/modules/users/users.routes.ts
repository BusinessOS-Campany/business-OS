import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema, statusSchema, permissionsSchema } from './users.schema.js';
import * as controller from './users.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('users'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createUserSchema), controller.create);
router.put('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/status', validate(statusSchema), controller.toggleStatus);
router.put('/:id/permissions', validate(permissionsSchema), controller.updatePermissions);

export default router;

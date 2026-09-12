import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { upload } from '../../middleware/upload.js';
import { createServiceSchema, updateServiceSchema } from './services.schema.js';
import * as controller from './services.controller.js';
import * as uploadController from './upload.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/upload', requirePermission('services'), upload.single('file'), uploadController.uploadIcon);
router.post('/', requirePermission('services'), validate(createServiceSchema), controller.create);
router.put('/:id', requirePermission('services'), validate(updateServiceSchema), controller.update);
router.delete('/:id', requirePermission('services'), controller.remove);

export default router;

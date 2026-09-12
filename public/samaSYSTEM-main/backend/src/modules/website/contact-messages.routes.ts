import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { updateContactMessageSchema } from './contact-messages.schema.js';
import * as controller from './contact-messages.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validate(updateContactMessageSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

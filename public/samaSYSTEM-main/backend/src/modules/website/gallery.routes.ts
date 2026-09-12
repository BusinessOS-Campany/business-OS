import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createGalleryImageSchema, updateGalleryImageSchema } from './gallery.schema.js';
import * as controller from './gallery.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createGalleryImageSchema), controller.create);
router.put('/:id', validate(updateGalleryImageSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

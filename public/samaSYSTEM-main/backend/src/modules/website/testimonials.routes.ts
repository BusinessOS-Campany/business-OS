import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createTestimonialSchema, updateTestimonialSchema } from './testimonials.schema.js';
import * as controller from './testimonials.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createTestimonialSchema), controller.create);
router.put('/:id', validate(updateTestimonialSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

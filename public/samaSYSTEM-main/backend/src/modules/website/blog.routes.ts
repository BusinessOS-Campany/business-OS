import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { createBlogPostSchema, updateBlogPostSchema } from './blog.schema.js';
import * as controller from './blog.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createBlogPostSchema), controller.create);
router.put('/:id', validate(updateBlogPostSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

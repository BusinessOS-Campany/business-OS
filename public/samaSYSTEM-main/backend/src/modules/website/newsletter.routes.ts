import { Router } from 'express';
import * as controller from './newsletter.controller.js';

const router = Router();

router.get('/', controller.list);
router.delete('/:id', controller.remove);

export default router;

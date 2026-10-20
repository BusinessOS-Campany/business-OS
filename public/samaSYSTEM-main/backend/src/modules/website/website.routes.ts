import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { upload } from '../../middleware/upload.js';
import packagesRoutes from './packages.routes.js';
import testimonialsRoutes from './testimonials.routes.js';
import doctorsRoutes from './doctors.routes.js';
import blogRoutes from './blog.routes.js';
import contactMessagesRoutes from './contact-messages.routes.js';
import newsletterRoutes from './newsletter.routes.js';
import insuranceCompaniesRoutes from './insurance-companies.routes.js';
import galleryRoutes from './gallery.routes.js';
import * as uploadController from './upload.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('website'));

router.post('/upload', upload.single('file'), uploadController.uploadImage);

router.use('/packages', packagesRoutes);
router.use('/testimonials', testimonialsRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/blog', blogRoutes);
router.use('/contact-messages', contactMessagesRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/insurance-companies', insuranceCompaniesRoutes);
router.use('/gallery', galleryRoutes);

export default router;

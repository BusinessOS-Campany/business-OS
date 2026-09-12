import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/stats', controller.stats);
router.get('/daily-summary', controller.dailySummary);
router.get('/weekly-summary', controller.weeklySummary);
router.get('/monthly-summary', controller.monthlySummary);
router.get('/receivables-summary', requirePermission('receivables'), controller.receivablesSummary);
router.get('/receivables-table', requirePermission('receivables'), controller.receivablesTable);
router.get('/receivables-report', requirePermission('receivables'), controller.receivablesReport);
router.get('/receivables-excel', requirePermission('receivables'), controller.receivablesExcel);
router.get('/financial-summary', requirePermission('financial-summary'), controller.financialSummary);
router.get('/financial-summary-report', requirePermission('financial-summary'), controller.financialSummaryReport);
router.get('/financial-summary-excel', requirePermission('financial-summary'), controller.financialSummaryExcel);
router.get('/daily-report', requirePermission('reports'), controller.dailyReport);
router.get('/weekly-report', requirePermission('reports'), controller.weeklyReport);
router.get('/monthly-report', requirePermission('reports'), controller.monthlyReport);

export default router;

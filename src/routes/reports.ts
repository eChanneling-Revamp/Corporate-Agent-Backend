import { Router, Request, Response } from 'express';
import { reportService } from '../services/reportService';
import { authenticateToken, requireVerified, requirePermissions } from '../middleware/auth';
import { validateReportGeneration } from '../middleware/validation';
import { apiRateLimit } from '../middleware/security';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting and authentication to all report routes
router.use(apiRateLimit);
router.use(authenticateToken);
router.use(requireVerified);

/**
 * @route GET /api/v1/reports/appointments
 * @desc Generate appointment report
 * @access Private (with view_reports permission)
 */
router.get('/appointments', requirePermissions(['view_reports']), validateReportGeneration, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const filters = {
      startDate: new Date(req.query.startDate as string),
      endDate: new Date(req.query.endDate as string),
      agentId: agentId, // Agents can only see their own data
      doctorId: req.query.doctorId as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string
    };
    
    const result = await reportService.generateAppointmentReport(filters);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Appointment report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating appointment report',
      error: 'APPOINTMENT_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/revenue
 * @desc Generate revenue report
 * @access Private (with view_reports permission)
 */
router.get('/revenue', requirePermissions(['view_reports']), validateReportGeneration, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const filters = {
      startDate: new Date(req.query.startDate as string),
      endDate: new Date(req.query.endDate as string),
      agentId: agentId // Agents can only see their own revenue data
    };
    
    const result = await reportService.generateRevenueReport(filters);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Revenue report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating revenue report',
      error: 'REVENUE_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/agents
 * @desc Generate agent performance report
 * @access Private (with admin_access permission)
 */
router.get('/agents', requirePermissions(['admin_access']), validateReportGeneration, async (req: Request, res: Response) => {
  try {
    const filters = {
      startDate: new Date(req.query.startDate as string),
      endDate: new Date(req.query.endDate as string),
      agentId: req.query.agentId as string
    };
    
    const result = await reportService.generateAgentReport(filters);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Agent report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating agent report',
      error: 'AGENT_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/doctors
 * @desc Generate doctor report
 * @access Private (with view_reports permission)
 */
router.get('/doctors', requirePermissions(['view_reports']), async (req: Request, res: Response) => {
  try {
    const result = await reportService.generateDoctorReport();
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Doctor report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating doctor report',
      error: 'DOCTOR_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/dashboard
 * @desc Generate dashboard statistics
 * @access Private (with view_reports permission)
 */
router.get('/dashboard', requirePermissions(['view_reports']), async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const hasAdminAccess = (req as any).agent.permissions.includes('admin_access');
    
    // If admin, can view all data, otherwise only their own
    const agentIdFilter = hasAdminAccess ? undefined : agentId;
    
    const result = await reportService.generateDashboardStats(agentIdFilter);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Dashboard statistics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating dashboard statistics',
      error: 'DASHBOARD_STATS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/export/appointments
 * @desc Export appointment report as CSV
 * @access Private (with view_reports permission)
 */
router.get('/export/appointments', requirePermissions(['view_reports']), validateReportGeneration, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const filters = {
      startDate: new Date(req.query.startDate as string),
      endDate: new Date(req.query.endDate as string),
      agentId: agentId,
      doctorId: req.query.doctorId as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string
    };
    
    const result = await reportService.generateAppointmentReport(filters);
    
    if (!result.success || !result.data) {
      return res.status(400).json(result);
    }
    
    // Convert to CSV format
    const csvData = convertAppointmentReportToCSV(result.data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="appointment-report-${Date.now()}.csv"`);
    res.status(200).send(csvData);
    
  } catch (error: any) {
    logger.error('Export appointment report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while exporting appointment report',
      error: 'EXPORT_APPOINTMENT_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/export/revenue
 * @desc Export revenue report as CSV
 * @access Private (with view_reports permission)
 */
router.get('/export/revenue', requirePermissions(['view_reports']), validateReportGeneration, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const filters = {
      startDate: new Date(req.query.startDate as string),
      endDate: new Date(req.query.endDate as string),
      agentId: agentId
    };
    
    const result = await reportService.generateRevenueReport(filters);
    
    if (!result.success || !result.data) {
      return res.status(400).json(result);
    }
    
    // Convert to CSV format
    const csvData = convertRevenueReportToCSV(result.data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${Date.now()}.csv"`);
    res.status(200).send(csvData);
    
  } catch (error: any) {
    logger.error('Export revenue report route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while exporting revenue report',
      error: 'EXPORT_REVENUE_REPORT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/reports/summary
 * @desc Get quick summary statistics
 * @access Private (with view_reports permission)
 */
router.get('/summary', requirePermissions(['view_reports']), async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const hasAdminAccess = (req as any).agent.permissions.includes('admin_access');
    
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);
    
    const filters = {
      startDate: thisMonth,
      endDate: today,
      agentId: hasAdminAccess ? undefined : agentId
    };
    
    const [monthlyReport, yearlyFilters] = await Promise.all([
      reportService.generateDashboardStats(filters.agentId),
      { ...filters, startDate: thisYear }
    ]);
    
    const yearlyReport = await reportService.generateDashboardStats(yearlyFilters.agentId);
    
    res.status(200).json({
      success: true,
      message: 'Summary statistics retrieved successfully',
      data: {
        monthly: monthlyReport.data,
        yearly: yearlyReport.data,
        period: {
          monthStart: thisMonth,
          yearStart: thisYear,
          current: today
        }
      }
    });
    
  } catch (error: any) {
    logger.error('Summary statistics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving summary statistics',
      error: 'SUMMARY_STATS_ERROR'
    });
  }
});

/**
 * Helper function to convert appointment report to CSV
 */
function convertAppointmentReportToCSV(data: any): string {
  const headers = [
    'Total Appointments',
    'Confirmed Appointments', 
    'Cancelled Appointments',
    'Completed Appointments',
    'Pending Appointments',
    'ACB Appointments'
  ];
  
  const values = [
    data.totalAppointments,
    data.confirmedAppointments,
    data.cancelledAppointments,
    data.completedAppointments,
    data.pendingAppointments,
    data.acbAppointments
  ];
  
  let csv = headers.join(',') + '\n';
  csv += values.join(',') + '\n\n';
  
  // Add appointments by date
  if (data.appointmentsByDate && data.appointmentsByDate.length > 0) {
    csv += 'Date,Count\n';
    data.appointmentsByDate.forEach((item: any) => {
      csv += `${item.date},${item.count}\n`;
    });
  }
  
  return csv;
}

/**
 * Helper function to convert revenue report to CSV
 */
function convertRevenueReportToCSV(data: any): string {
  const headers = [
    'Total Revenue',
    'Total Commission',
    'Net Revenue',
    'Paid Amount',
    'Pending Amount',
    'Refunded Amount'
  ];
  
  const values = [
    data.totalRevenue,
    data.totalCommission,
    data.netRevenue,
    data.paidAmount,
    data.pendingAmount,
    data.refundedAmount
  ];
  
  let csv = headers.join(',') + '\n';
  csv += values.join(',') + '\n\n';
  
  // Add revenue by date
  if (data.revenueByDate && data.revenueByDate.length > 0) {
    csv += 'Date,Revenue,Commission\n';
    data.revenueByDate.forEach((item: any) => {
      csv += `${item.date},${item.revenue},${item.commission}\n`;
    });
  }
  
  return csv;
}

export default router;
import { Agent } from '../models/Agent';
import { Appointment } from '../models/Appointment';
import { Doctor } from '../models/Doctor';
import { logger } from '../utils/logger';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  agentId?: string;
  doctorId?: string;
  status?: string;
  paymentStatus?: string;
}

export interface AppointmentReport {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  acbAppointments: number;
  appointmentsByDate: Array<{
    date: string;
    count: number;
  }>;
  appointmentsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  topDoctors: Array<{
    doctorId: string;
    doctorName: string;
    appointmentCount: number;
    totalRevenue: number;
  }>;
}

export interface RevenueReport {
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  revenueByDate: Array<{
    date: string;
    revenue: number;
    commission: number;
  }>;
  revenueByPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  topRevenueGenerators: Array<{
    agentId: string;
    companyName: string;
    revenue: number;
    commission: number;
  }>;
}

export interface AgentReport {
  totalAgents: number;
  activeAgents: number;
  newAgentsThisPeriod: number;
  topPerformingAgents: Array<{
    agentId: string;
    companyName: string;
    appointmentCount: number;
    revenue: number;
    commissionEarned: number;
  }>;
  agentsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  agentRegistrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

export interface DoctorReport {
  totalDoctors: number;
  activeDoctors: number;
  specializationDistribution: Array<{
    specialization: string;
    count: number;
    percentage: number;
  }>;
  cityDistribution: Array<{
    city: string;
    count: number;
    percentage: number;
  }>;
  averageConsultationFee: number;
  topRatedDoctors: Array<{
    doctorId: string;
    name: string;
    specialization: string;
    rating: number;
    appointmentCount: number;
  }>;
}

class ReportService {
  private static instance: ReportService;

  private constructor() {}

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  /**
   * Generate comprehensive appointment report
   */
  public async generateAppointmentReport(filters: ReportFilters): Promise<{ success: boolean; message: string; data?: AppointmentReport; error?: string }> {
    try {
      const matchFilter: any = {
        createdAt: {
          $gte: filters.startDate,
          $lte: filters.endDate
        }
      };

      if (filters.agentId) matchFilter.agentId = filters.agentId;
      if (filters.doctorId) matchFilter['doctorDetails.doctorId'] = filters.doctorId;
      if (filters.status) matchFilter.status = filters.status;
      if (filters.paymentStatus) matchFilter['paymentDetails.paymentStatus'] = filters.paymentStatus;

      const appointmentStats = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalAppointments: { $sum: 1 },
            confirmedAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            cancelledAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            completedAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            acbAppointments: {
              $sum: { $cond: ['$isACB', 1, 0] }
            }
          }
        }
      ]);

      // Appointments by date
      const appointmentsByDate = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDetails.date' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Appointments by status
      const appointmentsByStatus = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Calculate percentages for status
      const totalForStatus = appointmentsByStatus.reduce((sum, item) => sum + item.count, 0);
      const statusWithPercentage = appointmentsByStatus.map(item => ({
        ...item,
        percentage: totalForStatus > 0 ? (item.count / totalForStatus) * 100 : 0
      }));

      // Top doctors by appointment count
      const topDoctors = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              doctorId: '$doctorDetails.doctorId',
              doctorName: '$doctorDetails.name'
            },
            appointmentCount: { $sum: 1 },
            totalRevenue: { $sum: '$paymentDetails.amount' }
          }
        },
        { $sort: { appointmentCount: -1 } },
        { $limit: 10 },
        {
          $project: {
            doctorId: '$_id.doctorId',
            doctorName: '$_id.doctorName',
            appointmentCount: 1,
            totalRevenue: 1,
            _id: 0
          }
        }
      ]);

      const stats = appointmentStats.length > 0 ? appointmentStats[0] : {
        totalAppointments: 0,
        confirmedAppointments: 0,
        cancelledAppointments: 0,
        completedAppointments: 0,
        pendingAppointments: 0,
        acbAppointments: 0
      };

      const reportData: AppointmentReport = {
        ...stats,
        appointmentsByDate,
        appointmentsByStatus: statusWithPercentage,
        topDoctors
      };

      delete (reportData as any)._id;

      return {
        success: true,
        message: 'Appointment report generated successfully',
        data: reportData
      };

    } catch (error: any) {
      logger.error('Generate appointment report error:', error);
      return {
        success: false,
        message: 'Failed to generate appointment report',
        error: 'APPOINTMENT_REPORT_FAILED'
      };
    }
  }

  /**
   * Generate revenue report
   */
  public async generateRevenueReport(filters: ReportFilters): Promise<{ success: boolean; message: string; data?: RevenueReport; error?: string }> {
    try {
      const matchFilter: any = {
        createdAt: {
          $gte: filters.startDate,
          $lte: filters.endDate
        }
      };

      if (filters.agentId) matchFilter.agentId = filters.agentId;

      const revenueStats = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$paymentDetails.amount' },
            totalCommission: { $sum: '$paymentDetails.commission' },
            netRevenue: { $sum: '$paymentDetails.netAmount' },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$paymentDetails.paymentStatus', 'paid'] }, '$paymentDetails.amount', 0]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$paymentDetails.paymentStatus', 'pending'] }, '$paymentDetails.amount', 0]
              }
            },
            refundedAmount: {
              $sum: {
                $cond: [{ $eq: ['$paymentDetails.paymentStatus', 'refunded'] }, '$paymentDetails.amount', 0]
              }
            }
          }
        }
      ]);

      // Revenue by date
      const revenueByDate = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$paymentDetails.amount' },
            commission: { $sum: '$paymentDetails.commission' }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            commission: 1,
            _id: 0
          }
        }
      ]);

      // Revenue by payment method
      const revenueByPaymentMethod = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$paymentDetails.paymentMethod',
            amount: { $sum: '$paymentDetails.amount' }
          }
        },
        {
          $project: {
            method: '$_id',
            amount: 1,
            _id: 0
          }
        }
      ]);

      // Calculate percentages for payment methods
      const totalRevenueForMethods = revenueByPaymentMethod.reduce((sum, item) => sum + item.amount, 0);
      const methodsWithPercentage = revenueByPaymentMethod.map(item => ({
        ...item,
        percentage: totalRevenueForMethods > 0 ? (item.amount / totalRevenueForMethods) * 100 : 0
      }));

      // Top revenue generators (agents)
      const topRevenueGenerators = await Appointment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$agentId',
            revenue: { $sum: '$paymentDetails.amount' },
            commission: { $sum: '$paymentDetails.commission' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'agents',
            localField: '_id',
            foreignField: 'agentId',
            as: 'agentInfo'
          }
        },
        {
          $project: {
            agentId: '$_id',
            revenue: 1,
            commission: 1,
            companyName: { $arrayElemAt: ['$agentInfo.companyName', 0] },
            _id: 0
          }
        }
      ]);

      const stats = revenueStats.length > 0 ? revenueStats[0] : {
        totalRevenue: 0,
        totalCommission: 0,
        netRevenue: 0,
        paidAmount: 0,
        pendingAmount: 0,
        refundedAmount: 0
      };

      const reportData: RevenueReport = {
        ...stats,
        revenueByDate,
        revenueByPaymentMethod: methodsWithPercentage,
        topRevenueGenerators
      };

      delete (reportData as any)._id;

      return {
        success: true,
        message: 'Revenue report generated successfully',
        data: reportData
      };

    } catch (error: any) {
      logger.error('Generate revenue report error:', error);
      return {
        success: false,
        message: 'Failed to generate revenue report',
        error: 'REVENUE_REPORT_FAILED'
      };
    }
  }

  /**
   * Generate agent performance report
   */
  public async generateAgentReport(filters: ReportFilters): Promise<{ success: boolean; message: string; data?: AgentReport; error?: string }> {
    try {
      const agentMatchFilter: any = {};
      
      if (filters.agentId) {
        agentMatchFilter.agentId = filters.agentId;
      }

      // Agent statistics
      const agentStats = await Agent.aggregate([
        { $match: agentMatchFilter },
        {
          $group: {
            _id: null,
            totalAgents: { $sum: 1 },
            activeAgents: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            newAgentsThisPeriod: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', filters.startDate] },
                      { $lte: ['$createdAt', filters.endDate] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Agent registration trend
      const agentRegistrationTrend = await Agent.aggregate([
        {
          $match: {
            createdAt: {
              $gte: filters.startDate,
              $lte: filters.endDate
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Agents by status
      const agentsByStatus = await Agent.aggregate([
        { $match: agentMatchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Calculate percentages for status
      const totalAgentsForStatus = agentsByStatus.reduce((sum, item) => sum + item.count, 0);
      const statusWithPercentage = agentsByStatus.map(item => ({
        ...item,
        percentage: totalAgentsForStatus > 0 ? (item.count / totalAgentsForStatus) * 100 : 0
      }));

      // Top performing agents
      const topPerformingAgents = await Appointment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: filters.startDate,
              $lte: filters.endDate
            },
            ...(filters.agentId && { agentId: filters.agentId })
          }
        },
        {
          $group: {
            _id: '$agentId',
            appointmentCount: { $sum: 1 },
            revenue: { $sum: '$paymentDetails.amount' },
            commissionEarned: { $sum: '$paymentDetails.commission' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'agents',
            localField: '_id',
            foreignField: 'agentId',
            as: 'agentInfo'
          }
        },
        {
          $project: {
            agentId: '$_id',
            appointmentCount: 1,
            revenue: 1,
            commissionEarned: 1,
            companyName: { $arrayElemAt: ['$agentInfo.companyName', 0] },
            _id: 0
          }
        }
      ]);

      const stats = agentStats.length > 0 ? agentStats[0] : {
        totalAgents: 0,
        activeAgents: 0,
        newAgentsThisPeriod: 0
      };

      const reportData: AgentReport = {
        ...stats,
        topPerformingAgents,
        agentsByStatus: statusWithPercentage,
        agentRegistrationTrend
      };

      delete (reportData as any)._id;

      return {
        success: true,
        message: 'Agent report generated successfully',
        data: reportData
      };

    } catch (error: any) {
      logger.error('Generate agent report error:', error);
      return {
        success: false,
        message: 'Failed to generate agent report',
        error: 'AGENT_REPORT_FAILED'
      };
    }
  }

  /**
   * Generate doctor report
   */
  public async generateDoctorReport(): Promise<{ success: boolean; message: string; data?: DoctorReport; error?: string }> {
    try {
      // Doctor statistics
      const doctorStats = await Doctor.aggregate([
        {
          $group: {
            _id: null,
            totalDoctors: { $sum: 1 },
            activeDoctors: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            averageConsultationFee: { $avg: '$consultationFee' }
          }
        }
      ]);

      // Specialization distribution
      const specializationDistribution = await Doctor.aggregate([
        {
          $group: {
            _id: '$specialization',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            specialization: '$_id',
            count: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } }
      ]);

      // City distribution
      const cityDistribution = await Doctor.aggregate([
        {
          $group: {
            _id: '$hospital.city',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            city: '$_id',
            count: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Calculate percentages
      const totalForSpecialization = specializationDistribution.reduce((sum, item) => sum + item.count, 0);
      const specializationWithPercentage = specializationDistribution.map(item => ({
        ...item,
        percentage: totalForSpecialization > 0 ? (item.count / totalForSpecialization) * 100 : 0
      }));

      const totalForCity = cityDistribution.reduce((sum, item) => sum + item.count, 0);
      const cityWithPercentage = cityDistribution.map(item => ({
        ...item,
        percentage: totalForCity > 0 ? (item.count / totalForCity) * 100 : 0
      }));

      // Top rated doctors with appointment count
      const topRatedDoctors = await Doctor.aggregate([
        { $match: { 'rating.average': { $gt: 0 } } },
        {
          $lookup: {
            from: 'appointments',
            localField: 'doctorId',
            foreignField: 'doctorDetails.doctorId',
            as: 'appointments'
          }
        },
        {
          $project: {
            doctorId: 1,
            name: 1,
            specialization: 1,
            rating: '$rating.average',
            appointmentCount: { $size: '$appointments' }
          }
        },
        { $sort: { rating: -1, appointmentCount: -1 } },
        { $limit: 10 }
      ]);

      const stats = doctorStats.length > 0 ? doctorStats[0] : {
        totalDoctors: 0,
        activeDoctors: 0,
        averageConsultationFee: 0
      };

      const reportData: DoctorReport = {
        ...stats,
        specializationDistribution: specializationWithPercentage,
        cityDistribution: cityWithPercentage,
        topRatedDoctors
      };

      delete (reportData as any)._id;

      return {
        success: true,
        message: 'Doctor report generated successfully',
        data: reportData
      };

    } catch (error: any) {
      logger.error('Generate doctor report error:', error);
      return {
        success: false,
        message: 'Failed to generate doctor report',
        error: 'DOCTOR_REPORT_FAILED'
      };
    }
  }

  /**
   * Generate comprehensive dashboard statistics
   */
  public async generateDashboardStats(agentId?: string): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const filters: ReportFilters = {
        startDate: startOfMonth,
        endDate: endOfMonth,
        agentId
      };

      // Get basic statistics
      const [appointmentReport, revenueReport, agentReport] = await Promise.all([
        this.generateAppointmentReport(filters),
        this.generateRevenueReport(filters),
        this.generateAgentReport(filters)
      ]);

      if (!appointmentReport.success || !revenueReport.success || !agentReport.success) {
        throw new Error('Failed to generate one or more reports');
      }

      const dashboardData = {
        appointments: {
          total: appointmentReport.data?.totalAppointments || 0,
          confirmed: appointmentReport.data?.confirmedAppointments || 0,
          pending: appointmentReport.data?.pendingAppointments || 0,
          cancelled: appointmentReport.data?.cancelledAppointments || 0
        },
        revenue: {
          total: revenueReport.data?.totalRevenue || 0,
          commission: revenueReport.data?.totalCommission || 0,
          pending: revenueReport.data?.pendingAmount || 0
        },
        agents: {
          total: agentReport.data?.totalAgents || 0,
          active: agentReport.data?.activeAgents || 0,
          new: agentReport.data?.newAgentsThisPeriod || 0
        },
        trends: {
          appointmentsByDate: appointmentReport.data?.appointmentsByDate || [],
          revenueByDate: revenueReport.data?.revenueByDate || []
        }
      };

      return {
        success: true,
        message: 'Dashboard statistics generated successfully',
        data: dashboardData
      };

    } catch (error: any) {
      logger.error('Generate dashboard stats error:', error);
      return {
        success: false,
        message: 'Failed to generate dashboard statistics',
        error: 'DASHBOARD_STATS_FAILED'
      };
    }
  }
}

export const reportService = ReportService.getInstance();
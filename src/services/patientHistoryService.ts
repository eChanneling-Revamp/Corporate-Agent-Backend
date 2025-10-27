import { prisma } from '../utils/database';

interface CreatePatientHistoryData {
  customerId: string;
  appointmentId: string;
  agentId: string;
  visitDate: Date;
  chiefComplaint: string;
  diagnosis?: string;
  treatmentPlan?: string;
  medications?: string;
  followUpInstructions?: string;
  vitalSigns?: any;
  labResults?: any;
  notes?: string;
}

interface UpdatePatientHistoryData {
  diagnosis?: string;
  treatmentPlan?: string;
  medications?: string;
  followUpInstructions?: string;
  vitalSigns?: any;
  labResults?: any;
  notes?: string;
}

export class PatientHistoryService {
  
  /**
   * Create a new patient history record
   */
  static async createHistory(data: CreatePatientHistoryData) {
    return await prisma.patientHistory.create({
      data: {
        customerId: data.customerId,
        appointmentId: data.appointmentId,
        agentId: data.agentId,
        visitDate: data.visitDate,
        chiefComplaint: data.chiefComplaint,
        diagnosis: data.diagnosis,
        treatmentPlan: data.treatmentPlan,
        medications: data.medications,
        followUpInstructions: data.followUpInstructions,
        vitalSigns: data.vitalSigns,
        labResults: data.labResults,
        notes: data.notes
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get patient history for a specific customer
   */
  static async getCustomerHistory(customerId: string, agentId: string, options?: {
    limit?: number;
    offset?: number;
    includeVitals?: boolean;
    includeLabs?: boolean;
  }) {
    const { limit = 10, offset = 0, includeVitals = true, includeLabs = true } = options || {};

    return await prisma.patientHistory.findMany({
      where: {
        customerId,
        agentId
      },
      include: {
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true
              }
            }
          }
        }
      },
      orderBy: { visitDate: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Get detailed patient history record
   */
  static async getHistoryDetail(historyId: string, agentId: string) {
    return await prisma.patientHistory.findFirst({
      where: {
        id: historyId,
        agentId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            medicalHistory: true
          }
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            status: true,
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                qualification: true
              }
            },
            hospital: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Update patient history record
   */
  static async updateHistory(historyId: string, agentId: string, data: UpdatePatientHistoryData) {
    // Verify the record exists and belongs to the agent
    const existingRecord = await prisma.patientHistory.findFirst({
      where: {
        id: historyId,
        agentId
      }
    });

    if (!existingRecord) {
      throw new Error('Patient history record not found');
    }

    return await prisma.patientHistory.update({
      where: { id: historyId },
      data: {
        diagnosis: data.diagnosis,
        treatmentPlan: data.treatmentPlan,
        medications: data.medications,
        followUpInstructions: data.followUpInstructions,
        vitalSigns: data.vitalSigns,
        labResults: data.labResults,
        notes: data.notes,
        updatedAt: new Date()
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Search patient history across all customers for an agent
   */
  static async searchHistory(agentId: string, searchOptions: {
    patientName?: string;
    diagnosis?: string;
    dateRange?: {
      from: Date;
      to: Date;
    };
    doctorId?: string;
    page?: number;
    limit?: number;
  }) {
    const { 
      patientName, 
      diagnosis, 
      dateRange, 
      doctorId, 
      page = 1, 
      limit = 10 
    } = searchOptions;

    const skip = (page - 1) * limit;
    const where: any = { agentId };

    if (patientName) {
      where.customer = {
        OR: [
          { firstName: { contains: patientName, mode: 'insensitive' } },
          { lastName: { contains: patientName, mode: 'insensitive' } }
        ]
      };
    }

    if (diagnosis) {
      where.diagnosis = { contains: diagnosis, mode: 'insensitive' };
    }

    if (dateRange) {
      where.visitDate = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    if (doctorId) {
      where.appointment = {
        doctorId
      };
    }

    const [records, total] = await Promise.all([
      prisma.patientHistory.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          appointment: {
            select: {
              id: true,
              appointmentNumber: true,
              appointmentDate: true,
              doctor: {
                select: {
                  firstName: true,
                  lastName: true,
                  specialization: true
                }
              }
            }
          }
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.patientHistory.count({ where })
    ]);

    return {
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Get patient history statistics
   */
  static async getHistoryStats(agentId: string) {
    const [totalRecords, recentRecords, commonDiagnoses] = await Promise.all([
      prisma.patientHistory.count({ where: { agentId } }),
      prisma.patientHistory.count({
        where: {
          agentId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.patientHistory.groupBy({
        by: ['diagnosis'],
        where: { 
          agentId,
          diagnosis: { not: null }
        },
        _count: true,
        orderBy: { _count: { diagnosis: 'desc' } },
        take: 10
      })
    ]);

    return {
      totalRecords,
      recentRecords,
      commonDiagnoses: commonDiagnoses.map(item => ({
        diagnosis: item.diagnosis,
        count: item._count
      }))
    };
  }

  /**
   * Get patient timeline (chronological history)
   */
  static async getPatientTimeline(customerId: string, agentId: string) {
    const timeline = await prisma.patientHistory.findMany({
      where: {
        customerId,
        agentId
      },
      include: {
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            appointmentTime: true,
            status: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true
              }
            },
            hospital: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { visitDate: 'desc' }
    });

    // Group by year and month for better visualization
    const groupedTimeline = timeline.reduce((acc, record) => {
      const year = record.visitDate.getFullYear();
      const month = record.visitDate.toLocaleString('default', { month: 'long' });
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      
      acc[year][month].push(record);
      
      return acc;
    }, {} as any);

    return groupedTimeline;
  }
}

export default PatientHistoryService;
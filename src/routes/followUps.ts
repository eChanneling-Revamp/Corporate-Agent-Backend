import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Get all follow-ups for an agent
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status, type, priority } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { agentId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
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
        },
        orderBy: { scheduledDate: 'asc' },
        skip,
        take: Number(limit)
      }),
      prisma.followUp.count({ where })
    ]);

    res.json({
      followUps,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new follow-up
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      customerId,
      appointmentId,
      type,
      priority,
      title,
      description,
      scheduledDate,
      notes
    } = req.body;

    // Validate required fields
    if (!customerId || !type || !title || !scheduledDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify customer exists and belongs to agent
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agentId
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify appointment if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          agentId
        }
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId,
        appointmentId,
        agentId,
        type,
        priority: priority || 'MEDIUM',
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        notes
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

    res.status(201).json({ followUp });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific follow-up
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const followUpId = req.params.id;

    const followUp = await prisma.followUp.findFirst({
      where: {
        id: followUpId,
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
            medicalHistory: true
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

    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    res.json({ followUp });
  } catch (error) {
    console.error('Error fetching follow-up:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update follow-up
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const followUpId = req.params.id;
    const {
      type,
      priority,
      status,
      title,
      description,
      scheduledDate,
      notes,
      outcome,
      nextFollowUpDate
    } = req.body;

    // Verify follow-up exists and belongs to agent
    const existingFollowUp = await prisma.followUp.findFirst({
      where: {
        id: followUpId,
        agentId
      }
    });

    if (!existingFollowUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    const updateData: any = {};

    if (type) updateData.type = type;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (notes) updateData.notes = notes;
    if (outcome) updateData.outcome = outcome;
    if (nextFollowUpDate) updateData.nextFollowUpDate = new Date(nextFollowUpDate);

    // Set completion date if status is completed
    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }

    const updatedFollowUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
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

    res.json({ followUp: updatedFollowUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete follow-up
router.patch('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const followUpId = req.params.id;
    const { outcome, notes, nextFollowUpDate } = req.body;

    // Verify follow-up exists and belongs to agent
    const existingFollowUp = await prisma.followUp.findFirst({
      where: {
        id: followUpId,
        agentId
      }
    });

    if (!existingFollowUp) {
      return res.status(404).json({ message: 'Follow-up not found' });
    }

    const updatedFollowUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
        outcome,
        notes,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null
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
        }
      }
    });

    res.json({ followUp: updatedFollowUp });
  } catch (error) {
    console.error('Error completing follow-up:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get follow-up statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [statusStats, typeStats, priorityStats] = await Promise.all([
      prisma.followUp.groupBy({
        by: ['status'],
        where: { agentId },
        _count: true
      }),
      prisma.followUp.groupBy({
        by: ['type'],
        where: { agentId },
        _count: true
      }),
      prisma.followUp.groupBy({
        by: ['priority'],
        where: { agentId },
        _count: true
      })
    ]);

    const overdueFollowUps = await prisma.followUp.count({
      where: {
        agentId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { lt: new Date() }
      }
    });

    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        agentId,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    });

    res.json({
      statusStats,
      typeStats,
      priorityStats,
      overdueFollowUps,
      upcomingFollowUps
    });
  } catch (error) {
    console.error('Error fetching follow-up stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
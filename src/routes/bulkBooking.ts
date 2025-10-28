import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Get all bulk bookings for an agent
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { agentId };

    if (status) {
      where.status = status;
    }

    const [bulkBookings, total] = await Promise.all([
      prisma.bulkBooking.findMany({
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
          items: {
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
            }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.bulkBooking.count({ where })
    ]);

    res.json({
      bulkBookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bulk bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new bulk booking
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      customerId,
      batchName,
      description,
      appointments
    } = req.body;

    // Validate required fields
    if (!customerId || !batchName || !appointments || !Array.isArray(appointments)) {
      return res.status(400).json({ message: 'Missing required fields or invalid appointments array' });
    }

    if (appointments.length === 0) {
      return res.status(400).json({ message: 'At least one appointment is required' });
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

    // Create bulk booking with items
    const bulkBooking = await prisma.bulkBooking.create({
      data: {
        batchName,
        description,
        totalItems: appointments.length,
        batchNumber: `BULK-${Date.now()}`, // Generate unique batch number
        agent: {
          connect: { id: agentId }
        },
        customer: {
          connect: { id: customerId }
        },
        items: {
          create: appointments.map((apt: any, index: number) => ({
            sequenceNumber: index + 1,
            appointmentDate: new Date(apt.appointmentDate),
            appointmentTime: String(apt.appointmentTime),
            consultationFee: parseFloat(apt.consultationFee || 0),
            notes: apt.notes,
            patientName: apt.patientName || `${customer.firstName} ${customer.lastName}`,
            patientEmail: apt.patientEmail || customer.email,
            patientPhone: apt.patientPhone || customer.phone,
            doctor: {
              connect: { id: apt.doctorId }
            },
            hospital: {
              connect: { id: apt.hospitalId }
            }
          }))
        }
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
        items: {
          include: {
            appointment: true
          }
        }
      }
    });

    // Process appointments in background (simplified for demo)
    processaBulkBooking(bulkBooking.id);

    res.status(201).json({ bulkBooking });
  } catch (error) {
    console.error('Error creating bulk booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific bulk booking
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const bulkBookingId = req.params.id;

    const bulkBooking = await prisma.bulkBooking.findFirst({
      where: {
        id: bulkBookingId,
        agentId
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
        items: {
          include: {
            appointment: {
              select: {
                id: true,
                appointmentNumber: true,
                appointmentDate: true,
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
                    name: true,
                    address: true
                  }
                }
              }
            }
          },
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    });

    if (!bulkBooking) {
      return res.status(404).json({ message: 'Bulk booking not found' });
    }

    res.json({ bulkBooking });
  } catch (error) {
    console.error('Error fetching bulk booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel bulk booking
router.patch('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const bulkBookingId = req.params.id;
    const { reason } = req.body;

    // Verify bulk booking exists and belongs to agent
    const bulkBooking = await prisma.bulkBooking.findFirst({
      where: {
        id: bulkBookingId,
        agentId
      }
    });

    if (!bulkBooking) {
      return res.status(404).json({ message: 'Bulk booking not found' });
    }

    if (bulkBooking.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot cancel completed bulk booking' });
    }

    const updatedBulkBooking = await prisma.bulkBooking.update({
      where: { id: bulkBookingId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by agent'
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
        items: {
          include: {
            appointment: true
          }
        }
      }
    });

    res.json({ bulkBooking: updatedBulkBooking });
  } catch (error) {
    console.error('Error cancelling bulk booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Retry failed appointments in bulk booking
router.post('/:id/retry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const bulkBookingId = req.params.id;
    const { itemIds } = req.body; // Array of item IDs to retry

    // Verify bulk booking exists and belongs to agent
    const bulkBooking = await prisma.bulkBooking.findFirst({
      where: {
        id: bulkBookingId,
        agentId
      },
      include: {
        items: {
          where: itemIds ? { id: { in: itemIds } } : { status: 'FAILED' }
        }
      }
    });

    if (!bulkBooking) {
      return res.status(404).json({ message: 'Bulk booking not found' });
    }

    // Reset failed items to pending
    await prisma.bulkBookingItem.updateMany({
      where: {
        id: { in: bulkBooking.items.map(item => item.id) },
        status: 'FAILED'
      },
      data: {
        status: 'PENDING',
        errorMessage: null
      }
    });

    // Reset bulk booking status if it was failed
    if (bulkBooking.status === 'FAILED') {
      await prisma.bulkBooking.update({
        where: { id: bulkBookingId },
        data: {
          status: 'PROCESSING',
          completedAt: null
        }
      });
    }

    // Process the retried items (simplified for demo)
    processaBulkBooking(bulkBookingId);

    res.json({ message: 'Retry initiated successfully' });
  } catch (error) {
    console.error('Error retrying bulk booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get bulk booking statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [statusStats, recentBookings] = await Promise.all([
      prisma.bulkBooking.groupBy({
        by: ['status'],
        where: { agentId },
        _count: true
      }),
      prisma.bulkBooking.findMany({
        where: { agentId },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const itemStats = await prisma.bulkBookingItem.groupBy({
      by: ['status'],
      where: {
        bulkBooking: {
          agentId
        }
      },
      _count: true
    });

    res.json({
      statusStats,
      itemStats,
      recentBookings
    });
  } catch (error) {
    console.error('Error fetching bulk booking stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to process bulk booking (simplified)
async function processaBulkBooking(bulkBookingId: string) {
  // This is a simplified version - in real implementation, this would be a queue job
  try {
    const bulkBooking = await prisma.bulkBooking.findUnique({
      where: { id: bulkBookingId },
      include: { items: { where: { status: 'PENDING' } } }
    });

    if (!bulkBooking) return;

    // Update status to processing
    await prisma.bulkBooking.update({
      where: { id: bulkBookingId },
      data: { status: 'PROCESSING' }
    });

    // Process each item
    for (const item of bulkBooking.items) {
      try {
        // In real implementation, this would create actual appointments
        // For now, we'll just simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
          // Create appointment (simplified)
          // Create a simple appointment record for bulk booking
          const appointment = await prisma.appointment.create({
            data: {
              appointmentNumber: `BULK-${Date.now()}-${item.sequenceNumber}`,
              patientName: item.patientName,
              patientEmail: item.patientEmail,
              patientPhone: item.patientPhone,
              doctorId: item.doctorId,
              hospitalId: item.hospitalId,
              timeSlotId: '1', // Placeholder - in real implementation, this would be from available slots
              agentId: bulkBooking.agentId,
              customerId: bulkBooking.customerId,
              appointmentDate: item.appointmentDate,
              appointmentTime: new Date(`1970-01-01T${item.appointmentTime}:00Z`),
              consultationFee: item.consultationFee,
              agentCommission: Number(item.consultationFee) * 0.1,
              totalAmount: item.consultationFee,
              notes: item.notes
            }
          });

          await prisma.bulkBookingItem.update({
            where: { id: item.id },
            data: {
              status: 'SUCCESS',
              appointmentId: appointment.id,
              processedAt: new Date()
            }
          });
        } else {
          await prisma.bulkBookingItem.update({
            where: { id: item.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Simulated booking failure',
              processedAt: new Date()
            }
          });
        }
      } catch (error) {
        await prisma.bulkBookingItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            processedAt: new Date()
          }
        });
      }
    }

    // Update bulk booking status based on results
    const updatedItems = await prisma.bulkBookingItem.findMany({
      where: { bulkBookingId }
    });

    const successCount = updatedItems.filter(item => item.status === 'SUCCESS').length;
    const failedCount = updatedItems.filter(item => item.status === 'FAILED').length;

    let finalStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';
    if (failedCount === updatedItems.length) {
      finalStatus = 'FAILED';
    }

    await prisma.bulkBooking.update({
      where: { id: bulkBookingId },
      data: {
        status: finalStatus,
        successfulItems: successCount,
        failedItems: failedCount,
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error processing bulk booking:', error);
    await prisma.bulkBooking.update({
      where: { id: bulkBookingId },
      data: {
        status: 'FAILED',
        completedAt: new Date()
      }
    });
  }
}

export default router;
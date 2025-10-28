import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Get all customers for an agent
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { agentId };

    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              appointments: true,
              tickets: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      customers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new customer
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with this email already exists' });
    }

    const customer = await prisma.customer.create({
      data: {
        agentId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        emergencyContact,
        medicalHistory
      },
      include: {
        _count: {
          select: {
            appointments: true,
            tickets: true
          }
        }
      }
    });

    res.status(201).json({ customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific customer
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const customerId = req.params.id;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agentId
      },
      include: {
        appointments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true
              }
            }
          }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            appointments: true,
            tickets: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const customerId = req.params.id;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory,
      status
    } = req.body;

    // Verify customer exists and belongs to agent
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agentId
      }
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if email is being updated and already exists
    if (email && email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({ message: 'Customer with this email already exists' });
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        emergencyContact,
        medicalHistory,
        status
      },
      include: {
        _count: {
          select: {
            appointments: true,
            tickets: true
          }
        }
      }
    });

    res.json({ customer: updatedCustomer });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      customerGrowth
    ] = await Promise.all([
      prisma.customer.count({ where: { agentId } }),
      prisma.customer.count({ where: { agentId, status: 'ACTIVE' } }),
      prisma.customer.count({
        where: {
          agentId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.customer.groupBy({
        by: ['status'],
        where: { agentId },
        _count: true
      })
    ]);

    const recentCustomers = await prisma.customer.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        totalAppointments: true
      }
    });

    res.json({
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      customerGrowth,
      recentCustomers
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
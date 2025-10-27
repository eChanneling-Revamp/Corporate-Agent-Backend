import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Get all tickets for an agent
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { agentId },
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
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new ticket
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      customerId,
      title,
      description,
      category,
      priority
    } = req.body;

    // Validate required fields
    if (!customerId || !title || !description || !category) {
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

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-${Date.now()}`, // Generate unique ticket number
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        agent: {
          connect: { id: agentId }
        },
        customer: customerId ? {
          connect: { id: customerId }
        } : undefined
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

    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific ticket with messages
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ticketId = req.params.id;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
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
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add message to ticket
router.post('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ticketId = req.params.id;
    const { message, senderType } = req.body;

    if (!message || !senderType) {
      return res.status(400).json({ message: 'Message and sender type are required' });
    }

    // Verify ticket exists and belongs to agent
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        agentId
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        message,
        senderType,
        senderId: agentId,
        senderName: req.agent?.email || 'Agent', // Use email as name for now
        ticket: {
          connect: { id: ticketId }
        }
      }
    });

    // Update ticket status if it was resolved and now has new message
    if (ticket.status === 'RESOLVED') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.status(201).json({ message: ticketMessage });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update ticket status
router.patch('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ticketId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Verify ticket exists and belongs to agent
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        agentId
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        status,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null
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

    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get ticket statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { agentId },
      _count: true
    });

    const categoryStats = await prisma.ticket.groupBy({
      by: ['category'],
      where: { agentId },
      _count: true
    });

    const priorityStats = await prisma.ticket.groupBy({
      by: ['priority'],
      where: { agentId },
      _count: true
    });

    res.json({
      statusStats: stats,
      categoryStats,
      priorityStats
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
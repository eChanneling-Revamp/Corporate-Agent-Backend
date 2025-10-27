import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Get all approval workflows for an agent
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status, requestType, priority } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { requesterId: agentId };

    if (status) {
      where.status = status;
    }

    if (requestType) {
      where.requestType = requestType;
    }

    if (priority) {
      where.priority = priority;
    }

    const [workflows, total] = await Promise.all([
      prisma.approvalWorkflow.findMany({
        where,
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.approvalWorkflow.count({ where })
    ]);

    res.json({
      workflows,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new approval workflow
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      requestType,
      requestId,
      priority,
      description,
      justification,
      estimatedValue,
      steps
    } = req.body;

    // Validate required fields
    if (!requestType || !requestId || !description || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ message: 'Missing required fields or invalid steps array' });
    }

    if (steps.length === 0) {
      return res.status(400).json({ message: 'At least one approval step is required' });
    }

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        requestType,
        requestId,
        title: description, // Use description as title since title is required
        description,
        justification,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        priority: priority || 'MEDIUM',
        totalSteps: steps.length,
        requestData: { requestType, requestId }, // Add required requestData field
        requester: {
          connect: { id: agentId }
        },
        steps: {
          create: steps.map((step: any, index: number) => ({
            stepOrder: index + 1,
            stepName: step.stepName,
            description: step.description,
            isOptional: step.isOptional || false,
            approver: step.approverId ? {
              connect: { id: step.approverId }
            } : undefined
          }))
        }
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    res.status(201).json({ workflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific workflow
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workflowId = req.params.id;

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: {
        id: workflowId,
        requesterId: agentId
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update workflow step (for approvers)
router.patch('/:workflowId/steps/:stepId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { workflowId, stepId } = req.params;
    const { status, comments, approverNotes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Verify the step exists and the agent is the approver
    const step = await prisma.workflowStep.findFirst({
      where: {
        id: stepId,
        workflowId,
        approverId: agentId
      },
      include: {
        workflow: true
      }
    });

    if (!step) {
      return res.status(404).json({ message: 'Step not found or you are not authorized to approve this step' });
    }

    // Check if this is the current step
    if (step.workflow.currentStep !== step.stepOrder) {
      return res.status(400).json({ message: 'This step is not currently active' });
    }

    // Update the step
    const updatedStep = await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status,
        comments,
        approverNotes,
        processedAt: new Date(),
        processedBy: agentId
      }
    });

    // Update workflow based on step status
    let workflowUpdate: any = {};

    if (status === 'APPROVED') {
      // Move to next step or complete workflow
      if (step.stepOrder < step.workflow.totalSteps) {
        workflowUpdate.currentStep = step.stepOrder + 1;
      } else {
        workflowUpdate.status = 'APPROVED';
        workflowUpdate.completedAt = new Date();
      }
    } else if (status === 'REJECTED') {
      workflowUpdate.status = 'REJECTED';
      workflowUpdate.completedAt = new Date();
    }

    if (Object.keys(workflowUpdate).length > 0) {
      await prisma.approvalWorkflow.update({
        where: { id: workflowId },
        data: workflowUpdate
      });
    }

    // Fetch updated workflow
    const updatedWorkflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    res.json({ workflow: updatedWorkflow });
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel workflow
router.patch('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workflowId = req.params.id;
    const { reason } = req.body;

    // Verify workflow exists and belongs to agent
    const workflow = await prisma.approvalWorkflow.findFirst({
      where: {
        id: workflowId,
        requesterId: agentId
      }
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    if (workflow.status !== 'PENDING' && workflow.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Can only cancel pending or in-progress workflows' });
    }

    const updatedWorkflow = await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        cancellationReason: reason
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    res.json({ workflow: updatedWorkflow });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get workflows pending agent's approval
router.get('/pending/approvals', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const pendingApprovals = await prisma.approvalWorkflow.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        steps: {
          some: {
            approverId: agentId,
            status: 'PENDING'
          }
        }
      },
      include: {
        steps: {
          where: {
            approverId: agentId,
            status: 'PENDING'
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ pendingApprovals });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get workflow statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [statusStats, typeStats, priorityStats] = await Promise.all([
      prisma.approvalWorkflow.groupBy({
        by: ['status'],
        where: { requesterId: agentId },
        _count: true
      }),
      prisma.approvalWorkflow.groupBy({
        by: ['requestType'],
        where: { requesterId: agentId },
        _count: true
      }),
      prisma.approvalWorkflow.groupBy({
        by: ['priority'],
        where: { requesterId: agentId },
        _count: true
      })
    ]);

    const pendingApprovals = await prisma.approvalWorkflow.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        steps: {
          some: {
            approverId: agentId,
            status: 'PENDING'
          }
        }
      }
    });

    const avgProcessingTime = await prisma.approvalWorkflow.aggregate({
      where: {
        requesterId: agentId,
        status: { in: ['APPROVED', 'REJECTED'] },
        completedAt: { not: null }
      },
      _avg: {
        // This would need a computed field for processing time
        // For now, we'll calculate it differently
      }
    });

    res.json({
      statusStats,
      typeStats,
      priorityStats,
      pendingApprovals
    });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
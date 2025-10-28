import { Router } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import PatientHistoryService from '../services/patientHistoryService';

const router = Router();

// Get patient history for a specific customer
router.get('/customer/:customerId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const customerId = req.params.customerId;
    const { limit, offset, includeVitals, includeLabs } = req.query;

    const history = await PatientHistoryService.getCustomerHistory(customerId, agentId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      includeVitals: includeVitals === 'true',
      includeLabs: includeLabs === 'true'
    });

    res.json({ history });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search patient history
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { 
      patientName, 
      diagnosis, 
      fromDate, 
      toDate, 
      doctorId, 
      page, 
      limit 
    } = req.query;

    const searchOptions: any = {
      patientName: patientName as string,
      diagnosis: diagnosis as string,
      doctorId: doctorId as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    };

    if (fromDate && toDate) {
      searchOptions.dateRange = {
        from: new Date(fromDate as string),
        to: new Date(toDate as string)
      };
    }

    const result = await PatientHistoryService.searchHistory(agentId, searchOptions);

    res.json(result);
  } catch (error) {
    console.error('Error searching patient history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new patient history record
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      customerId,
      appointmentId,
      visitDate,
      chiefComplaint,
      diagnosis,
      treatmentPlan,
      medications,
      followUpInstructions,
      vitalSigns,
      labResults,
      notes
    } = req.body;

    if (!customerId || !appointmentId || !visitDate || !chiefComplaint) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify customer and appointment belong to agent
    const [customer, appointment] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, agentId }
      }),
      prisma.appointment.findFirst({
        where: { id: appointmentId, agentId }
      })
    ]);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const historyRecord = await PatientHistoryService.createHistory({
      customerId,
      appointmentId,
      agentId,
      visitDate: new Date(visitDate),
      chiefComplaint,
      diagnosis,
      treatmentPlan,
      medications,
      followUpInstructions,
      vitalSigns,
      labResults,
      notes
    });

    res.status(201).json({ history: historyRecord });
  } catch (error) {
    console.error('Error creating patient history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific patient history record
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const historyId = req.params.id;

    const history = await PatientHistoryService.getHistoryDetail(historyId, agentId);

    if (!history) {
      return res.status(404).json({ message: 'Patient history record not found' });
    }

    res.json({ history });
  } catch (error) {
    console.error('Error fetching patient history detail:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update patient history record
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const historyId = req.params.id;
    const {
      diagnosis,
      treatmentPlan,
      medications,
      followUpInstructions,
      vitalSigns,
      labResults,
      notes
    } = req.body;

    const updatedHistory = await PatientHistoryService.updateHistory(historyId, agentId, {
      diagnosis,
      treatmentPlan,
      medications,
      followUpInstructions,
      vitalSigns,
      labResults,
      notes
    });

    res.json({ history: updatedHistory });
  } catch (error) {
    if (error instanceof Error && error.message === 'Patient history record not found') {
      return res.status(404).json({ message: 'Patient history record not found' });
    }
    console.error('Error updating patient history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get patient timeline
router.get('/customer/:customerId/timeline', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const customerId = req.params.customerId;

    // Verify customer belongs to agent
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, agentId }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const timeline = await PatientHistoryService.getPatientTimeline(customerId, agentId);

    res.json({ timeline });
  } catch (error) {
    console.error('Error fetching patient timeline:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get patient history statistics
router.get('/stats/overview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.agent?.agentId;
    if (!agentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const stats = await PatientHistoryService.getHistoryStats(agentId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching patient history stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
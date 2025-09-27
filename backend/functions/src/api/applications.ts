import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthRequest } from '../auth/authMiddleware';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy load to ensure admin is initialized
const getDb = () => admin.firestore();

export const submitApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;
    const studentId = req.user?.uid;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    const existingApplication = await getDb().collection('applications')
      .where('studentId', '==', studentId)
      .where('jobId', '==', jobId)
      .get();

    if (!existingApplication.empty) {
      res.status(400).json({ error: 'Already applied to this job' });
      return;
    }

    const jobDoc = await getDb().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const application = {
      studentId,
      jobId,
      coverLetter,
      resumeUrl,
      status: 'pending',
      appliedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await getDb().collection('applications').add(application);

    await getDb().collection('jobs').doc(jobId).update({
      applicationCount: FieldValue.increment(1)
    });

    res.status(201).json({ 
      message: 'Application submitted successfully',
      applicationId: docRef.id 
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

export const getStudentApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.uid;
    const { status, page = 1, limit = 10 } = req.query;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let query = getDb().collection('applications')
      .where('studentId', '==', studentId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('appliedAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const applications = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const jobDoc = await getDb().collection('jobs').doc(data.jobId).get();
        return {
          id: doc.id,
          ...data,
          job: jobDoc.exists ? jobDoc.data() : null,
          appliedAt: data.appliedAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      })
    );

    const totalCount = await getDb().collection('applications')
      .where('studentId', '==', studentId)
      .count()
      .get();

    res.status(200).json({
      applications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
};

export const getEmployerApplicants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employerId = req.user?.uid;
    const { jobId, status, page = 1, limit = 10 } = req.query;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    const jobDoc = await getDb().collection('jobs').doc(jobId as string).get();
    if (!jobDoc.exists || jobDoc.data()?.employerId !== employerId) {
      res.status(404).json({ error: 'Job not found or access denied' });
      return;
    }

    let query = getDb().collection('applications')
      .where('jobId', '==', jobId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('appliedAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const applicants = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const studentDoc = await getDb().collection('users').doc(data.studentId).get();
        return {
          id: doc.id,
          ...data,
          student: studentDoc.exists ? {
            id: studentDoc.id,
            ...studentDoc.data()
          } : null,
          appliedAt: data.appliedAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      })
    );

    const totalCount = await getDb().collection('applications')
      .where('jobId', '==', jobId)
      .count()
      .get();

    res.status(200).json({
      applicants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting applicants:', error);
    res.status(500).json({ error: 'Failed to get applicants' });
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { status, feedback } = req.body;
    const employerId = req.user?.uid;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const validStatuses = ['pending', 'reviewing', 'accepted', 'rejected', 'interview'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const applicationDoc = await getDb().collection('applications').doc(applicationId).get();
    if (!applicationDoc.exists) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const application = applicationDoc.data()!;
    const jobDoc = await getDb().collection('jobs').doc(application.jobId).get();
    
    if (!jobDoc.exists || jobDoc.data()?.employerId !== employerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (feedback) {
      updateData.feedback = feedback;
    }

    await getDb().collection('applications').doc(applicationId).update(updateData);

    await getDb().collection('applicationHistory').add({
      applicationId,
      previousStatus: application.status,
      newStatus: status,
      changedBy: employerId,
      changedAt: FieldValue.serverTimestamp(),
      feedback
    });

    res.status(200).json({ 
      message: 'Application status updated successfully',
      status 
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
};

export const withdrawApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const studentId = req.user?.uid;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const applicationDoc = await getDb().collection('applications').doc(applicationId).get();
    
    if (!applicationDoc.exists) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const application = applicationDoc.data()!;
    
    if (application.studentId !== studentId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (application.status !== 'pending' && application.status !== 'reviewing') {
      res.status(400).json({ error: 'Cannot withdraw application with current status' });
      return;
    }

    await getDb().collection('applications').doc(applicationId).update({
      status: 'withdrawn',
      withdrawnAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await getDb().collection('jobs').doc(application.jobId).update({
      applicationCount: FieldValue.increment(-1)
    });

    res.status(200).json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
};

export const bulkUpdateApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationIds, status, feedback } = req.body;
    const employerId = req.user?.uid;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      res.status(400).json({ error: 'Application IDs are required' });
      return;
    }

    const validStatuses = ['reviewing', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status for bulk update' });
      return;
    }

    const batch = getDb().batch();
    const historyBatch = getDb().batch();
    let validCount = 0;

    for (const applicationId of applicationIds) {
      const applicationDoc = await getDb().collection('applications').doc(applicationId).get();
      
      if (!applicationDoc.exists) continue;

      const application = applicationDoc.data()!;
      const jobDoc = await getDb().collection('jobs').doc(application.jobId).get();
      
      if (!jobDoc.exists || jobDoc.data()?.employerId !== employerId) continue;

      batch.update(getDb().collection('applications').doc(applicationId), {
        status,
        feedback,
        updatedAt: FieldValue.serverTimestamp(),
      });

      historyBatch.set(getDb().collection('applicationHistory').doc(), {
        applicationId,
        previousStatus: application.status,
        newStatus: status,
        changedBy: employerId,
        changedAt: FieldValue.serverTimestamp(),
        feedback
      });

      validCount++;
    }

    await batch.commit();
    await historyBatch.commit();

    res.status(200).json({ 
      message: `${validCount} applications updated successfully`,
      updatedCount: validCount 
    });
  } catch (error) {
    console.error('Error bulk updating applications:', error);
    res.status(500).json({ error: 'Failed to bulk update applications' });
  }
};
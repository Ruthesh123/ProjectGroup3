import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthRequest } from '../auth/authMiddleware';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy load to ensure admin is initialized
const getDb = () => admin.firestore();

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employerId = req.user?.uid;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const {
      title,
      companyName,
      description,
      requirements,
      location,
      type,
      salary,
      skills,
      benefits,
      deadline
    } = req.body;

    if (!title || !companyName || !description || !location || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const job = {
      employerId,
      title,
      companyName,
      description,
      requirements: requirements || [],
      location,
      type,
      salary: salary || null,
      skills: skills || [],
      benefits: benefits || [],
      deadline: deadline ? new Date(deadline) : null,
      status: 'pending',
      viewCount: 0,
      applicationCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await getDb().collection('jobs').add(job);

    res.status(201).json({ 
      message: 'Job created successfully',
      jobId: docRef.id 
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

export const updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const employerId = req.user?.uid;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const jobDoc = await getDb().collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (jobDoc.data()?.employerId !== employerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData = {
      ...req.body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    delete updateData.employerId;
    delete updateData.viewCount;
    delete updateData.applicationCount;
    delete updateData.createdAt;

    await getDb().collection('jobs').doc(jobId).update(updateData);

    res.status(200).json({ message: 'Job updated successfully' });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

export const deleteJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const employerId = req.user?.uid;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const jobDoc = await getDb().collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (jobDoc.data()?.employerId !== employerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await getDb().collection('jobs').doc(jobId).update({
      status: 'deleted',
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      location,
      type,
      skills,
      status = 'active',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    let query = getDb().collection('jobs').where('status', '==', status);

    if (location) {
      query = query.where('location', '==', location);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    if (skills && Array.isArray(skills)) {
      query = query.where('skills', 'array-contains-any', skills);
    }

    const validSortFields = ['createdAt', 'updatedAt', 'deadline', 'applicationCount'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    let finalQuery = query.orderBy(sortField, sortOrder as any);

    const snapshot = await finalQuery
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    let jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        deadline: data.deadline?.toDate(),
      };
    });

    if (search) {
      const searchLower = (search as string).toLowerCase();
      jobs = jobs.filter((job: any) =>
        (job.title?.toLowerCase() || '').includes(searchLower) ||
        (job.companyName?.toLowerCase() || '').includes(searchLower) ||
        (job.description?.toLowerCase() || '').includes(searchLower)
      );
    }

    const totalCount = await query.count().get();

    res.status(200).json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
};

export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const jobDoc = await getDb().collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    await getDb().collection('jobs').doc(jobId).update({
      viewCount: FieldValue.increment(1)
    });

    const jobData = jobDoc.data()!;
    
    res.status(200).json({
      id: jobDoc.id,
      ...jobData,
      createdAt: jobData.createdAt?.toDate(),
      updatedAt: jobData.updatedAt?.toDate(),
      deadline: jobData.deadline?.toDate(),
    });
  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
};

export const saveJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const studentId = req.user?.uid;

    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const jobDoc = await getDb().collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const savedJobRef = getDb().collection('savedJobs').doc(`${studentId}_${jobId}`);
    const savedJob = await savedJobRef.get();

    if (savedJob.exists) {
      res.status(400).json({ error: 'Job already saved' });
      return;
    }

    await savedJobRef.set({
      studentId,
      jobId,
      savedAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: 'Job saved successfully' });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ error: 'Failed to save job' });
  }
};

export const unsaveJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const studentId = req.user?.uid;

    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const savedJobRef = getDb().collection('savedJobs').doc(`${studentId}_${jobId}`);
    const savedJob = await savedJobRef.get();

    if (!savedJob.exists) {
      res.status(404).json({ error: 'Saved job not found' });
      return;
    }

    await savedJobRef.delete();

    res.status(200).json({ message: 'Job unsaved successfully' });
  } catch (error) {
    console.error('Error unsaving job:', error);
    res.status(500).json({ error: 'Failed to unsave job' });
  }
};

export const getSavedJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.uid;
    const { page = 1, limit = 10 } = req.query;

    if (!studentId || req.user?.role !== 'student') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const savedJobsSnapshot = await getDb().collection('savedJobs')
      .where('studentId', '==', studentId)
      .orderBy('savedAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const savedJobs = await Promise.all(
      savedJobsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const jobDoc = await getDb().collection('jobs').doc(data.jobId).get();
        return {
          savedJobId: doc.id,
          savedAt: data.savedAt?.toDate(),
          job: jobDoc.exists ? {
            id: jobDoc.id,
            ...jobDoc.data(),
            createdAt: jobDoc.data()?.createdAt?.toDate(),
            updatedAt: jobDoc.data()?.updatedAt?.toDate(),
          } : null,
        };
      })
    );

    const totalCount = await getDb().collection('savedJobs')
      .where('studentId', '==', studentId)
      .count()
      .get();

    res.status(200).json({
      savedJobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting saved jobs:', error);
    res.status(500).json({ error: 'Failed to get saved jobs' });
  }
};

export const getEmployerJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employerId = req.user?.uid;
    const { status, page = 1, limit = 10 } = req.query;

    if (!employerId || req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    let query = getDb().collection('jobs')
      .where('employerId', '==', employerId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      deadline: doc.data().deadline?.toDate(),
    }));

    const totalCount = await query.count().get();

    res.status(200).json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting employer jobs:', error);
    res.status(500).json({ error: 'Failed to get employer jobs' });
  }
};
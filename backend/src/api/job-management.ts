import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import { body, query, validationResult } from 'express-validator';
import { Job } from '../models/schemas';
import { AuthMiddleware } from '../auth/authentication';

const app = express();
const db = admin.firestore();

/**
 * Validation rules for creating a job
 */
const createJobValidation = [
  body('title').notEmpty().trim().isLength({ min: 3, max: 100 }),
  body('description').notEmpty().isLength({ min: 100, max: 5000 }),
  body('requirements').isArray({ min: 1 }),
  body('responsibilities').isArray({ min: 1 }),
  body('type').isIn(['full-time', 'part-time', 'contract', 'internship', 'co-op']),
  body('location.city').notEmpty(),
  body('location.province').notEmpty(),
  body('location.isRemote').isBoolean(),
  body('deadline').isISO8601().toDate(),
  body('salary.min').isNumeric().optional(),
  body('salary.max').isNumeric().optional(),
  body('salary.currency').equals('CAD').optional(),
  body('salary.period').isIn(['hourly', 'annually']).optional(),
  body('benefits').isArray().optional(),
  body('tags').isArray().optional(),
];

/**
 * Validation rules for updating a job
 */
const updateJobValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).optional(),
  body('description').isLength({ min: 100, max: 5000 }).optional(),
  body('requirements').isArray({ min: 1 }).optional(),
  body('responsibilities').isArray({ min: 1 }).optional(),
  body('type').isIn(['full-time', 'part-time', 'contract', 'internship', 'co-op']).optional(),
  body('location').optional(),
  body('deadline').isISO8601().toDate().optional(),
  body('salary').optional(),
  body('benefits').isArray().optional(),
  body('tags').isArray().optional(),
  body('status').isIn(['draft', 'active', 'closed', 'filled']).optional(),
];

/**
 * Create Job Posting (Employer)
 */
app.post('/create',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('employer'),
  AuthMiddleware.requireVerified,
  createJobValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get employer details
      const employerDoc = await db.collection('users').doc(req.user.uid).get();
      const employerData = employerDoc.data();

      if (!employerData) {
        return res.status(404).json({ error: 'Employer profile not found' });
      }

      // Create job object
      const jobId = db.collection('jobs').doc().id;
      const newJob: Job = {
        id: jobId,
        employerId: req.user.uid,
        companyName: employerData.company.name,
        title: req.body.title,
        description: req.body.description,
        requirements: req.body.requirements,
        responsibilities: req.body.responsibilities,
        type: req.body.type,
        location: req.body.location,
        salary: req.body.salary,
        benefits: req.body.benefits || [],
        deadline: new Date(req.body.deadline),
        postedAt: new Date(),
        updatedAt: new Date(),
        status: req.body.status || 'active',
        applicantCount: 0,
        viewCount: 0,
        tags: req.body.tags || []
      };

      // Validate salary range if provided
      if (newJob.salary && newJob.salary.min && newJob.salary.max) {
        if (newJob.salary.min > newJob.salary.max) {
          return res.status(400).json({
            error: 'Invalid salary range',
            message: 'Minimum salary cannot be greater than maximum salary'
          });
        }
      }

      // Save to Firestore
      await db.collection('jobs').doc(jobId).set(newJob);

      // Create indexes for search
      await createJobSearchIndexes(newJob);

      // Log the creation
      await logAudit({
        userId: req.user.uid,
        userRole: 'employer',
        action: 'JOB_CREATED',
        resource: 'jobs',
        resourceId: jobId,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(201).json({
        message: 'Job posted successfully',
        job: newJob
      });

    } catch (error: any) {
      console.error('Job creation error:', error);
      res.status(500).json({
        error: 'Failed to create job',
        message: error.message
      });
    }
  }
);

/**
 * Get Jobs for Students (with filters and pagination)
 */
app.get('/list',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      let jobsQuery = db.collection('jobs')
        .where('status', '==', 'active')
        .where('deadline', '>', new Date());

      // Apply filters
      if (req.query.type) {
        jobsQuery = jobsQuery.where('type', '==', req.query.type);
      }

      if (req.query.city) {
        jobsQuery = jobsQuery.where('location.city', '==', req.query.city);
      }

      if (req.query.isRemote === 'true') {
        jobsQuery = jobsQuery.where('location.isRemote', '==', true);
      }

      // Apply sorting
      const sortBy = req.query.sortBy || 'postedAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
      jobsQuery = jobsQuery.orderBy(sortBy, sortOrder);

      // Apply pagination
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (offset > 0) {
        const lastDoc = await db.collection('jobs')
          .orderBy(sortBy, sortOrder)
          .limit(offset)
          .get();

        if (!lastDoc.empty) {
          const lastVisible = lastDoc.docs[lastDoc.docs.length - 1];
          jobsQuery = jobsQuery.startAfter(lastVisible);
        }
      }

      jobsQuery = jobsQuery.limit(limit);

      // Execute query
      const jobsSnapshot = await jobsQuery.get();
      const jobs = jobsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Get total count for pagination
      const totalCount = await db.collection('jobs')
        .where('status', '==', 'active')
        .where('deadline', '>', new Date())
        .get();

      // Increment view count for returned jobs (async, don't wait)
      incrementViewCounts(jobs.map(job => job.id));

      res.json({
        jobs,
        pagination: {
          total: totalCount.size,
          limit,
          offset,
          hasMore: offset + jobs.length < totalCount.size
        }
      });

    } catch (error: any) {
      console.error('Job listing error:', error);
      res.status(500).json({
        error: 'Failed to fetch jobs',
        message: error.message
      });
    }
  }
);

/**
 * Update Job Posting (Employer)
 */
app.put('/:jobId',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('employer'),
  updateJobValidation,
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get existing job
      const jobDoc = await db.collection('jobs').doc(jobId).get();

      if (!jobDoc.exists) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const jobData = jobDoc.data() as Job;

      // Verify ownership
      if (jobData.employerId !== req.user.uid) {
        return res.status(403).json({ error: 'Unauthorized to update this job' });
      }

      // Build update object
      const updateData: any = {
        ...req.body,
        updatedAt: new Date()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update job
      await db.collection('jobs').doc(jobId).update(updateData);

      // Get updated job
      const updatedJob = await db.collection('jobs').doc(jobId).get();

      // Log the update
      await logAudit({
        userId: req.user.uid,
        userRole: 'employer',
        action: 'JOB_UPDATED',
        resource: 'jobs',
        resourceId: jobId,
        changes: {
          before: jobData,
          after: updateData
        },
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        message: 'Job updated successfully',
        job: { id: jobId, ...updatedJob.data() }
      });

    } catch (error: any) {
      console.error('Job update error:', error);
      res.status(500).json({
        error: 'Failed to update job',
        message: error.message
      });
    }
  }
);

/**
 * Delete Job Posting (Employer)
 */
app.delete('/:jobId',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('employer'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      // Get existing job
      const jobDoc = await db.collection('jobs').doc(jobId).get();

      if (!jobDoc.exists) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const jobData = jobDoc.data() as Job;

      // Verify ownership
      if (jobData.employerId !== req.user.uid) {
        return res.status(403).json({ error: 'Unauthorized to delete this job' });
      }

      // Check if job has applications
      const applications = await db.collection('applications')
        .where('jobId', '==', jobId)
        .limit(1)
        .get();

      if (!applications.empty) {
        // Soft delete - change status instead of deleting
        await db.collection('jobs').doc(jobId).update({
          status: 'closed',
          updatedAt: new Date()
        });

        res.json({
          message: 'Job closed (has existing applications)',
          jobId
        });
      } else {
        // Hard delete - no applications
        await db.collection('jobs').doc(jobId).delete();

        res.json({
          message: 'Job deleted successfully',
          jobId
        });
      }

      // Log the deletion
      await logAudit({
        userId: req.user.uid,
        userRole: 'employer',
        action: applications.empty ? 'JOB_DELETED' : 'JOB_CLOSED',
        resource: 'jobs',
        resourceId: jobId,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    } catch (error: any) {
      console.error('Job deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete job',
        message: error.message
      });
    }
  }
);

/**
 * Job Search with Advanced Algorithm
 */
app.get('/search',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const {
        query: searchQuery,
        skills,
        minSalary,
        maxSalary,
        types,
        locations,
        industries,
        limit = 20,
        offset = 0
      } = req.query;

      let results: any[] = [];

      // Build complex query
      let baseQuery = db.collection('jobs')
        .where('status', '==', 'active')
        .where('deadline', '>', new Date());

      // Text search (would need full-text search service like Algolia in production)
      if (searchQuery) {
        // Simple implementation - in production, use proper search service
        const snapshot = await baseQuery.get();
        results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data(), score: 0 }))
          .filter(job => {
            const searchLower = (searchQuery as string).toLowerCase();
            let score = 0;

            // Title match (highest weight)
            if (job.title.toLowerCase().includes(searchLower)) {
              score += 10;
            }

            // Company name match
            if (job.companyName.toLowerCase().includes(searchLower)) {
              score += 5;
            }

            // Description match
            if (job.description.toLowerCase().includes(searchLower)) {
              score += 3;
            }

            // Tags match
            if (job.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))) {
              score += 2;
            }

            job.score = score;
            return score > 0;
          })
          .sort((a, b) => b.score - a.score);
      } else {
        const snapshot = await baseQuery.get();
        results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Apply filters
      if (skills && Array.isArray(skills)) {
        results = results.filter(job =>
          skills.some((skill: string) =>
            job.requirements?.some((req: string) =>
              req.toLowerCase().includes(skill.toLowerCase())
            )
          )
        );
      }

      if (minSalary) {
        results = results.filter(job =>
          job.salary?.max >= parseInt(minSalary as string)
        );
      }

      if (maxSalary) {
        results = results.filter(job =>
          job.salary?.min <= parseInt(maxSalary as string)
        );
      }

      if (types && Array.isArray(types)) {
        results = results.filter(job => types.includes(job.type));
      }

      if (locations && Array.isArray(locations)) {
        results = results.filter(job =>
          locations.includes(job.location.city) || job.location.isRemote
        );
      }

      // Apply pagination
      const paginatedResults = results.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        results: paginatedResults,
        total: results.length,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: results.length > parseInt(offset as string) + parseInt(limit as string)
        }
      });

    } catch (error: any) {
      console.error('Job search error:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  }
);

/**
 * Helper function to create search indexes
 */
async function createJobSearchIndexes(job: Job): Promise<void> {
  // In production, this would integrate with a search service
  // For now, we'll create basic indexes
  const searchTerms = [
    job.title.toLowerCase(),
    job.companyName.toLowerCase(),
    ...job.tags.map(tag => tag.toLowerCase()),
    job.type,
    job.location.city.toLowerCase()
  ];

  // Store search terms (would be sent to search service)
  console.log('Indexing job:', job.id, 'with terms:', searchTerms);
}

/**
 * Helper function to increment view counts
 */
async function incrementViewCounts(jobIds: string[]): Promise<void> {
  try {
    const batch = db.batch();
    jobIds.forEach(jobId => {
      const jobRef = db.collection('jobs').doc(jobId);
      batch.update(jobRef, {
        viewCount: admin.firestore.FieldValue.increment(1)
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to increment view counts:', error);
  }
}

/**
 * Log audit event
 */
async function logAudit(data: any): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export const jobManagement = functions.https.onRequest(app);
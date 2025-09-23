import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Sets up test data in Firebase Emulator
 * Run this in browser console or create a setup page
 */
export async function setupEmulatorTestData() {
  console.log('🚀 Setting up test data in emulator...');

  try {
    // Create admin user
    try {
      const adminCred = await createUserWithEmailAndPassword(
        auth,
        'admin@interlink.com',
        'Admin@123'
      );

      await setDoc(doc(db, 'users', adminCred.user.uid), {
        email: 'admin@interlink.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Admin user created');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Admin user already exists');
      } else {
        throw error;
      }
    }

    // Create student users
    const students = [
      { email: 'student1@test.com', name: 'John Student' },
      { email: 'student2@test.com', name: 'Jane Student' }
    ];

    for (const student of students) {
      try {
        const studentCred = await createUserWithEmailAndPassword(
          auth,
          student.email,
          'Test@123'
        );

        await setDoc(doc(db, 'users', studentCred.user.uid), {
          email: student.email,
          role: 'student',
          name: student.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Student user created: ${student.email}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`ℹ️ Student user already exists: ${student.email}`);
        }
      }
    }

    // Create employer users
    const employers = [
      { email: 'employer1@company.com', company: 'TechCorp' },
      { email: 'employer2@company.com', company: 'DataSystems Inc' }
    ];

    for (const employer of employers) {
      try {
        const employerCred = await createUserWithEmailAndPassword(
          auth,
          employer.email,
          'Test@123'
        );

        await setDoc(doc(db, 'users', employerCred.user.uid), {
          email: employer.email,
          role: 'employer',
          companyName: employer.company,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Employer user created: ${employer.email}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`ℹ️ Employer user already exists: ${employer.email}`);
        }
      }
    }

    // Create sample jobs
    const jobs = [
      {
        title: 'Frontend Developer Intern',
        companyName: 'TechCorp',
        description: 'We are looking for a passionate frontend developer intern to join our team.',
        location: 'Remote',
        type: 'internship',
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
        status: 'active',
        salary: {
          min: 40000,
          max: 50000,
          currency: 'CAD'
        },
        viewCount: 45,
        applicationCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Backend Developer',
        companyName: 'DataSystems Inc',
        description: 'Join our backend team to build scalable APIs and services.',
        location: 'Toronto, ON',
        type: 'full-time',
        skills: ['Node.js', 'TypeScript', 'Firebase'],
        status: 'active',
        salary: {
          min: 80000,
          max: 120000,
          currency: 'CAD'
        },
        viewCount: 120,
        applicationCount: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Full Stack Developer Co-op',
        companyName: 'StartupHub',
        description: 'Exciting opportunity for a full stack developer co-op student.',
        location: 'Waterloo, ON',
        type: 'internship',
        skills: ['React', 'Node.js', 'MongoDB'],
        status: 'active',
        salary: {
          min: 35000,
          max: 45000,
          currency: 'CAD'
        },
        viewCount: 89,
        applicationCount: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    for (const job of jobs) {
      await setDoc(doc(db, 'jobs', `job_${Date.now()}_${Math.random()}`), job);
      console.log(`✅ Job created: ${job.title}`);
    }

    // Create sample applications
    const applications = [
      {
        studentId: 'student_1',
        jobId: 'job_1',
        jobTitle: 'Frontend Developer Intern',
        companyName: 'TechCorp',
        status: 'pending',
        appliedAt: new Date(),
        resume: 'resume_url_here',
        coverLetter: 'I am very interested in this position...'
      },
      {
        studentId: 'student_2',
        jobId: 'job_2',
        jobTitle: 'Backend Developer',
        companyName: 'DataSystems Inc',
        status: 'reviewing',
        appliedAt: new Date(),
        resume: 'resume_url_here',
        coverLetter: 'With my experience in Node.js...'
      }
    ];

    for (const application of applications) {
      await setDoc(doc(db, 'applications', `app_${Date.now()}_${Math.random()}`), application);
      console.log(`✅ Application created: ${application.jobTitle}`);
    }

    console.log('\n✅ All test data created successfully!');
    console.log('\n📝 Test Accounts:');
    console.log('Admin: admin@interlink.com / Admin@123');
    console.log('Students: student1@test.com, student2@test.com / Test@123');
    console.log('Employers: employer1@company.com, employer2@company.com / Test@123');

    return true;
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    return false;
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).setupEmulatorTestData = setupEmulatorTestData;
}
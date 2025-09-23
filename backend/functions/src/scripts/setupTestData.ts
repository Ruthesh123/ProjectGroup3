import * as admin from 'firebase-admin';

/**
 * Sets up test data for development
 */
export async function setupTestData() {
  try {
    // Initialize admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.firestore();
    const auth = admin.auth();

    console.log('Setting up test data...');

    // Create admin user
    let adminUid;
    try {
      const adminUser = await auth.createUser({
        email: 'admin@interlink.com',
        password: 'Admin@123',
        emailVerified: true,
      });
      adminUid = adminUser.uid;
      await auth.setCustomUserClaims(adminUid, { role: 'admin' });
      await db.collection('users').doc(adminUid).set({
        email: 'admin@interlink.com',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✓ Admin user created');
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        const existingAdmin = await auth.getUserByEmail('admin@interlink.com');
        adminUid = existingAdmin.uid;
        console.log('✓ Admin user already exists');
      } else {
        throw error;
      }
    }

    // Create test student users
    const studentEmails = ['student1@test.com', 'student2@test.com'];
    for (const email of studentEmails) {
      try {
        const student = await auth.createUser({
          email: email,
          password: 'Test@123',
          emailVerified: true,
        });
        await db.collection('users').doc(student.uid).set({
          email: email,
          role: 'student',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✓ Student user created: ${email}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`✓ Student user already exists: ${email}`);
        }
      }
    }

    // Create test employer users
    const employerEmails = ['employer1@company.com', 'employer2@company.com'];
    for (const email of employerEmails) {
      try {
        const employer = await auth.createUser({
          email: email,
          password: 'Test@123',
          emailVerified: true,
        });
        await db.collection('users').doc(employer.uid).set({
          email: email,
          role: 'employer',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✓ Employer user created: ${email}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`✓ Employer user already exists: ${email}`);
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
        viewCount: 0,
        applicationCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        title: 'Backend Developer',
        companyName: 'DataSystems Inc',
        description: 'Join our backend team to build scalable APIs and services.',
        location: 'Toronto, ON',
        type: 'full-time',
        skills: ['Node.js', 'TypeScript', 'Firebase'],
        status: 'active',
        viewCount: 0,
        applicationCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const job of jobs) {
      await db.collection('jobs').add(job);
      console.log(`✓ Job created: ${job.title}`);
    }

    console.log('\n✅ Test data setup complete!');
    console.log('\nTest Accounts:');
    console.log('Admin: admin@interlink.com / Admin@123');
    console.log('Students: student1@test.com, student2@test.com / Test@123');
    console.log('Employers: employer1@company.com, employer2@company.com / Test@123');

  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  setupTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
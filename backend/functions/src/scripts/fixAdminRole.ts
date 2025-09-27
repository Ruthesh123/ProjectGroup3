import * as admin from 'firebase-admin';

/**
 * Fix admin user role and custom claims
 */
async function fixAdminRole() {
  try {
    // Initialize admin with emulator settings
    if (!admin.apps.length) {
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      admin.initializeApp({
        projectId: 'demo-internlink',
      });
    }

    const auth = admin.auth();
    const db = admin.firestore();

    console.log('Fixing admin user role...');

    // Find admin user by email
    try {
      const adminUser = await auth.getUserByEmail('admin@interlink.com');
      
      // Set custom claims
      await auth.setCustomUserClaims(adminUser.uid, { 
        role: 'admin',
        verified: true 
      });

      // Update Firestore document
      await db.collection('users').doc(adminUser.uid).update({
        role: 'admin',
        verified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Admin user role fixed successfully');
      console.log('Admin UID:', adminUser.uid);
      console.log('Email:', adminUser.email);
      
      // Verify the claims were set
      const updatedUser = await auth.getUser(adminUser.uid);
      console.log('Custom claims:', updatedUser.customClaims);
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.error('❌ Admin user not found. Run setupTestData.ts first.');
      } else {
        throw error;
      }
    }

    // Also fix other test users if needed
    const testUsers = [
      { email: 'student1@test.com', role: 'student' },
      { email: 'student2@test.com', role: 'student' },
      { email: 'employer1@company.com', role: 'employer' },
      { email: 'employer2@company.com', role: 'employer' }
    ];

    for (const testUser of testUsers) {
      try {
        const user = await auth.getUserByEmail(testUser.email);
        await auth.setCustomUserClaims(user.uid, { 
          role: testUser.role,
          verified: false 
        });
        
        await db.collection('users').doc(user.uid).update({
          role: testUser.role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ Fixed role for ${testUser.email}`);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.error(`Error fixing ${testUser.email}:`, error.message);
        }
      }
    }

    console.log('\n✅ All user roles fixed!');

  } catch (error) {
    console.error('Error fixing admin role:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  fixAdminRole()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixAdminRole };
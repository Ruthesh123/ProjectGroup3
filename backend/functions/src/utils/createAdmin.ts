import * as admin from 'firebase-admin';

/**
 * Creates an admin user for testing
 * Run this script using: npx ts-node createAdmin.ts
 */
export async function createAdminUser(): Promise<any> {
  try {
    // Initialize admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const email = 'admin@interlink.com';
    const password = 'Admin@123';

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
    });

    // Add admin custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Admin user created successfully:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', userRecord.uid);

    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('Admin user already exists');
    } else {
      console.error('Error creating admin user:', error);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  createAdminUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
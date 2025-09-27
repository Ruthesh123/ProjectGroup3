import * as admin from 'firebase-admin';
const fetch = require('node-fetch');

/**
 * Comprehensive API Testing Script
 * Tests all InternLink backend API endpoints
 */

// Configuration
const API_BASE = 'http://localhost:5001/demo-internlink/us-central1/api';
const TIMESTAMP = Date.now();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const tokens: { [key: string]: string } = {};
const testData: { [key: string]: string } = {};

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Make HTTP request to API endpoint
 */
async function makeRequest(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
): Promise<TestResult> {
  try {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: any = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    return {
      success: response.status < 400,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test an endpoint and log results
 */
async function testEndpoint(
  description: string,
  method: string,
  endpoint: string,
  body?: any,
  token?: string,
  expectedInResponse?: string
): Promise<boolean> {
  process.stdout.write(`${colors.yellow}Testing: ${description}...${colors.reset} `);

  const result = await makeRequest(method, endpoint, body, token);

  if (result.success) {
    if (expectedInResponse && !JSON.stringify(result.data).includes(expectedInResponse)) {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      console.log(`  Expected to find: "${expectedInResponse}"`);
      console.log(`  Got: ${JSON.stringify(result.data).substring(0, 100)}...`);
      failedTests++;
      return false;
    }
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    passedTests++;
    return true;
  } else {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`  Error: ${result.error || JSON.stringify(result.data)}`);
    failedTests++;
    return false;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}InternLink API Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`API Base: ${API_BASE}\n`);

  // Initialize Firebase Admin for emulator
  if (!admin.apps.length) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    admin.initializeApp({
      projectId: 'demo-internlink',
    });
  }

  // 1. HEALTH CHECK
  console.log(`\n${colors.blue}=== 1. HEALTH CHECK ===${colors.reset}`);
  await testEndpoint('Health Check', 'GET', '/health', null, undefined, 'healthy');

  // 2. AUTHENTICATION
  console.log(`\n${colors.blue}=== 2. AUTHENTICATION ===${colors.reset}`);

  // Register Student
  const studentEmail = `student${TIMESTAMP}@test.com`;
  const studentData = {
    email: studentEmail,
    password: 'Test@123456',
    role: 'student',
    firstName: 'John',
    lastName: 'Doe',
    university: 'Test University'
  };

  const registerResult = await makeRequest('POST', '/auth/register', studentData);
  if (registerResult.success) {
    console.log(`${colors.green}✓ Student Registration PASSED${colors.reset}`);
    passedTests++;
    testData.studentEmail = studentEmail;
  } else {
    console.log(`${colors.red}✗ Student Registration FAILED${colors.reset}`);
    failedTests++;
  }

  // Register Employer
  const employerEmail = `employer${TIMESTAMP}@company.com`;
  const employerData = {
    email: employerEmail,
    password: 'Test@123456',
    role: 'employer',
    firstName: 'Jane',
    lastName: 'Smith',
    companyName: 'Tech Corp'
  };

  const employerRegResult = await makeRequest('POST', '/auth/register', employerData);
  if (employerRegResult.success) {
    console.log(`${colors.green}✓ Employer Registration PASSED${colors.reset}`);
    passedTests++;
    testData.employerEmail = employerEmail;
  } else {
    console.log(`${colors.red}✗ Employer Registration FAILED${colors.reset}`);
    failedTests++;
  }

  // Login as Student
  const studentLoginResult = await makeRequest('POST', '/auth/login', {
    email: studentEmail,
    password: 'Test@123456'
  });

  if (studentLoginResult.success && studentLoginResult.data.token) {
    console.log(`${colors.green}✓ Student Login PASSED${colors.reset}`);
    passedTests++;
    tokens.student = studentLoginResult.data.token;
  } else {
    console.log(`${colors.red}✗ Student Login FAILED${colors.reset}`);
    failedTests++;
  }

  // Login as Employer
  const employerLoginResult = await makeRequest('POST', '/auth/login', {
    email: employerEmail,
    password: 'Test@123456'
  });

  if (employerLoginResult.success && employerLoginResult.data.token) {
    console.log(`${colors.green}✓ Employer Login PASSED${colors.reset}`);
    passedTests++;
    tokens.employer = employerLoginResult.data.token;
  } else {
    console.log(`${colors.red}✗ Employer Login FAILED${colors.reset}`);
    failedTests++;
  }

  // Login as Admin
  const adminLoginResult = await makeRequest('POST', '/auth/login', {
    email: 'admin@interlink.com',
    password: 'Admin@123'
  });

  if (adminLoginResult.success && adminLoginResult.data.token) {
    console.log(`${colors.green}✓ Admin Login PASSED${colors.reset}`);
    console.log(`  Admin Role: ${adminLoginResult.data.user?.role}`);
    passedTests++;
    tokens.admin = adminLoginResult.data.token;
  } else {
    console.log(`${colors.red}✗ Admin Login FAILED${colors.reset}`);
    failedTests++;
  }

  // 3. JOB MANAGEMENT
  console.log(`\n${colors.blue}=== 3. JOB MANAGEMENT ===${colors.reset}`);

  // Get Jobs (Public)
  await testEndpoint('Get Jobs (Public)', 'GET', '/jobs', null, undefined, 'jobs');

  // Create Job (Employer only)
  if (tokens.employer) {
    const jobData = {
      title: `Software Developer ${TIMESTAMP}`,
      companyName: 'Tech Corp',
      description: 'We are looking for a talented software developer to join our team. This is a great opportunity to work on exciting projects.',
      location: 'Toronto, ON',
      type: 'full-time',
      skills: ['JavaScript', 'React', 'Node.js'],
      requirements: ['3+ years experience', 'CS degree preferred']
    };

    const jobResult = await makeRequest('POST', '/jobs', jobData, tokens.employer);
    if (jobResult.success && jobResult.data.jobId) {
      console.log(`${colors.green}✓ Create Job PASSED${colors.reset}`);
      passedTests++;
      testData.jobId = jobResult.data.jobId;
    } else {
      console.log(`${colors.red}✗ Create Job FAILED${colors.reset}`);
      console.log(`  Error: ${JSON.stringify(jobResult.data)}`);
      failedTests++;
    }

    // Get specific job
    if (testData.jobId) {
      await testEndpoint('Get Job by ID', 'GET', `/jobs/${testData.jobId}`);
    }
  }

  // 4. APPLICATIONS
  console.log(`\n${colors.blue}=== 4. APPLICATIONS ===${colors.reset}`);

  if (tokens.student && testData.jobId) {
    // Submit Application
    const applicationData = {
      jobId: testData.jobId,
      coverLetter: 'I am very interested in this position and believe my skills make me a great fit.',
      resumeUrl: 'https://example.com/resume.pdf'
    };

    const appResult = await makeRequest('POST', '/applications/submit', applicationData, tokens.student);
    if (appResult.success) {
      console.log(`${colors.green}✓ Submit Application PASSED${colors.reset}`);
      passedTests++;
      testData.applicationId = appResult.data.applicationId;
    } else {
      console.log(`${colors.red}✗ Submit Application FAILED${colors.reset}`);
      failedTests++;
    }

    // Get Student Applications
    await testEndpoint(
      'Get Student Applications',
      'GET',
      '/applications/student',
      null,
      tokens.student,
      'applications'
    );
  }

  // 5. ADMIN FUNCTIONS
  console.log(`\n${colors.blue}=== 5. ADMIN FUNCTIONS ===${colors.reset}`);

  if (tokens.admin) {
    await testEndpoint('Get Users (Admin)', 'GET', '/admin/users', null, tokens.admin, 'users');
    await testEndpoint('Get Platform Metrics', 'GET', '/admin/metrics', null, tokens.admin, 'totals');
    await testEndpoint('Get Audit Logs', 'GET', '/admin/audit-logs', null, tokens.admin, 'logs');
  } else {
    console.log(`${colors.yellow}⚠ Skipping admin tests (no admin token)${colors.reset}`);
  }

  // 6. SECURITY TESTS
  console.log(`\n${colors.blue}=== 6. SECURITY TESTS ===${colors.reset}`);

  // Invalid Email
  await testEndpoint(
    'Invalid Email Validation',
    'POST',
    '/auth/register',
    { email: 'invalid-email', password: 'Test@123456', role: 'student' },
    undefined,
    'Validation failed'
  );

  // Weak Password
  await testEndpoint(
    'Weak Password Validation',
    'POST',
    '/auth/register',
    { email: 'test@test.com', password: 'weak', role: 'student' },
    undefined,
    'Validation failed'
  );

  // Unauthorized Access
  await testEndpoint(
    'Unauthorized Access',
    'GET',
    '/admin/users',
    null,
    undefined,
    'No token provided'
  );

  // Invalid Role Access
  if (tokens.student) {
    await testEndpoint(
      'Student accessing Admin endpoint',
      'GET',
      '/admin/users',
      null,
      tokens.student,
      'Access denied'
    );
  }

  // SUMMARY
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);

  const total = passedTests + failedTests;
  const percentage = total > 0 ? Math.round((passedTests / total) * 100) : 0;

  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${percentage}%\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}✅✅✅ ALL TESTS PASSED! ✅✅✅${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Common fixes:${colors.reset}`);
    console.log('1. Ensure emulators are running: firebase emulators:start');
    console.log('2. Run setup data: npm run setup-data');
    console.log('3. Fix admin role: npm run fix-admin\n');
  }

  // Cleanup (optional)
  if (process.env.CLEANUP_TEST_DATA === 'true') {
    console.log(`${colors.yellow}Cleaning up test data...${colors.reset}`);
    // Add cleanup logic here if needed
  }

  process.exit(failedTests === 0 ? 0 : 1);
}

// Error handler
process.on('unhandledRejection', (error: any) => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Check if API is reachable before starting tests
async function checkAPIConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log(`${colors.yellow}Checking API connection...${colors.reset}`);
  
  const isConnected = await checkAPIConnection();
  
  if (!isConnected) {
    console.error(`${colors.red}❌ Cannot connect to API at ${API_BASE}${colors.reset}`);
    console.error('Make sure Firebase emulators are running:');
    console.error('  firebase emulators:start');
    process.exit(1);
  }

  console.log(`${colors.green}✓ API is reachable${colors.reset}\n`);
  
  // Run the tests
  await runTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runTests, checkAPIConnection };
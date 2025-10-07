// Simplified Firebase mock for unit tests
export function makeFirebaseMocks() {
  const jobDocs = [
    {
      id: 'JOB-1',
      data: () => ({
        title: 'Frontend Intern',
        companyName: 'Acme',
        location: 'Kitchener',
        type: 'intern',
        status: 'active',
        createdAt: { toDate: () => new Date() },
      }),
    },
    {
      id: 'JOB-2',
      data: () => ({
        title: 'QA Intern',
        companyName: 'Globex',
        location: 'Waterloo',
        type: 'intern',
        status: 'active',
        createdAt: { toDate: () => new Date() },
      }),
    },
  ];

  const collection = vi.fn();
  const query = vi.fn();
  const where = vi.fn();
  const orderBy = vi.fn();
  const getDocs = vi.fn(async () => ({ docs: jobDocs }));

  const getAuth = vi.fn(() => ({
    currentUser: { uid: 'stu-1', email: 'a@x.com', getIdToken: async () => 'fake-token' },
  }));

  return {
    db: {} as any,
    auth: { getAuth },
    collection,
    query,
    where,
    orderBy,
    getDocs,
    __docs: { jobDocs },
  };
}

// __mocks__/firebase-admin.ts
const add = jest.fn();
const where = jest.fn().mockReturnThis();
const doc = jest.fn().mockReturnThis();
const get = jest.fn().mockResolvedValue({ empty: true, exists: false, data: () => ({}) });
const set = jest.fn().mockResolvedValue(undefined);
const update = jest.fn().mockResolvedValue(undefined);
const collection = jest.fn().mockReturnValue({ add, where, doc, get, set, update });

const firestore = () => ({ collection });
const auth = () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) });

const initializeApp = jest.fn();

const FieldValue = {
  serverTimestamp: jest.fn(),
  increment: jest.fn((n: number) => n),
} as unknown as typeof import('firebase-admin').firestore.FieldValue;

export { initializeApp, firestore, auth };
export const apps: any[] = [];
export const storage = () => ({ bucket: jest.fn() });
export const firestoreNamespace = { FieldValue }; // optional if you import namespaced
export default { initializeApp, firestore, auth, apps, storage };

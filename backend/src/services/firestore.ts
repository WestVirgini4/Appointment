import { db } from '../config/firebase.js';
import {
  CollectionReference,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
  WriteResult,
  Timestamp
} from 'firebase-admin/firestore';

// Helper function to remove undefined values
function cleanUndefinedValues(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

// Generic Firestore service class
export class FirestoreService<T> {
  protected collection: CollectionReference;

  constructor(collectionName: string) {
    this.collection = db.collection(collectionName);
  }

  // Create a new document
  async create(data: Partial<T>): Promise<{ id: string; data: T }> {
    const docData = cleanUndefinedValues({
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await this.collection.add(docData);
    const doc = await docRef.get();

    return {
      id: docRef.id,
      data: { id: docRef.id, ...doc.data() } as T
    };
  }

  // Get document by ID
  async getById(id: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as T;
  }

  // Get all documents
  async getAll(): Promise<T[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  // Update document
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const updateData = cleanUndefinedValues({
      ...data,
      updatedAt: Timestamp.now()
    });

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();

    return { id: updatedDoc.id, ...updatedDoc.data() } as T;
  }

  // Delete document
  async delete(id: string): Promise<boolean> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  // Query documents with conditions
  async query(
    field: string,
    operator: FirebaseFirestore.WhereFilterOp,
    value: any
  ): Promise<T[]> {
    const query = this.collection.where(field, operator, value);
    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  // Search documents (case-insensitive)
  async search(field: string, searchTerm: string): Promise<T[]> {
    const query = this.collection
      .where(field, '>=', searchTerm)
      .where(field, '<=', searchTerm + '\uf8ff');

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  // Get documents with pagination
  async getPaginated(limit: number, startAfter?: any): Promise<{
    docs: T[];
    hasMore: boolean;
    lastDoc?: any;
  }> {
    let query: Query = this.collection.limit(limit + 1);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    return {
      docs,
      hasMore: snapshot.docs.length > limit,
      lastDoc: snapshot.docs[limit - 1]
    };
  }
}

// Export Firestore database instance
export { db };
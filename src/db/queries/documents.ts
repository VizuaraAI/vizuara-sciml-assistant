import { eq, desc, and } from 'drizzle-orm';
import { db } from '../index';
import { documents, users, type Document, type NewDocument, type DocumentType } from '../schema';

export async function getDocumentById(id: string): Promise<Document | null> {
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0] || null;
}

export async function getDocumentsByStudentId(studentId: string): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.studentId, studentId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentsByType(documentType: DocumentType): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.documentType, documentType))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentsForStudent(
  studentId: string,
  documentType?: DocumentType
): Promise<Document[]> {
  if (documentType) {
    return db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.studentId, studentId),
          eq(documents.documentType, documentType)
        )
      )
      .orderBy(desc(documents.createdAt));
  }
  return getDocumentsByStudentId(studentId);
}

export async function getAllDocuments(): Promise<Document[]> {
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function getKnowledgeResources(): Promise<Document[]> {
  // Knowledge resources are documents with no studentId (general resources)
  return db
    .select()
    .from(documents)
    .where(eq(documents.documentType, 'knowledge_resource'))
    .orderBy(desc(documents.createdAt));
}

export async function createDocument(data: NewDocument): Promise<Document> {
  const result = await db.insert(documents).values(data).returning();
  return result[0];
}

export async function deleteDocument(id: string): Promise<void> {
  await db.delete(documents).where(eq(documents.id, id));
}

// Get documents with uploader info
export async function getDocumentsWithUploader(studentId?: string) {
  const baseQuery = db
    .select({
      document: documents,
      uploaderName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploadedBy, users.id))
    .orderBy(desc(documents.createdAt));

  if (studentId) {
    return baseQuery.where(eq(documents.studentId, studentId));
  }
  return baseQuery;
}

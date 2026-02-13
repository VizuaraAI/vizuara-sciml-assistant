/**
 * Documents API
 * List and manage uploaded documents
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllDocuments,
  getDocumentsForStudent,
  getDocumentsByType,
  getDocumentsWithUploader,
  deleteDocument,
  getDocumentById
} from '@/db/queries/documents';
import { createClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/db/schema';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_NAME = 'documents';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const documentType = searchParams.get('documentType') as DocumentType | null;

    let documents;

    if (studentId) {
      documents = await getDocumentsWithUploader(studentId);
    } else if (documentType) {
      documents = await getDocumentsByType(documentType);
    } else {
      documents = await getDocumentsWithUploader();
    }

    // Format the response
    const formattedDocs = documents.map((d: any) => ({
      id: d.document.id,
      studentId: d.document.studentId,
      documentType: d.document.documentType,
      filename: d.document.filename,
      originalFilename: d.document.originalFilename,
      mimeType: d.document.mimeType,
      fileSize: d.document.fileSize,
      publicUrl: d.document.publicUrl,
      description: d.document.description,
      uploadedBy: d.uploaderName || 'Unknown',
      createdAt: d.document.createdAt,
      fileSizeFormatted: formatFileSize(d.document.fileSize),
    }));

    return NextResponse.json({
      success: true,
      data: { documents: formattedDocs },
    });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document to find storage path
    const document = await getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from Supabase storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([document.storagePath]);

    if (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Continue anyway - delete from database
    }

    // Delete from database
    await deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

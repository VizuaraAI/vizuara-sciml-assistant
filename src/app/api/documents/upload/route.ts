/**
 * Document Upload API
 * Handles file uploads to Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createDocument } from '@/db/queries/documents';
import { getUserByEmail } from '@/db/queries/users';
import type { DocumentType } from '@/db/schema';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_NAME = 'documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Text and code
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/x-python',
  'text/x-julia',
  'application/x-python-code',
  'application/json',
  'application/javascript',
  'text/javascript',
  'text/typescript',
  'text/x-typescript',
  // Jupyter notebooks
  'application/x-ipynb+json',
  // Allow any text-based files (catch-all for code files)
  'application/octet-stream',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const studentId = formData.get('studentId') as string | null;
    const description = formData.get('description') as string | null;
    const uploaderEmail = formData.get('uploaderEmail') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type is required' },
        { status: 400 }
      );
    }

    if (!uploaderEmail) {
      return NextResponse.json(
        { success: false, error: 'Uploader email is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Get uploader user ID
    const uploader = await getUserByEmail(uploaderEmail);
    if (!uploader) {
      return NextResponse.json(
        { success: false, error: 'Uploader not found' },
        { status: 404 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedName}`;

    // Determine storage path based on document type
    let storagePath: string;
    if (studentId) {
      storagePath = `students/${studentId}/${documentType}/${filename}`;
    } else {
      storagePath = `shared/${documentType}/${filename}`;
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure bucket exists (create if not)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Failed to list buckets:', listError);
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    console.log('Bucket check:', { bucketExists, bucketsFound: buckets?.map(b => b.name) });

    if (!bucketExists) {
      console.log('Creating bucket:', BUCKET_NAME);
      const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });

      if (createError) {
        console.error('Failed to create bucket:', createError);
        // If bucket creation fails, it might already exist or we don't have permission
        // Try to continue anyway - the upload will fail if bucket truly doesn't exist
      } else {
        console.log('Bucket created successfully:', createData);
      }
    }

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // Save document record to database
    const document = await createDocument({
      studentId: studentId || undefined,
      uploadedBy: uploader.id,
      documentType,
      filename,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storagePath,
      publicUrl: urlData.publicUrl,
      description: description || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        document,
        message: `File "${file.name}" uploaded successfully`,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

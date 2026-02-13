/**
 * Document Parser Service
 * Extracts text content from various file formats for LLM context
 * Supports: PDF, DOCX, XLSX/XLS, Images, TXT, Markdown
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ParsedDocument {
  success: boolean;
  content?: string;
  mimeType: string;
  filename: string;
  error?: string;
  isImage?: boolean;
  imageBase64?: string;
}

/**
 * Parse a document and extract its text content
 * For images, returns base64 data for vision models
 */
export async function parseDocument(
  storagePath: string,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    // Download file from Supabase storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (error || !data) {
      return {
        success: false,
        mimeType,
        filename,
        error: `Failed to download file: ${error?.message || 'Unknown error'}`,
      };
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    // Route to appropriate parser based on mime type
    if (mimeType === 'application/pdf') {
      return await parsePDF(buffer, mimeType, filename);
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDOCX(buffer, mimeType, filename);
    }

    if (mimeType === 'application/msword') {
      // Old .doc format - limited support
      return {
        success: false,
        mimeType,
        filename,
        error: 'Legacy .doc format not supported. Please convert to .docx',
      };
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      return await parseExcel(buffer, mimeType, filename);
    }

    if (mimeType.startsWith('image/')) {
      return await parseImage(buffer, mimeType, filename);
    }

    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return {
        success: true,
        content: buffer.toString('utf-8'),
        mimeType,
        filename,
      };
    }

    return {
      success: false,
      mimeType,
      filename,
      error: `Unsupported file type: ${mimeType}`,
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    return {
      success: false,
      mimeType,
      filename,
      error: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse PDF and extract text
 */
async function parsePDF(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    // Dynamic import with type assertion to handle ESM/CJS compatibility
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);

    return {
      success: true,
      content: result.text,
      mimeType,
      filename,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      mimeType,
      filename,
      error: `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse DOCX and extract text
 */
async function parseDOCX(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    return {
      success: true,
      content: result.value,
      mimeType,
      filename,
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    return {
      success: false,
      mimeType,
      filename,
      error: `DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse Excel and extract data as formatted text
 */
async function parseExcel(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let content = '';

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      content += `\n## Sheet: ${sheetName}\n\n`;

      // Convert to CSV for readable format
      const csv = XLSX.utils.sheet_to_csv(sheet);
      content += csv + '\n';
    }

    return {
      success: true,
      content: content.trim(),
      mimeType,
      filename,
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      mimeType,
      filename,
      error: `Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse image - return base64 for vision model
 */
async function parseImage(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    // Convert to base64 for GPT-4o vision
    const base64 = buffer.toString('base64');

    return {
      success: true,
      mimeType,
      filename,
      isImage: true,
      imageBase64: base64,
      content: `[Image: ${filename}]`, // Placeholder text for context
    };
  } catch (error) {
    console.error('Image processing error:', error);
    return {
      success: false,
      mimeType,
      filename,
      error: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse multiple documents and combine their content
 */
export async function parseMultipleDocuments(
  documents: Array<{ storagePath: string; mimeType: string; filename: string }>
): Promise<{
  textContent: string;
  images: Array<{ base64: string; mimeType: string; filename: string }>;
  errors: string[];
}> {
  const textContent: string[] = [];
  const images: Array<{ base64: string; mimeType: string; filename: string }> = [];
  const errors: string[] = [];

  for (const doc of documents) {
    const result = await parseDocument(doc.storagePath, doc.mimeType, doc.filename);

    if (result.success) {
      if (result.isImage && result.imageBase64) {
        images.push({
          base64: result.imageBase64,
          mimeType: result.mimeType,
          filename: result.filename,
        });
      } else if (result.content) {
        textContent.push(`\n--- Content from: ${result.filename} ---\n${result.content}`);
      }
    } else if (result.error) {
      errors.push(`${result.filename}: ${result.error}`);
    }
  }

  return {
    textContent: textContent.join('\n\n'),
    images,
    errors,
  };
}

/**
 * Format document content for LLM context
 */
export function formatDocumentContext(
  textContent: string,
  imageCount: number
): string {
  let context = '';

  if (textContent) {
    context += `\n\n<attached_documents>\n${textContent}\n</attached_documents>`;
  }

  if (imageCount > 0) {
    context += `\n\n[${imageCount} image(s) attached - visible in the conversation]`;
  }

  return context;
}

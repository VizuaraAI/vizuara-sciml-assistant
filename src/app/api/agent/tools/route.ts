/**
 * Tools Debug API Endpoint
 * GET /api/agent/tools - List all available tools
 */

import { NextResponse } from 'next/server';
import { createFullToolRegistry } from '@/services/agent';

export async function GET() {
  try {
    const registry = createFullToolRegistry();
    const tools = registry.getTools();

    return NextResponse.json({
      success: true,
      data: {
        count: tools.length,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema.properties,
          required: tool.input_schema.required,
        })),
      },
    });
  } catch (error) {
    console.error('Tools API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

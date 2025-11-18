import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

// Owner submits admin's code for verification
export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return errorResponse('Unauthorized', 401);

    // Single-code flow deprecates owner submitting admin code. Provide gentle guidance.
    return successResponse({ message: 'No action required. Show your code to the admin — they will verify it.' });

    // Old logic removed (single-code flow)
  } catch (error) {
    return handleApiError(error);
  }
}

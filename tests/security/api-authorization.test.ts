import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserProfile = vi.fn();
const createServiceClient = vi.fn();
const createClient = vi.fn();
const createVideo = vi.fn();
const getVideoById = vi.fn();
const updateVideo = vi.fn();
const deleteVideo = vi.fn();
const calculateVideoRevenue = vi.fn();

vi.mock('@/lib/rbac', () => ({ getCurrentUserProfile }));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient }));
vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/queries/videos', () => ({
  createVideo,
  getPlayerVideos: vi.fn(),
  getVideoById,
  updateVideo,
  deleteVideo,
}));
vi.mock('@/lib/queries/revenue', () => ({
  calculateVideoRevenue,
  getTeamVideosCount: vi.fn(),
}));

const playerProfile = {
  id: 'user-1',
  email: 'player@example.com',
  role: 'player',
  display_name: 'Player One',
  avatar_url: null,
  player_id: 'player-1',
};

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Phase 0 API authorization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects unauthenticated pending-award reads before creating a service client', async () => {
    getCurrentUserProfile.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/awards/pending/route');

    const response = await GET();

    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('rejects non-admin award mutations before creating a service client', async () => {
    getCurrentUserProfile.mockResolvedValue(playerProfile);
    const { PATCH } = await import('@/app/api/admin/awards/[id]/route');

    const response = await PATCH(
      jsonRequest('http://localhost/api/admin/awards/award-1', 'PATCH', { name: 'Changed' }),
      { params: Promise.resolve({ id: 'award-1' }) },
    );

    expect(response.status).toBe(403);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it('derives video ownership from the authenticated profile', async () => {
    getCurrentUserProfile.mockResolvedValue(playerProfile);
    const playerQuery = {
      select: vi.fn(() => playerQuery),
      eq: vi.fn(() => playerQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: 'player-1' }, error: null })),
    };
    createClient.mockResolvedValue({ from: vi.fn(() => playerQuery) });
    createVideo.mockResolvedValue({ id: 'video-1' });
    const { POST } = await import('@/app/api/dashboard/videos/route');

    const response = await POST(
      jsonRequest('http://localhost/api/dashboard/videos', 'POST', {
        player_id: 'attacker-player',
        owner_user_id: 'attacker-user',
        title: ' My video ',
        visibility: 'public',
      }),
    );

    expect(response.status).toBe(200);
    expect(createVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        player_id: 'player-1',
        owner_user_id: 'user-1',
        title: 'My video',
      }),
    );
  });

  it('blocks updates to another athlete video', async () => {
    getCurrentUserProfile.mockResolvedValue(playerProfile);
    getVideoById.mockResolvedValue({
      id: 'video-2',
      owner_user_id: 'user-2',
      player_id: 'player-2',
    });
    const ownershipQuery = {
      select: vi.fn(() => ownershipQuery),
      eq: vi.fn(() => ownershipQuery),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    createClient.mockResolvedValue({ from: vi.fn(() => ownershipQuery) });
    const { PUT } = await import('@/app/api/dashboard/videos/[id]/route');

    const response = await PUT(
      jsonRequest('http://localhost/api/dashboard/videos/video-2', 'PUT', { title: 'Hijacked' }),
      { params: Promise.resolve({ id: 'video-2' }) },
    );

    expect(response.status).toBe(403);
    expect(updateVideo).not.toHaveBeenCalled();
  });

  it('limits revenue recalculation to admins', async () => {
    getCurrentUserProfile.mockResolvedValue(playerProfile);
    const { POST } = await import('@/app/api/revenue/calculate/route');

    const response = await POST(
      jsonRequest('http://localhost/api/revenue/calculate', 'POST', {}),
    );

    expect(response.status).toBe(403);
    expect(calculateVideoRevenue).not.toHaveBeenCalled();
  });
});

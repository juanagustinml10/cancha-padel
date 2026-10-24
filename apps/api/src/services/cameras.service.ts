import type { CamerasOverview } from '@padel/shared';

export function getCamerasOverview(): CamerasOverview {
  return {
    status: 'NOT_CONFIGURED',
    cameras: [],
    checkedAt: new Date().toISOString(),
  };
}

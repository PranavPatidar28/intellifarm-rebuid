import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/session/session-provider';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { flushPendingDiseaseUploads } from '@/lib/disease-upload';

export function PendingUploadSync() {
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { token } = useSession();

  useEffect(() => {
    if (!token || network.isOffline) {
      return;
    }

    let active = true;

    void flushPendingDiseaseUploads(token).then((syncedCount) => {
      if (!active || syncedCount === 0) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token] });
      void queryClient.invalidateQueries({ queryKey: ['disease-reports', token] });
    });

    return () => {
      active = false;
    };
  }, [network.isOffline, queryClient, token]);

  return null;
}

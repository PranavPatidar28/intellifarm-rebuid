import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/session/session-provider';
import { flushPendingExpenseMutations } from '@/lib/pending-expense-mutations';
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

    void Promise.all([
      flushPendingDiseaseUploads(token),
      flushPendingExpenseMutations(token),
    ]).then(([syncedDiseaseCount, syncedExpenseCount]) => {
      if (!active || syncedDiseaseCount + syncedExpenseCount === 0) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token] });
      void queryClient.invalidateQueries({ queryKey: ['disease-reports', token] });
      void queryClient.invalidateQueries({ queryKey: ['expenses', token] });
      void queryClient.invalidateQueries({ queryKey: ['expense-summary', token] });
    });

    return () => {
      active = false;
    };
  }, [network.isOffline, queryClient, token]);

  return null;
}

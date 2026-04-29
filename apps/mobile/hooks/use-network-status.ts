import { useEffect, useState } from 'react';

import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const state = await Network.getNetworkStateAsync();
      if (!active) {
        return;
      }

      setIsConnected(Boolean(state.isConnected));
      setIsInternetReachable(state.isInternetReachable ?? Boolean(state.isConnected));
    };

    void sync();
    const interval = setInterval(() => {
      void sync();
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: !isConnected || !isInternetReachable,
  };
}

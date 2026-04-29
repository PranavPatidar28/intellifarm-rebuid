import { useCallback, useState } from 'react';

import * as Location from 'expo-location';

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

export function useDeviceLocation() {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  const refreshLocation = useCallback(async () => {
    setStatus('loading');
    setMessage(null);

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setStatus('error');
      setMessage('Location permission was not granted.');
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setStatus('ready');
      setMessage('Using current GPS location.');
    } catch {
      setStatus('error');
      setMessage('Could not read the current location right now.');
    }
  }, []);

  return {
    location,
    status,
    message,
    refreshLocation,
  };
}

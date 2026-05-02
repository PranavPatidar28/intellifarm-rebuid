import { useCallback, useState } from 'react';

import * as Location from 'expo-location';

const DEFAULT_LOCATION_LABEL = 'Bhopal, MP';

type DeviceLocation = {
  latitude: number;
  longitude: number;
  label: string | null;
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

      const placemarks = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      const label = formatLocationLabel(placemarks[0]) ?? DEFAULT_LOCATION_LABEL;

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        label,
      });
      setStatus('ready');
      setMessage(`Using ${label}.`);
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

function formatLocationLabel(
  placemark: Location.LocationGeocodedAddress | null | undefined,
) {
  if (!placemark) {
    return null;
  }

  const locality =
    placemark.city ||
    placemark.subregion ||
    placemark.district ||
    placemark.region ||
    null;
  const area =
    placemark.district ||
    placemark.subregion ||
    placemark.region ||
    placemark.country ||
    null;

  const parts = [locality, area].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  );

  return parts.length ? parts.join(', ') : null;
}

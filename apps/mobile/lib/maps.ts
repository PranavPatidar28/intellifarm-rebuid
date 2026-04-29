import { Linking } from 'react-native';

export async function openExternalMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label?: string;
}) {
  const encodedLabel = label ? encodeURIComponent(label) : 'Farm location';
  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}(${encodedLabel})`;
  await Linking.openURL(url);
}

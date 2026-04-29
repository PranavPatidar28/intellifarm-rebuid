import { WeatherHeroCard } from '@/components/weather-hero-card';
import type { WeatherResponse } from '@/lib/api-types';

export function WeatherActionCard({
  weather,
  onOpen,
}: {
  weather: WeatherResponse['weather'] | null;
  onOpen?: () => void;
}) {
  return <WeatherHeroCard weather={weather} onOpen={onOpen} />;
}

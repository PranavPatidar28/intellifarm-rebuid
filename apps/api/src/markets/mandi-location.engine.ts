import { Injectable, Logger } from '@nestjs/common';

export type Coordinates = { latitude: number; longitude: number };

@Injectable()
export class MandiLocationEngine {
  private readonly logger = new Logger(MandiLocationEngine.name);

  // In-memory cache to ensure we never query Nominatim for the same mandi twice.
  // Using a Promise cache handles concurrent requests seamlessly.
  private readonly cache = new Map<string, Promise<Coordinates | null>>();

  // To respect Nominatim's 1 req/sec policy loosely
  private lastRequestTime = 0;

  /**
   * Retrieves exact coordinates for a mandi via OpenStreetMap Nominatim.
   */
  async getCoordinates(
    mandiName: string,
    district: string,
    state: string,
  ): Promise<Coordinates | null> {
    const cacheKey = `${mandiName}|${district}|${state}`.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const geocodePromise = this.fetchFromNominatim(mandiName, district, state);
    this.cache.set(cacheKey, geocodePromise);

    try {
      const result = await geocodePromise;
      if (!result) {
        // If exact mandi fails, fallback to District center
        this.logger.debug(`Exact mandi failed for ${mandiName}, falling back to district ${district}`);
        return await this.fetchFromNominatim('', district, state);
      }
      return result;
    } catch (error) {
      this.logger.error(`Geocoding failed for ${cacheKey}:`, error);
      return null;
    }
  }

  private async fetchFromNominatim(
    mandiName: string,
    district: string,
    state: string,
  ): Promise<Coordinates | null> {
    // Throttle to avoid aggressive rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < 1100) {
      await new Promise((resolve) => setTimeout(resolve, 1100 - (now - this.lastRequestTime)));
    }
    this.lastRequestTime = Date.now();

    const queryParts = [];
    if (mandiName) {
      // Clean up mandi name, sometimes API has "(F&V)" or similar
      let cleanName = mandiName.replace(/\([^)]*\)/g, '').trim();
      if (!cleanName.toLowerCase().includes('mandi')) {
        cleanName += ' Mandi';
      }
      queryParts.push(cleanName);
    }
    queryParts.push(district);
    queryParts.push(state);
    queryParts.push('India');

    const query = queryParts.join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Intellifarm-Hackathon/1.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (data && data.length > 0) {
        return {
          latitude: Number.parseFloat(data[0].lat),
          longitude: Number.parseFloat(data[0].lon),
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

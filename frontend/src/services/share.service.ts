// Share service for sharing locations and routes

export interface ShareableLocation {
  coordinates: { longitude: number; latitude: number };
  name?: string;
  address?: string;
}

export interface ShareableRoute {
  waypoints: Array<{ coordinates: { longitude: number; latitude: number }; name?: string }>;
  profile: string;
  distance?: number;
  duration?: number;
}

export class ShareService {
  /**
   * Generate a shareable URL for a location
   */
  generateLocationUrl(location: ShareableLocation): string {
    const params = new URLSearchParams();
    params.set('lat', location.coordinates.latitude.toString());
    params.set('lng', location.coordinates.longitude.toString());
    if (location.name) params.set('name', encodeURIComponent(location.name));
    if (location.address) params.set('address', encodeURIComponent(location.address));
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Generate a shareable URL for a route
   */
  generateRouteUrl(route: ShareableRoute): string {
    const params = new URLSearchParams();
    params.set('route', 'true');
    params.set('profile', route.profile);
    
    route.waypoints.forEach((wp, index) => {
      params.set(`wp${index}_lat`, wp.coordinates.latitude.toString());
      params.set(`wp${index}_lng`, wp.coordinates.longitude.toString());
      if (wp.name) params.set(`wp${index}_name`, encodeURIComponent(wp.name));
    });
    
    if (route.distance) params.set('distance', route.distance.toString());
    if (route.duration) params.set('duration', route.duration.toString());
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Share using Web Share API (if available)
   */
  async shareNative(data: { title: string; text: string; url: string }): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
        return false;
      }
    }
    return false;
  }

  /**
   * Share location using native share or clipboard
   */
  async shareLocation(location: ShareableLocation): Promise<boolean> {
    const url = this.generateLocationUrl(location);
    const shareData = {
      title: location.name || 'Location',
      text: location.address || `Location at ${location.coordinates.latitude}, ${location.coordinates.longitude}`,
      url,
    };

    // Try native share first
    const shared = await this.shareNative(shareData);
    if (shared) return true;

    // Fallback to clipboard
    return this.copyToClipboard(url);
  }

  /**
   * Share route using native share or clipboard
   */
  async shareRoute(route: ShareableRoute): Promise<boolean> {
    const url = this.generateRouteUrl(route);
    const waypointsText = route.waypoints.map(wp => wp.name || `${wp.coordinates.latitude}, ${wp.coordinates.longitude}`).join(' → ');
    
    const shareData = {
      title: 'Route',
      text: `Route: ${waypointsText}`,
      url,
    };

    // Try native share first
    const shared = await this.shareNative(shareData);
    if (shared) return true;

    // Fallback to clipboard
    return this.copyToClipboard(url);
  }

  /**
   * Parse shared location from URL parameters
   */
  parseLocationUrl(): ShareableLocation | null {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    
    if (!lat || !lng) return null;
    
    return {
      coordinates: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      },
      name: params.get('name') ? decodeURIComponent(params.get('name')!) : undefined,
      address: params.get('address') ? decodeURIComponent(params.get('address')!) : undefined,
    };
  }

  /**
   * Parse shared route from URL parameters
   */
  parseRouteUrl(): ShareableRoute | null {
    const params = new URLSearchParams(window.location.search);
    if (params.get('route') !== 'true') return null;
    
    const profile = params.get('profile');
    if (!profile) return null;
    
    const waypoints: Array<{ coordinates: { longitude: number; latitude: number }; name?: string }> = [];
    let index = 0;
    
    while (params.has(`wp${index}_lat`) && params.has(`wp${index}_lng`)) {
      const lat = parseFloat(params.get(`wp${index}_lat`)!);
      const lng = parseFloat(params.get(`wp${index}_lng`)!);
      const name = params.get(`wp${index}_name`) ? decodeURIComponent(params.get(`wp${index}_name`)!) : undefined;
      
      waypoints.push({
        coordinates: { latitude: lat, longitude: lng },
        name,
      });
      
      index++;
    }
    
    if (waypoints.length === 0) return null;
    
    return {
      waypoints,
      profile,
      distance: params.get('distance') ? parseFloat(params.get('distance')!) : undefined,
      duration: params.get('duration') ? parseFloat(params.get('duration')!) : undefined,
    };
  }
}

export const shareService = new ShareService();


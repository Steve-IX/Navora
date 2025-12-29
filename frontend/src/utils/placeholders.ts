/**
 * Generates a placeholder image as an SVG data URI
 * @param text - Text to display in the placeholder (e.g., place name or number)
 * @param width - Width of the placeholder image
 * @param height - Height of the placeholder image
 * @returns Data URI string for the placeholder image
 */
export function getPlaceholderImage(text: string, width: number = 800, height: number = 600): string {
  // Escape special characters for SVG
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Create SVG with gray background and centered text
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(width, height) / 8}" 
        fill="#6b7280" 
        text-anchor="middle" 
        dominant-baseline="middle"
        font-weight="500"
      >
        ${escapedText}
      </text>
    </svg>
  `.trim();

  // Convert to base64 data URI
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generates a placeholder image for photo thumbnails
 * @param index - Index number to display (0-based, will show as 1-based)
 * @param width - Width of the placeholder image
 * @param height - Height of the placeholder image
 * @returns Data URI string for the placeholder image
 */
export function getPlaceholderThumbnail(index: number, width: number = 100, height: number = 100): string {
  return getPlaceholderImage(String(index + 1), width, height);
}


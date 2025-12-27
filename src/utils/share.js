// src/utils/share.js
import LZString from 'lz-string';

/**
 * Compresses data into a URL-safe string and appends it to the current URL hash.
 * @param {Object} data - The data object to compress.
 * @returns {string} - The full shareable URL.
 */
export const createSnapshotUrl = (data) => {
  // 1. Separate images from text data (Images are too large for URLs)
  // eslint-disable-next-line no-unused-vars
  const { skuImages, ...textData } = data;
  
  // 2. Serialize and Compress
  const json = JSON.stringify(textData);
  const compressed = LZString.compressToEncodedURIComponent(json);
  
  // 3. Construct URL with hash
  return `${window.location.origin}${window.location.pathname}#snapshot=${compressed}`;
};

/**
 * Checks the URL hash for a snapshot and parses it if it exists.
 * @returns {Object|null} - The parsed data object or null.
 */
export const parseSnapshotFromUrl = () => {
  const hash = window.location.hash;
  
  if (!hash || !hash.includes('snapshot=')) return null;

  try {
    // Extract the compressed string after '#snapshot='
    const compressed = hash.split('snapshot=')[1];
    
    // Decompress and Parse
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to parse snapshot from URL", e);
    return null;
  }
};

/**
 * Attempts to shorten a long URL using the TinyURL public API.
 * @param {string} longUrl 
 * @returns {Promise<string|null>} The short URL or null if failed.
 */
export const shortenUrl = async (longUrl) => {
  try {
    // Check length before sending (Approx check to avoid massive payloads crashing the fetch)
    if (longUrl.length > 8000) {
      console.warn("URL too long for shortening service");
      return null;
    }

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (e) {
    console.warn("Link shortening failed", e);
    return null; 
  }
};
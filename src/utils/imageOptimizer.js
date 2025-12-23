// src/utils/imageOptimizer.js

export const optimizeImageLibrary = async (skuImages) => {
  const optimized = {};
  const entries = Object.entries(skuImages);
  
  // Create a canvas once to reuse
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const MAX_WIDTH = 150;

  // Loop through all images
  for (const [sku, src] of entries) {
    if (!src) continue;

    try {
      // 1. Load image
      const img = new Image();
      img.src = src;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 2. Calculate new size
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      // 3. Draw to canvas with white background
      canvas.width = width;
      canvas.height = height;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // 4. Export as efficient JPEG string
      optimized[sku] = canvas.toDataURL('image/jpeg', 0.8);
      
    } catch (err) {
      console.error(`Failed to optimize image for ${sku}`, err);
      // If it fails, keep the original
      optimized[sku] = src;
    }
  }

  return optimized;
};
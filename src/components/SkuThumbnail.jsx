// src/components/SkuThumbnail.jsx
import React, { useState, useEffect } from 'react';

export const SkuThumbnail = ({ blobOrString, alt, className }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!blobOrString) {
      setSrc(null);
      return;
    }

    // If it's already a string (base64 or http url), use it directly
    if (typeof blobOrString === 'string') {
      setSrc(blobOrString);
      return;
    }

    // If it's a Blob/File, create a temporary ObjectURL
    if (blobOrString instanceof Blob) {
      const url = URL.createObjectURL(blobOrString);
      setSrc(url);
      
      // Cleanup: Revoke URL when component unmounts or blob changes to free memory
      return () => URL.revokeObjectURL(url);
    }
  }, [blobOrString]);

  if (!src) return null;

  return (
    <img 
      src={src} 
      alt={alt || ''} 
      className={className || "w-6 h-6 rounded mr-2 object-cover border dark:border-gray-600"} 
    />
  );
};
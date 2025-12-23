// src/components/SkuImage.jsx
import React, { useState, useEffect } from 'react';

export const SkuImage = ({ data, alt = '', className = '' }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!data) {
      setSrc(null);
      return;
    }

    if (data instanceof Blob) {
      // It's a raw file (fast upload) -> Create Object URL
      const url = URL.createObjectURL(data);
      setSrc(url);
      
      // Cleanup memory when component unmounts or data changes
      return () => URL.revokeObjectURL(url);
    } else {
      // It's a Base64 string (from JSON import) -> Use directly
      setSrc(data);
    }
  }, [data]);

  if (!src) return null;

  return <img src={src} alt={alt} className={className} />;
};
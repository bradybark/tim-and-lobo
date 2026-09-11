/**
 * Returns an image source that can be embedded in generated HTML.
 *
 * Uploaded and permanently stored logos are Blob/File objects, while JSON
 * backups and cloud sync restore them as data URL strings. Printing must
 * support both representations because they are both valid application data.
 */
export const blobToDataUrl = (blob) => {
  if (!(blob instanceof Blob)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);

    try {
      reader.readAsDataURL(blob);
    } catch {
      resolve(null);
    }
  });
};

export const imageToDataUrl = (image) => {
  if (!image) return Promise.resolve(null);

  if (typeof image === 'string') {
    return Promise.resolve(image.startsWith('data:image/') ? image : null);
  }

  return blobToDataUrl(image);
};

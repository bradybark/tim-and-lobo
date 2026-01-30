// src/components/FileUploader.jsx
import React, { useRef } from 'react';
import { Icons } from './Icons';

export function FileUploader({ onUpload, currentFile, className = '', label = 'Upload' }) {
  const fileInputRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = ''; // Reset
  };

  const isFile = currentFile instanceof Blob || currentFile instanceof File;

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
          isFile
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
        }`}
      >
        {isFile ? <Icons.Check className="w-3 h-3" /> : <Icons.Paperclip className="w-3 h-3" />}
        {isFile ? 'File Saved' : label}
      </button>
    </div>
  );
}
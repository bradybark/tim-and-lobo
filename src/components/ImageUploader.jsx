// src/components/ImageUploader.jsx
import React, { useRef } from 'react'
import { Icons } from './Icons'

export function ImageUploader({
  imageKey,
  currentImage,
  onUpload,
  className = '',
  placeholder,
  objectFit = 'cover',
}) {
  const fileInputRef = useRef(null)

  const handleClick = (e) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      onUpload(imageKey, reader.result)
    }
    reader.readAsDataURL(file)
  }

  const containerClasses = `cursor-pointer overflow-hidden relative group flex items-center justify-center ${className}`
  const emptyStateClasses = currentImage
    ? ''
    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'

  return (
    <div className="relative inline-block w-full h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={handleClick}
        className={`${containerClasses} ${emptyStateClasses}`}
        title="Upload image"
      >
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Uploaded"
              className={`w-full h-full object-${objectFit} object-center`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 scale-75">
                <Icons.Camera />
              </span>
            </div>
          </>
        ) : (
          placeholder || (
            <span className="text-gray-400">
              <Icons.Upload />
            </span>
          )
        )}
      </div>
    </div>
  )
}

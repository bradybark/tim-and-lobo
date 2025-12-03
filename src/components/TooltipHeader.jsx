// src/components/TooltipHeader.jsx
import React from 'react'
import { Icons } from './Icons'

export function TooltipHeader({ title, tooltip, className = '' }) {
  return (
    <div className={`group relative inline-flex items-center gap-1 cursor-help ${className}`}>
      <span>{title}</span>
      <Icons.HelpCircle />
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center font-normal normal-case border border-gray-700">
        {tooltip}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
      </div>
    </div>
  )
}

// src/components/SortableHeaderCell.jsx
import React from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { TooltipHeader } from './TooltipHeader';

export const SortableHeaderCell = ({ 
  label, 
  sortKey, 
  currentSort, 
  onSort, 
  onFilter, 
  filterValue, 
  className = "",
  tooltip = null
}) => {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase align-top ${className}`}>
      {/* Top Row: Label & Sort Icon */}
      <div 
        className={`flex items-center justify-between cursor-pointer gap-1 mb-2 hover:text-gray-700 dark:hover:text-white select-none`}
        onClick={() => onSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {tooltip ? (
            <TooltipHeader title={label} tooltip={tooltip} />
          ) : (
            <span>{label}</span>
          )}
        </div>
        
        <div className="flex flex-col text-gray-400">
          {currentSort.key === sortKey ? (
             currentSort.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} className="text-indigo-500" />
          ) : (
            <div className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50"></div> 
          )}
        </div>
      </div>

      {/* Bottom Row: Filter Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Filter..."
          value={filterValue || ''}
          onChange={(e) => onFilter(sortKey, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 outline-none placeholder-gray-400"
        />
        <Search className="absolute right-1.5 top-1.5 text-gray-300 w-3 h-3 pointer-events-none" />
      </div>
    </th>
  );
};
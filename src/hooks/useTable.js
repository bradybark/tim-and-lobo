// src/hooks/useTable.js
import { useState, useMemo } from 'react';

// Helper to access nested properties like 'settings.leadTime'
const getValue = (item, path) => {
  if (!path) return '';
  // If path is a function, call it with the item
  if (typeof path === 'function') return path(item);
  
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : '', item);
};

export const useTable = (data, defaultSort = { key: null, direction: 'asc' }) => {
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [filters, setFilters] = useState({});

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const processedData = useMemo(() => {
    let sortableItems = [...data];

    // 1. Filter
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key].toLowerCase();
      if (filterValue) {
        sortableItems = sortableItems.filter((item) => {
          const itemVal = String(getValue(item, key)).toLowerCase();
          return itemVal.includes(filterValue);
        });
      }
    });

    // 2. Sort
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = getValue(a, sortConfig.key);
        const bVal = getValue(b, sortConfig.key);

        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle strings/dates
        const aString = String(aVal).toLowerCase();
        const bString = String(bVal).toLowerCase();
        
        if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [data, sortConfig, filters]);

  return { processedData, sortConfig, handleSort, filters, handleFilter };
};
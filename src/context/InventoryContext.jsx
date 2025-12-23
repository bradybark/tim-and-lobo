// src/context/InventoryContext.jsx
import React, { createContext, useContext } from 'react';
import { useInventoryData } from '../hooks/useInventoryData';

const InventoryContext = createContext(null);

export const InventoryProvider = ({ orgKey, children }) => {
  const inventoryData = useInventoryData(orgKey);

  return (
    <InventoryContext.Provider value={inventoryData}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
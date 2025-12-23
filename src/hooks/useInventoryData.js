// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import {
  LOBO_SNAPSHOTS, LOBO_POS, LOBO_SETTINGS, LOBO_VENDORS,
  TIMOTHY_SNAPSHOTS, TIMOTHY_POS, TIMOTHY_SETTINGS, TIMOTHY_VENDORS
} from '../constants/seedData'; // Adjust path if necessary based on your folder structure

export function useInventoryData(orgKey) {
  const isTimothy = orgKey === 'timothy';
  const [dataLoaded, setDataLoaded] = useState(false);

  // Data States
  const [snapshots, setSnapshots] = useState([]);
  const [pos, setPos] = useState([]);
  const [settings, setSettings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [skuImages, setSkuImages] = useState({});

  // 1. Load Data
  useEffect(() => {
    async function loadAllData() {
      try {
        // Helper to load from IDB with LocalStorage fallback/migration
        const load = async (key, fallback) => {
          let val = await get(key);
          if (!val) {
            const lsVal = localStorage.getItem(key);
            if (lsVal) {
              try {
                val = JSON.parse(lsVal);
                await set(key, val);
                console.log(`Migrated ${key} from LocalStorage to IndexedDB`);
              } catch (e) { console.error(e); }
            }
          }
          return val || fallback;
        };

        const savedSnaps = await load(`${orgKey}_snapshots`, isTimothy ? TIMOTHY_SNAPSHOTS : LOBO_SNAPSHOTS);
        setSnapshots(savedSnaps);

        const savedPos = await load(`${orgKey}_pos`, isTimothy ? TIMOTHY_POS : LOBO_POS);
        setPos(savedPos);

        const savedSettings = await load(`${orgKey}_settings`, isTimothy ? TIMOTHY_SETTINGS : LOBO_SETTINGS);
        setSettings(savedSettings);

        const savedVendors = await load(`${orgKey}_vendors`, isTimothy ? TIMOTHY_VENDORS : LOBO_VENDORS);
        setVendors(savedVendors);

        // Image Loading Logic
        let savedImages = await get(`${orgKey}_images`);
        if (!savedImages) {
          const lsImages = localStorage.getItem(`${orgKey}_images`);
          if (lsImages) {
            try {
              savedImages = JSON.parse(lsImages);
              await set(`${orgKey}_images`, savedImages);
            } catch (e) {}
          }
        }

        if (savedImages && typeof savedImages === 'object') {
          const urlMap = {};
          for (const [sku, blobOrString] of Object.entries(savedImages)) {
            if (blobOrString instanceof Blob) {
              urlMap[sku] = URL.createObjectURL(blobOrString);
            } else {
              urlMap[sku] = blobOrString;
            }
          }
          setSkuImages(urlMap);
        } else {
          setSkuImages({});
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data", err);
        setDataLoaded(true);
      }
    }
    loadAllData();
  }, [orgKey, isTimothy]);

  // 2. Auto-Save Data (Images are saved manually via handleImageUpload)
  useEffect(() => {
    if (!dataLoaded) return;
    set(`${orgKey}_snapshots`, snapshots);
    set(`${orgKey}_pos`, pos);
    set(`${orgKey}_settings`, settings);
    set(`${orgKey}_vendors`, vendors);
  }, [snapshots, pos, settings, vendors, orgKey, dataLoaded]);

  // 3. Image Upload Handler (Persists immediately)
  const handleImageUpload = useCallback(async (sku, blob) => {
    setSkuImages((prev) => {
      const oldUrl = prev[sku];
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
      return { ...prev, [sku]: URL.createObjectURL(blob) };
    });

    try {
      const currentImages = (await get(`${orgKey}_images`)) || {};
      const updatedImages = { ...currentImages, [sku]: blob };
      await set(`${orgKey}_images`, updatedImages);
    } catch (err) {
      console.error("Failed to save image to IDB", err);
    }
  }, [orgKey]);

  return {
    dataLoaded,
    snapshots, setSnapshots,
    pos, setPos,
    settings, setSettings,
    vendors, setVendors,
    skuImages, setSkuImages,
    handleImageUpload
  };
}
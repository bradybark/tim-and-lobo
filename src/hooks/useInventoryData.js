// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set } from 'idb-keyval';
import {
  LOBO_SNAPSHOTS, LOBO_POS, LOBO_SETTINGS, LOBO_VENDORS,
  TIMOTHY_SNAPSHOTS, TIMOTHY_POS, TIMOTHY_SETTINGS, TIMOTHY_VENDORS
} from '../constants/seedData'; 

const LEGACY_SEEDS = {
  lobo: {
    snapshots: LOBO_SNAPSHOTS,
    pos: LOBO_POS,
    settings: LOBO_SETTINGS,
    vendors: LOBO_VENDORS
  },
  timothy: {
    snapshots: TIMOTHY_SNAPSHOTS,
    pos: TIMOTHY_POS,
    settings: TIMOTHY_SETTINGS,
    vendors: TIMOTHY_VENDORS
  }
};

export function useInventoryData(orgKey) {
  const [dataLoaded, setDataLoaded] = useState(false);

  // Data States
  const [snapshots, setSnapshots] = useState([]);
  const [pos, setPos] = useState([]);
  const [settings, setSettings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [skuImages, setSkuImages] = useState({}); // Now stores Blobs, not URLs

  // 1. Load Data
  useEffect(() => {
    async function loadAllData() {
      try {
        const seeds = LEGACY_SEEDS[orgKey] || {
          snapshots: [],
          pos: [],
          settings: [],
          vendors: []
        };

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

        const [savedSnaps, savedPos, savedSettings, savedVendors, savedImages] = await Promise.all([
          load(`${orgKey}_snapshots`, seeds.snapshots),
          load(`${orgKey}_pos`, seeds.pos),
          load(`${orgKey}_settings`, seeds.settings),
          load(`${orgKey}_vendors`, seeds.vendors),
          get(`${orgKey}_images`)
        ]);

        setSnapshots(savedSnaps);
        setPos(savedPos);
        setSettings(savedSettings);
        setVendors(savedVendors);

        // Memory Fix: Store raw map, do NOT pre-convert to ObjectURLs
        if (savedImages && typeof savedImages === 'object') {
            setSkuImages(savedImages);
        } else {
            // Check legacy localstorage for images
            const lsImages = localStorage.getItem(`${orgKey}_images`);
            if (lsImages) {
                try {
                    const parsed = JSON.parse(lsImages);
                    setSkuImages(parsed);
                    await set(`${orgKey}_images`, parsed);
                } catch (e) {}
            } else {
                setSkuImages({});
            }
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data", err);
        setDataLoaded(true);
      }
    }
    loadAllData();
  }, [orgKey]);

  // 2. Auto-Save Data (Debounced)
  useEffect(() => {
    if (!dataLoaded) return;

    const handler = setTimeout(() => {
      set(`${orgKey}_snapshots`, snapshots);
      set(`${orgKey}_pos`, pos);
      set(`${orgKey}_settings`, settings);
      set(`${orgKey}_vendors`, vendors);
      // Note: Images are saved immediately on upload, not here
      console.log('Auto-saved data to IDB');
    }, 1000); // Wait 1s after last change

    return () => clearTimeout(handler);
  }, [snapshots, pos, settings, vendors, orgKey, dataLoaded]);

  // 3. Image Upload Handler
  const handleImageUpload = useCallback(async (sku, blob) => {
    // Update State
    setSkuImages((prev) => ({ ...prev, [sku]: blob }));

    // Persist immediately
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
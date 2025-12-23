// src/utils/orgConfig.js

// Default fallback with specific colors
const DEFAULT_ORGS = [
  {
    id: 'lobo',
    name: 'Lobo Tool Company',
    description: 'Manage inventory, tracking, and POs for Lobo Tools.',
    themeColor: '#3b82f6' // Blue
  },
  {
    id: 'timothy',
    name: "Timothy's Toolbox",
    description: "Manage inventory, tracking, and POs for Timothy's Toolbox.",
    themeColor: '#10b981' // Emerald (Green)
  }
];

export function getOrganizationConfig() {
  const envConfig = import.meta.env.VITE_ORG_CONFIG;

  if (envConfig) {
    try {
      // Expecting a JSON string in the .env variable
      // Example: '[{"id":"lobo","name":"Lobo","themeColor":"#ff0000"}]'
      return JSON.parse(envConfig);
    } catch (e) {
      console.error("Failed to parse VITE_ORG_CONFIG. Using defaults.", e);
      return DEFAULT_ORGS;
    }
  }

  return DEFAULT_ORGS;
}
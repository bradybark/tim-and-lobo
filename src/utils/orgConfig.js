// src/utils/orgConfig.js

// Default fallback with specific colors and feature configurations
const DEFAULT_ORGS = [
  {
    id: 'company-a',
    name: 'Company A',
    description: 'Full inventory management with all features.',
    themeColor: '#3b82f6', // Blue
    features: [
      'inventoryLog',
      'purchaseOrders',
      'reorderPlanner',
      'reports',
      'outgoingOrders',
      'internalOrders',
      'websiteOrders'
    ],
    poComponent: 'POView'
  },
  {
    id: 'company-b',
    name: 'Company B',
    description: 'Simplified PO tracking only.',
    themeColor: '#10b981', // Emerald (Green)
    features: ['purchaseOrders'],
    poComponent: 'PurchaseOrderSystem'
  }
];

export function getOrganizationConfig() {
  const envConfig = import.meta.env.VITE_ORG_CONFIG;

  if (envConfig) {
    try {
      // Expecting a JSON string in the .env variable
      // Example: '[{"id":"lobo","name":"Lobo","themeColor":"#ff0000","features":["purchaseOrders"],"poComponent":"POView"}]'
      return JSON.parse(envConfig);
    } catch (e) {
      console.error("Failed to parse VITE_ORG_CONFIG. Using defaults.", e);
      return DEFAULT_ORGS;
    }
  }

  return DEFAULT_ORGS;
}

// Helper to get a specific org by ID
export function getOrgById(orgId) {
  const orgs = getOrganizationConfig();
  return orgs.find(org => org.id === orgId) || null;
}

// Helper to check if an org has a specific feature
export function hasFeature(orgId, feature) {
  const org = getOrgById(orgId);
  if (!org || !org.features) return false;
  return org.features.includes(feature);
}

// Helper to get the PO component type for an org
export function getPoComponent(orgId) {
  const org = getOrgById(orgId);
  return org?.poComponent || 'POView';
}
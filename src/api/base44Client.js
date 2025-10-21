import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68e7e4116ab42cfbdb65e992", 
  requiresAuth: true // Ensure authentication is required for all operations
});

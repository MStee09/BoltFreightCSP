import { supabase } from '../api/supabaseClient';

/**
 * Get the user's Gmail email address from OAuth tokens
 * @param {string} userId - The user ID to fetch email for
 * @returns {Promise<string|null>} The email address or null if not found
 */
export async function getUserGmailEmail(userId) {
  if (!userId) return null;

  const { data: tokenCreds } = await supabase
    .from('user_gmail_tokens')
    .select('email_address')
    .eq('user_id', userId)
    .maybeSingle();

  return tokenCreds?.email_address || null;
}

/**
 * Check if user has Gmail connected via OAuth
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} True if Gmail is connected
 */
export async function hasGmailConnected(userId) {
  if (!userId) return false;

  const email = await getUserGmailEmail(userId);
  return !!email;
}

/**
 * Get Gmail OAuth tokens for sending emails
 * @param {string} userId - The user ID
 * @returns {Promise<object|null>} Token object or null
 */
export async function getGmailTokens(userId) {
  if (!userId) return null;

  const { data } = await supabase
    .from('user_gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data;
}

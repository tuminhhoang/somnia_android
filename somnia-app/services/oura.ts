/**
 * Oura OAuth flow — handles authorization redirect and callback.
 */

import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://api.somniasanitas.com";
const CLIENT_ID = process.env.EXPO_PUBLIC_OURA_CLIENT_ID ?? "";
const REDIRECT_URI = `${API_BASE}/oauth/oura/callback`;

const SCOPES = [
  "daily",
  "heartrate",
  "personal",
  "session",
  "workout",
  "tag",
  "email",
].join(" ");

/**
 * Open the Oura OAuth consent screen in an in-app browser.
 * The backend handles the callback and stores the tokens.
 */
export async function connectOuraRing(patientId: string): Promise<boolean> {
  const url =
    `${OURA_AUTH_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(patientId)}`;

  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);

  if (result.type === "success") {
    await SecureStore.setItemAsync("oura_connected", "true");
    return true;
  }
  return false;
}

export async function isOuraConnected(): Promise<boolean> {
  const val = await SecureStore.getItemAsync("oura_connected");
  return val === "true";
}

export async function disconnectOura(): Promise<void> {
  await SecureStore.deleteItemAsync("oura_connected");
}

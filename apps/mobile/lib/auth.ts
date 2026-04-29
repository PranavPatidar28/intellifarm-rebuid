import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'intellifarm.access-token';

export async function getStoredAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredAccessToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredAccessToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

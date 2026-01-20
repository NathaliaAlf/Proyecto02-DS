import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export async function saveItem(key: string, value: string) {
  if (isWeb) {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getItem(key: string) {
  if (isWeb) {
    return localStorage.getItem(key);
  } else {
    return SecureStore.getItemAsync(key);
  }
}

export async function deleteItem(key: string) {
  if (isWeb) {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

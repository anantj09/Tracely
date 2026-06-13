import AsyncStorageOriginal from '@react-native-async-storage/async-storage';

const inMemoryStore = {};

const AsyncStorage = {
  getItem: async (key) => {
    try {
      const val = await AsyncStorageOriginal.getItem(key);
      return val;
    } catch (err) {
      console.warn(`AsyncStorage fallback (getItem) for key "${key}": using in-memory store.`, err.message);
      return inMemoryStore[key] || null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorageOriginal.setItem(key, value);
    } catch (err) {
      console.warn(`AsyncStorage fallback (setItem) for key "${key}": using in-memory store.`, err.message);
      inMemoryStore[key] = value;
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorageOriginal.removeItem(key);
    } catch (err) {
      console.warn(`AsyncStorage fallback (removeItem) for key "${key}": using in-memory store.`, err.message);
      delete inMemoryStore[key];
    }
  }
};

export default AsyncStorage;

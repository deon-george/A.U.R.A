import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const CACHE_INDEX_KEY = 'image_cache_index';
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

interface CacheEntry {
  uri: string;
  localPath: string;
  size: number;
  timestamp: number;
}

class ImageCache {
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private isInitialized: boolean = false;

  //------This Function handles the Initialize---------
  async initialize() {
    if (this.isInitialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }

      const stored = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (stored) {
        const entries: CacheEntry[] = JSON.parse(stored);
        entries.forEach(entry => {
          this.cacheIndex.set(entry.uri, entry);
        });
      }

      this.isInitialized = true;
      console.log('Image cache initialized');
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  //------This Function handles the Get Cache Filename---------
  private getCacheFilename(uri: string): string {
    return uri.replace(/[^a-zA-Z0-9]/g, '_') + '.jpg';
  }

  //------This Function handles the Get---------
  async get(uri: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cached = this.cacheIndex.get(uri);
    if (cached) {
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (fileInfo.exists) {
        cached.timestamp = Date.now();
        await this.saveCacheIndex();
        return cached.localPath;
      } else {
        this.cacheIndex.delete(uri);
        await this.saveCacheIndex();
      }
    }

    return await this.download(uri);
  }

  //------This Function handles the Download---------
  private async download(uri: string): Promise<string> {
    try {
      const filename = this.getCacheFilename(uri);
      const localPath = `${CACHE_DIR}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(uri, localPath);
      
      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const size = (fileInfo as any).size || 0;

        const entry: CacheEntry = {
          uri,
          localPath,
          size,
          timestamp: Date.now(),
        };
        this.cacheIndex.set(uri, entry);

        await this.evictIfNeeded();
        await this.saveCacheIndex();

        return localPath;
      } else {
        console.error('Failed to download image:', uri);
        return uri;
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      return uri;
    }
  }

  //------This Function handles the Evict If Needed---------
  private async evictIfNeeded() {
    let totalSize = 0;
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size;
    }

    if (totalSize > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cacheIndex.values());
      entries.sort((a, b) => a.timestamp - b.timestamp);

      for (const entry of entries) {
        if (totalSize <= MAX_CACHE_SIZE * 0.8) break;

        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
          this.cacheIndex.delete(entry.uri);
          totalSize -= entry.size;
          console.log('Evicted cached image:', entry.uri);
        } catch (error) {
          console.error('Failed to evict image:', error);
        }
      }
    }
  }

  //------This Function handles the Save Cache Index---------
  private async saveCacheIndex() {
    try {
      const entries = Array.from(this.cacheIndex.values());
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  //------This Function handles the Clear Cache---------
  async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      this.cacheIndex.clear();
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  //------This Function handles the Prefetch---------
  async prefetch(uris: string[]) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (const uri of uris) {
      if (!this.cacheIndex.has(uri)) {
        this.get(uri).catch(err => console.error('Prefetch failed:', err));
      }
    }
  }

  //------This Function handles the Preload---------
  async preload(uris: string[]) {
    const cachedUris = await Promise.all(
      uris.map(uri => this.get(uri))
    );

    await Promise.all(
      cachedUris.map(uri => Image.prefetch(uri))
    );
  }
}

export const imageCache = new ImageCache();

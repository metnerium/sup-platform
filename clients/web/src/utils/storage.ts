// IndexedDB wrapper for offline message caching
class StorageService {
  private dbName = 'sup-messenger';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Chats store
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }

        // Media cache
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'url' });
        }
      };
    });
  }

  async saveMessages(chatId: string, messages: any[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    for (const message of messages) {
      store.put(message);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMessages(chatId: string, limit = 50): Promise<any[]> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('chatId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(chatId));
      request.onsuccess = () => {
        const messages = request.result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(messages.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveChat(chat: any): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    store.put(chat);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChats(): Promise<any[]> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheMedia(url: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['media'], 'readwrite');
    const store = transaction.objectStore('media');
    store.put({ url, blob, cachedAt: new Date() });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedMedia(url: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['media'], 'readonly');
    const store = transaction.objectStore('media');

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(
      ['messages', 'chats', 'media'],
      'readwrite'
    );

    transaction.objectStore('messages').clear();
    transaction.objectStore('chats').clear();
    transaction.objectStore('media').clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const storageService = new StorageService();

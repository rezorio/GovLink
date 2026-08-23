const DB_NAME = 'govlink-offline';
const DB_VERSION = 1;
const STORE = 'evidence-uploads';

export type QueuedEvidenceUpload = {
    id: string;
    assignmentId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    blob: Blob;
    queuedAt: string;
};

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
}

function runTransaction<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE, mode);
                const store = tx.objectStore(STORE);
                const request = fn(store);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
            }),
    );
}

export function enqueueEvidenceUpload(assignmentId: string, file: File): Promise<string> {
    const entry: QueuedEvidenceUpload = {
        id: crypto.randomUUID(),
        assignmentId,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        blob: file,
        queuedAt: new Date().toISOString(),
    };

    return runTransaction('readwrite', (store) => store.put(entry)).then(() => entry.id);
}

export function listQueuedEvidenceUploads(): Promise<QueuedEvidenceUpload[]> {
    return runTransaction<QueuedEvidenceUpload[]>('readonly', (store) => store.getAll()).then(
        (rows) => rows.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)),
    );
}

export function removeQueuedEvidenceUpload(id: string): Promise<void> {
    return runTransaction('readwrite', (store) => store.delete(id)).then(() => undefined);
}

export function countQueuedEvidenceUploads(): Promise<number> {
    return listQueuedEvidenceUploads().then((rows) => rows.length);
}

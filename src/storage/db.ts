import { estadoInicial, migrarYValidar, type Estado, type FinDeTema } from './estado';

const NOMBRE_DB = 'paso-a-paso';
const ALMACEN = 'kv';
const CLAVE = 'estado';

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(NOMBRE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(ALMACEN)) req.result.createObjectStore(ALMACEN);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function cargarEstado(finDeTema?: FinDeTema): Promise<Estado> {
  try {
    const db = await abrir();
    const valor = await new Promise<unknown>((res, rej) => {
      const r = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(CLAVE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    db.close();
    return valor ? migrarYValidar(valor, finDeTema) : estadoInicial();
  } catch (err) {
    console.warn('No se pudo leer el progreso guardado', err);
    return estadoInicial();
  }
}

export async function guardarEstado(e: Estado): Promise<void> {
  const db = await abrir();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).put(e, CLAVE);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

/** Pide al navegador que no borre los datos (no garantizado, sobre todo en iOS). */
export async function pedirPersistencia(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

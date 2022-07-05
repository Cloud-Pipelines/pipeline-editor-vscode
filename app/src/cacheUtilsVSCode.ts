/**
 * @license
 * Copyright 2021 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2021 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

const httpGetWithCache0 = async (
  urlOrRequest: string | RequestInfo,
  cacheName: string,
  updateIfInCache: boolean = false
): Promise<Response> => {
  const cache = await caches.open(cacheName);
  const response = await cache.match(urlOrRequest);
  if (response !== undefined) {
    if (updateIfInCache) {
      cache.add(urlOrRequest);
    }
    return response;
  }
  await cache.add(urlOrRequest);
  const response2 = await cache.match(urlOrRequest);
  if (response2 === undefined) {
    return Promise.reject("Added object to cache, but could not find it");
  }
  return response2;
};

// httpGetWithCacheVScode
const httpGetWithCache1 = async (
  urlOrRequest: string,
  cacheName: string,
  updateIfInCache: boolean = false
): Promise<Response> => {
  //console.log("httpGetWithCache(", urlOrRequest, cacheName);
  // @ts-ignore
  //const vscodeApi = acquireVsCodeApi();
  const vscodeApi = window.vscodeApi;

  return new Promise<Response>((resolve, reject) => {
    const messageId = Math.random();
    const onWatchEventHandler = async (msg: MessageEvent<any>) => {
      //console.log("httpGetWithCacheVScode.onWatchEventHandler(", msg);
      const msgType = msg.data?.type;
      const msgData = msg.data?.data;
      if (msgType === "rpcResponse" && msgData?.messageId === messageId) {
        //if (msgType === "rpcResponse") {
        window.removeEventListener("message", onWatchEventHandler);
        //const blobText = msgData?.result as string;
        //const arrayBuffer = msgData?.result as ArrayBuffer;
        const arrayBuffer = msgData?.result as Uint8Array;
        resolve(
          new Response(
            //new Blob([blobText], {
            new Blob([arrayBuffer], {
              type: "text/plain",
            })
          )
        );
      }
    };
    window.addEventListener("message", onWatchEventHandler);
    vscodeApi.postMessage({
      type: "rpc",
      data: {
        messageId: messageId,
        func: "cacheUtils.httpGetWithCache",
        args: [urlOrRequest, cacheName, updateIfInCache],
      },
    });
  });
};

// const memoryKeyValueStringStores = new Map<
//   string,
//   IAsyncKeyValueStore<string, string>
// >();
// const vscodeKeyValueStringStores = new Map<
//   string,
//   IAsyncKeyValueStore<string, string>
// >();

const memoryKeyValueDataStores = new Map<
  string,
  IAsyncKeyValueStore<string, ArrayBuffer>
>();
const vscodeKeyValueDataStores = new Map<
  string,
  IAsyncKeyValueStore<string, ArrayBuffer>
>();

// function getOrCreateMemoryKeyValueStringStore(cacheName: string) {
//   let result = memoryKeyValueStringStores.get(cacheName);
//   if (result === undefined) {
//     result = new MemoryKeyValueStore<string, string>();
//     memoryKeyValueStringStores.set(cacheName, result);
//   }
//   return result;
// }

function getOrCreateMemoryKeyValueDataStore(cacheName: string) {
  let result = memoryKeyValueDataStores.get(cacheName);
  if (result === undefined) {
    result = new MemoryKeyValueStore<string, ArrayBuffer>();
    memoryKeyValueDataStores.set(cacheName, result);
  }
  return result;
}

// function getOrCreateVscodeKeyValueStringStore(cacheName: string) {
//   let result = vscodeKeyValueStringStores.get(cacheName);
//   if (result === undefined) {
//     result = new VSCodeRpcGlobalKeyValueStringStore(cacheName);
//     vscodeKeyValueStringStores.set(cacheName, result);
//   }
//   return result;
// }

function getOrCreateVSCodeKeyValueDataStore(cacheName: string) {
  let result = vscodeKeyValueDataStores.get(cacheName);
  if (result === undefined) {
    result = new VSCodeRpcGlobalKeyValueDataStore(cacheName);
    vscodeKeyValueDataStores.set(cacheName, result);
  }
  return result;
}

// const httpGetWithCache2 = async (
//   urlOrRequest: string,
//   cacheName: string,
//   updateIfInCache: boolean = false
// ): Promise<Response> => {
//   const caches = [
//     getOrCreateMemoryKeyValueStringStore(cacheName),
//     getOrCreateVscodeKeyValueStringStore(cacheName),
//   ];
//   const text = await getTextFromUrl(urlOrRequest, caches, updateIfInCache);
//   return new Response(
//     new Blob([text], {
//       type: "text/plain",
//     })
//   );
// };

const httpGetWithCache2Data = async (
  urlOrRequest: string,
  cacheName: string,
  updateIfInCache: boolean = false
): Promise<Response> => {
  const caches = [
    getOrCreateMemoryKeyValueDataStore(cacheName),
    getOrCreateVSCodeKeyValueDataStore(cacheName),
  ];
  const data = await getDataFromUrl(urlOrRequest, caches, updateIfInCache);
  return new Response(
    new Blob([data], {
      type: "text/plain",
    })
  );
};

//export const httpGetWithCache = httpGetWithCache2;
export const httpGetWithCache = httpGetWithCache2Data;

interface IAsyncKeyValueStore<TKey, TValue> {
  get(key: TKey): Promise<TValue | undefined>;
  set(key: TKey, value: TValue): Promise<void>;
}

class MemoryKeyValueStore<TKey, TValue>
  implements IAsyncKeyValueStore<TKey, TValue>
{
  storage: Map<TKey, TValue>;
  constructor() {
    this.storage = new Map<TKey, TValue>();
  }
  get(key: TKey) {
    return Promise.resolve(this.storage.get(key));
  }
  set(key: TKey, value: TValue) {
    this.storage.set(key, value);
    return Promise.resolve();
  }
}

async function callVSCodeRpc(func: string, ...args: any[]): Promise<any> {
  // @ts-ignore
  const vscodeApi = window.vscodeApi;

  return new Promise<any>((resolve, reject) => {
    const messageId = Math.random();
    const onWatchEventHandler = async (msg: MessageEvent<any>) => {
      //console.debug("callVSCodeRpc received message:", msg);
      const msgType = msg.data?.type;
      const msgData = msg.data?.data;
      if (msgType === "rpcResponse" && msgData?.messageId === messageId) {
        window.removeEventListener("message", onWatchEventHandler);
        const error = msgData?.error;
        if (error) {
          reject(error.reason);
        } else {
          resolve(msgData.result);
        }
      }
    };
    window.addEventListener("message", onWatchEventHandler);
    vscodeApi.postMessage({
      type: "rpc",
      data: {
        messageId: messageId,
        func: func,
        args: args,
      },
    });
  });
}

// class VSCodeRpcGlobalKeyValueStringStore
//   implements IAsyncKeyValueStore<string, string>
// {
//   cacheName: string;
//   constructor(cacheName: string) {
//     this.cacheName = cacheName;
//   }
//   async get(key: string): Promise<string | undefined> {
//     const result = await callVSCodeRpc(
//       "VSCodeGlobalKeyValueStore:getString",
//       this.cacheName,
//       key
//     );
//     if (typeof result === "string" || result === undefined) {
//       return result;
//     }
//     return Promise.reject(
//       `Expected result to be string or undefined, but got: ${result}.`
//     );
//   }
//   async set(key: string, value: string) {
//     await callVSCodeRpc(
//       "VSCodeGlobalKeyValueStore:setString",
//       this.cacheName,
//       key,
//       value
//     );
//   }
// }

class VSCodeRpcGlobalKeyValueDataStore
  implements IAsyncKeyValueStore<string, ArrayBuffer>
{
  cacheName: string;
  constructor(cacheName: string) {
    this.cacheName = cacheName;
  }
  async get(key: string): Promise<ArrayBuffer | undefined> {
    const result = await callVSCodeRpc(
      "VSCodeGlobalKeyValueStore:getData",
      this.cacheName,
      key
    );
    if (result instanceof ArrayBuffer || result === undefined) {
      return result;
    }
    console.error("VSCodeRpcGlobalKeyValueDataStore: Expected result to be ArrayBuffer or undefined, but got", result)
    return Promise.reject(
      `Expected result to be ArrayBuffer or undefined, but got ${result}.`
    );
  }
  async set(key: string, value: ArrayBuffer) {
    await callVSCodeRpc(
      "VSCodeGlobalKeyValueStore:setData",
      this.cacheName,
      key,
      value
    );
  }
}

async function getValueFromCachesAndSync<TKey, TValue>(
  key: TKey,
  caches: IAsyncKeyValueStore<TKey, TValue>[],
  updateOtherCachesWhenFound = false
) {
  for (const cache of caches) {
    const value = await cache.get(key);
    if (value !== undefined) {
      // Found the value in one of the caches.
      if (updateOtherCachesWhenFound) {
        // Updating all other caches.
        for (const cacheToUpdate of caches) {
          if (cacheToUpdate !== cache) {
            // Not awaiting async set calls.
            // So they run in parallel.
            cacheToUpdate.set(key, value);
          }
        }
      }
      return value;
    }
  }
  return undefined;
}

async function createValueAndUpdateCaches<TKey, TValue>(
  key: TKey,
  caches: IAsyncKeyValueStore<TKey, TValue>[],
  creator: (key: TKey) => Promise<TValue>
): Promise<TValue> {
  // Creating the value.
  const value = await creator(key);
  // Updating all caches.
  for (const cacheToUpdate of caches) {
    // Not awaiting async set calls.
    // So they run in parallel.
    cacheToUpdate.set(key, value);
  }
  return value;
}

async function getValueFromCacheOrCreate<TKey, TValue>(
  key: TKey,
  caches: IAsyncKeyValueStore<TKey, TValue>[],
  creator: (key: TKey) => Promise<TValue>,
  updateOtherCachesWhenFound = false
): Promise<TValue> {
  const value = await getValueFromCachesAndSync(
    key,
    caches,
    updateOtherCachesWhenFound
  );
  if (value !== undefined) {
    return value;
  }
  return createValueAndUpdateCaches(key, caches, creator);
}

async function createValueOrGetFromCache<TKey, TValue>(
  key: TKey,
  caches: IAsyncKeyValueStore<TKey, TValue>[],
  creator: (key: TKey) => Promise<TValue>,
  updateOtherCachesWhenFound = false
): Promise<TValue> {
  // Creating the value.
  try {
    return await createValueAndUpdateCaches(key, caches, creator);
  } catch (err: any) {
    // Failed to create the value.
    const value = await getValueFromCachesAndSync(
      key,
      caches,
      updateOtherCachesWhenFound
    );
    if (value !== undefined) {
      return value;
    }
    // Failed to create the value and
    // Could not find the key in the caches.
    throw err;
  }
}

// async function fetchText(url: string): Promise<string> {
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error(
//       `Network response was not OK: ${response.status}: ${response.statusText}`
//     );
//   }
//   const data = await response.blob();
//   const text = data.text();
//   return text;
// }

async function fetchData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Network response was not OK: ${response.status}: ${response.statusText}`
    );
  }
  return response.arrayBuffer();
}

// function getTextFromUrl(
//   url: string,
//   caches: IAsyncKeyValueStore<string, string>[] = [],
//   updateIfInCache: boolean = false
// ): Promise<string> {
//   return updateIfInCache
//     ? createValueOrGetFromCache(url, caches, fetchText)
//     : getValueFromCacheOrCreate(url, caches, fetchText);
// }

function getDataFromUrl(
  url: string,
  caches: IAsyncKeyValueStore<string, ArrayBuffer>[] = [],
  updateIfInCache: boolean = false
): Promise<ArrayBuffer> {
  return updateIfInCache
    ? createValueOrGetFromCache(url, caches, fetchData)
    : getValueFromCacheOrCreate(url, caches, fetchData);
}

// async function fetchComponentTextAndVerify(url: string): Promise<string> {
//   const text = fetchText(url);
//   // ! FIX: Verify !
//   return text;
// }

// function getComponentTextFromUrl(
//   url: string,
//   caches: IAsyncKeyValueStore<string, string>[] = [],
//   updateIfInCache: boolean = false
// ) {
//   return updateIfInCache
//     ? createValueOrGetFromCache(url, caches, fetchComponentTextAndVerify)
//     : getValueFromCacheOrCreate(url, caches, fetchComponentTextAndVerify);
// }

const IMMUTABLE_URL_REGEXPS = [
  /^https:\/\/raw.githubusercontent.com\/[-A-Za-z_]+\/[-A-Za-z_]+\/[0-9a-fA-f]{40}\/.*/,
  /^https:\/\/gitlab.com\/([-A-Za-z_]+\/){2,}-\/raw\/[0-9a-fA-f]{40}\/.*/,
];

export async function downloadDataWithVSCodeCache<T>(
  url: string,
  transformer: (buffer: ArrayBuffer) => T
): Promise<T> {
  const cacheName = "cache";
  const caches = [
    getOrCreateMemoryKeyValueDataStore(cacheName),
    getOrCreateVSCodeKeyValueDataStore(cacheName),
  ];

  const fetchAndValidateData = async (url: string) => {
    const data = await fetchData(url);
    // Transform the data to validate it
    transformer(data);
    return data;
  };

  const isImmutable = IMMUTABLE_URL_REGEXPS.some((regexp) => url.match(regexp));
  const updateIfInCache = !isImmutable;
  const data = updateIfInCache
    ? await createValueOrGetFromCache(url, caches, fetchAndValidateData)
    : await getValueFromCacheOrCreate(url, caches, fetchAndValidateData);
  const transformedData = transformer(data);
  return transformedData;
}

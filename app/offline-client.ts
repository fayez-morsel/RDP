"use client";

const privateStoragePrefixes=["lifequest.player","lifequest.settings","lifequest.avatar","lifequest.campaigns","lifequest.ai","lifequest.offline"];
export async function clearPrivateOfflineState(){
  if(typeof window!=="undefined") Object.keys(localStorage).filter((key)=>privateStoragePrefixes.some((prefix)=>key.startsWith(prefix))).forEach((key)=>localStorage.removeItem(key));
  if(typeof caches!=="undefined") for(const key of await caches.keys()) if(key.startsWith("system-private-")) await caches.delete(key);
  navigator.serviceWorker?.controller?.postMessage({type:"CLEAR_ACCOUNT"});
}

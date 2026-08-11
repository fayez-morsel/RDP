"use client";
import { useEffect } from "react";

export function PwaBootstrap(){useEffect(()=>{if(!("serviceWorker" in navigator))return;let active=true;navigator.serviceWorker.register("/sw.js",{scope:"/"}).then((registration)=>{if(!active)return;const worker=registration.active??registration.waiting??registration.installing;worker?.postMessage({type:"SET_ACCOUNT",accountId:"local-player"});}).catch(()=>{});return()=>{active=false};},[]);return null;}

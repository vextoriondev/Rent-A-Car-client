"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {getLanguage,t} from '@/lib/copy';

/** Draws the app only in the browser, after the chosen language is known, so the first screen is never in the wrong language. Also sets the page language and title. */
export function Mounted({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false);
 useEffect(()=>{document.documentElement.lang=getLanguage();document.title=t('app.rentflowOperations');setReady(true)},[]);
 return ready?<>{children}</>:null;
}

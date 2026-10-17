import {en} from './en';
import {bn} from './bn';

/** Every word the user reads lives in `en.ts` (English) and `bn.ts` (Bangla, same keys). `t('key', {name: value})` fills `{name}` in the sentence.
 * A key missing in `bn.ts` falls back to English, so an untranslated sentence is never blank and never shows a code.
 * The language is read once, when the page loads, from a cookie; changing it saves the cookie and reloads the page (`switchLanguage`),
 * so text held in constants at load time is always in the right language. */
export type CopyKey=keyof typeof en;
export type CopyParams=Record<string,string|number|null|undefined>;
export type Lang='en'|'bn';
export const LANGUAGES:{code:Lang;name:string}[]=[{code:'en',name:'English'},{code:'bn',name:'বাংলা'}];

const catalogs:Record<Lang,Partial<Record<string,string>>>={en,bn};
const LANG_COOKIE='rf_lang';
const DIGITS_COOKIE='rf_digits';

function readCookie(name:string):string{
 if(typeof document==='undefined')return '';
 const m=document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));
 return m?decodeURIComponent(m[1]):'';
}
function writeCookie(name:string,value:string){
 if(typeof document!=='undefined')document.cookie=`${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

let language:Lang=readCookie(LANG_COOKIE)==='bn'?'bn':'en';
/** Bangla digits (০১২…) are on by default in Bangla and can be switched off; English always uses 0123… */
let banglaDigits=readCookie(DIGITS_COOKIE)?readCookie(DIGITS_COOKIE)==='1':language==='bn';

export const getLanguage=():Lang=>language;
export const usesBanglaDigits=():boolean=>language==='bn'&&banglaDigits;

/** Saves the choice and reloads the page so every screen, constant and download starts in that language. */
export function switchLanguage(next:Lang,opts?:{digits?:boolean}){
 writeCookie(LANG_COOKIE,next);
 writeCookie(DIGITS_COOKIE,(opts?.digits??next==='bn')?'1':'0');
 if(typeof window!=='undefined')window.location.reload();
}
export function setBanglaDigits(on:boolean){
 writeCookie(DIGITS_COOKIE,on?'1':'0');
 if(typeof window!=='undefined')window.location.reload();
}

const BN_DIGITS='০১২৩৪৫৬৭৮৯';
/** 0-9 → ০-৯ when Bangla digits are on; unchanged otherwise. */
export function localizeDigits(text:string|number):string{
 const s=String(text);
 return usesBanglaDigits()?s.replace(/[0-9]/g,d=>BN_DIGITS[Number(d)]):s;
}
/** ০-৯ → 0-9, so typed Bangla digits are understood everywhere numbers are read. */
export function asciiDigits(text:string):string{
 return text.replace(/[০-৯]/g,d=>String(BN_DIGITS.indexOf(d)));
}

/** A number with thousands commas in the current digit set. */
export const fmtNumber=(n:number,opts?:Intl.NumberFormatOptions)=>localizeDigits(n.toLocaleString('en-US',opts));
/** The locale for dates and month names: Bangla words in Bangla, Latin digits unless Bangla digits are on. */
export const dateLocale=()=>language==='bn'?(usesBanglaDigits()?'bn-BD':'bn-BD-u-nu-latn'):'en-GB';

/** The sentence for `key` in the current language; English when a translation is missing; the key itself only for a typo. */
export function t(key:CopyKey,params?:CopyParams):string{
 const text=catalogs[language][key]??en[key]??key;
 if(!params)return text;
 return text.replace(/\{(\w+)\}/g,(whole,name)=>{
  const v=params[name];
  if(v==null)return whole;
  return typeof v==='number'?localizeDigits(v):String(v);
 });
}

/** Plural-aware: reads `key.one` when the count is 1 and `key.other` otherwise; `{count}` is filled in for you. */
export const tn=(key:string,count:number,params?:CopyParams)=>t(`${key}.${count===1?'one':'other'}` as CopyKey,{count,...params});

/** True when the catalog has this key (used for text that may or may not be translated yet). */
export const hasCopy=(key:string)=>key in en;

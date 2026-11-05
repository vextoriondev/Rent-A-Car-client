import {en} from './en';
import {bn} from './bn';
import {std} from './std';

/** Every word the user reads lives in `en.ts` (English) and `bn.ts` (Bangla, same keys). `t('key', {name: value})` fills `{name}` in the sentence.
 * A key missing in `bn.ts` falls back to English, so an untranslated sentence is never blank and never shows a code.
 * The language is read once, when the page loads, from a cookie; changing it saves the cookie and reloads the page (`switchLanguage`),
 * so text held in constants at load time is always in the right language. */
export type CopyKey=keyof typeof en;
export type CopyParams=Record<string,string|number|null|undefined>;
/** `en` is plain English, `std` is standard English (the accounting words), `bn` is Bangla. */
export type Lang='en'|'std'|'bn';
export const LANGUAGES:{code:Lang;name:string}[]=[{code:'std',name:'English (standard)'},{code:'en',name:'English (plain)'},{code:'bn',name:'বাংলা'}];

const catalogs:Record<Lang,Partial<Record<string,string>>>={en,std,bn};
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

const savedLang=readCookie(LANG_COOKIE);
let language:Lang=savedLang==='bn'?'bn':savedLang==='en'?'en':'std'; // standard English is the default when nothing is saved
/** Bangla digits (০১২…) are on by default in Bangla and can be switched off; English always uses 0123… */
let banglaDigits=readCookie(DIGITS_COOKIE)?readCookie(DIGITS_COOKIE)==='1':language==='bn';

export const getLanguage=():Lang=>language;
/** The language code the server understands: standard English is English there. */
export const serverLanguage=():'en'|'bn'=>language==='bn'?'bn':'en';
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
export function tRaw(key:CopyKey,params?:CopyParams):string{
 const text=catalogs[language][key]??en[key]??key;
 if(!params)return text;
 return text.replace(/\{(\w+)\}/g,(whole,name)=>{
  const v=params[name];
  if(v==null)return whole;
  return typeof v==='number'?localizeDigits(v):String(v);
 });
}

/** A sentence may mark words to show in bold with **double asterisks** (rendered by `<Rich>`). `t()` drops the markers, so the same sentence
 * is still clean plain text for downloads, toasts and page titles. */
export const stripBold=(text:string):string=>text.replace(/\*\*/g,'');
export const t=(key:CopyKey,params?:CopyParams):string=>stripBold(tRaw(key,params));

/** Plural-aware: reads `key.one` when the count is 1 and `key.other` otherwise; `{count}` is filled in for you. */
export const tn=(key:string,count:number,params?:CopyParams)=>t(`${key}.${count===1?'one':'other'}` as CopyKey,{count,...params});

/** True when the catalog has this key (used for text that may or may not be translated yet). */
export const hasCopy=(key:string)=>key in en;

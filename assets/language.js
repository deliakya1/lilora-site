/* AUTO_REDIRECT_ON_FIRST_VISIT = NO. URL language is always authoritative. */
(() => {
 'use strict';
 const config=JSON.parse(document.getElementById('site-locale').textContent);
 const key='lilora.language.v1',dismissKey='lilora.language.dismissed.v1',marker='lilora_lang';
 const languages=['tr','en','es','de','pt','fr'],valid=value=>languages.includes(value);
 const read=(store,k=key)=>{try{return window[store].getItem(k);}catch{return null;}};
 const remember=value=>{
  const saved={localStorage:false,sessionStorage:false};
  for(const store of Object.keys(saved))try{window[store].setItem(key,value);saved[store]=window[store].getItem(key)===value;}catch{}
  return saved;
 };
 const url=new URL(location.href),explicit=url.searchParams.get(marker);
 const explicitChoice=valid(explicit)&&explicit===config.language;
 if(explicitChoice)remember(explicit);
 if(url.searchParams.has(marker)){
  url.searchParams.delete(marker);
  try{history.replaceState(history.state,'',url);}catch{}
 }
 // Crawlers must see canonical language paths, not a duplicate URL for every link.
 // Only a deliberate activation may need a temporary marker when storage is blocked.
 const prepareLink=(link,lang,target)=>{
  target.search=location.search;target.searchParams.delete(marker);
  if(config.alternates[lang])target.hash=location.hash;
  const clean=target.href;link.href=clean;
  const choose=event=>{
   if(event.defaultPrevented||(event.type==='auxclick'&&event.button!==1))return;
   link.href=clean;
   const saved=remember(lang);
   const newContext=event.ctrlKey||event.metaKey||event.shiftKey||event.button===1||link.target==='_blank';
   if(saved.localStorage||(!newContext&&saved.sessionStorage))return;
   const fallback=new URL(clean);fallback.searchParams.set(marker,lang);link.href=fallback.href;
   // Native clicks (including keyboard/new-tab activation) still perform navigation.
   setTimeout(()=>{link.href=clean;},0);
  };
  link.addEventListener('click',choose);link.addEventListener('auxclick',choose);
 };
 for(const link of document.querySelectorAll('a.language[hreflang]')){
  const lang=link.hreflang.split('-')[0];if(!valid(lang))continue;
  prepareLink(link,lang,new URL(link.href,location.href));
 }
 const saved=read('sessionStorage')||read('localStorage');
 if(valid(saved)||explicitChoice||read('sessionStorage',dismissKey)==='1')return;
 const browser=(navigator.languages||[navigator.language]).map(value=>String(value).toLowerCase().split('-')[0]).find(valid)||'en';
 if(browser===config.language)return;
 const t=config.suggestions[browser],bar=document.createElement('aside');bar.className='language-suggestion';bar.lang=browser==='pt'?'pt-BR':browser;bar.setAttribute('aria-label',t.suggestion);
 const link=document.createElement('a');const target=new URL(config.alternates[browser]||(browser==='tr'?'/':'/'+browser+'/'),location.origin);
 prepareLink(link,browser,target);link.textContent=config.alternates[browser]?t.suggestion:t.suggestionHome;
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',t.dismiss);close.addEventListener('click',()=>{bar.remove();try{sessionStorage.setItem(dismissKey,'1');}catch{}});
 bar.append(link,close);
 // The bar is absolutely positioned at its static place just below the header, so showing it
 // never shifts the page (CLS) and needs no layout read (forced reflow).
 document.querySelector('.header').after(bar);
})();

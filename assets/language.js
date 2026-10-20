/* AUTO_REDIRECT_ON_FIRST_VISIT = NO. URL language is always authoritative. */
(() => {
 'use strict';
 const config=JSON.parse(document.getElementById('site-locale').textContent);
 const key='lilora.language.v1',dismissKey='lilora.language.dismissed.v1',marker='lilora_lang';
 const languages=['tr','en','es','de','pt','fr'],valid=value=>languages.includes(value);
 const read=(store,k=key)=>{try{return window[store].getItem(k);}catch{return null;}};
 const remember=value=>{for(const store of ['localStorage','sessionStorage'])try{window[store].setItem(key,value);}catch{}};
 const url=new URL(location.href),explicit=url.searchParams.get(marker);
 if(valid(explicit)&&explicit===config.language){remember(explicit);url.searchParams.delete(marker);history.replaceState(history.state,'',url);}
 for(const link of document.querySelectorAll('a.language[hreflang]')){
  const lang=link.hreflang;if(!valid(lang))continue;
  const target=new URL(link.href,location.href);target.search=location.search;target.searchParams.set(marker,lang);
  if(config.alternates[lang])target.hash=location.hash;
  link.href=target.href;link.addEventListener('click',()=>remember(lang));link.addEventListener('auxclick',event=>{if(event.button===1)remember(lang);});
 }
 const saved=read('sessionStorage')||read('localStorage');
 if(valid(saved)||valid(explicit)||read('sessionStorage',dismissKey)==='1')return;
 const browser=(navigator.languages||[navigator.language]).map(value=>String(value).toLowerCase().split('-')[0]).find(valid)||'en';
 if(browser===config.language)return;
 const t=config.suggestions[browser],bar=document.createElement('aside');bar.className='language-suggestion';bar.lang=browser==='pt'?'pt-BR':browser;bar.setAttribute('aria-label',t.suggestion);
 const link=document.createElement('a');const target=new URL(config.alternates[browser]||(browser==='tr'?'/':'/'+browser+'/'),location.origin);target.search=location.search;target.searchParams.set(marker,browser);if(config.alternates[browser])target.hash=location.hash;
 link.href=target.href;link.textContent=config.alternates[browser]?t.suggestion:t.suggestionHome;link.addEventListener('click',()=>remember(browser));
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',t.dismiss);close.addEventListener('click',()=>{bar.remove();try{sessionStorage.setItem(dismissKey,'1');}catch{}});
 bar.append(link,close);document.body.insertBefore(bar,document.querySelector('.header'));
})();

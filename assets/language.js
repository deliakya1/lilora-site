/* Language preference is essential UI storage, independent of analytics consent. */
(() => {
  'use strict';
  const key='lilora.language.v1';
  const visitedKey='lilora.language.visited.v1';
  const marker='lilora_lang';
  const valid=value=>value==='tr'||value==='en';
  const read=store=>{try{return window[store].getItem(key);}catch{return null;}};
  const remember=value=>{
    for(const store of ['localStorage','sessionStorage']){
      try{window[store].setItem(key,value);}catch{}
    }
  };
  const url=new URL(location.href);
  const explicit=url.searchParams.get(marker);
  // The marker makes a manual switch reliable even when both stores are blocked.
  if(valid(explicit)&&explicit===document.documentElement.lang){
    remember(explicit);
    url.searchParams.delete(marker);
    history.replaceState(history.state,'',url);
  }
  let visited=false;
  try{visited=sessionStorage.getItem(visitedKey)==='1';sessionStorage.setItem(visitedKey,'1');}catch{}
  let internal=false;
  try{internal=new URL(document.referrer).origin===location.origin;}catch{}
  const navigation=performance.getEntriesByType('navigation')[0];
  const returning=navigation && ['reload','back_forward'].includes(navigation.type);
  // Only the unchosen root entry is negotiated. Every other URL stays explicit.
  if(location.pathname==='/'&&!valid(explicit)&&!visited&&!internal&&!returning){
    const session=read('sessionStorage');
    const local=read('localStorage');
    const browser=navigator.languages?.[0]||navigator.language||'';
    const chosen=valid(session)?session:valid(local)?local:/^tr(?:-|$)/i.test(browser)?'tr':'en';
    if(chosen==='en'){
      url.pathname='/en/';
      window.liloraLanguageRedirecting=true;
      location.replace(url.href);
      return;
    }
  }
  // Keep real paired HTML links for crawlers and visitors without JavaScript.
  for(const link of document.querySelectorAll('a.language[hreflang]')){
    const language=link.getAttribute('hreflang');
    const target=new URL(link.href,location.href);
    if(!valid(language)||target.origin!==location.origin)continue;
    target.search=location.search;
    target.hash=location.hash;
    target.searchParams.set(marker,language);
    link.href=target.href;
    link.addEventListener('click',()=>remember(language));
    link.addEventListener('auxclick',event=>{if(event.button===1)remember(language);});
  }
})();

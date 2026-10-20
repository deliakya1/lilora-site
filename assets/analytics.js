/* Lilora basic consent: Google is entirely blocked until optional analytics opt-in. */
(() => {
  'use strict';
  if (window.liloraConsentReady || window.liloraLanguageRedirecting) return;
  window.liloraConsentReady = true;
  const id = window.LILORA_ANALYTICS_ID;
  const configured = /^G-[A-Z0-9]{6,20}$/.test(id || '');
  const key = 'lilora.cookie-preferences.v2';
  const version = 2;
  const denialKey = key + '.denied';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const locale = JSON.parse(document.getElementById('site-locale').textContent);
  const t = locale.cookie;
  let memory = null;
  let storageAvailable = true;
  let started = false;
  let halted = false;
  let denialNeedsClear = false;
  let revocations = null;
  try { revocations = new BroadcastChannel(key); } catch {}
  let opener = null;
  function valid(value) {
    return value && value.version === version && typeof value.analytics === 'boolean' &&
      Number.isFinite(value.savedAt) && value.savedAt <= Date.now() && Date.now() - value.savedAt < lifetime;
  }
  function parse(raw) {
    try { const value=JSON.parse(raw);return valid(value)?value:null; }
    catch { return null; }
  }
  function savedDenial() {
    try { const value=parse(sessionStorage.getItem(denialKey));return value?.analytics===false?value:null; }
    catch { return null; }
  }
  function read() {
    // A choice made in this document must outrank a readable, stale saved grant.
    if(valid(memory))return memory;
    const denial=savedDenial();
    if(denial)return denial;
    try { return parse(localStorage.getItem(key)); }
    catch { storageAvailable=false;return null; }
  }
  function persist(analytics) {
    memory={version,analytics:!!analytics&&configured,savedAt:Date.now()};
    const raw=JSON.stringify(memory);
    let durable=false;
    storageAvailable=false;
    try {
      localStorage.setItem(key,raw);
      durable=localStorage.getItem(key)===raw;
      storageAvailable=durable;
    } catch {}
    if(!memory.analytics){
      // A tab-scoped denial also protects navigation when localStorage is read-only.
      try {
        sessionStorage.setItem(denialKey,raw);
        durable=sessionStorage.getItem(denialKey)===raw||durable;
      } catch {}
    }else{
      try { sessionStorage.removeItem(denialKey); } catch {}
      // Never reload a re-grant into an unresolved session denial.
      durable=durable&&!savedDenial();
    }
    denialNeedsClear=!memory.analytics&&!durable;
    return durable;
  }
  function clearCookies() {
    const names = document.cookie.split(';').map(c=>c.trim().split('=')[0]).filter(n=>/^_ga(?:_|$)/.test(n));
    const hostParts = location.hostname.split('.');
    const domains = ['', location.hostname, '.'+location.hostname];
    // Try parent domains for first-party cookies, never unrelated cookie names.
    for (let i=1;i<hostParts.length-1;i++) domains.push('.'+hostParts.slice(i).join('.'));
    const paths = ['/'];
    const parts = location.pathname.split('/').filter(Boolean);
    for (let i=1;i<=parts.length;i++) paths.push('/'+parts.slice(0,i).join('/'));
    for (const name of names) for (const domain of domains) for (const path of paths) {
      document.cookie = name+'=; Max-Age=0; path='+path+'; SameSite=Lax'+(domain?'; domain='+domain:'');
    }
  }
  function stop(reloadSafe=false) {
    halted=true;
    window['ga-disable-'+id] = true;
    window.gtag = () => {};
    if (window.dataLayer) window.dataLayer.length = 0;
    document.getElementById('lilora-google-tag')?.remove();
    clearCookies();
    if (started && reloadSafe) location.reload(); // Only with a verified durable denial.
  }
  function start() {
    if (started || halted || !configured || !read()?.analytics) return;
    started = true;
    window['ga-disable-'+id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view:false, allow_google_signals:false, allow_ad_personalization_signals:false,
      page_location:location.origin+location.pathname, page_referrer:'', page_title:document.title,
      cookie_expires:15552000, cookie_update:false, cookie_flags:'SameSite=Lax;Secure'
    });
    window.gtag('event', 'page_view', {
      page_location:location.origin+location.pathname, page_referrer:'',
      page_title:document.title, language:document.documentElement.lang
    });
    const script=document.createElement('script');
    script.id='lilora-google-tag';script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+id;
    document.head.append(script);
  }
  const privacy=(locale.language==='tr'?'/':'/'+locale.language+'/')+'privacy/#website-analytics';
  const banner=document.createElement('section');
  banner.className='cookie-banner';banner.setAttribute('aria-label',t.title);
  banner.innerHTML=`<p>${t.shortIntro}</p><div class="cookie-actions"><button type="button" data-action="accept" aria-label="${t.accept}">${t.shortAccept}</button><button type="button" data-action="reject" aria-label="${t.reject}">${t.shortReject}</button><button type="button" data-action="preferences" aria-label="${t.preferences}" aria-haspopup="dialog">${t.shortPreferences}</button></div>`;
  const dialog=document.createElement('dialog');
  dialog.className='cookie-dialog';dialog.setAttribute('aria-labelledby','cookie-dialog-title');dialog.setAttribute('aria-describedby','cookie-dialog-intro');
  dialog.innerHTML=`<div class="cookie-dialog-heading"><p class="eyebrow">lilora</p><button type="button" data-action="close" aria-label="${t.close}">×</button></div><h2 id="cookie-dialog-title" tabindex="-1">${t.title}</h2><p id="cookie-dialog-intro">${t.intro}</p><div class="cookie-category"><label><input type="checkbox" checked disabled> <strong>${t.necessary}</strong></label><p>${t.necessaryText}</p></div><div class="cookie-category"><label><input id="cookie-analytics-choice" type="checkbox" ${configured?'':'disabled'}> <strong>${t.analytics}</strong></label><p>${t.analyticsText}</p>${configured?'':`<p>${t.disabled}</p>`}</div><p class="cookie-storage-message" role="status"></p><p><a href="${privacy}">${t.privacy}</a></p><div class="cookie-actions"><button type="button" data-action="accept">${t.accept}</button><button type="button" data-action="reject">${t.reject}</button><button type="button" data-action="save">${t.save}</button></div><button class="cookie-withdraw" type="button" data-action="withdraw">${t.withdraw}</button>`;
  const footer=document.querySelector('.cookie-settings')||document.createElement('button');footer.type='button';footer.className='cookie-settings';footer.textContent=t.footer;
  const status=document.createElement('p');status.className='cookie-status';status.setAttribute('role','status');
  document.body.append(banner,dialog);
  if(!footer.isConnected)(document.querySelector('.footer')||document.body).append(footer);
  (document.querySelector('.footer')||document.body).append(status);
  const checkbox=dialog.querySelector('#cookie-analytics-choice');
  function refresh() {
    const preference=read();banner.hidden=!!preference;
    checkbox.checked=!!preference?.analytics;
    dialog.querySelector('.cookie-withdraw').hidden=!preference?.analytics;
    dialog.querySelector('.cookie-storage-message').textContent=denialNeedsClear?t.denialUnavailable:(storageAvailable?'':t.unavailable);
    for(const button of document.querySelectorAll('.cookie-actions [data-action="accept"]'))button.disabled=!configured;
  }
  function open() {
    opener=document.activeElement;refresh();dialog.showModal();
    dialog.querySelector('h2').focus();
  }
  function close() {
    dialog.close();
    if(opener && !opener.closest('[hidden]'))opener.focus();else footer.focus();
  }
  function choose(analytics) {
    const wasStarted=started;
    const durable=persist(analytics);
    // Once stopped, reuse of a loaded tag is unsafe. A re-grant needs a clean load.
    if(analytics&&halted){
      if(durable){location.reload();return;}
      persist(false);
    }
    refresh();
    status.textContent=denialNeedsClear?t.denialUnavailable:(storageAvailable?t.saved:t.unavailable);
    if(dialog.open)close();else footer.focus();
    if(!read()?.analytics){
      clearCookies();
      try { revocations?.postMessage({version,analytics:false,savedAt:Date.now()}); } catch {}
      if(wasStarted)stop(durable);
    }
    else start();
  }
  const handler=event=>{
    const action=event.target.closest('button')?.dataset.action;
    if(action==='accept')choose(true);
    if(action==='reject'||action==='withdraw')choose(false);
    if(action==='save')choose(checkbox.checked);
    if(action==='preferences')open();
    if(action==='close')close();
  };
  banner.addEventListener('click',handler);dialog.addEventListener('click',handler);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const controls=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')].filter(el=>!el.closest('[hidden]'));
    if(!controls.length)return;
    const index=controls.indexOf(document.activeElement);
    const next=index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length;
    event.preventDefault();controls[next].focus();
  });
  footer.addEventListener('click',open);
  function receiveDenial() {
    // Also covers peers whose localStorage getter still exposes the old grant.
    let existing=null;
    try { existing=parse(localStorage.getItem(key)); } catch {}
    let durable;
    if(existing?.analytics===false){
      // Do not echo a storage event back into another write/reload loop.
      memory=existing;durable=true;denialNeedsClear=false;
      try { sessionStorage.setItem(denialKey,JSON.stringify(memory)); } catch {}
    }else durable=persist(false);
    refresh();
    status.textContent=denialNeedsClear?t.denialUnavailable:(storageAvailable?t.saved:t.unavailable);
    stop(durable);
  }
  if(revocations)revocations.onmessage=event=>{
    if(valid(event.data)&&event.data.analytics===false)receiveDenial();
  };
  window.addEventListener('storage',event=>{
    if(event.storageArea!==localStorage || (event.key!==key && event.key!==null))return;
    const incoming=parse(event.newValue);
    if(!incoming?.analytics){receiveDenial();return;}
    // Another tab's grant must not overwrite a denial in this document/session.
    refresh();
    if(!read()?.analytics)stop();else start();
  });
  document.addEventListener('click',event=>{
    if(!started||!read()?.analytics)return;
    const link=event.target.closest('a[data-analytics-cta]');if(!link)return;
    const target=new URL(link.href);
    if(target.hostname==='apps.apple.com')window.gtag('event','app_store_click',{language:document.documentElement.lang,page_path:location.pathname});
    else if(target.origin===location.origin)window.gtag('event','app_info_click',{language:document.documentElement.lang,page_path:location.pathname,destination_path:target.pathname});
  });
  refresh();
  if(!read()?.analytics)clearCookies();else start();
})();

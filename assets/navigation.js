/* Native disclosures work without JS: the menu summary becomes the close control.
   With JS, the full-screen mobile menu keeps focus inside and closes on Escape. */
(() => {
 const menu=document.querySelector('.mobile-menu');
 if(menu){
  const summary=menu.querySelector('summary'),panel=menu.querySelector('.mobile-panel');
  const hide=()=>{menu.open=false;summary.focus();};
  summary.setAttribute('aria-expanded','false');
  menu.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(menu.open)));
  menu.addEventListener('keydown',event=>{
   if(!menu.open)return;
   if(event.key==='Escape'){event.preventDefault();hide();}
   if(event.key!=='Tab')return;
   const controls=[summary,...panel.querySelectorAll('a[href]')];const i=controls.indexOf(document.activeElement);
   event.preventDefault();controls[(i+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
  });
  const media=matchMedia('(min-width: 1200px)');media.addEventListener('change',()=>{if(media.matches)menu.open=false;});
 }
 // FAQ answers open when a link points at them (for example /support/#reminders).
 const openTarget=()=>{
  let id;
  try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const item=id&&document.getElementById(id);if(item&&item.matches('details.faq-item'))item.open=true;
 };
 openTarget();addEventListener('hashchange',openTarget);
 // Back to top appears after about one and a half screens of scrolling.
 const top=document.querySelector('.back-to-top');
 if(top){const update=()=>{top.hidden=scrollY<innerHeight*1.5;};update();addEventListener('scroll',update,{passive:true});addEventListener('resize',update);}
 // Plant library: chips filter the photo grid in place; without JS they jump to static lists.
 const browser=document.querySelector('.plant-browser');
 if(browser){
  const chips=[...browser.querySelectorAll('.plant-chip')],cards=[...browser.querySelectorAll('.plant-card')],count=browser.querySelector('.plant-count'),template=browser.dataset.countTemplate;
  for(const section of browser.querySelectorAll('.plant-filter'))section.hidden=true;
  const apply=filter=>{let shown=0;for(const card of cards){const match=filter==='all'||card.dataset.tags.split(' ').includes(filter);card.hidden=!match;if(match)shown++;}
   for(const chip of chips){if(chip.dataset.filter===filter)chip.setAttribute('aria-current','true');else chip.removeAttribute('aria-current');}if(count)count.textContent=template.replace('{n}',shown);};
  for(const chip of chips)chip.addEventListener('click',event=>{event.preventDefault();const filter=chip.dataset.filter;apply(filter);history.replaceState(history.state,'',filter==='all'?location.pathname:'#'+filter);});
  const initial=location.hash.slice(1);if(chips.some(c=>c.dataset.filter===initial))apply(initial);
 }
 // Language dropdowns: Escape closes, and a click elsewhere closes an open list.
 const pickers=[...document.querySelectorAll('.language-picker,.footer-language')];
 for(const picker of pickers)picker.addEventListener('keydown',event=>{if(event.key==='Escape'&&picker.open){picker.open=false;picker.querySelector('summary').focus();}});
 document.addEventListener('click',event=>{for(const picker of pickers)if(picker.open&&!picker.contains(event.target))picker.open=false;});
 // Contact and launch-notice forms: send in place with fetch; without JS the browser posts and the function redirects back here.
 for(const form of document.querySelectorAll('.contact-form')){
  const status=form.querySelector('.contact-status'),button=form.querySelector('button[type="submit"]'),started=form.elements.started;
  const show=code=>{const text=form.dataset[code]||form.dataset.error;status.textContent=text;status.dataset.state=code;status.hidden=false;};
  started.value=String(Date.now());
  const code=new URLSearchParams(location.search).get('form');if(code&&form.dataset[code])show(code);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(button.disabled)return;
   button.disabled=true;show('sending');
   try{
    const response=await fetch(form.action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    const result=await response.json().catch(()=>({}));const code=result.code||(response.ok?'sent':'error');
    show(code);if(code==='published')form.dispatchEvent(new Event('comment-published',{bubbles:true}));if(code==='sent'||code==='published'){form.reset();started.value=String(Date.now());}
   }catch{show('error');}
   button.disabled=false;
  });
 }
})();
/* Guide share control: native share sheet where supported, copy-link fallback otherwise.
   No third-party scripts and no analytics; the shared URL is the page's clean canonical address. */
(() => {
 for(const box of document.querySelectorAll('.share-tools')){
  const button=box.querySelector('.share-button'),status=box.querySelector('.share-status'),d=box.dataset,url=d.shareUrl;
  const native=typeof navigator.share==='function';
  if(!native&&!(navigator.clipboard&&navigator.clipboard.writeText))continue;
  button.textContent=native?d.labelShare:d.labelCopy;box.hidden=false;
  button.addEventListener('click',async()=>{
   status.textContent='';
   if(native){try{await navigator.share({title:d.shareTitle,url});}catch(e){}return;}
   try{await navigator.clipboard.writeText(url);status.textContent=d.labelCopied;}catch(e){status.textContent=d.labelFailed+' '+url;}
  });
 }
})();

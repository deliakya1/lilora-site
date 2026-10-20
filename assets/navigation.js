/* Native disclosures work without JS; the mobile panel gains modal keyboard behavior. */
(() => {
 const menu=document.querySelector('.mobile-menu');if(!menu)return;
 const summary=menu.querySelector('summary'),panel=menu.querySelector('.mobile-panel'),close=panel.querySelector('.menu-close');close.hidden=false;
 const hide=()=>{menu.open=false;summary.focus();};
 close.addEventListener('click',hide);
 menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open)close.focus();});
 menu.addEventListener('keydown',event=>{
  if(!menu.open)return;
  if(event.key==='Escape'){event.preventDefault();hide();}
  if(event.key!=='Tab')return;
  const controls=[close,...panel.querySelectorAll('a[href]')];const i=controls.indexOf(document.activeElement);
  event.preventDefault();controls[(i+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
 });
 document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
 const media=matchMedia('(min-width: 1100px)');media.addEventListener('change',()=>{if(media.matches)menu.open=false;});
 for(const picker of document.querySelectorAll('.language-picker'))picker.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.open=false;picker.querySelector('summary').focus();}});
})();

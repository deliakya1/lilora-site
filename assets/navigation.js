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
  const media=matchMedia('(min-width: 1100px)');media.addEventListener('change',()=>{if(media.matches)menu.open=false;});
 }
 // Language dropdowns: Escape closes, and a click elsewhere closes an open list.
 const pickers=[...document.querySelectorAll('.language-picker,.footer-language')];
 for(const picker of pickers)picker.addEventListener('keydown',event=>{if(event.key==='Escape'&&picker.open){picker.open=false;picker.querySelector('summary').focus();}});
 document.addEventListener('click',event=>{for(const picker of pickers)if(picker.open&&!picker.contains(event.target))picker.open=false;});
})();

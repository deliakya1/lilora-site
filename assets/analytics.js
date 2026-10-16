/* Basic consent: no Google script, request, or event before explicit opt-in. */
(() => {
  'use strict';
  const id = window.LILORA_ANALYTICS_ID;
  if (!/^G-[A-Z0-9]{6,20}$/.test(id || '')) return;
  const key = 'lilora.analytics-consent.v1';
  const tr = document.documentElement.lang === 'tr';
  let started = false;
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = value => { try { localStorage.setItem(key, value); } catch {} };
  const ui = tr ? {
    title: 'İsteğe bağlı site analitiği', text: 'İzin verirsen Google Analytics ile hangi sayfaların okunduğunu ve bağlantıların kullanıldığını ölçeriz. Reddetsen de site çalışır.', yes: 'Analitiğe izin ver', no: 'Reddet', settings: 'Analitik tercihi', revoke: 'İzni geri al', privacy: 'Gizlilik açıklaması'
  } : {
    title: 'Optional website analytics', text: 'With your permission, Google Analytics helps us understand which pages people read and which links they use. The site works if you decline.', yes: 'Allow analytics', no: 'Decline', settings: 'Analytics preference', revoke: 'Withdraw consent', privacy: 'Privacy explanation'
  };
  function start() {
    if (started || read() !== 'granted') return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: '',
      page_title: document.title
    });
    window.gtag('event', 'page_view', {
      page_location: location.origin + location.pathname,
      page_referrer: '', page_title: document.title,
      language: document.documentElement.lang
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    script.id = 'lilora-google-tag';
    document.head.append(script);
  }
  function revoke() {
    save('denied');
    window['ga-disable-' + id] = true;
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
      }
    }
    // Reload removes the loaded Google tag. No consent-mode ping is sent.
    location.reload();
  }
  const panel = document.createElement('section');
  panel.className = 'consent-panel'; panel.setAttribute('aria-labelledby', 'consent-title');
  panel.innerHTML = `<h2 id="consent-title">${ui.title}</h2><p>${ui.text} <a href="${tr ? '/' : '/en/'}privacy/#website-analytics">${ui.privacy}</a>.</p><div class="consent-actions"><button type="button" data-choice="yes">${ui.yes}</button><button type="button" data-choice="no">${ui.no}</button><button type="button" data-choice="revoke">${ui.revoke}</button></div>`;
  document.body.append(panel);
  const refresh = () => { panel.querySelector('[data-choice="revoke"]').hidden = read() !== 'granted'; };
  panel.hidden = read() !== null; refresh();
  panel.addEventListener('click', event => {
    const choice = event.target.closest('button')?.dataset.choice;
    if (!choice) return;
    if (choice === 'revoke' || (choice === 'no' && read() === 'granted')) { revoke(); return; }
    save(choice === 'yes' ? 'granted' : 'denied');
    panel.hidden = true; refresh();
    if (choice === 'yes') start();
    settings.focus();
  });
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'consent-settings'; settings.textContent = ui.settings;
  settings.addEventListener('click', () => { panel.hidden = !panel.hidden; refresh(); if (!panel.hidden) panel.querySelector('button').focus(); });
  (document.querySelector('.footer') || document.body).append(settings);
  document.addEventListener('click', event => {
    if (!started || read() !== 'granted') return;
    const link = event.target.closest('a[data-analytics-cta]');
    if (!link) return;
    const target = new URL(link.href);
    if (target.hostname === 'apps.apple.com') {
      window.gtag('event', 'app_store_click', {language: document.documentElement.lang, page_path: location.pathname});
    } else if (target.origin === location.origin) {
      window.gtag('event', 'app_info_click', {language: document.documentElement.lang, page_path: location.pathname, destination_path: target.pathname});
    }
  });
  start();
})();

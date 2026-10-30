// Printed QR codes open /download/?utm_source=qr…; send those scans straight to the
// App Store listing. Everyone else reads the page and taps the App Store action.
(() => {
  const store = document.currentScript?.dataset.store;
  if (!store || new URLSearchParams(location.search).get('utm_source') !== 'qr') return;
  location.replace(store);
})();

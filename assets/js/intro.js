/* ==========================================================================
   GP Development — Οθόνη φόρτωσης: τι περιμένει
   Το λογότυπο το κινεί το inline script μετά την κεφαλίδα (build.py: ΦΟΡΤΩΤΗΣ).
   Εδώ μαζεύουμε ό,τι χρειάζεται η σελίδα: τα καρέ των δύο βίντεο και τις μάσκες (home.js,
   sections.js), όλες τις εικόνες (και όσες θα φόρτωναν αργότερα) και τις γραμματοσειρές.
   Όταν έρθουν όλα, το λογότυπο πηγαίνει στη γωνία και αποκαλύπτεται η σελίδα.
   ========================================================================== */
(() => {
  'use strict';
  const Φ = window.gpΦόρτωση;
  if (!Φ || Φ.παράλειψη) return;
  Φ.ανέλαβε = true;

  const όλεςΟιΕικόνες = () => [...document.querySelectorAll('img')].map((im) => {
    if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
    if (im.loading === 'lazy') im.loading = 'eager';
    if (im.decode) return im.decode().catch(() => {});
    return im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; });
  });

  όλεςΟιΕικόνες();
  const συνέχεια = () => {
    const γραμματοσειρές = document.fonts && document.fonts.ready ? document.fonts.ready : null;
    Promise.all([...Φ.εργασίες, ...όλεςΟιΕικόνες(), γραμματοσειρές]).then(Φ.έτοιμο, Φ.έτοιμο);
  };
  if (document.readyState === 'complete') συνέχεια(); else window.addEventListener('load', συνέχεια, { once: true });
})();

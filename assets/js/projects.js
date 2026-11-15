/* ==========================================================================
   GP Development — Σελίδες έργων
   - Απαλή εμφάνιση στοιχείων στο scroll
   - Προβολή εικόνων γκαλερί (dialog, πλήκτρα, swipe)
   - «Ενδιαφέρομαι» σε κατοικία: προεπιλογή στη φόρμα
   - Χάρτης που φορτώνει μόνο με κλικ (GDPR, ταχύτητα)
   Κεφαλίδα, μενού, φόρμα και υποσέλιδο: sections.js
   ========================================================================== */
(() => {
  'use strict';
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Εμφάνιση στο scroll ---------- */
  const στοιχεία = document.querySelectorAll('[data-αποκάλυψη]');
  if ('IntersectionObserver' in window && !μειωμένηΚίνηση) {
    const io = new IntersectionObserver((εγγραφές) => {
      εγγραφές.forEach((ε) => { if (ε.isIntersecting) { ε.target.classList.add('is-in'); io.unobserve(ε.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    στοιχεία.forEach((σ) => io.observe(σ));
  } else στοιχεία.forEach((σ) => σ.classList.add('is-in'));

  /* ---------- Προβολή εικόνων ---------- */
  const προβολή = document.querySelector('.προβολή');
  const κουμπιά = [...document.querySelectorAll('.γκαλερί__κουμπί')];
  if (προβολή && κουμπιά.length && typeof προβολή.showModal === 'function') {
    const img = προβολή.querySelector('img');
    const λεζάντα = προβολή.querySelector('[data-λεζάντα]');
    const μετρητής = προβολή.querySelector('[data-μετρητής]');
    let τρέχουσα = 0, επιστροφή = null;
    const δείξε = (i) => {
      τρέχουσα = (i + κουμπιά.length) % κουμπιά.length;
      const κ = κουμπιά[τρέχουσα];
      img.src = κ.dataset.μεγάλη;
      img.alt = κ.dataset.λεζάντα;
      λεζάντα.textContent = κ.dataset.λεζάντα;
      μετρητής.textContent = `${String(τρέχουσα + 1).padStart(2, '0')} / ${String(κουμπιά.length).padStart(2, '0')}`;
      // Προφόρτωση της επόμενης
      const επ = κουμπιά[(τρέχουσα + 1) % κουμπιά.length];
      if (επ) { const π = new Image(); π.src = επ.dataset.μεγάλη; }
    };
    κουμπιά.forEach((κ, i) => κ.addEventListener('click', () => { επιστροφή = κ; δείξε(i); προβολή.showModal(); }));
    προβολή.querySelector('.προβολή__κλείσιμο').addEventListener('click', () => προβολή.close());
    προβολή.querySelector('.προβολή__βέλος--πίσω').addEventListener('click', () => δείξε(τρέχουσα - 1));
    προβολή.querySelector('.προβολή__βέλος--εμπρός').addEventListener('click', () => δείξε(τρέχουσα + 1));
    προβολή.addEventListener('keydown', (ε) => {
      if (ε.key === 'ArrowLeft') { ε.preventDefault(); δείξε(τρέχουσα - 1); }
      if (ε.key === 'ArrowRight') { ε.preventDefault(); δείξε(τρέχουσα + 1); }
    });
    // Κλικ στο κενό γύρω από την εικόνα κλείνει
    προβολή.addEventListener('click', (ε) => { if (ε.target === προβολή) προβολή.close(); });
    προβολή.addEventListener('close', () => { if (επιστροφή) επιστροφή.focus({ preventScroll: true }); });
    // Swipe
    let αρχήX = null;
    προβολή.addEventListener('touchstart', (ε) => { αρχήX = ε.touches[0].clientX; }, { passive: true });
    προβολή.addEventListener('touchend', (ε) => {
      if (αρχήX === null) return;
      const dx = ε.changedTouches[0].clientX - αρχήX; αρχήX = null;
      if (Math.abs(dx) > 50) δείξε(τρέχουσα + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Κατοικίες: καρτέλες με φύλλο στοιχείων (δομή όπως στη MIA) ----------
     Καρτέλες με βέλη αριστερά/δεξιά και πλήκτρα. Ένας σύνδεσμος #residence-… (π.χ. από τη νύχτα της αρχικής)
     ανοίγει την αντίστοιχη κατοικία και φέρνει το πάνελ στην οθόνη. */
  const πάνελ = document.querySelector('[data-μονάδες]');
  if (πάνελ) {
    const καρτέλες = [...πάνελ.querySelectorAll('[role="tab"]')];
    const σελίδες = [...πάνελ.querySelectorAll('[data-μονάδα]')];
    const πίσω = πάνελ.querySelector('[data-προηγούμενη]');
    const μπρος = πάνελ.querySelector('[data-επόμενη]');
    let ενεργή = 0;
    const επιλογή = (i, εστίαση) => {
      i = Math.max(0, Math.min(καρτέλες.length - 1, i));
      ενεργή = i;
      καρτέλες.forEach((κ, j) => { κ.setAttribute('aria-selected', String(j === i)); κ.tabIndex = j === i ? 0 : -1; });
      σελίδες.forEach((σ, j) => { σ.hidden = j !== i; });
      πίσω.disabled = i === 0; μπρος.disabled = i === καρτέλες.length - 1;
      // Η καρτέλα στο κέντρο της λωρίδας, χωρίς να κουνηθεί η σελίδα
      const λωρίδα = καρτέλες[i].parentNode, κ = καρτέλες[i];
      λωρίδα.scrollTo({ left: κ.offsetLeft - (λωρίδα.clientWidth - κ.offsetWidth) / 2, behavior: μειωμένηΚίνηση ? 'auto' : 'smooth' });
      if (εστίαση) κ.focus({ preventScroll: true });
    };
    καρτέλες.forEach((κ, i) => {
      κ.addEventListener('click', () => επιλογή(i));
      κ.addEventListener('keydown', (ε) => {
        const β = { ArrowRight: 1, ArrowLeft: -1 }[ε.key];
        if (β) { ε.preventDefault(); επιλογή(ενεργή + β, true); }
        if (ε.key === 'Home') { ε.preventDefault(); επιλογή(0, true); }
        if (ε.key === 'End') { ε.preventDefault(); επιλογή(καρτέλες.length - 1, true); }
      });
    });
    πίσω.addEventListener('click', () => επιλογή(ενεργή - 1));
    μπρος.addEventListener('click', () => επιλογή(ενεργή + 1));
    const απόHash = () => {
      const i = σελίδες.findIndex((σ) => '#' + σ.id === decodeURIComponent(location.hash));
      if (i < 0) return;
      επιλογή(i);
      requestAnimationFrame(() => πάνελ.scrollIntoView({ block: 'start', behavior: μειωμένηΚίνηση ? 'auto' : 'smooth' }));
    };
    window.addEventListener('hashchange', απόHash);
    επιλογή(0); απόHash();
  }

  /* ---------- «Η εταιρεία»: ο τίτλος βυθίζεται πίσω από το κτίριο ----------
     Με το scroll ο τίτλος κατεβαίνει πιο αργά από τη σελίδα (μένει πίσω του) και το κτίριο ανεβαίνει λίγο:
     τα γράμματα «χάνονται» μέσα στη σκιά και την ομίχλη του. */
  const βύθιση = document.querySelector('[data-βύθιση]');
  if (βύθιση && !μειωμένηΚίνηση) {
    const τίτλος = βύθιση.querySelector('[data-βύθιση-τίτλος]');
    const κτίριο = βύθιση.querySelector('[data-βύθιση-κτίριο]');
    let αναμονή = false;
    const ενημέρωση = () => {
      αναμονή = false;
      const r = βύθιση.getBoundingClientRect();
      const π = Math.min(1, Math.max(0, -r.top / r.height));
      τίτλος.style.setProperty('--βύθιση', (π * r.height * 0.42).toFixed(1) + 'px');
      κτίριο.style.setProperty('--άνοδος', (-π * r.height * 0.1).toFixed(1) + 'px');
    };
    const σύντομα = () => { if (!αναμονή) { αναμονή = true; requestAnimationFrame(ενημέρωση); } };
    window.addEventListener('scroll', σύντομα, { passive: true });
    window.addEventListener('resize', σύντομα);
    ενημέρωση();
  }

  /* ---------- «Ενδιαφέρομαι»: προεπιλογή κατοικίας στη φόρμα ---------- */
  const λίστα = document.querySelector('#f-residence');
  document.addEventListener('click', (ε) => {
    const σ = ε.target.closest('a[data-κατοικία]');
    if (!σ) return;
    if (λίστα) {
      const επ = [...λίστα.options].find((o) => o.value === σ.dataset.κατοικία);
      if (επ) λίστα.value = επ.value;
    }
    // Το άλμα στη φόρμα γίνεται από τον σύνδεσμο· μετά εστίαση στο πρώτο κενό πεδίο
    setTimeout(() => {
      const πεδίο = document.querySelector('#f-name');
      if (πεδίο && !πεδίο.value) πεδίο.focus({ preventScroll: true });
    }, μειωμένηΚίνηση ? 50 : 900);
  });

  /* ---------- Επικοινωνία: προεπιλογή πρόθεσης από το URL (π.χ. /contact/?intent=land) ---------- */
  const πρόθεση = new URLSearchParams(location.search).get('intent');
  if (πρόθεση) {
    const κουτί = document.querySelector(`[data-φόρμα] input[name="intent"][value="${CSS.escape(πρόθεση)}"]`);
    if (κουτί) { κουτί.checked = true; κουτί.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  /* ---------- Επικοινωνία: ημερολόγιο Cal.com ----------
     Φορτώνει το embed του Cal.com μόνο όταν το πλαίσιο πλησιάσει στην οθόνη (ταχύτητα, λιγότερα τρίτα scripts).
     Ενεργό μόνο όταν έχει οριστεί CAL_LINK (sections_data.py) → data-cal-link στη σελίδα. */
  const cal = document.querySelector('[data-cal-link]');
  if (cal) {
    const φόρτωσε = () => {
      /* Επίσημος φορτωτής του Cal.com (embed.js) */
      (function (C, A, L) { const p = function (a, ar) { a.q.push(ar); }; const d = C.document; C.Cal = C.Cal || function () { const c = C.Cal; const ar = arguments; if (!c.loaded) { c.ns = {}; c.q = c.q || []; d.head.appendChild(d.createElement('script')).src = A; c.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const ns = ar[1]; api.q = api.q || []; if (typeof ns === 'string') { c.ns[ns] = c.ns[ns] || api; p(c.ns[ns], ar); p(c, ['initNamespace', ns]); } else p(c, ar); return; } p(c, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', 'gp', { origin: 'https://cal.com' });
      window.Cal.ns.gp('inline', { elementOrSelector: '#cal-embed', calLink: cal.dataset.calLink, config: { layout: 'month_view', theme: 'light' } });
      window.Cal.ns.gp('ui', { theme: 'light', layout: 'month_view', hideEventTypeDetails: false, cssVarsPerTheme: { light: { 'cal-brand': '#1e1c1a' } } });
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ε) => { if (ε.some((x) => x.isIntersecting)) { io.disconnect(); φόρτωσε(); } }, { rootMargin: '400px 0px' });
      io.observe(cal);
    } else φόρτωσε();
  }

  /* ---------- Χάρτης με κλικ ---------- */
  document.querySelectorAll('[data-χάρτης]').forEach((χ) => {
    const κουμπί = χ.querySelector('button');
    if (!κουμπί) return;
    κουμπί.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = χ.dataset.χάρτης;
      f.title = χ.dataset.τίτλος || 'Map';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      κουμπί.replaceWith(f);
    });
  });
})();

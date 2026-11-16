/* Η εταιρεία — σκηνές της σελίδας (μόνο εδώ φορτώνεται).
   Ήρωας (data-σχ-ήρωας):    ο τίτλος κατεβαίνει πίσω από το κτίριο, το κτίριο ανεβαίνει, η λωρίδα ομίχλης κυλά
                             οριζόντια και ψηλώνει, ο ουρανός γέρνει προς το σούρουπο.
   Δήλωση (data-σχ-λέξεις):  οι λέξεις ανάβουν μία-μία με το scroll.
   Άνοιγμα (data-σχ-άνοιγμα): η φωτογραφία ανοίγει από παράθυρο σε ολόκληρη οθόνη και εμφανίζεται ο τίτλος.
   Αρχές (data-σχ-αρχές):    η αρχή στο κέντρο της οθόνης γίνεται ενεργή και αλλάζει η εικόνα. */
(() => {
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const αφή = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const πρόοδος = (el) => { const r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };

  // ---------- Αρχές: λειτουργεί και χωρίς κίνηση (απλή εναλλαγή εικόνας)
  const αρχές = document.querySelector('[data-σχ-αρχές]');
  const στοιχείαΑρχών = αρχές ? [...αρχές.querySelectorAll('[data-σχ-αρχή]')] : [];
  const εικόνεςΑρχών = αρχές ? [...αρχές.querySelectorAll('[data-σχ-εικόνα]')] : [];
  let ενεργή = 0;
  // Ζωντανές φωτογραφίες: κάθε βίντεο φορτώνει όταν χρειαστεί και παίζει μόνο όσο φαίνεται
  const παίξε = (β, ναι) => {
    if (!β || μειωμένηΚίνηση) return;
    if (ναι) {
      if (β.preload === 'none') { β.preload = 'auto'; β.load(); }
      if (!β.dataset.έτοιμο) { β.dataset.έτοιμο = '1'; β.addEventListener('playing', () => β.classList.add('παίζει'), { once: true }); }
      const υ = β.play(); if (υ && υ.catch) υ.catch(() => {});
    } else if (!β.paused) β.pause();
  };
  const βίντεοΑρχής = (k) => εικόνεςΑρχών[k] && εικόνεςΑρχών[k].querySelector('video');
  let αρχέςΟρατές = false;
  const ενεργοποίησε = (i) => {
    if (i === ενεργή) return;
    ενεργή = i;
    στοιχείαΑρχών.forEach((λ, k) => λ.classList.toggle('είναι-ενεργή', k === i));
    εικόνεςΑρχών.forEach((ε, k) => { ε.classList.toggle('είναι-ενεργή', k === i); παίξε(βίντεοΑρχής(k), αρχέςΟρατές && k === i); });
  };

  // Οι εικόνες των αρχών είναι κρυμμένες πίσω από clip-path: φορτώνονται όλες μαζί πριν φτάσει η ενότητα
  if (αρχές && 'IntersectionObserver' in window) {
    const ιο = new IntersectionObserver((ε) => {
      if (ε.some((x) => x.isIntersecting)) { εικόνεςΑρχών.forEach((f) => f.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; })); ιο.disconnect(); }
    }, { rootMargin: '150% 0px' });
    ιο.observe(αρχές);
  }

  if (μειωμένηΚίνηση) {
    στοιχείαΑρχών.forEach((λ) => λ.classList.add('είναι-ενεργή'));
    return;
  }

  // ---------- Ομαλό scroll σε ποντίκι/touchpad (όπως στην αρχική)
  let lenis = null;
  if (window.Lenis && !αφή) { lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true }); window.gpLenis = lenis; }

  const ήρωας = document.querySelector('[data-σχ-ήρωας]');
  const σκηνήΉρωα = ήρωας && ήρωας.querySelector('.σχ-ήρωας__σκηνή');
  const τίτλος = ήρωας && ήρωας.querySelector('.σχ-ήρωας__τίτλος');
  const κτίριο = ήρωας && ήρωας.querySelector('.σχ-ήρωας__εικόνα');
  const λέξειςΚουτί = document.querySelector('[data-σχ-λέξεις]');
  const λέξεις = λέξειςΚουτί ? [...λέξειςΚουτί.children] : [];
  const άνοιγμα = document.querySelector('[data-σχ-άνοιγμα]');
  const σκηνήΑνοίγματος = άνοιγμα && άνοιγμα.querySelector('.σχ-άνοιγμα__σκηνή');
  const βίντεοΑνοίγματος = άνοιγμα && άνοιγμα.querySelector('video');

  const ενημέρωση = () => {
    const h = innerHeight;
    if (ήρωας) {
      const r = ήρωας.getBoundingClientRect();
      if (r.bottom > 0) {
        const p = πρόοδος(ήρωας);
        // Ο τίτλος κατεβαίνει αργά πίσω από το σπίτι· τα σύννεφα ανεβαίνουν πιο γρήγορα και σκεπάζουν την οθόνη
        τίτλος.style.setProperty('--βύθιση', (ομαλό(0, 0.7, p) * h * 0.42).toFixed(1) + 'px');
        κτίριο.style.setProperty('--άνοδος', (-ομαλό(0, 1, p) * h * 0.1).toFixed(1) + 'px');
        σκηνήΉρωα.style.setProperty('--ρεύμα', (p * 2 - 1).toFixed(3));
        σκηνήΉρωα.style.setProperty('--δύση', (ομαλό(0.05, 0.7, p) * 0.85).toFixed(3));
        σκηνήΉρωα.style.setProperty('--ν', ομαλό(0.1, 0.8, p).toFixed(4));
      }
    }
    if (λέξεις.length) {
      const r = λέξειςΚουτί.getBoundingClientRect();
      // από τη στιγμή που μπαίνει στο κάτω μέρος της οθόνης ως το πάνω τρίτο
      const p = Math.min(1, Math.max(0, (h * 0.88 - r.top) / (h * 0.55 + r.height)));
      const πόσες = Math.round(p * λέξεις.length * 1.15);
      λέξεις.forEach((λ, i) => λ.classList.toggle('είναι-αναμμένη', i < πόσες));
    }
    if (άνοιγμα) {
      const r = άνοιγμα.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) {
        const p = πρόοδος(άνοιγμα);
        const σ = σκηνήΑνοίγματος.style;
        // Αποκάλυψη: όσο ανεβαίνει η ενότητα από πάνω (πρώτο 100vh), το βίντεο ξεζουμάρει και φωτίζει
        const α = ομαλό(0, 0.42, p);
        σ.setProperty('--ι-κλ', (1.12 - 0.12 * α).toFixed(4));
        σ.setProperty('--ι-σκ', (0.5 - 0.32 * α + 0.18 * ομαλό(0.5, 0.7, p)).toFixed(3));
        σ.setProperty('--ι-τ', ομαλό(0.55, 0.8, p).toFixed(3));
      }
    }
    if (αρχές) {
      const r = αρχές.getBoundingClientRect();
      const ορατές = r.bottom > 0 && r.top < h;
      if (ορατές !== αρχέςΟρατές) { αρχέςΟρατές = ορατές; παίξε(βίντεοΑρχής(ενεργή), ορατές); }
    }
    if (άνοιγμα) {
      const r = άνοιγμα.getBoundingClientRect();
      παίξε(βίντεοΑνοίγματος, r.bottom > 0 && r.top < h * 1.2);
    }
    if (στοιχείαΑρχών.length) {
      const κέντρο = h * 0.55;
      let καλύτερη = 0, απόσταση = Infinity;
      στοιχείαΑρχών.forEach((λ, i) => {
        const r = λ.getBoundingClientRect();
        const δ = Math.abs(r.top + r.height / 2 - κέντρο);
        if (δ < απόσταση) { απόσταση = δ; καλύτερη = i; }
      });
      ενεργοποίησε(καλύτερη);
    }
  };

  const βρόχος = (χρόνος) => {
    if (lenis) lenis.raf(χρόνος);
    ενημέρωση();
    requestAnimationFrame(βρόχος);
  };
  requestAnimationFrame(βρόχος);
})();

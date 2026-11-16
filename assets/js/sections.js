/* ==========================================================================
   GP Development — Αρχική, ενότητες 4–9
   - Τρεις αφετηρίες: καρτέλες ρόλων με δείκτη που γλιστρά
   - Πώς χτίζουμε: ακορντεόν που αλλάζει την εικόνα
   - Ερωτήσεις: ομαλό άνοιγμα <details>
   - Άνοδος: 121 καρέ drone συγχρονισμένα με το scroll, σύννεφο εισόδου, λεζάντες
   - Φόρμα: εμφανίζεται ακαριαία στο τέλος της ανόδου, έλεγχος πεδίων, αποστολή
   - Κεφαλίδα: ανοιχτή ή σκούρη ανάλογα με την επιφάνεια από κάτω
   ========================================================================== */
(() => {
  'use strict';
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const έχειGSAP = !!(window.gsap && window.ScrollTrigger) && !μειωμένηΚίνηση;
  const lenis = window.gpLenis || null;
  const περιορισμός = (v, a, b) => Math.min(b, Math.max(a, v));
  const ομαλό = (a, b, v) => { const t = περιορισμός((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  if (έχειGSAP) gsap.registerPlugin(ScrollTrigger);
  // Ο επισκέπτης μπήκε στο σάιτ: η οθόνη φόρτωσης της αρχικής δεν ξαναπαίζει σε αυτή την καρτέλα
  try { sessionStorage.setItem('gp-μέσα', '1'); } catch (ε) {}

  /* Ομαλή μετακίνηση (με Lenis όταν υπάρχει) */
  const μετάβασηΣε = (στόχος, διάρκεια = 1.6) => {
    if (lenis) lenis.scrollTo(στόχος, { duration: διάρκεια, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof στόχος === 'number') window.scrollTo({ top: στόχος, behavior: μειωμένηΚίνηση ? 'auto' : 'smooth' });
    else στόχος.scrollIntoView({ behavior: μειωμένηΚίνηση ? 'auto' : 'smooth' });
  };

  /* ---------- Εισόδοι κειμένων: γραμμή-γραμμή και απαλό ανέβασμα ---------- */
  document.querySelectorAll('[data-γραμμές] > span').forEach((s) => { const i = document.createElement('i'); while (s.firstChild) i.appendChild(s.firstChild); s.appendChild(i); });
  if (έχειGSAP) {
    document.querySelectorAll('[data-γραμμές]').forEach((τ) => {
      gsap.from(τ.querySelectorAll(':scope > span > i'), { yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.1, scrollTrigger: { trigger: τ, start: 'top 86%', toggleActions: 'play none none none' } });
    });
    document.querySelectorAll('[data-εμφάνιση]').forEach((σ) => {
      gsap.from(σ, { opacity: 0, y: 22, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: σ, start: 'top 90%', toggleActions: 'play none none none' } });
    });
  }

  /* ---------- Γεγονότα: η λωρίδα με τους αριθμούς (αρχική και «Η εταιρεία») ----------
     Μόλις φανεί: η γραμμή κάθε κελιού σχεδιάζεται και κάθε ψηφίο κυλά σαν μετρητής ως την τιμή του.
     Το κείμενο του dd μένει για τους αναγνώστες οθόνης· η κινούμενη εκδοχή είναι aria-hidden. */
  const φτιάξεΜετρητή = (dd) => {
    const κείμενο = dd.textContent.trim();
    const κρυφό = document.createElement('span'); κρυφό.className = 'οπτικά-κρυφό'; κρυφό.textContent = κείμενο;
    const μ = document.createElement('span'); μ.className = 'μετρητής'; μ.setAttribute('aria-hidden', 'true');
    const στήλες = [];
    [...κείμενο].forEach((χ) => {
      if (/\d/.test(χ)) {
        const ψ = document.createElement('span'); ψ.className = 'μετρητής__ψηφίο';
        const σ = document.createElement('span'); σ.className = 'μετρητής__στήλη'; σ.dataset.τελικό = χ;
        for (let ν = 0; ν <= 9; ν++) { const x = document.createElement('span'); x.textContent = ν; σ.appendChild(x); }
        ψ.appendChild(σ); μ.appendChild(ψ); στήλες.push(σ);
      } else { const x = document.createElement('span'); x.className = 'μετρητής__σύμβολο'; x.textContent = χ; μ.appendChild(x); }
    });
    dd.textContent = ''; dd.append(κρυφό, μ);
    // Αναλογικά ψηφία: κάθε θέση έχει το πλάτος του τελικού ψηφίου (το «1» στενό, το «0» φαρδύ),
    // ώστε ο αριθμός να διαβάζεται σωστά όταν σταματήσει. Η στήλη κεντράρεται μέσα της όσο κυλά.
    const μέτρο = document.createElement('span'); μέτρο.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    μ.appendChild(μέτρο);
    const πλάτος = (χ) => { μέτρο.textContent = χ; return μέτρο.getBoundingClientRect().width; };
    const μέγιστο = Math.max(...'0123456789'.split('').map(πλάτος));
    στήλες.forEach((σ) => {
      const w = πλάτος(σ.dataset.τελικό);
      σ.parentNode.style.width = w + 'px';
      σ.style.width = μέγιστο + 'px';
      σ.style.marginLeft = ((w - μέγιστο) / 2) + 'px';
    });
    μέτρο.remove();
    return στήλες;
  };
  document.querySelectorAll('.γεγονότα').forEach((λωρίδα) => {
    if (μειωμένηΚίνηση || !('IntersectionObserver' in window)) { λωρίδα.classList.add('is-in'); return; }
    const κελιά = [...λωρίδα.querySelectorAll('.γεγονός')];
    const στήλες = κελιά.map((γ) => { const dd = γ.querySelector('[data-μετρητής]'); return dd ? φτιάξεΜετρητή(dd) : []; });
    λωρίδα.classList.add('αναμονή');
    const io = new IntersectionObserver((ε) => {
      if (!ε.some((x) => x.isIntersecting)) return;
      io.disconnect();
      λωρίδα.classList.add('is-in');
      // Κελί-κελί από αριστερά, και μέσα σε κάθε κελί ψηφίο-ψηφίο
      κελιά.forEach((γ, i) => στήλες[i].forEach((σ, j) => setTimeout(() => σ.style.setProperty('--τ', σ.dataset.τελικό), 260 + i * 160 + j * 110)));
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(λωρίδα);
  });

  /* ==========================================================================
     4. ΤΡΕΙΣ ΑΦΕΤΗΡΙΕΣ
     ========================================================================== */
  const αφετηρίες = document.querySelector('.αφετηρίες');
  if (αφετηρίες) {
    const καρτέλες = [...αφετηρίες.querySelectorAll('.αφετηρίες__καρτέλα')];
    const δείκτης = αφετηρίες.querySelector('.κάψουλα__δείκτης');
    const κείμενο = αφετηρίες.querySelector('.αφετηρίες__κείμενο');
    const cta = αφετηρίες.querySelector('.κάψουλα__cta');
    let ενεργή = 0;
    const θέσηΔείκτη = () => {
      const κ = καρτέλες[ενεργή];
      δείκτης.style.setProperty('--δ-x', κ.offsetLeft + 'px');
      δείκτης.style.setProperty('--δ-πλάτος', κ.offsetWidth + 'px');
    };
    const επιλογή = (i, εστίαση) => {
      if (i === ενεργή) return;
      ενεργή = i;
      καρτέλες.forEach((κ, j) => { κ.setAttribute('aria-selected', String(j === i)); κ.tabIndex = j === i ? 0 : -1; });
      if (εστίαση) καρτέλες[i].focus();
      θέσηΔείκτη();
      κείμενο.setAttribute('aria-labelledby', καρτέλες[i].id);
      κείμενο.classList.add('is-changing'); cta.classList.add('is-changing');
      setTimeout(() => {
        κείμενο.textContent = καρτέλες[i].dataset.κείμενο;
        cta.querySelector('span').textContent = καρτέλες[i].dataset.cta;
        cta.dataset.πρόθεση = καρτέλες[i].dataset.ρόλος;
        κείμενο.classList.remove('is-changing'); cta.classList.remove('is-changing');
      }, 260);
    };
    καρτέλες.forEach((κ, i) => {
      κ.addEventListener('click', () => επιλογή(i));
      κ.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); επιλογή((ενεργή + 1) % καρτέλες.length, true); }
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); επιλογή((ενεργή - 1 + καρτέλες.length) % καρτέλες.length, true); }
      });
    });
    θέσηΔείκτη();
    window.addEventListener('resize', θέσηΔείκτη);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(θέσηΔείκτη);

    if (έχειGSAP) {
      // Το V5 ανεβαίνει αργά μέσα από το λευκό θόλωμα
      const img = αφετηρίες.querySelector('.αφετηρίες__κτίριο img');
      gsap.fromTo(img, { yPercent: 16, scale: 1.06 }, { yPercent: -2, scale: 1, ease: 'none', scrollTrigger: { trigger: '.αφετηρίες__κτίριο', start: 'top bottom', end: 'bottom 60%', scrub: true } });
      gsap.from('.αφετηρίες__κτίριο figcaption', { opacity: 0, x: -16, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.αφετηρίες__κτίριο', start: 'top 55%', toggleActions: 'play none none none' } });
      // Τα νήματα της αυγής παρασύρονται
      αφετηρίες.querySelectorAll('.αφετηρίες__αυγή img').forEach((σ, i) => {
        gsap.to(σ, { xPercent: i ? -8 : 8, yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.αφετηρίες__αυγή', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
  }

  /* ==========================================================================
     5. ΠΩΣ ΧΤΙΖΟΥΜΕ — ακορντεόν
     ========================================================================== */
  const τρόπος = document.querySelector('.τρόπος');
  if (τρόπος) {
    const στοιχεία = [...τρόπος.querySelectorAll('.ακορντεόν__στοιχείο')];
    // Ένα βίντεο για κάθε απάντηση: στο πλαίσιο (υπολογιστής) ή μέσα στην απάντηση (κινητό).
    // Παίζει μόνο το βίντεο της ανοιχτής απάντησης και μόνο όσο η ενότητα φαίνεται.
    const βίντεοΠλαισίου = [...τρόπος.querySelectorAll('.πλαίσιο__βίντεο')];
    const κινητό = window.matchMedia('(max-width: 960px)');
    let ενεργό = 0, ορατή = false;
    const παίξε = (β, ναι) => {
      if (!β || β.tagName !== 'VIDEO') return;   // φωτογραφίες: τίποτα να παίξει
      if (ναι && !μειωμένηΚίνηση) {
        if (β.preload === 'none') { β.preload = 'auto'; β.load(); }
        const υ = β.play(); if (υ && υ.catch) υ.catch(() => {});
      } else if (!β.paused) β.pause();
    };
    const ενημέρωσεΒίντεο = () => {
      βίντεοΠλαισίου.forEach((β, i) => { β.classList.toggle('είναι-ενεργό', i === ενεργό); παίξε(β, ορατή && !κινητό.matches && i === ενεργό); });
      στοιχεία.forEach((σ, i) => παίξε(σ.querySelector('.ακορντεόν__βίντεο'), ορατή && κινητό.matches && i === ενεργό && σ.classList.contains('is-open')));
    };
    στοιχεία.forEach((σ, i) => {
      const κουμπί = σ.querySelector('button');
      κουμπί.addEventListener('click', () => {
        const ήτανΑνοιχτό = σ.classList.contains('is-open');
        στοιχεία.forEach((ά) => { ά.classList.remove('is-open'); ά.querySelector('button').setAttribute('aria-expanded', 'false'); });
        if (!ήτανΑνοιχτό) {
          σ.classList.add('is-open'); κουμπί.setAttribute('aria-expanded', 'true');
          ενεργό = i;   // όταν κλείνει, μένει το τελευταίο βίντεο στο πλαίσιο
        }
        ενημέρωσεΒίντεο();
      });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ε) => { ορατή = ε[0].isIntersecting; ενημέρωσεΒίντεο(); }, { rootMargin: '20% 0px' }).observe(τρόπος);
    }
    κινητό.addEventListener && κινητό.addEventListener('change', ενημέρωσεΒίντεο);
    if (έχειGSAP) {
      gsap.from(στοιχεία, { opacity: 0, y: 26, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.ακορντεόν', start: 'top 82%', toggleActions: 'play none none none' } });
      gsap.from('.πλαίσιο__μέσα', { clipPath: 'inset(14% 12% 14% 12%)', duration: 1.6, ease: 'power4.out', scrollTrigger: { trigger: '.πλαίσιο', start: 'top 80%', toggleActions: 'play none none none' } });
    }
  }

  /* ==========================================================================
     6. ΕΡΩΤΗΣΕΙΣ — ομαλό άνοιγμα / κλείσιμο
     ========================================================================== */
  document.querySelectorAll('.ερώτηση').forEach((δ) => {
    const περίληψη = δ.querySelector('summary');
    const απάντηση = δ.querySelector('.ερώτηση__απάντηση');
    let κίνηση = null;
    // Η κατάσταση του εικονιδίου αλλάζει τη στιγμή του κλικ (και στο κλείσιμο),
    // όχι όταν τελειώσει η κίνηση και αφαιρεθεί το [open]
    δ.classList.toggle('is-open', δ.open);
    δ.addEventListener('toggle', () => { if (!κίνηση) δ.classList.toggle('is-open', δ.open); });
    περίληψη.addEventListener('click', (ev) => {
      if (μειωμένηΚίνηση || !απάντηση.animate) return;
      ev.preventDefault();
      const άνοιγμα = !δ.classList.contains('is-open');
      const από = δ.open ? απάντηση.offsetHeight : 0;
      if (κίνηση) { κίνηση.onfinish = null; κίνηση.cancel(); }
      δ.classList.toggle('is-open', άνοιγμα);
      if (άνοιγμα) {
        δ.open = true;
        const h = απάντηση.scrollHeight;
        κίνηση = απάντηση.animate([{ height: από + 'px', opacity: από ? 1 : 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
        κίνηση.onfinish = () => { κίνηση = null; };
      } else {
        κίνηση = απάντηση.animate([{ height: από + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' });
        κίνηση.onfinish = () => { δ.open = false; κίνηση = null; };
      }
    });
  });
  if (έχειGSAP) gsap.from('.ερώτηση', { opacity: 0, y: 20, duration: .9, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.ερωτήσεις__λίστα', start: 'top 85%', toggleActions: 'play none none none' } });

  /* ==========================================================================
     7. ΑΝΟΔΟΣ — καρέ drone με το scroll
     ========================================================================== */
  const άνοδος = document.querySelector('[data-άνοδος]');
  const επαφή = document.querySelector('.επαφή');
  const κεφαλίδα = document.querySelector('.κεφαλίδα');
  const ΚΑΡΕ = 121;
  const ΤΕΛΟΣ_ΒΙΝΤΕΟ = 0.93;     // μετά από εδώ το τελευταίο καρέ «κρατά» λίγο πριν τη φόρμα
  let πρόοδοςΑνόδου = 0;

  if (άνοδος) {
    const καμβάς = άνοδος.querySelector('.άνοδος__καμβάς');
    const ctx = καμβάς.getContext('2d', { alpha: false });
    const διαδρομή = άνοδος.querySelector('.άνοδος__διαδρομή');
    const πέπλο = άνοδος.querySelector('.άνοδος__πέπλο');
    const σύννεφα = [...άνοδος.querySelectorAll('.άνοδος__σύννεφο img')];
    const λεζάντες = [...άνοδος.querySelectorAll('.άνοδος__λεζάντα')];
    const ΠΑΡΑΘΥΡΑ = [[0.06, 0.32], [0.36, 0.62], [0.66, 0.92]];
    const σκηνήΑνόδου = άνοδος.querySelector('.άνοδος__σκηνή');
    const κάρτα = επαφή && επαφή.querySelector('.επαφή__κάρτα');

    const κινητό = () => window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.9;
    let φάκελος = κινητό() ? 'm' : 'd';
    let τρέχον = -1;
    let φωτεινότηταΚορυφής = null;   // ανά καρέ, για τον τόνο της κεφαλίδας
    fetch('/assets/drone/v2/meta.json').then((r) => r.json()).then((m) => { φωτεινότηταΚορυφής = m; }).catch(() => {});
    const στόχοςΚαρέ = () => Math.round(περιορισμός(πρόοδοςΑνόδου / ΤΕΛΟΣ_ΒΙΝΤΕΟ, 0, 1) * (ΚΑΡΕ - 1));
    const νέοςΠαίκτης = () => window.GPFrames({
      count: ΚΑΡΕ, radius: 8, anchors: 4, cache: κινητό() || (navigator.deviceMemory || 8) < 6 ? 24 : 40,
      url: (ε, i) => `/assets/drone/v2/${ε === 'lo' ? 'lo' : φάκελος}/${String(i).padStart(3, '0')}.webp`,
      onFrame: (i) => { if (Math.abs(i - στόχοςΚαρέ()) <= 2) ζωγράφισε(true); },
    });
    let καρέ = νέοςΠαίκτης();
    // Ξεκινά αμέσως μετά τα μικρά καρέ της πρώτης σκηνής· η οθόνη φόρτωσης περιμένει και αυτά
    const ξεκίνα = () => καρέ.start();
    window.addEventListener('gp:ουρανός-lo', ξεκίνα, { once: true });
    window.addEventListener('load', () => setTimeout(ξεκίνα, 2500), { once: true });
    if (window.gpΦόρτωση) window.gpΦόρτωση.add(καρέ.done);

    const μέγεθος = () => {
      // Όχι πάνω από την ανάλυση των καρέ: με «cover» η εικόνα κλιμακώνεται κατά max(πλάτος, ύψος)
      const [πw, πh] = φάκελος === 'd' ? [1440, 958] : [810, 1080];
      const κάλυψη = Math.max(καμβάς.clientWidth / πw, καμβάς.clientHeight / πh);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.max(0.75, 1 / κάλυψη));
      καμβάς.width = Math.round(καμβάς.clientWidth * dpr);
      καμβάς.height = Math.round(καμβάς.clientHeight * dpr);
      τρέχον = -1; ζωγράφισε(true);
    };
    let τρέχονΑκριβές = false;
    function ζωγράφισε(αναγκαστικά) {
      const i = στόχοςΚαρέ();
      καρέ.setTarget(i);
      if (!αναγκαστικά && i === τρέχον && τρέχονΑκριβές) return;
      const π = καρέ.nearest(i); if (!π) return;
      τρέχον = i; τρέχονΑκριβές = π.i === i;
      // cover: γεμίζει τον καμβά κρατώντας τις αναλογίες
      const im = π.im;
      const W = καμβάς.width, H = καμβάς.height;
      const s = Math.max(W / im.width, H / im.height);
      const w = im.width * s, h = im.height * s;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    }

    const ενημέρωση = () => {
      const r = άνοδος.getBoundingClientRect();
      const vh = window.innerHeight;
      const D = διαδρομή.offsetHeight || vh * 3;
      const είσοδος = περιορισμός((vh - r.top) / vh, 0, 1);      // 0 → 1 καθώς η ενότητα μπαίνει
      πρόοδοςΑνόδου = περιορισμός(-r.top / D, 0, 1);
      ζωγράφισε(false);

      // Σύννεφο: λευκό πέπλο που ανοίγει και σύννεφα που ανεβαίνουν
      const τ = περιορισμός(ομαλό(0.25, 1, είσοδος) * 0.7 + ομαλό(0, 0.09, πρόοδοςΑνόδου) * 0.3, 0, 1);
      const γεμάτο = 100 - τ * 150;
      πέπλο.style.setProperty('--πέπλο-γεμάτο', γεμάτο + '%');
      πέπλο.style.setProperty('--πέπλο-άκρη', (γεμάτο + 55) + '%');
      σύννεφα.forEach((σ, k) => {
        const ταχ = [1.25, 1, 0.8][k];
        const α = 1 - ομαλό(0.35, 0.95, τ * ταχ);
        σ.style.opacity = String(α);
        // translate (όχι margin): χωρίς layout σε κάθε καρέ scroll και χωρίς μετατόπιση διάταξης
        σ.style.translate = `0 ${(-τ * 70 * ταχ).toFixed(2)}vh`;
        // Δικό του στρώμα GPU μόνο όσο κινείται. Τρία μόνιμα στρώματα 1500px (μαζί με τα υπόλοιπα της
        // αρχικής) ξεπερνούσαν τη μνήμη του κινητού και τα σύννεφα τρεμόπαιζαν στο scroll.
        const κινείται = τ > 0 && α > 0;
        σ.style.visibility = α > 0 ? '' : 'hidden';
        σ.style.willChange = κινείται ? 'translate, opacity' : '';
      });

      // Λεζάντες: μπαίνουν και φεύγουν με θόλωμα
      λεζάντες.forEach((λ, k) => {
        const [a, b] = ΠΑΡΑΘΥΡΑ[k];
        const τοπ = (πρόοδοςΑνόδου - a) / (b - a);
        const α = ομαλό(0, 0.28, τοπ) * (1 - ομαλό(0.72, 1, τοπ));
        λ.style.opacity = α.toFixed(3);
        λ.style.transform = `translate3d(0, ${((0.5 - περιορισμός(τοπ, 0, 1)) * 60).toFixed(1)}px, 0)`;
        λ.style.filter = α < 0.99 ? `blur(${((1 - α) * 10).toFixed(1)}px)` : 'none';
      });

      // Φόρμα: αναδύεται σταδιακά στο τελευταίο κομμάτι της ανόδου (όχι ακαριαία)
      if (επαφή && κάρτα) {
        const εμφ = μειωμένηΚίνηση ? (πρόοδοςΑνόδου > 0.85 ? 1 : 0) : ομαλό(0.84, 0.99, πρόοδοςΑνόδου);
        const ορατή = εμφ > 0.001 || r.bottom < vh;
        κάρτα.style.setProperty('--εμφ', (r.bottom < vh ? 1 : εμφ).toFixed(3));
        επαφή.classList.toggle('is-visible', ορατή);
        επαφή.classList.toggle('is-settled', εμφ > 0.995 || r.bottom < vh);
        if (ορατή && !κάρτα.dataset.τόνος) κάρτα.dataset.τόνος = 'ανοιχτό';
        else if (!ορατή && κάρτα.dataset.τόνος) delete κάρτα.dataset.τόνος;
      }
      // Τόνος της σκηνής για την κεφαλίδα: λευκό πέπλο → ανοιχτός, αλλιώς από τη φωτεινότητα του καρέ
      if (φωτεινότηταΚορυφής) {
        const λ = φωτεινότηταΚορυφής[φάκελος][στόχοςΚαρέ()];
        const τ = γεμάτο > 6 || λ > 0.45 ? 'ανοιχτό' : 'σκούρο';
        if (σκηνήΑνόδου.dataset.τόνος !== τ) σκηνήΑνόδου.dataset.τόνος = τ;
      }
    };

    let αναμονή = false;
    const προγραμμάτισε = () => { if (αναμονή) return; αναμονή = true; requestAnimationFrame(() => { αναμονή = false; ενημέρωση(); }); };
    window.addEventListener('scroll', προγραμμάτισε, { passive: true });
    if (lenis) lenis.on('scroll', προγραμμάτισε);
    let χρονόμετροResize = 0;
    window.addEventListener('resize', () => {
      clearTimeout(χρονόμετροResize);
      χρονόμετροResize = setTimeout(() => {
        const νέος = κινητό() ? 'm' : 'd';
        if (νέος !== φάκελος) { φάκελος = νέος; καρέ.destroy(); καρέ = νέοςΠαίκτης(); καρέ.start(); }
        μέγεθος(); ενημέρωση();
      }, 120);
    });
    μέγεθος(); ενημέρωση();
  }

  /* ---------- Κεφαλίδα: πάντα ευανάγνωστη ----------
     Κάθε επιφάνεια δηλώνει τον τόνο της (data-τόνος): «ανοιχτό», «σκούρο» ή διαβάθμιση
     «Α>Β@0.4» (Α πάνω από το 40% του ύψους της, Β από κάτω). Οι δυναμικές σκηνές
     (ουρανός, άνοδος, φόρμα) τον ενημερώνουν μόνες τους. Κερδίζει η τελευταία στο DOM
     επιφάνεια που βρίσκεται κάτω από τη μέση της κεφαλίδας (= αυτή που είναι από πάνω). */
  const επιφάνειες = [...document.querySelectorAll('[data-τόνος]')].filter((el) => !el.closest('.κεφαλίδα'));
  const τόνοςΣτο = (y) => {
    let τόνος = 'ανοιχτό';
    for (const el of επιφάνειες) {
      const t = el.dataset.τόνος; if (!t) continue;
      const r = el.getBoundingClientRect();
      if (r.top > y || r.bottom < y || r.height === 0) continue;
      if (t.includes('>')) {
        const [ζεύγος, όριο] = t.split('@'); const [α, β] = ζεύγος.split('>');
        τόνος = (y - r.top) / r.height < parseFloat(όριο) ? α : β;
      } else τόνος = t;
    }
    return τόνος;
  };
  let τελευταίοY = window.scrollY;
  // Κρυφή κεφαλίδα μετά τη μετάβαση «εικόνα σε πλήρη οθόνη»: εμφανίζεται με scroll προς τα πάνω.
  // Στην κορυφή της σελίδας δεν υπάρχει scroll, οπότε μετράει και η ίδια η κίνηση (τροχός ή σύρσιμο προς τα κάτω).
  function εμφάνισηΚρυφήςΚεφαλίδας() {
    const ρ = document.documentElement;
    if (!ρ.classList.contains('κεφαλίδα-κρυφή')) return;
    ρ.classList.remove('κεφαλίδα-κρυφή');
    if (κεφαλίδα) κεφαλίδα.classList.remove('is-hidden');
  }
  window.addEventListener('wheel', (ev) => { if (ev.deltaY < 0) εμφάνισηΚρυφήςΚεφαλίδας(); }, { passive: true });
  let αφήY = null;
  window.addEventListener('touchstart', (ev) => { αφήY = ev.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (ev) => {
    if (αφήY !== null && window.scrollY <= 0 && ev.touches[0].clientY - αφήY > 24) εμφάνισηΚρυφήςΚεφαλίδας();
  }, { passive: true });
  const μενούΑνοιχτό = () => document.documentElement.classList.contains('μενού-ανοιχτό');
  function κεφαλίδαΚατάσταση() {
    if (!κεφαλίδα) return;
    const y = window.scrollY;
    const ύψος = κεφαλίδα.offsetHeight || 76;
    const τόνος = τόνοςΣτο(ύψος / 2);
    if (κεφαλίδα.dataset.τόνος !== τόνος) κεφαλίδα.dataset.τόνος = τόνος;
    // Θολό φόντο: διακριτικό στην κορυφή, πλήρες μόλις αρχίσει το scroll
    κεφαλίδα.classList.toggle('με-φόντο', y > 40);
    // Μετά από μετάβαση από κάρτα έργου η κεφαλίδα μένει κρυφή ώσπου να ανέβουμε (κλάση από το <head>)
    if (y < τελευταίοY - 4) εμφάνισηΚρυφήςΚεφαλίδας();
    // Κρύβεται όταν κατεβαίνουμε, εμφανίζεται όταν ανεβαίνουμε
    if (!μενούΑνοιχτό()) {
      if (y > 200 && y > τελευταίοY + 4) κεφαλίδα.classList.add('is-hidden');
      else if (y < τελευταίοY - 4 || y <= 200) κεφαλίδα.classList.remove('is-hidden');
    }
    τελευταίοY = y;
  }
  let κεφΑναμονή = false;
  const κεφαλίδαΣύντομα = () => { if (κεφΑναμονή) return; κεφΑναμονή = true; requestAnimationFrame(() => { κεφΑναμονή = false; κεφαλίδαΚατάσταση(); }); };
  window.addEventListener('scroll', κεφαλίδαΣύντομα, { passive: true });
  if (lenis) lenis.on('scroll', κεφαλίδαΣύντομα);
  window.addEventListener('resize', κεφαλίδαΣύντομα);
  κεφαλίδαΚατάσταση();
  // Οι δυναμικές σκηνές αλλάζουν τόνο και χωρίς scroll (π.χ. μόλις φορτώσει το meta)
  if ('MutationObserver' in window) new MutationObserver(κεφαλίδαΣύντομα).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-τόνος'] });

  /* ---------- Μενού κινητού ---------- */
  const κουμπίΜενού = document.querySelector('.μενού-κουμπί');
  const μενού = document.getElementById('menou');
  if (κουμπίΜενού && μενού) {
    let χρονόμετροΜενού = 0;
    const άνοιγμα = (ανοιχτό) => {
      clearTimeout(χρονόμετροΜενού);
      κουμπίΜενού.setAttribute('aria-expanded', String(ανοιχτό));
      document.documentElement.classList.toggle('μενού-ανοιχτό', ανοιχτό);
      if (ανοιχτό) {
        κεφαλίδα.classList.remove('is-hidden');
        μενού.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => μενού.classList.add('is-open')));
        if (lenis) lenis.stop(); document.body.style.overflow = 'hidden';
        const πρώτο = μενού.querySelector('a'); if (πρώτο) setTimeout(() => πρώτο.focus({ preventScroll: true }), 350);
      } else {
        μενού.classList.remove('is-open');
        if (lenis) lenis.start(); document.body.style.overflow = '';
        χρονόμετροΜενού = setTimeout(() => { μενού.hidden = true; }, μειωμένηΚίνηση ? 0 : 700);
      }
    };
    κουμπίΜενού.addEventListener('click', () => άνοιγμα(κουμπίΜενού.getAttribute('aria-expanded') !== 'true'));
    μενού.addEventListener('click', (ev) => { if (ev.target.closest('a')) άνοιγμα(false); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && μενούΑνοιχτό()) { άνοιγμα(false); κουμπίΜενού.focus(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 1100 && μενούΑνοιχτό()) άνοιγμα(false); });
  }

  /* ==========================================================================
     8. ΦΟΡΜΑ
     ========================================================================== */
  const φόρμα = document.querySelector('[data-φόρμα]');
  if (φόρμα) {
    const Μ = JSON.parse(φόρμα.querySelector('.φόρμα__μηνύματα').textContent);
    const ευχαριστώ = document.querySelector('.φόρμα__ευχαριστώ');
    const υπό = [...φόρμα.querySelectorAll('[data-για]')];

    // Εμφάνιση πεδίων ανάλογα με την πρόθεση
    const πρόθεση = () => (φόρμα.querySelector('input[name="intent"]:checked') || {}).value || 'buy';
    const ενημέρωσηΠεδίων = () => { const π = πρόθεση(); υπό.forEach((el) => { el.hidden = !el.dataset.για.split(' ').includes(π); }); };
    φόρμα.addEventListener('change', (ev) => { if (ev.target.name === 'intent') ενημέρωσηΠεδίων(); });
    ενημέρωσηΠεδίων();

    // Σύνδεσμοι από άλλες ενότητες: προεπιλογή πρόθεσης και μετάβαση στη φόρμα
    document.addEventListener('click', (ev) => {
      const σ = ev.target.closest('a[data-πρόθεση]');
      if (!σ) return;
      ev.preventDefault();
      const κουτί = φόρμα.querySelector(`input[name="intent"][value="${σ.dataset.πρόθεση}"]`);
      if (κουτί) { κουτί.checked = true; ενημέρωσηΠεδίων(); }
      μετάβασηΣε(επαφή, 2.4);
      setTimeout(() => { const π = φόρμα.querySelector('#f-name'); if (π) π.focus({ preventScroll: true }); }, 2500);
    });

    // Το μήνυμα μεγαλώνει όσο γράφετε
    const μήνυμα = φόρμα.querySelector('textarea');
    if (μήνυμα) μήνυμα.addEventListener('input', () => { μήνυμα.style.height = 'auto'; μήνυμα.style.height = μήνυμα.scrollHeight + 'px'; });

    const λάθος = (πεδίο, κείμενο) => {
      const κουτί = πεδίο.closest('.πεδίο');
      const μ = κουτί ? κουτί.querySelector('.πεδίο__λάθος') : φόρμα.querySelector('.φόρμα__λάθος-συναίνεσης');
      if (κουτί) κουτί.classList.toggle('is-error', !!κείμενο);
      if (μ) μ.textContent = κείμενο || '';
      πεδίο.setAttribute('aria-invalid', κείμενο ? 'true' : 'false');
      return !κείμενο;
    };
    const έλεγχος = (πεδίο) => {
      const v = (πεδίο.value || '').trim();
      if (πεδίο.name === 'consent') return λάθος(πεδίο, πεδίο.checked ? '' : Μ.f_err_consent);
      if (πεδίο.required && !v) return λάθος(πεδίο, Μ.f_err_req);
      if (πεδίο.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return λάθος(πεδίο, Μ.f_err_email);
      if (πεδίο.type === 'tel' && v && v.replace(/\D/g, '').length < 8) return λάθος(πεδίο, Μ.f_err_phone);
      return λάθος(πεδίο, '');
    };
    φόρμα.querySelectorAll('input[required]').forEach((π) => {
      π.addEventListener('blur', () => { if (π.value || π.getAttribute('aria-invalid') === 'true') έλεγχος(π); });
      π.addEventListener('input', () => { if (π.getAttribute('aria-invalid') === 'true') έλεγχος(π); });
      if (π.type === 'checkbox') π.addEventListener('change', () => έλεγχος(π));
    });

    φόρμα.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const πεδία = [...φόρμα.querySelectorAll('input[required]')];
      const άκυρα = πεδία.filter((π) => !έλεγχος(π));
      if (άκυρα.length) { άκυρα[0].focus(); return; }
      const fd = new FormData(φόρμα);
      if (fd.get('website')) { ολοκλήρωση(); return; }                 // παγίδα για bots
      const ετικέτα = (όνομα) => { const π = φόρμα.querySelector(`input[name="${όνομα}"]:checked`); return π ? π.nextElementSibling.textContent : ''; };
      const δεδομένα = {
        intent: fd.get('intent'), intent_label: ετικέτα('intent'),
        plot: fd.get('plot') || '',
        // Σελίδες έργων: έργο (κρυφό πεδίο) και κατοικία (λίστα)
        project: fd.get('project') || '', residence: fd.get('residence') || '',
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), message: fd.get('message') || '',
        lang: document.documentElement.lang, page: location.href,
      };
      const κουμπί = φόρμα.querySelector('.φόρμα__αποστολή');
      κουμπί.disabled = true;
      try {
        if (window.GP_FORM_ENDPOINT) {
          const απ = await fetch(window.GP_FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(δεδομένα) });
          if (!απ.ok) throw new Error('send');
        } else {
          // Χωρίς endpoint: ανοίγει το email του επισκέπτη με έτοιμο μήνυμα
          const γραμμές = [
            δεδομένα.intent_label && `${Μ.f_intent}: ${δεδομένα.intent_label}`,
            δεδομένα.project && `${Μ.f_project} ${δεδομένα.project}`,
            δεδομένα.residence && `${Μ.f_residence || ''} ${δεδομένα.residence}`.trim(),
            δεδομένα.plot && `${Μ.f_plot} ${δεδομένα.plot}`,
            `${Μ.f_name}: ${δεδομένα.name}`, `${Μ.f_phone}: ${δεδομένα.phone}`, `${Μ.f_email}: ${δεδομένα.email}`,
            δεδομένα.message && `\n${δεδομένα.message}`,
          ].filter(Boolean).join('\n');
          window.location.href = `mailto:sales@gpdevelopment.gr?subject=${encodeURIComponent(Μ.f_mail_subject)}&body=${encodeURIComponent(γραμμές)}`;
        }
        ολοκλήρωση();
      } catch (e) {
        κουμπί.disabled = false;
        window.location.href = 'mailto:sales@gpdevelopment.gr';
      }
    });
    function ολοκλήρωση() {
      φόρμα.hidden = true; ευχαριστώ.hidden = false; ευχαριστώ.focus({ preventScroll: true });
      if (έχειGSAP) gsap.from(ευχαριστώ.children, { opacity: 0, y: 16, duration: .9, ease: 'power3.out', stagger: .1 });
    }
  }

  /* ---------- Υποσέλιδο ---------- */
  if (έχειGSAP) gsap.from('.υποσέλιδο__δήλωση, .υποσέλιδο__πλέγμα > *', { opacity: 0, y: 24, duration: 1.1, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: '.υποσέλιδο', start: 'top 80%', toggleActions: 'play none none none' } });

  // Οι θέσεις των ScrollTrigger αλλάζουν όταν φορτώνουν εικόνες/γραμματοσειρές
  if (έχειGSAP) window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------- Μετάβαση σελίδων: εναλλακτικός τρόπος ----------
     Όπου ο browser δεν έχει View Transitions ανάμεσα σε έγγραφα (το inline script βάζει «μετάβαση-js»):
     σβήνει τη σελίδα και μετά ακολουθεί τον σύνδεσμο. Τελευταίο, ώστε να σέβεται όσους χειριστές
     έχουν ήδη κάνει preventDefault (π.χ. σύνδεσμοι προς τη φόρμα). */
  const ρίζα = document.documentElement;
  if (ρίζα.classList.contains('μετάβαση-js')) {
    document.addEventListener('click', (ev) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const σ = ev.target.closest('a[href]');
      if (!σ || (σ.target && σ.target !== '_self') || σ.hasAttribute('download')) return;
      const u = new URL(σ.href, location.href);
      if (u.origin !== location.origin || /\.pdf$/i.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.search === location.search) return;   // άγκυρα στην ίδια σελίδα
      ev.preventDefault();
      ρίζα.classList.add('σελίδα-φεύγει');
      setTimeout(() => { location.href = σ.href; }, 340);
    });
    // Επιστροφή με «Πίσω» από την cache του browser: η σελίδα να μη μείνει σβησμένη
    window.addEventListener('pageshow', (ev) => { if (ev.persisted) ρίζα.classList.remove('σελίδα-φεύγει'); });
  }
})();

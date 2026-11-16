/* Αντιπαροχή — σκηνές της σελίδας (μόνο εδώ φορτώνεται).
   1. Ήρωας: τα σύννεφα ανοίγουν προς τα έξω με το scroll, η ομίχλη καθαρίζει, ο λευκός τίτλος
      ανεβαίνει και σβήνει, η κάμερα «κατεβαίνει» (το βίντεο ξεζουμάρει) και εμφανίζεται το κείμενο. */
(() => {
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const ήρωας = document.querySelector('[data-γη-ήρωας]');
  if (ήρωας && !μειωμένηΚίνηση) {
    const σκηνή = ήρωας.querySelector('.γη-ήρωας__σκηνή');
    const σύννεφα = [...ήρωας.querySelectorAll('.γη-σύννεφο')].map((σ) => {
      const [dx, dy, s] = σ.dataset.φορά.split(' ').map(Number);
      return { σ, dx, dy, s };
    });
    let αναμονή = false;
    const ενημέρωση = () => {
      αναμονή = false;
      const r = ήρωας.getBoundingClientRect();
      const διαδρομή = Math.max(1, r.height - innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / διαδρομή));
      const άνοιγμα = ομαλό(0.0, 0.75, p);                       // σύννεφα προς τα έξω
      const καθαρό = ομαλό(0.05, 0.6, p);                        // ομίχλη που φεύγει
      σκηνή.style.setProperty('--ομίχλη', (1 - καθαρό).toFixed(3));
      σκηνή.style.setProperty('--θάμπωμα', ((1 - καθαρό) * 10).toFixed(2) + 'px');
      σκηνή.style.setProperty('--ζουμ', (1.18 - 0.18 * ομαλό(0, 0.9, p)).toFixed(4));
      σκηνή.style.setProperty('--τίτλος', (1 - ομαλό(0.18, 0.48, p)).toFixed(3));
      σκηνή.style.setProperty('--τίτλος-y', (-p * 120).toFixed(1) + 'px');
      σκηνή.style.setProperty('--τίτλος-κλίμακα', (1 + p * 0.06).toFixed(4));
      const κάτω = ομαλό(0.62, 0.9, p);
      σκηνή.style.setProperty('--κάτω', κάτω.toFixed(3));
      σκηνή.style.setProperty('--κάτω-δείκτης', κάτω > 0.5 ? 'auto' : 'none');
      σκηνή.style.setProperty('--σκιά', ομαλό(0.35, 0.8, p).toFixed(3));
      const w = innerWidth, h = innerHeight;
      σύννεφα.forEach(({ σ, dx, dy, s }) => {
        σ.style.transform = `translate3d(${(dx * άνοιγμα * w).toFixed(1)}px, ${(dy * άνοιγμα * h).toFixed(1)}px, 0) scale(${(1 + s * άνοιγμα).toFixed(3)})`;
        σ.style.opacity = (0.92 * (1 - ομαλό(0.35, 0.82, p))).toFixed(3);
      });
    };
    const σύντομα = () => { if (!αναμονή) { αναμονή = true; requestAnimationFrame(ενημέρωση); } };
    window.addEventListener('scroll', σύντομα, { passive: true });
    window.addEventListener('resize', σύντομα);
    ενημέρωση();
  }
})();

/* 2. Ουρανός: καρέ από το βίντεο μέρα→νύχτα πάνω σε canvas, με βάση τη θέση του scroll.
      data-γη-ουρανός="νύχτα": μέρα → νύχτα · "μέρα": το ίδιο ανάποδα.
   3. Βήματα της νύχτας: ένα ζεστό φως γεμίζει τη γραμμή και «ανάβει» κάθε βήμα. */
(() => {
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const πρόοδος = (el) => { const r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };
  const πλάτος = () => (innerWidth * Math.min(devicePixelRatio || 1, 2) > 1300 ? 1600 : 960);

  const σκηνές = [...document.querySelectorAll('[data-γη-ουρανός]')].map((σκηνή) => {
    const πλήθος = +σκηνή.dataset.καρέ || 0;
    const ανάποδα = σκηνή.getAttribute('data-γη-ουρανός') === 'μέρα';
    const καμβάς = σκηνή.querySelector('canvas');
    const ctx = καμβάς.getContext('2d');
    const τίτλος = σκηνή.querySelector('.γη-ουρανός__τίτλος');
    const πάνελ = [...σκηνή.querySelectorAll('.γη-ουρανός__πάνελ')];
    return { σκηνή, πλήθος, ανάποδα, καμβάς, ctx, τίτλος, πάνελ, εικόνες: [], φορτώθηκε: false, τελευταίο: -1 };
  });
  if (!σκηνές.length) return;

  // Φόρτωση καρέ μόνο όταν η σκηνή πλησιάζει (δεν βαραίνει το πρώτο φόρτωμα)
  const φόρτωσε = (Σ) => {
    if (Σ.φορτώθηκε || !Σ.πλήθος || μειωμένηΚίνηση) return;
    Σ.φορτώθηκε = true;
    const w = πλάτος();
    let έτοιμα = 0;
    for (let i = 0; i < Σ.πλήθος; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { έτοιμα++; if (έτοιμα === Σ.πλήθος) { Σ.σκηνή.classList.add('είναι-έτοιμο'); Σ.τελευταίο = -1; ζωγράφισε(Σ); } };
      im.src = `/assets/land/dn-${w}/${String(i).padStart(3, '0')}.webp`;
      Σ.εικόνες.push(im);
    }
  };
  if ('IntersectionObserver' in window) {
    const παρατηρητής = new IntersectionObserver((εγγραφές) => εγγραφές.forEach((ε) => {
      if (ε.isIntersecting) φόρτωσε(σκηνές.find((Σ) => Σ.σκηνή === ε.target));
    }), { rootMargin: '150% 0px' });
    σκηνές.forEach((Σ) => παρατηρητής.observe(Σ.σκηνή));
  } else σκηνές.forEach(φόρτωσε);

  // Καμβάς σε μέγεθος οθόνης, εικόνα «cover»
  const μέγεθος = (Σ) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    Σ.καμβάς.width = Math.round(Σ.καμβάς.clientWidth * dpr);
    Σ.καμβάς.height = Math.round(Σ.καμβάς.clientHeight * dpr);
    Σ.τελευταίο = -1;
  };
  const ζωγράφισε = (Σ, καρέ) => {
    if (καρέ === undefined) καρέ = Σ.τρέχον || 0;
    const im = Σ.εικόνες[καρέ];
    if (!im || !im.complete || !im.naturalWidth || καρέ === Σ.τελευταίο) return;
    const { width: W, height: H } = Σ.καμβάς;
    const κλίμακα = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * κλίμακα, h = im.naturalHeight * κλίμακα;
    const x = (W - w) * (innerWidth < 760 ? 0.38 : 0.5), y = (H - h) / 2;
    Σ.ctx.drawImage(im, x, y, w, h);
    Σ.τελευταίο = καρέ;
  };

  const βήματα = document.querySelector('[data-γη-βήματα]');
  const στοιχεία = βήματα ? [...βήματα.children] : [];

  let αναμονή = false;
  const ενημέρωση = () => {
    αναμονή = false;
    σκηνές.forEach((Σ) => {
      const r = Σ.σκηνή.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      const p = πρόοδος(Σ.σκηνή);
      // Το βίντεο κυλά στο μεσαίο κομμάτι της διαδρομής, ώστε αρχή και τέλος να «κάθονται» λίγο
      const t = ομαλό(0.08, 0.92, p);
      if (Σ.πλήθος) {
        Σ.τρέχον = Math.round((Σ.ανάποδα ? 1 - t : t) * (Σ.πλήθος - 1));
        ζωγράφισε(Σ, Σ.τρέχον);
      }
      // Κείμενα: τίτλος, μετά κάθε πάνελ στο δικό του παράθυρο
      const n = Σ.πάνελ.length + 1, βήμα = 1 / n;
      Σ.τίτλος.style.setProperty('--α-τίτλου', (1 - ομαλό(βήμα * 0.7, βήμα * 0.95, p)).toFixed(3));
      Σ.πάνελ.forEach((π, i) => {
        const αρχή = βήμα * (i + 1), τέλος = αρχή + βήμα;
        const μέσα = ομαλό(αρχή - βήμα * 0.05, αρχή + βήμα * 0.25, p);
        const έξω = i === Σ.πάνελ.length - 1 ? 0 : ομαλό(τέλος - βήμα * 0.3, τέλος - βήμα * 0.05, p);
        π.style.setProperty('--α', (μέσα * (1 - έξω)).toFixed(3));
      });
    });
    if (βήματα) {
      const r = βήματα.getBoundingClientRect();
      const κέντρο = innerHeight * 0.6;
      βήματα.style.setProperty('--π', Math.min(1, Math.max(0, (κέντρο - r.top) / r.height)).toFixed(3));
      στοιχεία.forEach((λ) => λ.classList.toggle('είναι-αναμμένο', λ.getBoundingClientRect().top < κέντρο));
    }
  };
  const σύντομα = () => { if (!αναμονή) { αναμονή = true; requestAnimationFrame(ενημέρωση); } };
  addEventListener('scroll', σύντομα, { passive: true });
  addEventListener('resize', () => { σκηνές.forEach(μέγεθος); σύντομα(); });
  σκηνές.forEach(μέγεθος);
  ενημέρωση();
})();

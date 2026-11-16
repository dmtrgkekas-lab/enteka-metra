/* Αντιπαροχή — σκηνές ουρανού (μόνο εδώ φορτώνεται).
   Άνοιγμα:   σύννεφα που ανοίγουν → το κτίριο από ψηλά τη μέρα (κείμενο + ενέργειες) → μέρα γίνεται νύχτα.
   Κλείσιμο:  ελαφριά θόλωση σαν σύννεφα πάνω στη νύχτα → ανοίγει → νύχτα γίνεται μέρα.
   Ομαλότητα: Lenis σε ποντίκι/touchpad, εξομάλυνση της προόδου στην αφή, και ανάμειξη δύο διαδοχικών καρέ
   ώστε η εικόνα να «ρέει» αντί να πηδά από καρέ σε καρέ. */
(() => {
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (μειωμένηΚίνηση) return;
  const αφή = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const κινητό = () => innerWidth < 760;

  // ---------- Ομαλό scroll (όπως στην αρχική): μόνο για τροχό/touchpad
  let lenis = null;
  if (window.Lenis && !αφή) {
    lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
    window.gpLenis = lenis;
  }

  // Χρονολόγιο κάθε σκηνής (τιμές = πρόοδος 0–1 μέσα στη σκηνή)
  const ΧΡΟΝΟΙ = {
    άνοιγμα:  { σύννεφα: [0, 0.34], ομίχλη: [0, 0.26], τίτλος: [0.06, 0.24], κάτω: [0.36, 0.46, 0.8, 0.9], καρέ: [0.02, 0.92], πάνω: null, κάτωΣκιά: [0.86, 1] },
    κλείσιμο: { σύννεφα: [0.12, 0.5], ομίχλη: [0.14, 0.46], τίτλος: null, κάτω: null, καρέ: [0.34, 0.92], πάνω: [0, 0.14], κάτωΣκιά: null },
  };

  const σκηνές = [...document.querySelectorAll('[data-γη-σκηνή]')].map((σκηνή) => {
    const είδος = σκηνή.getAttribute('data-γη-σκηνή');
    const καμβάς = σκηνή.querySelector('canvas');
    return {
      σκηνή, είδος, καμβάς, ctx: καμβάς.getContext('2d', { alpha: false }), Χ: ΧΡΟΝΟΙ[είδος],
      κάδρο: σκηνή.querySelector('.γη-σκηνή__κάδρο'),
      ανάποδα: σκηνή.getAttribute('data-κατεύθυνση') === 'μέρα',
      πλήθος: +σκηνή.getAttribute('data-καρέ') || 0,
      σύννεφα: [...σκηνή.querySelectorAll('.γη-σύννεφο')].map((σ) => {
        const [dx, dy, s] = σ.getAttribute('data-φορά').split(' ').map(Number);
        return { σ, dx, dy, s };
      }),
      ομαλή: null, ζωγραφισμένο: -1, ορατή: false,
    };
  });
  if (!σκηνές.length) return;
  const ΠΛΗΘΟΣ = σκηνές[0].πλήθος;

  // ---------- Καρέ: ανάλυση ανάλογα με την οθόνη, φόρτωση μετά την πρώτη εμφάνιση της σελίδας
  const ανάλυση = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const χρειάζεται = Math.max(innerWidth, innerHeight * 16 / 9) * dpr;
    return χρειάζεται >= 1700 ? 1920 : χρειάζεται >= 1100 ? 1600 : 960;
  };
  const εικόνες = new Array(ΠΛΗΘΟΣ).fill(null);
  let ξεκίνησε = false;
  const φόρτωσε = () => {
    if (ξεκίνησε || !ΠΛΗΘΟΣ) return;
    ξεκίνησε = true;
    const w = ανάλυση();
    // Σειρά: πρώτο, τελευταίο, μετά όλο και πυκνότερα — το scrub δουλεύει αμέσως, και βελτιώνεται όσο φορτώνει
    const σειρά = [], είδα = new Set();
    for (let βήμα = ΠΛΗΘΟΣ - 1; βήμα >= 1; βήμα = Math.floor(βήμα / 2)) {
      for (let i = 0; i < ΠΛΗΘΟΣ; i += βήμα) if (!είδα.has(i)) { είδα.add(i); σειρά.push(i); }
      if (βήμα === 1) break;
    }
    for (let i = 0; i < ΠΛΗΘΟΣ; i++) if (!είδα.has(i)) σειρά.push(i);
    let δείκτης = 0, ενεργά = 0;
    const επόμενο = () => {
      while (ενεργά < 6 && δείκτης < σειρά.length) {
        const i = σειρά[δείκτης++], im = new Image();
        ενεργά++;
        im.src = `/assets/land/dn-${w}/${String(i).padStart(3, '0')}.webp`;
        (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => {
          εικόνες[i] = im; ενεργά--;
          σκηνές.forEach((Σ) => { Σ.ζωγραφισμένο = -1; if (i === 0 || i === ΠΛΗΘΟΣ - 1) Σ.σκηνή.classList.add('είναι-έτοιμο'); });
          επόμενο();
        });
      }
    };
    επόμενο();
  };
  φόρτωσε();

  const κοντινότερο = (i, κατεύθυνση) => {
    for (let k = i; k >= 0 && k < ΠΛΗΘΟΣ; k += κατεύθυνση) if (εικόνες[k]) return k;
    return -1;
  };
  const μέγεθος = (Σ) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    Σ.καμβάς.width = Math.round(Σ.καμβάς.clientWidth * dpr);
    Σ.καμβάς.height = Math.round(Σ.καμβάς.clientHeight * dpr);
    Σ.ζωγραφισμένο = -1;
  };
  const σχέδιο = (Σ, im, άλφα) => {
    const W = Σ.καμβάς.width, H = Σ.καμβάς.height;
    const κλίμακα = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * κλίμακα, h = im.naturalHeight * κλίμακα;
    Σ.ctx.globalAlpha = άλφα;
    Σ.ctx.drawImage(im, (W - w) * (κινητό() ? 0.38 : 0.5), (H - h) / 2, w, h);
  };
  // Θέση ως δεκαδικός αριθμός καρέ: ζωγραφίζει το κάτω καρέ και από πάνω το επόμενο με διαφάνεια
  const ζωγράφισε = (Σ, θέση) => {
    if (Math.abs(θέση - Σ.ζωγραφισμένο) < 0.004) return;
    const α = κοντινότερο(Math.floor(θέση), -1), β = κοντινότερο(Math.ceil(θέση), 1);
    if (α < 0 && β < 0) return;
    Σ.ctx.imageSmoothingQuality = 'high';
    if (α < 0 || β < 0 || α === β) σχέδιο(Σ, εικόνες[α < 0 ? β : α], 1);
    else { σχέδιο(Σ, εικόνες[α], 1); σχέδιο(Σ, εικόνες[β], (θέση - α) / (β - α)); }
    Σ.ctx.globalAlpha = 1;
    Σ.ζωγραφισμένο = θέση;
  };

  const εφάρμοσε = (Σ, p) => {
    const Χ = Σ.Χ, σ = Σ.κάδρο.style;
    const άνοιγμα = ομαλό(Χ.σύννεφα[0], Χ.σύννεφα[1], p);
    σ.setProperty('--ομίχλη', (1 - ομαλό(Χ.ομίχλη[0], Χ.ομίχλη[1], p)).toFixed(3));
    if (Χ.τίτλος) {
      const τ = ομαλό(0, Χ.τίτλος[1], p);
      σ.setProperty('--τίτλος', (1 - ομαλό(Χ.τίτλος[0], Χ.τίτλος[1], p)).toFixed(3));
      σ.setProperty('--τίτλος-y', (-τ * 120).toFixed(1) + 'px');
      σ.setProperty('--τίτλος-κλίμακα', (1 + τ * 0.06).toFixed(4));
    }
    if (Χ.κάτω) {
      const [α, β, γ, δ] = Χ.κάτω;
      const κάτω = ομαλό(α, β, p) * (1 - ομαλό(γ, δ, p));
      σ.setProperty('--κάτω', κάτω.toFixed(3));
      σ.setProperty('--κάτω-δείκτης', κάτω > 0.5 ? 'auto' : 'none');
    }
    if (Χ.πάνω) σ.setProperty('--πάνω-σκιά', (1 - ομαλό(Χ.πάνω[0], Χ.πάνω[1], p)).toFixed(3));
    σ.setProperty('--κάτω-σκιά', (Χ.κάτωΣκιά ? 0.55 + 0.45 * ομαλό(Χ.κάτωΣκιά[0], Χ.κάτωΣκιά[1], p) : 0.35).toFixed(3));
    const w = innerWidth, h = innerHeight;
    const σβήσιμο = 1 - ομαλό(Χ.σύννεφα[0] + (Χ.σύννεφα[1] - Χ.σύννεφα[0]) * 0.4, Χ.σύννεφα[1], p);
    Σ.σύννεφα.forEach(({ σ: im, dx, dy, s }) => {
      im.style.transform = `translate3d(${(dx * άνοιγμα * w).toFixed(1)}px, ${(dy * άνοιγμα * h).toFixed(1)}px, 0) scale(${(1 + s * άνοιγμα).toFixed(3)})`;
      im.style.opacity = (0.9 * σβήσιμο).toFixed(3);
    });
    if (ΠΛΗΘΟΣ) {
      const t = ομαλό(Χ.καρέ[0], Χ.καρέ[1], p);
      ζωγράφισε(Σ, (Σ.ανάποδα ? 1 - t : t) * (ΠΛΗΘΟΣ - 1));
    }
  };

  // ---------- Ένας βρόχος: με Lenis η πρόοδος είναι ήδη ομαλή· στην αφή εξομαλύνεται εδώ
  const ΕΞΟΜΑΛΥΝΣΗ = lenis ? 1 : 0.2;
  const βρόχος = (χρόνος) => {
    if (lenis) lenis.raf(χρόνος);
    σκηνές.forEach((Σ) => {
      const r = Σ.σκηνή.getBoundingClientRect();
      Σ.ορατή = r.bottom > -innerHeight * 0.2 && r.top < innerHeight * 1.2;
      if (!Σ.ορατή) { Σ.ομαλή = null; return; }
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      Σ.ομαλή = Σ.ομαλή === null ? p : Σ.ομαλή + (p - Σ.ομαλή) * ΕΞΟΜΑΛΥΝΣΗ;
      if (Math.abs(p - Σ.ομαλή) < 0.0002) Σ.ομαλή = p;
      εφάρμοσε(Σ, Σ.ομαλή);
    });
    requestAnimationFrame(βρόχος);
  };
  addEventListener('resize', () => σκηνές.forEach(μέγεθος));
  σκηνές.forEach(μέγεθος);
  requestAnimationFrame(βρόχος);
})();

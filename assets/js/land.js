/* Αντιπαροχή — σκηνές ουρανού (μόνο εδώ φορτώνεται).
   Άνοιγμα:   σύννεφα που ανοίγουν → το κτίριο από ψηλά τη μέρα (κείμενο + ενέργειες) → μέρα γίνεται νύχτα.
   Κλείσιμο:  ελαφριά θόλωση σαν σύννεφα πάνω στη νύχτα → ανοίγει → νύχτα γίνεται μέρα.
   Τα καρέ (/assets/land/dn-{πλάτος}/NNN.webp) ζωγραφίζονται σε canvas ανάλογα με τη θέση του scroll. */
(() => {
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (μειωμένηΚίνηση) return;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const πλάτοςΚαρέ = () => (innerWidth * Math.min(devicePixelRatio || 1, 2) > 1300 ? 1600 : 960);
  const κινητό = () => innerWidth < 760;

  // Χρονολόγιο κάθε σκηνής (τιμές = πρόοδος 0–1 μέσα στη σκηνή)
  const ΧΡΟΝΟΙ = {
    άνοιγμα:  { σύννεφα: [0, 0.3], ομίχλη: [0.02, 0.24], τίτλος: [0.08, 0.24], κάτω: [0.22, 0.32, 0.5, 0.6], καρέ: [0.5, 0.94], πάνω: null, κάτωΣκιά: [0.86, 1] },
    κλείσιμο: { σύννεφα: [0.12, 0.5], ομίχλη: [0.14, 0.46], τίτλος: null, κάτω: null, καρέ: [0.34, 0.92], πάνω: [0, 0.14], κάτωΣκιά: null },
  };

  const σκηνές = [...document.querySelectorAll('[data-γη-σκηνή]')].map((σκηνή) => {
    const είδος = σκηνή.getAttribute('data-γη-σκηνή');
    const κάδρο = σκηνή.querySelector('.γη-σκηνή__κάδρο');
    const καμβάς = σκηνή.querySelector('canvas');
    return {
      σκηνή, είδος, κάδρο, καμβάς, ctx: καμβάς.getContext('2d'), Χ: ΧΡΟΝΟΙ[είδος],
      ανάποδα: σκηνή.getAttribute('data-κατεύθυνση') === 'μέρα',
      πλήθος: +σκηνή.getAttribute('data-καρέ') || 0,
      σύννεφα: [...σκηνή.querySelectorAll('.γη-σύννεφο')].map((σ) => {
        const [dx, dy, s] = σ.getAttribute('data-φορά').split(' ').map(Number);
        return { σ, dx, dy, s };
      }),
      εικόνες: [], φορτώθηκε: false, τελευταίο: -1, τρέχον: 0,
    };
  });
  if (!σκηνές.length) return;

  // Τα καρέ είναι κοινά στις δύο σκηνές: φορτώνονται μία φορά, μετά την πρώτη εμφάνιση της σελίδας
  let εικόνες = null;
  const φόρτωσε = () => {
    if (εικόνες) return;
    const πλήθος = σκηνές[0].πλήθος, w = πλάτοςΚαρέ();
    εικόνες = [];
    let έτοιμα = 0;
    for (let i = 0; i < πλήθος; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        if (++έτοιμα === πλήθος) σκηνές.forEach((Σ) => { Σ.σκηνή.classList.add('είναι-έτοιμο'); Σ.τελευταίο = -1; ζωγράφισε(Σ, Σ.τρέχον); });
      };
      im.src = `/assets/land/dn-${w}/${String(i).padStart(3, '0')}.webp`;
      εικόνες.push(im);
    }
  };
  if (document.readyState === 'complete') setTimeout(φόρτωσε, 300);
  else addEventListener('load', () => setTimeout(φόρτωσε, 300), { once: true });
  addEventListener('scroll', φόρτωσε, { once: true, passive: true });

  const μέγεθος = (Σ) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    Σ.καμβάς.width = Math.round(Σ.καμβάς.clientWidth * dpr);
    Σ.καμβάς.height = Math.round(Σ.καμβάς.clientHeight * dpr);
    Σ.τελευταίο = -1;
  };
  const ζωγράφισε = (Σ, καρέ) => {
    const im = εικόνες && εικόνες[καρέ];
    if (!im || !im.complete || !im.naturalWidth || καρέ === Σ.τελευταίο) return;
    const W = Σ.καμβάς.width, H = Σ.καμβάς.height;
    const κλίμακα = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * κλίμακα, h = im.naturalHeight * κλίμακα;
    Σ.ctx.drawImage(im, (W - w) * (κινητό() ? 0.38 : 0.5), (H - h) / 2, w, h);
    Σ.τελευταίο = καρέ;
  };

  const ενημέρωσε = (Σ) => {
    const r = Σ.σκηνή.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    const Χ = Σ.Χ, σ = Σ.κάδρο.style;
    const άνοιγμα = ομαλό(Χ.σύννεφα[0], Χ.σύννεφα[1], p);
    const καθαρό = ομαλό(Χ.ομίχλη[0], Χ.ομίχλη[1], p);
    σ.setProperty('--ομίχλη', (1 - καθαρό).toFixed(3));
    σ.setProperty('--θάμπωμα', ((1 - καθαρό) * (Σ.είδος === 'άνοιγμα' ? 10 : 4)).toFixed(2) + 'px');
    if (Χ.τίτλος) {
      σ.setProperty('--τίτλος', (1 - ομαλό(Χ.τίτλος[0], Χ.τίτλος[1], p)).toFixed(3));
      σ.setProperty('--τίτλος-y', (-ομαλό(0, Χ.τίτλος[1], p) * 120).toFixed(1) + 'px');
      σ.setProperty('--τίτλος-κλίμακα', (1 + ομαλό(0, Χ.τίτλος[1], p) * 0.06).toFixed(4));
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
    Σ.σύννεφα.forEach(({ σ: im, dx, dy, s }) => {
      im.style.transform = `translate3d(${(dx * άνοιγμα * w).toFixed(1)}px, ${(dy * άνοιγμα * h).toFixed(1)}px, 0) scale(${(1 + s * άνοιγμα).toFixed(3)})`;
      im.style.opacity = (0.92 * (1 - ομαλό(Χ.σύννεφα[0] + (Χ.σύννεφα[1] - Χ.σύννεφα[0]) * 0.4, Χ.σύννεφα[1], p))).toFixed(3);
    });
    if (Σ.πλήθος) {
      const t = ομαλό(Χ.καρέ[0], Χ.καρέ[1], p);
      Σ.τρέχον = Math.round((Σ.ανάποδα ? 1 - t : t) * (Σ.πλήθος - 1));
      ζωγράφισε(Σ, Σ.τρέχον);
    }
  };

  let αναμονή = false;
  const ενημέρωση = () => { αναμονή = false; σκηνές.forEach(ενημέρωσε); };
  const σύντομα = () => { if (!αναμονή) { αναμονή = true; requestAnimationFrame(ενημέρωση); } };
  addEventListener('scroll', σύντομα, { passive: true });
  addEventListener('resize', () => { σκηνές.forEach(μέγεθος); σύντομα(); });
  σκηνές.forEach(μέγεθος);
  // Στο κλείσιμο η αφίσα (νύχτα) φαίνεται ως να φορτώσουν τα καρέ· στο άνοιγμα η αφίσα (μέρα)
  ενημέρωση();
})();

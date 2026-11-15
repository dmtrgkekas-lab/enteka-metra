/* ==========================================================================
   GP Development — κοινός «παίκτης» καρέ για τα δύο scroll-βίντεο
   Στόχος: να μην κολλάει σε κανέναν browser / συσκευή.
   - Λήψη: πρώτα τα «lo» (μικρά καρέ), μετά τα «hi», το πλησιέστερο στο τρέχον σημείο πρώτο.
     Σε αργό δίκτυο / Save-Data μένουμε στα lo.
   - Τα καρέ κρατιούνται συμπιεσμένα (Blob) και αποκωδικοποιούνται εκτός main thread.
   - Αποκωδικοποίηση με προτεραιότητες: λίγες ταυτόχρονες, πάντα εκείνο που θα χρειαστεί πρώτο
     (με πρόβλεψη από την ταχύτητα του scroll). Τα έτοιμα καρέ δεν πετιούνται μόλις βγουν από
     το παράθυρο: μένουν ως το όριο μνήμης, ώστε το scroll πάνω-κάτω να μη ξαναδουλεύει τα ίδια.
   ========================================================================== */
(() => {
  'use strict';
  const σύνδεση = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const αργόΔίκτυο = () => !!(σύνδεση && (σύνδεση.saveData || /(^|-)2g$/.test(σύνδεση.effectiveType || '')));
  const έχειBitmap = typeof window.createImageBitmap === 'function';
  // Κάτω από αυτή τη συνολική ταχύτητα τα μεγάλα καρέ δεν προλαβαίνουν: μένουμε στα μικρά
  const ΕΛΑΧΙΣΤΑ_KBPS = 2500;
  const ΤΑΥΤΟΧΡΟΝΕΣ_ΑΠΟΚΩΔ = Math.max(2, Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)));

  const κλείσε = (im) => { if (im && typeof im.close === 'function') im.close(); };

  // Αποκωδικοποίηση Blob → εικόνα έτοιμη για drawImage
  const αποκωδικοποίηση = async (blob) => {
    if (!blob) return null;
    if (έχειBitmap) {
      try { return await createImageBitmap(blob); } catch (e) { /* συνέχεια με <img> */ }
    }
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.src = url;
    try { await im.decode(); } catch (e) {
      await new Promise((r) => { if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
    }
    return im.naturalWidth ? im : null;
  };

  // Μία επανάληψη: ένα στιγμιαίο σφάλμα δικτύου δεν αφήνει τρύπα στη σκηνή
  const λήψη = async (url, προσπάθεια = 0) => {
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (r.ok) return await r.blob();
    } catch (e) { /* επανάληψη από κάτω */ }
    return προσπάθεια < 1 ? λήψη(url, προσπάθεια + 1) : null;
  };

  // Σειρά «από αραιά σε πυκνά»: 0, κάθε 8ο, 4ο, 2ο, όλα. Έτσι όλη η διαδρομή καλύπτεται νωρίς.
  const σειράΑραιή = (N) => {
    const σ = []; const είδε = new Set();
    const βάλε = (i) => { if (i >= 0 && i < N && !είδε.has(i)) { είδε.add(i); σ.push(i); } };
    βάλε(0); βάλε(N - 1);
    [8, 4, 2, 1].forEach((β) => { for (let i = 0; i < N; i += β) βάλε(i); });
    return σ;
  };

  /**
   * @param {object} ρ
   *   count     πλήθος καρέ
   *   url       (επίπεδο, i) => διεύθυνση · επίπεδα: 'lo', 'hi'
   *   tiers     ['lo','hi'] (προεπιλογή) ή ['hi'] για ένα επίπεδο
   *   radius    πόσα καρέ μπροστά από το τρέχον ετοιμάζουμε (πίσω: τα μισά)
   *   cache     πόσα αποκωδικοποιημένα καρέ κρατάμε το πολύ (όριο μνήμης)
   *   anchors   κάθε πόσα καρέ κρατάμε μόνιμα ένα αποκωδικοποιημένο lo (για γρήγορο scrub)
   *   onFrame   (i) => {} όταν ένα καρέ κοντά στο τρέχον γίνει διαθέσιμο ή βελτιωθεί
   *   onLoDone  () => {} όταν έχουν φορτώσει όλα τα μικρά καρέ
   * done: Promise, όταν τελειώσουν οι λήψεις και ετοιμαστούν τα καρέ γύρω από το τρέχον σημείο.
   */
  window.GPFrames = function (ρ) {
    const N = ρ.count;
    const επίπεδα = ρ.tiers || ['lo', 'hi'];
    const ακτίνα = ρ.radius || 8;
    const όριοΜνήμης = Math.max(ρ.cache || 24, ακτίνα * 2 + 3);
    const βήμαΆγκυρας = ρ.anchors || 8;
    const blobs = { lo: new Array(N), hi: new Array(N) };
    const ενεργά = new Map();      // i → { im, επίπεδο }
    const άγκυρες = new Map();     // i → im (μόνιμα, lo)
    const εκκρεμείςΆγκυρες = [];
    const σεΑποκωδ = new Map();    // i → επίπεδο σε εξέλιξη
    let τρέχουσες = 0;
    let στόχος = 0; let ταχύτητα = 0;
    let ξεκίνησε = false; let σταμάτησε = false; let λήψειςΤέλος = false;
    let επιτρέπεταιHi = επίπεδα.includes('hi') && !(επίπεδα.includes('lo') && αργόΔίκτυο());
    let τελείωσε; const done = new Promise((r) => { τελείωσε = r; });

    const καλύτερο = (i) => (blobs.hi[i] ? 'hi' : blobs.lo[i] ? 'lo' : null);
    const χρειάζεται = (i) => {
      if (i < 0 || i >= N) return false;
      const ε = καλύτερο(i); if (!ε) return false;
      const τώρα = ενεργά.get(i);
      if (τώρα && (τώρα.επίπεδο === ε || τώρα.επίπεδο === 'hi')) return false;
      return σεΑποκωδ.get(i) !== ε;
    };

    // Το επόμενο καρέ προς αποκωδικοποίηση: το τρέχον, μετά εκεί που πάει το scroll
    const επόμενοΚαρέ = () => {
      const πρόβλεψη = Math.round(στόχος + ταχύτητα * 3);
      if (χρειάζεται(στόχος)) return στόχος;
      const πρόσημο = ταχύτητα < 0 ? -1 : 1;
      for (let d = 0; d <= ακτίνα; d += 1) {
        if (χρειάζεται(πρόβλεψη + d * πρόσημο)) return πρόβλεψη + d * πρόσημο;
        if (χρειάζεται(στόχος + d * πρόσημο)) return στόχος + d * πρόσημο;
        if (d <= ακτίνα / 2 && χρειάζεται(στόχος - d * πρόσημο)) return στόχος - d * πρόσημο;
      }
      return null;
    };

    // Όταν γεμίσει η μνήμη φεύγουν τα πιο μακρινά καρέ
    const εκκαθάριση = () => {
      while (ενεργά.size > όριοΜνήμης) {
        let μακρινό = -1; let απόσταση = -1;
        for (const i of ενεργά.keys()) { const d = Math.abs(i - στόχος); if (d > απόσταση) { απόσταση = d; μακρινό = i; } }
        κλείσε(ενεργά.get(μακρινό).im); ενεργά.delete(μακρινό);
      }
    };

    const έλεγχοςΤέλους = () => {
      if (!σταμάτησε && λήψειςΤέλος && τρέχουσες === 0 && επόμενοΚαρέ() == null && !εκκρεμείςΆγκυρες.length) τελείωσε();
    };

    // Αντλία: το πολύ Χ ταυτόχρονες αποκωδικοποιήσεις, οι άγκυρες με τη χαμηλότερη προτεραιότητα
    const αντλία = () => {
      while (!σταμάτησε && τρέχουσες < ΤΑΥΤΟΧΡΟΝΕΣ_ΑΠΟΚΩΔ) {
        const i = επόμενοΚαρέ();
        if (i != null) {
          const ε = καλύτερο(i);
          τρέχουσες += 1; σεΑποκωδ.set(i, ε);
          αποκωδικοποίηση(blobs[ε][i]).then((im) => {
            τρέχουσες -= 1;
            if (σεΑποκωδ.get(i) === ε) σεΑποκωδ.delete(i);
            if (σταμάτησε || !im) { κλείσε(im); αντλία(); return; }
            const παλιό = ενεργά.get(i);
            if (παλιό && παλιό.επίπεδο === 'hi' && ε === 'lo') { κλείσε(im); αντλία(); return; }
            if (παλιό) κλείσε(παλιό.im);
            ενεργά.set(i, { im, επίπεδο: ε });
            εκκαθάριση();
            if (ρ.onFrame && ενεργά.has(i)) ρ.onFrame(i);
            αντλία();
          });
        } else if (εκκρεμείςΆγκυρες.length) {
          const j = εκκρεμείςΆγκυρες.shift();
          τρέχουσες += 1;
          αποκωδικοποίηση(blobs.lo[j] || blobs.hi[j]).then((im) => {
            τρέχουσες -= 1;
            if (σταμάτησε) { κλείσε(im); return; }
            if (im) { άγκυρες.set(j, im); if (ρ.onFrame && Math.abs(j - στόχος) <= βήμαΆγκυρας) ρ.onFrame(j); }
            αντλία();
          });
        } else break;
      }
      έλεγχοςΤέλους();
    };

    const άγκυρα = (i) => {
      if (i % βήμαΆγκυρας !== 0 && i !== N - 1) return;
      if (άγκυρες.has(i) || εκκρεμείςΆγκυρες.includes(i)) return;
      εκκρεμείςΆγκυρες.push(i);
    };

    const αποθήκευση = (ε, i, blob) => {
      if (!blob || blobs[ε][i]) return;
      blobs[ε][i] = blob;
      if (ε === 'lo' || !επίπεδα.includes('lo')) άγκυρα(i);
      αντλία();
    };

    // Ουρά λήψεων με περιορισμένη ταυτόχρονη κίνηση
    const λήψεις = async (ε, επόμενο, ταυτόχρονα) => {
      const εργάτης = async () => {
        for (;;) {
          if (σταμάτησε) return;
          const i = επόμενο();
          if (i == null) return;
          αποθήκευση(ε, i, await λήψη(ρ.url(ε, i)));
        }
      };
      await Promise.all(Array.from({ length: ταυτόχρονα }, εργάτης));
    };

    const έναρξη = async () => {
      const πρώτο = επίπεδα.includes('lo') ? 'lo' : 'hi';
      // 1. «Αφίσα»: πρώτα το τρέχον καρέ, για να υπάρχει κάτι να ζωγραφιστεί σχεδόν αμέσως
      αποθήκευση(πρώτο, στόχος, await λήψη(ρ.url(πρώτο, στόχος)));
      // 2. Όλα τα μικρά καρέ, από αραιά σε πυκνά. Μετράμε και τη συνολική ταχύτητα του δικτύου.
      const αραιή = σειράΑραιή(N); let δ = 0;
      const t0 = performance.now();
      await λήψεις(πρώτο, () => {
        while (δ < αραιή.length && blobs[πρώτο][αραιή[δ]]) δ += 1;
        return δ < αραιή.length ? αραιή[δ++] : null;
      }, 6);
      let bytes = 0;
      for (let i = 0; i < N; i += 1) if (blobs[πρώτο][i]) bytes += blobs[πρώτο][i].size;
      if (ρ.onLoDone) ρ.onLoDone();
      // 3. Τα μεγάλα καρέ, πάντα το πλησιέστερο στο τρέχον σημείο πρώτο
      // Η πρώτη μέτρηση ισχύει για όλους: η επόμενη ακολουθία μετρά ενώ κατεβαίνουν κι άλλα
      // αρχεία και θα νόμιζε λανθασμένα ότι το δίκτυο είναι αργό
      if (πρώτο === 'lo' && window.GPFrames.kbps == null) window.GPFrames.kbps = (bytes * 8) / Math.max(1, performance.now() - t0);
      if (πρώτο === 'lo' && επιτρέπεταιHi && window.GPFrames.kbps >= ΕΛΑΧΙΣΤΑ_KBPS) {
        const ζητήθηκε = new Uint8Array(N);
        await λήψεις('hi', () => {
          let κοντινό = -1; let απόσταση = Infinity;
          for (let i = 0; i < N; i += 1) {
            if (ζητήθηκε[i] || blobs.hi[i]) continue;
            const d = Math.abs(i - στόχος) - ((i - στόχος) * ταχύτητα > 0 ? 3 : 0);   // προβάδισμα προς την κίνηση
            if (d < απόσταση) { απόσταση = d; κοντινό = i; }
          }
          if (κοντινό < 0) return null;
          ζητήθηκε[κοντινό] = 1;
          return κοντινό;
        }, 8);
      }
      λήψειςΤέλος = true;
      αντλία();
    };

    return {
      done,
      start() { if (!ξεκίνησε) { ξεκίνησε = true; έναρξη(); } },
      setTarget(f) {
        const i = Math.max(0, Math.min(N - 1, Math.round(f)));
        const άλλαξε = i !== στόχος;
        if (άλλαξε) { ταχύτητα = ταχύτητα * 0.5 + (i - στόχος) * 0.5; στόχος = i; } else ταχύτητα *= 0.5;
        if (άλλαξε || !ενεργά.has(i)) αντλία();
      },
      // Ακριβώς αυτό το καρέ, αν είναι έτοιμο
      exact(i) { const v = ενεργά.get(i); return v ? v.im : null; },
      // Το καλύτερο έτοιμο καρέ: κοντινό σε καλή ποιότητα, αλλιώς το πιο κοντινό από τις άγκυρες
      nearest(i) {
        const v = ενεργά.get(i); if (v) return { im: v.im, i };
        let κ = null; let κd = ακτίνα + 3;
        for (const [j, w] of ενεργά) { const d = Math.abs(j - i); if (d < κd) { κd = d; κ = { im: w.im, i: j }; } }
        if (κ) return κ;
        return this.closest(i);
      },
      // Το πιο κοντινό έτοιμο καρέ, ψάχνοντας και στα έτοιμα και στις άγκυρες.
      // (Το nearest προτιμά την ποιότητα· εδώ μετρά μόνο η ακρίβεια: μάσκες.)
      closest(i) {
        let κ = null; let κd = Infinity;
        for (const [j, v] of ενεργά) if (Math.abs(j - i) < κd) { κd = Math.abs(j - i); κ = { im: v.im, i: j }; }
        for (const [j, im] of άγκυρες) if (Math.abs(j - i) < κd) { κd = Math.abs(j - i); κ = { im, i: j }; }
        return κ;
      },
      // Αλλαγή διευθύνσεων (π.χ. από κινητό σε υπολογιστή): ξεκινά από την αρχή
      destroy() {
        σταμάτησε = true;
        for (const v of ενεργά.values()) κλείσε(v.im);
        for (const im of άγκυρες.values()) κλείσε(im);
        ενεργά.clear(); άγκυρες.clear();
        τελείωσε();
      },
    };
  };
})();

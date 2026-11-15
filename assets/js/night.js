/* ==========================================================================
   GP Development — Αρχική: «Βρείτε το σπίτι σας τη νύχτα»
   Τρία κτίρια σε πλήρες πλάτος, ένα κάθε φορά, με βελάκια/swipe για εναλλαγή.
   - Αόρατες περιοχές κλικ ανά κατοικία, ρεαλιστικά φώτα (προ-υπολογισμένα layers)
   - Η ετικέτα διαθεσιμότητας μπαίνει στο πλάι της κατοικίας με μια λεπτή οριζόντια γραμμή
   - Το φόντο της ενότητας παίρνει το χρώμα του ουρανού/εδάφους κάθε κτιρίου
   ========================================================================== */
(() => {
  'use strict';
  const ενότητα = document.querySelector('[data-night]');
  if (!ενότητα) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const μειωμένηΚίνηση = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const έχειHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const έχειGSAP = !!window.gsap && !μειωμένηΚίνηση;

  const δεδομένα = JSON.parse(ενότητα.querySelector('.νύχτα__δεδομένα').textContent);
  const κείμενα = δεδομένα.κείμενα;
  const έργα = δεδομένα.έργα;
  const σκηνή = ενότητα.querySelector('.νύχτα__σκηνή');
  const χώρος = ενότητα.querySelector('.νύχτα__κτίρια');
  const ετικέτα = ενότητα.querySelector('.φωτο-ετικέτα');
  const ετΓραμμή = ετικέτα.querySelector('.φωτο-ετικέτα__γραμμή');
  const ετΣώμα = ετικέτα.querySelector('.φωτο-ετικέτα__σώμα');
  const ετΕπίπεδο = ετικέτα.querySelector('[data-επίπεδο]');
  const ετΌνομα = ετικέτα.querySelector('[data-όνομα]');
  const ετΚατάσταση = ετικέτα.querySelector('[data-κατάσταση]');
  const ετΣύνδεσμος = ετικέτα.querySelector('[data-σύνδεσμος]');
  const όνομαΈργου = ενότητα.querySelector('[data-όνομα-έργου]');
  const περιοχήΈργου = ενότητα.querySelector('[data-περιοχή-έργου]');
  const σύνδεσμοςΈργου = ενότητα.querySelector('[data-σύνδεσμος-έργου]');

  const περιορισμός = (x, a, b) => Math.min(b, Math.max(a, x));
  const όρια = (σ) => {
    const xs = σ.map((p) => p[0]); const ys = σ.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const svg = (όνομα, ιδ = {}) => { const κ = document.createElementNS(SVG_NS, όνομα); Object.entries(ιδ).forEach(([k, v]) => κ.setAttribute(k, v)); return κ; };

  /* ---------- Κατασκευή των τριών κτιρίων ---------- */
  const κτίρια = έργα.map((έργο, δείκτης) => {
    const [W, H] = έργο.μέγεθος;
    const ρίζα = document.createElement('div');
    ρίζα.className = 'κτίριο';
    ρίζα.setAttribute('role', 'group');
    ρίζα.setAttribute('aria-roledescription', κείμενα.κτίριο);
    ρίζα.setAttribute('aria-label', `${έργο.όνομα}, ${έργο.περιοχή}`);
    ρίζα.hidden = δείκτης !== 0;

    const σκ = document.createElement('div');
    σκ.className = 'κτίριο__σκηνή';
    const εικ = new Image();
    εικ.className = 'κτίριο__εικόνα';
    εικ.alt = `${έργο.όνομα}, ${έργο.περιοχή}`;
    εικ.decoding = 'async';
    εικ.width = W; εικ.height = H;
    if (δείκτης === 0) εικ.src = `${έργο.φάκελος}night.webp`; else εικ.dataset.src = `${έργο.φάκελος}night.webp`;
    σκ.appendChild(εικ);

    const φώτα = document.createElement('div');
    φώτα.className = 'κτίριο__φώτα';
    φώτα.setAttribute('aria-hidden', 'true');
    const φώταΑνάΚωδικό = new Map();
    έργο.κατοικίες.forEach((κ) => {
      const [x, y, w, h] = κ.φως;
      const layers = έργο.στρώσεις.map((σ) => {
        const im = new Image();
        im.className = 'κτίριο__φως'; im.alt = ''; im.decoding = 'async'; im.draggable = false;
        im.dataset.src = `${έργο.φάκελος}${κ.κωδικός.toLowerCase()}${σ.επίθημα}.webp`;
        Object.assign(im.style, { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%`, mixBlendMode: σ.μίξη || 'normal' });
        φώτα.appendChild(im);
        return { im, ένταση: σ.ένταση ?? 1 };
      });
      φώταΑνάΚωδικό.set(κ.κωδικός, layers);
    });
    σκ.appendChild(φώτα);

    const χάρτης = svg('svg', { class: 'κτίριο__χάρτης', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
    έργο.κατοικίες.forEach((κ) => {
      const π = svg('polygon', {
        class: 'κτίριο__περιοχή', points: κ.σημεία.map((p) => p.join(',')).join(' '), tabindex: δείκτης === 0 ? 0 : -1,
        role: 'button', 'aria-pressed': 'false', 'data-code': κ.κωδικός,
        'aria-label': `${κ.όνομα}, ${κ.επίπεδο}, ${κ.διαθέσιμο ? κείμενα.διαθέσιμο : κείμενα.πωλήθηκε}`
      });
      χάρτης.appendChild(π);
    });
    σκ.appendChild(χάρτης);
    ρίζα.appendChild(σκ);
    χώρος.appendChild(ρίζα);

    let φορτώθηκαν = false;
    const φόρτωση = () => {
      if (φορτώθηκαν) return;
      φορτώθηκαν = true;
      if (εικ.dataset.src) { εικ.src = εικ.dataset.src; delete εικ.dataset.src; }
      φώτα.querySelectorAll('img[data-src]').forEach((im) => { im.src = im.dataset.src; delete im.dataset.src; });
    };
    return { έργο, ρίζα, σκ, χάρτης, φώταΑνάΚωδικό, φόρτωση, W, H, κλίμακα: 1, αριστερά: 0, πάνω: 0 };
  });

  /* ---------- Διάταξη: το κτίριο γεμίζει την οθόνη χωρίς να «κόβεται» ---------- */
  const διάταξη = () => {
    const vw = σκηνή.clientWidth; const vh = σκηνή.clientHeight;
    const κινητό = vw < 760;
    const T = κινητό ? 96 : 104;           // χώρος για την κεφαλίδα της ενότητας
    const B = κινητό ? 176 : 150;          // χώρος για τα βελάκια/όνομα
    const aw = κινητό ? vw * 1.06 : vw - 80;
    const ah = Math.max(200, vh - T - B);
    κτίρια.forEach((κ) => {
      const [fx0, fy0, fx1, fy1] = κ.έργο.εστίαση;
      const fw = fx1 - fx0; const fh = fy1 - fy0;
      const ταίριασμα = Math.min(aw / fw, ah / fh);
      const κάλυψη = Math.max(vw / κ.W, vh / κ.H);
      const s = vw / vh > 1 ? Math.min(ταίριασμα, κάλυψη) : ταίριασμα;
      const αρ = vw / 2 - ((fx0 + fx1) / 2) * s;
      const πα = T + ah / 2 - ((fy0 + fy1) / 2) * s;
      Object.assign(κ, { κλίμακα: s, αριστερά: αρ, πάνω: πα });
      Object.assign(κ.σκ.style, { width: `${κ.W * s}px`, height: `${κ.H * s}px`, left: `${αρ}px`, top: `${πα}px` });
    });
    θέσηΕτικέτας();
  };

  /* ---------- Κατάσταση ---------- */
  let τρέχον = 0;
  let ενεργή = null;     // επιλεγμένη κατοικία
  let υπόHover = null;
  let εναλλάσσεται = false;
  const χρονοδιαγράμματα = new Map();

  // Ένα φως ανάβει ΜΙΑ φορά, ομαλά: χωρίς τρεμόπαιγμα και χωρίς να ξανανάβει αν είναι ήδη αναμμένο.
  // Αν οι εικόνες του φωτός δεν έχουν φορτώσει ακόμη, περιμένουμε (αλλιώς η κίνηση «χάνεται»
  // και το φως εμφανίζεται απότομα αργότερα).
  const κατάστασηΦωτός = new Map();   // κλειδί → τελευταία ζητούμενη κατάσταση
  const ΕΝΤΑΣΗ = { σβηστό: 0, hover: 0.42, αναμμένο: 1 };
  const φώτα = (κτ, κ, κατάσταση) => {
    if (!κ) return;
    κτ.φόρτωση();
    const layers = κτ.φώταΑνάΚωδικό.get(κ.κωδικός);
    const σ = ΕΝΤΑΣΗ[κατάσταση];
    const κλειδί = `${κτ.έργο.id}:${κ.κωδικός}`;
    if (κατάστασηΦωτός.get(κλειδί) === κατάσταση) return;
    κατάστασηΦωτός.set(κλειδί, κατάσταση);
    const πριν = χρονοδιαγράμματα.get(κλειδί); if (πριν) { πριν.kill(); χρονοδιαγράμματα.delete(κλειδί); }
    if (!έχειGSAP) { layers.forEach(({ im, ένταση }) => { im.style.opacity = σ * ένταση; }); return; }
    const τρέξε = () => {
      if (κατάστασηΦωτός.get(κλειδί) !== κατάσταση) return;   // άλλαξε στο μεταξύ
      const tl = gsap.timeline({ onComplete: () => χρονοδιαγράμματα.delete(κλειδί) });
      const ανάβει = σ > 0;
      layers.forEach(({ im, ένταση }, j) => {
        tl.to(im, { opacity: σ * ένταση, duration: ανάβει ? (κατάσταση === 'hover' ? 0.35 : 0.55 + j * 0.15) : 0.45, ease: ανάβει ? 'power2.out' : 'power2.inOut', overwrite: true }, ανάβει ? j * 0.06 : 0);
      });
      χρονοδιαγράμματα.set(κλειδί, tl);
    };
    const ανέτοιμες = σ > 0 ? layers.filter(({ im }) => !(im.complete && im.naturalWidth)) : [];
    if (!ανέτοιμες.length) τρέξε();
    else Promise.all(ανέτοιμες.map(({ im }) => (im.decode ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = im.onerror = r; })))).then(τρέξε);
  };

  /* ---------- Ετικέτα διαθεσιμότητας ---------- */
  // Η ετικέτα μπαίνει στο πλάι (αριστερά ή δεξιά), στο ύψος της κατοικίας, ώστε να μην
  // κρύβει ποτέ τα διπλανά διαμερίσματα από πάνω/κάτω. Προτιμάμε τον χώρο έξω από το κτίριο.
  const θέσηΕτικέτας = () => {
    if (!ενεργή || ετικέτα.hidden) return;
    const κτ = κτίρια[τρέχον];
    const s = κτ.κλίμακα;
    const ο = όρια(ενεργή.σημεία);
    const ολο = όρια(κτ.έργο.κατοικίες.flatMap((κ) => κ.σημεία));
    const σ = (x) => κτ.αριστερά + x * s;
    const αρΔιαμ = σ(ο.x0); const δεΔιαμ = σ(ο.x1);
    const αρΚτ = σ(ολο.x0); const δεΚτ = σ(ολο.x1);
    const κέντροY = κτ.πάνω + ((ο.y0 + ο.y1) / 2) * s;
    const vw = σκηνή.clientWidth; const vh = σκηνή.clientHeight;
    const πλάτος = ετΣώμα.offsetWidth; const ύψος = ετΣώμα.offsetHeight;
    const κενό = vw < 760 ? 14 : 28;
    const χωράειΔεξιά = vw - δεΚτ - κενό - 14 >= πλάτος;
    const χωράειΑριστερά = αρΚτ - κενό - 14 >= πλάτος;
    // Αν χωράει έξω από το κτίριο, από την πλευρά της κατοικίας· αλλιώς δίπλα στην κατοικία,
    // από την πλευρά με τον περισσότερο χώρο
    const πλευράΚατοικίας = (αρΔιαμ + δεΔιαμ) / 2 > (αρΚτ + δεΚτ) / 2 ? 'δεξιά' : 'αριστερά';
    let πλευρά; let αρχήΓραμμής; let x;
    if ((πλευράΚατοικίας === 'δεξιά' && χωράειΔεξιά) || (πλευράΚατοικίας === 'αριστερά' && !χωράειΑριστερά && χωράειΔεξιά)) {
      πλευρά = 'δεξιά'; αρχήΓραμμής = δεΔιαμ; x = δεΚτ + κενό;
    } else if (χωράειΑριστερά) {
      πλευρά = 'αριστερά'; αρχήΓραμμής = αρΔιαμ; x = αρΚτ - κενό - πλάτος;
    } else {
      πλευρά = vw - δεΔιαμ >= αρΔιαμ ? 'δεξιά' : 'αριστερά';
      αρχήΓραμμής = πλευρά === 'δεξιά' ? δεΔιαμ : αρΔιαμ;
      x = πλευρά === 'δεξιά' ? δεΔιαμ + κενό : αρΔιαμ - κενό - πλάτος;
      x = περιορισμός(x, 14, vw - πλάτος - 14);
    }
    const y = περιορισμός(κέντροY - ύψος / 2, 90, Math.max(90, vh - ύψος - 150));
    ετικέτα.classList.toggle('is-left', πλευρά === 'αριστερά');
    ετικέτα.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    // Οριζόντια γραμμή από την άκρη της κατοικίας έως την ετικέτα
    const άκρηΕτικέτας = πλευρά === 'δεξιά' ? x : x + πλάτος;
    const μήκος = Math.max(0, Math.abs(άκρηΕτικέτας - αρχήΓραμμής) - 6);
    ετΓραμμή.style.width = `${μήκος}px`;
    ετΓραμμή.style.top = `${περιορισμός(κέντροY - y, 8, ύψος - 8)}px`;
  };

  // Μία μόνο κίνηση ετικέτας τη φορά: σταματάμε ολόκληρη την προηγούμενη (μαζί με τα βήματα
  // που δεν έχουν ξεκινήσει ακόμη και το onComplete της απόκρυψης), αλλιώς ένα γρήγορο
  // δεύτερο κλικ ξαναπαίζει την εμφάνιση ή κρύβει τη νέα ετικέτα.
  let κίνησηΕτικέτας = null;
  const σταμάτησεΚίνησηΕτικέτας = () => {
    if (κίνησηΕτικέτας) { κίνησηΕτικέτας.kill(); κίνησηΕτικέτας = null; }
    if (έχειGSAP) gsap.killTweensOf([ετΓραμμή, ετΣώμα.children]);
  };
  const εμφάνισηΕτικέτας = (κ) => {
    ετΕπίπεδο.textContent = κ.επίπεδο;
    ετΌνομα.textContent = κ.όνομα;
    ετΚατάσταση.textContent = κ.διαθέσιμο ? κείμενα.διαθέσιμο : κείμενα.πωλήθηκε;
    ετικέτα.classList.toggle('is-sold', !κ.διαθέσιμο);
    ετΣύνδεσμος.href = κ.διαθέσιμο ? κ.σύνδεσμος : κτίρια[τρέχον].έργο.σύνδεσμος;
    ετΣύνδεσμος.querySelector('span').textContent = κ.διαθέσιμο ? κείμενα.κατοικία : κείμενα.έργο;
    ετικέτα.hidden = false;
    θέσηΕτικέτας();
    if (!έχειGSAP) return;
    const αριστερά = ετικέτα.classList.contains('is-left');
    σταμάτησεΚίνησηΕτικέτας();
    // Η γραμμή «βγαίνει» από την κατοικία προς την ετικέτα
    κίνησηΕτικέτας = gsap.timeline()
      .fromTo(ετΓραμμή, { scaleX: 0, transformOrigin: αριστερά ? '100% 50%' : '0% 50%' }, { scaleX: 1, duration: 0.5, ease: 'power3.inOut' })
      .fromTo(ετΣώμα.children, { x: αριστερά ? 14 : -14, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, '-=0.2');
  };
  const απόκρυψηΕτικέτας = (άμεσα = false) => {
    if (ετικέτα.hidden) return;
    if (!έχειGSAP || άμεσα) { σταμάτησεΚίνησηΕτικέτας(); ετικέτα.hidden = true; return; }
    σταμάτησεΚίνησηΕτικέτας();
    κίνησηΕτικέτας = gsap.timeline({ onComplete: () => { ετικέτα.hidden = true; κίνησηΕτικέτας = null; } })
      .to(ετΣώμα.children, { opacity: 0, duration: 0.22, stagger: 0.02, ease: 'power2.in' })
      .to(ετΓραμμή, { scaleX: 0, duration: 0.28, ease: 'power2.in' }, 0.05);
  };

  /* ---------- Επιλογή κατοικίας ---------- */
  const επιλογή = (κ) => {
    const κτ = κτίρια[τρέχον];
    if (ενεργή === κ) { window.location.href = ετΣύνδεσμος.href; return; }
    if (ενεργή) φώτα(κτ, ενεργή, 'σβηστό');
    ενεργή = κ; υπόHover = null;
    φώτα(κτ, κ, 'αναμμένο');
    κτ.χάρτης.querySelectorAll('.κτίριο__περιοχή').forEach((π) => π.setAttribute('aria-pressed', π.dataset.code === κ.κωδικός ? 'true' : 'false'));
    εμφάνισηΕτικέτας(κ);
  };
  const αποεπιλογή = () => {
    if (!ενεργή) return;
    const κτ = κτίρια[τρέχον];
    φώτα(κτ, ενεργή, 'σβηστό');
    κτ.χάρτης.querySelectorAll('.κτίριο__περιοχή').forEach((π) => π.setAttribute('aria-pressed', 'false'));
    ενεργή = null;
    απόκρυψηΕτικέτας();
  };

  /* ---------- Εναλλαγή κτιρίου ---------- */
  const αυγή = document.querySelector('.αφετηρίες__αυγή');   // η μετάβαση κάτω από τη νύχτα ξεκινά από το ίδιο χρώμα
  const ενημέρωσηΧρωμάτων = (έργο) => {
    ενότητα.style.setProperty('--νύχτα-πάνω', έργο.χρώματα[0]);
    ενότητα.style.setProperty('--νύχτα-κάτω', έργο.χρώματα[1]);
    if (αυγή) αυγή.style.setProperty('--νύχτα-κάτω', έργο.χρώματα[1]);
  };
  const ενημέρωσηΟνόματος = (έργο, κατεύθυνση) => {
    const αλλαγή = () => {
      όνομαΈργου.textContent = έργο.όνομα;
      περιοχήΈργου.textContent = `${έργο.περιοχή} · ${έργο.κατάσταση}`;
      σύνδεσμοςΈργου.href = έργο.σύνδεσμος;
      σύνδεσμοςΈργου.setAttribute('aria-label', `${κείμενα.έργο}: ${έργο.όνομα}`);
    };
    if (!έχειGSAP) { αλλαγή(); return; }
    const στοιχεία = [όνομαΈργου, περιοχήΈργου];
    gsap.timeline()
      .to(στοιχεία, { yPercent: -40 * κατεύθυνση, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04 })
      .add(αλλαγή)
      .fromTo(στοιχεία, { yPercent: 40 * κατεύθυνση, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06 });
  };

  const μετάβαση = (κατεύθυνση) => {
    if (εναλλάσσεται) return;
    const από = κτίρια[τρέχον];
    if (ενεργή) { φώτα(από, ενεργή, 'σβηστό'); ενεργή = null; απόκρυψηΕτικέτας(true); }
    if (υπόHover) { φώτα(από, υπόHover, 'σβηστό'); υπόHover = null; }
    τρέχον = (τρέχον + κατεύθυνση + κτίρια.length) % κτίρια.length;
    const προς = κτίρια[τρέχον];
    προς.φόρτωση();
    κτίρια[(τρέχον + 1) % κτίρια.length].φόρτωση();
    από.χάρτης.querySelectorAll('.κτίριο__περιοχή').forEach((π) => { π.tabIndex = -1; });
    προς.χάρτης.querySelectorAll('.κτίριο__περιοχή').forEach((π) => { π.tabIndex = 0; });
    ενημέρωσηΧρωμάτων(προς.έργο);
    ενημέρωσηΟνόματος(προς.έργο, κατεύθυνση);
    προς.ρίζα.hidden = false;
    if (!έχειGSAP) { από.ρίζα.hidden = true; return; }
    εναλλάσσεται = true;
    gsap.timeline({ onComplete: () => { από.ρίζα.hidden = true; gsap.set([από.ρίζα, προς.ρίζα], { clearProps: 'all' }); εναλλάσσεται = false; } })
      .to(από.ρίζα, { xPercent: -7 * κατεύθυνση, opacity: 0, scale: 0.97, filter: 'blur(10px) brightness(.4)', duration: 0.9, ease: 'power3.inOut' }, 0)
      .fromTo(προς.ρίζα, { xPercent: 9 * κατεύθυνση, opacity: 0, scale: 1.03, filter: 'blur(12px) brightness(.3)' },
        { xPercent: 0, opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', duration: 1.15, ease: 'power3.out' }, 0.25);
  };

  /* ---------- Events ---------- */
  const βρες = (στόχος) => {
    const κωδ = στόχος && στόχος.getAttribute && στόχος.getAttribute('data-code');
    return κωδ ? κτίρια[τρέχον].έργο.κατοικίες.find((κ) => κ.κωδικός === κωδ) : null;
  };
  let τελευταίοSwipe = 0;
  χώρος.addEventListener('click', (ε) => {
    if (performance.now() - τελευταίοSwipe < 400) return;
    const κ = βρες(ε.target);
    if (κ) { ε.stopPropagation(); επιλογή(κ); } else αποεπιλογή();
  });
  // Η ετικέτα δεν «κλέβει» ποτέ το άγγιγμα: είναι διαφανής στα κλικ, εκτός από τον σύνδεσμό της.
  // Κι αν ο σύνδεσμος πέφτει πάνω σε άλλη κατοικία, προτεραιότητα έχει η κατοικία.
  ετΣύνδεσμος.addEventListener('click', (ε) => {
    const από = ετΣύνδεσμος.style.pointerEvents;
    ετΣύνδεσμος.style.pointerEvents = 'none';
    const κάτω = document.elementFromPoint(ε.clientX, ε.clientY);
    ετΣύνδεσμος.style.pointerEvents = από;
    const κ = βρες(κάτω);
    if (κ && κ !== ενεργή && ε.detail !== 0) { ε.preventDefault(); επιλογή(κ); }
  });
  χώρος.addEventListener('keydown', (ε) => {
    if (ε.key !== 'Enter' && ε.key !== ' ') return;
    const κ = βρες(ε.target); if (κ) { ε.preventDefault(); επιλογή(κ); }
  });
  if (έχειHover) {
    χώρος.addEventListener('pointerover', (ε) => {
      const κ = βρες(ε.target);
      if (κ === υπόHover) return;
      const κτ = κτίρια[τρέχον];
      if (υπόHover && υπόHover !== ενεργή) φώτα(κτ, υπόHover, 'σβηστό');
      υπόHover = κ && κ !== ενεργή ? κ : null;
      if (υπόHover) φώτα(κτ, υπόHover, 'hover');
    });
    χώρος.addEventListener('pointerleave', () => {
      if (υπόHover && υπόHover !== ενεργή) φώτα(κτίρια[τρέχον], υπόHover, 'σβηστό');
      υπόHover = null;
    });
  }
  ενότητα.querySelector('[data-προηγούμενο]').addEventListener('click', () => μετάβαση(-1));
  ενότητα.querySelector('[data-επόμενο]').addEventListener('click', () => μετάβαση(1));
  ενότητα.addEventListener('keydown', (ε) => {
    if (ε.key === 'ArrowRight') μετάβαση(1);
    if (ε.key === 'ArrowLeft') μετάβαση(-1);
    if (ε.key === 'Escape') αποεπιλογή();
  });
  // Swipe στο κινητό
  let αρχή = null;
  χώρος.addEventListener('touchstart', (ε) => { const t = ε.touches[0]; αρχή = { x: t.clientX, y: t.clientY }; }, { passive: true });
  χώρος.addEventListener('touchend', (ε) => {
    if (!αρχή) return;
    const t = ε.changedTouches[0]; const dx = t.clientX - αρχή.x; const dy = t.clientY - αρχή.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) { τελευταίοSwipe = performance.now(); μετάβαση(dx < 0 ? 1 : -1); }
    αρχή = null;
  });

  if ('ResizeObserver' in window) new ResizeObserver(διάταξη).observe(σκηνή); else window.addEventListener('resize', διάταξη);
  διάταξη();
  ενημέρωσηΧρωμάτων(έργα[0]);
  ενημέρωσηΟνόματος(έργα[0], 1);

  // Όλα φορτώνουν από την αρχή: η οθόνη φόρτωσης περιμένει και αυτές τις εικόνες (intro.js)
  κτίρια.forEach((κ) => κ.φόρτωση());

  // Είσοδος: το κτίριο αναδύεται από το σκοτάδι
  if (έχειGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    // Απαλό, μακρύ fade: το πρώτο κτίριο «βγαίνει» από το σκοτάδι σε όλη τη διαδρομή μέχρι να γεμίσει την οθόνη
    gsap.fromTo(χώρος, { opacity: 0, scale: 1.025 }, {
      opacity: 1, scale: 1, ease: 'sine.inOut',
      scrollTrigger: { trigger: σκηνή, start: 'top 100%', end: 'top 0%', scrub: 1.4 }
    });
    gsap.fromTo(ενότητα.querySelectorAll('.νύχτα__κεφαλή > *, .νύχτα__έλεγχοι'), { opacity: 0, y: 24 }, {
      opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: σκηνή, start: 'top 35%', toggleActions: 'play none none none' }
    });
  }
})();

/* ==========================================================================
   Τα κτίριά μας στην Αττική — τρισδιάστατος χάρτης (three.js, αυτο-φιλοξενούμενο)
   - Το ανάγλυφο έρχεται από /assets/map/attica-height.png (512×512, υψόμετρο σε R,G = 16 bit).
   - Οι πινέζες και τα τοπωνύμια είναι HTML (map_section.py)· εδώ μόνο ακολουθούν τον χάρτη.
   - Scroll (η ενότητα «κολλάει»): σύννεφα ανοίγουν → η κάμερα κατεβαίνει → ελεύθερη περιήγηση
     → σύννεφα ξανακλείνουν. Ο three.js φορτώνει μόνο όταν η ενότητα πλησιάσει.
   Σημείωση: ο κώδικας GLSL (shaders) πρέπει να είναι μόνο σε λατινικούς χαρακτήρες.
   ========================================================================== */
const ενότητα = document.querySelector('[data-χάρτης]');
if (ενότητα) {
  const σκηνήΕνότητας = ενότητα.querySelector('.χάρτης-ενότητα__σκηνή');
  const μειωμένη = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const αφή = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const ομαλό = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const πρόοδος = () => { const r = ενότητα.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };

  // ---------- Σύννεφα και εμφάνιση στοιχείων με το scroll (δουλεύει και πριν φορτώσει ο χάρτης)
  let p = 0;
  const σύννεφα = () => {
    p = μειωμένη ? 0.5 : πρόοδος();
    const άνοιγμα = ομαλό(0.02, 0.28, p) * (1 - ομαλό(0.8, 0.98, p));   // 0 κλειστά · 1 ανοιχτά
    const σ = σκηνήΕνότητας.style;
    σ.setProperty('--χ-άνοιγμα', άνοιγμα.toFixed(3));
    // τα σύννεφα μένουν λευκά και πυκνά όσο απομακρύνονται (χωρίς γκρίζα θολούρα πάνω στο σκοτάδι)·
    // το πέπλο χαρτιού φεύγει νωρίς, ώστε ο χάρτης να φαίνεται στα κενά τους
    σ.setProperty('--χ-νέφη', (1 - ομαλό(0.72, 1, άνοιγμα)).toFixed(3));
    σ.setProperty('--χ-πέπλο', (1 - ομαλό(0.0, 0.32, άνοιγμα)).toFixed(3));
    const ui = ομαλό(0.6, 1, άνοιγμα);
    σ.setProperty('--χ-ui', ui.toFixed(3));
    σ.setProperty('--χ-δείκτης', ui > 0.6 ? 'auto' : 'none');
  };
  if (μειωμένη) σύννεφα();
  else {
    let αναμονή = false;
    addEventListener('scroll', () => { if (!αναμονή) { αναμονή = true; requestAnimationFrame(() => { αναμονή = false; σύννεφα(); }); } }, { passive: true });
    σύννεφα();
  }

  // ---------- Ο χάρτης φορτώνει όταν η ενότητα πλησιάσει
  let ξεκίνησε = false;
  const ξεκίνα = async () => {
    if (ξεκίνησε) return; ξεκίνησε = true;
    const THREE = await import('./vendor/three.module.min.js');
    const { OrbitControls } = await import('./vendor/OrbitControls.js');
    const ΚΙΝΗΤΟ = innerWidth < 760;
    const ΟΡΙΑ = { kmx: 59.675, kmy: 64.131, N: 512 };
    const W = ΟΡΙΑ.kmx, D = ΟΡΙΑ.kmy, N = ΟΡΙΑ.N, ΥΨΟΣ_Χ = 2.4;

    // Υψόμετρα
    const εικόνα = await new Promise((r, λ) => { const im = new Image(); im.onload = () => r(im); im.onerror = λ; im.src = '/assets/map/attica-height.png'; });
    const κ = document.createElement('canvas'); κ.width = κ.height = N;
    const c2 = κ.getContext('2d', { willReadFrequently: true }); c2.drawImage(εικόνα, 0, 0);
    const δ = c2.getImageData(0, 0, N, N).data;
    const υψόμετρο = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) υψόμετρο[i] = (δ[i * 4] * 256 + δ[i * 4 + 1]) / 40 - 100;
    const ύψοςΣε = (fx, fy) => {
      const x = Math.min(N - 1, Math.max(0, fx * (N - 1))), y = Math.min(N - 1, Math.max(0, fy * (N - 1)));
      const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1), tx = x - x0, ty = y - y0;
      const a = υψόμετρο[y0 * N + x0], b = υψόμετρο[y0 * N + x1], c = υψόμετρο[y1 * N + x0], d = υψόμετρο[y1 * N + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const σε3Δ = (fx, fy, πάνω = 0) => new THREE.Vector3((fx - 0.5) * W, Math.max(0, ύψοςΣε(fx, fy)) / 1000 * ΥΨΟΣ_Χ + πάνω, (fy - 0.5) * D);

    // Σκηνή
    const δοχείο = ενότητα.querySelector('.χάρτης-ενότητα__καμβάς');
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, ΚΙΝΗΤΟ ? 2 : 1.75));
    const μέγεθος = () => { renderer.setSize(δοχείο.clientWidth, δοχείο.clientHeight); κάμερα.aspect = δοχείο.clientWidth / δοχείο.clientHeight; κάμερα.updateProjectionMatrix(); };
    renderer.setClearColor(0x0d0f13, 1);
    δοχείο.appendChild(renderer.domElement);
    const σκηνή = new THREE.Scene();
    const κάμερα = new THREE.PerspectiveCamera(ΚΙΝΗΤΟ ? 44 : 34, 1, 0.1, 400);
    μέγεθος();

    // Έδαφος
    const ΒΗΜΑ = ΚΙΝΗΤΟ ? 2 : 1, Ν = Math.floor((N - 1) / ΒΗΜΑ) + 1;
    const γεωμετρία = new THREE.PlaneGeometry(W, D, Ν - 1, Ν - 1);
    γεωμετρία.rotateX(-Math.PI / 2);
    const θέσεις = γεωμετρία.attributes.position, υψ = new Float32Array(θέσεις.count);
    for (let j = 0; j < Ν; j++) for (let i = 0; i < Ν; i++) {
      const k = j * Ν + i, e = υψόμετρο[Math.min(N - 1, j * ΒΗΜΑ) * N + Math.min(N - 1, i * ΒΗΜΑ)];
      υψ[k] = e; θέσεις.setY(k, e > 0.5 ? e / 1000 * ΥΨΟΣ_Χ : -0.06);
    }
    γεωμετρία.setAttribute('aElev', new THREE.BufferAttribute(υψ, 1));
    γεωμετρία.computeVertexNormals();
    const ΟΜΙΧΛΗ = { uFog: { value: new THREE.Color(0x0d0f13) }, uNear: { value: 55 }, uFar: { value: 125 } };
    σκηνή.add(new THREE.Mesh(γεωμετρία, new THREE.ShaderMaterial({
      uniforms: { uLight: { value: new THREE.Vector3(-0.55, 0.75, -0.35).normalize() }, ...ΟΜΙΧΛΗ },
      vertexShader: `
        attribute float aElev;
        varying float vElev; varying vec3 vNorm; varying float vDist; varying vec2 vUv;
        void main() {
          vElev = aElev; vNorm = normal; vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uLight; uniform vec3 uFog; uniform float uNear; uniform float uFar;
        varying float vElev; varying vec3 vNorm; varying float vDist; varying vec2 vUv;
        void main() {
          if (vElev <= 0.5) discard;
          vec3 n = normalize(vNorm);
          float diff = clamp(dot(n, uLight), 0.0, 1.0);
          vec3 col = mix(vec3(0.090, 0.098, 0.112), vec3(0.205, 0.205, 0.215), smoothstep(0.0, 1100.0, vElev));
          col *= 0.55 + 0.85 * diff;
          col += vec3(0.02, 0.022, 0.03) * (1.0 - diff);
          float e = vElev / 100.0, w = fwidth(e);
          float line = 1.0 - smoothstep(0.0, w * 1.2, abs(fract(e - 0.5) - 0.5));
          col = mix(col, vec3(0.83, 0.68, 0.40), line * 0.16 * smoothstep(40.0, 160.0, vElev));
          col = mix(col, vec3(0.86, 0.72, 0.46), (1.0 - smoothstep(0.5, 9.0, vElev)) * 0.32);
          float edge = smoothstep(0.0, 0.12, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
          col = mix(uFog, col, edge);
          gl_FragColor = vec4(mix(col, uFog, smoothstep(uNear, uFar, vDist)), 1.0);
        }`,
    })));
    const θάλασσα = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, D * 3), new THREE.ShaderMaterial({
      uniforms: { ...ΟΜΙΧΛΗ },
      vertexShader: `varying vec2 vPos; varying float vDist; void main(){ vPos = position.xy; vec4 mv = modelViewMatrix * vec4(position,1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uFog; uniform float uNear; uniform float uFar; varying vec2 vPos; varying float vDist;
        void main(){ vec3 c = mix(uFog, vec3(0.045, 0.058, 0.080) + vec3(0.02, 0.03, 0.045) * (1.0 - smoothstep(0.0, 30.0, length(vPos))), 1.0 - smoothstep(22.0, 40.0, length(vPos)));
          gl_FragColor = vec4(mix(c, uFog, smoothstep(uNear, uFar, vDist)), 1.0); }`,
    }));
    θάλασσα.rotation.x = -Math.PI / 2; θάλασσα.position.y = -0.02;
    σκηνή.add(θάλασσα);

    // Ακτίνες φωτός και λάμψη πάνω από τα έργα
    const υλικόΑκτίνας = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying float vY; void main(){ float a = pow(1.0 - vY, 2.2) * (0.75 + 0.25 * sin(uTime * 2.0)); gl_FragColor = vec4(vec3(0.95, 0.76, 0.31) * a, a); }`,
    });
    const υλικόΛάμψης = new THREE.SpriteMaterial({ map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(242,193,78,0.9)'); r.addColorStop(0.25, 'rgba(242,193,78,0.35)'); r.addColorStop(1, 'rgba(242,193,78,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const θέση = (el) => el.getAttribute('data-θέση').split(' ').map(Number);
    const έργα = [...ενότητα.querySelectorAll('.πινέζα')].map((a) => {
      const [fx, fy] = θέση(a), βάση = σε3Δ(fx, fy);
      const ακτίνα = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8, 1, true), υλικόΑκτίνας);
      ακτίνα.position.copy(βάση).add(new THREE.Vector3(0, 1.6, 0)); σκηνή.add(ακτίνα);
      const λάμψη = new THREE.Sprite(υλικόΛάμψης); λάμψη.scale.set(2.4, 2.4, 1); λάμψη.position.copy(βάση).add(new THREE.Vector3(0, 0.05, 0)); σκηνή.add(λάμψη);
      return { a, βάση, κορυφή: βάση.clone().add(new THREE.Vector3(0, 0.25, 0)), πλευρά: a.getAttribute('data-πλευρά'), slug: a.getAttribute('href') };
    });
    const τόποι = [...ενότητα.querySelectorAll('.τόπος')].map((s) => { const [fx, fy] = θέση(s); return { s, θ: σε3Δ(fx, fy, s.dataset.είδος === 'βουνό' ? 0.5 : 0.1) }; });

    // Κάμερα: η κάθοδος ακολουθεί το scroll ως τη στιγμή που ο επισκέπτης πιάσει τον χάρτη
    const στόχος = σε3Δ(0.545, 0.53);
    const ΤΕΛΙΚΗ = new THREE.Vector3(στόχος.x - 14, ΚΙΝΗΤΟ ? 30 : 22, στόχος.z + 30);
    const ΑΡΧΙΚΗ = new THREE.Vector3(στόχος.x, 95, στόχος.z + 6);
    const έλεγχος = new OrbitControls(κάμερα, renderer.domElement);
    έλεγχος.enableDamping = true; έλεγχος.dampingFactor = 0.07;
    έλεγχος.enableZoom = false;                       // ο τροχός κάνει scroll στη σελίδα
    έλεγχος.enablePan = false;
    έλεγχος.enableRotate = !αφή;                      // στην αφή, το δάχτυλο κάνει scroll· οι πινέζες πατιούνται
    έλεγχος.minPolarAngle = 0.25; έλεγχος.maxPolarAngle = 1.2; έλεγχος.rotateSpeed = 0.55;
    έλεγχος.target.copy(στόχος);
    renderer.domElement.style.touchAction = αφή ? 'pan-y' : 'none';
    let ελεύθερη = false;
    έλεγχος.addEventListener('start', () => { ελεύθερη = true; });
    κάμερα.position.copy(ΑΡΧΙΚΗ); κάμερα.lookAt(στόχος);

    // Λίστα: στο πέρασμα του ποντικιού φωτίζει την πινέζα
    ενότητα.querySelectorAll('[data-έργο]').forEach((λ) => {
      const έ = έργα.find((x) => x.slug === λ.getAttribute('href'));
      if (!έ) return;
      λ.addEventListener('mouseenter', () => έ.a.classList.add('είναι-ενεργό'));
      λ.addEventListener('mouseleave', () => έ.a.classList.remove('είναι-ενεργό'));
      έ.a.addEventListener('mouseenter', () => λ.classList.add('είναι-ενεργό'));
      έ.a.addEventListener('mouseleave', () => λ.classList.remove('είναι-ενεργό'));
    });

    // Βρόχος: μόνο όσο η ενότητα φαίνεται
    const π = new THREE.Vector3(), ρολόι = new THREE.Clock();
    let ορατή = true, τρέχει = false;
    const προβολή = (v) => { π.copy(v).project(κάμερα); return [(π.x + 1) / 2 * δοχείο.clientWidth, (1 - π.y) / 2 * δοχείο.clientHeight, π.z]; };
    const καρέ = () => {
      if (!ορατή) { τρέχει = false; return; }
      const dt = Math.min(0.05, ρολόι.getDelta());
      υλικόΑκτίνας.uniforms.uTime.value += dt;
      if (!ελεύθερη) {
        const t = μειωμένη ? 1 : ομαλό(0.06, 0.42, p);
        κάμερα.position.lerpVectors(ΑΡΧΙΚΗ, ΤΕΛΙΚΗ, t);
        κάμερα.lookAt(έλεγχος.target);
      }
      έλεγχος.update();
      renderer.render(σκηνή, κάμερα);
      const w = δοχείο.clientWidth, h = δοχείο.clientHeight;
      έργα.forEach((έ) => {
        const [x, y, z] = προβολή(έ.κορυφή), εκτός = z > 1 || x < -40 || x > w + 40 || y < -40 || y > h + 40;
        έ.a.style.setProperty('--x', (εκτός ? -999 : x).toFixed(1) + 'px');
        έ.a.style.setProperty('--y', (εκτός ? -999 : y).toFixed(1) + 'px');
        έ.a.classList.toggle('αριστερά', έ.πλευρά === 'αριστερά' ? x > 250 : x > w - 250);
        έ.a.classList.toggle('πάνω', y > h - 280);
      });
      τόποι.forEach((τ) => { const [x, y, z] = προβολή(τ.θ); τ.s.style.setProperty('--x', (z > 1 ? -999 : x).toFixed(1) + 'px'); τ.s.style.setProperty('--y', (z > 1 ? -999 : y).toFixed(1) + 'px'); });
      requestAnimationFrame(καρέ);
    };
    const ξεκίναΒρόχο = () => { if (!τρέχει) { τρέχει = true; ρολόι.getDelta(); requestAnimationFrame(καρέ); } };
    new IntersectionObserver((ε) => { ορατή = ε[0].isIntersecting; if (ορατή) ξεκίναΒρόχο(); }).observe(ενότητα);
    addEventListener('resize', μέγεθος);
    ενότητα.classList.add('είναι-έτοιμος');
    ξεκίναΒρόχο();
  };
  if ('IntersectionObserver' in window) {
    const ιο = new IntersectionObserver((ε) => { if (ε[0].isIntersecting) { ιο.disconnect(); ξεκίνα().catch(() => {}); } }, { rootMargin: '150% 0px' });
    ιο.observe(ενότητα);
  } else ξεκίνα().catch(() => {});
}

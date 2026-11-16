/* ==========================================================================
   Τα κτίριά μας στην Αττική — τρισδιάστατος χάρτης (three.js, αυτο-φιλοξενούμενο)
   - Νυχτερινή Αττική από ψηλά: πραγματικό ανάγλυφο (SRTM) και φώτα πάνω στο πραγματικό οδικό δίκτυο
     (OpenStreetMap), ψημένα από το src-tools/map_bake.py στο /assets/map/.
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
    const W = 59.675, D = 64.131, N = 512, ΥΨΟΣ_Χ = 2.0;
    const ΚΑΜΠΥΛΗ = 0.0011;                    // καμπυλότητα: το έδαφος «γέρνει» προς τον ορίζοντα

    // ---------- Δεδομένα: υψόμετρο, ανάγλυφο (normal map + μάσκα στεριάς), φώτα της πόλης
    const εικόνα = (src) => new Promise((r, λ) => { const im = new Image(); im.onload = () => r(im); im.onerror = λ; im.src = src; });
    const υφή = (im, χρώμα) => { const t = new THREE.Texture(im); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
    const [εικΎψους, εικΑνάγλυφου, εικΦώτων] = await Promise.all([
      εικόνα('/assets/map/attica-height.png'), εικόνα('/assets/map/attica-normal.webp'),
      εικόνα(ΚΙΝΗΤΟ ? '/assets/map/attica-lights-2048.webp' : '/assets/map/attica-lights.webp')]);
    const κ = document.createElement('canvas'); κ.width = κ.height = N;
    const c2 = κ.getContext('2d', { willReadFrequently: true }); c2.drawImage(εικΎψους, 0, 0);
    const δ = c2.getImageData(0, 0, N, N).data;
    const υψόμετρο = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) υψόμετρο[i] = (δ[i * 4] * 256 + δ[i * 4 + 1]) / 40 - 100;
    const ύψοςΣε = (fx, fy) => {
      const x = Math.min(N - 1, Math.max(0, fx * (N - 1))), y = Math.min(N - 1, Math.max(0, fy * (N - 1)));
      const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1), tx = x - x0, ty = y - y0;
      const a = υψόμετρο[y0 * N + x0], b = υψόμετρο[y0 * N + x1], c = υψόμετρο[y1 * N + x0], d = υψόμετρο[y1 * N + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const ΚΕΝΤΡΟ = [(0.545 - 0.5) * W, (0.53 - 0.5) * D];
    const πτώση = (x, z) => ΚΑΜΠΥΛΗ * ((x - ΚΕΝΤΡΟ[0]) ** 2 + (z - ΚΕΝΤΡΟ[1]) ** 2);
    const σε3Δ = (fx, fy, πάνω = 0) => { const x = (fx - 0.5) * W, z = (fy - 0.5) * D; return new THREE.Vector3(x, Math.max(0, ύψοςΣε(fx, fy)) / 1000 * ΥΨΟΣ_Χ + πάνω - πτώση(x, z), z); };

    // ---------- Σκηνή
    const δοχείο = ενότητα.querySelector('.χάρτης-ενότητα__καμβάς');
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, ΚΙΝΗΤΟ ? 2 : 1.75));
    const μέγεθος = () => { renderer.setSize(δοχείο.clientWidth, δοχείο.clientHeight); κάμερα.aspect = δοχείο.clientWidth / δοχείο.clientHeight; κάμερα.updateProjectionMatrix(); };
    renderer.setClearColor(0x05070b, 1);
    δοχείο.appendChild(renderer.domElement);
    const σκηνή = new THREE.Scene();
    const κάμερα = new THREE.PerspectiveCamera(ΚΙΝΗΤΟ ? 46 : 36, 1, 0.1, 600);
    μέγεθος();

    // ---------- Έδαφος και θάλασσα: ένα πλέγμα με το πραγματικό ανάγλυφο
    const Ν = ΚΙΝΗΤΟ ? 256 : 512, ΒΗΜΑ = (N - 1) / (Ν - 1);
    const γεωμετρία = new THREE.PlaneGeometry(W, D, Ν - 1, Ν - 1);
    γεωμετρία.rotateX(-Math.PI / 2);
    const θέσεις = γεωμετρία.attributes.position;
    for (let j = 0; j < Ν; j++) for (let i = 0; i < Ν; i++) {
      const k = j * Ν + i, e = υψόμετρο[Math.round(j * ΒΗΜΑ) * N + Math.round(i * ΒΗΜΑ)];
      θέσεις.setY(k, Math.max(0, e) / 1000 * ΥΨΟΣ_Χ - πτώση(θέσεις.getX(k), θέσεις.getZ(k)));
    }
    const ΚΟΙΝΑ = { uFog: { value: new THREE.Color(0x05070b) }, uTime: { value: 0 } };
    const υλικόΕδάφους = new THREE.ShaderMaterial({
      uniforms: { ...ΚΟΙΝΑ, uNormal: { value: υφή(εικΑνάγλυφου) }, uLights: { value: υφή(εικΦώτων) }, uMoon: { value: new THREE.Vector3(-0.45, 0.62, -0.64).normalize() }, uCam: { value: new THREE.Vector3() } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vWorld;
        void main() { vUv = uv; vUv.y = 1.0 - vUv.y; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uNormal; uniform sampler2D uLights; uniform vec3 uMoon; uniform vec3 uCam; uniform vec3 uFog; uniform float uTime;
        varying vec2 vUv; varying vec3 vWorld;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main() {
          vec4 nm = texture2D(uNormal, vUv);
          float land = smoothstep(0.35, 0.65, nm.a);
          vec3 n = normalize(nm.rgb * 2.0 - 1.0);
          vec3 L = texture2D(uLights, vUv).rgb;
          float glowWide = texture2D(uLights, vUv, 5.0).b;
          vec3 V = normalize(uCam - vWorld);
          float dist = length(uCam - vWorld);

          // --- steria: skoteino edafos sto feggarofoto
          float diff = clamp(dot(n, uMoon), 0.0, 1.0);
          float slope = 1.0 - n.y;
          vec3 albedo = mix(vec3(0.050, 0.058, 0.070), vec3(0.030, 0.040, 0.042), smoothstep(0.02, 0.22, slope));
          albedo *= 0.85 + 0.3 * noise(vUv * 900.0);
          vec3 ground = albedo * (0.30 + 1.9 * diff) * vec3(0.72, 0.85, 1.12);
          ground += albedo * vec3(1.0, 0.62, 0.30) * L.b * 1.3;                      // i poli fotizei to edafos

          // --- fota: dromoi geitonias (zesto natrio), megaloi dromoi (pio lefko), lampsi
          float tw = 0.72 + 0.56 * hash(floor(vUv * 4096.0));
          float flick = 0.94 + 0.06 * sin(uTime * 3.0 + hash(floor(vUv * 1024.0)) * 40.0);
          vec3 lights = vec3(1.0, 0.60, 0.26) * L.g * (0.55 + 0.95 * L.b) * 1.5 * tw * flick
                      + vec3(1.0, 0.80, 0.52) * L.r * 2.2
                      + vec3(1.0, 0.50, 0.18) * L.b * L.b * 0.16;
          vec3 landCol = ground + lights;

          // --- thalassa: skoteini, me antanaklasi tis lampsis tis polis kai tou feggariou
          vec2 wv = vWorld.xz * 1.6 + vec2(uTime * 0.05, uTime * 0.03);
          vec3 wn = normalize(vec3((noise(wv) - 0.5) * 0.35, 1.0, (noise(wv + 17.0) - 0.5) * 0.35));
          float fres = pow(1.0 - clamp(dot(wn, V), 0.0, 1.0), 4.0);
          float spec = pow(clamp(dot(reflect(-uMoon, wn), V), 0.0, 1.0), 90.0);
          vec3 sea = vec3(0.012, 0.020, 0.034) + vec3(0.05, 0.075, 0.12) * fres
                   + vec3(0.55, 0.62, 0.75) * spec * 0.35
                   + vec3(1.0, 0.52, 0.20) * glowWide * (0.22 + 0.5 * fres);

          vec3 col = mix(sea, landCol, land);
          // --- atmosfaira: omichli apostasis kai fotorypansi pano apo tin poli
          float fog = 1.0 - exp(-dist * 0.0105);
          vec3 haze = uFog + vec3(0.16, 0.085, 0.035) * glowWide;
          col = mix(col, haze, fog * 0.85);
          // sbisimo stis akres tou charti
          float edge = smoothstep(0.0, 0.10, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
          col = mix(uFog, col, edge);
          col = 1.0 - exp(-col * 1.35);                                              // tone mapping
          gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
        }`,
    });
    σκηνή.add(new THREE.Mesh(γεωμετρία, υλικόΕδάφους));

    // ---------- Ουρανός: σκοτάδι με αχνή λάμψη στον ορίζοντα και αστέρια
    σκηνή.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { ...ΚΟΙΝΑ },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        precision highp float; uniform vec3 uFog; varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 col = mix(uFog, vec3(0.020, 0.030, 0.055), smoothstep(-0.05, 0.5, h));
          col += vec3(0.10, 0.055, 0.03) * exp(-abs(h) * 14.0);                      // lampsi orizonta
          vec2 g = vec2(atan(vDir.z, vDir.x) * 180.0, h * 260.0);
          float s = hash(floor(g)); col += vec3(0.8, 0.85, 1.0) * step(0.9965, s) * smoothstep(0.03, 0.25, h) * (0.4 + 0.6 * hash(floor(g) + 3.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })));

    // ---------- Δέσμες φωτός και λάμψη πάνω από τα έργα
    const υλικόΑκτίνας = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: ΚΟΙΝΑ.uTime },
      vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying float vY; void main(){ float a = pow(1.0 - vY, 2.4) * (0.8 + 0.2 * sin(uTime * 2.0)); gl_FragColor = vec4(vec3(1.0, 0.80, 0.34) * a, a); }`,
    });
    const υλικόΛάμψης = new THREE.SpriteMaterial({ map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,214,110,1)'); r.addColorStop(0.2, 'rgba(250,196,80,0.45)'); r.addColorStop(1, 'rgba(242,193,78,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const θέση = (el) => el.getAttribute('data-θέση').split(' ').map(Number);
    const έργα = [...ενότητα.querySelectorAll('.πινέζα')].map((a) => {
      const [fx, fy] = θέση(a), βάση = σε3Δ(fx, fy);
      const ακτίνα = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 8, 1, true), υλικόΑκτίνας);
      ακτίνα.position.copy(βάση).add(new THREE.Vector3(0, 1.7, 0)); σκηνή.add(ακτίνα);
      const λάμψη = new THREE.Sprite(υλικόΛάμψης); λάμψη.scale.set(2.0, 2.0, 1); λάμψη.position.copy(βάση).add(new THREE.Vector3(0, 0.06, 0)); σκηνή.add(λάμψη);
      return { a, βάση, κορυφή: βάση.clone().add(new THREE.Vector3(0, 0.25, 0)), πλευρά: a.getAttribute('data-πλευρά'), slug: a.getAttribute('href') };
    });
    const τόποι = [...ενότητα.querySelectorAll('.τόπος')].map((s) => { const [fx, fy] = θέση(s); return { s, θ: σε3Δ(fx, fy, s.dataset.είδος === 'βουνό' ? 0.5 : 0.1) }; });

    // ---------- Κάμερα: σαν από αεροπλάνο. Η κάθοδος ακολουθεί το scroll ως τη στιγμή που ο επισκέπτης πιάσει τον χάρτη
    const στόχος = σε3Δ(0.545, 0.53);
    const ΤΕΛΙΚΗ = new THREE.Vector3(στόχος.x - 15, ΚΙΝΗΤΟ ? 26 : 15, στόχος.z + (ΚΙΝΗΤΟ ? 30 : 29));
    const ΑΡΧΙΚΗ = new THREE.Vector3(στόχος.x - 2, 92, στόχος.z + 10);
    const έλεγχος = new OrbitControls(κάμερα, renderer.domElement);
    έλεγχος.enableDamping = true; έλεγχος.dampingFactor = 0.07;
    έλεγχος.enableZoom = false;                       // ο τροχός κάνει scroll στη σελίδα
    έλεγχος.enablePan = false;
    έλεγχος.enableRotate = !αφή;                      // στην αφή, το δάχτυλο κάνει scroll· οι πινέζες πατιούνται
    έλεγχος.minPolarAngle = 0.3; έλεγχος.maxPolarAngle = 1.25; έλεγχος.rotateSpeed = 0.5;
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
      ΚΟΙΝΑ.uTime.value += dt; υλικόΕδάφους.uniforms.uCam.value.copy(κάμερα.position);
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

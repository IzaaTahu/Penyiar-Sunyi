import * as THREE from "three";

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function roundedBox(w, h, d, r, mat) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.center();
  return new THREE.Mesh(geo, mat);
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class SceneRig {
  constructor(canvas, { quality = "medium" } = {}) {
    this.canvas = canvas;
    this.quality = quality;
    this.listeners = { onFader: null, onHover: null, onAction: null };
    this.hovered = null;
    this.drag = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 120);
    this.camera.position.set(0, 1.5, 2.1);
    this.baseLook = new THREE.Vector3(0, 1.0, -1.7);

    this.room = new THREE.Scene();
    this.room.background = new THREE.Color(0x0d1421);
    this.city = new THREE.Scene();
    this.city.background = new THREE.Color(0x101a2a);
    this.city.fog = new THREE.FogExp2(0x1a2740, 0.024);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.freeLook = false;
    this.look = { yaw: 0, pitch: 0 };
    this.targetLook = { yaw: 0, pitch: 0 };
    this.focus = { yaw: 0, pitch: 0 };
    this.mouse = { x: 0, y: 0 };
    this.faderValues = { music: 0.7, glass: 0.5, far: 0.4, warm: 0.5 };
    this.rainEase = 1;
    this.audioLevel = 0;
    this.flash = 0;
    this.dawn = 0;
    this.dawnCurrent = 0;
    this.onAir = false;
    this.playing = false;

    // Interaksi ruangan: lampu meja, lampu gantung, gorden.
    this.interactives = [];
    this.hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.lampOn = true;
    this.lampLevel = 1;
    this.ceilingOn = true;
    this.ceilingLevel = 1;
    this.curtainOpen = true;
    this.curtainLevel = 1;
    this.warmth = 0.5;
    this._tmpVec = new THREE.Vector3();
    this._hoverGlowTarget = 0;

    this.glassScale = 0.5;
    this.dropletCount = 300;

    this._buildRoom();
    this._buildCity();
    this._buildGlass();
    this._buildMixer();
    this._bindPointer();
    this.setQuality(quality);
    this.resize();
  }

  // ── Ruang ──────────────────────────────────────────────────────
  _buildRoom() {
    const S = this.room;
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.82, metalness: 0.02 });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x31241a, roughness: 0.78 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x252f42, roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9d968a, roughness: 0.38, metalness: 0.7 });
    const black = new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.65 });
    this.mats = { wood, darkWood, wallMat, metal, black };

    this.roomAmbient = new THREE.AmbientLight(0x5d7290, 2.6);
    S.add(this.roomAmbient);

    this.roomHemi = new THREE.HemisphereLight(0x8ba3c8, 0x33271c, 0.85);
    S.add(this.roomHemi);

    this.fillLight = new THREE.DirectionalLight(0x93add0, 1.35);
    this.fillLight.position.set(-2, 3.2, -3);
    S.add(this.fillLight);

    // Lantai
    S.add(box(6.2, 0.08, 5.2, darkWood, 0, -0.04, 0.25));
    // Permadani tipis
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshStandardMaterial({ color: 0x2a2c38, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.006, 0.6);
    S.add(rug);
    // Langit-langit
    S.add(box(6.2, 0.08, 5.2, wallMat, 0, 3.02, 0.25));
    // Dinding samping
    S.add(box(0.08, 3, 5.2, wallMat, -3.05, 1.5, 0.25));
    S.add(box(0.08, 3, 5.2, wallMat, 3.05, 1.5, 0.25));
    // Dinding belakang
    S.add(box(6.2, 3, 0.08, wallMat, 0, 1.5, 2.7));

    // Dinding depan dengan bukaan jendela (x ±1.36, y 0.95..2.42)
    S.add(box(1.65, 3, 0.08, wallMat, -2.17, 1.5, -2.02));
    S.add(box(1.65, 3, 0.08, wallMat, 2.17, 1.5, -2.02));
    S.add(box(2.72, 0.96, 0.08, wallMat, 0, 0.47, -2.02));
    S.add(box(2.72, 0.58, 0.08, wallMat, 0, 2.71, -2.02));

    // Kusen jendela
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b1a1c, roughness: 0.55, metalness: 0.35 });
    S.add(box(2.86, 0.06, 0.1, frameMat, 0, 0.95, -1.97));
    S.add(box(2.86, 0.06, 0.1, frameMat, 0, 2.42, -1.97));
    S.add(box(0.06, 1.53, 0.1, frameMat, -1.4, 1.685, -1.97));
    S.add(box(0.06, 1.53, 0.1, frameMat, 1.4, 1.685, -1.97));
    S.add(box(0.035, 1.47, 0.06, frameMat, -0.46, 1.685, -1.96));
    S.add(box(0.035, 1.47, 0.06, frameMat, 0.46, 1.685, -1.96));
    S.add(box(2.72, 0.035, 0.06, frameMat, 0, 1.7, -1.96));
    // Ambang jendela
    S.add(box(2.9, 0.07, 0.3, wood, 0, 0.94, -1.88));

    this._buildDesk();
    this._buildLamp();
    this._buildMic();
    this._buildTapeDeck();
    this._buildCRT();
    this._buildRackProp();
    this._buildMug();
    this._buildHeadphones();
    this._buildNotebook();
    this._buildOnAir();
    this._buildClock();
    this._buildCurtains();
    this._buildPendant();
    this._buildWallDecor();
    this._buildWindowLight();
    this._buildSillPlant();
    this._buildCables();
    this._buildHoverGlow();
    this._buildDust();
  }

  _buildDesk() {
    const S = this.room;
    const { wood, darkWood } = this.mats;
    S.add(box(2.75, 0.07, 1.4, wood, 0, 0.715, 0.1));
    S.add(box(0.08, 0.72, 0.08, darkWood, -1.25, 0.36, 0.72));
    S.add(box(0.08, 0.72, 0.08, darkWood, 1.25, 0.36, 0.72));
    S.add(box(2.55, 0.1, 0.9, darkWood, 0, 0.64, 0.18));
    // Laci
    S.add(box(0.62, 0.26, 0.04, darkWood, 0.78, 0.52, 0.76));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), this.mats.metal);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.78, 0.52, 0.79);
    S.add(handle);
  }

  _buildLamp() {
    const S = this.room;
    const { metal, black } = this.mats;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.035, 28), metal);
    base.position.set(1.13, 0.77, -0.16);
    S.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 8), metal);
    stem.position.set(1.13, 1.02, -0.16);
    S.add(stem);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), metal);
    arm.rotation.z = -1.05;
    arm.position.set(1.04, 1.26, -0.16);
    S.add(arm);

    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0x3a2c20,
      emissive: 0xffb35e,
      emissiveIntensity: 0.55,
      roughness: 0.5,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.19, 0.17, 28, 1, true), this.lampMat);
    shade.position.set(0.93, 1.33, -0.16);
    S.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a3 }));
    bulb.position.set(0.93, 1.27, -0.16);
    S.add(bulb);
    this.bulb = bulb;
    this.bulbOnColor = new THREE.Color(0xffd9a3);
    this.bulbOffColor = new THREE.Color(0x4a4036);

    this.lampLight = new THREE.PointLight(0xffb466, 9, 8, 2);
    this.lampLight.position.set(0.86, 1.08, 0.16);
    S.add(this.lampLight);

    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xffb96b, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.lampGlow.scale.set(1.1, 1.1, 1);
    this.lampGlow.position.set(0.93, 1.3, -0.16);
    S.add(this.lampGlow);

    this._addHitbox(0.56, 0.76, 0.46, 0.97, 1.08, -0.13, "lamp", () => this.toggleLamp(),
      () => (this.lampOn ? "Lampu meja · matikan" : "Lampu meja · nyalakan"), 0.5);
  }

  _buildMic() {
    const S = this.room;
    const { metal, black } = this.mats;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.025, 24), black);
    base.position.set(0.22, 0.755, 0.5);
    S.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), metal);
    post.position.set(0.22, 0.9, 0.5);
    S.add(post);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 8), metal);
    arm.rotation.set(0.15, 0, 1.18);
    arm.position.set(0.09, 1.05, 0.46);
    S.add(arm);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.007, 6, 20), metal);
    yoke.rotation.y = Math.PI / 2;
    yoke.position.set(-0.05, 1.06, 0.42);
    S.add(yoke);
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.13, 20), black);
    capsule.rotation.z = Math.PI / 2.25;
    capsule.position.set(-0.05, 1.06, 0.42);
    S.add(capsule);
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.35, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.0035, 5, 18), grilleMat);
      ring.rotation.set(0, Math.PI / 2, Math.PI / 2.25);
      ring.position.set(-0.05 + (i - 1) * 0.026, 1.06, 0.42);
      S.add(ring);
    }
    this.mic = capsule;
  }

  _buildTapeDeck() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(-0.56, 0.79, 0.06);
    group.rotation.x = -0.1;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x191b1f, roughness: 0.5, metalness: 0.3 });
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.42, metalness: 0.4 });
    group.add(box(0.62, 0.105, 0.4, bodyMat));
    group.add(box(0.56, 0.02, 0.36, faceMat, 0, 0.06, 0));
    // Jendela kaset
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.2, metalness: 0.5 });
    group.add(box(0.26, 0.06, 0.015, winMat, 0, 0.045, 0.195));
    const reelMat = new THREE.MeshStandardMaterial({ color: 0x39332a, roughness: 0.6 });
    this.reels = [];
    for (let i = 0; i < 2; i++) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.008, 16), reelMat);
      reel.rotation.x = Math.PI / 2;
      reel.position.set(-0.06 + i * 0.12, 0.05, 0.198);
      group.add(reel);
      this.reels.push(reel);
    }
    // Tombol
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i < 4; i++) {
      group.add(box(0.035, 0.012, 0.05, btnMat, -0.18 + i * 0.045, 0.075, -0.11));
    }
    S.add(group);
    this.tapeDeck = group;
  }

  _buildCRT() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(-0.86, 0.93, -0.24);
    group.rotation.y = 0.14;
    group.rotation.x = -0.06;
    const shell = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.55, metalness: 0.15 });
    group.add(box(0.56, 0.42, 0.34, shell));
    group.add(box(0.46, 0.32, 0.02, shell, 0, 0.01, 0.18));
    const neck = box(0.3, 0.24, 0.16, shell, 0, 0, -0.2);
    group.add(neck);

    this.crtCanvas = document.createElement("canvas");
    this.crtCanvas.width = 512;
    this.crtCanvas.height = 384;
    this.crtCtx = this.crtCanvas.getContext("2d");
    this.crtTex = new THREE.CanvasTexture(this.crtCanvas);
    this.crtTex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshBasicMaterial({ map: this.crtTex, toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.405, 0.265), screenMat);
    screen.position.set(0, 0.01, 0.195);
    group.add(screen);
    group.add(box(0.46, 0.012, 0.025, this.mats.black, 0, -0.15, 0.19));
    const spill = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0x8fd0c6, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    spill.position.set(0, 0.02, 0.34);
    spill.scale.set(0.9, 0.6, 1);
    group.add(spill);
    const crtLight = new THREE.PointLight(0x7fb8b0, 0.55, 1.5, 2);
    crtLight.position.set(0, 0.02, 0.4);
    group.add(crtLight);
    S.add(group);
    this.crtGroup = group;
    this.setScreenText(["SUNYI FM 91,7", "teman jaga"]);
  }

  setScreenText(lines) {
    if (!this.crtCtx) return;
    const c = this.crtCtx;
    const { width: w, height: h } = this.crtCanvas;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#07100d");
    g.addColorStop(1, "#04100b");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(127,184,176,0.18)";
    c.lineWidth = 2;
    c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = "#a9d7cd";
    c.font = "500 34px 'DM Sans', sans-serif";
    c.textAlign = "left";
    c.fillText(lines[0] || "", 34, 78);
    c.fillStyle = "rgba(169,215,205,0.55)";
    c.font = "400 22px 'DM Sans', sans-serif";
    if (lines[1]) c.fillText(lines[1], 34, 118);
    c.fillStyle = "rgba(169,215,205,0.35)";
    for (let i = 0; i < 9; i++) {
      c.fillRect(34, 160 + i * 18, 40 + Math.random() * 300, 2);
    }
    c.fillStyle = "rgba(169,215,205,0.7)";
    c.font = "400 16px 'DM Sans', sans-serif";
    c.fillText("91.7  ·  ON AIR", 34, h - 28);
    this.crtTex.needsUpdate = true;
  }

  _buildRackProp() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(1.16, 0.8, -0.5);
    group.rotation.y = -0.25;
    group.scale.setScalar(0.72);
    const wood = new THREE.MeshStandardMaterial({ color: 0x2b2119, roughness: 0.85 });
    group.add(box(0.52, 0.34, 0.16, wood));
    group.add(box(0.48, 0.03, 0.14, wood, 0, 0.02, 0.02));
    const palette = [0x8f7860, 0x5d7f7a, 0x9a6666, 0x827794, 0x71856f];
    for (let i = 0; i < 10; i++) {
      const row = i < 5 ? 0 : 1;
      const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: 0.8 });
      const tape = box(0.075, 0.1, 0.025, mat, -0.18 + (i % 5) * 0.09, 0.1 - row * 0.115, 0.09);
      tape.rotation.z = (Math.random() - 0.5) * 0.08;
      group.add(tape);
      const label = box(0.05, 0.03, 0.002, new THREE.MeshStandardMaterial({ color: 0xa39a88, roughness: 1 }), tape.position.x, tape.position.y + 0.02, 0.104);
      group.add(label);
    }
    S.add(group);
  }

  _buildMug() {
    const S = this.room;
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xb8a892, roughness: 0.62 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.1, 20), mugMat);
    mug.position.set(0.32, 0.82, 0.53);
    S.add(mug);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshStandardMaterial({ color: 0x1c120c, roughness: 0.25 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.set(0.32, 0.868, 0.53);
    S.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 14, Math.PI * 1.4), mugMat);
    handle.position.set(0.372, 0.822, 0.53);
    handle.rotation.y = Math.PI / 2;
    S.add(handle);

    const tex = glowTexture();
    this.steam = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xcfd6dd, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sp.position.set(0.32, 0.9 + i * 0.05, 0.53);
      sp.scale.set(0.12, 0.24, 1);
      S.add(sp);
      this.steam.push({ sp, seed: Math.random() * 10 });
    }
    this.mugSteamOn = true;
    this._addHitbox(0.2, 0.18, 0.2, 0.32, 0.84, 0.53, "mug", () => this.toggleMugSteam(),
      () => (this.mugSteamOn ? "Kopi · tiup uapnya" : "Kopi · uap hangat"), 0.22);
  }

  _buildHeadphones() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(0.92, 0.79, 0.54);
    group.rotation.y = -0.5;
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.55 });
    const pad = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.9 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 6, 24, Math.PI), mat);
    band.rotation.z = 0;
    band.position.y = 0.02;
    group.add(band);
    for (let i = 0; i < 2; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.022, 16), pad);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(-0.075 + i * 0.15, -0.02, 0);
      group.add(cup);
    }
    group.rotation.x = -Math.PI / 2;
    group.rotation.z = 0.4;
    group.position.y = 0.765;
    S.add(group);
  }

  _buildNotebook() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(-0.16, 0.762, 0.6);
    group.rotation.y = 0.16;
    const cover = new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.9 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfbe, roughness: 1 });
    group.add(box(0.27, 0.012, 0.19, pages));
    group.add(box(0.275, 0.004, 0.195, cover, 0, 0.007, 0));
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8), this.mats.metal);
    pen.rotation.z = Math.PI / 2;
    pen.rotation.y = 0.2;
    pen.position.set(0.02, 0.017, -0.005);
    group.add(pen);
    S.add(group);
  }

  _buildOnAir() {
    const S = this.room;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#140a0a";
    ctx.fillRect(0, 0, 512, 128);
    ctx.shadowColor = "#ff4d4d";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ff5a5a";
    ctx.font = "600 74px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ON AIR", 256, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.onAirMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, opacity: 0.35 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), this.onAirMat);
    sign.position.set(-2.05, 1.72, -1.975);
    S.add(sign);
    S.add(box(0.96, 0.27, 0.05, this.mats.black, -2.05, 1.72, -2.0));
    this.onAirLight = new THREE.PointLight(0xff5b5b, 0, 2.4, 2);
    this.onAirLight.position.set(-2.0, 1.6, -1.8);
    S.add(this.onAirLight);
  }

  _buildClock() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(-1.95, 2.16, -1.975);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), new THREE.MeshStandardMaterial({ color: 0x0d1118, roughness: 0.8 }));
    group.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 32), this.mats.metal);
    group.add(rim);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x9aa3b8 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.006, i % 3 === 0 ? 0.026 : 0.014), tickMat);
      tick.position.set(Math.sin(a) * 0.155, Math.cos(a) * 0.155, 0.002);
      tick.rotation.z = -a;
      group.add(tick);
    }
    this.hourHand = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.095), new THREE.MeshBasicMaterial({ color: 0xe8e0d1 }));
    this.hourHand.geometry.translate(0, 0.047, 0);
    this.hourHand.position.z = 0.006;
    group.add(this.hourHand);
    this.minuteHand = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.14), new THREE.MeshBasicMaterial({ color: 0xe8e0d1 }));
    this.minuteHand.geometry.translate(0, 0.07, 0);
    this.minuteHand.position.z = 0.008;
    group.add(this.minuteHand);
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xd98c8c }));
    pin.position.z = 0.01;
    group.add(pin);
    S.add(group);
    this.setClock("22:00");
  }

  setClock(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    if (!this.hourHand) return;
    this.hourHand.rotation.z = -((h % 12) / 12) * Math.PI * 2 - (m / 720) * Math.PI * 2;
    this.minuteHand.rotation.z = -(m / 60) * Math.PI * 2;
  }

  // ── Detail & interaksi ruangan ─────────────────────────────────
  _registerAction(obj, name, action, labelFn, glowScale = 0.45) {
    obj.userData = { type: "action", name, action, labelFn, glowScale };
    this.interactives.push(obj);
    return obj;
  }

  _addHitbox(w, h, d, x, y, z, name, action, labelFn, glowScale) {
    const hit = box(w, h, d, this.hitMat, x, y, z);
    this.room.add(hit);
    return this._registerAction(hit, name, action, labelFn, glowScale);
  }

  _buildCurtains() {
    const S = this.room;
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x453a2c, roughness: 0.45, metalness: 0.55 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.08, 12), rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 2.49, -1.9);
    S.add(rod);
    for (const x of [-1.53, 1.53]) {
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), rodMat);
      finial.position.set(x, 2.49, -1.9);
      S.add(finial);
    }
    this._registerAction(rod, "curtain", () => this.toggleCurtain(),
      () => (this.curtainOpen ? "Gorden · tutup" : "Gorden · buka"), 0.32);

    // Cincin gorden di batang.
    for (let i = 0; i < 12; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 5, 12), rodMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(-1.38 + i * 0.251, 2.49, -1.88);
      S.add(ring);
    }

    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x3b4a56, roughness: 0.98, metalness: 0, side: THREE.DoubleSide,
    });
    const panel = (side) => {
      const geo = new THREE.PlaneGeometry(1.4, 1.52, 32, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin((x + 0.7) * 46) * 0.02 + Math.sin((x + 0.7) * 19) * 0.008);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, clothMat);
      mesh.position.set(side * 0.7, 1.71, -1.9);
      S.add(mesh);
      this._registerAction(mesh, "curtain", () => this.toggleCurtain(),
        () => (this.curtainOpen ? "Gorden · tutup" : "Gorden · buka"), 0.5);
      return mesh;
    };
    this.curtainL = panel(-1);
    this.curtainR = panel(1);
  }

  _buildPendant() {
    const S = this.room;
    const x = -1.0;
    const y = 2.46;
    const z = -1.0;
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.5, metalness: 0.55 });

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.035, 16), darkMetal);
    cap.position.set(x, 2.99, z);
    S.add(cap);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.44, 6), darkMetal);
    cord.position.set(x, 2.77, z);
    S.add(cord);

    this.pendantMat = new THREE.MeshStandardMaterial({
      color: 0x3b3a3c, emissive: 0xffe6c2, emissiveIntensity: 0.25,
      roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.25, 0.19, 26, 1, true), this.pendantMat);
    shade.position.set(x, y, z);
    S.add(shade);

    this.pendantBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe8c8 }),
    );
    this.pendantBulb.position.set(x, y - 0.03, z);
    S.add(this.pendantBulb);
    this.pendantOnColor = new THREE.Color(0xffe8c8);
    this.pendantOffColor = new THREE.Color(0x4a453c);

    this.pendantLight = new THREE.PointLight(0xffd9b0, 4.2, 7, 2);
    this.pendantLight.position.set(x, y - 0.05, z);
    S.add(this.pendantLight);

    this.pendantGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xffd9a8, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.pendantGlow.scale.set(1.5, 1.5, 1);
    this.pendantGlow.position.set(x, y - 0.02, z);
    S.add(this.pendantGlow);

    this._addHitbox(0.52, 0.95, 0.5, x, y + 0.18, z, "ceiling", () => this.toggleCeiling(),
      () => (this.ceilingOn ? "Lampu gantung · matikan" : "Lampu gantung · nyalakan"), 0.55);
  }

  _buildWallDecor() {
    const S = this.room;
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#111a29");
    g.addColorStop(1, "#0b1019");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 384, 512);
    ctx.strokeStyle = "rgba(242,194,122,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 344, 472);
    ctx.fillStyle = "#f2c27a";
    ctx.beginPath();
    ctx.arc(192, 150, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111a29";
    ctx.beginPath();
    ctx.arc(216, 132, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7ddb0";
    ctx.font = "500 40px 'Lora', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("SUNYI FM", 192, 292);
    ctx.font = "500 64px 'DM Sans', sans-serif";
    ctx.fillText("91,7", 192, 372);
    ctx.fillStyle = "rgba(236,230,218,0.55)";
    ctx.font = "400 16px 'DM Sans', sans-serif";
    ctx.fillText("TEMAN JAGA", 192, 420);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    S.add(box(0.8, 1.04, 0.035, this.mats.darkWood, 2.18, 1.62, -1.995));
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.94),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }),
    );
    poster.position.set(2.18, 1.62, -1.973);
    S.add(poster);

    // Catatan kecil dan foto yang ditempel.
    const noteColors = [0xd9c9a3, 0xc7d3c4, 0xcdb9b1];
    for (let i = 0; i < 3; i++) {
      const note = new THREE.Mesh(
        new THREE.PlaneGeometry(0.17, 0.18),
        new THREE.MeshStandardMaterial({ color: noteColors[i], roughness: 1 }),
      );
      note.position.set(1.68 + i * 0.2, 0.82 + (i % 2) * 0.06, -1.976);
      note.rotation.z = (i - 1) * 0.05;
      S.add(note);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd98c8c }));
      pin.position.set(note.position.x, note.position.y + 0.07, -1.97);
      S.add(pin);
    }
  }

  _buildWindowLight() {
    const S = this.room;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(190,215,255,0.6)";
    ctx.shadowColor = "rgba(190,215,255,0.9)";
    ctx.shadowBlur = 22;
    ctx.fillRect(34, 20, 188, 216);
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(124, 20, 12, 216);
    ctx.fillRect(34, 124, 188, 12);
    ctx.globalCompositeOperation = "source-over";
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    this.windowGlowMat = new THREE.MeshBasicMaterial({
      map: tex, color: 0x9dc3ee, transparent: true, opacity: 0.2,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.9), this.windowGlowMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0, 0.012, -1.1);
    S.add(patch);
  }

  _buildSillPlant() {
    const S = this.room;
    const potMat = new THREE.MeshStandardMaterial({ color: 0x7a5138, roughness: 0.85 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.054, 0.12, 18), potMat);
    pot.position.set(1.12, 1.035, -1.8);
    S.add(pot);
    const soil = new THREE.Mesh(
      new THREE.CircleGeometry(0.062, 16),
      new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(1.12, 1.096, -1.8);
    S.add(soil);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4b6b50, roughness: 0.85 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3b523c, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 0.03 + Math.random() * 0.04;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1 + Math.random() * 0.1, 4), stemMat);
      stem.position.set(1.12 + Math.cos(a) * r * 0.4, 1.15, -1.8 + Math.sin(a) * r * 0.4);
      stem.rotation.set(Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32);
      S.add(stem);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), leafMat);
      leaf.scale.set(1.4, 0.45, 0.8);
      leaf.position.set(
        1.12 + Math.cos(a) * r,
        1.18 + Math.random() * 0.09,
        -1.8 + Math.sin(a) * r,
      );
      leaf.rotation.set(Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5);
      S.add(leaf);
    }
  }

  _buildCables() {
    const S = this.room;
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
    const addCable = (points) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      S.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.006, 5, false), cableMat));
    };
    addCable([[-0.62, 0.77, 0.18], [-0.2, 0.752, 0.3], [0.28, 0.75, 0.32], [0.55, 0.78, 0.28]]);
    addCable([[-1.0, 0.745, -0.12], [-0.62, 0.735, 0.14], [-0.1, 0.74, 0.31], [0.5, 0.78, 0.26]]);
    addCable([[1.13, 0.775, -0.2], [1.28, 0.73, -0.44], [1.44, 0.58, -0.57]]);
  }

  _buildHoverGlow() {
    this.hoverGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xffd7a0, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    }));
    this.hoverGlow.renderOrder = 10;
    this.hoverGlow.position.set(0, -5, 0);
    this.hoverGlow.scale.set(0.5, 0.5, 1);
    this.room.add(this.hoverGlow);
  }

  _buildDust() {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this.dustSeed = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -0.2 + Math.random() * 1.5;
      pos[i * 3 + 1] = 0.9 + Math.random() * 1.3;
      pos[i * 3 + 2] = -1.2 + Math.random() * 1.6;
      this.dustSeed.push(Math.random() * Math.PI * 2);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd9a8, size: 0.0028, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.room.add(this.dust);
    this.dustPos = pos;
  }

  // ── Kota ───────────────────────────────────────────────────────
  _buildCity() {
    const S = this.city;
    const skyGeo = new THREE.PlaneGeometry(160, 70);
    this.skyMat = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x16233a) },
        uHorizon: { value: new THREE.Color(0x3c4c66) },
        uGlow: { value: new THREE.Color(0x7a5f42) },
        uCloud: { value: new THREE.Color(0x5a6b84) },
        uFlash: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow; uniform vec3 uCloud;
        uniform float uFlash; uniform float uTime;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        void main(){
          float h = smoothstep(0.0, 1.0, vUv.y);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.75));
          float glow = smoothstep(0.55, 0.0, vUv.y) * smoothstep(0.0, 1.0, vUv.x) * smoothstep(1.0, 0.0, vUv.x);
          col += uGlow * glow * 0.55;
          float n = vnoise(vUv * vec2(6.0, 3.5) + vec2(uTime * 0.006, 0.0));
          n = n * 0.62 + vnoise(vUv * vec2(13.0, 7.5) - vec2(uTime * 0.01, 0.0)) * 0.38;
          float cloud = smoothstep(0.42, 0.76, n) * smoothstep(0.04, 0.5, vUv.y);
          col = mix(col, uCloud, cloud * 0.62);
          col += vec3(0.16, 0.2, 0.32) * uFlash;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(skyGeo, this.skyMat);
    sky.position.set(0, 8, -58);
    S.add(sky);

    // Bangunan
    const count = 46;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const col = new THREE.Color();
    const windows = [];
    const bldgs = [];
    for (let i = 0; i < count; i++) {
      const w = 1.6 + Math.random() * 4.4;
      const h = 3 + Math.random() * 15;
      const d = 1.6 + Math.random() * 3;
      const x = -34 + Math.random() * 68;
      const z = -10 - Math.random() * 38;
      const y = h / 2 - 1.5;
      scale.set(w, h, d);
      m.compose(new THREE.Vector3(x, y, z), q, scale);
      inst.setMatrixAt(i, m);
      const shade = 0.07 + Math.random() * 0.06;
      col.setRGB(shade * 0.76, shade * 0.9, shade * 1.28);
      inst.setColorAt(i, col);
      bldgs.push({ x, y, z, w, h, d });
      const cols = Math.floor(w / 0.42);
      const rows = Math.floor(h / 0.48);
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if (Math.random() > 0.42) continue;
          const wx = x - w / 2 + 0.28 + cx * 0.42;
          const wy = y - h / 2 + 0.34 + cy * 0.48;
          windows.push({ x: wx, y: wy, z: z + d / 2 + 0.012, warm: Math.random() < 0.72 });
        }
      }
    }
    inst.instanceColor.needsUpdate = true;
    S.add(inst);

    const winGeo = new THREE.PlaneGeometry(0.11, 0.075);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 });
    const winInst = new THREE.InstancedMesh(winGeo, winMat, windows.length);
    const wm = new THREE.Matrix4();
    windows.forEach((win, i) => {
      wm.makeTranslation(win.x, win.y, win.z);
      winInst.setMatrixAt(i, wm);
      if (win.warm) col.setHex(Math.random() < 0.15 ? 0xff9d5e : 0xffc57a);
      else col.setHex(0x86a9c9);
      col.multiplyScalar(0.35 + Math.random() * 0.65);
      winInst.setColorAt(i, col);
    });
    winInst.instanceColor.needsUpdate = true;
    S.add(winInst);

    // Lampu jalan & kendaraan
    const lampPositions = [];
    const lampColors = [];
    for (let i = 0; i < 26; i++) {
      lampPositions.push(-22 + Math.random() * 44, 1.1 + Math.random() * 0.6, -8 - Math.random() * 22);
      const c = new THREE.Color(Math.random() < 0.7 ? 0xffb15e : 0xffd7a1);
      lampColors.push(c.r, c.g, c.b);
    }
    const lampGeo = new THREE.BufferGeometry();
    lampGeo.setAttribute("position", new THREE.Float32BufferAttribute(lampPositions, 3));
    lampGeo.setAttribute("color", new THREE.Float32BufferAttribute(lampColors, 3));
    this.lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({
      map: glowTexture(), size: 0.42, transparent: true, opacity: 0.75, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.lamps);

    const carPos = [];
    const carCol = [];
    this.cars = [];
    for (let i = 0; i < 8; i++) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.cars.push({ x: -20 + Math.random() * 40, z: -7 - Math.random() * 12, speed: (0.35 + Math.random() * 0.8) * dir, color: dir > 0 ? 0xff4a3d : 0xffe2b0 });
      carPos.push(0, 0, 0);
      const c = new THREE.Color(dir > 0 ? 0xff5a48 : 0xffe9c4);
      carCol.push(c.r, c.g, c.b);
    }
    const carGeo = new THREE.BufferGeometry();
    carGeo.setAttribute("position", new THREE.Float32BufferAttribute(carPos, 3));
    carGeo.setAttribute("color", new THREE.Float32BufferAttribute(carCol, 3));
    this.carPoints = new THREE.Points(carGeo, new THREE.PointsMaterial({
      map: glowTexture(), size: 0.2, transparent: true, opacity: 0.9, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.carPoints);

    // Hujan di luar
    const N = 1500;
    const pos = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -26 + Math.random() * 52;
      pos[i * 3 + 1] = Math.random() * 22 - 1;
      pos[i * 3 + 2] = -3.5 - Math.random() * 30;
      speed[i] = 7 + Math.random() * 9;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    rainGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    this.rainMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uEase: { value: 1 } },
      vertexShader: `
        attribute float aSpeed; uniform float uTime; varying float vAlpha;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime * aSpeed, 22.0) - 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(7.0 * (18.0 / -mv.z), 0.5, 6.0);
          vAlpha = clamp(12.0 / -mv.z, 0.06, 0.34);
        }`,
      fragmentShader: `
        varying float vAlpha; uniform float uEase;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.0, abs(c.x) * 8.0) * smoothstep(0.5, 0.1, abs(c.y));
          gl_FragColor = vec4(vec3(0.62, 0.72, 0.86), a * vAlpha * 0.35 * uEase);
          #include <colorspace_fragment>
        }`,
    });
    this.outsideRain = new THREE.Points(rainGeo, this.rainMat);
    S.add(this.outsideRain);

    this.cityAmbient = new THREE.AmbientLight(0x7d93b4, 1.8);
    S.add(this.cityAmbient);
    const cityFill = new THREE.DirectionalLight(0x9ab4da, 1.05);
    cityFill.position.set(-4, 6, 2);
    S.add(cityFill);

    this.flashLight = new THREE.AmbientLight(0xbcd0ff, 0);
    S.add(this.flashLight);
  }

  _buildGlass() {
    this.glassRT = new THREE.WebGLRenderTarget(512, 288, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.glassMat = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: {
        tScene: { value: this.glassRT.texture },
        uResolution: { value: new THREE.Vector2(512, 288) },
        uTexel: { value: new THREE.Vector2(1 / 512, 1 / 288) },
        uTime: { value: 0 },
        uRain: { value: 0.5 },
        uEase: { value: 1 },
        uTint: { value: new THREE.Color(0xe8f0ff) },
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tScene;
        uniform vec2 uResolution;
        uniform vec2 uTexel;
        uniform float uTime, uRain, uEase;
        uniform vec3 uTint;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p){
          float s = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; }
          return s;
        }
        vec3 samp(vec2 uv){
          vec2 px = 1.15 * uTexel;
          vec3 c = texture2D(tScene, uv).rgb * 0.2;
          c += texture2D(tScene, uv + vec2(px.x, 0.0)).rgb * 0.1;
          c += texture2D(tScene, uv - vec2(px.x, 0.0)).rgb * 0.1;
          c += texture2D(tScene, uv + vec2(0.0, px.y)).rgb * 0.1;
          c += texture2D(tScene, uv - vec2(0.0, px.y)).rgb * 0.1;
          c += texture2D(tScene, uv + px).rgb * 0.1;
          c += texture2D(tScene, uv - px).rgb * 0.1;
          c += texture2D(tScene, uv + vec2(px.x, -px.y)).rgb * 0.1;
          c += texture2D(tScene, uv + vec2(-px.x, px.y)).rgb * 0.1;
          return c;
        }

        void main(){
          vec2 suv = gl_FragCoord.xy / uResolution;
          float aspect = uResolution.x / uResolution.y;
          vec2 p = vec2(suv.x * aspect, suv.y);
          float rain = uRain * (0.45 + 0.55 * uEase);
          vec2 off = vec2(0.0);
          float dropMask = 0.0;
          float rimMask = 0.0;
          float specMask = 0.0;

          for (int i = 0; i < 3; i++){
            float fi = float(i);
            float scale = 34.0 + fi * 28.0;
            vec2 g = p * scale;
            g.y -= uTime * (0.03 + fi * 0.03) * scale;
            vec2 id = floor(g);
            vec2 f = fract(g) - 0.5;
            vec2 rnd = hash2(id + fi * 23.0);
            float cluster = smoothstep(0.34, 0.72, noise(p * 3.2 + fi * 5.0));
            float isActive = step(0.84 - rain * 0.17, rnd.x) * smoothstep(0.12, 0.58, cluster);
            float r = 0.06 + 0.34 * rnd.y * rnd.y;
            vec2 c = (rnd - 0.5) * 0.62;
            float d = length((f - c) * vec2(1.0, 0.88 + rnd.x * 0.24));
            float drop = smoothstep(r, r * 0.22, d) * isActive;
            drop *= 0.15 + 0.85 * rain;
            vec2 dir = normalize(f - c + 0.0001);
            off += dir * drop * (0.02 / (fi + 1.0));
            dropMask = max(dropMask, drop);
            float ring = smoothstep(r * 0.5, r * 0.82, d) * (1.0 - smoothstep(r * 0.82, r, d)) * isActive;
            rimMask = max(rimMask, ring);
            float spec = ring * smoothstep(-0.2, 0.8, dir.x * 0.7 - dir.y * 0.7);
            specMask = max(specMask, spec);
          }

          // Jejak embun yang turun
          float col = floor(p.x * 42.0);
          float colRnd = hash(vec2(col, 7.3));
          float trailNoise = fbm(vec2(p.x * 70.0, p.y * 2.6 - uTime * 0.3));
          float trail = smoothstep(0.7, 0.97, trailNoise) * step(0.66, colRnd) * rain;
          off.x += (trailNoise - 0.5) * 0.008 * trail;
          off.y += 0.003 * trail;

          float fog = fbm(p * 7.0 + vec2(0.0, uTime * 0.004));
          float cond = smoothstep(0.68, 0.99, fog) * (0.05 + 0.09 * rain);

          vec3 colr = samp(clamp(suv + off, 0.001, 0.999));
          colr = mix(colr, colr * 0.82 + vec3(0.03, 0.042, 0.06), cond);
          colr *= 1.0 - dropMask * 0.09;
          colr += rimMask * 0.012;
          colr += specMask * vec3(0.5, 0.58, 0.7) * 0.1;
          colr += dropMask * 0.008;
          colr += trail * 0.012;
          colr = mix(colr, colr * uTint, 0.3);
          colr *= 1.0 - uEase * 0.0;

          // Tepi kaca
          vec2 e = smoothstep(0.0, 0.035, vUv) * smoothstep(0.0, 0.035, 1.0 - vUv);
          float edge = 1.0 - e.x * e.y;
          colr *= 1.0 - edge * 0.55;

          gl_FragColor = vec4(colr, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.72, 1.47), this.glassMat);
    glass.position.set(0, 1.685, -1.995);
    this.room.add(glass);
    this.glass = glass;
  }

  // ── Mixer ──────────────────────────────────────────────────────
  _buildMixer() {
    const S = this.room;
    const group = new THREE.Group();
    group.position.set(0.58, 0.79, 0.13);
    group.rotation.x = -0.24;
    const body = roundedBox(0.66, 0.045, 0.36, 0.02, new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.55, metalness: 0.35 }));
    group.add(body);
    const top = roundedBox(0.62, 0.006, 0.32, 0.015, new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.5, metalness: 0.4 }));
    top.position.y = 0.024;
    group.add(top);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 0.45, metalness: 0.35 });
    this.handles = [];
    this.slots = {};
    const xs = [-0.2, -0.065, 0.07];
    const names = ["music", "glass", "far"];
    xs.forEach((x, i) => {
      const slot = box(0.018, 0.004, 0.19, slotMat, x, 0.03, 0.02);
      group.add(slot);
      const handle = box(0.042, 0.024, 0.035, handleMat, x, 0.043, 0.02);
      handle.userData = { type: "fader", name: names[i] };
      group.add(handle);
      this.handles.push(handle);
      this.slots[names[i]] = { x, minZ: -0.075, maxZ: 0.115, handle };
      // garis skala
      for (let k = 0; k < 5; k++) {
        const tick = box(0.03, 0.001, 0.003, new THREE.MeshBasicMaterial({ color: 0x565b63 }), x, 0.03, -0.075 + k * 0.047);
        group.add(tick);
      }
    });

    // Knob hangat
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.031, 0.028, 20),
      new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.5, metalness: 0.5 }),
    );
    knob.position.set(0.22, 0.037, 0.035);
    knob.rotation.x = Math.PI / 2;
    knob.userData = { type: "knob", name: "warm" };
    group.add(knob);
    this.handles.push(knob);
    this.knob = knob;
    const marker = box(0.008, 0.004, 0.026, new THREE.MeshBasicMaterial({ color: 0xf2c27a }), 0.22, 0.046, 0.035);
    marker.position.y = 0.05;
    group.add(marker);
    this.knobMarker = marker;

    // LED VU
    this.leds = [];
    const ledGeo = new THREE.BoxGeometry(0.008, 0.004, 0.008);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i < 4 ? 0x7fb8b0 : i < 5 ? 0xf2c27a : 0xd98c8c });
      const led = new THREE.Mesh(ledGeo, mat);
      led.position.set(-0.29 + i * 0.014, 0.03, -0.14);
      group.add(led);
      this.leds.push(led);
    }
    // Label kecil
    const labelMat = new THREE.MeshBasicMaterial({ color: 0x6e7686 });
    group.add(box(0.06, 0.0015, 0.01, labelMat, -0.2, 0.031, -0.16));
    group.add(box(0.06, 0.0015, 0.01, labelMat, -0.065, 0.031, -0.16));
    group.add(box(0.06, 0.0015, 0.01, labelMat, 0.07, 0.031, -0.16));
    group.add(box(0.03, 0.0015, 0.01, labelMat, 0.22, 0.031, 0.09));

    S.add(group);
    this.mixer = group;
    this._applyFaderVisuals();
  }

  _applyFaderVisuals() {
    for (const name of ["music", "glass", "far"]) {
      const slot = this.slots[name];
      const v = this.faderValues[name];
      slot.handle.position.z = slot.minZ + (slot.maxZ - slot.minZ) * v;
    }
    const w = this.faderValues.warm;
    this.knob.rotation.z = -Math.PI * 0.75 + w * Math.PI * 1.5;
    this.knobMarker.position.x = 0.22 - Math.sin(Math.PI * 0.75 - w * Math.PI * 1.5) * 0.018;
    this.knobMarker.position.z = 0.035 + Math.cos(Math.PI * 0.75 - w * Math.PI * 1.5) * 0.018;
  }

  setFaderValue(name, value) {
    this.faderValues[name] = clamp(value, 0, 1);
    if (name === "warm") this.setWarmth(value);
    this._applyFaderVisuals();
  }

  setOnAir(on) {
    this.onAir = on;
    if (!this.onAirMat) return;
    this.onAirMat.opacity = on ? 1 : 0.3;
    this.onAirLight.intensity = on ? 0.9 : 0;
  }

  setPlaying(on) {
    this.playing = on;
  }

  setAudioLevel(level) {
    this.audioLevel += (clamp(level, 0, 1) - this.audioLevel) * 0.2;
  }

  setWarmth(value) {
    this.warmth = clamp(value, 0, 1);
    if (!this.lampLight) return;
    const warm = new THREE.Color(0xff9a4a);
    const cool = new THREE.Color(0xffd2a0);
    this.lampLight.color.copy(warm).lerp(cool, this.warmth);
    this.lampMat.emissive.copy(warm).lerp(cool, this.warmth);
  }

  toggleLamp() {
    this.lampOn = !this.lampOn;
    this.listeners.onAction?.("lamp", this.lampOn ? "Lampu meja menyala" : "Lampu meja dimatikan");
  }

  toggleCeiling() {
    this.ceilingOn = !this.ceilingOn;
    this.listeners.onAction?.("ceiling", this.ceilingOn ? "Lampu gantung menyala" : "Lampu gantung dimatikan");
  }

  toggleCurtain() {
    this.curtainOpen = !this.curtainOpen;
    this.listeners.onAction?.("curtain", this.curtainOpen ? "Gorden dibuka" : "Gorden ditutup");
  }

  toggleMugSteam() {
    this.mugSteamOn = !this.mugSteamOn;
    this.listeners.onAction?.("mug", this.mugSteamOn ? "Kopi masih hangat." : "Uapnya hilang.");
  }

  setRainEase(value) {
    this.rainEase = clamp(value, 0.35, 1);
  }

  setLookMode(free) {
    this.freeLook = free;
    if (!free) {
      this.targetLook.yaw = 0;
      this.targetLook.pitch = 0;
    }
  }

  setFocus(yawDeg = 0, pitchDeg = 0) {
    this.focus.yaw = yawDeg * DEG;
    this.focus.pitch = pitchDeg * DEG;
  }

  setDawn(progress) {
    if (!Number.isFinite(progress)) progress = 0;
    this.dawn = clamp(progress, 0, 1);
    const p = this.dawn;
    const top = new THREE.Color(0x16233a).lerp(new THREE.Color(0x3b4f73), p);
    const horizon = new THREE.Color(0x3c4c66).lerp(new THREE.Color(0xa27f6f), p);
    const glow = new THREE.Color(0x7a5f42).lerp(new THREE.Color(0xe0aa74), p);
    this.skyMat.uniforms.uTop.value.copy(top);
    this.skyMat.uniforms.uHorizon.value.copy(horizon);
    this.skyMat.uniforms.uGlow.value.copy(glow);
    this.skyMat.uniforms.uCloud.value.copy(new THREE.Color(0x5a6b84).lerp(new THREE.Color(0xb09086), p));
    this.city.fog.color.copy(new THREE.Color(0x1a2740).lerp(new THREE.Color(0x5a5a66), p));
    this.fillLight.intensity = 0.65 + p * 1.5;
    this.fillLight.color.setHex(0x8fa9cf).lerp(new THREE.Color(0xc4b09a), p);
    this.roomAmbient.intensity = 2.6 + p * 0.8;
    this.roomHemi.intensity = 0.85 + p * 0.45;
    this.cityAmbient.intensity = 1.8 + p * 0.5;
    if (this.windowGlowMat) {
      this.windowGlowMat.color.copy(new THREE.Color(0x9dc3ee).lerp(new THREE.Color(0xffd0a4), p));
    }
  }

  setQuality(quality) {
    this.quality = quality;
    const dpr = window.devicePixelRatio || 1;
    if (quality === "low") {
      this.renderer.setPixelRatio(1);
      this.glassScale = 0.25;
      this.dropletCount = 150;
    } else if (quality === "high") {
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.glassScale = 0.75;
      this.dropletCount = 500;
    } else {
      this.renderer.setPixelRatio(Math.min(dpr, 1.25));
      this.glassScale = 0.5;
      this.dropletCount = 300;
    }
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    this.glassMat.uniforms.uResolution.value.set(size.x, size.y);
    const rw = Math.max(160, Math.floor(size.x * this.glassScale));
    const rh = Math.max(90, Math.floor(size.y * this.glassScale));
    this.glassRT.setSize(rw, rh);
    this.glassMat.uniforms.uTexel.value.set(1 / rw, 1 / rh);
  }

  // ── Input ──────────────────────────────────────────────────────
  _bindPointer() {
    const el = this.canvas;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._lookDrag = null;

    el.addEventListener("contextmenu", (e) => e.preventDefault());

    el.addEventListener("pointermove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (this.drag) {
        const d = (this.drag.startY - e.clientY) / window.innerHeight;
        const value = clamp(this.drag.startValue + d * 2.2, 0, 1);
        this.setFaderValue(this.drag.name, value);
        this.listeners.onFader?.(this.drag.name, value);
        return;
      }
      if (this._lookDrag) {
        const dx = e.clientX - this._lookDrag.x;
        const dy = e.clientY - this._lookDrag.y;
        this._lookDrag.x = e.clientX;
        this._lookDrag.y = e.clientY;
        this.targetLook.yaw = clamp(this.targetLook.yaw + dx * 0.0032, -70 * DEG, 70 * DEG);
        this.targetLook.pitch = clamp(this.targetLook.pitch - dy * 0.0026, -25 * DEG, 20 * DEG);
        return;
      }
      this._hoverTest(e.clientX, e.clientY);
    });

    el.addEventListener("pointerdown", (e) => {
      if (e.button === 2 && this.freeLook) {
        this._lookDrag = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      this._hoverTest(e.clientX, e.clientY);
      if (this.hovered) {
        const data = this.hovered.userData;
        if (data.type === "action") {
          data.action?.();
          this.listeners.onHover?.(data.name, e.clientX, e.clientY, null, data.labelFn?.());
          return;
        }
        this.drag = {
          name: data.name,
          startY: e.clientY,
          startValue: this.faderValues[data.name],
        };
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
    });

    const end = () => {
      this.drag = null;
      this._lookDrag = null;
      el.style.cursor = "default";
      this._hoverTest(this.mouse.x * window.innerWidth * 0.5 + window.innerWidth * 0.5, -this.mouse.y * window.innerHeight * 0.5 + window.innerHeight * 0.5);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  _hoverTest(clientX, clientY) {
    if (!this.handles) return;
    this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = this.handles.concat(this.interactives);
    const hit = this.raycaster.intersectObjects(objects, false)[0];
    const obj = hit ? hit.object : null;
    if (obj !== this.hovered) {
      this.hovered = obj;
      if (obj) {
        const data = obj.userData;
        this.canvas.style.cursor = "pointer";
        if (data.type === "action") {
          this.hoverGlow.position.copy(obj.getWorldPosition(this._tmpVec));
          this.hoverGlow.scale.setScalar(data.glowScale ?? 0.45);
          this._hoverGlowTarget = 0.3;
          this.listeners.onHover?.(data.name, clientX, clientY, null, data.labelFn?.());
        } else {
          this._hoverGlowTarget = 0;
          this.listeners.onHover?.(data.name, clientX, clientY, this.faderValues[data.name]);
        }
      } else {
        this._hoverGlowTarget = 0;
        this.canvas.style.cursor = this.freeLook ? "grab" : "default";
        this.listeners.onHover?.(null);
      }
    }
  }

  // ── Update & render ────────────────────────────────────────────
  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed;

    // Kamera
    const parallaxYaw = this.freeLook ? 0 : this.mouse.x * 6 * DEG;
    const parallaxPitch = this.freeLook ? 0 : this.mouse.y * 4 * DEG;
    const wantedYaw = this.focus.yaw + this.targetLook.yaw + parallaxYaw;
    const wantedPitch = this.focus.pitch + this.targetLook.pitch + parallaxPitch;
    const damp = this.freeLook ? 1 - Math.pow(0.0001, dt) : 1 - Math.pow(0.02, dt);
    this.look.yaw = lerp(this.look.yaw, clamp(wantedYaw, -72 * DEG, 72 * DEG), damp);
    this.look.pitch = lerp(this.look.pitch, clamp(wantedPitch, -26 * DEG, 21 * DEG), damp);
    this.camera.rotation.set(this.look.pitch, this.look.yaw, 0, "YXZ");

    // Kilat
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.4);
      const f = this.flash * this.flash;
      this.skyMat.uniforms.uFlash.value = f * (this.reduceMotion ? 0.25 : 1);
      this.flashLight.intensity = f * 1.6;
    } else {
      this.skyMat.uniforms.uFlash.value = 0;
      this.flashLight.intensity = 0;
    }

    // Hujan
    this.skyMat.uniforms.uTime.value = t;
    this.rainMat.uniforms.uTime.value = t;
    this.rainMat.uniforms.uEase.value = this.rainEase;
    this.glassMat.uniforms.uTime.value = t;
    this.glassMat.uniforms.uRain.value = this.faderValues.glass;
    this.glassMat.uniforms.uEase.value = this.rainEase;
    this.glassMat.uniforms.uTint.value.setHex(this.dawn > 0.4 ? 0xffd9bf : 0xe8f0ff);

    // Kota bergerak pelan
    const carPos = this.carPoints.geometry.attributes.position;
    this.cars.forEach((car, i) => {
      car.x += car.speed * dt;
      if (car.x > 26) car.x = -26;
      if (car.x < -26) car.x = 26;
      carPos.setXYZ(i, car.x, 1.05, car.z);
    });
    carPos.needsUpdate = true;

    // Uap cangkir
    if (this.mugSteamOn && !this.reduceMotion) {
      for (let i = 0; i < this.steam.length; i++) {
        const s = this.steam[i];
        const phase = (t * 0.16 + s.seed) % 1;
        s.sp.position.y = 0.88 + phase * 0.32;
        s.sp.position.x = 0.32 + Math.sin(t * 0.5 + s.seed) * 0.018 + phase * 0.02;
        s.sp.material.opacity = 0.09 * (1 - phase);
        s.sp.scale.set(0.09 + phase * 0.1, 0.16 + phase * 0.2, 1);
      }
    } else {
      for (const s of this.steam) s.sp.material.opacity = this.mugSteamOn ? 0.09 : 0;
    }

    // Debu
    if (!this.reduceMotion) {
      for (let i = 0; i < this.dustSeed.length; i++) {
        const pos = this.dustPos;
        pos[i * 3 + 1] += Math.sin(t * 0.3 + this.dustSeed[i]) * 0.0004;
        pos[i * 3] += Math.cos(t * 0.22 + this.dustSeed[i]) * 0.0003;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

    // Reel berputar
    if (this.playing) {
      this.reels.forEach((r, i) => (r.rotation.z += dt * (i === 0 ? 0.9 : 0.7)));
    }

    // LED VU
    if (this.leds) {
      const level = clamp(this.audioLevel * 1.35 + 0.05 + this.faderValues.music * 0.06, 0, 1);
      this.leds.forEach((led, i) => {
        const on = level * 6 > i + 0.2;
        led.material.opacity = on ? 1 : 0.14;
        led.material.transparent = true;
      });
    }

    // Lampu meja, lampu gantung, gorden
    const lightEase = 1 - Math.pow(0.0006, dt);
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * lightEase;
    const breath = this.reduceMotion ? 1 : 1 + Math.sin(t * 0.55) * 0.03;
    this.lampLight.intensity = (7.2 + this.warmth * 3.4) * this.lampLevel * breath;
    this.lampMat.emissiveIntensity = (1.0 + this.warmth * 0.4) * (0.1 + 0.9 * this.lampLevel);
    this.lampGlow.material.opacity = 0.4 * this.lampLevel;
    this.bulb.material.color.copy(this.bulbOffColor).lerp(this.bulbOnColor, this.lampLevel);
    this.dust.material.opacity = 0.18 + 0.2 * this.lampLevel;

    this.ceilingLevel += ((this.ceilingOn ? 1 : 0) - this.ceilingLevel) * lightEase;
    const pendantBreath = this.reduceMotion ? 1 : 0.97 + Math.sin(t * 0.4) * 0.03;
    this.pendantLight.intensity = 3.4 * this.ceilingLevel * pendantBreath;
    this.pendantMat.emissiveIntensity = 0.2 + 1.1 * this.ceilingLevel;
    this.pendantGlow.material.opacity = 0.32 * this.ceilingLevel;
    this.pendantBulb.material.color.copy(this.pendantOffColor).lerp(this.pendantOnColor, this.ceilingLevel);

    this.curtainLevel += ((this.curtainOpen ? 1 : 0) - this.curtainLevel) * (1 - Math.pow(0.02, dt));
    const ck = this.curtainLevel;
    this.curtainL.position.x = -(0.7 + 0.54 * ck);
    this.curtainR.position.x = 0.7 + 0.54 * ck;
    this.curtainL.scale.x = this.curtainR.scale.x = 1 - 0.82 * ck;
    if (this.windowGlowMat) {
      this.windowGlowMat.opacity = (0.17 + this.dawn * 0.1) * (0.08 + 0.92 * (1 - ck));
    }

    this.hoverGlow.material.opacity += (this._hoverGlowTarget - this.hoverGlow.material.opacity) * Math.min(1, dt * 8);

    // Audio kamera
    if (this._onCamera) {
      this._onCamera(this.look.yaw / DEG, this.look.pitch / DEG, this.camera);
    }
  }

  flashLightning() {
    this.flash = 1;
  }

  onCamera(cb) {
    this._onCamera = cb;
  }

  render() {
    const exposure = this.renderer.toneMappingExposure;
    this.renderer.toneMappingExposure = 1.95;
    this.renderer.setRenderTarget(this.glassRT);
    this.renderer.render(this.city, this.camera);
    this.renderer.toneMappingExposure = exposure;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.room, this.camera);
  }
}

import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// GRENIER DOGON — LOGIQUE SPA V4 (Three.js)
// ============================================

const BASE_URL = import.meta.env.BASE_URL;

const STEPS = [
  {
    id: 1,
    label: "Étape 1 : Le Banco",
    title: "Le Banco",
    badge: "ÉTAPE 01",
    text: "Les artisans préparent un mortier de terre crue et de paille hachée. La paille est essentielle : elle sert de liant pour éviter que la terre ne se fissure en séchant au soleil ardent de la falaise.",
    tags: ["Terre & Paille", "Liant naturel"],
    model: `${BASE_URL}1_banco.glb`
  },
  {
    id: 2,
    label: "Étape 2 : Les Fondations",
    title: "Les Fondations",
    badge: "ÉTAPE 02",
    text: "Le grenier ne touche jamais le sol directement. Il est surélevé sur des pierres soigneusement choisies pour protéger les récoltes des remontées d'humidité et des attaques des termites.",
    tags: ["Pierres locales", "Protection récolte"],
    model: `${BASE_URL}2_fondations.glb`
  },
  {
    id: 3,
    label: "Étape 3 : Les Murs",
    title: "L'Élévation des Murs",
    badge: "ÉTAPE 03",
    text: "Le maçon monte les murs par couches successives appelées 'assises'. Chaque niveau sèche au soleil avant le suivant. Ces murs épais de banco maintiennent les grains au frais toute l'année.",
    tags: ["Banco par couches", "Isolation naturelle"],
    model: `${BASE_URL}3_murs.glb`
  },
  {
    id: 4,
    label: "Étape 4 : Le Toit de Chaume",
    title: "Le Toit de Chaume",
    badge: "ÉTAPE 04",
    text: "Cette structure conique en branches et paille tressée protège l'édifice. Véritable parapluie, ce toit pointu empêche les pluies torrentielles de dissoudre les murs en terre crue pendant l'hivernage.",
    tags: ["Chaume tressé", "Protection pluie"],
    model: `${BASE_URL}4_toit.glb`
  }
];

// --- REFS DOM ---
const introScreen      = document.getElementById('intro-screen');
const experienceScreen = document.getElementById('experience-screen');
const btnStart         = document.getElementById('btn-start');
const btnPrev          = document.getElementById('btn-prev');
const btnNext          = document.getElementById('btn-next');
const threeContainer   = document.getElementById('three-container');
const viewerOverlay    = document.getElementById('viewer-overlay');
const stepNumEl        = document.getElementById('step-num');
const progressFill     = document.getElementById('progress-fill');
const stepLabel        = document.getElementById('step-label');
const headerDots       = document.getElementById('nav-dots');
const navCenterDots    = document.getElementById('nav-center-dots');
const infoBadge        = document.getElementById('info-badge');
const infoTitle        = document.getElementById('info-title');
const infoText         = document.getElementById('info-text');
const infoCard         = document.getElementById('info-card');
const btnArCard        = document.getElementById('btn-ar-card');
const btnReplay        = document.getElementById('btn-replay');
const hiddenViewer     = document.getElementById('dogon-viewer'); // Pour l'AR
const btnArViewer      = document.getElementById('btn-ar-viewer'); // Bouton AR sur le viewer

let currentIndex = 0;
let isTransitioning = false;

// Variables pour l'animation de reconstitution holographique
let isRebuilding = false;
let rebuildStartTime = 0;
const rebuildDuration = 6000; // 6 secondes — reconstitution dramatique et lente
let modelMinY = 0;
let modelMaxY = 0;
let activeClipPlane = null;
let scanRing = null;

// Éléments du HUD pour mise à jour télémétrique
const hudCoords = document.getElementById('hud-coords');
const hudRotation = document.getElementById('hud-rotation');
const hudZoom = document.getElementById('hud-zoom');
const hudRebuildStatus = document.getElementById('hud-rebuild-status');

// ============================================
// THREE.JS SETUP
// ============================================
const scene = new THREE.Scene();

// Utiliser des dimensions par défaut si le conteneur est masqué au chargement
const initWidth = threeContainer.clientWidth || window.innerWidth || 800;
const initHeight = threeContainer.clientHeight || window.innerHeight || 600;

const camera = new THREE.PerspectiveCamera(45, initWidth / initHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(initWidth, initHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true; // Activer le clipping local pour la reconstitution
threeContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5; // Vitesse lente (équivalent à ~2deg/sec)
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 15;

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Le groupe principal qui contient le modèle et la plateforme
const mainGroup = new THREE.Group();
scene.add(mainGroup);

// ============================================
// ANNEAU DE BALAYAGE 3D (RECONSTITUTION)
// ============================================
function createScanRing() {
  const ringGeo = new THREE.RingGeometry(1.6, 1.8, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xF9D58B,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  scanRing = new THREE.Mesh(ringGeo, ringMat);
  scanRing.rotation.x = -Math.PI / 2;
  scanRing.visible = false;
  scene.add(scanRing);
}
createScanRing();

// ============================================
// CRÉATION DE LA TEXTURE PROCÉDURALE DE TERRE BANCO
// ============================================
function createBancoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Couleur de terre banco argileuse chaude de base
  ctx.fillStyle = '#8a6448';
  ctx.fillRect(0, 0, 256, 256);
  
  // Grains de paille et imperfections de terre séchée
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 1.5 + 0.5;
    
    const r = Math.random();
    if (r < 0.4) {
      ctx.fillStyle = 'rgba(235, 195, 140, 0.2)'; // Brins de paille dorés
    } else if (r < 0.75) {
      ctx.fillStyle = 'rgba(75, 45, 30, 0.35)'; // Particules de terre sombre
    } else {
      ctx.fillStyle = 'rgba(255, 245, 230, 0.15)'; // Grains de sable clair
    }
    ctx.fillRect(x, y, size, size);
  }
  
  // Lignes pour simuler les fibres de paille tressées dans le banco
  ctx.strokeStyle = 'rgba(235, 195, 140, 0.25)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = Math.random() * 12 + 4;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// ============================================
// PLATEFORME 3D (TERRE BANCO ARGIL & POUSSIÈRE)
// ============================================
function createSmokePlatform() {
  const platformGroup = new THREE.Group();
  
  const bancoTex = createBancoTexture();
  
  // Base en terre banco solide avec relief (bumpMap)
  const geometry = new THREE.CylinderGeometry(2, 2, 0.2, 32);
  const material = new THREE.MeshStandardMaterial({
    map: bancoTex,
    roughness: 0.95,
    metalness: 0.05,
    bumpMap: bancoTex,
    bumpScale: 0.08
  });
  const base = new THREE.Mesh(geometry, material);
  base.position.y = -0.1;
  platformGroup.add(base);

  // Anneaux de poussière banco tourbillonnante
  for(let i=0; i<3; i++) {
    const ringGeo = new THREE.RingGeometry(1.5 + i*0.3, 2.5 + i*0.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8a6448, // Poussière banco argileuse
      transparent: true,
      opacity: 0.22 - (i*0.06),
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.05 + (i*0.02);
    platformGroup.add(ring);
  }

  platformGroup.position.y = -0.5; // Ajuster selon la hauteur des modèles
  mainGroup.add(platformGroup);
}
createSmokePlatform();

// Nettoyage sûr des matériaux/textures/géométries pour éviter les fuites mémoire
function disposeMaterial(material) {
  if (!material) return;
  try {
    if (material.map) {
      material.map.dispose();
    }
    if (material.normalMap) {
      material.normalMap.dispose();
    }
    if (material.bumpMap) {
      material.bumpMap.dispose();
    }
    if (material.alphaMap) {
      material.alphaMap.dispose();
    }
    if (material.dispose) material.dispose();
  } catch (e) {
    console.warn('Erreur lors de la libération d\'un material :', e);
  }
}

function disposeModel(object) {
  if (!object) return;
  object.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => disposeMaterial(m));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

let audioCtx = null;

// ============================================
// BRUITAGE SYNTHÉTISEUR HOLOGRAPHIQUE MULTICOUCHE
// ============================================
function playHologramSound(durationMs) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const duration = durationMs / 1000;
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.7, now + 0.3);
    master.gain.setValueAtTime(0.7, now + duration - 0.8);
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);
    master.connect(audioCtx.destination);

    // === COUCHE 1 : Pulsation basse profonde (grondement de construction) ===
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    const bassFilter = audioCtx.createBiquadFilter();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(55, now);
    bassOsc.frequency.linearRampToValueAtTime(90, now + duration * 0.8);
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    bassGain.gain.value = 0.35;
    // Modulation LFO lente (battement solennel)
    const bassLFO = audioCtx.createOscillator();
    const bassLFOGain = audioCtx.createGain();
    bassLFO.frequency.value = 2.5;
    bassLFOGain.gain.value = 18;
    bassLFO.connect(bassLFOGain);
    bassLFOGain.connect(bassOsc.frequency);
    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(master);
    bassOsc.start(now);
    bassLFO.start(now);
    bassOsc.stop(now + duration);
    bassLFO.stop(now + duration);

    // === COUCHE 2 : Balayage futuriste montant (fréquence laser holographique) ===
    const sweepOsc = audioCtx.createOscillator();
    const sweepGain = audioCtx.createGain();
    const sweepFilter = audioCtx.createBiquadFilter();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(120, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(880, now + duration * 0.75);
    sweepOsc.frequency.exponentialRampToValueAtTime(280, now + duration);
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(400, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.65);
    sweepFilter.Q.value = 3;
    sweepGain.gain.value = 0.18;
    // LFO rapide (vibration haute fréquence = texture holographique)
    const sweepLFO = audioCtx.createOscillator();
    const sweepLFOGain = audioCtx.createGain();
    sweepLFO.type = 'sine';
    sweepLFO.frequency.setValueAtTime(8, now);
    sweepLFO.frequency.linearRampToValueAtTime(22, now + duration);
    sweepLFOGain.gain.value = 30;
    sweepLFO.connect(sweepLFOGain);
    sweepLFOGain.connect(sweepOsc.frequency);
    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(master);
    sweepOsc.start(now);
    sweepLFO.start(now);
    sweepOsc.stop(now + duration);
    sweepLFO.stop(now + duration);

    // === COUCHE 3 : Harmonique cristalline haute (texture métallique/scintillement) ===
    const crystalOsc = audioCtx.createOscillator();
    const crystalGain = audioCtx.createGain();
    const crystalFilter = audioCtx.createBiquadFilter();
    crystalOsc.type = 'triangle';
    crystalOsc.frequency.setValueAtTime(1200, now);
    crystalOsc.frequency.exponentialRampToValueAtTime(3400, now + duration * 0.5);
    crystalOsc.frequency.exponentialRampToValueAtTime(900, now + duration);
    crystalFilter.type = 'highpass';
    crystalFilter.frequency.value = 800;
    crystalGain.gain.setValueAtTime(0, now);
    crystalGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
    crystalGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    crystalOsc.connect(crystalFilter);
    crystalFilter.connect(crystalGain);
    crystalGain.connect(master);
    crystalOsc.start(now + 0.2);
    crystalOsc.stop(now + duration);

    // === COUCHE 4 : Bip final de validation (à la fin de la reconstitution) ===
    const pingOsc = audioCtx.createOscillator();
    const pingGain = audioCtx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.value = 1760;
    pingGain.gain.setValueAtTime(0, now + duration - 0.15);
    pingGain.gain.linearRampToValueAtTime(0.4, now + duration - 0.05);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.3);
    pingOsc.connect(pingGain);
    pingGain.connect(audioCtx.destination);
    pingOsc.start(now + duration - 0.15);
    pingOsc.stop(now + duration + 0.35);

  } catch (e) {
    console.warn("AudioContext non pris en charge ou bloqué par le navigateur :", e);
  }
}

// ============================================
// DÉCLENCHER L'ANIMATION DE RECONSTITUTION
// ============================================
function startRebuildAnimation() {
  if (!currentModel) return;
  
  const box = new THREE.Box3().setFromObject(currentModel);
  modelMinY = box.min.y;
  modelMaxY = box.max.y;
  
  // Plan de coupe pointant vers le bas. Tout ce qui a Y > constant est coupé au départ.
  activeClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), modelMinY);
  
  currentModel.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.clippingPlanes = [activeClipPlane];
      child.material.clipShadows = true;
      child.material.side = THREE.DoubleSide;
    }
  });
  
  isRebuilding = true;
  rebuildStartTime = performance.now();
  
  // Son désactivé à la demande de l'utilisateur
  // playHologramSound(rebuildDuration);
  
  if (scanRing) {
    scanRing.visible = true;
    scanRing.position.y = modelMinY;
    scanRing.scale.set(1, 1, 1);
    scanRing.material.opacity = 0.8;
  }
  
  if (hudRebuildStatus) {
    hudRebuildStatus.textContent = "BUILDING...";
    hudRebuildStatus.className = "hud-value status-pulsing";
  }
}

// Loader GLTF
const gltfLoader = new GLTFLoader();
let currentModel = null;
let mixer = null;
const clock = new THREE.Clock();

function loadModel(url, callback) {
  if (currentModel) {
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }
    // Dispose resources to avoid memory leaks
    disposeModel(currentModel);
    mainGroup.remove(currentModel);
    currentModel = null;
  }
  
  gltfLoader.load(
    url,
    (gltf) => {
      currentModel = gltf.scene;
      
      // Centrer et redimensionner le modèle automatiquement
      const box = new THREE.Box3().setFromObject(currentModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // Eviter division par zéro si le modèle est vide
      const scale = maxDim > 0 ? 3 / maxDim : 1; // Normaliser la taille
      currentModel.scale.set(scale, scale, scale);
      
      // Positionner le modèle pour qu'il repose sur la plateforme (y = -0.5)
      currentModel.position.sub(center.multiplyScalar(scale));
      currentModel.position.y += (size.y * scale) / 2 - 0.5;

      // Initialiser et jouer l'animation si elle existe
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(currentModel);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }

      mainGroup.add(currentModel);
      
      startRebuildAnimation(); // Démarrer l'effet de reconstitution
      
      if (callback) callback();
    },
    undefined,
    (error) => {
      console.error("Erreur de chargement du modèle 3D :", error);
      if (callback) callback();
    }
  );
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }
  controls.update();
  
  // Mettre à jour les données télémétriques du HUD
  if (hudCoords) {
    hudCoords.textContent = `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;
  }
  
  if (hudRotation) {
    const angleRad = Math.atan2(camera.position.x, camera.position.z);
    let angleDeg = angleRad * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;
    hudRotation.textContent = `${angleDeg.toFixed(1)}°`;
  }
  
  if (hudZoom) {
    const dist = camera.position.distanceTo(controls.target);
    const zoomFactor = (8.0 / dist).toFixed(1);
    hudZoom.textContent = `${zoomFactor}x`;
  }
  
  // Gérer l'animation du plan de coupe pour la reconstitution
  if (isRebuilding) {
    const elapsed = performance.now() - rebuildStartTime;
    const progress = Math.min(elapsed / rebuildDuration, 1);
    
    // Easing out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentY = modelMinY + (modelMaxY - modelMinY) * ease;
    
    if (activeClipPlane) {
      activeClipPlane.constant = currentY;
    }
    
    if (scanRing) {
      scanRing.position.y = currentY;
      scanRing.material.opacity = (1 - progress) * 0.9;
      const s = 1.0 + Math.sin(progress * Math.PI) * 0.15;
      scanRing.scale.set(s, s, s);
    }
    
    if (progress >= 1) {
      isRebuilding = false;
      if (scanRing) scanRing.visible = false;
      
      // Désactiver le clipping
      if (currentModel) {
        currentModel.traverse((child) => {
          if (child.isMesh) {
            child.material.clippingPlanes = [];
          }
        });
      }
      
      if (hudRebuildStatus) {
        hudRebuildStatus.textContent = "STABLE";
        hudRebuildStatus.className = "hud-value status-ok";
      }
    }
  }
  
  renderer.render(scene, camera);
}
animate();

// Redimensionnement
window.addEventListener('resize', () => {
  if(!threeContainer.clientWidth) return;
  camera.aspect = threeContainer.clientWidth / threeContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
});


// ============================================
// DOTS DE NAVIGATION
// ============================================
function buildDots() {
  [headerDots, navCenterDots].forEach(container => {
    if (!container) return;
    container.innerHTML = '';
    const isHeader = container === headerDots;
    STEPS.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = `${isHeader ? 'h-dot' : 'nav-dot'}${i === 0 ? ' active' : ''}`;
      d.addEventListener('click', () => { if (!isTransitioning) goToStep(i); });
      container.appendChild(d);
    });
  });
}

// ============================================
// MISE À JOUR DE LA BULLE INFO
// ============================================
function updateInfoCard(step) {
  if (!infoCard) return;

  // Retirer la classe pour réinitialiser l'animation
  infoCard.classList.remove('step-animating');
  // Forcer le reflow navigateur (nécessaire pour relancer l'animation CSS)
  void infoCard.offsetWidth;
  // Déclencher l'animation de glissement
  infoCard.classList.add('step-animating');

  // Nettoyer la classe après la fin de l'animation (600ms couvre tous les delays)
  clearTimeout(updateInfoCard._cleanTimer);
  updateInfoCard._cleanTimer = setTimeout(() => {
    infoCard.classList.remove('step-animating');
  }, 900);

  if (infoBadge) infoBadge.textContent = step.badge;
  if (infoTitle) infoTitle.textContent = step.title;
  if (infoText) infoText.textContent  = step.text;
  const footer = infoCard.querySelector('.info-icon-row');
  if (footer) {
    footer.innerHTML = step.tags.map((tag, i) =>
      `<div class="info-icon-item">
        <span class="icon-dot${i === 1 ? ' gold-dot' : ''}"></span>
        <span>${tag}</span>
      </div>`
    ).join('');
  }
}

// ============================================
// CHANGER D'ÉTAPE AVEC TRANSITION
// ============================================
function goToStep(index) {
  if (isTransitioning || index === currentIndex) return;
  isTransitioning = true;

  // Fondu entrant
  viewerOverlay.classList.add('active');
  infoCard.classList.add('fade-out');

  setTimeout(() => {
    currentIndex = index;
    const step = STEPS[index];

    // Header
    stepNumEl.textContent = String(step.id).padStart(2, '0');
    stepLabel.textContent = step.label;
    progressFill.style.width = `${((index + 1) / STEPS.length) * 100}%`;

    // Mettre à jour le model-viewer caché pour l'AR
    if (hiddenViewer) hiddenViewer.src = step.model;

    // Charger le modèle 3D
    loadModel(step.model, () => {
      // Quand c'est chargé, on enlève l'overlay
      viewerOverlay.classList.remove('active');
      isTransitioning = false;
    });

    // Bulle info
    infoCard.classList.remove('fade-out');
    updateInfoCard(step);

    // Dots
    document.querySelectorAll('.h-dot').forEach((d, i) =>
      d.classList.toggle('active', i === index));
    document.querySelectorAll('.nav-dot').forEach((d, i) =>
      d.classList.toggle('active', i === index));

    // État des boutons
    updateNavButtons(index);

    // Fallback sécurisé
    setTimeout(() => {
      viewerOverlay.classList.remove('active');
      isTransitioning = false;
    }, 5000);

  }, 350);
}

// ============================================
// ÉTAT DES BOUTONS DE NAVIGATION
// ============================================
function updateNavButtons(index) {
  const isFirst = index === 0;
  const isLast  = index === STEPS.length - 1;

  btnPrev.disabled = isFirst;
  btnNext.disabled = isLast;
  btnPrev.style.opacity = isFirst ? '0.2' : '1';
  btnNext.style.opacity = isLast  ? '0.2' : '1';
  btnPrev.style.pointerEvents = isFirst ? 'none' : 'auto';
  btnNext.style.pointerEvents = isLast  ? 'none' : 'auto';
}

// ============================================
// BOUTON AR : déclenche l'AR du model-viewer caché
// ============================================
if (btnArCard) {
  btnArCard.addEventListener('click', () => {
    if (hiddenViewer && typeof hiddenViewer.activateAR === 'function') {
      hiddenViewer.activateAR();
    } else {
      console.warn('activateAR non disponible sur le model-viewer');
    }
  });
}

// Événement pour le nouveau bouton AR flottant sur le viewer
if (btnArViewer) {
  btnArViewer.addEventListener('click', () => {
    if (hiddenViewer && typeof hiddenViewer.activateAR === 'function') {
      hiddenViewer.activateAR();
    } else {
      console.warn('activateAR non disponible sur le model-viewer');
    }
  });
}

// ============================================
// DÉMARRER L'EXPÉRIENCE
// ============================================
function startExperience() {
  // Pré-initialiser AudioContext sur interaction utilisateur (requis par Chrome)
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) { /* silencieux */ }

  introScreen.style.transition = 'opacity 0.5s ease';
  introScreen.style.opacity = '0';

  setTimeout(() => {
    introScreen.classList.add('hidden');
    experienceScreen.classList.remove('hidden');
    experienceScreen.style.opacity = '0';
    experienceScreen.style.transition = 'opacity 0.6s ease';

    // Double rAF : 1er frame = layout calculé, 2ème = rendu effectif
    // Ceci corrige le bug Chrome où clientWidth est encore 0 au premier frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        experienceScreen.style.opacity = '1';

        const w = threeContainer.clientWidth || window.innerWidth || 800;
        const h = threeContainer.clientHeight || window.innerHeight || 600;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);

        const step = STEPS[0];
        currentIndex = 0;
        if (stepNumEl) stepNumEl.textContent = '01';
        if (stepLabel) stepLabel.textContent = step.label;
        if (progressFill) progressFill.style.width = '25%';

        if (hiddenViewer) hiddenViewer.src = step.model;
        loadModel(step.model);

        updateInfoCard(step);
        updateNavButtons(0);
      });
    });
  }, 500);
}

// ============================================
// EVENTS
// ============================================
if (btnStart) btnStart.addEventListener('click', startExperience);
if (btnNext) btnNext.addEventListener('click', () => { if (currentIndex < STEPS.length - 1) goToStep(currentIndex + 1); });
if (btnPrev) btnPrev.addEventListener('click', () => { if (currentIndex > 0) goToStep(currentIndex - 1); });
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    if (!isRebuilding && !isTransitioning) {
      startRebuildAnimation();
    }
  });
}

// ============================================
// INIT
// ============================================
buildDots();
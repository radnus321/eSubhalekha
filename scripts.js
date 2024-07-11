import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { gsap } from 'gsap';
import { add } from 'three/examples/jsm/nodes/Nodes.js';

let loadedModel = null;
let bfly = null;
let mixerMap = new Map();
let mixer, mixer2;
let closeButton = null;
const overlayContainer = document.getElementById('overlay-content');
let currentFrame = 0;

function toggleOverlayVisibility() {
  if (renderer.xr.getSession()) {
    overlayContainer.style.display = 'block';
  } else {
    overlayContainer.style.display = 'none';
  }
}


const applyVideoTexture = (mesh) => {
  const video = document.getElementById('video');
  video.setAttribute('playsinline', 'true');
  video.muted = false;
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide});
  mesh.material = material;
}

const loadModels = () => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  const bflyLoader = new GLTFLoader()
  bflyLoader.setDRACOLoader(dracoLoader)
  
  let isLoaded = false;
  const loadModel = async () => {
    return new Promise((resolve, reject) => {
      bflyLoader.load('/models/butterflies.glb',(gltf)=>{
        bfly = gltf.scene;
        bfly.scale.set(0.3, 0.3, 0.3);
        bfly.rotation.set(0, Math.PI, 0);
        bfly.position.set(0, 0, -3);
        scene.add(bfly);
        mixer2 = new THREE.AnimationMixer(bfly);
        mixerMap.set(mixer2, true);
        gltf.scene.traverse(function(child){
          child.castShadow = true;
          child.receiveShadow = true;
        })
        gltf.animations.forEach((clip)=>{
          const action = mixer2.clipAction(clip) 
          action.play();     
        });
        isLoaded = true;
        resolve();
      });
    });
  };
  
  const loadChest = async () => {
    return new Promise((resolve, reject) => {
      gltfLoader.load('/models/hologram.glb', (gltf) => {
        document.body.classList.add('ar')
        loadedModel = gltf.scene;
        loadedModel.scale.set(0.8, 0.8, 0.8);
        loadedModel.rotation.set(0, 0, 0);
        loadedModel.position.set(0, -1.92, -1.2);
        loadedModel.castShadow = true;
        loadedModel.receiveShadow = true;
        scene.add(loadedModel);
        document.body.classList.add('stabilized')
        document.body.classList.remove('ar')
        loadedModel.name = "chest";
        mixer = new THREE.AnimationMixer(loadedModel);
        mixerMap.set(mixer, true);
        gltf.scene.traverse(function(child){
          console.log(child)
          child.castShadow = true;
          // child.receiveShadow = true;
          if(child.name == "ProjectionPlane"){
            applyVideoTexture(child);
            child.y = -1 * child.y;
          }
        })
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce);
          action.setEffectiveTimeScale(0.5);
          action.clampWhenFinished = true;
          action.play();
        });
        isLoaded = true;
        resolve();
      });
    });
  };
  
  loadModel().then(() => loadChest().then(() => startAnimation()));
};

const startAnimation = () => {
  animate();
}


const unpauseAnimation = () => {
  console.log("unpausing animation");
  const overlayContainer = document.getElementById('overlay-content');
  const unPauseButton = document.createElement('button');
  unPauseButton.textContent = 'Reveal the secret!';
  unPauseButton.style.marginBottom = '80px';
  unPauseButton.style.backgroundColor = '#f0d637';
  unPauseButton.style.borderRadius = '20px';
  unPauseButton.style.fontWeight = 'bold';
  unPauseButton.style.fontSize = '25px';
  unPauseButton.style.fontFamily = 'Comic Sans MS, cursive';
  unPauseButton.style.animation = 'pulse 2s infinite';  

  unPauseButton.addEventListener('click', () => {
    console.log('Unpause button clicked');
    mixer.timeScale = 1;
    mixerMap.set(mixer, true);
    unPauseButton.remove();
  });

  overlayContainer.appendChild(unPauseButton);
};



async function animate() {
  currentFrame++;
  if(currentFrame === 300){
    console.log("mixer is paused!")
    mixerMap.set(mixer, false);
    unpauseAnimation();
  }
  if(currentFrame === 450){
    loadVideo();
    video.play();    
  }
  if(mixer && mixerMap.get(mixer)) mixer.update(0.05);
  if(mixer2 && mixerMap.get(mixer2)) mixer2.update(0.05);
  // console.log("current mixer2 is: "+mixer2+" mixerMap2 is: "+mixerMap.get(mixer2));
  requestAnimationFrame(animate);
  return currentFrame;
}

const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);
const pointLight = new THREE.PointLight(0xffffff, 500);
pointLight.position.set(3, 5, 5);
pointLight.lookAt(0, -2, -2);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 2048;
pointLight.shadow.mapSize.height = 2048;
scene.add(pointLight);

let reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 0, 0);
const listener = new THREE.AudioListener();
camera.add(listener);
scene.add(camera);

const addShadowPlane = () => {
  const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.25 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  plane.position.x = 0;
  plane.position.z = 0;
  plane.receiveShadow = true;
  scene.add(plane);
}

addShadowPlane();

const ambience = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
const loadAudio = () => {
  audioLoader.load('/sounds/outside-amb.mp3', function(buffer) {
    ambience.setBuffer(buffer);
    ambience.setLoop(true);
    ambience.setVolume(0.3);
    ambience.play();
  });
}

const loadVideo = () => {
  const ele = document.querySelector('#video');
  ele.innerHTML = '<source src="/videos/wedding-video-flipped.mp4" type="video/mp4">';
}


const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.domElement.addEventListener('touchmove', (event) => {
  if (event.touches.length >= 2) {
      event.preventDefault();
  }
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.physicallyCorrectLights = true;

document.body.appendChild(renderer.domElement);
const button = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: document.getElementById('overlay-content'),visible:true } });
button.style.backgroundColor = "#f0d637";
button.style.borderRadius = '20px';
button.style.fontWeight = 'bold';
button.style.fontSize = '20px';
button.style.fontFamily = 'Comic Sans MS, cursive';
button.style.color = 'black';
button.style.animation = 'pulse 2s infinite';
document.body.appendChild(button);

button.addEventListener('click', () => {
  loadModels();
  loadAudio();
  closeButton = document.querySelector('.close-button');
  closeButton.addEventListener('click', () => {
    console.log("close button clicked")
    if (renderer.xr.getSession()) {
      renderer.xr.getSession().end();
    }
    if (loadedModel) {
      console.log("removing loaded model")
      scene.remove(loadedModel);
      loadedModel = null;
    }
    
    if (bfly) {
      console.log("removing butterflies")
      scene.remove(bfly);
      bfly = null;
    }
});
});


toggleOverlayVisibility();
renderer.xr.addEventListener('sessionstart', toggleOverlayVisibility);
renderer.xr.addEventListener('sessionend', toggleOverlayVisibility);
let controller = renderer.xr.getController(0);
controller.addEventListener('selectstart', onSelect);
scene.add(controller);

function onSelect() {
  if (reticle.visible && loadedModel) {
    console.log("on select");
  }
}

renderer.setAnimationLoop(render);

function render() {
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(window.devicePixelRatio);
});
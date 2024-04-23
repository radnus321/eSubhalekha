import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

let loadedModel = null;
let bfly = null;
// let hitTestSource = null;
// let hitTestSourceRequested = false;
// let hitPosition = new THREE.Vector3();

let mixer, mixer2;
let animationPaused = false;
let pauseTimeout;
let unPauseButton = null;
let closeButton = null;
const overlayContainer = document.getElementById('overlay-content');

function toggleOverlayVisibility() {
  if (renderer.xr.getSession()) {
    overlayContainer.style.display = 'block';
  } else {
    overlayContainer.style.display = 'none';
  }
}

const loadMainModel = () => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  const bflyLoader = new GLTFLoader()
  bflyLoader.setDRACOLoader(dracoLoader)
  bflyLoader.load('/models/butterflies.glb',(gltf)=>{
    bfly = gltf.scene;
    bfly.scale.set(0.3, 0.3, 0.3);
    bfly.rotation.set(0, Math.PI, 0);
    bfly.position.set(0, -2, -3);
    scene.add(bfly);
    mixer2 = new THREE.AnimationMixer(bfly);
    gltf.animations.forEach((clip)=>{
      const action = mixer2.clipAction(clip) 
      action.play();     
    })
  })
  gltfLoader.load('/models/chest-2.glb', (gltf) => {
    document.body.classList.add('ar')
    loadedModel = gltf.scene;
    loadedModel.scale.set(0.3, 0.3, 0.3);
    loadedModel.rotation.set(0, Math.PI, 0);
    loadedModel.position.set(0, -2, -3);
    loadedModel.castShadow = true;
    loadedModel.receiveShadow = true;
    scene.add(loadedModel);
    document.body.classList.add('stabilized')
    document.body.classList.remove('ar')
    loadedModel.name = "chest";
    mixer = new THREE.AnimationMixer(loadedModel);
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.setEffectiveTimeScale(0.5);
      action.clampWhenFinished = true;
      action.play();

      setTimeout(() => {
        pauseAnimation();
      }, 6100);
      setTimeout(() => {
        document.querySelector('.overlay-container').innerHTML = `<button class="open-chest-button">OpenChest</button>`
        unpauseAnimation();
      }, 6100);
    });
  });
};

const pauseAnimation = () => {
  if (!animationPaused) {
    mixer.timeScale = 0;
    animationPaused = true;
  }
};

const unpauseAnimation = () => {
  console.log(animationPaused)
  if (animationPaused) {
    console.log("unpausing animation")
    unPauseButton = document.getElementById('overlay-content').querySelector('.open-chest-button');
    unPauseButton.top = "500px"
    unPauseButton.style.backgroundColor = "#f0d637";
    unPauseButton.style.borderRadius = '20px';
    unPauseButton.style.fontWeight = 'bold';
    unPauseButton.style.fontSize = '20px';
    unPauseButton.style.fontFamily = 'Comic Sans MS, cursive';
    unPauseButton.animation = 'pulse 2s infinite';  
    console.log(unPauseButton)
    unPauseButton.addEventListener('click',()=>{
      console.log("click was registered") 
      mixer.timeScale = 1;
      animationPaused = false;
      unPauseButton.remove();
      clearTimeout(pauseTimeout);
    })
  }
};

async function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(0.05);
  if(mixer2) mixer2.update(0.05)
  renderer.render(scene, camera);
}

const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);
const pointLight = new THREE.PointLight(0xffffff, 1000);
pointLight.position.set(5, 5, 5);
pointLight.lookAt(0, 0, -2);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;
pointLight.shadow.bias = -0.001;
scene.add(pointLight);

let reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
);
// reticle.name = "reticle";
// reticle.visible = false;
// reticle.matrixAutoUpdate = false;
// scene.add(reticle);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 0, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
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
  loadMainModel(); 
  const planeGeometry = new THREE.PlaneGeometry(100,100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, opacity: 0.1 });
planeMaterial.colorWrite = false
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.set(0,-10,0)
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane); 
  animate();
closeButton = document.querySelector('.close-button');
closeButton.addEventListener('click', () => {
  if (renderer.xr.getSession()) {
    renderer.xr.getSession().end();
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

function render(timestamp, frame) {
  // if (frame) {
  //   const referenceSpace = renderer.xr.getReferenceSpace();
  //   const session = renderer.xr.getSession();

  //   if (hitTestSourceRequested === false) {
  //     session.requestReferenceSpace('viewer').then((referenceSpace) => {
  //       session.requestHitTestSource({ space: referenceSpace }).then((source) => hitTestSource = source);
  //     });
  //     hitTestSourceRequested = true;

  //     session.addEventListener('end', () => {
  //       hitTestSourceRequested = false;
  //       hitTestSource = null;
  //     });
  //   }

  //   if (hitTestSource) {
  //     const hitTestResults = frame.getHitTestResults(hitTestSource);
  //     if (hitTestResults.length) {
  //       const hit = hitTestResults[0];
  //       reticle.visible = true;
  //       reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
  //       const hitMatrix = new THREE.Matrix4().fromArray(hit.getPose(referenceSpace).transform.matrix);
  //       hitPosition.setFromMatrixPosition(hitMatrix);
  //     } else {
  //       reticle.visible = false;
  //     }
  //   }
  // }
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
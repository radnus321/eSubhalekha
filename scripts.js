import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let loadedModel = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let hitPosition = new THREE.Vector3();

let mixer;
const loadMainModel = () => {
  const gltfLoader2 = new GLTFLoader();
  gltfLoader2.load('/models/envelope.glb', (gltf) => {
    loadedModel = gltf.scene;
    loadedModel.scale.set(0.3, 0.3, 0.3);
    loadedModel.position.set(0, 0, -2);
    scene.add(loadedModel);
    loadedModel.name = "envelope";
    mixer = new THREE.AnimationMixer(loadedModel);
    gltf.animations.forEach((clip) => {
      const actions = mixer.clipAction(clip);
      actions.setLoop(THREE.LoopOnce);
      actions.clampWhenFinished = true;
      mixer.clipAction(clip).play();
    });
  });
};

async function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(0.05);
  renderer.render(scene, camera);
}

const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const light = new THREE.AmbientLight(0xffffff, 5);
scene.add(light);
const pointLight = new THREE.PointLight(0xffffff, 1000);
pointLight.position.set(5, 5, 5);
pointLight.lookAt(0, 0, -2);
scene.add(pointLight);

let reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
);
reticle.name = "reticle";
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle);

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

document.body.appendChild(renderer.domElement);
const button = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
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
  setTimeout(() => {
    animate();
  }, 2000);
});

let controller = renderer.xr.getController(0);
controller.addEventListener('selectstart', onSelect);
scene.add(controller);

function onSelect() {
  if (reticle.visible && loadedModel) {
    const model = loadedModel.clone();
    model.position.copy(hitPosition);
    model.position.y += 2;
    model.position.x += 1;
    model.position.multiplyScalar(40);
    model.name = "loadedModel";
    model.position.z -= 35;
    scene.add(model);
    model.lookAt(camera.position);
    model.rotateX(Math.PI / 2 + Math.PI / 6);
  }
}

renderer.setAnimationLoop(render);

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => hitTestSource = source);
      });
      hitTestSourceRequested = true;

      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
        const hitMatrix = new THREE.Matrix4().fromArray(hit.getPose(referenceSpace).transform.matrix);
        hitPosition.setFromMatrixPosition(hitMatrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  scene.children.forEach((object) => {
    if (object.name === "loadedModel") {
      if (object.position.y > -40) {
        object.position.y -= 5;
      } else {
        object.position.y = -40;
        scene.remove(object);
      }
    }
  });
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

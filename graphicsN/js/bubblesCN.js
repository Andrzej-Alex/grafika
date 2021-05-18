/***********
 * bubblesAN.js
 * M. Laszlo
 * February 2021
 ***********/



import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

 

let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();


// materials by maximum level
let maxLevel = 20;
let maxN = 800;
let materials = [];
let bubbles = [];
let bubblesRoot;


let sphereGeom = new THREE.SphereGeometry(1, 24, 24);

function createScene() {
    initMaterials();
    bubblesRoot = makeBubbles(lastN, lastAN);
    scene.add(bubblesRoot);

    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000 );
    light2.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}



function initMaterials() {
    for (let i = 0; i <= maxLevel; i++) {
        let matArgs = {shininess: 80, transparent: false, opacity: 1.0, side: THREE.FrontSide};
        materials.push(new THREE.MeshPhongMaterial(matArgs));
    }
    materials[0].side = THREE.FrontSide;
    materials[0].transparent = true;
    materials[0].opacity = 1.0;
}



function makeBubbles(n, an) {
    // n is number of bubbles
    // an defines creation shell:
    //  if 0 < an < 1, shell is [an, 1] and bubbles are inside unit sphere
    //  if 1 < an, shell is [1, an] and bubbles are outside unit sphere
    let root = new THREE.Object3D();
    let bubble = new THREE.Mesh(sphereGeom, materials[0]);
    bubble.userData.level = 0;
    root.add(bubble);
    // bubbles.push(bubble); // don't push main bubble
    for (let i = 0; i < n; i++) {
        bubble = makeOneBubble(an, bubbles);
        root.add(bubble);
        bubbles.push(bubble);
    }
    return root;
}

function makeOneBubble(an, bubbles) {
    let radCap, levelOfClosestSphere;
    let r, p;
    let clear = false;
    while (!clear) {
        clear = true;
        // maximum radius of new bubble
        radCap = Number.MAX_VALUE;
        levelOfClosestSphere = 0;
        if (an < 1) { // inside bubble
            r = MyUtils.getRandomFloat(an, 1);
            p = MyUtils.getRandomPointOnSphere(r);
            radCap = 1 - r;
        } else { // outside bubble
            r = MyUtils.getRandomFloat(1, an);
            p = MyUtils.getRandomPointOnSphere(r);
            radCap = r - 1;
        }
        // p and r are position and radius of proposed bubble
        for (let b of bubbles) {
            // position and radius of bubble b
            let pos = b.position;
            let rad = b.scale.x;
            let distanceTo = p.distanceTo(pos);
            if (distanceTo <= rad) { // p lies inside bubble b
                clear = false;
                break;
            } else {
                r = distanceTo - rad;
                if (r < radCap) {
                    radCap = r;
                    levelOfClosestSphere = b.userData.level;
                }
            }
        }
    }
    let oneBubbleLevel = Math.min(levelOfClosestSphere + 1, maxLevel);
    let oneBubble = new THREE.Mesh(sphereGeom, materials[oneBubbleLevel]);
    oneBubble.userData.level = oneBubbleLevel;
    oneBubble.position.copy(p);
    oneBubble.scale.set(radCap, radCap, radCap);
    return oneBubble;
}



let lastN = 10;
let lastAN = 1.2;


let controls = new function() {
    this.n = lastN;
    this.an = lastAN;
    this.root = true;
    this.color = '#3366ff';
    this.randomColors = false;
    this.Randomize = genRandomColors;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'n', 0, maxN).step(1).onChange(updateN);
    gui.add(controls, 'an', 0.5, 5).name('shell').step(0.05).onChange(update);
    gui.add(controls, 'root').name('show root').onChange(function (flag) {
        if (flag) materials[0].opacity = 1.0;
        else materials[0].opacity = 0.4;
    });
    gui.addColor(controls, 'color');
    gui.add(controls, 'randomColors').onChange(genColors);
    gui.add(controls, 'Randomize');
}

function updateN() {
    let newN = controls.n;
    let an = controls.an;
    if (newN > lastN) {
        let delta = newN - lastN;
        for (let i = 0; i < delta; i++) {
            let bubble = makeOneBubble(an, bubbles);
            bubblesRoot.add(bubble);
            bubbles.push(bubble);
        }
    } else if (newN < lastN) {
        let delta = lastN - newN;
        for (let i = 0; i < delta; i++) {
            bubblesRoot.remove(bubbles.pop());
        }
    }
    lastN = newN;
}

function update() {
    let n = controls.n;
    let an = controls.an;
    if (an == lastAN) return;
    if (an == 1) an = 1.01;
    if (bubblesRoot)
        scene.remove(bubblesRoot);
    bubbles = [];
    bubblesRoot = makeBubbles(n, an);
    scene.add(bubblesRoot);
}

function genColors(flag) {
    if (flag) {
        genRandomColors();
    } else {
        let color = new THREE.Color(controls.color);
        // let opacity = controls.opacity;
        for (let mat of materials) {
            mat.color = color;
            // mat.opacity = opacity
        }
    }
}

let lightGray = new THREE.Color(0.8, 0.8, 0.8);

function genRandomColors() {
    if (controls.randomColors) {
        for (let mat of materials) 
            mat.color = MyUtils.getRandomColor(0.5, 0.4, 0.6);
        materials[0].color = lightGray;
    }
}

// last color assigned by color controller
let lastColor = null;




function render() {
    let delta = clock.getDelta();
    cameraControls.update(delta);
    if ((lastColor !== controls.color) && !controls.randomColors) {
        let color = new THREE.Color(controls.color);
        for (let mat of materials)
            mat.color = color;
        lastColor = controls.color;
    }
    renderer.render(scene, camera);
}



function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(function () {
        render();
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 1, 4);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.02;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}




init();
createScene();
initGui();
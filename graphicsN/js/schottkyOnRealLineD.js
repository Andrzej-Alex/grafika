/***********
 * schottkyOnRealLineD.js
 * based on loxydromicF.js
 * See page 117, exercise 4.1 of Indira's Pearls
 * use run6.html
 * M. Laszlo
 * June 2021
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import * as dat from '../lib/dat.gui.module.js';
import { Mobius } from '../lib/complexUtilities.js';
import { MyUtils } from '../lib/utilities.js';
import { DragControls } from './jsm/controls/DragControls.js';
import { TransformControls } from './jsm/controls/TransformControls.js';



let camera, scene, renderer;
let cameraControls, transformControls;
let clock = new THREE.Clock();
let circles = null;
let circles2 = null;
let axes = null;
let mobius = null;
let maxN = 8;

let seedCircle = [new Complex(-0.5, 0.8), 0.2];
let seedDisk;
let materials, materials2;
let baseZ = 0.02; // z offset for seed disk



function createCircleSequence(mobius, center, radius, n, conjugate=null) {
    let res = [];
    let m = Mobius.identity();
    let conjugate_inv = null;
    if (conjugate) {
        conjugate_inv = conjugate.inverse();
    }
    for (let i = 0; i < n; i++) {
        let mp = null;
        if (!conjugate) {
            mp = m;
        } else {
            mp = conjugate.compose(m).compose(conjugate_inv);
        }
        let newCircle = mp.evalCircle(center, radius);
        res.push(newCircle);
        m = m.compose(mobius).normalize();
    }
    return res;
}

let diskGeom = new THREE.CircleGeometry(1, 40);

function createCirclesSceneGraph(mobius, center, radius, n, materials, basez=0.0) {
    let root = new THREE.Object3D();
    let conjugate = null; 
    let circleSeqForward = createCircleSequence(mobius, center, radius, n+1, conjugate);
    let circleSeqBackward = createCircleSequence(mobius.inverse(), center, radius, n+1, conjugate);
    let circleSequence = circleSeqBackward.slice(1).reverse().concat(circleSeqForward);
    let zOffset = 0.002;
    // let matArgs = {shininess: 80, transparent: true, opacity: 0.9, side: THREE.DoubleSide};
    let m = circleSequence.length;
    for (let i = 0, matIndx = maxN - n; i < m; i++, matIndx++) {
    // for (let circle of circleSequence) {
        let [center, radius] = circleSequence[i];
        let mesh = new THREE.Mesh(diskGeom, materials[matIndx]);
        let z = basez + Math.abs(i - (m / 2)) * zOffset;
        mesh.position.set(center.re, center.im, z);
        mesh.scale.set(radius, radius, 1);
        root.add(mesh);
    }
    return root;
}



function createScene() {
    // set up dragable disk
    seedDisk = new THREE.Mesh(diskGeom);
    seedDisk.position.x = seedCircle[0].re;
    seedDisk.position.y = seedCircle[0].im;
    seedDisk.position.z = baseZ;
    seedDisk.scale.set(seedCircle[1], seedCircle[1], 1);
    scene.add(seedDisk);
    setupTransformControls(seedDisk);
    // set up materials
    let matArgs = {side: THREE.DoubleSide};
    materials = [];
    materials2 = [];
    for (let i = 1; i <= 2 * (maxN + 1); i++) {
        let mat = new THREE.MeshLambertMaterial(matArgs);
        let color = new THREE.Color().setHSL(0, 0.5, i/(2*(maxN+2)));
        mat.color = color;
        materials.push(mat);
        mat = new THREE.MeshLambertMaterial(matArgs);
        color = new THREE.Color().setHSL(0.33, 0.5, i/(2*(maxN+2)));
        mat.color = color;
        materials2.push(mat);
    }

    updateSceneGraph();
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 10, 40);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000);
    light2.position.set(-10, 10, -40);
    let ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);

    axes = new THREE.AxesHelper(10);
    scene.add(axes);
}


let controls = new function() {
    this.n = 4;
    this.m = 4;
    this.radius = 0.2;
    this.axes = true;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'n', 0, maxN).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'm', 0, maxN).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'radius', 0.1, 0.5).step(0.05).onChange(updateRadius);
    gui.add(controls, 'axes').onChange(function (flag) {
        if (flag) scene.add(axes);
        else scene.remove(axes);
    });
}

function updateRadius() {
    let newRadius = controls.radius;
    seedCircle[1] = newRadius;
    seedDisk.scale.set(newRadius, newRadius, 1);
    updateSceneGraph();
}


function updateSceneGraph() {
    // let z = new Complex({abs: controls.abs, arg: MyUtils.degreesToRadians(controls.arg)});
    // define Mobius transformation
    let s = 1;
    let t = 40;
    mobius = new Mobius(s+t, 2, 2*s*t, s+t).normalize();
    let radius = (1/s - 1/t) / 2;
    let centerRe = (-1/s) + radius;
    scene.remove(circles);
    scene.remove(circles2);
    circles = createCirclesSceneGraph(mobius, centerRe, radius, controls.n, materials);
    scene.add(circles);
    let vs = new Complex(seedDisk.position.x, seedDisk.position.y);
    let rs = seedDisk.scale.x;
    let seedCircle = [vs, rs];
    circles2 = createCirclesSceneGraph(mobius, seedCircle[0], seedCircle[1], controls.m, materials2, baseZ);
    scene.add(circles2);
}


function setupTransformControls(object) {
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(object);
    transformControls.setMode("translate")
    transformControls.showZ = false;
    transformControls.addEventListener('dragging-changed', function (event) {
        cameraControls.enabled = !event.value;
        updateSceneGraph();
    });
    scene.add(transformControls);
}


function render() {
    let delta = clock.getDelta();
    cameraControls.update(delta);
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
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 100000);
    camera.position.set(0, 0, 4);
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
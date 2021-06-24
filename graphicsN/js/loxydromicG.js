/***********
 * loxydromicG.js
 * based on inversionOneDragC.js
 * use run6.html
 * M. Laszlo
 * June 2021
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import * as dat from '../lib/dat.gui.module.js';
import { Mobius } from '../lib/complexUtilities.js';
import { MyUtils } from '../lib/utilities.js';



let camera, scene, renderer;
let cameraControls, transformControls;
let clock = new THREE.Clock();
let circles = null;
let axes = null;
let materials;

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
        m = m.compose(mobius);
    }
    return res;
}

let diskGeom = new THREE.CircleGeometry(1, 40);
let sphereGeom = new THREE.SphereGeometry(1, 12, 12);

function createCirclesSceneGraph(mobius, center, radius, n, model) {
    materials = [];
    let root = new THREE.Object3D();
    let conjugate = new Mobius(1, -1, 1, 1);
    let circleSeqForward = createCircleSequence(mobius, center, radius, n+1, conjugate);
    let circleSeqBackward = createCircleSequence(mobius.inverse(), center, radius, n+1, conjugate);
    let circleSequence = circleSeqBackward.slice(1).reverse().concat(circleSeqForward);
    if (model == 'disks') {
        let z = 0.0;
        let zOffset = 0.001;
        let matArgs = {shininess: 80, transparent: true, opacity: 0.8, side: THREE.DoubleSide};
        for (let circle of circleSequence) {
            let [center, radius] = circle;
            let mat = new THREE.MeshPhongMaterial(matArgs);
            materials.push(mat);
            let mesh = new THREE.Mesh(diskGeom, mat);
            mesh.position.set(center.re, center.im, z);
            z += zOffset;
            mesh.scale.set(radius, radius, 1);
            root.add(mesh);
        }
    } else {
        let matArgs = {shininess: 80, transparent: false};
        for (let circle of circleSequence) {
            let [center, radius] = circle;
            let mat = new THREE.MeshPhongMaterial(matArgs);
            materials.push(mat);
            let mesh = new THREE.Mesh(sphereGeom, mat);
            mesh.position.set(center.re, center.im, 0);
            mesh.scale.set(radius, radius, radius);
            root.add(mesh);
        }
    }
    return root;
}



function createScene() {
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
    this.abs = 1.04;
    this.arg = -20;
    this.n = 80;
    this.radius = 0.2;
    this.re = 2;
    this.color = '#EB005D';
    this.rainbow = true;
    this.model = 'disks';
    this.axes = true;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'abs', 1.0, 1.2).step(0.01).onChange(updateSceneGraph);
    gui.add(controls, 'arg', -45.0, 45.0).step(0.01).onChange(updateSceneGraph);
    gui.add(controls, 'n', 0, 100).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'radius', 0.1, 0.5).step(0.05).onChange(updateSceneGraph);
    gui.add(controls, 're', -5, 5).step(0.01).onChange(updateSceneGraph);
    gui.addColor(controls, 'color').onChange(updateColor);
    gui.add(controls, 'rainbow').onChange(updateColor);
    let modelTypes = ['disks', 'spheres'];
    gui.add(controls, 'model', modelTypes).onChange(updateSceneGraph);
    gui.add(controls, 'axes').onChange(function (flag) {
        if (flag) scene.add(axes);
        else scene.remove(axes);
    });
}


function updateSceneGraph() {
    let z = new Complex({abs: controls.abs, arg: MyUtils.degreesToRadians(controls.arg)});
    let mobius = new Mobius(z, 0, 0, 1);
    scene.remove(circles);
    circles = createCirclesSceneGraph(mobius, [controls.re, 0], controls.radius, controls.n, controls.model);
    scene.add(circles);
    updateColor();
}

function updateColor() {
    let color = null;
    if (!controls.rainbow) {
        color = new THREE.Color(controls.color);
        for (let mat of materials) {
            mat.color = color;
        }
    } else {
        let n = materials.length;
        for (let i = 0; i < n; i++) {
            color = new THREE.Color().setHSL(i/n, 1.0, 0.5);
            materials[i].color = color;
        }
    }
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
    camera.position.set(0, 0, 40);
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
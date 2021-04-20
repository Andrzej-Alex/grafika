/***********
 * inversionOneDragC.js
 * M. Laszlo
 * February 2021
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';
import { DragControls } from './jsm/controls/DragControls.js';
import { TransformControls } from './jsm/controls/TransformControls.js';

 

let camera, scene, renderer;
let cameraControls, transformControls;
let clock = new THREE.Clock();

let seedDisk, seedCircle;
let inversionCylinder, inversionCircle;
let reflectionDisk, reflectionCircle;



let diskGeom = new THREE.CircleGeometry(1, 80);
let ringGeom = new THREE.RingGeometry(1, 4, 80);

function createScene() {
    [seedDisk, seedCircle] = makeSeedDisk(1);
    scene.add(seedDisk); 
    setupTransformControls(seedDisk);

    [inversionCylinder, inversionCircle] = makeInversionCircle(4);
    scene.add(inversionCylinder);

    updateReflectionCircle();

    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000);
    light2.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(light);
    // scene.add(light2);
    scene.add(ambientLight);

    let axes = new THREE.AxesHelper(10);
    scene.add(axes);
}

function setupTransformControls(object) {
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(object);
    transformControls.setMode("translate")
    transformControls.showY = false;
    transformControls.addEventListener('dragging-changed', function (event) {
        cameraControls.enabled = !event.value;
        updateReflectionCircle();
    });
    scene.add(transformControls);
}

function updateReflectionCircle() {
    // get specs of seed circle
    let vs = new THREE.Vector2(seedDisk.position.x, seedDisk.position.z);
    let rs = seedDisk.scale.x;
    let seedCircle = [vs, rs];
    // make reflected circle
    let [refDisk, refCircle] = makeReflection(seedCircle, inversionCircle);
    scene.remove(reflectionDisk);
    reflectionDisk = refDisk;
    scene.add(reflectionDisk);
}

function makeSeedDisk(r) {
    let matArgs = {shininess: 80, transparent: true, opacity: 0.8, side: THREE.DoubleSide}
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let disk = new THREE.Mesh(diskGeom, mat);
    disk.rotation.x = Math.PI / 2;
    disk.scale.set(r, r, 1);
    disk.position.x = 3;
    let seedCircle = [new THREE.Vector2(3, 0), r];
    return [disk, seedCircle];
}

function makeInversionCircle(r) {
    let geom = new THREE.CylinderGeometry(r, r, 0.2, 80, 1, true);
    let matArgs = {shininess: 80, color: 0xFF0000, side: THREE.DoubleSide};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let cyl = new THREE.Mesh(geom, mat);
    let invCircle = [new THREE.Vector2(0, 0), r];
    return [cyl, invCircle];
}

let materialBlue = new THREE.MeshPhongMaterial({shininess: 80, color: 0x4169e1, side: THREE.DoubleSide});

function makeReflection(seedCircle, invCircle) {
    let [vr, rr] = invertOneCircle(seedCircle[0], seedCircle[1], invCircle[0], invCircle[1]);
    if (rr == Infinity)
        rr = Number.MAX_VALUE;
    let geom;
    if (vr.length() > rr) { // reflection does not contain center of inversion circle
        geom = diskGeom;
    } else {
        geom = ringGeom;
    }
    let disk = new THREE.Mesh(geom, materialBlue);
    disk.rotation.x = Math.PI / 2;
    disk.position.set(vr.x, -0.05, vr.y);
    disk.scale.set(rr, rr, 1);
    return [disk, [vr, rr]];
}


// invert circle centered at Vector2 v and radius r
// with respect to inversion circle with center v0 and radius r0
// Returns [center, radius] of new circle
function invertOneCircle(v, r, v0, r0) {
    let vd = v.clone().sub(v0);
    let d = (vd.x * vd.x + vd.y * vd.y - r * r);
    if (d === 0) { // reflection is a line through point v3 and perpendicular to vector v3
        let v2 = v.clone().multiplyScalar(2);
        let [v3, rr] = invertOneCircle(v2, 1, v0, vr);
        return [v3, Infinity];
    }
    let s = (r0 * r0) / d;
    let vp = new THREE.Vector2().addVectors(v0, vd.multiplyScalar(s));
    let rp = Math.abs(s) * r;
    return [vp, rp];
}



let controls = new function() {
    this.radius = 1;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'radius', 0.1, 2).step(0.05).onChange(updateRadius);
}

function updateRadius() {
    let newRadius = controls.radius;
    seedCircle[1] = newRadius;
    seedDisk.scale.set(newRadius, newRadius, 1);
    updateReflectionCircle();
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
    camera.position.set(0, 16, 0);
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
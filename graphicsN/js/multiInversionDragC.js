/***********
 * multiInversionDragA.js
 * M. Laszlo
 * February 2021
 ***********/

// FIX SHADOW OF DRAGGED SEED DISK
// OH THIS IS CORRECT AS IS, SINCE THE SEED DISK IS PRODUCED BY TWO REFLECTIONS
// OF ITSELF, AND ITS LEVEL IS 0 (GRAY). MAKES SENSE!
// PUT REFLECTIONS ON THEIR OWN LEVELS
// ADD TO TOGGLE INVERSION CIRCLES IN SCENE
// ADD TO TOGGLE HANDLES ON SEED DISK
// ALSO OPACITY CONTROL

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
let inversionCylinders, inversionCircles;
let reflectionDisks, reflectionCircles, axes;
let radiusThresh = Math.sqrt(2) + 0.5;
let opacity = 0.7;

let maxLevels = 5;
let materials = [];


let diskGeom = new THREE.CircleGeometry(1, 80);

function createScene() {
    [seedDisk, seedCircle] = makeSeedDisk(1);
    scene.add(seedDisk);  // why does seed disk duplicate when dragged????
    setupTransformControls(seedDisk);

    initMaterials();

    [inversionCylinders, inversionCircles] = makeInversionCircles();
    scene.add(inversionCylinders);

    updateReflectionCircles();

    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000);
    light2.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);

    axes = new THREE.AxesHelper(10);
    scene.add(axes);
}

function initMaterials() {
    let matArgs = {shininess: 80, transparent: true, opacity: opacity, side: THREE.DoubleSide};
    materials.push(new THREE.MeshPhongMaterial(matArgs));
    materials[0].color = new THREE.Color(0.8, 0.8, 0.8);
    for (let i = 1; i <= maxLevels; i++) {
        let matArgs = {shininess: 80, transparent: true, opacity: opacity, side: THREE.DoubleSide};
        materials.push(new THREE.MeshPhongMaterial(matArgs));
    }
    genRandomColors();
}

function setupTransformControls(object) {
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(object);
    transformControls.setMode("translate")
    transformControls.showY = false;
    transformControls.addEventListener('dragging-changed', function (event) {
        cameraControls.enabled = !event.value;
        updateReflectionCircles();
    });
    scene.add(transformControls);
}

// takes a circle [v,r] centered at Vector2 v and radius v
// and performs DFS n levels through the inversion circles
// vrs = [[v01,r01], [v02,r02], ..., [v0k,r0k]]. 
// Accumulates [v1,r1,l1,c1], ..., [vm,rm,l1,cm] in dict res where
// the i'th circle, centered at vi of radius ri, has been hit ci times
// and first appears at level li.
// Here dictionary dict maps the integral center of each
// circle to its count; dict is updated by the call to invertCircles.
function invertCircle(n, circle, vrs, dict={}, scale=1000) {

    let toKey = function(x, y, r) {
        if (r > radiusThresh)  // treat big seed circle separate
            return "A";        // since it has same center as its inversion
        let xn = Math.round(x * scale);
        let yn = Math.round(y * scale);
        return [xn, yn]
    }
    const [v, r] = circle;

    // add circle to dictionary
    let circleKey = toKey(v.x, v.y, r);
    let count = 1;
    if (dictHas(dict, circleKey)) {
        let thisCircle = dict[circleKey];
        thisCircle[3] += 1;
        if (n > thisCircle[2])
            thisCircle[2] = n;   // keep highest level for this circle
    } else {
        dict[circleKey] = [v, r, n, 1];
    }
    // invert resulting inverted circles
    if (n > 0) {
        for (let [v0,r0] of vrs) {
            let nextCircle = invertOneCircle(v, r, v0, r0);
            invertCircle(n-1, nextCircle, vrs, dict, scale);
        }
    }
}

// top level call
function invertCircles(n, circles, vrs) {
    let dict = {};
    for (let circle of circles) {
        invertCircle(n, circle, vrs, dict);
    }
    let res = dictValues(dict);
    // normalize levels
    res.map(v => v[2] = n - v[2]);
    return res;
}

// dictionary abstraction
function dictKeys(dict) {
    return Object.keys(dict);
}

function dictHas(dict, key) {
    return dict.hasOwnProperty(key);
}

function dictValues(dict) {
    return dictKeys(dict).map(k => dict[k]);
}
// end inversionF.js *********************

const levelOffsetY = 0.05;

function updateReflectionCircles() {
    // for setting y position of every circle
    const eps = 0.00005;
    let levelCounts = new Array(maxLevels + 1);
    for (let i = 0; i <= maxLevels; i++)
        levelCounts[i] = 0;
    const levelOffset = 0.1;
    let n = controls.n;
    // get specs of seed circle
    let vs = new THREE.Vector2(seedDisk.position.x, seedDisk.position.z);
    let rs = seedDisk.scale.x;
    let seedCircle = [vs, rs];
    reflectionCircles = invertCircles(n, [seedCircle], inversionCircles);
    let newReflectionDisks = new THREE.Object3D();
    let root = new THREE.Object3D();
    for (let [v, r, l] of reflectionCircles) {
        let circle = new THREE.Mesh(diskGeom, materials[l]);
        let yoffset = l * levelOffset + levelCounts[l] * eps;
        levelCounts[l] += 1;
        circle.position.set(v.x, -yoffset, v.y);
        circle.rotation.x = Math.PI / 2;
        circle.scale.set(r, r, 1);
        newReflectionDisks.add(circle);
    }
    if (reflectionDisks)
        scene.remove(reflectionDisks);
    reflectionDisks = newReflectionDisks;
    scene.add(reflectionDisks);
}


function genRandomColors() {
    if (controls.randomColors) {
        for (let mat of materials.slice(1)) {
            mat.color = MyUtils.getRandomColor(0.5, 0.4, 0.6);
        }
    }
}

function genColors(flag) {
    if (flag) {
        genRandomColors();
    } else {
        let color = new THREE.Color(controls.color);
        for (let mat of materials) {
            mat.color = color;
        }
    }
}

function makeSeedDisk(r) {
    let matArgs = {shininess: 80, transparent: true, opacity: opacity, side: THREE.DoubleSide}
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let disk = new THREE.Mesh(diskGeom, mat);
    disk.rotation.x = Math.PI / 2;
    disk.scale.set(r, r, 1);
    disk.position.x = 3;
    let seedCircle = [new THREE.Vector2(3, 0), r];
    return [disk, seedCircle];
}



function makeInversionCircles() {
    // generate circles
    let a = Math.sqrt(2) + 1;
    let vrs = [];
    vrs.push([new THREE.Vector2(0, 0), 1]);
    for (let i of [-a, a]) {
        for (let j of [-a, a]) {
            vrs.push([new THREE.Vector2(i, j), a]);
        }
    }
    // generate cylinders for the circles
    let geom = new THREE.CylinderGeometry(1, 1, 0.2, 80, 1, true);
    let matArgs = {shininess: 80, color: 0xFF0000, side: THREE.DoubleSide};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let root = new THREE.Object3D();
    for (let [v,r] of vrs) {
        let cyl = new THREE.Mesh(geom, mat);
        cyl.position.set(v.x, 0, v.y);
        cyl.scale.set(r, 1, r);
        root.add(cyl);
    }
    return [root, vrs];
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
    this.n = 0;
    this.inversionCircles = true;
    this.color = '#3366ff';
    this.randomColors = true;
    this.Randomize = genRandomColors;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'n', 0, maxLevels).step(1).onChange(updateReflectionCircles);
    gui.add(controls, 'radius', 0.1, 2).step(0.05).onChange(updateRadius);
    gui.add(controls, 'inversionCircles').name('inversion circles').onChange(function (flag) {
        if (flag) scene.add(inversionCylinders, axes);
        else scene.remove(inversionCylinders, axes);
    });
    gui.addColor(controls, 'color');
    gui.add(controls, 'randomColors').onChange(genColors);
    gui.add(controls, 'Randomize');
}


function updateRadius() {
    let newRadius = controls.radius;
    seedCircle[1] = newRadius;
    seedDisk.scale.set(newRadius, newRadius, 1);
    updateReflectionCircles();
}


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
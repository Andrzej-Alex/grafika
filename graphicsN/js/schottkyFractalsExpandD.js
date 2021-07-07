/***********
 * schottkyFractalsExpandD.js
 * based on Indra's Pearls, Chapter 6
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
let fractal = null;
let materials;
let materialsByDisk;
let maxLevels = 6;
let currentHighestLevel = maxLevels;
let circleSequence = null;  // current circle sequence
let matSphere = new THREE.MeshLambertMaterial();

// picking
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();


function createSchottkySceneGraph(circleSeq, model, colorModel) {
    let root = new THREE.Object3D();
    let mesh;
    if (model == 'disks') {
        let zOffset = 0.01;
        let diskGeom = new THREE.CircleGeometry(1, 40);
        for (let c of circleSeq) {
            let circle = c.circle;
            let [center, radius] = circle;
            if (colorModel != 'by disk')
                mesh = new THREE.Mesh(diskGeom, materials[c.level]);
            else // colorModel == 'by disk'
                mesh = new THREE.Mesh(diskGeom, materialsByDisk[c.circleIndex]);
            mesh.position.set(center.re, center.im, zOffset * c.level);
            mesh.scale.set(radius, radius, 1);
            mesh.userData.circle = c;
            root.add(mesh);
        }
    } else { // model == 'spheres'
        let sphereGeom = new THREE.SphereGeometry(1, 24, 24);
        for (let c of circleSeq) {
            let circle = c.circle;
            let isLimit = c.isLimit;
            let [center, radius]= circle;
            if (isLimit) {
                if (colorModel == 'uniform')
                    mesh = new THREE.Mesh(sphereGeom, matSphere);
                else if (colorModel == 'by level')
                    mesh = new THREE.Mesh(sphereGeom, materials[c.level]);
                else // colorModel == 'by disk'
                    mesh = new THREE.Mesh(sphereGeom, materialsByDisk[c.circleIndex]);
                mesh.userData.circle = circle;
                mesh.position.set(center.re, center.im, 0);
                mesh.scale.set(radius, radius, radius);
                mesh.userData.circle = c;
                root.add(mesh);
            }
        }
    }
    return root;
}


/**
 * Schottky functions
 **/


/***
 * Called with:
 *   list of four transforms and circles.
 *   initial level, and last level to expand to (level < lastLevel)
 *   prefix transform and circle index such that
 *     prefixTransform.evalCircle(...circles[circleIndex]) yields the level circle
 * 
 * Returns list of circle code objects with these properties:
 *   circle: current circle [center, radius]
 *   level: level of this circle
 *   prefixTransform
 *   circleIndex: index of rightmost transform in prefixTransform (as composition)
 *   isLimit: true iff this circle belongs to the current limit set
 ***/

function createSchottkyFractal(transforms, circles, level, lastLevel, prefixTransform=null, circleIndex=null) {
    let circlesAcc = [];
    if (!prefixTransform) {
        for (let i = 0; i < 4; i++) {
            createSchottkyFractalRec(Mobius.identity(), i, 0, lastLevel, transforms, circles, circlesAcc);
        }
    } else {
        for (let i of childrenOfCircleIndex[circleIndex]) {
            createSchottkyFractalRec(prefixTransform, i, level+1, lastLevel, transforms, circles, circlesAcc);
        }
    }
    return circlesAcc;
}

// circle 0 is Ca, 1 is CA, 2 is Cb, 3 is CB
const childrenOfCircleIndex = [
    [0, 2, 3],
    [1, 2, 3],
    [0, 1, 2],
    [0, 1, 3]
];



function createSchottkyFractalRec(prefixTransform, circleIndex, level, lastLevel, transforms, circles, circlesAcc) {
    let curCircle = circles[circleIndex];
    curCircle = prefixTransform.evalCircle(...curCircle);
    let nextTransform = prefixTransform.compose(transforms[circleIndex]);
    let circleCode = {circle: curCircle, level: level, prefixTransform: nextTransform, circleIndex: circleIndex};
    circleCode.isLimit = (level == lastLevel);
    circlesAcc.push(circleCode);
    if (level < lastLevel) {
        for (let c of childrenOfCircleIndex[circleIndex]) {
            createSchottkyFractalRec(nextTransform, c, level+1, lastLevel, transforms, circles, circlesAcc);
        }
    }
}

// pair circles based on Indra's Pearls, Chapter 6
function pairCircles(x, u) {
    let y = Math.sqrt(x * x - 1);
    let v = Math.sqrt(u * u - 1);
    let yv = y * v;
    let k = (1 / yv) + Math.sqrt((1 / (yv * yv)) - 1);
    let Ca = [new Complex(0, k*u/v), k/v];
    let CA = [new Complex(0, -k*u/v), k/v];
    let Cb = [new Complex(x/y, 0), 1/y];
    let CB = [new Complex(-x/y, 0), 1/y];

    let a = new Mobius(u, new Complex(0, k*v), new Complex(0, -v/k), u);
    let A = a.inverse();
    let b = new Mobius(x, y, y, x);
    let B = b.inverse();
    let transforms = [a, A, b, B];
    let circles = [Ca, CA, Cb, CB];
    return [transforms, circles];
}

/**
 * end Schottky functions
 **/


function createScene() {
    materials = [];
    for (let i = 0; i <= maxLevels; i++)
        materials.push(new THREE.MeshLambertMaterial());
    materialsByDisk = [];
    for (let i = 0; i <4; i++) {
        materialsByDisk.push(new THREE.MeshLambertMaterial());
    }
    updateSceneGraph();
    updateRandomColors();
    matSphere.color = new THREE.Color(controls.color);
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 10, 40);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light2.position.set(-10, 10, -40);
    let ambientLight = new THREE.AmbientLight(0x777777);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}


let controls = new function() {
    this.nbrLevels = 2;
    this.u = 1.6;
    this.model = 'disks';
    this.colorModel = 'by level';
    this.color = '#EB005D';
    this.Randomize = updateRandomColors;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'nbrLevels', 0, maxLevels).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'u', 1.4, 2.4).step(0.1).onChange(updateSceneGraph);
    let modelTypes = ['disks', 'spheres'];
    gui.add(controls, 'model', modelTypes).onChange(updateSceneGraphUseCircleSequence);
    let colorModelTypes = ['uniform', 'by level', 'by disk'];
    gui.add(controls, 'colorModel', colorModelTypes).name('color model').onChange(updateSceneGraphUseCircleSequence);
    gui.addColor(controls, 'color').onChange(function () {
        matSphere.color = new THREE.Color(controls.color);
    });
    gui.add(controls, 'Randomize');
}


const pairCirclesX = 1.1;

function updateSceneGraphUseCircleSequence() {
    scene.remove(fractal);
    fractal = createSchottkySceneGraph(circleSequence, controls.model, controls.colorModel);
    scene.add(fractal);
}

function updateSceneGraph() {
    scene.remove(fractal);
    let [transforms, circles] = pairCircles(pairCirclesX, controls.u);
    circleSequence = createSchottkyFractal(transforms, circles, 0, controls.nbrLevels);
    fractal = createSchottkySceneGraph(circleSequence, controls.model, controls.colorModel);
    scene.add(fractal);
}

function updateRandomColors() {
    for (let mat of materials) {
        mat.color = MyUtils.getRandomColor(0.3, 0.4, 0.6);
    }
    for (let mat of materialsByDisk) {
        mat.color = MyUtils.getRandomColor(0.3, 0.4, 0.6);        
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
    // picking
    window.addEventListener( 'mousedown', onPointerDown );
    renderer.setAnimationLoop(function () {
        render();
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 100000);
    camera.position.set(0, 0, 10);
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

// clicking only on sphere model for now
function onPointerDown( event ) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    let intersects = raycaster.intersectObjects(fractal.children);
    if (intersects.length > 0) {
        let picked = intersects[0].object;
        let circle = picked.userData.circle;
        if (controls.model == 'spheres') {
            fractal.remove(picked);
        } else {  // model == 'disks'
            if (!circle.isLimit)
                return;
        }
        circle.isLimit = false;
        let level = circle.level;
        if (level == currentHighestLevel) {
            materials.push(new THREE.MeshLambertMaterial({color: MyUtils.getRandomColor(0.3, 0.4, 0.6)}));
            currentHighestLevel = level+1;
        }
        let prefixTransform = circle.prefixTransform;
        let circleIndex = circle.circleIndex;
        let [transforms, circles] = pairCircles(pairCirclesX, controls.u);
        let newCircleSeq = createSchottkyFractal(transforms, circles, level, level+1, prefixTransform, circleIndex);
        let newFractal = createSchottkySceneGraph(newCircleSeq, controls.model, controls.colorModel);
        fractal.add(...newFractal.children);
        circleSequence.push(...newCircleSeq);    
    }
}


init();
createScene();
initGui();
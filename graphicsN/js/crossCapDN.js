/***********
 * crossCapDN.js
 * Cross cap with section
 * M. Laszlo
 * August 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';


let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();

let subject = new MyUtils.Subject();

let heightSegments = 50; 
let nbrSegments = 200;

let mats;
let crossCap = null;

function createScene() {
    updateCrossCap();
    let light = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light.position.set(20, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light2.position.set(20, -20, 20);
    let light3 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light3.position.set(-20, 20, -20);
    let light4 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light4.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2); 
    scene.add(light3);
    scene.add(light4);
    scene.add(ambientLight);

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
}

function makeCrossCapParametricSurface(startAngle, section, a=1) {
    // see https://mathworld.wolfram.com/Cross-Cap.html (Gray 1997)
    function f(u, v, res) {
        v = startAngle + v * section;
        // if (v >= 1) v -= 1;
        let up = u * 2 * Math.PI; 
        let vp = v * 0.5 * Math.PI; 
        let sinu = Math.sin(up), sinv = Math.sin(vp);
        let sin2v = Math.sin(2 * vp), sin2u = Math.sin(2 * up), cos2u = Math.cos(2 * up);
        let sinv2 = sinv * sinv;
        let x = 0.5 * a * sinu * sin2v;
        let y = a * sin2u * sinv2;
        let z = a * cos2u * sinv2;
        res.set(x, y, z);
    }
    return f;
}



function makeCrossCapGeometry(radialSegs, heightSegs, startAngle=0, section=1, a=1) {
    let f = makeCrossCapParametricSurface(startAngle, section, a);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}


let controls = new function() {
    this.color1 = '#008080';
    this.color2 = '#EB005D';
    this.surface = 'surface1';
    this.opacity = 1;
    this.fourcolors = false;
}

function initGui() {
    let gui = new dat.GUI();
    gui.addColor(controls, 'color1').onChange(updateColors);
    gui.addColor(controls, 'color2').onChange(updateColors);
    let surfaces = ['surface1', 'surface2'];
    gui.add(controls, 'surface', surfaces).name('opaque surface').onChange(updateOpacity);
    gui.add(controls, 'opacity', 0, 1).onChange(function (v) {for (let i = 0; i < 4; i++) mats[i].opacity = v;});
    gui.add(controls, 'fourcolors').name('four colors').onChange(updateColors);
}

function updateColors() {
    let flag = controls.fourcolors;
    let color1 = new THREE.Color(controls.color1);
    let color2 = new THREE.Color(controls.color2);
    mats[0].color = mats[1].color = color1;
    mats[2].color = mats[3].color = color2;
    if (flag) {
        let color1p = color1.clone().offsetHSL(0.5, 0, 0);
        let color2p = color2.clone().offsetHSL(0.5, 0, 0);
        mats[1].color = color1p;
        mats[3].color = color2p;
    }
}

function updateOpacity(surface) {
    switch (surface) {
        case 'surface1': // surface1 is opaque
            mats[0].transparent = mats[1].transparent = false;
            mats[2].transparent = mats[3].transparent = true;
            break;
        case 'surface2':
            mats[0].transparent = mats[1].transparent = true;
            mats[2].transparent = mats[3].transparent = false;
            break;
    }
    for (let i = 0; i < 4; i++)
        mats[i].needsUpdate = true;
}



function updateCrossCap() {
    let color1 = new THREE.Color(controls.color1);
    let color2 = new THREE.Color(controls.color2);
    let opacity = controls.opacity;
    let surface = controls.surface;
    let a = 2;
    if (crossCap)
        scene.remove(crossCap);
    crossCap = new THREE.Object3D();
    // first Mobius band
    let startAngle = 0;
    let section = 0.5;
    let geom = makeCrossCapGeometry(nbrSegments, heightSegments, startAngle, section, a);
    let matArgs = {side: THREE.FrontSide, shininess:40, color: color1, opacity: opacity};
    matArgs.transparent = surface != 'surface1';
    mats = [];
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front = new THREE.Mesh(geom, mats[0]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back = new THREE.Mesh(geom, mats[1]);
    // second Mobius band
    startAngle = 0.5;
    let geom2 = makeCrossCapGeometry(nbrSegments, heightSegments, startAngle, section, a);
    matArgs.side = THREE.FrontSide;
    matArgs.opacity = opacity;
    matArgs.color = color2;
    matArgs.transparent = surface == 'surface1';
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front2 = new THREE.Mesh(geom2, mats[2]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back2 = new THREE.Mesh(geom2, mats[3]);
    crossCap.add(front,  back, front2, back2);
    scene.add(crossCap);
}


function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(function () {
        let delta = clock.getDelta();
        subject.notify(delta);
        cameraControls.update();
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.03;
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}



init();
createScene();
initGui();



/***********
 * kleinBottleFN.js
 * Klein bottle
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

let heightSegments = 200; 
let nbrSegments = 200;
let mats;
let klein = null;

function createScene() {
    updateKlein();
    let light = new THREE.PointLight(0xFFFFFF, 0.8, 1000 );
    light.position.set(10, 10, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.8, 1000 );
    light2.position.set(-10, -20, 20);
    let light3 = new THREE.PointLight(0xFFFFFF, 0.8, 1000 );
    light3.position.set(-10, 20, -20);
    let light4 = new THREE.PointLight(0xFFFFFF, 0.8, 1000 );
    light4.position.set(-10, 10, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2); 
    scene.add(light3);
    scene.add(light4);
    scene.add(ambientLight);

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
}


function makeKleinBottleParametricSurface6(startAngle, section, a=6, b=4, c=16) {
    // Dickson bottle: See The Klein Bottle: Variations on a Theme' by Gregorio Franzoni
    // similar to makeKleinBottleParametricSurface3
    function f(u, v, res) {
        u = startAngle + u * section;
        let up = u * 2 * Math.PI; // around nonorientable loop
        let vp = v * 2 * Math.PI; // around orientable loop
        let cosu = Math.cos(up), sinu = Math.sin(up);
        let cosv = Math.cos(vp), sinv = Math.sin(vp);``
        let ru = b * (1 - cosu / 2);
        let x, y, z;
        if (up < Math.PI) {
            x = a * cosu * (1 + sinu) + ru * cosu * cosv;
            y = c * sinu + ru * sinu * cosv;
        } else {
            x = a * cosu * (1 + sinu) + ru * Math.cos(vp + Math.PI);
            y = c * sinu;
        }
        z = ru * sinv;
        res.set(x, y, z);
    }
    return f;
}


function makeKleinBottleGeometry(radialSegs, heightSegs, startAngle=0, section=1, a, b) {
    let f = makeKleinBottleParametricSurface6(startAngle, section, a, b);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}

function makeBall(radius=0.5) {
    let geom = new THREE.SphereGeometry(radius, 24, 24);
    let matArgs = {color: 0xff0000};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let ball = new THREE.Mesh(geom, mat);
    // ball properties for motion
    ball.userData.pps = 0.07;
    ball.userData.pos = new THREE.Vector2(0, 0.5);
    ball.userData.dir = new THREE.Vector2(1, 0);
    return ball;
}



let controls = new function() {
    this.color = '#1562c9';
    this.opacity = 1;
    this.section = 1;
    this.a = 6;
    this.b = 4;
}

function initGui() {
    let gui = new dat.GUI();
    gui.addColor(controls, 'color').onChange(function (v) {mats[0].color = mats[1].color = new THREE.Color(v);});
    gui.add(controls, 'section', 0.05, 1).step(0.05).onChange(updateKlein);
    gui.add(controls, 'opacity', 0.5, 1).onChange(function (v) {mats[0].opacity = mats[1].opacity = v;});
    gui.add(controls, 'a', 4, 8).step(0.5).onChange(updateKlein);
    gui.add(controls, 'b', 1, 7).step(0.5).onChange(updateKlein);
}




function updateKlein() {
    let a = controls.a;
    let b = controls.b;
    let section = controls.section;
    let color = new THREE.Color(controls.color);
    let opacity = controls.opacity;
    if (klein)
        scene.remove(klein);
    klein = new THREE.Object3D();
    let startAngle = 0;
    let geom = makeKleinBottleGeometry(nbrSegments, heightSegments, startAngle, section, a, b);
    let matArgs = {side: THREE.FrontSide, opacity:opacity, shininess:50, transparent: true, color: color};
    mats = [];
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front = new THREE.Mesh(geom, mats[0]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back = new THREE.Mesh(geom, mats[1]);
    klein.add(front, back);
    scene.add(klein);
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
        cameraControls.update();
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 64);
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



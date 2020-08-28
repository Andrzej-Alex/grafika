/***********
 * kleinFigure8CN.js
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

let heightSegments = 30; 
let nbrSegments = 300;

let mats;
let klein = null;

function createScene() {
    updateKlein();
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

function makeKleinFigure8ParametricSurface(radius, startAngle, section, m, n, a=2) {
    // http://paulbourke.net/geometry/toroidal/
    function f(u, v, res) {
        v = startAngle + v * section;
        let up = u * 4 * Math.PI;
        let vp = v * 2 * Math.PI;
        // why is does commented below work for up = 2 * u * PI?
        let cosnu2 = Math.cos(n * up / 2), sinnu2 = Math.sin(n * up / 2);
        let cosmu2 = Math.cos(m * up / 2), sinmu2 = Math.sin(m * up / 2);
// let cosnu2 = Math.cos(n * up ), sinnu2 = Math.sin(n * up );
// let cosmu2 = Math.cos(m * up ), sinmu2 = Math.sin(m * up );
        let sinv = Math.sin(vp), sin2v = Math.sin(2 * vp);
        let x = cosmu2 * (radius + cosnu2 * sinv - sinnu2 * sin2v / a);
        let y = sinmu2 * (radius + cosnu2 * sinv - sinnu2 * sin2v / a);
        let z = sinnu2 * sinv + cosnu2 * sin2v / a;
        res.set(x, y, z);
    }
    return f;
}


function makeKleinFigure8Geometry(radius, radialSegs, heightSegs, startAngle=0, section=1, m, n, a) {
    let f = makeKleinFigure8ParametricSurface(radius, startAngle, section, m, n, a);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}



let controls = new function() {
    this.color1 = '#008080';
    this.color2 = '#8A2BE2';
    this.opacity2 = 1;
    this.m = 1;
    this.n = 1;
    this.a = 0;
    this.radius = 2;
}

function initGui() {
    let gui = new dat.GUI();
    gui.addColor(controls, 'color1').onChange(function (v) {mats[0].color = new THREE.Color(v);});
    gui.addColor(controls, 'color2').onChange(function (v) {mats[1].color = mats[2].color = new THREE.Color(v);});
    gui.add(controls, 'opacity2', 0, 1).onChange(function (v) {mats[1].opacity = mats[2].opacity = v});
    gui.add(controls, 'm', 1, 4).step(1).onChange(updateKlein);
    gui.add(controls, 'n', 1, 8).step(1).onChange(updateKlein);
    gui.add(controls, 'a', 0, 4).step(1).onChange(updateKlein);
    gui.add(controls, 'radius', 2, 6).step(1).onChange(updateKlein);
}




function updateKlein() {
    let color1 = new THREE.Color(controls.color1);
    let color2 = new THREE.Color(controls.color2);
    let m = controls.m;
    let n = controls.n;
    let a = 2 ** controls.a;
    let opacity2 = controls.opacity2;
    let radius = controls.radius;
    if (klein)
        scene.remove(klein);
    klein = new THREE.Object3D();
    // first Mobius band
    let startAngle = 0.25;
    let section = 0.5;
    let geom = makeKleinFigure8Geometry(radius, nbrSegments, heightSegments, startAngle, section, m, n, a);
    let matArgs = {side: THREE.DoubleSide, shininess:40, color: color1};
    mats = [];
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let mobius1 = new THREE.Mesh(geom, mats[0]);
    // second Mobius band
    startAngle = 0.75;
    geom = makeKleinFigure8Geometry(radius, nbrSegments, heightSegments, startAngle, section, m, n, a);
    matArgs.color = color2;
    matArgs.transparent = true;
    matArgs.opacity = opacity2;
    matArgs.side = THREE.FrontSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let mobius2 = new THREE.Mesh(geom, mats[1]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let mobius2b = new THREE.Mesh(geom, mats[2]);
    klein.add(mobius1, mobius2, mobius2b);
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
    camera.position.set(0, 0, 10);
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



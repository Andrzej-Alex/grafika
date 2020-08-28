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

let radius = 2.5;
let heightSegments = 60; 
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

function makeKleinFigure8ParametricSurface(radius, startAngle, section, sectionu) {
    // https://en.wikipedia.org/wiki/Klein_bottle#The_figure_8_immersion
    function f(u, v, res) {
        v = startAngle + v * section;
        u = u * sectionu;
        let up = u * 2 * Math.PI; 
        let vp = v * 2 * Math.PI;
        let cosu = Math.cos(up), sinu = Math.sin(up);
        let coshalfu = Math.cos(up/2), sinhalfu = Math.sin(up/2);
        let cosv = Math.cos(vp), sinv = Math.sin(vp), sin2v = Math.sin(2*vp);
        let x = cosu * (radius + coshalfu * sinv - sinhalfu * sin2v / 2);
        let y = sinu * (radius + coshalfu * sinv - sinhalfu * sin2v / 2);
        let z = sinhalfu * sinv + coshalfu * sin2v / 2;
        res.set(x, y, z);
    }
    return f;
}


function makeKleinFigure8Geometry(radius, radialSegs, heightSegs, startAngle=0, section=1, sectionu=1) {
    let f = makeKleinFigure8ParametricSurface(radius, startAngle, section, sectionu);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}



let controls = new function() {
    this.color1 = '#008080';
    this.color2 = '#8A2BE2';
    this.opacity2 = 1;
    this.section = 1;
}

function initGui() {
    let gui = new dat.GUI();
    gui.addColor(controls, 'color1').onChange(function (v) {mats[0].color = mats[1].color = new THREE.Color(v);});
    gui.addColor(controls, 'color2').onChange(function (v) {mats[2].color = mats[3].color = new THREE.Color(v);});
    gui.add(controls, 'opacity2', 0, 1).onChange(function (v) {mats[2].opacity = mats[3].opacity = v});
    gui.add(controls, 'section', 0.1, 1).step(0.1).onChange(updateKlein);
}




function updateKlein() {
    let color1 = new THREE.Color(controls.color1);
    let color2 = new THREE.Color(controls.color2);
    let opacity2 = controls.opacity2;
    let sectionu = controls.section;
    if (klein)
        scene.remove(klein);
    klein = new THREE.Object3D();
    // first Mobius band
    let startAngle = 0.25;
    let section = 0.5;
    let geom = makeKleinFigure8Geometry(radius, nbrSegments, heightSegments, startAngle, section, sectionu);
    let matArgs = {side: THREE.FrontSide, shininess:40, transparent: false, color: color1, opacity: 1.0};
    mats = [];
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front = new THREE.Mesh(geom, mats[0]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back = new THREE.Mesh(geom, mats[1]);
    // second Mobius band
    startAngle = 0.75;
    let geom2 = makeKleinFigure8Geometry(radius, nbrSegments, heightSegments, startAngle, section, sectionu);
    matArgs.transparent = true;
    matArgs.opacity = opacity2;
    matArgs.side = THREE.FrontSide;
    matArgs.color = color2;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front2 = new THREE.Mesh(geom2, mats[2]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back2 = new THREE.Mesh(geom2, mats[3]);
    klein.add(front, back, front2, back2);
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



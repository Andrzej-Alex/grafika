/***********
 * projectivePlane.js
 * M. Laszlo
 * September 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';


let camera, scene, renderer;
let cameraControls;

let radius = 12;
let pointRadius = 0.02 * radius; 
let widthSegs = 60, heightSegs = 24;
let pivots = [];   // pivoting around lines through antipodal points
let eps = 0.03;

function createScene() {
    let hemi = makeHemisphere(radius);
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(20, 20, 0);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light2.position.set(-10, -20, 20);
    let light3 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light3.position.set(10, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(light3);
    scene.add(ambientLight);
    scene.add(hemi);
    scene.add(makeSwingingPlane(Math.PI / 4, 0x00ff00));
    scene.add(makeSwingingPlane(Math.PI / 2, 0xff0000));
    scene.add(makeSwingingPlane(Math.PI / 3, 0xff8c00));

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
}

function makeHemisphere(radius) {
    let root = new THREE.Object3D;
    let geom = new THREE.SphereGeometry(radius, widthSegs, heightSegs, 0, Math.PI);
    let matArgs = {side: THREE.DoubleSide, color: 0x999999, transparent: true, opacity: 0.9};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let hemi = new THREE.Mesh(geom, mat);
    hemi.rotation.x = 0.5 * Math.PI;
    // center
    let sphere = makePoint(new THREE.Vector3(0, 0, 0), 0xffff00);
    // line at infinity
    let geom2 = new THREE.CircleGeometry(radius, widthSegs, 0, 2 * Math.PI);
    geom2.vertices.shift();
    matArgs = {color: 0xffffff, linewidth: 4, transparent: false};
    mat = new THREE.LineBasicMaterial(matArgs);
    let circle = new THREE.LineLoop(geom2, mat);
    circle.rotation.x = 0.5 * Math.PI;
    circle.position.y = eps;
    root.add(hemi, sphere, circle);    
    return root;
}

function makePoint(pos, color) {
    color = new THREE.Color(color);
    let geom = new THREE.SphereGeometry(pointRadius, 16, 16);
    let matArgs = {side: THREE.FrontSide, color: color};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let sphere = new THREE.Mesh(geom, mat);
    sphere.position.set(pos.x, pos.y, pos.z);
    return sphere;
}

function makeSwingingPlane(radians, color) {
    let root = new THREE.Object3D();
    // two antipodal points
    let x = radius * Math.cos(radians);
    let z = radius * Math.sin(radians);
    let p0 = makePoint(new THREE.Vector3(x, 0, z), color);
    x = radius * Math.cos(radians + Math.PI);
    z = radius * Math.sin(radians + Math.PI);
    let p1 = makePoint(new THREE.Vector3(x, 0, z), color);
    let geom = new THREE.CircleGeometry(radius, widthSegs, 0, Math.PI);
    let matArgs = {side: THREE.DoubleSide, transparent: true, color: color, opacity: 0.4};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let halfDisk = new THREE.Mesh(geom, mat);
    let geom2 = new THREE.CircleGeometry(radius + eps, widthSegs, 0, Math.PI);
    geom2.vertices.shift();
    let geom3 = new THREE.CircleGeometry(radius - eps, widthSegs, 0, Math.PI);
    geom3.vertices.shift();
    matArgs.transparent = false;
    matArgs.linewidth = 4;
    mat = new THREE.LineBasicMaterial(matArgs);
    let halfCircle = new THREE.Line(geom2, mat);
    let halfCircle2 = new THREE.Line(geom3, mat);
    let planeRoot = new THREE.Object3D();
    planeRoot.rotation.x = Math.PI;
    let c1 = new THREE.Object3D();
    c1.rotation.y = radians; // attaches to two points p0 and p1
    planeRoot.add(c1);
    let c2 = new THREE.Object3D(); // rotate on x to pivot on line through p0 and p1
    // expose c2!
    pivots.push(c2);
    planeRoot.add(c1);
    c1.add(c2);
    c2.add(halfDisk, halfCircle, halfCircle2);
    root.add(p0, p1, planeRoot);
    return root;
}


let controls = new function() {
    this.pivot1 = 0;
    this.pivot2 = 0;
    this.pivot3 = 0;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'pivot1', -89.8, 89.8).step(0.1).name('pivot green').onChange(updatePivot);
    gui.add(controls, 'pivot2', -89.8, 89.8).step(0.1).name('pivot red').onChange(updatePivot);
    gui.add(controls, 'pivot3', -89.8, 89.8).step(0.1).name('pivot orange').onChange(updatePivot);
}

function updatePivot() {
    for (let i = 0; i < pivots.length; i++) {
        let thePivot = "pivot" + (i + 1);
        let radians = MyUtils.degreesToRadians(controls[thePivot]);
        pivots[i].rotation.x = radians;
    }
}


function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(function () {
        cameraControls.update();
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 36);
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



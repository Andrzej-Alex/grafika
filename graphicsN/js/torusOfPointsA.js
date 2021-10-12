/***********
 * torusOfPoints.js
 * M. Laszlo
 * October 2021
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

let root;
let camera, scene, renderer;
let cameraControls;

function createScene() {
    update();
    updateColor(new THREE.Color(controls.color));
}

function getRandomPointOnTorus(majorRad, minorRad) {
    // majorRad = center to torus tube
    // minorRad = radius of tube
    majorRad = majorRad || 2.0
    minorRad = minorRad || 0.5
    let u = Math.random() * 2 * Math.PI;
    let v = Math.random() * 2 * Math.PI;
    let x = (majorRad + minorRad * Math.cos(v)) * Math.cos(u);
    let y = (majorRad + minorRad * Math.cos(v)) * Math.sin(u);
    let z = minorRad * Math.sin(v);
    return new THREE.Vector3(x, y, z);
}

function pointsOnTorus(nbrPoints, majorRad, minorRad) {
    let vertices = [];
    for (let i = 0; i < nbrPoints; i++) {
        let p = getRandomPointOnTorus(majorRad, minorRad);
        vertices.push(p.x, p.y, p.z);
    }
    let geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    let color = new THREE.Color(controls.color);
    let matArgs = {color: color, size: 0.1};
    let mat = new THREE.PointsMaterial(matArgs);
    let points = new THREE.Points(geom, mat);
    return points;
}


let controls = new function() {
    this.majRad = 4.0;
    this.minRad = 1.0;
    this.nbrPoints = 1000;
    this.color = '#00C0C0';
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'majRad', 1, 5).step(0.1).name('Major radius').onChange(update);
    gui.add(controls, 'minRad', 0.5, 1.5).step(0.1).name('Minor radius').onChange(update);
    gui.add(controls, 'nbrPoints', 200, 10000).step(1).name('Nbr points').onChange(update);
    gui.addColor(controls, 'color').onChange(function (v) {updateColor(new THREE.Color(v))});
}

function update() {
    let majRadius = controls.majRad;
    let minRadius = controls.minRad;
    let nbrPoints = controls.nbrPoints;
    if (root)
        scene.remove(root);
    root = pointsOnTorus(nbrPoints, majRadius, minRadius);
    scene.add(root);
}

function updateColor(color) {
    let mat = root.material;
    mat.color = color;
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
	camera.position.set(0, 0, 20);
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.04;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}



init();
initGui();
createScene();



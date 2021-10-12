/***********
 * triangle016N.js
 * A simple triangle with orbit control
 * M. Laszlo
 * September 2019
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


function starburstsOnTorus(nbrBursts, majorRad, minorRad, maxRays, maxRad) {
    let root = new THREE.Object3D();
    for (let i = 0; i < nbrBursts; i++) {
        let mesh = starburst(maxRays, maxRad);
        let p = getRandomPointOnTorus(majorRad, minorRad);
        mesh.position.set(p.x, p.y, p.z);
        root.add(mesh);
    }
    return root;
}

function starburst(maxRays, maxRad) {
    let rad = 1;   // had been rad = 10?????
    let origin = new THREE.Vector3(0, 0, 0);
    let innerColor = MyUtils.getRandomColor(0.8, 0.1, 0.8);
    let black = new THREE.Color(0x000000);
    let geom = new THREE.Geometry();
    let nbrRays = MyUtils.getRandomInt(1, maxRays);
    for (let i = 0; i < nbrRays; i++) {
        let r = rad * MyUtils.getRandomFloat(0.1, maxRad);
        let dest = MyUtils.getRandomPointOnSphere(r);
        geom.vertices.push(origin, dest);
        geom.colors.push(innerColor, black);
    }
    let args = {vertexColors: true, linewidth: 2};
    let mat = new THREE.LineBasicMaterial(args);
    return new THREE.Line(geom, mat, THREE.LineSegments);
}



let controls = new function() {
    this.majRad = 4.0;
    this.minRad = 1.0;
    this.nbrBursts = 400;
    this.burstRadius = 1.0;
    this.maxRays = 100;
    this.Go = update;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'majRad', 2, 5).step(0.1).name('Major radius');
    gui.add(controls, 'minRad', 0.5, 1.5).step(0.1).name('Minor radius');
    gui.add(controls, 'nbrBursts', 5, 2000).step(5).name('Nbr of bursts');
    gui.add(controls, 'burstRadius', 0.1, 5.0).name('Burst radius');
    gui.add(controls, 'maxRays', 5, 200).name('Max nbr of rays');
    gui.add(controls, 'Go');
}

function update() {
    let majRadius = controls.majRad;
    let minRadius = controls.minRadius;
    let nbrBursts = controls.nbrBursts;
    let burstRadius = controls.burstRadius;
    let maxRays = controls.maxRays;
    if (root)
        scene.remove(root);
    root = starburstsOnTorus(nbrBursts, majRadius, minRadius, maxRays, burstRadius);
    scene.add(root);
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
	camera.position.set(0, 0, 30);
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



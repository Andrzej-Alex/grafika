/***********
 * square025N.js
 * A simple square with orbit control
 * M. Laszlo
 * September 2019
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';


let camera, scene, renderer;
let cameraControls;


function createScene() {
    addLights();
    let square = makeSquare();
    let axes = new THREE.AxesHelper(10);
    scene.add(square);
    scene.add(axes);
}


function makeSquare() {
    var geom = new THREE.Geometry();
    var a = new THREE.Vector3(0, 0, 0);
    var b = new THREE.Vector3(8, 0, 0);
    var c = new THREE.Vector3(0, 8, 0);
    var d = new THREE.Vector3(8, 8, 4);
    geom.vertices.push(a, b, c, d);
    var face1 = new THREE.Face3(0, 1, 2);
    var face2 = new THREE.Face3(1, 2, 3);
    geom.faces.push(face1, face2);
    geom.computeFaceNormals();
    var color = MyUtils.getRandomColor(0.9, 0.1, 0.5)
    var args = {color: color, flatShading: true, side: THREE.DoubleSide};
    var mat = new THREE.MeshLambertMaterial(args);
    var mesh = new THREE.Mesh(geom, mat);
    return mesh;
}

function addLights() {
    var pointLight1 = new THREE.PointLight(0xFFFFFF, 1, 0, 1000);
    pointLight1.position.set(0, 20, 20);
    var pointLight2 = new THREE.PointLight(0xFFFFFF, 1, 0, 1000);
    pointLight2.position.set(0, 20, -20);
    var ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(pointLight1);
    scene.add(pointLight2);
    scene.add(ambientLight);
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
createScene();



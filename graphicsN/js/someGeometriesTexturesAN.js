/***********
 * someGeometriesAN.js
 * Some three.js geometries
 * M. Laszlo
 * September 2019
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import * as dat from '../lib/dat.gui.module.js';


let camera, scene, renderer;
let cameraControls;
let gui
let currentMat, currentMesh;
let currentObjectName;
let texturesDir = '../assets/';
let textureFiles = ['earth.jpg', 'jellyfish.jpg'];
let textures;

let controls = new function() {
    this.type = 'Sphere';
    this.texture = 'earth';
}

function createScene() {
    textures = new Map();
    for (let file of textureFiles) {
        let texture = new THREE.TextureLoader().load(texturesDir + file);
        let textureName = file.slice(0, -4);
        textures.set(textureName, texture);
    }
    currentMat = new THREE.MeshLambertMaterial({map: textures.get('earth')});
    updateObject('Sphere');
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(20, 10, 40);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light2.position.set(-20, 10, -40);
    let ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}


function animate() {
    window.requestAnimationFrame(animate);
    render();
}


function render() {
    cameraControls.update();
    renderer.render(scene, camera);
}


function updateObject(objectType) {
    let geom;     
    if (currentMesh)
        scene.remove(currentMesh);
    switch (objectType) {
        case 'Sphere':  geom = new THREE.SphereGeometry(10, 24, 24);
                        break;
        case 'Torus':   geom = new THREE.TorusGeometry(10, 3, 24, 36);
                        break;
        case 'Octahedron': geom = new THREE.OctahedronGeometry(8);
                        break;
        case 'Knot':    geom = new THREE.TorusKnotGeometry(5, 2);
                        break;
        case 'Icosahedron': geom = new THREE.IcosahedronGeometry(10);
                        break;
        case 'Cube': geom = new THREE.BoxGeometry(10, 10, 10);
                        break;
        case 'Dodecahedron': geom = new THREE.DodecahedronGeometry(10);
                        break;
        case 'Cylinder': geom = new THREE.CylinderGeometry(5, 5, 20, 16);
                        break;
    }
    if (geom) {
        currentMesh = new THREE.Object3D;
        currentMesh.add(new THREE.Mesh(geom, currentMat));
        scene.add(currentMesh);
        currentObjectName = objectType;
    }
}

function initGui() {
    gui = new dat.GUI();
    let objectTypes =  ['Sphere', 'Torus', 'Cylinder', 'Cube', 'Octahedron', 'Icosahedron', 'Dodecahedron', 'Knot']
    gui.add(controls, 'type', objectTypes).onChange(updateObject);
    let textureNames = textureFiles.map(file => file.slice(0, -4));
    gui.add(controls, 'texture', textureNames).onChange(updateTexture);
    currentObjectName = 'Sphere';
}

function updateTexture(textureName) {
    let texture = textures.get(textureName);
    currentMat.map = texture;
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
initGui();
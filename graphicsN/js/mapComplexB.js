/***********
 * mapComplexB.js
 * based on loxydromicG.js
 * use run6.html
 * M. Laszlo
 * June 2021
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import * as dat from '../lib/dat.gui.module.js';
import { MyUtils } from '../lib/utilities.js';



let camera, scene, renderer;
let cameraControls, transformControls;
let clock = new THREE.Clock();
let circles = null;
let axes = null;
let groundRadius = 20, maxDiskRadius = 1, mappedGroundOpacity = 0.6;
let ground, mappedGround, nbrDisks = -1;

function createGround(groundRadius, maxDiskRadius, nbrDisks, opacity=1.0) {
    let root = new THREE.Object3D();
    let transparent = !(opacity == 1.0);
    let matArgs = {shininess: 80, transparent: transparent, opacity: opacity, side: THREE.DoubleSide};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    mat.color = darkBlue;
    let diskGeom = new THREE.CircleGeometry(groundRadius, 80);
    let ground = new THREE.Mesh(diskGeom, mat);
    root.add(ground);
    let diskGeom2 = new THREE.CircleGeometry(1, 80);
    for (let i = 0; i < nbrDisks; i++) {
        let radius = MyUtils.getRandomFloat(0.4, maxDiskRadius);
        mat = new THREE.MeshPhongMaterial(matArgs);
        let color = MyUtils.getRandomColor(0.5, 0.5, 0.8);
        mat.color = color;
        let disk = new THREE.Mesh(diskGeom2, mat);
        disk.scale.set(radius, radius, 1);
        let randomArg = MyUtils.getRandomFloat(0, 2 * Math.PI);
        let randomAbs = MyUtils.getRandomFloat(0, groundRadius - radius);
        let z = new Complex({arg: randomArg, abs: randomAbs});
        disk.position.set(z.re, z.im, 0.1);
        root.add(disk);
    }
    return root;
}




function createScene() {
    updateSceneGraph();
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 10, 40);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000);
    light2.position.set(-10, 10, -40);
    let ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);

    axes = new THREE.AxesHelper(10);
    scene.add(axes);
}


let controls = new function() {
    this.abs = 1;
    this.arg = -20;
    this.nbrDisks = 4;
    this.axes = true;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'abs', 0.2, 2.0).step(0.01).onChange(updateMappedGround);
    gui.add(controls, 'arg', -180.0, 180.0).step(0.01).onChange(updateMappedGround);
    gui.add(controls, 'nbrDisks', 1, 8).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'axes').onChange(function (flag) {
        if (flag) scene.add(axes);
        else scene.remove(axes);
    });
}

const lightWhite = new THREE.Color(0xcccccc);
const darkBlue = new THREE.Color(0x00008b);
const mappedGroundMat = new THREE.MeshPhongMaterial({shininess: 80, transparent: true, opacity: 0.4, side: THREE.DoubleSide, color: lightWhite});


function updateSceneGraph() {
    if (nbrDisks == controls.nbrDisks)
        return;
    nbrDisks = controls.nbrDisks;
    scene.remove(ground, mappedGround);
    ground = createGround(groundRadius, maxDiskRadius, nbrDisks);
    mappedGround = ground.clone();
    mappedGround.position.z = 4;
    mappedGround.children[0].material = mappedGroundMat;
    updateMappedGround();
    scene.add(ground, mappedGround);
}

function updateMappedGround() {
    // rotate and scale mappedGround
    let scale = controls.abs;
    let rotation = MyUtils.degreesToRadians(controls.arg);
    mappedGround.scale.set(scale, scale, scale);
    mappedGround.rotation.z = rotation;
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
    renderer.setAnimationLoop(function () {
        render();
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 100000);
    camera.position.set(0, 0, 50);
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




init();
createScene();
initGui();
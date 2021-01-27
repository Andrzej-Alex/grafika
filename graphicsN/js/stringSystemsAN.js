/***********
 * stringSystemsAN.js
 * M. Laszlo
 * January 2021
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let stringSystem;
let transformer, digitsGraph;
let len = 1;
let maxLevels = 4;
let materials;
let randomMats = null;
let geom;
let models;



function createScene() {
    let n = controls.n;
    let base = controls.base;
    makeModelsMap();
    update();
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light2.position.set(-10, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
    scene.add(stringSystem);

    let axes = new THREE.AxesHelper(10);
    scene.add(axes);
}

function makeStringSystem(n, base, transformer, digitsGraph) {
    let root = new THREE.Object3D();
    root.add(digitsGraph.clone());
    if (n > 1) {
        let s = makeStringSystem(n-1, base, transformer, digitsGraph);
        for (let i = 0; i < base; i++) {
            root.add(transformer(i, base, s.clone(), n));
        }
    }
    return root;
}

function makeModelsMap() {
    // keyboard width along z-axis, grows with n along +x-axis
    // keyboard parameters:
    let h = 1; // length along x-axis
    let w = 1; // width of keyboard is w * base
    let d = 0.25;  // depth of keys (height along vertical y-axis)
    let depthOf2n = 2 * d; // lofted: depth of key at 2^{n-1}
    let epsilon = 0.0001;
    models = new Map();
    models.set('keyboard flat', {
        'transformer': function(i, base, stringSystem) {
            let minx = -0.5 * (base - 1) * w;
            let root = new THREE.Object3D();
            root.position.x = h;
            root.position.z = minx + i * w;
            root.scale.set(1, 1, 1 / base);
            root.add(stringSystem);
            return root;
        },
        'digitsGraph': function(base) {
            let geom = new THREE.BoxGeometry(h, d, w);
            let matArgs = {shininess: 80};
            let root = new THREE.Object3D();
            let minx = -0.5 * (base - 1) * w;
            for (let i = 0; i < base; i++) {
                let mat = new THREE.MeshPhongMaterial(matArgs);
                mat.color = new THREE.Color().setHSL(i / base, 1.0, 0.5);
                let mesh = new THREE.Mesh(geom, mat);
                mesh.position.y = 0.5 * d;
                mesh.position.z = minx + i * w;
                root.add(mesh);
            }
            return root;
        }
    });
}




var controls = new function() {
    this.n = 3;
    this.base = 2;
}

function initGui() {
    var gui = new dat.GUI();
    gui.add(controls, 'base', 2, 10).step(1).onChange(update);
    gui.add(controls, 'n', 1, maxLevels).step(1).onChange(update);
}


function update() {
    if (stringSystem)
        scene.remove(stringSystem);
    let n = controls.n;
    let base = controls.base;
    let model = models.get('keyboard flat');
    let transformer = model.transformer;
    let digitsGraph = model.digitsGraph(base);
    stringSystem = makeStringSystem(n, base, transformer, digitsGraph);
    scene.add(stringSystem);
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
    camera.position.set(0, 8, 0);
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



/***********
 * stringSystemsBN.js
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

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
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
    models.set('keyboard', {
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
    let sxb = 1;  // side of box x-axis
    let szb = 3;  // side of box z-axis
    let offb = 0.5 // offset between boxes
    models.set('boxes', {
        'transformer': function(i, base, stringSystem) {
            let minx = -0.5 * (base - 1) * (szb + offb);
            let root = new THREE.Object3D();
            root.position.y = d;
            root.position.z = minx + i * (szb + offb);
            root.scale.set(0.8, 1, 1 / (base + 2 * offb));
            root.add(stringSystem);
            return root;
        },
        'digitsGraph': function(base) {
            let geom = new THREE.BoxGeometry(sxb, d, szb);
            let matArgs = {shininess: 80};
            let root = new THREE.Object3D();
            let minx = -0.5 * (base - 1) * (szb + offb);
            for (let i = 0; i < base; i++) {
                let mat = new THREE.MeshPhongMaterial(matArgs);
                mat.color = new THREE.Color().setHSL(i / base, 1.0, 0.5);
                let mesh = new THREE.Mesh(geom, mat);
                mesh.position.y = 0.5 * d;
                mesh.position.z = minx + i * (szb + offb);
                root.add(mesh);
            }
            return root;
        }
    });
    let bxz = 1;  // side of square in xz-plane
    models.set('squares', {
        'transformer': function(i, base, stringSystem) {
            let nrows = Math.floor(Math.sqrt(base));
            let ncols = Math.floor((base - 1) / nrows) + 1;
            let minz = -0.5 * (nrows - 1) * (bxz);
            let root = new THREE.Object3D();
            let row = i % nrows;
            let col = Math.floor(i / nrows);
            root.position.y = d;
            root.position.z = minz + (row * bxz);
            root.position.x = col * bxz - (0.5 * bxz) + (0.5 / ncols) * bxz; 
            root.scale.set(1/ncols, 1, 1/nrows);
            root.add(stringSystem);
            return root;
        },
        'digitsGraph': function(base) {
            let geom = new THREE.BoxGeometry(bxz, d, bxz);
            let matArgs = {shininess: 80};
            let root = new THREE.Object3D();
            let nrows = Math.floor(Math.sqrt(base));
            let minz = -0.5 * (nrows - 1) * bxz;
            for (let i = 0; i < base; i++) {
                let mat = new THREE.MeshPhongMaterial(matArgs);
                mat.color = new THREE.Color().setHSL(i / base, 1.0, 0.5);
                let mesh = new THREE.Mesh(geom, mat);
                mesh.position.y = 0.5 * d;
                let row = i % nrows;
                let col = Math.floor(i / nrows);
                mesh.position.z = minz + (row * bxz);
                mesh.position.x = col * bxz;
                root.add(mesh);
            }
            return root;
        }
    });
    // disks models
    let dd = 0.05;  // depth of disks along y-axis
    let r = 0.5;    // radius of disks
    let offset = 3;  // offset of disks
    let sf = 0.25; // scale factor
    let rl = 2.0;   // radius (lofted)
    let hl = 1;     // height of disk y-axis (lofted)
    let offsetl = 6;  // offset (lofted)
    let twopi = 2 * Math.PI;
    models.set('disks', {
        'transformer': function(i, base, stringSystem, n) {
            let angleinc = twopi / base;
            let root = new THREE.Object3D();
            // root.position.y = dd;
            root.rotation.y = i * angleinc;
            stringSystem.scale.set(sf, 1 / base, sf);
            stringSystem.position.x = offset;
            root.add(stringSystem);
            return root;
        },
        'digitsGraph': function(base) {
            let matArgs = {shininess: 80};
            let root = new THREE.Object3D();
            let angleinc = twopi / base;
            for (let i = 0; i < base; i++) {
                let mat = new THREE.MeshPhongMaterial(matArgs);
                mat.color = new THREE.Color().setHSL(i / base, 1.0, 0.5);
                let geom = new THREE.CylinderGeometry(r, r, dd, 24);
                let mesh = new THREE.Mesh(geom, mat);
                let root2 = new THREE.Object3D();
                root2.rotation.y = i * angleinc;
                mesh.position.x = offset;
                root2.add(mesh);
                root.add(root2);
            }
            return root;
        }
    });
    let rs = 1;   // sphere radius
    let offsets = 5;  // sphere offset
    let sfs = 0.4;  // sphere scale factor
    let spherePositions = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 2, 0], [0, -2, 0], [2, 0, 0], [-2, 0, 0], [0, 0, 2], [0, 0, -2]];
    spherePositions = spherePositions.map(xyz => new THREE.Vector3(...xyz).multiplyScalar(offsets));
    models.set('spheres', {
        'transformer': function(i, base, stringSystem, n) {
            let p = spherePositions[i];
            stringSystem.position.set(p.x, p.y, p.z);
            stringSystem.scale.set(sfs, sfs, sfs);
            return stringSystem;
        },
        'digitsGraph': function(base) {
            let matArgs = {shininess: 80};
            let root = new THREE.Object3D();
            for (let i = 0; i < base; i++) {
                let mat = new THREE.MeshPhongMaterial(matArgs);
                mat.color = new THREE.Color().setHSL(i / base, 1.0, 0.5);
                let geom = new THREE.SphereGeometry(rs, 24, 24);
                let mesh = new THREE.Mesh(geom, mat);
                let p = spherePositions[i];
                mesh.position.set(p.x, p.y, p.z);
                root.add(mesh);
            }
            return root;
        }
    });
}




var controls = new function() {
    this.n = 3;
    this.base = 2;
    this.model = 'keyboard';
}

function initGui() {
    var gui = new dat.GUI();
    gui.add(controls, 'base', 2, 10).step(1).onChange(update);
    gui.add(controls, 'n', 1, maxLevels).step(1).onChange(update);
    let modelTypes = ['keyboard', 'boxes', 'squares', 'disks', 'spheres'];
    gui.add(controls, 'model', modelTypes).onChange(update);
}


function update() {
    if (stringSystem)
        scene.remove(stringSystem);
    let n = controls.n;
    let base = controls.base;
    let model = models.get(controls.model);
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
    camera.position.set(0, 10, 10);
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



/***********
 * toriSpinningBN.js
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

let radius = 5;

let genMats, specMats;

let ruledTorus = null;

let twopi = 2 * Math.PI;
let halfpi = 0.5 * Math.PI;

// blocks whose userData.rps is current spin rps around y-axis
let blocks;
// blocks for scale in xy-plane
let blocks3;

function createScene() {
    updateRuledTorus();
    let light = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light.position.set(20, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light2.position.set(20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(light);
    scene.add(light2); 
    scene.add(ambientLight);

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
}


function createRuledTorus(model, nbrSides, nbrGons, twist, radius) {
    // n copies of model along radius ring making up twist revolutions in total
    // every face of model[i] is assigned genMats[i] except special face
    // of model[i] is assigned specMats[i]
    let genMats = [], specMats = [];
    let root = new THREE.Object3D();
    blocks = [], blocks3 = [];
    for (let i = 0; i < nbrGons; i++) {
        let p1 = new THREE.Object3D();
        p1.rotation.y = (i / nbrGons) * twopi;
        // for rotation of child around y-axis
        p1.update = spinY;
        subject.register(p1);
        blocks.push(p1);
        let p2 = new THREE.Object3D();
        p2.position.x = radius;
        let matArgs = {transparent: true};
        let genMat = new THREE.MeshLambertMaterial(matArgs);
        genMats.push(genMat);
        let specMat = new THREE.MeshLambertMaterial(matArgs);
        specMats.push(specMat);
        let p3 = new THREE.Object3D();
        p3.rotation.z = (i / nbrGons) * twopi * (twist / nbrSides);
        subject.register(p3);
        p3.update = spin;
        blocks3.push(p3);
        let obj = model.clone();
        let geom = obj.geometry;
        for (let i = 0; i < geom.faces.length; i++)
            geom.faces[i].materialIndex = 0;
        geom.faces[0].materialIndex = geom.faces[1].materialIndex = 1;
        obj.material = [genMat, specMat];
        p3.add(obj);
        p2.add(p3);
        p1.add(p2);
        root.add(p1);
    }
    updateSpinRates();
    root.userData.genMats = genMats;
    root.userData.specMats = specMats;
    return root;
}


function spin(delta) {
    this.rotation.z += MyUtils.rpsToRadians(controls.rps, delta);
    this.rotation.z %= twopi;
}

function setYSpin(obj, rpsA, rpsB, i) {
    obj.userData.rps = rpsA + i * rpsB;
    obj.update = spinY;
    subject.register(obj);
}

function spinY(delta) {
    let rps = this.userData.rps;
    this.rotation.y += MyUtils.rpsToRadians(rps, delta);
    this.rotation.y %= twopi;
}



function updateRuledTorus() {
    if (ruledTorus)
        scene.remove(ruledTorus);
    let nbrSides = controls.nbrSides;
    let nbrGons = controls.nbrGons;
    let k = controls.k;
    let geom = new THREE.CylinderGeometry(1, 1, 0.25, nbrSides);
    let matArgs = {shininess: 80};
    let model = new THREE.Mesh(geom, new THREE.MeshLambertMaterial());
    model.rotation.x = halfpi;
    ruledTorus = createRuledTorus(model, nbrSides, nbrGons, k, radius);
    updateSpinRates();
    genMats = ruledTorus.userData.genMats;
    specMats = ruledTorus.userData.specMats;
    updateColor();
    updateScale();
    scene.add(ruledTorus);
}




let controls = new function() {
    this.nbrSides = 3;
    this.nbrGons = 40;
    this.k = 1;
    this.color = '#EB005D';
    this.colorModels = 'solid';
    this.opacity = 1;
    this.rps = 0;
    this.rps1 = 0;
    this.rps2 = 0;
    this.scale = 1.0;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'nbrSides', 2, 6).step(1).name('n (nbr sides)').onChange(updateRuledTorus);
    gui.add(controls, 'nbrGons', 20, 400).step(1).name('nbr polygons').onChange(updateRuledTorus);
    gui.add(controls, 'k', -12, 12).step(1).name('k (k/n twists)').onChange(updateRuledTorus);
    gui.add(controls, 'scale', 0.2, 1.0).step(0.02).onChange(updateScale);
    let appearanceFolder = gui.addFolder('Appearance');   
    appearanceFolder.addColor(controls, 'color').onChange(updateColor);
    let colorModels = ['solid', 'rainbow', 'one face'];
    appearanceFolder.add(controls, 'colorModels', colorModels).onChange(updateColor);
    appearanceFolder.add(controls, 'opacity', 0.4, 1, 0.1).onChange(updateOpacity);
    let animationFolder = gui.addFolder('Animation');
    animationFolder.add(controls, 'rps', -0.2, 0.2, 0.01).name('rps twist');
    animationFolder.add(controls, 'rps1', -0.1, 0.1, 0.01).name('rps first').onChange(updateSpinRates);
    animationFolder.add(controls, 'rps2', -0.1, 0.1, 0.01).name('rps last').onChange(updateSpinRates);
}

function updateSpinRates() {
    let rpsa = controls.rps1;
    let rpsb = controls.rps2;
    let n = controls.nbrGons;
    let inc = (rpsb - rpsa) / (n - 1);
    for (let i = 0; i < n; i++) {
        blocks[i].userData.rps = rpsa + i * inc;
    }
}

function updateScale() {
    let scale = controls.scale;
    let n = controls.nbrGons;
    let n2 = Math.round((n + 1) / 2);
    let inc = (1 - scale) / n2;
    for (let i = 0; i < n2; i++) {
        let s = 1 - i * inc;
        let svec = [s, s, 1.0];
        blocks3[i].scale.set(...svec);
        blocks3[n-1-i].scale.set(...svec);
    }
}


let white = new THREE.Color(0xcccccc);

function updateColor() {
    let colorModel = controls.colorModels;
    let opacity = controls.opacity;
    let color = null;
    switch (colorModel) {
     case 'solid':
        color = new THREE.Color(controls.color);
        for (let i = 0; i < genMats.length; i++) {
            genMats[i].color = specMats[i].color = color;
        }
        break;
     case 'rainbow':
        let n = genMats.length;
        let offset = MyUtils.getRandomInt(0, n);
        for (let i = 0; i < n; i++) {
            color = new THREE.Color().setHSL((i + offset)/n, 1.0, 0.5);
            genMats[i].color = specMats[i].color = color;
        }
        break;
     case 'one face':
        color = new THREE.Color(controls.color);
        for (let i = 0; i < genMats.length; i++) {
            genMats[i].color = white;
            specMats[i].color = color;
        }
        break;
    }
    updateOpacity();
}

function updateOpacity() {
    let opacity = controls.opacity;
    for (let i = 0; i < genMats.length; i++) {
        genMats[i].opacity = specMats[i].opacity = opacity;        
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
        let delta = clock.getDelta();
        cameraControls.update();
        subject.notify(delta);
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 14);
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



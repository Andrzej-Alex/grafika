/***********
 * ruledTorusTurning.js
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

let heightSegments = 30; 
let nbrSegments = 300;

let radius = 5;

let genMats, specMats;

let ruledTorus = null;

let twopi = 2 * Math.PI;
let halfpi = 0.5 * Math.PI;

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
    for (let i = 0; i < nbrGons; i++) {
        let p1 = new THREE.Object3D();
        p1.rotation.y = (i / nbrGons) * twopi;
        let p2 = new THREE.Object3D();
        p2.position.x = radius;
        let matArgs = {};
        let genMat = new THREE.MeshLambertMaterial(matArgs);
        genMats.push(genMat);
        let specMat = new THREE.MeshLambertMaterial(matArgs);
        specMats.push(specMat);
        let p3 = new THREE.Object3D();
        p3.rotation.z = (i / nbrGons) * twopi * (twist / nbrSides);
        subject.register(p3);
        p3.update = spin;
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
    root.userData.genMats = genMats;
    root.userData.specMats = specMats;
    return root;
}


function spin(delta) {
    this.rotation.z += MyUtils.rpsToRadians(controls.rps, delta);
    this.rotation.z %= twopi;
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
    genMats = ruledTorus.userData.genMats;
    specMats = ruledTorus.userData.specMats;
    updateColor();
    scene.add(ruledTorus);
}




let controls = new function() {
    this.nbrSides = 3;
    this.nbrGons = 40;
    this.k = 1;
    this.rps = 0;
    this.color = '#EB005D';
    this.colorModels = 'solid';
    this.opacity2 = 1;
    this.a = 0;
    this.radius = 2;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'nbrSides', 2, 6).step(1).name('n (nbr sides)').onChange(updateRuledTorus);
    gui.add(controls, 'nbrGons', 20, 200).step(1).name('nbr polygons').onChange(updateRuledTorus);
    gui.add(controls, 'k', -12, 12).step(1).name('k (k/n twists)').onChange(updateRuledTorus);    
    gui.add(controls, 'rps', -0.2, 0.2, 0.01);
    gui.addColor(controls, 'color').onChange(updateColor);
    let colorModels = ['solid', 'rainbow', 'one face'];
    gui.add(controls, 'colorModels', colorModels).onChange(updateColor);
}

let white = new THREE.Color(0xcccccc);

function updateColor() {
    let colorModel = controls.colorModels;
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
        for (let i = 0; i < n; i++) {
            color = new THREE.Color().setHSL(i/n, 1.0, 0.5);
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



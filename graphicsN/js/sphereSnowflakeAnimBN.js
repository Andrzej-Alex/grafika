/***********
 * sphereSnowflakeAnimBN.js
 * based on sphereSnowflakeCN.js
 * Rotate each random vector
 * M. Laszlo
 * October 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

 

let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let snowflake, currentGeom;
let sphereRadius = 1;
let maxLevels = 5;
let materials; // per level materials
let sphereGeom;

let subject = new MyUtils.Subject();

function createScene() {
    let nbrLevels = controls.nbrLevels;
    let color = new THREE.Color(controls.color);
    let opacity = controls.opacity;
    let matArgs = {color: color, shininess: 60, transparent: true, opacity: opacity, side: THREE.FrontSide};

    materials = [];
    for (let i = 0; i <= maxLevels+1; i++)
        materials.push(new THREE.MeshPhongMaterial(matArgs));
    sphereGeom = new THREE.SphereGeometry(sphereRadius, 24, 24);
    snowflake = makeSphereSnowflake(controls.nbrLevels, controls.scale, sphereGeom, controls.nbrPoints);
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(20, 40, 50);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000 );
    light2.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
    scene.add(snowflake);
}


function makeSphereSnowflake(level, scale, geom, nbrPoints, involute=false) {
    let sphere = new THREE.Mesh(geom, materials[level]);
    if (level > 0) {
        let root = new THREE.Object3D();
        sphere.add(root);
        root.scale.set(scale, scale, scale);
        let tf;
        if (!involute) tf = (sphereRadius * (1 + scale)) / scale
        else tf = (sphereRadius * (1 - scale)) / scale;
        for (let i = 0; i < nbrPoints; i++) {
            let root2 = new THREE.Object3D();

            let axis = MyUtils.getRandomPointOnSphere(1);
            let angle = MyUtils.getRandomFloat(0, 2 * Math.PI);
            root2.rotateOnAxis(axis, angle);  // this will go in update rotation
            root2.userData.axis = axis;
            root2.update = spin;
            subject.register(root2);
            let fractal = makeSphereSnowflake(level-1, scale, geom, nbrPoints, involute);
            let v = new THREE.Vector3(1, 0, 0).multiplyScalar(tf);
            fractal.position.set(v.x, v.y, v.z);
            root2.add(fractal);
            root.add(root2);
        }
    }
    return sphere;
}

function updateScale() {
    let scale = controls.scale;
    let tf
    if (!controls.involute) tf = (sphereRadius * (1 + scale)) / scale
    else tf = (sphereRadius * (1 - scale)) / scale;
    let geom = sphereGeom;
    let updateRec = function (root, level) {
        if (level > 0) {
            root = root.children[0];
            root.scale.set(scale, scale, scale);
            for (let i = 0; i < root.children.length; i++) {
                let c = root.children[i];
                let c1 = c.children[0];
                let v = new THREE.Vector3(1, 0, 0).multiplyScalar(tf);                
                c1.position.set(v.x, v.y, v.z);
                updateRec(c.children[0], level-1);
            }
        }
    }
    updateRec(snowflake, controls.nbrLevels);
}


var controls = new function() {
    this.nbrLevels = 1;
    this.scale = 0.2;
    this.involute = false;
    this.nbrPoints = 4;
    this.opacity = 1.0;
    this.color = '#3366ff';
    this.randomColors = false;
    this.Randomize = genRandomColors;
    this.rps = 0.0;
    this.rotateColors = false;
}

function initGui() {
    var gui = new dat.GUI();
    gui.add(controls, 'nbrLevels', 0, maxLevels).name('level').step(1).onChange(update);
    gui.add(controls, 'scale', 0.1, 0.5).step(0.01).onChange(updateScale);
    gui.add(controls, 'nbrPoints', 1, 10).step(1).onChange(update);
    gui.add(controls, 'involute').onChange(updateScale);
    let f1 = gui.addFolder('Appearance');
    f1.open();
    f1.addColor(controls, 'color');
    f1.add(controls, 'opacity', 0.1, 1.0).step(0.1).onChange(function () {
        for (let mat of materials)
            mat.opacity = controls.opacity;
    });
    f1.add(controls, 'randomColors').onChange(genColors);
    f1.add(controls, 'Randomize');
    let f2 = gui.addFolder('Animation');
    f2.open();
    f2.add(controls, 'rps', -0.1, 0.1).step(0.01);
    f2.add(controls, 'rotateColors');
}




function update() {
    if (snowflake)
        scene.remove(snowflake);
    snowflake = makeSphereSnowflake(controls.nbrLevels, controls.scale, sphereGeom, controls.nbrPoints, controls.involute)
    scene.add(snowflake);
}

function genColors(flag) {
    if (flag) {
        genRandomColors();
    } else {
        let color = new THREE.Color(controls.color);
        let opacity = controls.opacity;
        for (let mat of materials) {
            mat.color = color;
            mat.opacity = opacity
        }
    }
}

function genRandomColors() {
    if (controls.randomColors)
        for (let mat of materials) 
            mat.color = MyUtils.getRandomColor(0.3, 0.4, 0.6);
}

// last color assigned by color controller
let lastColor = null;
let amountToRotate = null;
let incColorRPS = 0.01;

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);
    if ((lastColor !== controls.color) && !controls.randomColors) {
        let color = new THREE.Color(controls.color);
        for (let mat of materials)
            mat.color = color;
        lastColor = controls.color;
    }
    // for efficiency, we assign once to amountToRotate and let
    // every sphere rotate by this amount. See spin()
    amountToRotate = MyUtils.rpsToRadians(controls.rps, delta);
    subject.notify(delta);
    // rotate colors
    let incColors = incColorRPS * delta;
    if (controls.rotateColors && controls.randomColors) {
        for (let mat of materials) {
            mat.color.offsetHSL(incColors, 0, 0);
        }
    }
    renderer.render(scene, camera);
}


function spin(delta) {
//  let d = MyUtils.rpsToRadians(controls.rps, delta);
    let axis = this.userData.axis;
    this.rotateOnAxis(axis, amountToRotate); // amountToRotate instead of d
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
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 1, 4);
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
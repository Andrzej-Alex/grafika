/***********
 * cornerConnectedD.js
 * based on posSnowflakeD.js
 * M. Laszlo
 * See Alt. Fractals
 * October 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let fractal;
let len = 1;
let maxLevels = 4;
let materials;
let randomMats = null;
let geom;


function createScene() {
    let nbrLevels = controls.nbrLevels;
    let color = new THREE.Color(controls.color);
    let opacity = controls.opacity;
    let matArgs = {color: color, shininess: 80, transparent: true, opacity: opacity, side: THREE.DoubleSide};
    materials = [];
    for (let i = 0; i <= maxLevels+1; i++)
        materials.push(new THREE.MeshPhongMaterial(matArgs));
    let geom = new THREE.TetrahedronGeometry(len);
    fractal = makeCornerConnected(2, geom, 0.5);
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light2.position.set(-10, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
    scene.add(fractal);
}



function makeCornerConnected(level, geom, scale=0.5, stopvertex=null) {
    let base = new THREE.Mesh(geom, materials[level]);
    if (level > 0) {
        // for each vertex v, reflect geometry across v
        // in a scaled coordinate system
        let vertices = geom.vertices;     
        for (let v of vertices) {
            if (stopvertex && v.equals(stopvertex))
                continue;
            let newGeom = geom.clone();
            // add vertices to new geometry: v + scale * (v - w)
            newGeom.vertices.length = 0;
            for (let w of vertices) {
                let wp = v.clone();
                wp.sub(w);
                wp.multiplyScalar(scale);
                wp.add(v);
                newGeom.vertices.push(wp);
            }
            // newGeom.computeFlatVertexNormals();
            let newFractal = makeCornerConnected(level-1, newGeom, scale, v);
            base.add(newFractal);
        }   
    }
    return base;
}



var controls = new function() {
    this.nbrLevels = 2;
    this.opacity = 1.0;
    this.color = '#3366ff';
    this.scale = 0.5;
    this.Stellate = function () { updateGeometry(true) };
    this.shape = 'Tetrahedron';
    this.doubleSided = true;
    this.randomColors = false;
    this.Randomize = genRandomColors;
}

function initGui() {
    var gui = new dat.GUI();
    gui.add(controls, 'nbrLevels', 0, maxLevels).step(1).onChange(update);

    gui.add(controls, 'scale', 0.1, 0.9).step(0.1).onChange(update);
    let objectTypes =  ['Tetrahedron', 'Box', 'Octahedron', 'Icosahedron'];
    let typeItem = gui.add(controls, 'shape', objectTypes).onChange(updateGeometry);
    gui.add(controls, 'Stellate');
    let f1 = gui.addFolder('Appearance');
    f1.open();
    f1.addColor(controls, 'color');
    f1.add(controls, 'opacity', 0.1, 1.0).step(0.1).onChange(function () {
        for (let mat of materials)
            mat.opacity = controls.opacity;
    });
    f1.add(controls, 'doubleSided').onChange(function (flag) {
        let sidedness = (flag) ? THREE.DoubleSide : THREE.FrontSide;
        for (let mat of materials)
            mat.side = sidedness;
    });
    f1.add(controls, 'randomColors').onChange(genColors);
    f1.add(controls, 'Randomize');
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

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);
    if ((lastColor !== controls.color) && !controls.randomColors) {
        let color = new THREE.Color(controls.color);
        for (let mat of materials)
            mat.color = color;
        lastColor = controls.color;
    }
    renderer.render(scene, camera);
}

let maxNbrStellateVertices = 8;
let stellateMin = 0.1, stellateMax = 2.0;

function updateGeometry(stellate=false) {
    let maxN = maxNbrStellateVertices;
    switch (controls.shape) {
        case 'Tetrahedron':  geom = new THREE.TetrahedronGeometry(len);
                             maxN = 4;
                        break;
        case 'Box':   geom = new THREE.BoxGeometry(len, len, len);
                        break;
        case 'Octahedron': geom = new THREE.OctahedronGeometry(len);
                        break;
        case 'Dodecadron': geom = new THREE.DodecahedronGeometry(len);
                        break;
        case 'Icosahedron': geom = new THREE.IcosahedronGeometry(len);
                        break;
    }
    if (stellate == true) {
        let nbrStellateVertices = MyUtils.getRandomInt(2, maxN);
        let n = geom.vertices.length;
        let vals = [...Array(n).keys()];
        shuffle(vals);
        for (let i = 0; i < nbrStellateVertices; i++) {
            let r = MyUtils.getRandomFloat(stellateMin, stellateMax);
            geom.vertices[vals[i]].multiplyScalar(r);
        }
    }
    update();
}

function update() {
    if (fractal)
        scene.remove(fractal);
    fractal = makeCornerConnected(controls.nbrLevels, geom, controls.scale, null);
    scene.add(fractal);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function updateOpacity() {
    let opacity = controls.opacity;
    mat.opacity = opacity;
    for (let m of randomMats)
        m.opacity = opacity;
}





function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(render);
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 8);
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



/***********
 * mandelbrotOrbitsB.js
 * M. Laszlo
 * December 2021
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

 
let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let polyline = null;

function createScene() {
    let grid = new THREE.GridHelper(10, 10, 0xff0000, 0x999999);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    let matArgs = {color: 0xeeeeee, transparent: true, opacity: 0.2};
    let mat = new THREE.MeshLambertMaterial(matArgs);
    let geom = new THREE.CircleGeometry(2, 48);
    scene.add(new THREE.Mesh(geom, mat));
    updatePolyline();
    let light = new THREE.PointLight(0xFFFFFF, 1, 1000 );
    light.position.set(0, 0, 10);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light); 
    scene.add(ambientLight);
}

const maxIters = 28;
let controls = new function() {
    this.iterations = 8;
    this.cr = 1.0;
    this.ci = 1.0;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'iterations', 4, maxIters).step(1).onChange(updatePolyline);
    gui.add(controls, 'cr', -2.0, 2.0).step(0.01).onChange(updatePolyline);
    gui.add(controls, 'ci', -2.0, 2.0).step(0.01).onChange(updatePolyline);
}

function updatePolyline() {
    let root = new THREE.Object3D();
    scene.remove(polyline);
    // the lines
    let pts = generatePoints();
    let geom = new THREE.BufferGeometry().setFromPoints(pts);
    let matArgs = {color: 0xffffff, linewidth: 4.0};
    let mat = new THREE.LineBasicMaterial(matArgs);
    root.add(new THREE.Line(geom, mat));
    // the points
    let vertices = [];
    let colors = [];
    let color = new THREE.Color(0.75, 0.3, 0.0);
    for (let p of pts) {
        vertices.push(p.x, p.y, 0.01);
        colors.push(color.r, color.g, color.b);
    }
    geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    matArgs = {vertexColors: true, size: 0.2}
    mat = new THREE.PointsMaterial(matArgs);
    root.add(new THREE.Points(geom, mat));
    polyline = root;
    scene.add(root);
}

    var vertexMaterial = new THREE.PointsMaterial( {
        size: 1,
        vertexColors: THREE.VertexColors,
        transparent: true,
            opacity: 1
    } );

function generatePoints() {
    let n = controls.iterations;
    let cr = controls.cr;
    let ci = controls.ci;
    let zr = 0.0;
    let zi = 0.0;
    let pts = [new THREE.Vector3(zr, zr, 0.01)];
    for (let i = 0; i < n; i++) {
        let zr2 = zr * zr;
        let zi2 = zi * zi;
        zi = 2.0 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        if (zr2 + zi2 > 20)
            break;
        pts.push(new THREE.Vector3(zr, zi, 0.01));
    }
    return pts;
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
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 14);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.near = 0.01;

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

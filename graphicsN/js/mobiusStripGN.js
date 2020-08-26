/***********
 * mobiusStripFN.js
 * M. Laszlo
 * July 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';


let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();

let subject = new MyUtils.Subject();

let radius = 12;
let mobiusHeight = 6;
let heightSegments = 14;
let nbrSegments = 600;
let mobius;
let nbrTwists = 1;
let ball;
let ballRadius = 0.5;
let mepsilon = 0.001, bepsilon = 0.05;

function createScene() {
    ball = makeBall(ballRadius);
    ball.update = makeMoveBall(radius, nbrTwists, ballRadius + bepsilon, mobiusHeight);
    updateMobius();
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light.position.set(20, 0, 0);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light2.position.set(-10, -20, 20);
    let light3 = new THREE.PointLight(0xFFFFFF, 1.0, 1000 );
    light3.position.set(-10, 20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2);
    scene.add(light3);
    scene.add(ambientLight);
}

const zAxis = new THREE.Vector3(0, 0, 1);
const yAxis = new THREE.Vector3(0, 1, 0);

function makeMobiusParametricSurface(radius, ntwists, height) {
    // parametric equation of mobius with ntwists
    // cylinder: ntwists==0;  mobius: ntwists==1
    // right-handed: ntwists > 0; left-handed: ntwists < 0
    // we perform pi*ntwists in total
    const halfHeight = height / 2;
    const totalTwists = Math.PI * ntwists;
    function f(u, v, res) {
        let zTheta = totalTwists * u;
        let yTheta = 2 * Math.PI * u;
        let y = -halfHeight + v * height;
        res.set(0, y, 0);
        res.applyAxisAngle(zAxis, zTheta);
        res.applyAxisAngle(yAxis, -yTheta);
        let sinTheta = Math.sin(yTheta);
        let cosTheta = Math.cos(yTheta);
        res.add(new THREE.Vector3(radius * cosTheta, 0, radius * sinTheta));
    }
    return f;
}


function makeMobiusStripGeometry(radius, ntwists, height, radialSegs, heightSegs) {
    let f = makeMobiusParametricSurface(radius, ntwists, height);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}

function makeBall(radius=0.5) {
    let geom = new THREE.SphereGeometry(radius, 24, 24);
    let matArgs = {color: 0xff0000};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let ball = new THREE.Mesh(geom, mat);
    // ball properties for movement
    ball.userData.pps = 0.1;
    ball.userData.pos = new THREE.Vector2(0, 0.5);
    ball.userData.dir = new THREE.Vector2(1, 0);
    return ball;
}



let controls = new function() {
    this.nbrTwists = 1;
    this.nbrSegments = 40;
    this.color1 = '#1562c9';
    this.color2 = '#ffffff';
    this.ball = false;
    this.v = 0.5;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'nbrTwists', -25, 25).step(1).name('half twists').onChange(updateMobius);
    gui.addColor(controls, 'color1').onChange(updateColor);
    gui.addColor(controls, 'color2').onChange(updateColor);
    gui.add(controls, 'ball').onChange(updateBall).listen();
    gui.add(controls, 'v', 0.1, 0.9).step(0.1).onChange(updateBall);
}

function updateColor() {
    if (mobius) {
        let colors = [new THREE.Color(controls.color1), new THREE.Color(controls.color2)];
        for (let i = 0; i < 2; i++) {
            let mat = mobius.children[i].material;
            mat.color = colors[i];
        }
    }
}

function updateBall() {
    let v = controls.v;
    let u = ball.userData.pos.x;
    ball.userData.pos.set(u, v);
    if (controls.ball) {
        subject.register(ball);
        scene.add(ball);
    } else {
        scene.remove(ball);
        subject.unregister(ball);
    }
}

let normalSign = 1;

function makeMoveOnParametricSurface(f, offset, eps=0.01, klein=false) {
    // f(u,v) defines parametric surface
    // offset amount from surface along normal
    // assumes n-twist klein-or-cylinder strip
    return function(delta) {
        let pps = this.userData.pps; // positions/sec
        let pos = this.userData.pos.clone(); // uv coordinates
        let dir = this.userData.dir.clone(); // unit direction of ball in uv coordinates
        dir.multiplyScalar(delta * pps);
        pos.add(dir);
        // torus wraparound
        if (pos.y >= 1) {
            pos.y = pos.y - 1;
        } else if (pos.y < 0) {
            pos.y = pos.y + 1;
        }
        if (pos.x >= 1) {
            pos.x = pos.x - 1;
            if (klein) {
                pos.y = 1 - pos.y;
                normalSign *= -1;
            }
        } 
        let p = new THREE.Vector3(),
            px = new THREE.Vector3(),
            py = new THREE.Vector3();
        f(pos.x, pos.y, p); // p is current point on surface
        let posx = Math.min(1, pos.x + eps);
        f(posx, pos.y, px);
        px.sub(p); 
        let posy = Math.min(1, pos.y + eps);
        f(pos.x, posy, py);
        py.sub(p);
        let normal = new THREE.Vector3().crossVectors(px, py);
        normal.normalize();
        normal.multiplyScalar(normalSign * offset);
        // save current position on surface
        this.userData.pos.set(pos.x, pos.y);
        // update position above surface
        p.add(normal);
        this.position.set(p.x, p.y, p.z);
    }
}


function makeMoveBall(radius, nbrTwists, ballRadius, height) {
    let parametricSurfaceFunction = makeMobiusParametricSurface(radius, nbrTwists, height);
    let klein = (Math.abs(nbrTwists) % 2) == 1;
    return makeMoveOnParametricSurface(parametricSurfaceFunction, ballRadius, mepsilon, klein);
}




function updateMobius() {
    let nbrTwists = controls.nbrTwists;
    let color1 = controls.color1;
    let color2 = controls.color2;
    scene.remove(mobius);
    let geom = makeMobiusStripGeometry(radius, nbrTwists, mobiusHeight, nbrSegments, heightSegments);
    let matArgs1 = {side: THREE.FrontSide, shininess:50, color: color1};
    let mat1 = new THREE.MeshPhongMaterial(matArgs1);
    let mesh1 = new THREE.Mesh(geom, mat1);
    let matArgs2 = {side: THREE.BackSide, shininess: 50, color: color2};
    let mat2 = new THREE.MeshPhongMaterial(matArgs2);
    let mesh2 = new THREE.Mesh(geom, mat2);
    mobius = new THREE.Object3D();
    mobius.add(mesh1, mesh2);
    scene.add(mobius);
    ball.update = makeMoveBall(radius, nbrTwists, ballRadius + bepsilon, mobiusHeight);
    updateBall();
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
        subject.notify(delta);
        cameraControls.update();
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 36);
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



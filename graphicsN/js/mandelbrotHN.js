/***********
 * mandelbrotHN.js
 * M. Laszlo
 * January 2022
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

 
let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let landscape;


function createScene() {
    let limit = 8;
    landscape = makeMandelbrotLandscape(limit, 0.01);
    scene.add(landscape);
}

function makeMandelbrotLandscape(limit, zscale=1.0) {
    let colors = updateColors();
    let plane = new THREE.PlaneBufferGeometry(1.5, 1.4, 1, 1);
    let mat = new THREE.ShaderMaterial(makeShaderMaterialArgs(colors, limit));
    let mesh = new THREE.Mesh(plane, mat);
    return mesh;
}

function updateColors() {
    let levels = controls.levels;
    let colors = [];
    if (controls.colorModel == 'rainbow') {
        for (let i = 0; i <= levels; i++) {
            let c = new THREE.Color();
            c.setHSL(i/levels, 1.0, 0.5);
            colors.push(c);
        }
    } else if (controls.colorModel == 'binary') {
        let color1 = new THREE.Color(controls.color1);
        let color2 = new THREE.Color(controls.color2);
        if ((levels%2) == 0)
            [color1, color2] = [color2, color1];
        for (let i = 0; i <= levels; i++) {
            colors.push((i%2 == 0) ? color1 : color2);
        }
    } else {  // colorModel == 'gradient'
        let color1 = new THREE.Color(controls.color1);
        let color2 = new THREE.Color(controls.color2);
        let inc = 1.0 / levels;
        for (let i = 0, f = 0.0; i <= levels; i++, f += inc) {
            let color = new THREE.Color(color1);
            color.lerp(color2, f*f)
            colors.push(color);
        }
    }
    return colors;
}



function makeShaderMaterialArgs(colors, limit) {
    return {
      uniforms: {
        colors: {
            value: colors
        }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colors[${limit+1}];
        varying vec2 vUv;

        vec4 mandelbrot(vec2 c) {
            float cr = c.x;
            float ci = c.y;
            float zr = 0.0;
            float zi = 0.0;
            for (int i = 0; i < ${limit}; i++) {
                // (zr,zi) = (zr,zi)**2 + c
                float zr2 = zr * zr;
                float zi2 = zi * zi;
                zi = 2.0 * zr * zi + ci;
                zr = zr2 - zi2 + cr;
                // has (zr,zi) escaped?
                if (zr2 + zi2 > 4.0)
                    return vec4(colors[i], 1.0);
            }
            return vec4(colors[${limit}], 1.0);
        }
        
        void main() {
            float posx = 3.0 * vUv.x - 2.0;
            float posy = 2.8 * vUv.y - 1.4;
            vec2 pos = vec2(posx, posy);
            gl_FragColor = mandelbrot(pos);
        }
      `,
      side: THREE.DoubleSide
    }
};

const maxLevels = 64;

let controls = new function() {
    this.levels = 8;
    this.colorModel = 'rainbow';
    this.color1 = '#1562c9';
    this.color2 = '#2ee288';
}
 
function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'levels', 2, maxLevels).step(1).onChange(updateShader);
    let colorModels = ['rainbow', 'binary', 'gradient'];
    gui.add(controls, 'colorModel', colorModels).onChange(updateShader);
    gui.addColor(controls, 'color1').onChange(updateShader);
    gui.addColor(controls, 'color2').onChange(updateShader);
}


function updateShader() {
    scene.remove(landscape);
    landscape = makeMandelbrotLandscape(controls.levels, 0.01);
    scene.add(landscape);
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
    camera.position.set(0, 0, 2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.near = 0.001;

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

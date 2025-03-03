import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VSMNetwork } from './VSMNetwork.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

let camera, scene, renderer, controls, stats;
let network;
let frameCount = 0;
let isInitialized = false;

init();

async function init() {
    // Show loading indicator
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.textContent = 'Initializing Network...';

    try {
        // Scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // Camera setup with better defaults for large networks
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);

        // Renderer setup with better performance settings
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 1);
        document.body.appendChild(renderer.domElement);

        // Performance monitoring
        stats = new Stats();
        stats.dom.style.cssText = 'position:absolute;top:60px;right:20px;z-index:10;';
        document.body.appendChild(stats.dom);

        // Controls setup with improved settings
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.screenSpacePanning = true;
        controls.panSpeed = 1.0;
        controls.minDistance = 2;
        controls.maxDistance = 20;
        controls.zoomSpeed = 1.2;

        // Initialize network
        loading.textContent = 'Creating Network...';
        network = new VSMNetwork(scene, camera);
        
        loading.textContent = 'Loading Network Data...';
        const initResult = await network.init();
        
        if (!initResult) {
            throw new Error('Network initialization failed');
        }

        // Enhanced GUI controls
        loading.textContent = 'Setting up Controls...';
        setupGUI();

        // Event listeners
        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('contextmenu', onContextMenu, false);
        window.addEventListener('click', onClick, false);

        // Start animation loop
        isInitialized = true;
        animate();

        // Force initial render
        renderer.render(scene, camera);

    } catch (error) {
        console.error('Initialization error:', error);
        loading.textContent = 'Error loading network. Please refresh the page.';
        alert('Failed to initialize network. Check console for details.');
    } finally {
        if (isInitialized) {
            loading.style.display = 'none';
        }
    }
}

function setupGUI() {
    const gui = new GUI();
    const guiControls = {
        search: '',
        zoomLevel: 5,
        showLabels: false,
        childCount: 6,
        clusterThreshold: 10,
        performance: {
            fps: 0,
            visibleNodes: 0,
            totalNodes: 0
        },
        autoCluster: true,
        refreshView: () => network.refreshView(),
        resetCamera: () => {
            camera.position.set(0, 0, 5);
            camera.lookAt(0, 0, 0);
            controls.reset();
        }
    };

    // Performance folder
    const perfFolder = gui.addFolder('Performance');
    perfFolder.add(guiControls.performance, 'fps').listen().disable();
    perfFolder.add(guiControls.performance, 'visibleNodes').listen().disable();
    perfFolder.add(guiControls.performance, 'totalNodes').listen().disable();
    perfFolder.close();

    // Visualization folder
    const visFolder = gui.addFolder('Visualization');
    visFolder.add(guiControls, 'showLabels').onChange(value => {
        network.toggleLabels(value);
    });
    visFolder.add(guiControls, 'clusterThreshold', 5, 50, 1).onChange(value => {
        network.clusterThreshold = value;
        if (guiControls.autoCluster) network.updateLOD();
    });
    visFolder.add(guiControls, 'autoCluster');
    visFolder.open();

    // Controls folder
    const controlsFolder = gui.addFolder('Controls');
    controlsFolder.add(controls, 'panSpeed', 0.1, 2);
    controlsFolder.add(controls, 'zoomSpeed', 0.1, 2);
    controlsFolder.add(guiControls, 'refreshView');
    controlsFolder.add(guiControls, 'resetCamera');
    controlsFolder.close();

    // Performance monitoring update
    setInterval(() => {
        if (!isInitialized) return;
        guiControls.performance.fps = Math.round(stats.getFPS());
        guiControls.performance.visibleNodes = network.visibleNodes.size;
        guiControls.performance.totalNodes = network.nodes.size;
    }, 1000);
}

function onWindowResize() {
    if (!isInitialized) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    if (!isInitialized) return;
    requestAnimationFrame(animate);
    frameCount++;
    
    // Update controls
    controls.update();
    
    // Only update visible nodes every other frame for better performance
    if (frameCount % 2 === 0) {
        network.updateVisibleNodes();
    }
    
    // Render scene
    renderer.render(scene, camera);
    
    // Update stats
    stats.update();
}

function onContextMenu(event) {
    if (!isInitialized) return;
    event.preventDefault();
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    network.showContextMenu(event.clientX, event.clientY, mouse, camera);
}

function onClick(event) {
    if (!isInitialized) return;
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    network.handleClick(mouse, camera);
} 
import * as THREE from 'three';
import { generatePolygon } from './geometry.js';
import { QuadTree } from './QuadTree.js';

export class VSMNetwork {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.nodes = new Map();
        this.raycaster = new THREE.Raycaster();
        this.contextMenu = document.getElementById('contextMenu');
        this.outlines = new Map(); // Track polygon outlines
        
        // Visualization settings
        this.minNodeSize = 0.1;    // Smaller minimum size
        this.maxNodeSize = 0.3;    // Smaller maximum size
        this.minEdgeLength = 0.5;  // Smaller minimum edge length
        this.maxEdgeLength = 1.5;  // Smaller maximum edge length
        this.viewportPadding = 1.2;
        
        // Track viewport state
        this.visibleNodes = new Set();
        this.currentViewCenter = new THREE.Vector3();
        this.viewRadius = 5;

        // Add new properties for LOD and clustering
        this.clusters = new Map();
        this.lodLevels = {
            FULL: 0,    // Show all details
            MEDIUM: 1,  // Show simplified nodes
            LOW: 2      // Show clusters only
        };
        this.currentLOD = this.lodLevels.FULL;
        this.clusterThreshold = 10; // Number of nodes before clustering
        this.viewportRadius = 5;
        
        // Initialize clustering system
        this.quadtree = null;
        this.initQuadtree();

        // VSM specific properties
        this.selectedUtilityFunction = '';
        this.vsmSystems = {
            S5: new Set(),
            S4: new Set(),
            S3: new Set(),
            S3star: new Set(),
            S2: new Set(),
            S1: new Set()
        };
        
        // Initialize utility function selector
        this.initUtilitySelector();
        
        // Initialize the network
        this.init();
    }

    async init() {
        try {
            console.log('Initializing network...');
            
            // Try to load nodes from server
            const response = await fetch(`${window.SERVER_URL}/nodes`);
            if (!response.ok) {
                throw new Error('Server not available');
            }
            
            const nodes = await response.json();
            console.log('Loaded nodes from server:', nodes);
            
            if (Object.keys(nodes).length === 0) {
                console.log('No nodes found, creating seed node');
                const seedNode = await this.createSeedNode();
                // Create initial child nodes for the seed
                await this.addChildNodes(seedNode.tag, 6);
            } else {
                console.log('Creating nodes from server data');
                for (const nodeData of Object.values(nodes)) {
                    await this.createNodeFromData(nodeData);
                }
            }

            // Force scene update
            this.scene.updateMatrixWorld(true);
            this.camera.updateProjectionMatrix();
            
            // Initialize hover effects
            this.addHoverEffects();
            
            // Initial LOD update
            this.updateLOD();
            
            console.log('Network initialization complete');
            return true;

        } catch (error) {
            console.error('Network initialization error:', error);
            console.log('Creating local seed node as fallback');
            const seedNode = await this.createSeedNode();
            // Create initial child nodes for the seed
            await this.addChildNodes(seedNode.tag, 6);
        this.addHoverEffects();
            return true;
        }
    }

    async createSeedNode() {
        console.log('Creating seed node...');
        const tag = '0/0/1';
        const node = {
            tag: tag,
            position: new THREE.Vector3(0, 0, 0),
            layer: 0,
            polyOrder: 6,
            parent: null,
            name: tag,
            children: []
        };

        // Create a more visible seed node
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x4CAF50,
            transparent: false,
            opacity: 1.0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);
        mesh.userData.tag = tag;
        mesh.name = tag;

        node.mesh = mesh;
        this.nodes.set(tag, node);
        this.scene.add(mesh);

        // Add label
        this.addNodeLabel(node);
        this.visibleNodes.add(tag);

        console.log('Seed node created:', {
            node,
            meshPosition: mesh.position.clone(),
            sceneChildren: this.scene.children.length
        });

        // Try to save to server
        await this.saveSeedNodeToServer(node);
        
        return node;
    }

    async saveSeedNodeToServer(node) {
        try {
            const nodeData = {
                tag: node.tag,
                position: [node.position.x, node.position.y],
                layer: node.layer,
                polyOrder: node.polyOrder,
                parent: node.parent,
                name: node.name,
                children: node.children
            };

            const response = await fetch(`${window.SERVER_URL}/nodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nodeData)
            });

            if (!response.ok) {
                throw new Error('Failed to save seed node to server');
            }
            console.log('Seed node saved to server');
            return true;
        } catch (error) {
            console.warn('Could not save seed node to server:', error);
            return false;
        }
    }

    async addChildNodes(parentTag, count) {
        try {
        const parent = this.nodes.get(parentTag);
            if (!parent) {
                console.error('Parent node not found:', parentTag);
                return;
            }

            // Calculate positions using geometry logic
        const edgeLength = this.getEdgeLength(parent.layer);
            const vertices = generatePolygon(parent.position, edgeLength, count);

        // Create child nodes
            const newNodes = [];
            for (let i = 0; i < count; i++) {
            const newTag = `${parentTag}-${i + 1}`;
                const nodeData = {
                tag: newTag,
                    position: [vertices[i].x, vertices[i].y],
                    layer: parent.layer + 1,
                    polyOrder: count,
                parent: parentTag,
                name: newTag,
                children: []
            };

                // Create node locally
                const node = await this.createNodeFromData(nodeData);
                newNodes.push(node);
            parent.children.push(newTag);
            
                // Save to server
                try {
                    const encodedTag = parentTag.replace(/\//g, '|');
                    await fetch(`${window.SERVER_URL}/nodes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(nodeData)
                    });
                } catch (error) {
                    console.warn('Failed to save child node to server:', error);
                }
            }
            
            // Create outline
        const lineGeometry = new THREE.BufferGeometry();
        const points = [...vertices, vertices[0]].map(v => new THREE.Vector3(v.x, v.y, 0));
        lineGeometry.setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
                opacity: 0.5 
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        this.outlines.set(parentTag, line);
            
            return newNodes;
        } catch (error) {
            console.error('Failed to add child nodes:', error);
            throw error;
        }
    }

    getEdgeLength(layer) {
        const baseLength = this.maxEdgeLength / (layer + 1);
        return Math.max(baseLength, this.minEdgeLength);
    }

    getNodeSize(layer) {
        const baseSize = this.maxNodeSize / (layer + 1);
        return Math.max(baseSize, this.minNodeSize);
    }

    getNodeColor(layer) {
        const colors = [
            0x4CAF50, // Green
            0x2196F3, // Blue
            0xF44336, // Red
            0xFFC107, // Amber
            0x9C27B0, // Purple
            0x00BCD4, // Cyan
        ];
        return colors[layer % colors.length];
    }

    showContextMenu(x, y, mouse, camera) {
        this.raycaster.setFromCamera(mouse, camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        const menu = this.contextMenu;
        menu.innerHTML = '';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const clickedObject = intersects.find(intersect => intersect.object.userData.tag);
        
        if (clickedObject) {
            const tag = clickedObject.object.userData.tag;
            const node = this.nodes.get(tag);
            
            if (node) {
                // Add VSM specific menu items
                this.addMenuItem(`Node: ${node.tag}`);
                this.addMenuItem(`Layer: ${node.layer}`);
                
                // Add Child Nodes option
                this.addMenuItem('Add Child Nodes', () => {
                    // Hide context menu
                    menu.style.display = 'none';
                    
                    // Remove any existing dialogs
                    const existingDialog = document.querySelector('.node-dialog');
                    if (existingDialog) {
                        document.body.removeChild(existingDialog);
                    }

                    // Create a dialog for node count input
                    const dialog = document.createElement('div');
                    dialog.className = 'node-dialog';
                    dialog.innerHTML = `
                        <div class="dialog-content">
                            <h3>Add Child Nodes</h3>
                            <div class="input-group">
                                <label>Number of nodes (3-12):</label>
                                <input type="number" min="3" max="12" value="6" id="nodeCount">
                            </div>
                            <div class="dialog-buttons">
                                <button id="cancelBtn">Cancel</button>
                                <button id="confirmBtn">Add Nodes</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(dialog);

                    // Add event listeners
                    const input = dialog.querySelector('#nodeCount');
                    const confirmBtn = dialog.querySelector('#confirmBtn');
                    const cancelBtn = dialog.querySelector('#cancelBtn');

                    // Handle Enter key
                    input.addEventListener('keyup', (e) => {
                        if (e.key === 'Enter') {
                            const count = Math.min(12, Math.max(3, parseInt(input.value) || 6));
                            this.addChildNodes(tag, count);
                            document.body.removeChild(dialog);
                        }
                    });

                    confirmBtn.addEventListener('click', () => {
                        const count = Math.min(12, Math.max(3, parseInt(input.value) || 6));
                        this.addChildNodes(tag, count);
                        document.body.removeChild(dialog);
                    });

                    cancelBtn.addEventListener('click', () => {
                        document.body.removeChild(dialog);
                    });

                    // Close dialog when clicking outside
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            document.body.removeChild(dialog);
                        }
                    });

                    // Focus input
                    input.focus();
                });
                
                // VSM System menu
                const vsmMenu = document.createElement('div');
                vsmMenu.className = 'menu-item';
                vsmMenu.innerHTML = 'VSM Systems ►';
                const subMenu = document.createElement('div');
                subMenu.className = 'submenu';
                
                ['S5', 'S4', 'S3', 'S3*', 'S2', 'S1'].forEach(system => {
                    const item = document.createElement('div');
                    item.className = 'menu-item';
                    item.textContent = `View ${system} Topics`;
                    item.onclick = () => this.viewVSMSystem(node, system);
                    subMenu.appendChild(item);
                });
                
                vsmMenu.appendChild(subMenu);
                this.contextMenu.appendChild(vsmMenu);
                
                // Additional VSM actions
                this.addMenuItem('View System-In-Focus', () => this.viewSystemInFocus(node));
                this.addMenuItem('View Sub-Structure', () => this.viewSubStructure(node));
                this.addMenuItem('Trace Sub-Structure', () => this.traceRecursiveStructure(node));
                this.addMenuItem('Focus View', () => this.focusOnNode(tag));
                this.addMenuItem('Show Labels', () => this.toggleLabels(true));
            }
        } else {
            this.addMenuItem('Reset View', () => {
                this.camera.position.set(0, 0, 5);
                this.camera.lookAt(0, 0, 0);
            });
            this.addMenuItem('Hide Labels', () => this.toggleLabels(false));
        }

        menu.style.display = 'block';
    }

    addMenuItem(text, onClick) {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = text;
        if (onClick) {
            item.addEventListener('click', () => {
                onClick();
                this.contextMenu.style.display = 'none';
            });
        }
        this.contextMenu.appendChild(item);
    }

    handleClick() {
        this.contextMenu.style.display = 'none';
    }

    flashNode(tag) {
        const node = this.nodes.get(tag);
        if (!node) return;

        const originalScale = node.mesh.scale.x;
        const flash = () => {
            node.mesh.scale.set(3, 3, 3);
            setTimeout(() => {
                node.mesh.scale.set(originalScale, originalScale, originalScale);
            }, 250);
        };

        for (let i = 0; i < 5; i++) {
            setTimeout(flash, i * 500);
        }
    }

    refreshView() {
        // Remove all existing visual elements
        this.nodes.forEach(node => {
            if (node.label) this.scene.remove(node.label);
            if (node.connectionLine) this.scene.remove(node.connectionLine);
            if (node.mesh) this.scene.remove(node.mesh);
        });
        
        // Remove all outlines
        this.outlines.forEach(outline => {
            this.scene.remove(outline);
        });
        this.outlines.clear();

        // Recreate all visual elements with animations
        this.nodes.forEach(node => {
            // Recreate mesh
            const geometry = new THREE.SphereGeometry(this.getNodeSize(node.layer), 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: this.getNodeColor(node.layer) });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(node.position);
            mesh.scale.setScalar(0.01); // Start small
            mesh.userData.tag = node.tag;
            node.mesh = mesh;
            this.scene.add(mesh);

            // Animate scale up
            this.animateScale(mesh, 1.0, 500);

            // Recreate label
            this.addNodeLabel(node);
            if (node.label) {
                node.label.scale.setScalar(0.01);
                this.animateScale(node.label, 0.1, 500);
            }

            // Recreate connection line if not root
            if (node.parent) {
                const parentNode = this.nodes.get(node.parent);
                if (parentNode) {
                    this.addConnectionLine(node, parentNode);
                    if (node.connectionLine) {
                        node.connectionLine.material.opacity = 0;
                        this.animateOpacity(node.connectionLine.material, 0.5, 500);
                    }
                }
            }
        });
    }

    animateScale(object, targetScale, duration = 200) {
        const startScale = object.scale.x;
        const startTime = Date.now();
        
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress >= 1) {
                object.scale.setScalar(targetScale);
                return;
            }
            
            const currentScale = startScale + (targetScale - startScale) * this.easeInOutQuad(progress);
            object.scale.setScalar(currentScale);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    animateOpacity(material, targetOpacity, duration = 200) {
        const startOpacity = material.opacity;
        const startTime = Date.now();
        
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress >= 1) {
                material.opacity = targetOpacity;
                return;
            }
            
            material.opacity = startOpacity + (targetOpacity - startOpacity) * this.easeInOutQuad(progress);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    addNodeLabel(node) {
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: this.createTextSprite(node.tag),
                sizeAttenuation: false,
                transparent: true,
                opacity: 0.8
            })
        );
        
        // Adjust scale and position for better visibility
        sprite.scale.set(0.04, 0.02, 1);
        sprite.position.copy(node.position);
        sprite.position.x += 0.1;
        sprite.position.y += 0.1;
        node.label = sprite;
        this.scene.add(sprite);

        // Hide label by default for non-root nodes
        if (node.parent) {
            sprite.visible = false;
        }
    }

    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set high DPI
        const scale = window.devicePixelRatio || 1;
        canvas.width = 512 * scale;
        canvas.height = 128 * scale;
        context.scale(scale, scale);
        
        // Clear background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(context, 0, 0, 512, 128, 10);
        context.fill();
        
        // Draw crisp text
        context.font = `bold ${32 * scale}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';
        context.fillText(text, 256 * scale, 64 * scale);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    addConnectionLine(node, parentNode) {
        const geometry = new THREE.BufferGeometry();
        const points = [
            node.position,
            parentNode.position
        ];
        geometry.setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        node.connectionLine = line;
        this.scene.add(line);
    }

    searchNodes(searchTerm) {
        const results = [];
        this.nodes.forEach((node, tag) => {
            if (tag.toLowerCase().includes(searchTerm.toLowerCase()) || 
                node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push(node);
                this.highlightNode(node);
            } else {
                this.unhighlightNode(node);
            }
        });
        return results;
    }

    highlightNode(node) {
        const originalMaterial = node.mesh.material;
        node.mesh.material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        setTimeout(() => {
            node.mesh.material = originalMaterial;
        }, 2000);
    }

    unhighlightNode(node) {
        node.mesh.material = new THREE.MeshBasicMaterial({ 
            color: this.getNodeColor(node.layer) 
        });
    }

    addHoverEffects() {
        let hoveredNode = null;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        window.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.scene.children);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (object.userData.tag && object !== hoveredNode) {
                    if (hoveredNode) {
                        this.unhoverNode(hoveredNode);
                    }
                    hoveredNode = object;
                    this.hoverNode(object);
                }
            } else if (hoveredNode) {
                this.unhoverNode(hoveredNode);
                hoveredNode = null;
            }
        });
    }

    hoverNode(mesh) {
        const node = this.findNodeByMesh(mesh);
        if (!node) return;

        const scale = 1.3;
        this.animateScale(mesh, scale);
        
        if (node.label) {
            node.label.visible = true;
            this.animateScale(node.label, scale);
        }
        
        if (node.connectionLine) {
            node.connectionLine.material.opacity = 1.0;
            node.connectionLine.material.color.setHex(0x00ffff);
        }
    }

    unhoverNode(mesh) {
        const node = this.findNodeByMesh(mesh);
        if (!node) return;

        this.animateScale(mesh, 1.0);
        
        if (node.label && node.parent) {
            node.label.visible = false;
        }
        if (node.label && !node.parent) {
            this.animateScale(node.label, 1.0);
        }
        
        if (node.connectionLine) {
            node.connectionLine.material.opacity = 0.5;
            node.connectionLine.material.color.setHex(0xffffff);
        }
    }

    findNodeByMesh(mesh) {
        for (const [_, node] of this.nodes) {
            if (node.mesh === mesh) return node;
        }
        return null;
    }

    toggleLabels(visible) {
        this.nodes.forEach(node => {
            if (node.label) {
                node.label.visible = visible;
            }
        });
    }

    async setChildCount(parentTag, count) {
        const parent = this.nodes.get(parentTag);
        if (!parent) {
            console.error('Parent node not found:', parentTag);
            return;
        }

        try {
            // Store existing children before removal
            const existingChildren = new Set(parent.children);
            
            // Remove all existing children and their descendants
            existingChildren.forEach(childTag => {
                this.removeNodeAndChildren(childTag);
            });
            
            // Remove the outline
            if (this.outlines.has(parentTag)) {
                this.scene.remove(this.outlines.get(parentTag));
                this.outlines.delete(parentTag);
            }
            
            // Reset parent's children array
            parent.children = [];
            
            // Add new children with the specified count
            await this.addChildNodes(parentTag, count);
        } catch (error) {
            console.error('Error in setChildCount:', error);
            alert('Failed to update child nodes. Check console for details.');
        }
    }

    removeNodeAndChildren(tag) {
        const node = this.nodes.get(tag);
        if (!node) return;

        // First remove all children recursively
        [...node.children].forEach(childTag => {
            this.removeNodeAndChildren(childTag);
        });

        // Remove this node's visual elements
        if (node.label) this.scene.remove(node.label);
        if (node.connectionLine) this.scene.remove(node.connectionLine);
        if (node.mesh) this.scene.remove(node.mesh);
        
        // Remove outline if it exists
        if (this.outlines.has(tag)) {
            this.scene.remove(this.outlines.get(tag));
            this.outlines.delete(tag);
        }

        // Remove from nodes map
        this.nodes.delete(tag);
    }

    async loadNodesFromServer() {
        try {
            const response = await fetch(`${window.SERVER_URL}/nodes`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const nodes = await response.json();
            
            // Clear existing nodes
            this.clearAllNodes();
            
            // Create nodes in correct order (parents first)
            const createNode = (nodeData) => {
                if (nodeData.parent && !this.nodes.has(nodeData.parent)) {
                    const parentData = nodes[nodeData.parent];
                    if (parentData) {
                        createNode(parentData);
                    }
                }
                this.createNodeFromData(nodeData);
            };
            
            Object.values(nodes).forEach(createNode);
        } catch (error) {
            console.error('Failed to load nodes:', error);
            alert('Failed to connect to server. Check if the server is running.');
        }
    }

    clearAllNodes() {
        this.nodes.forEach(node => {
            if (node.label) this.scene.remove(node.label);
            if (node.connectionLine) this.scene.remove(node.connectionLine);
            if (node.mesh) this.scene.remove(node.mesh);
        });
        this.outlines.forEach(outline => {
            this.scene.remove(outline);
        });
        this.nodes.clear();
        this.outlines.clear();
    }

    createNodeFromData(nodeData) {
        return new Promise((resolve) => {
        const node = {
            ...nodeData,
            position: new THREE.Vector3(nodeData.position[0], nodeData.position[1], 0),
                children: nodeData.children || []
        };

        const geometry = new THREE.SphereGeometry(this.getNodeSize(node.layer), 32, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.getNodeColor(node.layer),
                transparent: true,
                opacity: 0.8
        });
            
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(node.position);
        mesh.userData.tag = node.tag;
        mesh.name = node.tag;

        node.mesh = mesh;
        this.nodes.set(node.tag, node);
        this.scene.add(mesh);

            // Add visual elements
        this.addNodeLabel(node);
        if (node.parent) {
            const parentNode = this.nodes.get(node.parent);
            if (parentNode) {
                this.addConnectionLine(node, parentNode);
            }
        }

            resolve(node);
        });
    }

    // Add method to check if a node is in view
    isNodeInView(node) {
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);

        return frustum.containsPoint(node.position);
    }

    // Add method to update visible nodes
    updateVisibleNodes() {
        // Update LOD first
        this.updateLOD();

        this.visibleNodes.clear();
        const viewportBounds = this.getViewportBounds();

        this.nodes.forEach((node, tag) => {
            const nodePosition = new THREE.Vector2(node.position.x, node.position.y);
            if (viewportBounds.containsPoint(nodePosition)) {
                this.visibleNodes.add(tag);
            }
        });

        // Update visibility based on current LOD
        if (this.currentLOD === this.lodLevels.FULL) {
            this.updateNodeVisibility();
        }

        // Update counter
        const counter = document.querySelector('.node-counter');
        counter.textContent = `Visible: ${this.visibleNodes.size} / Total: ${this.nodes.size} (LOD: ${
            this.currentLOD === this.lodLevels.FULL ? 'Full' :
            this.currentLOD === this.lodLevels.MEDIUM ? 'Medium' : 'Low'
        })`;
    }

    updateNodeVisibility() {
        const cameraPosition = new THREE.Vector2(this.camera.position.x, this.camera.position.y);
        
        this.nodes.forEach((node, tag) => {
            const nodePosition = new THREE.Vector2(node.position.x, node.position.y);
            const distance = nodePosition.distanceTo(cameraPosition);
            const isVisible = this.visibleNodes.has(tag);
            
            if (node.mesh) {
                node.mesh.visible = isVisible;
                if (isVisible) {
                    const scale = Math.max(0.3, 1 - distance / 20);
                node.mesh.scale.setScalar(scale);
                }
            }
            
            if (node.label) {
                node.label.visible = isVisible && distance < 10;
                if (node.label.visible) {
                    const labelScale = Math.max(0.2, 1 - distance / 15);
                    node.label.scale.set(0.04 * labelScale, 0.02 * labelScale, 1);
                }
            }
            
            if (node.connectionLine) {
                node.connectionLine.visible = isVisible;
                if (isVisible) {
                    node.connectionLine.material.opacity = Math.max(0.1, 1 - distance / 15);
                }
            }
        });
    }

    initQuadtree() {
        // Initialize empty quadtree
        const bounds = new THREE.Box2(
            new THREE.Vector2(-1000, -1000),
            new THREE.Vector2(1000, 1000)
        );
        this.quadtree = new QuadTree(bounds, 4); // Max 4 nodes per cell
    }

    updateQuadtree() {
        this.initQuadtree();
        this.nodes.forEach((node, tag) => {
            this.quadtree.insert({
                position: new THREE.Vector2(node.position.x, node.position.y),
                tag: tag
            });
        });
    }

    createCluster(nodes) {
        const center = new THREE.Vector3();
        nodes.forEach(node => {
            center.add(node.position);
        });
        center.divideScalar(nodes.length);

        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(center);
        
        // Add count label
        const countLabel = this.createTextSprite(`${nodes.length} nodes`);
        countLabel.position.copy(center);
        countLabel.position.y += 0.5;
        
        return {
            mesh,
            label: countLabel,
            nodes: nodes.map(n => n.tag),
            position: center
        };
    }

    updateLOD() {
        const distanceToCamera = this.camera.position.z;
        const previousLOD = this.currentLOD;

        // Update LOD based on camera distance
        if (distanceToCamera > 15) {
            this.currentLOD = this.lodLevels.LOW;
        } else if (distanceToCamera > 8) {
            this.currentLOD = this.lodLevels.MEDIUM;
        } else {
            this.currentLOD = this.lodLevels.FULL;
        }

        // Only update if LOD changed
        if (previousLOD !== this.currentLOD) {
            this.applyLOD();
        }
    }

    applyLOD() {
        switch (this.currentLOD) {
            case this.lodLevels.LOW:
                this.applyClustering();
                break;
            case this.lodLevels.MEDIUM:
                this.showSimplifiedNodes();
                break;
            case this.lodLevels.FULL:
                this.showFullDetail();
                break;
        }
    }

    applyClustering() {
        // Clear existing clusters
        this.clusters.forEach(cluster => {
            this.scene.remove(cluster.mesh);
            this.scene.remove(cluster.label);
        });
        this.clusters.clear();

        // Update quadtree
        this.updateQuadtree();

        // Find nodes in viewport
        const viewportBounds = this.getViewportBounds();
        const nodesInView = this.quadtree.query(viewportBounds);

        // Group nearby nodes
        const groups = this.groupNearbyNodes(nodesInView);

        // Create clusters for groups
        groups.forEach((group, index) => {
            if (group.length > this.clusterThreshold) {
                const nodeObjects = group.map(item => this.nodes.get(item.tag));
                const cluster = this.createCluster(nodeObjects);
                this.clusters.set(`cluster-${index}`, cluster);
                this.scene.add(cluster.mesh);
                this.scene.add(cluster.label);

                // Hide individual nodes
                group.forEach(item => {
                    const node = this.nodes.get(item.tag);
                    if (node.mesh) node.mesh.visible = false;
                    if (node.label) node.label.visible = false;
                    if (node.connectionLine) node.connectionLine.visible = false;
                });
            }
        });
    }

    groupNearbyNodes(nodes) {
        const groups = [];
        const processed = new Set();

        nodes.forEach(node => {
            if (processed.has(node.tag)) return;

            const group = [];
            const center = node.position;
            const radius = 2; // Clustering radius

            nodes.forEach(other => {
                if (!processed.has(other.tag) && 
                    center.distanceTo(other.position) <= radius) {
                    group.push(other);
                    processed.add(other.tag);
                }
            });

            if (group.length > 0) {
                groups.push(group);
            }
        });

        return groups;
    }

    showSimplifiedNodes() {
        // Show nodes with simplified visuals
        this.nodes.forEach(node => {
            if (node.mesh) {
                node.mesh.visible = true;
                node.mesh.scale.setScalar(0.7);
            }
            if (node.label) node.label.visible = false;
            if (node.connectionLine) node.connectionLine.visible = true;
        });

        // Hide clusters
        this.clusters.forEach(cluster => {
            cluster.mesh.visible = false;
            cluster.label.visible = false;
        });
    }

    showFullDetail() {
        // Show all node details
        this.nodes.forEach(node => {
            if (node.mesh) {
                node.mesh.visible = true;
                node.mesh.scale.setScalar(1.0);
            }
            if (node.label) node.label.visible = true;
            if (node.connectionLine) node.connectionLine.visible = true;
        });

        // Hide clusters
        this.clusters.forEach(cluster => {
            cluster.mesh.visible = false;
            cluster.label.visible = false;
        });
    }

    getViewportBounds() {
        // Calculate viewport bounds in world space
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);

        // Get camera position and direction
        const cameraPos = this.camera.position;
        const distance = this.camera.position.z;

        // Calculate viewport corners in world space
        const fov = this.camera.fov * Math.PI / 180;
        const aspect = this.camera.aspect;
        const height = 2 * Math.tan(fov / 2) * Math.abs(distance);
        const width = height * aspect;

        // Calculate viewport corners
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const bounds = new THREE.Box2(
            new THREE.Vector2(
                cameraPos.x - halfWidth,
                cameraPos.y - halfHeight
            ),
            new THREE.Vector2(
                cameraPos.x + halfWidth,
                cameraPos.y + halfHeight
            )
        );

        // Add padding
        const padding = Math.max(width, height) * 0.1;
        bounds.min.subScalar(padding);
        bounds.max.addScalar(padding);

        return bounds;
    }

    // Add method to focus on a specific node
    focusOnNode(tag) {
        const node = this.nodes.get(tag);
        if (!node) return;

        const targetPosition = node.position.clone();
        const distance = this.camera.position.z;
        
        // Animate camera movement
        const startPosition = this.camera.position.clone();
        const duration = 1000; // ms
        const startTime = Date.now();
        
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress >= 1) {
                this.camera.position.set(targetPosition.x, targetPosition.y, distance);
                return;
            }
            
            const t = this.easeInOutQuad(progress);
            this.camera.position.lerpVectors(startPosition, new THREE.Vector3(targetPosition.x, targetPosition.y, distance), t);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    initUtilitySelector() {
        const selector = document.getElementById('utilityFunction');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.selectedUtilityFunction = e.target.value;
                this.updateVisualizationForUtility();
            });
        }
    }
    
    updateVisualizationForUtility() {
        switch (this.selectedUtilityFunction) {
            case 'metabolic':
                this.showMetabolicPathways();
                break;
            case 'effectiveness':
                this.showOrganizationalEffectiveness();
                break;
            case 'efficiency':
                this.showOrganizationalEfficiency();
                break;
            case 'performance':
                this.showOrganizationalPerformance();
                break;
            case 'resource':
                this.showResourceBargain();
                break;
            case 'productive':
                this.showProductiveHours();
                break;
            case 'nonproductive':
                this.showNonProductiveHours();
                break;
        }
    }
    
    viewVSMSystem(node, system) {
        // Clear previous system highlights
        this.nodes.forEach(n => {
            if (n.mesh) n.mesh.material.color.setHex(this.getNodeColor(n.layer));
        });
        
        // Add node to system and highlight
        const systemSet = this.vsmSystems[system.replace('*', 'star')];
        if (systemSet) {
            systemSet.add(node.tag);
            if (node.mesh) {
                const color = this.getSystemColor(system);
                node.mesh.material.color.setHex(color);
            }
        }
    }
    
    getSystemColor(system) {
        const colors = {
            S5: 0xFF0000, // Red
            S4: 0x00FF00, // Green
            S3: 0x0000FF, // Blue
            'S3*': 0xFFFF00, // Yellow
            S2: 0xFF00FF, // Magenta
            S1: 0x00FFFF  // Cyan
        };
        return colors[system] || 0xFFFFFF;
    }
    
    viewSystemInFocus(node) {
        // Get DOM elements
        const vsmWindow = document.getElementById('vsmWindow');
        const systemName = document.getElementById('vsmSystemName');
        const canvas = document.getElementById('vsmCanvas');
        const ctx = canvas.getContext('2d');
        
        if (!vsmWindow || !canvas || !ctx) {
            console.error('VSM window elements not found');
            return;
        }

        // Show window first so dimensions are correct
        vsmWindow.style.display = 'block';

        // Initialize transform state
        const transform = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        // Get the container dimensions
        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        // Set canvas size to match container with device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerRect.width * dpr;
        canvas.height = containerRect.height * dpr;
        
        // Scale canvas CSS dimensions
        canvas.style.width = `${containerRect.width}px`;
        canvas.style.height = `${containerRect.height}px`;

        // Initial draw with automatic scaling to fit
        const redraw = () => {
            ctx.save();
            
            // Clear the canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply transformations
            ctx.translate(canvas.width/2 + transform.offsetX * dpr, canvas.height/2 + transform.offsetY * dpr);
            ctx.scale(transform.scale * dpr, transform.scale * dpr);
            
            // Draw the diagram
            this.drawVSMDiagram(ctx, node);
            
            ctx.restore();
        };

        // Initial automatic scaling to fit
        const autoFit = () => {
            const padding = 40; // pixels of padding
            const diagramHeight = (node.children?.length || 1) * 75 + 200; // Approximate diagram height
            const diagramWidth = 300; // Approximate diagram width
            
            const scaleX = (containerRect.width - padding * 2) / diagramWidth;
            const scaleY = (containerRect.height - padding * 2) / diagramHeight;
            transform.scale = Math.min(scaleX, scaleY, 2); // Limit max scale to 2
            
            // Center vertically with slight upward offset
            transform.offsetY = -diagramHeight * 0.1;
            
            redraw();
        };
        
        autoFit();

        // Add mouse wheel zoom handler
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate zoom
            const zoom = e.deltaY < 0 ? 1.1 : 0.9;
            const newScale = Math.min(Math.max(transform.scale * zoom, 0.5), 5);
            
            // Adjust offset to zoom towards mouse position
            if (newScale !== transform.scale) {
                const factor = 1 - newScale / transform.scale;
                transform.offsetX += (mouseX - canvas.width/2) * factor;
                transform.offsetY += (mouseY - canvas.height/2) * factor;
                transform.scale = newScale;
                redraw();
            }
        });

        // Add pan handlers
        canvas.addEventListener('mousedown', (e) => {
            transform.isDragging = true;
            transform.lastX = e.clientX;
            transform.lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (transform.isDragging) {
                const deltaX = e.clientX - transform.lastX;
                const deltaY = e.clientY - transform.lastY;
                transform.offsetX += deltaX;
                transform.offsetY += deltaY;
                transform.lastX = e.clientX;
                transform.lastY = e.clientY;
                redraw();
            }
        });

        const endDrag = () => {
            transform.isDragging = false;
            canvas.style.cursor = 'default';
        };

        canvas.addEventListener('mouseup', endDrag);
        canvas.addEventListener('mouseleave', endDrag);

        // Add close button handler
        const closeBtn = document.getElementById('vsmWindowClose');
        if (closeBtn) {
            closeBtn.onclick = () => {
                vsmWindow.style.display = 'none';
            };
        }

        // Add window click handler to close when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === vsmWindow) {
                vsmWindow.style.display = 'none';
            }
        });

        // Add escape key handler
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && vsmWindow.style.display === 'block') {
                vsmWindow.style.display = 'none';
            }
        });

        // Handle window resize
        const handleResize = () => {
            if (vsmWindow.style.display === 'block') {
                const newRect = container.getBoundingClientRect();
                canvas.width = newRect.width * dpr;
                canvas.height = newRect.height * dpr;
                canvas.style.width = `${newRect.width}px`;
                canvas.style.height = `${newRect.height}px`;
                autoFit(); // Re-fit the diagram when window is resized
            }
        };

        window.addEventListener('resize', handleResize);
    }

    drawVSMDiagram(ctx, node) {
        try {
            // Clear the canvas with a black background
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Base dimensions from MATLAB code
            const dims = {
                squareSize: 50,
                spacing: 20,  // Spacing between squares
                radius: 25,   // For S1 units
                circleSpacing: 75,  // Spacing between S1 units
                triangleHeight: 50,
                gap: 90,  // Increased gap for S3* and S2
                lineWidth: {
                    command: 1,
                    resource: 12,
                    audit: 1,
                    stability: 2
                }
            };

            // Calculate y-positions (from bottom to top)
            dims.y3 = ctx.canvas.height * 0.35;  // S3 position moved up
            dims.y2 = dims.y3 - dims.squareSize - dims.spacing;  // S4 position
            dims.y1 = dims.y2 - dims.squareSize - dims.spacing;  // S5 position

            // Calculate center x position
            dims.centerX = ctx.canvas.width / 2;

            // Calculate S1 positions
            dims.s1Count = node.children ? node.children.length : 0;
            dims.s1StartY = dims.y3 + dims.circleSpacing;

            // Draw vertical command and resource channels first (background)
            this.drawVSMConnections(ctx, dims);

            // Draw S3* and S2 triangles with proper isosceles shape
            const leftTriangleX = dims.centerX - dims.gap;
            const rightTriangleX = dims.centerX + dims.gap;
            this.drawTriangle(ctx, leftTriangleX, dims.y3 + dims.triangleHeight/4, dims.triangleHeight, 'S3*', '#4CAF50');
            this.drawTriangle(ctx, rightTriangleX, dims.y3 + dims.triangleHeight/4, dims.triangleHeight, 'S2', '#4CAF50');

            // Draw main systems (S5, S4, S3)
            this.drawSystem(ctx, dims.centerX - dims.squareSize/2, dims.y1, dims.squareSize, 'S5', '#FFFF00', node.name);
            this.drawSystem(ctx, dims.centerX - dims.squareSize/2, dims.y2, dims.squareSize, 'S4', '#FF0000');
            this.drawSystem(ctx, dims.centerX - dims.squareSize/2, dims.y3, dims.squareSize, 'S3', '#00FF00');

            // Draw homeostatic loops
            this.drawHomeostaticLoops(ctx, dims);

            // Draw S1 units and their environments
            if (dims.s1Count > 0) {
                for (let i = 0; i < dims.s1Count; i++) {
                    const yPos = dims.s1StartY + (i * dims.circleSpacing);
                    const childTag = node.children[i];
                    const childNode = this.nodes.get(childTag);
                    const name = childNode ? childNode.name : childTag;
                    
                    // Draw environment first (behind)
                    const envX = dims.centerX - dims.squareSize * 2.5;  // Move environments further left
                    this.drawEnvironment(ctx, envX, yPos, dims.squareSize * 2.5, dims.squareSize * 0.8);  // More elongated horizontally
                    
                    // Draw S1 unit
                    this.drawS1Unit(ctx, dims.centerX, yPos, dims.radius, name, '#FFFFFF');
                    
                    // Draw connection lines
                    ctx.beginPath();
                    ctx.moveTo(dims.centerX - dims.radius, yPos);
                    ctx.lineTo(envX + dims.squareSize * 1.25, yPos);  // Adjusted to meet environment
                    ctx.strokeStyle = '#808080';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Update info panel
            const infoPanel = document.getElementById('vsmInfo');
            if (infoPanel) {
                infoPanel.innerHTML = `
                    <strong>Node:</strong> ${node.name}<br>
                    <strong>Layer:</strong> ${node.layer}<br>
                    <strong>Children:</strong> ${dims.s1Count}
                `;
            }
        } catch (error) {
            console.error('Error in drawVSMDiagram:', error);
        }
    }

    drawSystem(ctx, x, y, size, label, color, name = '') {
        const halfSize = size / 2;
        
        // Draw filled background
        ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
        ctx.fillRect(x - halfSize, y - halfSize, size, size);
        
        // Draw border
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x - halfSize, y - halfSize, size, size);
        
        // Draw label
        ctx.fillStyle = color;
        ctx.font = `bold ${size * 0.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - size * 0.1);
        
        // Draw name if provided
        if (name) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${size * 0.15}px Arial`;
            ctx.fillText(name, x, y + size * 0.1);
        }
    }

    drawTriangle(ctx, x, y, size, label, color) {
        // Draw isosceles triangle
        const height = size;
        const base = size * 0.8;  // Narrower base for isosceles shape
        
        ctx.beginPath();
        ctx.moveTo(x, y - height/2);  // Top point
        ctx.lineTo(x - base/2, y + height/2);  // Bottom left
        ctx.lineTo(x + base/2, y + height/2);  // Bottom right
        ctx.closePath();
        
        // Fill with semi-transparent background
        ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = color;
        ctx.font = `bold ${size * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    drawS1Unit(ctx, x, y, radius, label, color) {
        // Draw filled circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = color;
        ctx.font = `${radius * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    drawEnvironment(ctx, x, y, width, height) {
        // Draw more elongated ellipse
        ctx.beginPath();
        ctx.ellipse(x, y, width/2, height/2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${height * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Environment', x, y);
    }

    drawVSMConnections(ctx, dims) {
        // Draw vertical command channel (yellow)
        ctx.beginPath();
        ctx.moveTo(dims.centerX + dims.squareSize * 0.25, dims.y1);
        ctx.lineTo(dims.centerX + dims.squareSize * 0.25, dims.s1StartY + (dims.s1Count - 1) * dims.circleSpacing);
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = dims.lineWidth.command;
        ctx.stroke();

        // Draw resource bargaining channel (green)
        ctx.beginPath();
        ctx.moveTo(dims.centerX - dims.squareSize * 0.25, dims.y1);
        ctx.lineTo(dims.centerX - dims.squareSize * 0.25, dims.s1StartY + (dims.s1Count - 1) * dims.circleSpacing);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = dims.lineWidth.resource;
        ctx.stroke();

        // Draw S3* and S2 connections to S3
        ctx.beginPath();
        ctx.moveTo(dims.centerX - dims.gap - dims.squareSize, dims.y3);
        ctx.lineTo(dims.centerX - dims.squareSize/2, dims.y3);
        ctx.moveTo(dims.centerX + dims.squareSize/2, dims.y3);
        ctx.lineTo(dims.centerX + dims.gap + dims.squareSize, dims.y3);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = dims.lineWidth.audit;
        ctx.stroke();

        // Draw S3* and S2 vertical lines
        ctx.beginPath();
        ctx.moveTo(dims.centerX - dims.gap - dims.squareSize, dims.y3);
        ctx.lineTo(dims.centerX - dims.gap - dims.squareSize, dims.s1StartY + (dims.s1Count - 1) * dims.circleSpacing);
        ctx.moveTo(dims.centerX + dims.gap + dims.squareSize, dims.y3);
        ctx.lineTo(dims.centerX + dims.gap + dims.squareSize, dims.s1StartY + (dims.s1Count - 1) * dims.circleSpacing);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = dims.lineWidth.stability;
        ctx.stroke();
    }

    drawHomeostaticLoops(ctx, dims) {
        const drawLoop = (x, y1, y2, color, thickness) => {
            // Calculate control points for smoother curves
            const controlDistance = dims.squareSize * 1.5;  // Increased curve radius
            const verticalOffset = dims.spacing * 0.5;  // Add vertical offset for oval shape
            
            // Draw filled background
            ctx.beginPath();
            ctx.moveTo(x, y1);
            // Left curve
            ctx.bezierCurveTo(
                x - controlDistance, y1,  // First control point
                x - controlDistance, y2,  // Second control point
                x, y2 + verticalOffset    // End point
            );
            // Right curve
            ctx.bezierCurveTo(
                x + controlDistance, y2,  // First control point
                x + controlDistance, y1,  // Second control point
                x, y1                     // End point
            );
            ctx.fillStyle = 'rgba(40, 40, 40, 0.4)';
            ctx.fill();
            
            // Draw curves with thicker lines
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.bezierCurveTo(
                x - controlDistance, y1,
                x - controlDistance, y2,
                x, y2 + verticalOffset
            );
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.bezierCurveTo(
                x + controlDistance, y1,
                x + controlDistance, y2,
                x, y2 + verticalOffset
            );
            ctx.stroke();
        };

        // Draw operations homeostat (green)
        drawLoop(dims.centerX - dims.squareSize * 0.4, dims.y2, dims.y3, '#00FF00', 20);
        
        // Draw strategy homeostat (red)
        drawLoop(dims.centerX + dims.squareSize * 0.4, dims.y2, dims.y3, '#FF0000', 20);
    }

    viewSubStructure(node) {
        // Show only the node and its descendants
        this.nodes.forEach(n => {
            const isDescendant = this.isDescendantOf(n.tag, node.tag);
            if (n.mesh) {
                n.mesh.visible = isDescendant || n.tag === node.tag;
            }
            if (n.connectionLine) {
                n.connectionLine.visible = isDescendant;
            }
            if (n.label) {
                n.label.visible = isDescendant || n.tag === node.tag;
            }
        });
    }
    
    isDescendantOf(childTag, parentTag) {
        let current = this.nodes.get(childTag);
        while (current && current.parent) {
            if (current.parent === parentTag) return true;
            current = this.nodes.get(current.parent);
        }
        return false;
    }
    
    traceRecursiveStructure(node) {
        // Create temporary lines to show structure
        const lines = [];
        const traceNode = (currentNode, color = 0xFFFFFF) => {
            currentNode.children.forEach(childTag => {
                const child = this.nodes.get(childTag);
                if (child) {
                    const geometry = new THREE.BufferGeometry();
                    const points = [
                        currentNode.position,
                        child.position
                    ];
                    geometry.setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.8,
                        linewidth: 2
                    });
                    const line = new THREE.Line(geometry, material);
                    this.scene.add(line);
                    lines.push(line);
                    
                    // Recursive trace with color variation
                    traceNode(child, new THREE.Color(color).offsetHSL(0.1, 0, 0).getHex());
                }
            });
        };
        
        traceNode(node);
        
        // Remove trace after delay
        setTimeout(() => {
            lines.forEach(line => {
                this.scene.remove(line);
                line.geometry.dispose();
                line.material.dispose();
            });
        }, 5000);
    }
} 
import * as THREE from 'three';

export function generatePolygon(center, edgeLength, polyOrder, layer = 0) {
    const vertices = [];
    const angleStep = (Math.PI * 2) / polyOrder;
    
    // Dynamic radius based on number of nodes and layer
    const baseRadius = edgeLength * (1 + (polyOrder / 12));  // Larger radius for more nodes
    const layerFactor = Math.max(0.5, 1 - (layer * 0.2));   // Decrease radius for deeper layers
    const radius = baseRadius * layerFactor;
    
    for (let i = 0; i < polyOrder; i++) {
        const angle = i * angleStep;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        vertices.push(new THREE.Vector2(x, y));
    }
    
    return vertices;
}

export function calculateRepulsionForce(nodeA, nodeB, minDistance) {
    const direction = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
    const distance = direction.length();
    
    if (distance < minDistance && distance > 0) {
        // Normalize direction and calculate force
        direction.normalize();
        const forceMagnitude = (minDistance - distance) / minDistance;
        return direction.multiplyScalar(forceMagnitude);
    }
    
    return new THREE.Vector3(0, 0, 0);
}

export function calculateAttractionForce(node, parent, targetDistance) {
    const direction = new THREE.Vector3().subVectors(parent.position, node.position);
    const distance = direction.length();
    
    if (distance > targetDistance) {
        direction.normalize();
        const forceMagnitude = (distance - targetDistance) / targetDistance;
        return direction.multiplyScalar(forceMagnitude * 0.5); // Weaker than repulsion
    }
    
    return new THREE.Vector3(0, 0, 0);
} 
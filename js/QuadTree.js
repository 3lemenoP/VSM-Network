import * as THREE from 'three';

export class QuadTree {
    constructor(bounds, capacity) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
        this.northwest = null;
        this.northeast = null;
        this.southwest = null;
        this.southeast = null;
    }

    subdivide() {
        const x = this.bounds.min.x;
        const y = this.bounds.min.y;
        const w = (this.bounds.max.x - this.bounds.min.x) / 2;
        const h = (this.bounds.max.y - this.bounds.min.y) / 2;

        const nw = new THREE.Box2(
            new THREE.Vector2(x, y + h),
            new THREE.Vector2(x + w, this.bounds.max.y)
        );
        const ne = new THREE.Box2(
            new THREE.Vector2(x + w, y + h),
            new THREE.Vector2(this.bounds.max.x, this.bounds.max.y)
        );
        const sw = new THREE.Box2(
            new THREE.Vector2(x, y),
            new THREE.Vector2(x + w, y + h)
        );
        const se = new THREE.Box2(
            new THREE.Vector2(x + w, y),
            new THREE.Vector2(this.bounds.max.x, y + h)
        );

        this.northwest = new QuadTree(nw, this.capacity);
        this.northeast = new QuadTree(ne, this.capacity);
        this.southwest = new QuadTree(sw, this.capacity);
        this.southeast = new QuadTree(se, this.capacity);
        this.divided = true;

        // Move existing points to children
        this.points.forEach(point => {
            this.insertToChildren(point);
        });
        this.points = [];
    }

    insert(point) {
        if (!this.bounds.containsPoint(point.position)) {
            return false;
        }

        if (this.points.length < this.capacity && !this.divided) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return this.insertToChildren(point);
    }

    insertToChildren(point) {
        return (
            this.northwest.insert(point) ||
            this.northeast.insert(point) ||
            this.southwest.insert(point) ||
            this.southeast.insert(point)
        );
    }

    query(range, found = []) {
        if (!this.bounds.intersectsBox(range)) {
            return found;
        }

        this.points.forEach(point => {
            if (range.containsPoint(point.position)) {
                found.push(point);
            }
        });

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }

    clear() {
        this.points = [];
        this.divided = false;
        this.northwest = null;
        this.northeast = null;
        this.southwest = null;
        this.southeast = null;
    }
} 
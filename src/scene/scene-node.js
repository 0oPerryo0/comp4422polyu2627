import { Mat4 } from '../math/index.js';

export class SceneNode {
    constructor(name, body = null) {
        this.name = name;
        this.body = body;
        this.parent = null;
        this.children = [];
        this.localMatrix = Mat4.identity();
        this.worldMatrix = Mat4.identity();
        this.normalMatrix = Mat4.identity();
        this.baseLocal = null;
        this.userData = {};
    }

    add(child) {
        child.parent = this;
        this.children.push(child);
        return child;
    }

    updateWorldMatrix(parentWorld = Mat4.identity()) {
        this.worldMatrix = Mat4.multiply(parentWorld, this.localMatrix);
        const inv = Mat4.invert(this.worldMatrix);
        this.normalMatrix = inv ? Mat4.transpose(inv) : Mat4.identity();
        for (const child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }

    traverse(fn) {
        fn(this);
        for (const child of this.children) child.traverse(fn);
    }
}
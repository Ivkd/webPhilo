export class ParticleSystem {
    constructor(group, count, speed) {
        this.group = group;
        this.count = count;
        this.speed = speed;
        this.particlesData = [];
        this.linesMesh = this.createLinesMesh();
        this.group.add(this.linesMesh);
        this.createParticles();
    }

    createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
        gradient.addColorStop(0.2, 'rgba(0, 242, 255, 0.8)'); 
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); 
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    createParticles() {
        const texture = this.createCircleTexture();
        const material = new THREE.SpriteMaterial({ 
            map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false 
        });

        for (let i = 0; i < this.count; i++) {
            const sprite = new THREE.Sprite(material);
            sprite.position.set((Math.random()-0.5)*3500, (Math.random()-0.5)*2500, (Math.random()-0.5)*5000);
            sprite.scale.setScalar(Math.random() * 20 + 5);
            const velocity = new THREE.Vector3((Math.random()-0.5)*this.speed, (Math.random()-0.5)*this.speed, (Math.random()-0.5)*this.speed);
            this.group.add(sprite);
            this.particlesData.push({ mesh: sprite, velocity });
        }
    }

    createLinesMesh() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending });
        return new THREE.LineSegments(geometry, material);
    }

    update() {
        const positions = [];
        const colors = [];
        const maxDist = 700;
        const minDist = 150;

        for (let i = 0; i < this.particlesData.length; i++) {
            const p1 = this.particlesData[i];
            p1.mesh.position.add(p1.velocity);

            if (Math.abs(p1.mesh.position.x) > 2500) p1.velocity.x *= -1;
            if (Math.abs(p1.mesh.position.y) > 2500) p1.velocity.y *= -1;
            if (Math.abs(p1.mesh.position.z) > 2500) p1.velocity.z *= -1;

            for (let j = i + 1; j < this.particlesData.length; j++) {
                const p2 = this.particlesData[j];
                const dist = p1.mesh.position.distanceTo(p2.mesh.position);
                if (dist < maxDist) {
                    let alpha = Math.max(0, Math.min(1, 1.0 - (dist - minDist) / (maxDist - minDist))) * 0.4;
                    positions.push(p1.mesh.position.x, p1.mesh.position.y, p1.mesh.position.z);
                    positions.push(p2.mesh.position.x, p2.mesh.position.y, p2.mesh.position.z);
                    for (let k = 0; k < 2; k++) colors.push(0, 0.95, 1.0, alpha);
                }
            }
        }
        this.linesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.linesMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        this.linesMesh.geometry.attributes.position.needsUpdate = true;
        this.linesMesh.geometry.attributes.color.needsUpdate = true;
    }
}
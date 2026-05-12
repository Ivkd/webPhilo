import { initEngine } from './engine.js';
import { ParticleSystem } from './particles.js';
import { createMainNodes } from './nodes.js';
import { Navigation } from './navigation.js';

const CONFIG = {
    thresholdRatio: 0.10,
    desktop: { offsetX: 0, offsetY: 0, offsetZ: 1200 },
    mobile: { offsetX: 0, offsetY: 0, offsetZ: 1500 },
    transitionDuration: 1.2, // Длительность перехода между страницами
    pullStrength: 1.2, // Сила притяжения при навигации
    maxPullLerp: 0.4, // Максимальная сила притяжения при навигации
    startCameraPos: { x: 0, y: 500, z: 4000 },
    count_particles: 500,
    speed_particles: 0.7
};

const { scene, camera, renderer, group } = initEngine();
const particles = new ParticleSystem(group, CONFIG.count_particles, CONFIG.speed_particles);
const nodes = createMainNodes(scene);
const nav = new Navigation(camera, nodes, scene, CONFIG);

// Начальное состояние
camera.position.set(CONFIG.startCameraPos.x, CONFIG.startCameraPos.y, CONFIG.startCameraPos.z);
nav.navigate('intro');

function animate() {
    requestAnimationFrame(animate);
    particles.update();
    group.rotation.y += 0.00005;
    renderer.render(scene, camera);
}

animate();
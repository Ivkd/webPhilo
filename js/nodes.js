function generateNoise(length) {
    const chars = "01011101001";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

export function createMainNodes(scene) {
    const nodes = {};
    const pointsData = {
        intro:        { x: 600,  y: 500,  z: 2000,  label: "ВВЕДЕНИЕ" },
        society:      { x: -700, y: 200,  z: 1200,  label: "ОБЩЕСТВО" },
        structure:    { x: 150,  y: -600, z: 150,   label: "СОЦ. СТРУКТУРА" },
        dynamics:     { x: -500, y: -100, z: -750,  label: "ВИЗУАЛИЗАЦИЯ" },
        global:       { x: 900,  y: 600,  z: -1400, label: "ГЛОБАЛИЗАЦИЯ" },
        info_society: { x: -200, y: 800,  z: -2200, label: "ИНФ. ОБЩЕСТВО" },
        conclusion:   { x: 400,  y: -300, z: -3000, label: "ЗАКЛЮЧЕНИЕ" }
    };

    Object.keys(pointsData).forEach((key) => {
        const p = pointsData[key];
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
            map: texture, transparent: true, depthTest: false 
        }));
        
        sprite.position.set(p.x, p.y, p.z);
        sprite.scale.set(400, 100, 1);
        sprite.userData.pageKey = key;
        sprite.userData.fullText = p.label; // Сохраняем правильный текст

        // Метод отрисовки, который мы будем вызывать из Navigation.js
        sprite.userData.updateLabel = (text) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "Bold 55px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 15; 
            ctx.shadowColor = "#00f2ff";
            ctx.fillStyle = "#00f2ff";
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            texture.needsUpdate = true;
        };

        // Изначально показываем зашифрованный текст
        sprite.userData.updateLabel(generateNoise(p.label.length));

        scene.add(sprite);
        nodes[key] = sprite; // Теперь возвращаем сам объект спрайта, а не только позицию
    });

    return nodes;
}
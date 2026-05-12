const WAVE_CONFIG = {
    WAVE_COUNT: 3,               
    LINES_PER_WAVE: 45,          // Чуть меньше линий для чистоты кадра
    LINE_LENGTH: 6000,           
    LINE_WIDTH: 0.6,            // Тоньше = элегантнее
    
    // Палитра (будем выбирать случайно в initWaves)
    COLORS: [
        'rgba(100, 160, 255, 0.12)', 
        'rgba(140, 180, 255, 0.08)', 
        'rgba(80, 130, 240, 0.15)'
    ],

    CENTER_Y_FACTOR: 0.5,        
    LINE_SPACING: 10,           // Плотные пучки выглядят как ленты
    
    // Настройки идеальной кривизны
    AMPLITUDE_BASE: 700,         
    AMPLITUDE_RANGE: 900,        
    FREQUENCY_BASE: 0.0015,      
    FREQUENCY_VAR: 0.002,        
    
    // Гармоники (создают ту самую "кривизну")
    HARMONIC_FREQ_MULT: 2.8,     
    HARMONIC_AMP_MULT: 0.35,     
    
    LINE_PHASE_STEP: 0.04,       // Плавное расхождение линий
    
    SPEED_MIN: 0.0006,           // Медленное движение приятнее глазу
    SPEED_MAX: 0.0015,            
    ROTATION_SPEED: 0.00004,     
    
    DRAW_STEP: 17               
};

export class BackgroundWaves {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.canvas.style.display = 'block';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';

        this.waves = [];
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
        this.initWaves();
        this.animate();
    }

    resize() {
        const w = window.innerWidth;
        const page = document.getElementById('details-page');
        const h = page ? page.scrollHeight : window.innerHeight;

        this.width = this.canvas.width = w;
        this.height = this.canvas.height = h;
        
        if (this.waves.length > 0) this.initWaves();
    }

    initWaves() {
        this.waves = [];
        // Фокусируемся на центральной и левой части, где основной текст
        const zones = [
            { x: 0.2, y: 0.3, rot: 0.1 },  // Около заголовка
            { x: 0.5, y: 0.5, rot: -0.1 }, // Прямо под основным блоком
            { x: 0.8, y: 0.4, rot: 0.2 },  // Справа для баланса
            { x: 0.3, y: 0.7, rot: -0.2 }  // Снизу слева
        ];

        for (let i = 0; i < WAVE_CONFIG.WAVE_COUNT; i++) {
            const zone = zones[i % zones.length];
            this.waves.push({
                centerX: (this.width * zone.x),
                centerY: (this.height * zone.y),
                baseAmplitude: WAVE_CONFIG.AMPLITUDE_BASE + Math.random() * WAVE_CONFIG.AMPLITUDE_RANGE,
                amplitude: WAVE_CONFIG.AMPLITUDE_BASE,
                frequency: WAVE_CONFIG.FREQUENCY_BASE + Math.random() * WAVE_CONFIG.FREQUENCY_VAR,
                speed: WAVE_CONFIG.SPEED_MIN + Math.random() * (WAVE_CONFIG.SPEED_MAX - WAVE_CONFIG.SPEED_MIN),
                offset: Math.random() * Math.PI * 2,
                rotation: zone.rot,
                color: WAVE_CONFIG.COLORS[i % WAVE_CONFIG.COLORS.length]
            });
        }
    }

    drawWave(wave) {
        const { ctx } = this;
        const halfLength = WAVE_CONFIG.LINE_LENGTH / 2;

        ctx.save();
        ctx.translate(wave.centerX, wave.centerY);
        ctx.rotate(wave.rotation);

        for (let i = 0; i < WAVE_CONFIG.LINES_PER_WAVE; i++) {
            const lineOffsetPos = (i - WAVE_CONFIG.LINES_PER_WAVE / 2) * WAVE_CONFIG.LINE_SPACING;
            
            ctx.beginPath();
            
            const gradient = ctx.createLinearGradient(-halfLength, 0, halfLength, 0);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Полное исчезновение
            gradient.addColorStop(0.4, wave.color);
            gradient.addColorStop(0.6, wave.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = WAVE_CONFIG.LINE_WIDTH;

            for (let x = -halfLength; x <= halfLength; x += WAVE_CONFIG.DRAW_STEP) {
                const mainWave = Math.sin(x * wave.frequency + wave.offset + (i * WAVE_CONFIG.LINE_PHASE_STEP));
                const detailWave = Math.sin(x * wave.frequency * WAVE_CONFIG.HARMONIC_FREQ_MULT + wave.offset * 1.2) * WAVE_CONFIG.HARMONIC_AMP_MULT;
                
                // Основная формула Y
                const y = lineOffsetPos + (mainWave + detailWave) * wave.amplitude;
                
                if (x === -halfLength) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.waves.forEach(wave => {
            wave.offset += wave.speed;
            wave.rotation += WAVE_CONFIG.ROTATION_SPEED;
            
            // ЭФФЕКТ ДЫХАНИЯ: Амплитуда плавно меняется
            wave.amplitude = wave.baseAmplitude + Math.sin(wave.offset * 0.5) * 30;
            
            this.drawWave(wave);
        });
        requestAnimationFrame(() => this.animate());
    }
}
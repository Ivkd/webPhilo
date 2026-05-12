export class MapExplorer {
    constructor(container) {
        this.container = container;
        this.img = container.querySelector('img');
        
        this.img.onmousedown = (e) => {
            e.preventDefault(); // Запрещает браузеру "подхватывать" картинку для переноса
        };

        this.img.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        this.state = {
            scale: 0.6,
            posX: 0,
            posY: 0,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0
        };

        this.init();
    }

    init() {
        // ЗУМ
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.2 : 0.2;
            this.state.scale = Math.min(Math.max(0.5, this.state.scale + delta), 5);
            this.update();
        }, { passive: false });

        // ЗАЖАТИЕ МЫШИ
        this.container.addEventListener('mousedown', (e) => {
            this.state.isDragging = true;
            this.state.lastMouseX = e.clientX;
            this.state.lastMouseY = e.clientY;
            this.img.style.transition = 'none'; // Отключаем задержку при таскании
        });

        // ДВИЖЕНИЕ
        window.addEventListener('mousemove', (e) => {
            if (!this.state.isDragging) return;

            // Считаем, на сколько пикселей сдвинулась мышь с прошлого кадра
            const dx = e.clientX - this.state.lastMouseX;
            const dy = e.clientY - this.state.lastMouseY;

            this.state.posX += dx;
            this.state.posY += dy;

            this.state.lastMouseX = e.clientX;
            this.state.lastMouseY = e.clientY;

            this.update();
        });

        // ОТПУСКАНИЕ
        window.addEventListener('mouseup', () => {
            this.state.isDragging = false;
        });
    }

    update() {
        // translate(-50%, -50%) держит центр, а наши posX/Y двигают его
        this.img.style.transform = `translate(calc(-50% + ${this.state.posX}px), calc(-50% + ${this.state.posY}px)) scale(${this.state.scale})`;
    }

    reset() {
        this.scale = 0.5;

        this.translateX = (this.container.offsetWidth - this.img.offsetWidth * this.scale) / 2;
        this.translateY = (this.container.offsetHeight - this.img.offsetHeight * this.scale) / 2;

        this.updateTransform();

        this.state = { scale: 0.6, posX: 0, posY: 0, isDragging: false, lastMouseX: 0, lastMouseY: 0 };
        this.img.style.transition = 'transform 0.4s ease';
        this.update();
    }

    updateTransform() {
        // Применяем трансформацию
        this.img.style.transform = `translate(calc(-50% + ${this.state.posX}px), calc(-50% + ${this.state.posY}px)) scale(${this.state.scale})`;
    }

}
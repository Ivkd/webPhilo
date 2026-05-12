import { MapExplorer } from './MapExplorer.js';

export class MapOverlayController {
    constructor() {
        this.overlay = document.getElementById('map-overlay');
        if (!this.overlay) return;

        // 1. Ищем контейнер для зума (теперь это map-inner-container)
        const zoomArea = this.overlay.querySelector('.map-inner-container');
        
        // 2. Ищем саму картинку внутри этого контейнера
        // ВАЖНО: используем ID из вашего лога (#overlay-img)
        this.img = this.overlay.querySelector('#overlay-img');
        
        if (zoomArea && this.img) {
            this.explorer = new MapExplorer(zoomArea);
        } else {
            console.error("Не удалось найти .map-inner-container или #overlay-img");
        }

        this.closeBtn = this.overlay.querySelector('.inner-map-close');
        this.initEvents();
    }

    initEvents() {
        if (this.closeBtn) this.closeBtn.onclick = () => this.close();
        
        const bg = this.overlay.querySelector('.map-overlay-bg');
        if (bg) bg.onclick = () => this.close();
    }

    open(imageSrc) {
        // Проверяем, существует ли картинка перед тем, как менять src
        if (!this.img) {
            // Если вдруг this.img потерялся, пробуем найти его еще раз
            this.img = document.getElementById('overlay-img');
        }

        this.img.src = imageSrc;
        this.overlay.classList.add('active');

        requestAnimationFrame(() => {
            if (this.explorer) {
                this.explorer.reset(); 
            }
        });

        if (this.img) {
            this.img.src = imageSrc; // Теперь тут не будет ошибки
            this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            if (this.explorer) this.explorer.reset();
        } else {
            console.error("Ошибка: Элемент #overlay-img не найден в момент открытия!");
        }
    }

    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}
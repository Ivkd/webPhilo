import { pages, pageKeys } from './content.js';
import { MapOverlayController } from './MapOverlayController.js';
import { BackgroundWaves } from './BackgroundWaves.js';

const THEME_CONFIG = {
    teaserHeight: 100,
    fullViewRatio: 0.30,
    scrollSpeed: 0.3,
    returnThreshold: 150,
    bottomPadding: 800,
    clickTolerance: 10,
    animations: {
        cameraTransition: 1.2,
        returnEase: "back.out(1.2)",
        transitionEase: "expo.inOut"
    }
};

export class Navigation {
    constructor(camera, nodes, scene, config) {
        this.uiBlocked = true;
        this.camera = camera;
        this.nodes = nodes;
        this.scene = scene;
        this.config = config;
        
        this.currentIndex = 0;
        this.isNavigating = false;
        this.isDragging = false;
        this.startY = 0;
        this.startClickX = 0;
        this.startClickY = 0;
        this.dragDistance = 0;

        this.currentScrollY = 0;
        this.startScrollY = 0;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.mapController = new MapOverlayController();

        this.init();
    }

    init() {
        document.addEventListener('mousedown', (e) => this.onStart(e.clientY, e.clientX, e));
        document.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', () => this.onEnd());
        window.addEventListener('click', (e) => this.onClick(e));
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const isMapActive = document.querySelector('.map-overlay.active');
                if (!isMapActive) this.closeDetails();
            }
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.onclick = (e) => { 
                e.preventDefault();
                const key = link.getAttribute('data-page');
                if (key) this.navigate(key);
            };
        });

        const page = document.getElementById('details-page');
        if (page) {
            page.addEventListener('wheel', (e) => this.handleWheelScroll(e, page), { passive: false });
        }

        this.setupIntroHint();
        this.updateNodesVisuals(pageKeys[this.currentIndex]);
        this.startGlitchLoop();
    }

    // --- ЛОГИКА СКРОЛЛА С ЛИМИТАМИ ---

    handleWheelScroll(e, page) {
        if (document.querySelector('.map-overlay.active')) return;

        const isFull = document.body.classList.contains('details-open-full');
        const fullPos = window.innerHeight * THEME_CONFIG.fullViewRatio;

        // Лимит прокрутки вниз (высота контента минус экран + отступ)
        const maxScroll = page.scrollHeight - (window.innerHeight + (1 - THEME_CONFIG.bottomPadding));

        if (e.deltaY > 0 && !isFull) {
            e.preventDefault();
            this.currentScrollY = fullPos;
            this.applyScroll(page);
            document.body.classList.add('details-open-full');
            return;
        } 

        if (isFull) {
            e.preventDefault();
            let targetScroll = this.currentScrollY + (e.deltaY * THEME_CONFIG.scrollSpeed);

            if (e.deltaY > 0) { // Скролл вниз
                if (targetScroll > maxScroll) targetScroll = maxScroll;
                this.currentScrollY = targetScroll;
            } else if (e.deltaY < 0) { // Скролл вверх
                if (targetScroll <= THEME_CONFIG.returnThreshold) { 
                    this.currentScrollY = THEME_CONFIG.teaserHeight; 
                    document.body.classList.remove('details-open-full');
                } else {
                    this.currentScrollY = targetScroll;
                }
            }
            this.applyScroll(page);
        }
    }

    handleDragScroll(clientY) {
        const page = document.getElementById('details-page');
        if (!page) return;

        const maxScroll = page.scrollHeight - (window.innerHeight + (1 - THEME_CONFIG.bottomPadding));
        const deltaY = (this.startY - clientY) * 1.5; 
        let targetScroll = this.startScrollY + deltaY;

        // Ограничители
        if (targetScroll < 0) targetScroll = 0;
        if (targetScroll > maxScroll) targetScroll = maxScroll;

        this.currentScrollY = targetScroll;

        if (this.currentScrollY > THEME_CONFIG.returnThreshold) {
            document.body.classList.add('details-open-full');
        } else if (this.currentScrollY < THEME_CONFIG.teaserHeight) {
            document.body.classList.remove('details-open-full');
        }

        this.applyScroll(page);
    }

    // --- ДВИЖЕНИЕ КАМЕРЫ И ТЯГА ---

    onMove(clientX, clientY) {
        const cur = document.getElementById('custom-cursor');
        if (cur) cur.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-30%, 0%)`;

        if (this.isDragging && document.body.classList.contains('details-open')) {
            this.handleDragScroll(clientY);
            return;
        }

        if (this.isNavigating) return;

        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const activeKey = pageKeys[this.currentIndex];
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        const hovered = intersects.find(i => i.object?.userData?.pageKey === activeKey);

        if (hovered) {
            const sprite = hovered.object;
            if (this.hoveredSprite !== sprite) {
                this.handleHoverIn(sprite);
                this.hoveredSprite = sprite;
            }
        } else if (this.hoveredSprite) {
            this.handleHoverOut(this.hoveredSprite);
            this.hoveredSprite = null;
        }

        if (this.isDragging && !document.body.classList.contains('details-open')) {
            this.dragDistance = clientY - this.startY;
            this.applyTension();
        }
    }

    applyTension() {
        let targetIdx = this.currentIndex;
        if (this.dragDistance < 0) targetIdx = Math.min(this.currentIndex + 1, pageKeys.length - 1);
        else if (this.dragDistance > 0) targetIdx = Math.max(this.currentIndex - 1, 0);

        const currentSprite = this.nodes[pageKeys[this.currentIndex]];
        const targetSprite = this.nodes[pageKeys[targetIdx]];

        if (targetSprite && currentSprite) {
            const start = this.getTargetCoords(currentSprite.position);
            const end = this.getTargetCoords(targetSprite.position);
            let progress = Math.min(Math.abs(this.dragDistance) / window.innerHeight, 0.7); 

            gsap.to(this.camera.position, {
                x: start.x + (end.x - start.x) * progress,
                y: start.y + (end.y - start.y) * progress,
                z: start.z + (end.z - start.z) * progress,
                duration: 0.4,
                ease: "power1.out",
                overwrite: "auto"
            });
        }
    }

    // --- ОСТАЛЬНЫЕ ФУНКЦИИ ---

    onStart(y, x, e) { 
        if (this.uiBlocked || e.target.closest('.image-container') || document.querySelector('.map-overlay.active')) return;
        this.isDragging = true; 
        this.startY = y; 
        this.startClickX = x;
        this.startClickY = y;
        this.startScrollY = this.currentScrollY;
        const cursor = document.getElementById('custom-cursor');
        if (cursor) cursor.innerHTML = '<img src="./assets/drag@2x.png">';
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        const cur = document.getElementById('custom-cursor');
        if(cur) cur.innerHTML = '<img src="./assets/pointer@2x.png">';

        if (document.body.classList.contains('details-open')) return;

        if (Math.abs(this.dragDistance) > window.innerHeight * this.config.thresholdRatio) {
            if (this.dragDistance < 0 && this.currentIndex < pageKeys.length - 1) this.navigate(pageKeys[this.currentIndex + 1]);
            else if (this.dragDistance > 0 && this.currentIndex > 0) this.navigate(pageKeys[this.currentIndex - 1]);
            else this.returnToPoint();
        } else {
            this.returnToPoint();
        }
        this.dragDistance = 0;
    }

    onClick(e) {
        if (this.uiBlocked || e.target.closest('nav') || e.target.closest('.sliding-page')) return;
        const dist = Math.sqrt(Math.pow(e.clientX - this.startClickX, 2) + Math.pow(e.clientY - this.startClickY, 2));
        if (dist > THEME_CONFIG.clickTolerance) return; 

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hit = this.raycaster.intersectObjects(this.scene.children).find(i => i.object.userData.pageKey);
        if (hit) {
            const hitKey = hit.object.userData.pageKey;
            if (pageKeys.indexOf(hitKey) === this.currentIndex) this.openDetails(hitKey);
        }
    }

    openDetails(key) {
        this.isNavigating = true;
        const data = pages[key];
        const page = document.getElementById('details-page');
        const contentEl = document.getElementById('details-content');
        
        // Находим новые элементы
        const lineEl = document.getElementById('page-line');
        const labelEl = document.getElementById('page-label'); 

        if (!data || !page) return;

        // 1. Сначала обновляем текстовое содержимое
        const index = pageKeys.indexOf(key) + 1;
        if (labelEl) {
            labelEl.innerText = index < 10 ? `0${index}` : index;
        }
        
        this.currentScrollY = THEME_CONFIG.teaserHeight;
        contentEl.innerHTML = `<h2 class="page-title">${data.title}</h2><div class="page-body">${data.text}</div>`;

        // 2. Сбрасываем стили перед началом анимации (чтобы можно было открывать много раз)
        if (lineEl) gsap.set(lineEl, { scaleY: 10, transformOrigin: "top" });
        if (labelEl) gsap.set(labelEl, { opacity: 0, x: -15 });

        // 3. Создаем таймлайн появления
        const tl = gsap.timeline({ delay: 0.2 });

        if (lineEl) {
            tl.to(lineEl, {
                scaleY: 1,
                duration: 1.2,
                ease: "expo.inOut"
            });
        }

        if (labelEl) {
            tl.to(labelEl, {
                opacity: 1,
                x: 5, // Небольшое смещение вправо в сторону линии
                duration: 0.8,
                ease: "power2.out"
            }, "-=1.0"); // Начинаем чуть раньше, пока линия еще растет
        }
        
        const detailsPage = document.getElementById('details-page');

       
        if (detailsPage) {
           
            let waveContainer = document.getElementById('wave-container');
            
            // Если его нет — создаем (на случай, если удалишь из HTML)
            if (!waveContainer) {
                
                waveContainer = document.createElement('div');
                waveContainer.id = 'wave-container';
                Object.assign(waveContainer.style, {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '0', 
                    pointerEvents: 'none',
                    overflow: 'hidden'
                });
                detailsPage.prepend(waveContainer);
            }

            // ВАЖНО: Запуск класса должен быть ЗДЕСЬ, вне условия создания
            if (!window.bgWaves) {
                
                window.bgWaves = new BackgroundWaves('wave-container');
            } else {
                
                window.bgWaves.resize();
            }
        }

        

        // Запускаем анимацию основного текста
        requestAnimationFrame(() => this.initContentAnimations(contentEl));

        // Обработка клика по картинке (карта)
        const previewImg = contentEl.querySelector('.image-container img');
        if (previewImg) previewImg.onclick = () => this.mapController.open(previewImg.src);

        // Открываем саму страницу
        page.classList.add('open');
        document.body.classList.add('details-open');
        this.applyScroll(page);
        
        setTimeout(() => { this.isNavigating = false; }, 800);
}

    navigate(key) {
        const targetIndex = pageKeys.indexOf(key);
        if (targetIndex === this.currentIndex && this.isNavigating) return;
        this.isNavigating = true;
        this.currentIndex = targetIndex;
        if (document.body.classList.contains('details-open')) this.closeDetails();
        this.updateNodesVisuals(key);
        const target = this.getTargetCoords(this.nodes[key].position);
        gsap.to(this.camera.position, { ...target, duration: THEME_CONFIG.animations.cameraTransition, ease: THEME_CONFIG.animations.transitionEase, onComplete: () => { this.isNavigating = false; } });
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === key));
    }

    returnToPoint() {
        const sprite = this.nodes[pageKeys[this.currentIndex]];
        if (!sprite) return;
        const coords = this.getTargetCoords(sprite.position);
        gsap.to(this.camera.position, { ...coords, duration: 0.8, ease: THEME_CONFIG.animations.returnEase, overwrite: true });
    }

    applyScroll(page) {
        const world = document.getElementById('world');
        const val = `translateY(-${this.currentScrollY}px)`;
        page.style.transform = val;
        if (world) world.style.transform = val;
    }

    closeDetails() {
        const page = document.getElementById('details-page');
        const world = document.getElementById('world');
        if (!page) return;
        page.style.transform = ''; 
        if (world) world.style.transform = ''; 
        this.currentScrollY = 0;
        page.classList.remove('open');
        document.body.classList.remove('details-open', 'details-open-full');
    }

    handleHoverIn(sprite) {
        gsap.to(sprite.scale, { x: 500, y: 125, duration: 0.4 });
        gsap.to(this.camera.position, { z: "-=90", duration: 0.6, overwrite: "auto" });
    }

    handleHoverOut(sprite) {
        gsap.to(sprite.scale, { x: 400, y: 100, duration: 0.4 });
        this.returnToPoint();
    }

    getTargetCoords(pos) {
        const settings = window.innerWidth <= 768 ? this.config.mobile : this.config.desktop;
        return { x: pos.x + settings.offsetX, y: pos.y + settings.offsetY, z: pos.z + settings.offsetZ };
    }

    initContentAnimations(contentEl) {
        const targets = contentEl.querySelectorAll('.page-title, p, h3, li, .accent-block');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01 });
        targets.forEach((el, i) => { el.style.transitionDelay = `${i * 0.1}s`; observer.observe(el); });
    }

    updateNodesVisuals(activeKey) {
        Object.keys(this.nodes).forEach(key => this.animateScramble(this.nodes[key], key === activeKey));
    }

    animateScramble(sprite, toOriginal = true) {
        if (sprite.userData.isDecoded === toOriginal) return;
        const finalText = sprite.userData.fullText;
        const obj = { val: toOriginal ? 0 : finalText.length };
        sprite.userData.isDecoded = toOriginal;
        gsap.to(obj, {
            val: toOriginal ? finalText.length : 0,
            duration: 1.0,
            onUpdate: () => {
                let res = "";
                for (let i = 0; i < finalText.length; i++) {
                    res += (i < obj.val) ? finalText[i] : "01"[Math.floor(Math.random()*2)];
                }
                sprite.userData.updateLabel(res);
            }
        });
    }

    setupIntroHint() {
        const hint = document.getElementById('intro-hint');
        if (hint) {
            hint.onclick = () => { hint.classList.add('fade-out'); setTimeout(() => { this.uiBlocked = false; hint.remove(); }, 1000); };
            setTimeout(() => { if(hint.parentNode) hint.click(); }, 3600);
        } else this.uiBlocked = false;
    }

    startGlitchLoop() {
        setInterval(() => {
            const s = this.nodes[pageKeys[this.currentIndex]];
            if (s?.userData.isDecoded && !this.isNavigating && Math.random() > 0.7) {
                const txt = s.userData.fullText;
                const i = Math.floor(Math.random() * txt.length);
                s.userData.updateLabel(txt.substring(0, i) + "0" + txt.substring(i + 1));
                setTimeout(() => { if (s.userData.isDecoded) s.userData.updateLabel(txt); }, 50);
            }
        }, 150);
    }
}
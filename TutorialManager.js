// TutorialManager.js

export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

// Add a configuration object for tutorial conditions
export const TUTORIAL_CONDITIONS = {
    click: (keys, player) => true, // Always met on click
    swipe: (keys, player) => true, // Always met on swipe
    forward: (keys, player) => keys['Space'] || keys['ShiftLeft'],
    space: (keys, player) => keys['Space'],
    boost: (keys, player) => keys['ShiftLeft'],
    takeoff: (keys, player) => {
        // For mobile, also check if the takeoff button is visible and KeyT is pressed
        const takeoffBtn = typeof document !== 'undefined' ? document.getElementById('shipModeTouch') : null;
        const isBtnVisible = takeoffBtn && takeoffBtn.style.opacity === '1';
        // Accept either a tap on the button (KeyT true) or a real key press
        return (keys['KeyT']);
    },
    roll: (keys, player) => keys['KeyQ'] || keys['KeyE'],
    manual: () => true, // Always met manually
    restart: () => false // Only met by pressing the restart button
};

export class TutorialManager {
    constructor(touchTips, desktopTips) {
        this.touchTips = touchTips;
        this.desktopTips = desktopTips;
        this.isTouch = isTouchDevice();
        this.tipsContainer = this.isTouch ? this.touchTips : this.desktopTips;
        this.tips = Array.from(this.tipsContainer.children);
        this.currentTipIndex = 0;
        this.updateTipsDisplay();
    }

    updateTipsDisplay() {
        // Clear any previous restart timer and progress ring
        if (this._restartTimeout) {
            clearTimeout(this._restartTimeout);
            this._restartTimeout = null;
        }
        if (this._restartRingAnim) {
            cancelAnimationFrame(this._restartRingAnim);
            this._restartRingAnim = null;
        }
        this.tips.forEach((tip, i) => {
            if (i === this.currentTipIndex) {
                tip.classList.add('currentTip');
                // Special handling for takeoff tip on mobile
                if (this.isTouch && tip.dataset.condition === 'takeoff') {
                    const takeoffBtn = document.getElementById('shipModeTouch');
                    if (takeoffBtn) {
                        takeoffBtn.style.opacity = 1;
                        takeoffBtn.style.pointerEvents = 'auto';
                    }
                }
                // Start timer and show ring if this is the restart tip
                if (tip.dataset.condition === 'restart') {
                    console.log('Showing restart tip');
                    // Remove any existing ring
                    let oldRing = tip.querySelector('.restart-timer-ring');
                    if (oldRing) oldRing.remove();
                    // Create SVG ring
                    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    ring.setAttribute('width', '40');
                    ring.setAttribute('height', '40');
                    ring.classList.add('restart-timer-ring');
                    ring.style.verticalAlign = 'middle';
                    ring.innerHTML = `<circle cx="20" cy="20" r="18" stroke="#fff" stroke-width="3" fill="none" opacity="0.2"/><circle class="progress" cx="20" cy="20" r="18" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="113.097" stroke-dashoffset="113.097" style="transition:none;"/>`;
                    tip.appendChild(ring);
                    // Animate the ring
                    const progressCircle = ring.querySelector('.progress');
                    const total = 10000; // ms
                    const circumference = 2 * Math.PI * 18;
                    let start = performance.now();
                    const animate = (now) => {
                        let elapsed = Math.min(now - start, total);
                        let percent = elapsed / total;
                        progressCircle.setAttribute('stroke-dashoffset', (1 - percent) * circumference);
                        if (elapsed < total) {
                            this._restartRingAnim = requestAnimationFrame(animate);
                        }
                    };
                    this._restartRingAnim = requestAnimationFrame(animate);
                    this._restartTimeout = setTimeout(() => {
                        this.tipsContainer.style.display = 'none';
                        if (this._restartRingAnim) {
                            cancelAnimationFrame(this._restartRingAnim);
                            this._restartRingAnim = null;
                        }
                    }, total);
                }
            } else {
                tip.classList.remove('currentTip');
                // Remove any ring from non-current tips
                let oldRing = tip.querySelector('.restart-timer-ring');
                if (oldRing) oldRing.remove();
            }
        });
    }

    setCondition(condition, value) {
        const tip = this.tips.find(t => t.dataset.condition === condition && t.classList.contains('currentTip'));
        if (tip) {
            tip.dataset.met = value;
            this.showNextBtn();
        }
    }

    showNextBtn() {
        const currentTip = this.tips[this.currentTipIndex];
        if (!currentTip) return;
        // Remove any existing nextBtn
        const oldBtn = currentTip.querySelector('.nextBtn');
        if (oldBtn) oldBtn.remove();
        // Do not show next button for restart tip on desktop, and do not auto-advance
        if (currentTip.dataset.condition === 'restart' && !this.isTouch) {
            console.log('Restart tip on desktop, not showing next button');
            return;
        }
        if (currentTip.dataset.met || currentTip.dataset.condition === 'manual') {
            const nextBtn = document.createElement('button');
            nextBtn.classList.add('nextBtn');
            //add desktop/mobile specific class
            nextBtn.classList.add(this.isTouch ? 'touch' : 'desktop');
            nextBtn.innerHTML = this.isTouch ? 'Next' : 'Press Enter to Continue';
            nextBtn.addEventListener('click', () => {this.nextTip(); nextBtn.remove();});
            currentTip.appendChild(nextBtn);
            // nextBtn.focus();
        }
    }

    nextTip() {
        if (this.tips[this.currentTipIndex]) {
            this.tips[this.currentTipIndex].classList.remove('currentTip');
        }
        this.currentTipIndex++;
        console.log('Next tip index:', this.currentTipIndex);
        console.log('currentTip:', this.tips[this.currentTipIndex]);
        if (this.currentTipIndex < this.tips.length) {
            console.log('Showing next tip:', this.tips[this.currentTipIndex]);
            this.updateTipsDisplay();
            const nextTip = this.tips[this.currentTipIndex];
            // Prevent auto-advancing from the restart tip on desktop
            if (nextTip.dataset.condition === 'restart' && !this.isTouch) {
                // Do not set data-met or showNextBtn, just show the tip and let the timer or Enter handle it
                return;
            }
            if (nextTip.dataset.condition === 'manual') {
                nextTip.dataset.met = true;
                this.showNextBtn();
            }
        }
    }

    reset() {
        this.currentTipIndex = 0;
        this.tips.forEach(tip => {
            tip.classList.remove('currentTip');
            delete tip.dataset.met;
        });
        this.updateTipsDisplay();
        // If first tip is manual, show next btn
        const firstTip = this.tips[0];
        if (firstTip.dataset.condition === 'manual') {
            firstTip.dataset.met = true;
            this.showNextBtn();
        }
        // Also clear/hide any restart timeout, ring animation, and show tips UI again
        if (this._restartTimeout) {
            clearTimeout(this._restartTimeout);
            this._restartTimeout = null;
        }
        if (this._restartRingAnim) {
            cancelAnimationFrame(this._restartRingAnim);
            this._restartRingAnim = null;
        }
        this.tipsContainer.style.display = '';
    }
}

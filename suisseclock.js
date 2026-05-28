/* =================================================================
   suisseclock.js  —  v4  —  Mondaine SBB Stop2Go authentique
   Hans Hilfiker, 1944

   TROTTEUSE :
     - tige s'arrête au centre du disque (pas de pointe)
     - disque rouge = terminaison de l'aiguille
     - épaisseur gare (R×0.032), disque (R×0.090)
     - balayage constant en 58.5s, petite balance à 12, attente du top minute

   PIVOT CENTRAL :
     - forme rectangulaire/capsule (pas un cercle)
     - rouge, couvre le croisement des aiguilles

   GRANDE AIGUILLE + HEURE :
     - bond avant, trois oscillations visibles, puis calage au trait
================================================================= */

window.initSuisseClock = function (canvasId, sizePx) {

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (canvas.__suisseClockStop) canvas.__suisseClockStop();

    const DPR  = window.devicePixelRatio || 1;
    const SIZE = sizePx || 320;

    canvas.style.width  = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    canvas.width  = SIZE * DPR;
    canvas.height = SIZE * DPR;

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    const SECOND_SWEEP_SECONDS = 58.50;
    const SECOND_BALANCE_END   = 59.08;
    const MINUTE_JUMP_START    = 59.04;

    const MINUTE_JUMP_FRAMES = [
        { t: 59.04, offset: 0.000, shake:  0.00 },
        { t: 59.28, offset: 1.135, shake:  1.00 },
        { t: 59.42, offset: 0.938, shake: -0.82 },
        { t: 59.55, offset: 1.070, shake:  0.58 },
        { t: 59.67, offset: 0.985, shake: -0.38 },
        { t: 59.79, offset: 1.026, shake:  0.24 },
        { t: 59.90, offset: 0.996, shake: -0.12 },
        { t: 59.99, offset: 1.000, shake:  0.00 }
    ];

    class Clock {

        constructor(canvas, ctx, radius) {
            this.canvas = canvas;
            this.ctx    = ctx;
            this.radius = radius;
        }

        update() {
            this.center = { x: SIZE * 0.5, y: SIZE * 0.5 };
            this.ctx.clearRect(0, 0, SIZE, SIZE);
            const now = new Date();
            const pos = now.getSeconds() + now.getMilliseconds() / 1000;
            const impulse = this.minuteJumpImpulse(pos);
            this.drawShadow();
            this.drawFace();
            this.drawMarkers();
            this.drawHourHand(now, impulse);
            this.drawMinuteHand(now, impulse);
            this.drawSecondHand(pos);
            /* this.drawCenter(); */
        }

        easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        smoothstep(t) {
            return t * t * (3 - 2 * t);
        }

        interpolateFrames(pos, frames) {
            if (pos <= frames[0].t) return frames[0];

            for (let i = 0; i < frames.length - 1; i++) {
                const a = frames[i];
                const b = frames[i + 1];
                if (pos <= b.t) {
                    const t = this.smoothstep((pos - a.t) / (b.t - a.t));
                    return {
                        offset: a.offset + (b.offset - a.offset) * t,
                        shake:  a.shake  + (b.shake  - a.shake)  * t
                    };
                }
            }

            return frames[frames.length - 1];
        }

        minuteJumpImpulse(pos) {
            if (pos < MINUTE_JUMP_START) return { offset: 0, shake: 0 };
            return this.interpolateFrames(pos, MINUTE_JUMP_FRAMES);
        }

        secondBalanceAngle(pos) {
            if (pos < SECOND_SWEEP_SECONDS) {
                return (Math.PI * 2) * (pos / SECOND_SWEEP_SECONDS);
            }

            if (pos >= SECOND_BALANCE_END) return 0;

            const marker = Math.PI * 2 / 60;
            const t = (pos - SECOND_SWEEP_SECONDS) / (SECOND_BALANCE_END - SECOND_SWEEP_SECONDS);
            const wobble = Math.sin(t * Math.PI * 5.7) * Math.exp(-t * 3.4);
            const settle = (1 - this.smoothstep(t)) * 0.10;
            return marker * (wobble * 0.18 + settle);
        }

        drawShadow() {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
            this.ctx.shadowColor   = 'rgba(0,0,0,0.20)';
            this.ctx.shadowBlur    = r * 0.12;
            this.ctx.shadowOffsetY = r * 0.04;
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.restore();
        }

        drawFace() {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fillStyle = '#f8f5ef';
            this.ctx.fill();
            const radial = this.ctx.createRadialGradient(cx, cy - r * 0.15, r * 0.1, cx, cy, r);
            radial.addColorStop(0, 'rgba(255,255,255,0.40)');
            radial.addColorStop(1, 'rgba(0,0,0,0.02)');
            this.ctx.fillStyle = radial;
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.10)';
            this.ctx.lineWidth = r * 0.008;
            this.ctx.stroke();
        }

        drawMarkers() {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            for (let i = 0; i < 60; i++) {
                const angle     = (Math.PI * 2) * (i / 60);
                const isHour    = i % 5  === 0;
                const isQuarter = i % 15 === 0;
                const outer = r * 0.92;
                const inner = isQuarter ? r * 0.66 : isHour ? r * 0.74 : r * 0.85;
                const width = isQuarter ? r * 0.055 : isHour ? r * 0.042 : r * 0.013;
                this.ctx.beginPath();
                this.ctx.moveTo(cx + Math.sin(angle) * outer, cy - Math.cos(angle) * outer);
                this.ctx.lineTo(cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner);
                this.ctx.strokeStyle = '#111';
                this.ctx.lineWidth   = width;
                this.ctx.lineCap     = 'butt';
                this.ctx.stroke();
            }
        }

        drawTrapHand(angle, length, back, baseW, tipW, color) {
            const r = this.radius;
            const { x: cx, y: cy } = this.center;
            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle);
            this.ctx.shadowColor   = 'rgba(0,0,0,0.18)';
            this.ctx.shadowBlur    = r * 0.025;
            this.ctx.shadowOffsetY = r * 0.012;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(-baseW * r * 0.5,  back   * r);
            this.ctx.lineTo( baseW * r * 0.5,  back   * r);
            this.ctx.lineTo( tipW  * r * 0.5, -length * r);
            this.ctx.lineTo(-tipW  * r * 0.5, -length * r);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        drawHourHand(now, impulse) {
            const h = (now.getHours() % 12) + (now.getMinutes() + impulse.offset) / 60;
            const base = (Math.PI * 2) * (h / 12);
            const tremble = impulse.shake * (Math.PI * 2 / 60) * 0.018;
            this.drawTrapHand(base + tremble, 0.50, 0.13, 0.12, 0.08, '#111');
        }

        drawMinuteHand(now, impulse) {
            const disp = now.getMinutes() + impulse.offset;
            const tremble = impulse.shake * (Math.PI * 2 / 60) * 0.052;
            this.drawTrapHand((Math.PI * 2) * (disp / 60) + tremble, 0.84, 0.14, 0.085, 0.050, '#111');
        }

        /* ── TROTTEUSE ──────────────────────────────────────────────
           La tige s'arrête exactement au centre du disque.
           Le disque est la terminaison — rien ne dépasse.
        ────────────────────────────────────────────────────────── */
        drawSecondHand(pos) {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            let angle;

            angle = this.secondBalanceAngle(pos);

            const diskDist = r * 0.66;

            /* tige : queue → centre du disque (pas au-delà) */
            const stemX0 = cx - Math.sin(angle) * r * 0.22;
            const stemY0 = cy + Math.cos(angle) * r * 0.22;
            const stemX1 = cx + Math.sin(angle) * diskDist;
            const stemY1 = cy - Math.cos(angle) * diskDist;

            this.ctx.save();
            this.ctx.shadowColor = 'rgba(0,0,0,0.20)';
            this.ctx.shadowBlur  = r * 0.020;
            this.ctx.strokeStyle = '#d71920';
            this.ctx.lineWidth   = r * 0.032;
            this.ctx.lineCap     = 'butt';
            this.ctx.beginPath();
            this.ctx.moveTo(stemX0, stemY0);
            this.ctx.lineTo(stemX1, stemY1);
            this.ctx.stroke();

            /* disque = terminaison de l'aiguille */
            const diskX = cx + Math.sin(angle) * diskDist;
            const diskY = cy - Math.cos(angle) * diskDist;
            this.ctx.shadowBlur  = 0;
            this.ctx.fillStyle   = '#d71920';
            this.ctx.beginPath();
            this.ctx.arc(diskX, diskY, r * 0.090, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0,0,0,0.10)';
            this.ctx.lineWidth   = r * 0.006;
            this.ctx.stroke();

            this.ctx.restore();
        }

        /* ── PIVOT — capsule rectangulaire rouge ────────────────────
           Forme droite (rectangle à coins arrondis = capsule),
           orientée verticalement, couvre le croisement des aiguilles.
        ────────────────────────────────────────────────────────── */
        drawCenter() {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            const w  = r * 0.030;   // demi-largeur capsule
            const h  = r * 0.052;   // demi-hauteur capsule
            const rr = w;            // rayon coins = demi-largeur → capsule

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.shadowColor = 'rgba(0,0,0,0.30)';
            this.ctx.shadowBlur  = r * 0.015;
            this.ctx.fillStyle   = '#d71920';

            this.ctx.beginPath();
            this.ctx.moveTo(-w, -h + rr);
            this.ctx.arcTo(-w, -h,  0, -h, rr);
            this.ctx.arcTo( w, -h,  w, -h + rr, rr);
            this.ctx.arcTo( w,  h,  0,  h, rr);
            this.ctx.arcTo(-w,  h, -w,  h - rr, rr);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle  = '#111';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.010, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    const clock = new Clock(canvas, ctx, SIZE * 0.44);

    let frameId = null;

    function render() {
        clock.update();
        frameId = requestAnimationFrame(render);
    }

    render();

    canvas.__suisseClockStop = function () {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = null;
        canvas.__suisseClockStop = null;
    };

    return canvas.__suisseClockStop;
};

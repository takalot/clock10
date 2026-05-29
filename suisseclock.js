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
    const SECOND_BALANCE_END   = 59.55;
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
            const wobble = Math.sin(t * Math.PI * 2.2) * Math.exp(-t * 1.9);
            const settle = (1 - this.smoothstep(t)) * 0.07;
            return marker * (wobble * 0.12 + settle);
        }

		drawShadow() {
			const { x: cx, y: cy } = this.center;
			const r = this.radius;

			this.ctx.save();

			// ombre extérieure forte
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 1.075, 0, Math.PI * 2);
			this.ctx.shadowColor = 'rgba(0,0,0,0.72)';
			this.ctx.shadowBlur = r * 0.13;
			this.ctx.shadowOffsetY = r * 0.045;
			this.ctx.fillStyle = '#050505';
			this.ctx.fill();

			this.ctx.restore();
		}

		drawFace() {
			const { x: cx, y: cy } = this.center;
			const r = this.radius;

			// anneau noir extérieur avec relief
			const bezel = this.ctx.createRadialGradient(cx, cy - r * 0.22, r * 0.58, cx, cy, r * 1.09);
			bezel.addColorStop(0.00, '#3a3427');
			bezel.addColorStop(0.45, '#090909');
			bezel.addColorStop(0.72, '#000000');
			bezel.addColorStop(1.00, '#2a2418');

			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 1.075, 0, Math.PI * 2);
			this.ctx.fillStyle = bezel;
			this.ctx.fill();

			// cadran or / champagne
			const face = this.ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.06, cx, cy, r);
			face.addColorStop(0.00, '#ffffff');
			face.addColorStop(0.34, '#f5f5e6');
			face.addColorStop(0.72, '#fafaf7');
			face.addColorStop(1.00, '#fafacd');

			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 0.985, 0, Math.PI * 2);
			this.ctx.fillStyle = face;
			this.ctx.fill();
			
			// lumière blanche centrale / haut-gauche
			const whiteLight = this.ctx.createRadialGradient(
				cx - r * 0.22,
				cy - r * 0.28,
				0,
				cx,
				cy,
				r * 0.95
			);

			whiteLight.addColorStop(0.00, 'rgba(255,255,255,0.72)');
			whiteLight.addColorStop(0.22, 'rgba(255,255,255,0.34)');
			whiteLight.addColorStop(0.52, 'rgba(255,255,255,0.10)');
			whiteLight.addColorStop(1.00, 'rgba(255,255,255,0.00)');

			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 0.955, 0, Math.PI * 2);
			this.ctx.fillStyle = whiteLight;
			this.ctx.fill();

			// liseré intérieur sombre
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 0.988, 0, Math.PI * 2);
			this.ctx.strokeStyle = 'rgba(0,0,0,0.72)';
			this.ctx.lineWidth = r * 0.018;
			this.ctx.stroke();

			// highlight haut-gauche
			const shine = this.ctx.createRadialGradient(cx - r * 0.30, cy - r * 0.38, 0, cx, cy, r);
			shine.addColorStop(0.00, 'rgba(255,255,255,0.38)');
			shine.addColorStop(0.38, 'rgba(255,255,255,0.08)');
			shine.addColorStop(1.00, 'rgba(255,255,255,0)');

			this.ctx.beginPath();
			this.ctx.arc(cx, cy, r * 0.965, 0, Math.PI * 2);
			this.ctx.fillStyle = shine;
			this.ctx.fill();
		}

        drawMarkers() {
            const { x: cx, y: cy } = this.center;
            const r = this.radius;
            for (let i = 0; i < 60; i++) {
                const angle     = (Math.PI * 2) * (i / 60);
                const isHour    = i % 5  === 0;
                const isQuarter = i % 15 === 0;
				const outer = r * 0.915;
				const inner = isQuarter ? r * 0.61 : isHour ? r * 0.69 : r * 0.825;
				const width = isQuarter ? r * 0.078 : isHour ? r * 0.060 : r * 0.020;
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
            this.drawTrapHand(base + tremble, 0.50, 0.14, 0.155, 0.105, '#050505');
        }

        drawMinuteHand(now, impulse) {
            const disp = now.getMinutes() + impulse.offset;
            const tremble = impulse.shake * (Math.PI * 2 / 60) * 0.052;
            this.drawTrapHand((Math.PI * 2) * (disp / 60) + tremble, 0.84, 0.15, 0.125, 0.075, '#050505');
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
            this.ctx.lineWidth = r * 0.040; /*Epaisseur de la trotteuse*/
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
            this.ctx.arc(diskX, diskY, r * 0.105, 0, Math.PI * 2); /*Epaisseur de la trotteuse*/
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

    const clock = new Clock(canvas, ctx, SIZE * 0.495);

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

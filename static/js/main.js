const body = document.body;
const toggleBtn = document.querySelector('[data-action="toggle-theme"]');
const themeLabel = document.querySelector('[data-theme-toggle-label]');
const storageKey = 'portfolio-theme-mode';

const updateToggleUI = mode => {
    if (!toggleBtn || !themeLabel) {
        return;
    }
    const nextModeText = mode === 'dark' ? 'Light mode' : 'Dark mode';
    themeLabel.textContent = nextModeText;
    toggleBtn.setAttribute('aria-label', `Switch to ${nextModeText.toLowerCase()}`);
    toggleBtn.setAttribute('aria-pressed', mode === 'dark');
};

const applyTheme = requestedMode => {
    const mode = requestedMode === 'dark' ? 'dark' : 'light';
    body.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    updateToggleUI(mode);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
};

const storedTheme = localStorage.getItem(storageKey);
const defaultTheme = storedTheme === 'light' ? 'light' : 'dark';
applyTheme(defaultTheme);

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const current = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(storageKey, next);
    });
}

const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));

if (navLinks.length) {
    const sections = navLinks
        .map(link => document.getElementById(link.getAttribute('href').slice(1)))
        .filter(Boolean);

    const updateActiveLink = targetId => {
        navLinks.forEach(link => {
            const isActive = link.getAttribute('href').slice(1) === targetId;
            link.classList.toggle('is-active', isActive);
        });
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateActiveLink(entry.target.id);
            }
        });
    }, {
        root: null,
        rootMargin: '-42% 0px -48% 0px',
        threshold: 0.35,
    });

    sections.forEach(section => observer.observe(section));

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            updateActiveLink(link.getAttribute('href').slice(1));
        });
    });
}

const canvas = document.getElementById('neural-field');
if (canvas) {
    const context = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = window.devicePixelRatio || 1;
    let theme = body.getAttribute('data-theme') || 'light';
    let palette = {
        background: ['#f4f7ff', '#dbe5ff'],
        strip: {
            start: 'rgba(90, 118, 255, 0.82)',
            end: 'rgba(132, 216, 255, 0.64)',
            edge: 'rgba(68, 84, 150, 0.45)',
            highlight: 'rgba(255, 255, 255, 0.75)',
            shadow: 'rgba(160, 188, 255, 0.3)',
        },
        glow: 'rgba(236, 240, 255, 0.48)',
        halo: 'rgba(120, 150, 255, 0.18)',
    };

    const parseHex = color => {
        const sanitized = color.replace(/[^0-9a-f]/gi, '').slice(0, 6);
        const hex = sanitized.length === 3
            ? sanitized.split('').map(ch => ch + ch).join('')
            : sanitized.padEnd(6, '0');
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
        ];
    };

    const mixColors = (a, b, t) => [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];

    const toRgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    const readPalette = () => {
        const styles = getComputedStyle(body);
        const accentHex = (styles.getPropertyValue('--accent') || '#4250ff').trim();
        const accentStrongHex = (styles.getPropertyValue('--accent-strong') || '#1f2cf0').trim();
        const accent = parseHex(accentHex);
        const accentStrong = parseHex(accentStrongHex);
        const accentMid = mixColors(accent, accentStrong, 0.5);
        theme = body.getAttribute('data-theme') || 'light';

        if (theme === 'dark') {
            const deepBlue = [26, 34, 112];
            palette = {
                background: ['#05061b', '#0b1030'],
                strip: {
                    start: toRgba(mixColors(accentStrong, [170, 200, 255], 0.2), 0.95),
                    end: toRgba(mixColors(accentMid, deepBlue, 0.18), 0.78),
                    edge: 'rgba(46, 68, 180, 0.8)',
                    highlight: 'rgba(238, 246, 255, 0.7)',
                    shadow: 'rgba(46, 70, 168, 0.45)',
                },
                glow: 'rgba(10, 14, 36, 0.52)',
                halo: 'rgba(96, 140, 255, 0.25)',
            };
        } else {
            const softSky = [232, 242, 255];
            palette = {
                background: ['#f4f7ff', '#dbe5ff'],
                strip: {
                    start: toRgba(mixColors(accent, softSky, 0.18), 0.94),
                    end: toRgba(mixColors(accentStrong, softSky, 0.22), 0.76),
                    edge: 'rgba(74, 96, 196, 0.58)',
                    highlight: 'rgba(255, 255, 255, 0.82)',
                    shadow: 'rgba(150, 178, 255, 0.35)',
                },
                glow: 'rgba(236, 240, 255, 0.42)',
                halo: 'rgba(140, 168, 255, 0.2)',
            };
        }
    };

    const resizeCanvas = () => {
        pixelRatio = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const projectPoint = (x, y, z) => {
        const perspective = 4.6;
        const distance = 6.4;
        const baseScale = Math.min(width, height) * (width < 768 ? 0.3 : 0.24);
        const factor = perspective / (distance - z);
        return {
            x: width * 0.5 + x * baseScale * factor,
            y: height * 0.5 + y * baseScale * factor,
            depth: z,
        };
    };

    const mobiusPoint = (u, v, t) => {
        const half = u / 2;
        const cosHalf = Math.cos(half);
        const sinHalf = Math.sin(half);
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const radius = 1 + (v / 2) * cosHalf;
        let x = radius * cosU;
        let y = radius * sinU;
        let z = (v / 2) * sinHalf;

        const breathing = 1 + 0.06 * Math.sin(t * 1.6 + u * 0.5);
        x *= breathing;
        y *= breathing;
        z *= breathing;

        const angleY = t * 1.2;
        const angleX = t * 0.85;
        const angleZ = Math.sin(t * 0.8) * 0.55;

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        let dx = x * cosY + z * sinY;
        let dz = -x * sinY + z * cosY;
        let dy = y;

        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        let dy2 = dy * cosX - dz * sinX;
        let dz2 = dy * sinX + dz * cosX;
        let dx2 = dx;

        const cosZ = Math.cos(angleZ);
        const sinZ = Math.sin(angleZ);
        const finalX = dx2 * cosZ - dy2 * sinZ;
        const finalY = dx2 * sinZ + dy2 * cosZ;
        const finalZ = dz2;

        return { x: finalX, y: finalY, z: finalZ };
    };

    const drawBackground = () => {
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, palette.background[0]);
        gradient.addColorStop(1, palette.background[1]);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
    };

    const drawMobius = time => {
        const t = time * 0.00042;
    const segments = 260;
    const bandHalfWidth = 0.78;
        const upper = [];
        const lower = [];
        const center = [];

        for (let i = 0; i <= segments; i += 1) {
            const progress = i / segments;
            const u = progress * Math.PI * 2;
            const upper3D = mobiusPoint(u, bandHalfWidth, t);
            const lower3D = mobiusPoint(u, -bandHalfWidth, t);
            const center3D = mobiusPoint(u, 0, t);
            upper.push(projectPoint(upper3D.x, upper3D.y, upper3D.z));
            lower.push(projectPoint(lower3D.x, lower3D.y, lower3D.z));
            center.push(projectPoint(center3D.x, center3D.y, center3D.z));
        }

        const lowerPath = [...lower].reverse();

        const ribbonGradient = context.createLinearGradient(width * 0.28, height * 0.25, width * 0.72, height * 0.8);
        ribbonGradient.addColorStop(0, palette.strip.start);
        ribbonGradient.addColorStop(1, palette.strip.end);

        context.save();
        context.shadowColor = palette.strip.shadow;
        context.shadowBlur = Math.max(width, height) * 0.026;
        context.beginPath();
        context.moveTo(upper[0].x, upper[0].y);
        for (let i = 1; i < upper.length; i += 1) {
            context.lineTo(upper[i].x, upper[i].y);
        }
        for (let i = 0; i < lowerPath.length; i += 1) {
            context.lineTo(lowerPath[i].x, lowerPath[i].y);
        }
        context.closePath();
        context.fillStyle = ribbonGradient;
        context.globalAlpha = 0.98;
        context.fill();
        context.restore();

        context.save();
        context.lineWidth = Math.max(1.35, width * 0.0021);
        context.strokeStyle = palette.strip.edge;
        context.stroke();
        context.restore();

        context.save();
        context.globalAlpha = 0.92;
        context.lineWidth = Math.max(1.05, width * 0.0016);
        context.strokeStyle = palette.strip.highlight;
        context.beginPath();
        context.moveTo(center[0].x, center[0].y);
        for (let i = 1; i < center.length; i += 1) {
            context.lineTo(center[i].x, center[i].y);
        }
        context.stroke();
        context.restore();

        context.save();
        context.globalAlpha = 0.28;
        context.lineWidth = Math.max(0.6, width * 0.0008);
        context.strokeStyle = palette.strip.highlight;
        const crossCount = 22;
        for (let j = 0; j < crossCount; j += 1) {
            const u = (j / crossCount) * Math.PI * 2;
            const edgeA3D = mobiusPoint(u, bandHalfWidth, t);
            const edgeB3D = mobiusPoint(u, -bandHalfWidth, t);
            const edgeA = projectPoint(edgeA3D.x, edgeA3D.y, edgeA3D.z);
            const edgeB = projectPoint(edgeB3D.x, edgeB3D.y, edgeB3D.z);
            context.beginPath();
            context.moveTo(edgeA.x, edgeA.y);
            context.lineTo(edgeB.x, edgeB.y);
            context.stroke();
        }
        context.restore();

        context.save();
        const sheen = context.createLinearGradient(width * 0.35, height * 0.2, width * 0.65, height * 0.75);
        sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
        sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
        sheen.addColorStop(1, 'rgba(200,224,255,0.22)');
        context.globalCompositeOperation = 'screen';
        context.globalAlpha = 0.5;
        context.fillStyle = sheen;
        context.beginPath();
        context.moveTo(upper[0].x, upper[0].y);
        for (let i = 1; i < upper.length; i += 1) {
            context.lineTo(upper[i].x, upper[i].y);
        }
        for (let i = 0; i < lowerPath.length; i += 1) {
            context.lineTo(lowerPath[i].x, lowerPath[i].y);
        }
        context.closePath();
        context.fill();
        context.restore();

        context.save();
        const halo = context.createRadialGradient(
            width * 0.5,
            height * 0.5,
            Math.min(width, height) * 0.12,
            width * 0.5,
            height * 0.5,
            Math.max(width, height) * 0.65,
        );
        halo.addColorStop(0, 'rgba(0, 0, 0, 0)');
        halo.addColorStop(1, palette.halo);
        context.globalCompositeOperation = 'lighter';
        context.fillStyle = halo;
        context.fillRect(0, 0, width, height);
        context.restore();
    };


const yearTarget = document.querySelector('[data-current-year]');
if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
}
    const drawOverlay = () => {
        context.save();
        context.globalCompositeOperation = 'soft-light';
        const topFade = context.createLinearGradient(0, 0, 0, height);
        if (theme === 'dark') {
            topFade.addColorStop(0, 'rgba(6, 8, 24, 0.55)');
            topFade.addColorStop(0.45, 'rgba(6, 8, 24, 0.22)');
            topFade.addColorStop(1, 'rgba(6, 8, 24, 0)');
        } else {
            topFade.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
            topFade.addColorStop(0.45, 'rgba(255, 255, 255, 0.18)');
            topFade.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }
        context.fillStyle = topFade;
        context.fillRect(0, 0, width, height);
        context.restore();

        context.save();
        const radial = context.createRadialGradient(
            width * 0.6,
            height * 0.4,
            Math.min(width, height) * 0.1,
            width * 0.5,
            height * 0.65,
            Math.max(width, height) * 0.95,
        );
        radial.addColorStop(0, 'rgba(0, 0, 0, 0)');
        radial.addColorStop(1, palette.glow);
        context.globalCompositeOperation = 'screen';
        context.fillStyle = radial;
        context.globalAlpha = 0.85;
        context.fillRect(0, 0, width, height);
        context.restore();
    };

    const render = time => {
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);
        drawBackground();
        drawMobius(time);
        drawOverlay();
        requestAnimationFrame(render);
    };

    resizeCanvas();
    readPalette();
    requestAnimationFrame(render);

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    document.addEventListener('themechange', () => {
        readPalette();
    });
}

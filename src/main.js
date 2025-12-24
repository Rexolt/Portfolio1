import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createIcons, icons } from 'lucide';

gsap.registerPlugin(ScrollTrigger);

// Check for Mobile
const isMobile = window.innerWidth < 768;

// --- 1. TERMINAL LOGIC (Simplified for Mobile) ---
const initTerminal = () => {
    const container = document.getElementById('terminal-content');
    const lines = [
        { text: "git clone fxit", type: "cmd" },
        { text: "Resolving...", type: "output", delay: 500 },
        { text: "[SUCCESS] Math engine v2.0", type: "success", delay: 1000 },
        { text: "npm start soundr", type: "cmd", delay: 1500 },
        { text: "Audio ready.", type: "success", delay: 2000 },
        { text: "whoami", type: "cmd", delay: 2500 },
        { text: "> Rexolt (Mészáros Bálint)", type: "output", delay: 2800 },
        { text: "_", type: "cursor", delay: 3000 }
    ];

    let lineIndex = 0;
    const addLine = (lineObj) => {
        const div = document.createElement('div');
        div.className = 'cmd-line';
        if (lineObj.type === 'cmd') div.innerHTML = `<span class="cmd-prompt">➜</span> <span class="cmd-text">${lineObj.text}</span>`;
        else if (lineObj.type === 'success') div.innerHTML = `<span class="text-green-400">${lineObj.text}</span>`;
        else if (lineObj.type === 'cursor') div.innerHTML = `<span class="cmd-prompt">➜</span> <span class="cursor"></span>`;
        else div.innerHTML = `<span class="opacity-70">${lineObj.text}</span>`;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

        // Faster typing on mobile or just show immediately
        setTimeout(nextLine, lineObj.delay ? (isMobile ? lineObj.delay * 0.5 : lineObj.delay) : 100);
    };

    const nextLine = () => {
        lineIndex++;
        if (lineIndex < lines.length) addLine(lines[lineIndex]);
    };

    ScrollTrigger.create({ trigger: "#console", start: "top 80%", once: true, onEnter: () => addLine(lines[0]) });
};
initTerminal();

// --- 2. TEXT SCRAMBLE (Only desktop hover) ---
if (!isMobile) {
    class TextScramble {
        constructor(el) { this.el = el; this.chars = '!<>-_\\/[]{}—=+*^?#________'; this.update = this.update.bind(this); }
        setText(newText) {
            const oldText = this.el.innerText; const length = Math.max(oldText.length, newText.length);
            const promise = new Promise((resolve) => this.resolve = resolve); this.queue = [];
            for (let i = 0; i < length; i++) {
                const from = oldText[i] || ''; const to = newText[i] || '';
                const start = Math.floor(Math.random() * 40); const end = start + Math.floor(Math.random() * 40);
                this.queue.push({ from, to, start, end });
            }
            cancelAnimationFrame(this.frameRequest); this.frame = 0; this.update(); return promise;
        }
        update() {
            let output = ''; let complete = 0;
            for (let i = 0, n = this.queue.length; i < n; i++) {
                let { from, to, start, end, char } = this.queue[i];
                if (this.frame >= end) { complete++; output += to; }
                else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) { char = this.randomChar(); this.queue[i].char = char; }
                    output += `<span class="opacity-50 text-accent">${char}</span>`;
                } else { output += from; }
            }
            this.el.innerHTML = output;
            if (complete === this.queue.length) this.resolve(); else { this.frameRequest = requestAnimationFrame(this.update); this.frame++; }
        }
        randomChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }
    }
    document.querySelectorAll('.hover-scramble').forEach(el => {
        const fx = new TextScramble(el); const originalText = el.getAttribute('data-text') || el.innerText;
        el.addEventListener('mouseenter', () => fx.setText(originalText));
    });
}

// --- 3. THREE.JS SCENE (Optimized) ---
const initThreeJS = () => {
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x030303, 0.02);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Camera further back on mobile to fit the head vertically
    camera.position.z = isMobile ? 15 : 9;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile }); // No AA on mobile for performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); // Better quality on mobile
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Slightly reduced
    container.appendChild(renderer.domElement);

    // Lighting Setup
    // Key Light (Spot)
    const spotLight = new THREE.SpotLight(0xffffff, 80); // Reduced from 400, strictly directional
    spotLight.position.set(10, 10, 10);
    spotLight.angle = 0.5;
    spotLight.penumbra = 1;
    spotLight.decay = 1;
    spotLight.distance = 100;
    scene.add(spotLight);

    // Fill Light (Point)
    const blueLight = new THREE.PointLight(0x4444ff, 40, 20); // Reduced
    blueLight.position.set(-5, 2, 5);
    blueLight.decay = 1;
    scene.add(blueLight);

    // Ambient / Environment Fill (Hemisphere is better than Ambient for 3D feel)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080808, 1.5);
    scene.add(hemiLight);

    // Faster/Brighter particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = isMobile ? 300 : 1500; // Significantly fewer on mobile
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.04, color: 0x888888, transparent: true, opacity: 0.6 })); // Slightly adjusted
    scene.add(particles);

    let headMesh; const loader = new GLTFLoader();
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb', (gltf) => {
        headMesh = gltf.scene.children[0]; headMesh.geometry.center();
        headMesh.material = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.1, // Reduced significantly as we lack an envMap
            clearcoat: 0.1,
            side: THREE.DoubleSide
        });

        // Larger head on mobile
        const scale = isMobile ? 1.0 : 0.8;
        headMesh.scale.set(scale, scale, scale);
        scene.add(headMesh);

        const tl = gsap.timeline();
        tl.to('#load-bar', { y: '0%', duration: 0.8, ease: 'expo.inOut' })
            .to('#loader', { y: '-100%', duration: 0.8, ease: 'power4.inOut' }, "-=0.2")
            .to('#canvas-container', { opacity: 1, duration: 1 }, "-=0.5")
            .to('.hero-title', { opacity: 1, stagger: 0.1 }, "-=0.5");
    });

    // Bloom - Lower quality on mobile
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    if (!isMobile) {
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.1; bloomPass.strength = 0.4; bloomPass.radius = 0.8; composer.addPass(bloomPass);
    }

    let mouse = new THREE.Vector2(); let targetColor = new THREE.Color(0x111111);
    if (!isMobile) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    const clock = new THREE.Clock();
    const animate = () => {
        requestAnimationFrame(animate); const time = clock.getElapsedTime();
        const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);

        if (headMesh) {
            if (!isMobile) {
                // Desktop Interaction
                headMesh.rotation.y += (mouse.x * 0.3 + scrollPct * 1.5 - headMesh.rotation.y) * 0.05;
                headMesh.rotation.x += (mouse.y * 0.2 - scrollPct * 0.3 - headMesh.rotation.x) * 0.05;
            } else {
                // Mobile Auto Rotation (gentle)
                headMesh.rotation.y = Math.sin(time * 0.2) * 0.3 + (scrollPct * 1.0);
                headMesh.rotation.x = Math.cos(time * 0.3) * 0.1;
            }
            headMesh.position.y = Math.sin(time * 0.5) * 0.1 + (scrollPct * 0.5);
            headMesh.material.color.lerp(targetColor, 0.05);
        }
        if (particles) { particles.rotation.y = time * 0.02; particles.position.y = -window.scrollY * 0.005; }

        composer.render();
    };
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
        // Re-check mobile on resize
        const newIsMobile = window.innerWidth < 768;
        camera.position.z = newIsMobile ? 15 : 9;
        renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
    });

    ScrollTrigger.create({
        trigger: "#projects", start: "top center", end: "bottom center",
        onEnter: () => targetColor.setHex(0x3030ff), onLeave: () => targetColor.setHex(0x111111),
        onEnterBack: () => targetColor.setHex(0x3030ff), onLeaveBack: () => targetColor.setHex(0x111111)
    });
};
initThreeJS();

// --- 4. DESKTOP ONLY INTERACTIONS ---
if (!isMobile) {
    const cursorDot = document.querySelector('.cursor-dot'); const cursorCircle = document.querySelector('.cursor-circle'); const projectPreview = document.getElementById('project-preview');
    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; gsap.to(cursorDot, { x: mouseX - 2, y: mouseY - 2, duration: 0 }); });

    const tick = () => {
        cursorX += (mouseX - cursorX) * 0.15; cursorY += (mouseY - cursorY) * 0.15;
        gsap.set(cursorCircle, { x: cursorX, y: cursorY });
        gsap.to(projectPreview, { x: mouseX, y: mouseY, duration: 0.5, ease: "power2.out" });
        requestAnimationFrame(tick);
    };
    tick();

    document.querySelectorAll('a, button, .project-item').forEach(link => {
        link.addEventListener('mouseenter', () => {
            cursorCircle.classList.add('active');
            if (link.classList.contains('project-item')) {
                const img = link.getAttribute('data-img');
                if (img) { projectPreview.src = img; projectPreview.style.opacity = 1; projectPreview.style.transform = "scale(1) translate(-50%, -50%)"; }
            }
        });
        link.addEventListener('mouseleave', () => {
            cursorCircle.classList.remove('active');
            if (link.classList.contains('project-item')) {
                projectPreview.style.opacity = 0; projectPreview.style.transform = "scale(0.8) translate(-50%, -50%)";
            }
        });
    });
}

// --- 5. MOBILE MENU & SMOOTH SCROLL ---
const menuBtn = document.getElementById('open-menu'); const closeBtn = document.getElementById('close-menu'); const menuOverlay = document.getElementById('mobile-menu');
const toggleMenu = () => { menuOverlay.classList.toggle('open'); document.body.style.overflow = menuOverlay.classList.contains('open') ? 'hidden' : 'auto'; };
menuBtn.addEventListener('click', toggleMenu); closeBtn.addEventListener('click', toggleMenu); document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', toggleMenu));

const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), direction: 'vertical', smooth: true, smoothTouch: false }); // SmoothTouch false for better mobile native feel
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); } requestAnimationFrame(raf);

gsap.utils.toArray('.hero-parallax').forEach(layer => {
    const speed = layer.getAttribute('data-speed');
    gsap.to(layer, { y: (i, target) => ScrollTrigger.maxScroll(window) * speed, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 0 } });
});

createIcons({ icons });

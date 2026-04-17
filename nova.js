class NovaEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.noise = new SimplexNoise();
        this.seed = Math.random();
        
        this.init();
        this.createStars();
        this.generatePlanet();
        this.animate();
        this.bindEvents();
        
        this.log('Quantum link initialized. System ready.');
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        this.camera.position.z = 4;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(5, 3, 5);
        this.scene.add(this.sunLight);
    }

    createStars() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 5000; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(200),
                THREE.MathUtils.randFloatSpread(200),
                THREE.MathUtils.randFloatSpread(200)
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    generatePlanet() {
        if (this.planet) this.scene.remove(this.planet);
        
        // Planet Base
        const geometry = new THREE.IcosahedronGeometry(1.5, 64);
        
        // Custom Shader for Procedural Terrain
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                seed: { value: this.seed },
                colorA: { value: new THREE.Color(this.getSeedColor(0.1)) },
                colorB: { value: new THREE.Color(this.getSeedColor(0.5)) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vNoise;
                uniform float seed;
                
                // Simple 3D Noise function
                float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
                vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
                vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
                vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
                vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

                float pnoise(vec3 P, vec3 rep) {
                    vec3 Pi0 = mod(floor(P), rep); vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
                    Pi0 = mod289(Pi0); Pi1 = mod289(Pi1);
                    vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
                    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.yy, Pi1.yy);
                    vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
                    vec4 ixy = permute(permute(ix) + iy); vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
                    vec4 gx0 = ixy0 / 7.0; vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5; gx0 = fract(gx0);
                    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0); vec4 sz0 = step(gz0, vec4(0.0));
                    gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
                    vec4 gx1 = ixy1 / 7.0; vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5; gx1 = fract(gx1);
                    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1); vec4 sz1 = step(gz1, vec4(0.0));
                    gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
                    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
                    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
                    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
                    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
                    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110)));
                    g000 *= norm0.x; g100 *= norm0.y; g010 *= norm0.z; g110 *= norm0.w;
                    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111)));
                    g001 *= norm1.x; g101 *= norm1.y; g011 *= norm1.z; g111 *= norm1.w;
                    float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
                    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
                    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
                    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
                    vec3 fade_xyz = fade(Pf0);
                    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
                    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
                    return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
                }

                void main() {
                    vUv = uv;
                    // FIX: normal * 2.0 + vec3(seed) instead of normal * 2.0 + seed
                    vNoise = pnoise(normal * 2.0 + vec3(seed), vec3(10.0));
                    vec3 newPosition = position + normal * vNoise * 0.2;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying float vNoise;
                uniform vec3 colorA;
                uniform vec3 colorB;

                void main() {
                    vec3 color = mix(colorA, colorB, vNoise + 0.5);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        this.planet = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.planet);
        
        this.updateHUD();
    }

    getSeedColor(offset) {
        const h = (this.seed + offset) % 1;
        const color = new THREE.Color();
        color.setHSL(h, 0.5, 0.4);
        return color;
    }

    log(msg) {
        const log = document.getElementById('discovery-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString([], { hour12: false });
        entry.innerHTML = `<span>[${time}]</span> ${msg}`;
        log.prepend(entry);
    }

    updateHUD() {
        const sector = `NOVA-${Math.floor(this.seed * 1000)}`;
        document.getElementById('sector-id').innerText = sector;
        
        // Random procedural data
        const atmo = ['Nitrogen-Rich', 'Sulfuric', 'Oxidized', 'CO2-Heavy', 'Pure Vacuum'][Math.floor(this.seed * 5)];
        const geo = ['Crystalline', 'Volcanic', 'Tectonic', 'Liquid Core', 'Frozen'][Math.floor((this.seed * 123) % 5)];
        const prob = (this.seed * 100).toFixed(2);
        
        document.getElementById('data-atmo').innerText = atmo;
        document.getElementById('data-geo').innerText = geo;
        document.getElementById('data-prob').innerText = prob + '%';
    }

    jump() {
        this.log('Initiating FTL Jump...');
        this.isJumping = true;
        
        // Visual effect: move planet out then move a new one in
        let startPos = this.camera.position.z;
        let targetPos = 20;
        
        const animateJump = () => {
            if (this.camera.position.z < targetPos) {
                this.camera.position.z += 0.5;
                requestAnimationFrame(animateJump);
            } else {
                this.seed = Math.random();
                this.generatePlanet();
                this.camera.position.z = -10;
                this.bringIn();
            }
        };
        animateJump();
    }

    bringIn() {
        if (this.camera.position.z < 4) {
            this.camera.position.z += 0.5;
            requestAnimationFrame(this.bringIn.bind(this));
        } else {
            this.camera.position.z = 4;
            this.isJumping = false;
            this.log('Arrival at coordinates: ' + document.getElementById('sector-id').innerText);
        }
    }

    scan() {
        this.log('Performing deep planetary scan...');
        document.getElementById('scan-overlay').style.borderColor = 'var(--cyan)';
        
        setTimeout(() => {
            const artifacts = ['Ceramic Shard', 'Bio-Vial', 'Damaged Data-Core', 'Obsidian Totem', 'Unknown Signal'];
            const found = artifacts[Math.floor(Math.random() * artifacts.length)];
            this.log(`DISCOVERY: ${found} extracted from surface.`);
            
            // Add to vault
            const slots = document.querySelectorAll('.artifact-slot');
            for (let slot of slots) {
                if (slot.innerText === '?') {
                    slot.innerText = '★';
                    slot.style.color = 'var(--gold)';
                    break;
                }
            }
        }, 2000);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.getElementById('btn-jump').addEventListener('click', () => this.jump());
        document.getElementById('btn-scan').addEventListener('click', () => this.scan());
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.planet && !this.isJumping) {
            this.planet.rotation.y += 0.002;
            this.planet.rotation.x += 0.001;
        }
        this.stars.rotation.y += 0.0005;
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the engine
window.addEventListener('load', () => {
    new NovaEngine();
});

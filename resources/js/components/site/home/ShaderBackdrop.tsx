import { reducedMotion } from '@/lib/motion';
import { usePrefs } from '@/lib/prefs';
import { useEffect, useRef } from 'react';

/**
 * พื้นหลัง hero: แสงไหลแบบ fluid (fragment shader ล้วน ไม่ใช้ไลบรารี) ขยับตามเมาส์
 * - วาดที่ความละเอียดครึ่งเดียวแล้วให้ CSS ขยาย (ภาพเบลออยู่แล้ว ประหยัด GPU)
 * - หยุดวาดเมื่อเลื่อนพ้นจอ/สลับแท็บ · ผู้ใช้ตั้งลดการเคลื่อนไหว = วาดเฟรมเดียว
 * - เบราว์เซอร์ไม่มี WebGL → ไม่แสดง canvas (ก้อนแสง CSS ที่อยู่ข้างใต้ทำหน้าที่แทน)
 */
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';

const FRAG = `
precision mediump float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
uniform vec3 u_bg, u_c1, u_c2, u_c3; uniform float u_strength;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }

void main(){
    vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
    vec2 m = (u_mouse - .5) * vec2(u_res.x / u_res.y, 1.);
    float t = u_time * .05;

    // domain warping สองชั้น = ลายไหลเหมือนของเหลว
    vec2 q = vec2(fbm(p * 1.1 + t), fbm(p * 1.1 - t + 4.3));
    vec2 r = vec2(fbm(p * 1.5 + q * 1.9 + vec2(1.7, 9.2) + t * 1.4), fbm(p * 1.5 + q * 1.9 + vec2(8.3, 2.8) - t));
    float f = fbm(p * 1.3 + r * 2.1 + m * .4);

    vec3 col = mix(u_bg, u_c1, smoothstep(.28, .82, f));
    col = mix(col, u_c2, smoothstep(.38, .95, r.x) * .8);
    col = mix(col, u_c3, smoothstep(.62, 1., q.y * f * 1.9) * .5);
    col += u_c3 * .12 * smoothstep(.55, 0., length(p - m));          // แสงตามเมาส์

    float vig = smoothstep(1.35, .2, length(p * vec2(.75, 1.)));        // ขอบจางเข้าสีพื้น
    col = mix(u_bg, col, vig * u_strength);
    col += (hash(gl_FragCoord.xy + fract(u_time) * 100.) - .5) * .03;   // เกรนบาง ๆ กันสีเป็นแถบ
    gl_FragColor = vec4(col, 1.);
}`;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const PALETTE = {
    dark: { bg: '#0a0a0b', c1: '#4326c9', c2: '#0b7f7c', c3: '#c8ff3d', strength: 0.92 },
    light: { bg: '#f5f4f0', c1: '#b9a6ff', c2: '#8fe0d8', c3: '#d6f76f', strength: 0.9 },
};

export default function ShaderBackdrop({ className = '' }: { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const { theme } = usePrefs();

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return;

        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };
        const program = gl.createProgram()!;
        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // สามเหลี่ยมเดียวคลุมทั้งจอ
        const loc = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const u = (n: string) => gl.getUniformLocation(program, n);
        const pal = PALETTE[theme];
        gl.uniform3fv(u('u_bg'), rgb(pal.bg));
        gl.uniform3fv(u('u_c1'), rgb(pal.c1));
        gl.uniform3fv(u('u_c2'), rgb(pal.c2));
        gl.uniform3fv(u('u_c3'), rgb(pal.c3));
        gl.uniform1f(u('u_strength'), pal.strength);
        const uRes = u('u_res'), uTime = u('u_time'), uMouse = u('u_mouse');

        const resize = () => {
            const scale = window.innerWidth < 768 ? 0.4 : 0.5;
            canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
            canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(uRes, canvas.width, canvas.height);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
        const onMove = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            mouse.tx = (e.clientX - r.left) / r.width;
            mouse.ty = 1 - (e.clientY - r.top) / r.height;
        };
        window.addEventListener('pointermove', onMove, { passive: true });

        let raf = 0;
        let visible = true;
        const start = performance.now() - Math.random() * 60000; // เริ่มที่จังหวะสุ่ม ไม่ให้ลายเหมือนเดิมทุกครั้ง
        const still = reducedMotion();
        const frame = (now: number) => {
            mouse.x += (mouse.tx - mouse.x) * 0.04;
            mouse.y += (mouse.ty - mouse.y) * 0.04;
            gl.uniform1f(uTime, (now - start) / 1000);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
            else raf = 0;
        };
        const wake = () => {
            if (!raf && visible && !document.hidden && !still) raf = requestAnimationFrame(frame);
        };
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            wake();
        });
        io.observe(canvas);
        document.addEventListener('visibilitychange', wake);
        raf = requestAnimationFrame(frame);
        canvas.dataset.ready = '1';

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('visibilitychange', wake);
        };
    }, [theme]);

    return <canvas ref={ref} aria-hidden="true" className={`h-full w-full opacity-0 transition-opacity duration-1000 data-[ready='1']:opacity-100 ${className}`} />;
}

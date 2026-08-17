<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let canvas: HTMLCanvasElement;
	let animationFrameId: number;
	let gl: WebGLRenderingContext | null = null;
	let cleanupListener: (() => void) | null = null;

	const vertexShaderSource = `
		attribute vec2 position;
		void main() {
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

	const fragmentShaderSource = `
		precision highp float;
		uniform float time;
		uniform vec2 resolution;

		// 2D Random
		vec2 random2(vec2 p) {
			return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
		}

		// Simplex noise for fluid magma underneath
		vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
		float snoise(vec2 v){
			const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
			vec2 i  = floor(v + dot(v, C.yy) );
			vec2 x0 = v -   i + dot(i, C.xx);
			vec2 i1;
			i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
			vec4 x12 = x0.xyxy + C.xxzz;
			x12.xy -= i1;
			i = mod(i, 289.0);
			vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
			vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
			m = m*m ;
			m = m*m ;
			vec3 x = 2.0 * fract(p * C.www) - 1.0;
			vec3 h = abs(x) - 0.5;
			vec3 ox = floor(x + 0.5);
			vec3 a0 = x - ox;
			m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
			vec3 g;
			g.x  = a0.x  * x0.x  + h.x  * x0.y;
			g.yz = a0.yz * x12.xz + h.yz * x12.yw;
			return 130.0 * dot(m, g);
		}

		void main() {
			vec2 st = gl_FragCoord.xy / resolution.xy;
			st.x *= resolution.x / resolution.y;

			// Scale space for Voronoi (Dragon Scales)
			vec2 v_st = st * 5.0;
			
			// Add slow breathing distortion to the grid itself
			v_st += snoise(st * 2.0 + time * 0.1) * 0.5;

			vec2 i_st = floor(v_st);
			vec2 f_st = fract(v_st);

			float m_dist = 1.0;
			
			// Find Voronoi distance
			for (int y = -1; y <= 1; y++) {
				for (int x = -1; x <= 1; x++) {
					vec2 neighbor = vec2(float(x), float(y));
					vec2 point = random2(i_st + neighbor);
					
					// Slow breathing/shifting of the scales
					point = 0.5 + 0.5 * sin(time * 0.4 + 6.2831 * point);
					
					vec2 diff = neighbor + point - f_st;
					float dist = length(diff);
					m_dist = min(m_dist, dist);
				}
			}

			// m_dist is 0 at center of scale, ~0.7 at edges
			// Magma mask (cracks glow red, centers are dark scales)
			float crack = smoothstep(0.2, 0.6, m_dist);
			
			// Lava fluid noise underneath the cracks
			float lavaNoise = snoise(st * 4.0 - time * 0.2) * 0.5 + 0.5;
			
			// Colors - Hydra Theme
			vec3 scaleColor = vec3(0.04, 0.0, 0.0); // Very dark, almost black crimson
			vec3 lavaColor1 = vec3(0.6, 0.05, 0.0); // Deep red blood
			vec3 lavaColor2 = vec3(1.0, 0.1, 0.0);  // Bright glowing magma red
			
			vec3 lava = mix(lavaColor1, lavaColor2, lavaNoise);
			
			// Combine scales and lava
			vec3 finalColor = mix(scaleColor, lava, crack * (lavaNoise * 0.7 + 0.3));

			// Darken edges of the screen for cinematic vignette
			float vignette = length(gl_FragCoord.xy / resolution.xy - 0.5) * 1.5;
			finalColor *= smoothstep(1.2, 0.3, vignette);

			gl_FragColor = vec4(finalColor, 1.0);
		}
	`;

	function createShader(gl: WebGLRenderingContext, type: number, source: string) {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	onMount(() => {
		gl = canvas.getContext('webgl');
		if (!gl) return;

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

		if (!vertexShader || !fragmentShader) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Program linking error:', gl.getProgramInfoLog(program));
			return;
		}

		gl.useProgram(program);

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

		const positionLocation = gl.getAttribLocation(program, 'position');
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		const timeLocation = gl.getUniformLocation(program, 'time');
		const resolutionLocation = gl.getUniformLocation(program, 'resolution');

		const resize = () => {
			if (!canvas || !gl) return;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
		};

		window.addEventListener('resize', resize);
		resize();
		cleanupListener = () => window.removeEventListener('resize', resize);

		const startTime = performance.now();

		const render = (time: number) => {
			if (!gl) return;
			gl.uniform1f(timeLocation, (time - startTime) / 1000.0);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			animationFrameId = requestAnimationFrame(render);
		};

		animationFrameId = requestAnimationFrame(render);
	});

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		if (cleanupListener) {
			cleanupListener();
		}
		if (gl) {
			const ext = gl.getExtension('WEBGL_lose_context');
			if (ext) ext.loseContext();
		}
	});
</script>

<canvas bind:this={canvas} class="hydra-bg"></canvas>

<style>
	.hydra-bg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: -1;
		background-color: #050000;
	}
</style>

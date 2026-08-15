<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { onStateChange } = $props<{
		onStateChange?: (state: 'hidden' | 'revealing' | 'revealed') => void;
	}>();

	let bootState: 'initial' | 'booting' | 'skipping' | 'done' = $state('initial');
	let phase: 'booting' | 'dimming' | 'dissolving' | 'scanline' | 'skipping_transition' =
		$state('booting');
	let dashboardPhase: 'hidden' | 'revealing' | 'revealed' = $state('hidden');
	let reducedMotion = $state(false);

	let backgroundFragments: {
		id: number;
		text: string;
		top: number;
		left: number;
		duration: number;
		delay: number;
	}[] = $state([]);

	let kryzerText = $state('');
	const FULL_KRYZER = 'KRYZER';

	let sysReadyText = $state('');
	const FULL_SYS_READY = 'HYDRA // SYSTEM READY';

	let audioElement: HTMLAudioElement;
	let fadeInterval: ReturnType<typeof setInterval>;
	let skipTimeoutId: ReturnType<typeof setTimeout>;
	let animationFrameId: number;

	let useFallback = false;
	let fallbackStartTime = 0;
	let hasInitialized = false;

	const FRAGMENT_STRINGS = [
		'HYDRA::INIT',
		'CYCLE_ALLOC',
		'PROFILE_MAE',
		'PROFILE_FILHA',
		'DB::SQLITE',
		'QUEUE_READY',
		'ENTRY_WRITE',
		'CPF_GEN',
		'WITHDRAWAL',
		'DEPOSIT',
		'CHEST',
		'101010',
		'0x7F',
		'0xA91F'
	];

	function getPseudoRandom(seed: number) {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}

	let loggedDragon = false;
	let loggedKryzer = false;
	let loggedSysReady = false;

	onMount(() => {
		const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = rmQuery.matches;
		console.log(`[HydraBootIntro] initialized. prefers-reduced-motion: ${reducedMotion}`);

		if (!reducedMotion) {
			const frags = [];
			for (let i = 0; i < 24; i++) {
				frags.push({
					id: i,
					text: FRAGMENT_STRINGS[Math.floor(getPseudoRandom(i * 10) * FRAGMENT_STRINGS.length)],
					top: getPseudoRandom(i * 11) * 100,
					left: getPseudoRandom(i * 12) * 100,
					duration: 4 + getPseudoRandom(i * 13) * 6,
					delay: 0.3 + getPseudoRandom(i * 14) * 3
				});
			}
			backgroundFragments = frags;
		}

		audioElement = new Audio('/audio/hydra-intro.mp4');
		audioElement.preload = 'auto';

		audioElement.addEventListener('ended', handleAudioEnded);

		if (onStateChange) onStateChange('hidden');
	});

	onDestroy(() => {
		if (fadeInterval) clearInterval(fadeInterval);
		if (skipTimeoutId) clearTimeout(skipTimeoutId);
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		if (audioElement) {
			audioElement.removeEventListener('ended', handleAudioEnded);
			audioElement.pause();
			audioElement.removeAttribute('src');
			audioElement.load();
		}
	});

	function handleAudioEnded() {
		if (bootState === 'booting') {
			completeSequence();
		}
	}

	function setDashboard(s: 'hidden' | 'revealing' | 'revealed') {
		dashboardPhase = s;
		if (onStateChange) onStateChange(s);
	}

	function startVisuals(fallback: boolean) {
		bootState = 'booting';
		setDashboard('hidden');
		useFallback = fallback;
		if (fallback) fallbackStartTime = performance.now();
		console.log(`[HydraBootIntro] sequence started. fallback: ${fallback}`);

		function loop() {
			if (bootState === 'booting') {
				const T = useFallback
					? (performance.now() - fallbackStartTime) / 1000
					: audioElement.currentTime;

				if (T >= 0 && T < 2.52 && !loggedDragon) {
					console.log(`[HydraBootIntro] [${T.toFixed(2)}s] Dragon phase started`);
					loggedDragon = true;
				}
				if (T >= 2.52 && !loggedKryzer) {
					console.log(`[HydraBootIntro] [${T.toFixed(2)}s] Dragon phase ended`);
					console.log(`[HydraBootIntro] [${T.toFixed(2)}s] KRYZER phase started`);
					loggedKryzer = true;
				}
				if (T >= 4.33 && !loggedSysReady) {
					console.log(`[HydraBootIntro] [${T.toFixed(2)}s] SYSTEM READY phase started`);
					loggedSysReady = true;
				}

				if (T >= 6.65 && phase === 'booting') {
					phase = 'dimming';
				}
				if (T >= 6.8 && dashboardPhase === 'hidden') {
					setDashboard('revealing');
				}
				if (T >= 6.9 && phase === 'dimming') {
					phase = 'dissolving';
				}
				if (T >= 7.2 && phase === 'dissolving') {
					phase = 'scanline';
				}
				if (T >= 7.51 || (audioElement.ended && T >= 7.5)) {
					console.log(`[HydraBootIntro] [${T.toFixed(2)}s] sequence completed naturally`);
					completeSequence();
				}

				if (bootState === 'booting' && !reducedMotion) {
					const kryzerProgress = Math.max(0, Math.min(1, (T - 2.52) / (3.06 - 2.52)));
					const kryzerChars = Math.floor(kryzerProgress * FULL_KRYZER.length);
					kryzerText = FULL_KRYZER.slice(0, kryzerChars);

					const sysProgress = Math.max(0, Math.min(1, (T - 4.33) / (4.94 - 4.33)));
					const sysChars = Math.floor(sysProgress * FULL_SYS_READY.length);
					sysReadyText = FULL_SYS_READY.slice(0, sysChars);
				} else if (bootState === 'booting' && reducedMotion) {
					// In reduced motion, we can just show the full text immediately when its time comes,
					// or we can just let it type. The user said:
					// "preserve the timed information sequence: KRYZER appears at 2.52s, SYSTEM READY appears at 4.33s"
					// We'll just show the full text instantly when its time is reached.
					if (T >= 2.52) kryzerText = FULL_KRYZER;
					if (T >= 4.33) sysReadyText = FULL_SYS_READY;
				}
			}
			if (bootState !== 'done') {
				animationFrameId = requestAnimationFrame(loop);
			}
		}
		loop();
	}

	function initializeSequence() {
		if (hasInitialized) return;
		hasInitialized = true;

		if (audioElement) {
			audioElement.currentTime = 0;
			audioElement.volume = 1;
			audioElement
				.play()
				.then(() => {
					startVisuals(false);
				})
				.catch((e) => {
					console.warn('Hydra Intro audio playback failed or was blocked:', e);
					startVisuals(true);
				});
		} else {
			startVisuals(true);
		}
	}

	function handleInteraction() {
		if (bootState === 'initial') {
			initializeSequence();
		} else if (bootState === 'booting') {
			skipSequence();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (['Enter', ' ', 'Escape'].includes(event.key)) {
			if (bootState === 'initial') {
				initializeSequence();
			} else if (bootState === 'booting') {
				skipSequence();
			}
		}
	}

	function completeSequence() {
		if (bootState === 'booting' || bootState === 'skipping') {
			bootState = 'done';
			setDashboard('revealed');
		}
	}

	function skipSequence() {
		if (bootState === 'booting') {
			bootState = 'skipping';
			phase = 'skipping_transition';
			setDashboard('revealing');

			if (audioElement && !audioElement.paused) {
				if (fadeInterval) clearInterval(fadeInterval);
				fadeInterval = setInterval(() => {
					if (audioElement.volume > 0.05) {
						audioElement.volume -= 0.05;
					} else {
						audioElement.volume = 0;
						audioElement.pause();
						clearInterval(fadeInterval);
					}
				}, 30);
			}

			skipTimeoutId = setTimeout(() => {
				completeSequence();
			}, 250);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleInteraction} />

{#if bootState !== 'done'}
	<div
		class="hydra-intro {bootState} {phase} {reducedMotion ? 'reduced-motion' : ''}"
		aria-hidden="true"
		inert
	>
		{#if bootState === 'initial'}
			<div class="init-screen">
				<div class="init-brand">HYDRA</div>
				<div class="init-prompt">CLICK TO INITIALIZE<span class="cursor">_</span></div>
			</div>
		{/if}

		{#if bootState === 'booting' || bootState === 'skipping'}
			{#if !reducedMotion}
				<div class="bg-fragments">
					{#each backgroundFragments as frag (frag.id)}
						<div
							class="frag"
							style="top: {frag.top}%; left: {frag.left}%; animation-duration: {frag.duration}s; animation-delay: {frag.delay}s;"
						>
							{frag.text}
						</div>
					{/each}
				</div>
				<div class="scanline"></div>
			{/if}

			<div class="centerpiece">
				<pre class="ascii-dragon">
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣠⣼⠀⠀⠀⠀⠈⠙⡆⢤⠀⠀⠀⠀⠀⣷⣄⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣴⣾⣿⣿⣿⣿⣿⣿⡿⢿⡷⡆⠀⣵⣶⣿⣾⣷⣸⣄⠀⠀⠀⢰⠾⡿⢿⣿⣿⣿⣿⣿⣿⣷⣦⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣾⣿⣿⣿⣿⣽⣿⣿⣿⣿⡟⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⡾⣻⣵⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠐⣻⣿⣿⡏⢹⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣮⣟⢷⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢿⣿⣿⣿⡄⠀⠀⠀⠀⢻⣿⣿⣷⡌⠸⣿⣾⢿⡧⠀⠀⠀⠀⠀⢀⣿⣿⣿⡿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⣠⣾⡿⢛⣵⣾⣿⣿⣿⣿⣿⣯⣾⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⢻⣿⣿⣿⣶⣌⠙⠋⠁⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣷⣽⣿⣿⣿⣿⣿⣷⣮⡙⢿⣿⣆⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣰⡿⢋⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣿⣿⣿⣿⣧⡀⠀⠀⠀⣠⣽⣿⣿⣿⣿⣷⣦⡀⠀⠀⠀⢀⣼⣿⣿⣿⣿⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣝⢿⣇⠀⠀⠀⠀
⠀⠀⠀⣴⣯⣴⣿⣿⠿⢿⣿⣿⣿⣿⣿⣿⡿⢫⣾⣿⣿⣿⣿⣿⣿⡦⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⢴⣿⣿⣿⣿⣿⣿⣷⣝⢿⣿⣿⣿⣿⣿⣿⡿⠿⣿⣿⣧⣽⣦⠀⠀⠀
⠀⠀⣼⣿⣿⣿⠟⢁⣴⣿⡿⢿⣿⣿⡿⠛⣰⣿⠟⣻⣿⣿⣿⣿⣿⣿⣿⡿⠿⠋⢿⣿⣿⣿⣿⣿⠻⢿⣿⣿⣿⣿⣿⣿⣿⣟⠻⣿⣆⠙⢿⣿⣿⡿⢿⣿⣦⡈⠻⣿⣿⣿⣧⠀⠀
⠀⡼⣻⣿⡟⢁⣴⡿⠋⠁⢀⣼⣿⠟⠁⣰⣿⠁⢰⣿⣿⣿⡿⣿⣿⣿⠿⠀⣠⣤⣾⣿⣿⣿⣿⣿⠀⠀⠽⣿⣿⣿⢿⣿⣿⣿⡆⠈⢿⣆⠀⠻⣿⣧⡀⠈⠙⢿⣦⡈⠻⣿⣟⢧⠀
⠀⣱⣿⠋⢠⡾⠋⠀⢀⣠⡾⠟⠁⠀⢀⣿⠟⠀⢸⣿⠙⣿⠀⠈⢿⠏⠀⣾⣿⠛⣻⣿⣿⣿⣿⣯⣤⠀⠀⠹⡿⠁⠀⣿⠏⣿⡇⠀⠹⣿⡄⠀⠈⠻⢷⣄⡀⠀⠙⢷⣄⠙⣿⣎⠂
⢠⣿⠏⠀⣏⢀⣠⠴⠛⠉⠀⠀⠀⠀⠈⠁⠀⠀⠀⠛⠀⠈⠀⠀⠀⠀⠈⢿⣿⣼⣿⣿⣿⣿⢿⣿⣿⣶⠀⠀⠀⠀⠀⠁⠀⠛⠀⠀⠀⠀⠁⠀⠀⠀⠀⠉⠛⠦⣄⣀⣹⠀⠹⣿⡄
⣼⡟⣀⣼⣿⣋⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⠛⠋⠁⠀⢹⣿⣿⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣧⠀⢻⣷
⣿⠃⢰⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣰⣶⣦⣤⠀⠀⣿⡿⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⡆⠘⣿
⣿⠀⢸⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡟⠁⠈⢻⣷⣸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣧⠀⣿
⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣷⣀⣀⣸⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⣿
⢸⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⣿⡿⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⡇
⠈⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠁
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣴⡿⣷⠀⠀⢰⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠴⡿⣟⣿⣿⣶⡶⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
				</pre>

				<div class="hydra-kryzer-group">
					<pre class="ascii-hydra">
  _    _ __     __ _____  _____            
 | |  | |\ \   / /|  __ \|  __ \     /\    
 | |__| | \ \_/ / | |  | | |__) |   /  \   
 |  __  |  \   /  | |  | |  _  /   / /\ \  
 | |  | |   | |   | |__| | | \ \  / ____ \ 
 |_|  |_|   |_|   |_____/|_|  \_\/_/    \_\
					</pre>
					<div class="kryzer-wrapper">
						<div class="ascii-kryzer">{kryzerText}</div>
						<span class="kryzer-cursor">_</span>
					</div>
				</div>

				<div class="sys-ready-wrapper">
					<div class="sys-ready">{sysReadyText}</div>
					<span class="sys-cursor">_</span>
				</div>
			</div>

			<div class="final-scanline"></div>
		{/if}
	</div>
{/if}

<style>
	.hydra-intro {
		position: fixed;
		inset: 0;
		background: rgba(2, 2, 2, 1);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		user-select: none;
		transition:
			opacity 0.4s ease,
			background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1),
			mask-position 0.55s cubic-bezier(0.16, 1, 0.3, 1),
			-webkit-mask-position 0.55s cubic-bezier(0.16, 1, 0.3, 1);

		-webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
		-webkit-mask-size: 100% 300%;
		-webkit-mask-position: 0 0%;
		mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
		mask-size: 100% 300%;
		mask-position: 0 0%;
	}

	.hydra-intro.dissolving,
	.hydra-intro.scanline {
		-webkit-mask-position: 0 100%;
		mask-position: 0 100%;
		background: rgba(2, 2, 2, 0);
	}

	.hydra-intro.skipping_transition {
		opacity: 0;
		transition:
			opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
			-webkit-mask-position 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		-webkit-mask-position: 0 100%;
		mask-position: 0 100%;
	}

	/* INIT SCREEN */
	.init-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		opacity: 0;
		animation: fade-in 1.5s ease forwards;
	}

	.init-brand {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 0.5rem;
		color: rgba(220, 38, 38, 0.4);
	}

	.init-prompt {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		color: #e4e4e7;
		letter-spacing: 2px;
	}

	/* BACKGROUND FRAGMENTS */
	.bg-fragments {
		position: absolute;
		inset: 0;
		pointer-events: none;
		transition: opacity 0.6s ease;
	}

	.hydra-intro.dimming .bg-fragments,
	.hydra-intro.dissolving .bg-fragments,
	.hydra-intro.scanline .bg-fragments {
		opacity: 0;
	}

	.frag {
		position: absolute;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 600;
		color: rgba(220, 38, 38, 0.15);
		white-space: nowrap;
		opacity: 0;
		animation: drift linear infinite forwards;
	}

	@keyframes drift {
		0% {
			transform: translate(-5px, 10px);
			opacity: 0;
		}
		20% {
			opacity: 0.15;
		}
		80% {
			opacity: 0.15;
		}
		100% {
			transform: translate(5px, -10px);
			opacity: 0;
		}
	}

	.scanline {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0),
			rgba(255, 255, 255, 0) 50%,
			rgba(220, 38, 38, 0.04) 50%,
			rgba(255, 255, 255, 0)
		);
		background-size: 100% 4px;
		pointer-events: none;
		animation: scan 8s linear infinite;
	}

	@keyframes scan {
		0% {
			background-position: 0 -100vh;
		}
		100% {
			background-position: 0 100vh;
		}
	}

	/* CENTERPIECE */
	.centerpiece {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		pointer-events: none;
		width: 100%;
		max-width: 100vw;
		box-sizing: border-box;
		padding: 1rem;
		transition:
			opacity 0.6s ease,
			transform 0.6s ease,
			filter 0.6s ease;
	}

	.hydra-intro.dimming .centerpiece,
	.hydra-intro.dissolving .centerpiece,
	.hydra-intro.scanline .centerpiece {
		opacity: 0.6;
		transform: scale(0.995);
		filter: saturate(0.2) contrast(0.8) brightness(0.8);
	}

	.ascii-dragon {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.2rem, 1.2vw, 0.55rem);
		line-height: 1.1;
		color: #e4e4e7;
		margin: 0;
		margin-bottom: 1rem;
		text-align: center;
		white-space: pre;
		opacity: 0;
		clip-path: inset(0 0 100% 0);
		animation:
			fade-in 0.01s 0s forwards,
			reveal-dragon 2.52s cubic-bezier(0.16, 1, 0.3, 1) 0s forwards,
			ambient-breathe 4s ease-in-out 1.5s infinite alternate;
	}

	@keyframes reveal-dragon {
		0% {
			clip-path: inset(0 0 100% 0);
			transform: translateY(15px);
		}
		100% {
			clip-path: inset(0 0 0 0);
			transform: translateY(0);
		}
	}

	@keyframes ambient-breathe {
		0% {
			filter: drop-shadow(0 0 0px rgba(220, 38, 38, 0));
			opacity: 0.9;
		}
		100% {
			filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0.3));
			opacity: 1;
		}
	}

	.hydra-kryzer-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.ascii-hydra {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.3rem, 1vw, 0.9rem);
		line-height: 1.1;
		color: rgba(228, 228, 231, 0.8);
		margin: 0;
		text-align: center;
		white-space: pre-wrap;
		opacity: 0;
		animation: reveal-ascii 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.5s forwards;
		clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
	}

	@keyframes reveal-ascii {
		0% {
			opacity: 0;
			clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
			transform: translateY(0);
		}
	}

	.kryzer-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 0.8rem;
		opacity: 0;
		animation: fade-in 0.01s 2.52s forwards;
	}

	.ascii-kryzer {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.6rem, 1.8vw, 1.1rem);
		font-weight: 900;
		letter-spacing: 0.8rem;
		color: #dc2626;
		margin: 0;
		text-align: center;
		white-space: pre;
		animation:
			glow-glitch 0.4s cubic-bezier(0.16, 1, 0.3, 1) 2.52s forwards,
			flicker 3s infinite 3.06s;
	}

	.kryzer-cursor {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.6rem, 1.8vw, 1.1rem);
		font-weight: 900;
		color: #dc2626;
		animation: blink 0.8s step-end infinite;
		margin-left: -0.2rem;
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@keyframes glow-glitch {
		0% {
			text-shadow:
				3px 0 red,
				-3px 0 darkred;
			opacity: 1;
			transform: translateX(-2px);
		}
		20% {
			text-shadow:
				-3px 0 red,
				3px 0 darkred;
			transform: translateX(2px);
		}
		40% {
			text-shadow:
				2px 0 red,
				-2px 0 darkred;
			transform: translateX(-1px);
		}
		60% {
			text-shadow:
				-2px 0 red,
				2px 0 darkred;
			transform: translateX(1px);
		}
		100% {
			text-shadow: 0 0 16px rgba(220, 38, 38, 0.6);
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes flicker {
		0%,
		95%,
		98%,
		100% {
			opacity: 1;
			text-shadow: 0 0 16px rgba(220, 38, 38, 0.6);
		}
		96% {
			opacity: 0.8;
			text-shadow: none;
		}
		97% {
			opacity: 0.9;
			text-shadow: 2px 0 red;
		}
		99% {
			opacity: 0.7;
			text-shadow: -2px 0 darkred;
		}
	}

	.sys-ready-wrapper {
		display: flex;
		align-items: center;
		margin-top: 1.5rem;
		opacity: 0;
		animation: fade-in 0.01s 4.33s forwards;
	}

	.sys-ready {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: #71717a;
		letter-spacing: 1.5px;
		white-space: pre;
	}

	.sys-cursor {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		display: inline-block;
		animation: blink 0.8s step-end infinite;
		color: #dc2626;
		margin-left: 2px;
	}

	.cursor {
		display: inline-block;
		animation: blink 0.8s step-end infinite;
		color: #dc2626;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	/* FINAL SCANLINE */
	.final-scanline {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: #dc2626;
		box-shadow:
			0 0 12px 2px rgba(220, 38, 38, 0.8),
			0 0 4px #fff;
		top: -10px;
		opacity: 0;
		pointer-events: none;
		z-index: 3;
	}

	.hydra-intro.scanline .final-scanline {
		animation: final-scan 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes final-scan {
		0% {
			top: 0;
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}

	/* REDUCED MOTION */
	.reduced-motion .ascii-dragon {
		animation: fade-in 2.52s ease 0s forwards !important;
		clip-path: none !important;
		transform: none !important;
		filter: none !important;
	}

	.reduced-motion .ascii-hydra {
		animation: fade-in 0.6s ease 1.5s forwards !important;
		clip-path: none !important;
		transform: none !important;
	}

	.reduced-motion .kryzer-wrapper,
	.reduced-motion .ascii-kryzer {
		animation: fade-in 0.54s ease 2.52s forwards !important;
		text-shadow: none !important;
		transform: none !important;
	}

	.reduced-motion .sys-ready-wrapper,
	.reduced-motion .sys-ready {
		animation: fade-in 0.61s ease 4.33s forwards !important;
	}

	.reduced-motion .init-screen {
		animation: none !important;
		opacity: 1;
	}
</style>

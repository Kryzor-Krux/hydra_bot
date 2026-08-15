<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { Cycle, CycleProfile } from '$lib/modules/ciclos/domain/types';

	import { parseMoneyToCents, formatCents } from '$lib/modules/ciclos/domain/money';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let copiedId = $state('');
	let ariaLiveMessage = $state('');

	// Server-driven count accumulation for load-more
	const BATCH = 5;
	let allCycles = $derived(data.cycles || []);
	let canLoadMore = $derived(data.hasMore ?? false);

	// Flash state for when a value is added successfully
	let flashProfileId = $state('');
	let flashType = $state('');

	// Local state for deterministic keyboard flow and optimistic UX
	let localTotals = $state<
		Record<
			string,
			{
				total_deposits: string;
				total_withdrawals: string;
				total_chests: string;
				computed_balance: string;
			}
		>
	>({});

	const transactionQueue: Record<string, Promise<void>> = {};

	function handleKeydown(
		event: KeyboardEvent,
		profileId: string,
		type: 'deposit' | 'withdrawal' | 'chest'
	) {
		if (event.key === 'Enter' && !event.isComposing && !event.shiftKey) {
			event.preventDefault();
			const input = event.currentTarget as HTMLInputElement;
			const amountStr = input.value.trim();

			if (!amountStr || parseFloat(amountStr) <= 0) return;

			// 1. Synchronously clear the input, don't blur it
			input.value = '';

			const queueKey = `${profileId}:${type}`;

			// Flash feedback immediately
			flashProfileId = profileId;
			flashType = type;
			setTimeout(() => {
				if (flashProfileId === profileId && flashType === type) {
					flashProfileId = '';
					flashType = '';
				}
			}, 600);

			// 2. Optimistically update local totals
			const current =
				localTotals[profileId] ||
				allCycles.flatMap((c) => c.profiles).find((p) => p.id === profileId);
			if (current) {
				let dep = parseMoneyToCents(current.total_deposits);
				let wdl = parseMoneyToCents(current.total_withdrawals);
				let chest = parseMoneyToCents(current.total_chests);

				const amt = parseMoneyToCents(amountStr);
				if (type === 'deposit') dep += amt;
				if (type === 'withdrawal') wdl += amt;
				if (type === 'chest') chest += amt;

				const bal = wdl + chest - dep;

				localTotals[profileId] = {
					total_deposits: formatCents(dep),
					total_withdrawals: formatCents(wdl),
					total_chests: formatCents(chest),
					computed_balance: formatCents(bal)
				};
			}

			// 3. Enqueue the network request
			const currentPromise = transactionQueue[queueKey] || Promise.resolve();
			const nextPromise = currentPromise.then(async () => {
				try {
					const res = await fetch('/api/ciclos/entries', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ profileId, type, amount: amountStr })
					});
					const result = await res.json();
					if (result.success && result.totals) {
						// Reconcile with authoritative server totals
						localTotals[profileId] = result.totals;
					} else {
						console.error('Entry persistence failed:', result.error);
						// Do not steal focus, just log error for now
					}
				} catch (err) {
					console.error('Failed to post entry:', err);
				}
			});
			transactionQueue[queueKey] = nextPromise;
		}
	}

	function fmtSigned(
		raw: string | undefined,
		mode: 'deposit' | 'withdrawal' | 'chest' | 'balance'
	): string {
		const val = parseFloat(raw ?? '0');
		const abs = Math.abs(val).toFixed(2);
		if (mode === 'deposit') return `-${abs}`;
		if (mode === 'withdrawal' || mode === 'chest') return `+${abs}`;
		// balance: show real sign
		if (val > 0) return `+${abs}`;
		if (val < 0) return `-${Math.abs(val).toFixed(2)}`;
		return `0.00`;
	}

	function copyProfile(profile: CycleProfile | undefined, label: string) {
		if (!profile) return;
		const deps = fmtSigned(profile.total_deposits, 'deposit');
		const saqs = fmtSigned(profile.total_withdrawals, 'withdrawal');
		const baus = fmtSigned(profile.total_chests, 'chest');
		const saldo = fmtSigned(profile.computed_balance, 'balance');
		const text = `nome: ${profile.name}
senha: ${profile.generated_password}
cpf: ${profile.cpf}
numero: ${profile.number}
senha saque: ${profile.withdrawal_password}
depositos: ${deps}
saques: ${saqs}
baus: ${baus}
saldo: ${saldo}`;

		navigator.clipboard.writeText(text).then(() => {
			copiedId = profile.id;
			ariaLiveMessage = `Perfil ${label} copiado para a área de transferência.`;
			setTimeout(() => {
				if (copiedId === profile.id) {
					copiedId = '';
					ariaLiveMessage = '';
				}
			}, 2000);
		});
	}

	function copyCycle(cycle: Cycle) {
		const mae = cycle.profiles.find((p: CycleProfile) => p.role === 'mae');
		const filha = cycle.profiles.find((p: CycleProfile) => p.role === 'filha');

		const profileText = (p: CycleProfile, label: string) => {
			const deps = fmtSigned(p.total_deposits, 'deposit');
			const saqs = fmtSigned(p.total_withdrawals, 'withdrawal');
			const baus = fmtSigned(p.total_chests, 'chest');
			const saldo = fmtSigned(p.computed_balance, 'balance');
			return `--- ${label} ---
nome: ${p.name}
senha: ${p.generated_password}
cpf: ${p.cpf}
numero: ${p.number}
senha saque: ${p.withdrawal_password}
depositos: ${deps}
saques: ${saqs}
baus: ${baus}
saldo: ${saldo}`;
		};

		let text = '';
		if (mae) text += profileText(mae, 'MÃE') + '\n\n';
		if (filha) text += profileText(filha, 'FILHA');

		navigator.clipboard.writeText(text).then(() => {
			copiedId = cycle.id;
			ariaLiveMessage = `Ciclo copiado para a área de transferência.`;
			setTimeout(() => {
				if (copiedId === cycle.id) {
					copiedId = '';
					ariaLiveMessage = '';
				}
			}, 2000);
		});
	}

	function handleFormSubmit() {
		loading = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			loading = false;
		};
	}

	let updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

	function debounceUpdate(formElement: HTMLFormElement, profileId: string) {
		if (updateTimeouts[profileId]) clearTimeout(updateTimeouts[profileId]);
		updateTimeouts[profileId] = setTimeout(() => {
			formElement.requestSubmit();
		}, 500);
	}

	function loadMore() {
		const nextCount = (data.count ?? BATCH) + BATCH;
		// Navigate to the same page with an incremented count param
		// SvelteKit will re-run the load function and fetch more cycles from the server
		window.location.href = `/ciclos?count=${nextCount}`;
	}

	function balanceClass(raw: string | undefined): string {
		const val = parseFloat(raw ?? '0');
		if (val > 0) return 'pos';
		if (val < 0) return 'neg';
		return 'zero';
	}
</script>

<svelte:head>
	<title>HYDRA – CICLOS</title>
	<meta name="description" content="HYDRA CICLOS – Geração e gerenciamento de ciclos de perfis." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="sr-only" aria-live="polite">{ariaLiveMessage}</div>

<div class="app">
	<!-- ─── HEADER ─────────────────────────────────────────── -->
	<header class="hdr">
		<div class="hdr-brand">
			<span class="hdr-logo">HYDRA</span>
			<span class="hdr-mod">CICLOS</span>
		</div>

		<form method="POST" action="?/generate" use:enhance={handleFormSubmit}>
			<button class="btn-gen" type="submit" disabled={loading} id="btn-generate">
				{#if loading}
					<span class="btn-spinner"></span>
					GERANDO…
				{:else}
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<polyline points="23 4 23 10 17 10"></polyline>
						<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
					</svg>
					GERAR DADOS
				{/if}
			</button>
		</form>
	</header>

	<!-- ─── MAIN ──────────────────────────────────────────── -->
	<main class="main">
		{#if form?.error}
			<div class="err-banner" role="alert">{form.error}</div>
		{/if}

		{#if allCycles.length === 0}
			<!-- EMPTY STATE -->
			<div class="empty">
				<div class="empty-icon" aria-hidden="true">
					<svg
						width="40"
						height="40"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<h2 class="empty-title">Nenhum ciclo gerado</h2>
				<p class="empty-sub">Clique em <strong>GERAR DADOS</strong> para criar o primeiro ciclo.</p>
			</div>
		{:else}
			<div class="cycles">
				{#each allCycles as cycle, i (cycle.id)}
					<div class="cycle-card" style="animation-delay: {i * 60}ms">
						<!-- Cycle header row -->
						<div class="cycle-hdr">
							<div class="cycle-meta">
								<span class="cycle-label">CICLO</span>
								<span class="cycle-ts"
									>{new Date(cycle.created_at || '').toLocaleString('pt-BR', {
										day: '2-digit',
										month: '2-digit',
										year: '2-digit',
										hour: '2-digit',
										minute: '2-digit'
									})}</span
								>
							</div>
							<button
								class="btn-copy-cycle"
								type="button"
								onclick={() => copyCycle(cycle)}
								aria-label="Copiar ciclo completo"
								id="btn-copy-cycle-{cycle.id}"
							>
								{#if copiedId === cycle.id}
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
									>
										<polyline points="20 6 9 17 4 12"></polyline>
									</svg>
									OK
								{:else}
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
									</svg>
									Copiar Ciclo
								{/if}
							</button>
						</div>

						<!-- Profile pair -->
						<div class="profiles">
							{#each ['mae', 'filha'] as role (role)}
								{@const profile = cycle.profiles.find((p: CycleProfile) => p.role === role)}
								{#if profile}
									{@const profileData = localTotals[profile.id] || profile}
									<div class="profile-card">
										<!-- Profile header -->
										<div class="profile-hdr">
											<span class="role-badge">{role === 'mae' ? 'MÃE' : 'FILHA'}</span>
											<button
												class="btn-copy-profile"
												type="button"
												onclick={() => copyProfile(profile, role === 'mae' ? 'MÃE' : 'FILHA')}
												aria-label="Copiar perfil {role}"
												id="btn-copy-profile-{profile.id}"
											>
												{#if copiedId === profile.id}
													<svg
														width="11"
														height="11"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
													>
														<polyline points="20 6 9 17 4 12"></polyline>
													</svg>
												{:else}
													<svg
														width="11"
														height="11"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
														<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
														></path>
													</svg>
												{/if}
											</button>
										</div>

										<!-- Identity fields -->
										<div class="id-grid">
											<span class="id-label">nome</span>
											<span class="id-val">{profile.name}</span>

											<span class="id-label">senha</span>
											<span class="id-val mono">{profile.generated_password}</span>

											<span class="id-label">cpf</span>
											<span class="id-val mono">{profile.cpf}</span>

											<span class="id-label">numero</span>
											<form
												method="POST"
												action="?/update"
												use:enhance
												oninput={(e) => debounceUpdate(e.currentTarget, profile.id)}
												class="id-form"
											>
												<input type="hidden" name="profileId" value={profile.id} />
												<input
													id="{profile.id}-number"
													name="number"
													type="text"
													maxlength="255"
													value={profile.number}
													class="id-input"
													placeholder="—"
													aria-label="Número do perfil {role}"
												/>
											</form>

											<span class="id-label">s. saque</span>
											<span class="id-val mono">{profile.withdrawal_password}</span>
										</div>

										<div class="fin-summary">
											<div
												class="fin-row fin-dep {flashProfileId === profile.id &&
												flashType === 'deposit'
													? 'flash'
													: ''}"
											>
												<span class="fin-lbl">Depósitos</span>
												<span class="fin-val neg"
													>{fmtSigned(profileData.total_deposits, 'deposit')}</span
												>
											</div>
											<div
												class="fin-row fin-saq {flashProfileId === profile.id &&
												flashType === 'withdrawal'
													? 'flash'
													: ''}"
											>
												<span class="fin-lbl">Saques</span>
												<span class="fin-val pos"
													>{fmtSigned(profileData.total_withdrawals, 'withdrawal')}</span
												>
											</div>
											<div
												class="fin-row fin-bau {flashProfileId === profile.id &&
												flashType === 'chest'
													? 'flash'
													: ''}"
											>
												<span class="fin-lbl">Baús</span>
												<span class="fin-val pos"
													>{fmtSigned(profileData.total_chests, 'chest')}</span
												>
											</div>
											<div class="fin-row fin-saldo">
												<span class="fin-lbl-saldo">SALDO</span>
												<span class="fin-val saldo {balanceClass(profileData.computed_balance)}"
													>{fmtSigned(profileData.computed_balance, 'balance')}</span
												>
											</div>
										</div>

										<!-- Entry inputs -->
										<div class="entry-row">
											<div class="entry-form">
												<input
													id="entry-{profile.id}-deposit"
													name="amount"
													type="number"
													step="0.01"
													min="0.01"
													placeholder="Dep."
													class="entry-input dep"
													aria-label="Adicionar depósito"
													onkeydown={(e) => handleKeydown(e, profile.id, 'deposit')}
												/>
											</div>

											<div class="entry-form">
												<input
													id="entry-{profile.id}-withdrawal"
													name="amount"
													type="number"
													step="0.01"
													min="0.01"
													placeholder="Saque"
													class="entry-input saq"
													aria-label="Adicionar saque"
													onkeydown={(e) => handleKeydown(e, profile.id, 'withdrawal')}
												/>
											</div>

											<div class="entry-form">
												<input
													id="entry-{profile.id}-chest"
													name="amount"
													type="number"
													step="0.01"
													min="0.01"
													placeholder="Baú"
													class="entry-input bau"
													aria-label="Adicionar baú"
													onkeydown={(e) => handleKeydown(e, profile.id, 'chest')}
												/>
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- LOAD MORE -->
			{#if canLoadMore}
				<div class="load-more-wrapper">
					<button class="btn-load-more" type="button" onclick={loadMore} id="btn-load-more">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
						Carregar Mais
					</button>
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	/* ─── RESET / GLOBALS ───────────────────────────────── */
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		background: #020202;
		color: #e4e4e7;
		font-family:
			'Outfit',
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* ─── SR-ONLY ───────────────────────────────────────── */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* ─── APP SHELL ─────────────────────────────────────── */
	.app {
		min-height: 100vh;
		max-width: 1100px;
		margin: 0 auto;
		padding: 0 1.25rem 4rem;
		position: relative;
	}
	.app::before {
		content: '';
		position: fixed;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.04) 0%, transparent 50%);
		pointer-events: none;
		z-index: -1;
	}

	/* ─── HEADER ────────────────────────────────────────── */
	.hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 0 1.25rem;
		border-bottom: 1px solid rgba(220, 38, 38, 0.12);
		margin-bottom: 2.5rem;
		position: sticky;
		top: 0;
		z-index: 10;
		background: rgba(2, 2, 2, 0.7);
		backdrop-filter: blur(16px);
	}

	.hdr-brand {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
	}

	.hdr-logo {
		font-size: 1.7rem;
		font-weight: 900;
		letter-spacing: 3px;
		color: #dc2626;
		line-height: 1;
		text-shadow: 0 0 24px rgba(220, 38, 38, 0.35);
	}

	.hdr-mod {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 3px;
		color: #52525b;
		text-transform: uppercase;
	}

	/* ─── GENERATE BUTTON ───────────────────────────────── */
	.btn-gen {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.6rem 1.4rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 1.5px;
		border-radius: 6px;
		cursor: pointer;
		transition:
			transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.4s ease;
		box-shadow:
			0 4px 16px rgba(220, 38, 38, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
		font-family: inherit;
	}

	.btn-gen:hover:not(:disabled) {
		transform: translateY(-2px) scale(1.02);
		box-shadow:
			0 8px 32px rgba(220, 38, 38, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.btn-gen:active:not(:disabled) {
		transform: translateY(0) scale(0.98);
	}

	.btn-gen:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-spinner {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.35);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ─── ERROR BANNER ──────────────────────────────────── */
	.err-banner {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #f87171;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	/* ─── EMPTY STATE ───────────────────────────────────── */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 5rem 2rem;
		text-align: center;
		background: linear-gradient(160deg, #111113 0%, #0e0e10 100%);
		border: 1px solid #1e1e22;
		border-radius: 16px;
		animation: fade-in 0.4s ease both;
	}

	.empty-icon {
		color: #3f3f46;
		margin-bottom: 0.5rem;
	}

	.empty-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #71717a;
	}

	.empty-sub {
		margin: 0;
		font-size: 0.875rem;
		color: #52525b;
		max-width: 300px;
	}

	.empty-sub strong {
		color: #dc2626;
	}

	/* ─── CYCLES CONTAINER ──────────────────────────────── */
	.cycles {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ─── CYCLE CARD ────────────────────────────────────── */
	.cycle-card {
		background: rgba(12, 12, 14, 0.4);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.02) inset,
			0 8px 32px rgba(0, 0, 0, 0.6);
		transition:
			border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-fill-mode: both;
	}

	.cycle-card:hover {
		border-color: rgba(220, 38, 38, 0.3);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.05) inset,
			0 12px 48px rgba(0, 0, 0, 0.8),
			0 0 0 1px rgba(220, 38, 38, 0.1);
		transform: translateY(-2px) scale(1.002);
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* ─── CYCLE HEADER ──────────────────────────────────── */
	.cycle-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.9rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #1e1e22;
	}

	.cycle-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.cycle-label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 2px;
		color: #dc2626;
		text-shadow: 0 0 12px rgba(220, 38, 38, 0.25);
	}

	.cycle-ts {
		font-size: 0.72rem;
		color: #3f3f46;
	}

	.btn-copy-cycle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: 1px solid #27272a;
		color: #52525b;
		padding: 0.28rem 0.65rem;
		border-radius: 5px;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.btn-copy-cycle:hover {
		border-color: rgba(220, 38, 38, 0.4);
		color: #f87171;
		background: rgba(220, 38, 38, 0.06);
	}

	/* ─── PROFILES GRID ─────────────────────────────────── */
	.profiles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.9rem;
	}

	@media (max-width: 640px) {
		.profiles {
			grid-template-columns: 1fr;
		}
	}

	/* ─── PROFILE CARD ──────────────────────────────────── */
	.profile-card {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 10px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		transition:
			border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.profile-card:hover {
		border-color: rgba(220, 38, 38, 0.2);
		transform: translateY(-2px);
	}

	/* ─── PROFILE HEADER ────────────────────────────────── */
	.profile-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.role-badge {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 2px;
		color: #dc2626;
		padding: 0.18rem 0.55rem;
		background: rgba(220, 38, 38, 0.08);
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: 4px;
	}

	.btn-copy-profile {
		background: transparent;
		border: 1px solid #27272a;
		color: #3f3f46;
		padding: 0.22rem 0.45rem;
		border-radius: 4px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.btn-copy-profile:hover {
		border-color: rgba(220, 38, 38, 0.35);
		color: #f87171;
		background: rgba(220, 38, 38, 0.05);
	}

	/* ─── IDENTITY GRID ─────────────────────────────────── */
	.id-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.3rem 0.6rem;
		align-items: center;
	}

	.id-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: #3f3f46;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}

	.id-val {
		font-size: 0.8rem;
		color: #a1a1aa;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mono {
		font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: #71717a;
	}

	.id-form {
		display: contents;
	}

	.id-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		color: #e4e4e7;
		font-size: 0.78rem;
		padding: 0.22rem 0.45rem;
		font-family: 'JetBrains Mono', monospace;
		outline: none;
		transition:
			border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.id-input:focus {
		border-color: rgba(220, 38, 38, 0.6);
		box-shadow: 0 0 12px rgba(220, 38, 38, 0.15);
	}

	.id-input::placeholder {
		color: #3f3f46;
	}

	/* ─── FINANCIAL SUMMARY ─────────────────────────────── */
	.fin-summary {
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 0.75rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.fin-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.2rem 0;
		border-radius: 4px;
		transition: text-shadow 0.4s ease;
	}

	.fin-row.flash {
		animation: flash-row 1s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes flash-row {
		0%,
		100% {
			text-shadow: none;
		}
		20% {
			text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
		}
	}

	.fin-saldo {
		border-top: 1px solid #1a1a1e;
		margin-top: 0.15rem;
		padding-top: 0.3rem;
	}

	.fin-lbl {
		font-size: 0.65rem;
		font-weight: 600;
		color: #3f3f46;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.fin-lbl-saldo {
		font-size: 0.65rem;
		font-weight: 800;
		color: #52525b;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.fin-val {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.78rem;
		font-weight: 600;
	}

	.fin-val.pos {
		color: #10b981;
	}
	.fin-val.neg {
		color: #f87171;
	}
	.fin-val.zero {
		color: #52525b;
	}

	.fin-val.saldo {
		font-size: 0.9rem;
		font-weight: 800;
	}

	.fin-val.saldo.pos {
		color: #10b981;
		text-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
	}
	.fin-val.saldo.neg {
		color: #f87171;
		text-shadow: 0 0 12px rgba(248, 113, 113, 0.2);
	}
	.fin-val.saldo.zero {
		color: #52525b;
	}

	/* ─── ENTRY INPUTS ──────────────────────────────────── */
	.entry-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.45rem;
	}

	.entry-form {
		display: contents;
	}

	.entry-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: #e4e4e7;
		font-size: 0.78rem;
		padding: 0.4rem 0.55rem;
		font-family: 'JetBrains Mono', monospace;
		outline: none;
		transition:
			border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
			background 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.entry-input::-webkit-outer-spin-button,
	.entry-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.entry-input::placeholder {
		color: #52525b;
		font-size: 0.72rem;
	}

	.entry-input.dep:focus {
		background: rgba(220, 38, 38, 0.05);
		border-color: rgba(248, 113, 113, 0.6);
		box-shadow: 0 0 16px rgba(220, 38, 38, 0.15);
	}

	.entry-input.saq:focus,
	.entry-input.bau:focus {
		background: rgba(16, 185, 129, 0.05);
		border-color: rgba(16, 185, 129, 0.6);
		box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
	}

	/* ─── LOAD MORE ─────────────────────────────────────── */
	.load-more-wrapper {
		display: flex;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.btn-load-more {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: transparent;
		border: 1px solid #27272a;
		color: #71717a;
		padding: 0.55rem 1.5rem;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.btn-load-more:hover {
		border-color: rgba(220, 38, 38, 0.35);
		color: #f87171;
		background: rgba(220, 38, 38, 0.05);
		transform: translateY(1px);
	}

	.btn-load-more:active {
		transform: translateY(2px);
	}
</style>

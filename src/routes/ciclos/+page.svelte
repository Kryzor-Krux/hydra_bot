<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { Cycle, CycleProfile, CycleProfileEntry } from '$lib/modules/ciclos/domain/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	let copiedId = $state('');
	let ariaLiveMessage = $state('');

	let cycles = $derived(data.cycles || []);

	function copyProfile(profile: CycleProfile | undefined, label: string) {
		if (!profile) return;
		const text = `nome: ${profile.name}
senha: ${profile.generated_password}
cpf: ${profile.cpf}
numero: ${profile.number}
senha saque: ${profile.withdrawal_password}
depositos: ${profile.total_deposits ?? '0.00'}
saques: ${profile.total_withdrawals ?? '0.00'}
baus: ${profile.total_chests ?? '0.00'}
saldo: ${profile.computed_balance ?? '0.00'}`;

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

		let text = '';
		if (mae) {
			text += `--- MÃE ---
nome: ${mae.name}
senha: ${mae.generated_password}
cpf: ${mae.cpf}
numero: ${mae.number}
senha saque: ${mae.withdrawal_password}
depositos: ${mae.total_deposits ?? '0.00'}
saques: ${mae.total_withdrawals ?? '0.00'}
baus: ${mae.total_chests ?? '0.00'}
saldo: ${mae.computed_balance ?? '0.00'}

`;
		}
		if (filha) {
			text += `--- FILHA ---
nome: ${filha.name}
senha: ${filha.generated_password}
cpf: ${filha.cpf}
numero: ${filha.number}
senha saque: ${filha.withdrawal_password}
depositos: ${filha.total_deposits ?? '0.00'}
saques: ${filha.total_withdrawals ?? '0.00'}
baus: ${filha.total_chests ?? '0.00'}
saldo: ${filha.computed_balance ?? '0.00'}`;
		}

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

	const handleEntrySubmit: import('@sveltejs/kit').SubmitFunction = ({ cancel, formElement }) => {
		if (formElement.dataset.submitting === 'true') {
			cancel();
			return;
		}
		formElement.dataset.submitting = 'true';
		return async ({ update }) => {
			try {
				await update({ reset: true });
			} finally {
				formElement.dataset.submitting = 'false';
			}
		};
	};

	let updateTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

	function debounceUpdate(formElement: HTMLFormElement, profileId: string) {
		if (updateTimeouts[profileId]) clearTimeout(updateTimeouts[profileId]);
		updateTimeouts[profileId] = setTimeout(() => {
			formElement.requestSubmit();
		}, 500);
	}

	function getEntries(profile: CycleProfile, type: string) {
		return profile.entries?.filter((e) => e.type === type) || [];
	}
</script>

<svelte:head>
	<title>HYDRA - CICLOS</title>
</svelte:head>

<div class="sr-only" aria-live="polite">{ariaLiveMessage}</div>

<div class="app-container">
	<header>
		<div class="title-wrapper">
			<h1>HYDRA</h1>
			<div class="module-indicator">CICLOS V2</div>
		</div>
		<form method="POST" action="?/generate" use:enhance={handleFormSubmit}>
			<button class="generate-btn" type="submit" disabled={loading}>
				{loading ? 'GERANDO...' : 'GERAR DADOS'}
			</button>
		</form>
	</header>

	<main>
		{#if form?.error}
			<div class="error-banner">
				{form.error}
			</div>
		{/if}

		{#if cycles.length === 0}
			<div class="empty-state">
				<p>Nenhum ciclo encontrado. Clique em "GERAR DADOS" para começar.</p>
			</div>
		{:else}
			<div class="cycles-stack">
				{#each cycles as cycle (cycle.id)}
					<div class="cycle-block">
						<div class="cycle-header">
							<h3>
								Ciclo <span class="text-subtle"
									>({new Date(cycle.created_at || '').toLocaleString()})</span
								>
							</h3>
							<button
								class="copy-btn subtle-btn"
								onclick={() => copyCycle(cycle)}
								aria-label="Copiar Ciclo Completo"
							>
								{copiedId === cycle.id ? 'Copiado!' : '📋 Copiar Ciclo'}
							</button>
						</div>

						<div class="cards-container">
							{#each ['mae', 'filha'] as role (role)}
								{@const profile = cycle.profiles.find((p: CycleProfile) => p.role === role)}
								{#if profile}
									<div class="card">
										<div class="card-header">
											<h2>{role === 'mae' ? 'MÃE' : 'FILHA'}</h2>
											<button
												type="button"
												class="copy-icon"
												aria-label={`Copiar perfil ${role}`}
												onclick={() => copyProfile(profile, role.toUpperCase())}
											>
												{copiedId === profile.id ? 'Copiado' : '📋'}
											</button>
										</div>

										<div class="identity-section">
											<div class="field readonly">
												<span class="label">nome:</span>
												<span class="value">{profile.name}</span>
											</div>
											<div class="field readonly">
												<span class="label">senha:</span>
												<span class="value font-mono">{profile.generated_password}</span>
											</div>
											<div class="field readonly">
												<span class="label">cpf:</span>
												<span class="value font-mono">{profile.cpf}</span>
											</div>

											<form
												method="POST"
												action="?/update"
												use:enhance
												oninput={(e) => debounceUpdate(e.currentTarget, profile.id)}
											>
												<input type="hidden" name="profileId" value={profile.id} />
												<div class="field editable">
													<label for="{profile.id}-number" class="label">numero:</label>
													<input
														id="{profile.id}-number"
														name="number"
														type="text"
														maxlength="255"
														value={profile.number}
													/>
												</div>
											</form>

											<div class="field readonly">
												<span class="label">senha saque:</span>
												<span class="value font-mono">{profile.withdrawal_password}</span>
											</div>
										</div>

										<div class="financial-section">
											<!-- Depositos -->
											<div class="fin-block">
												<div class="fin-header">
													<span class="fin-title">Depósitos</span>
													<span class="fin-total positive">+{profile.total_deposits ?? '0.00'}</span
													>
												</div>
												<div class="fin-entries">
													{#each getEntries(profile, 'deposit') as entry (entry.id)}
														<span class="chip">+{entry.amount}</span>
													{/each}
												</div>
												<form
													method="POST"
													action="?/addEntry"
													use:enhance={handleEntrySubmit}
													class="add-entry-form"
												>
													<input type="hidden" name="profileId" value={profile.id} />
													<input type="hidden" name="type" value="deposit" />
													<input
														name="amount"
														type="number"
														step="0.01"
														placeholder="Adicionar + (Enter)"
														required
													/>
													<button
														type="submit"
														class="sr-only"
														tabindex="-1"
														aria-label="Adicionar depósito"
													></button>
												</form>
											</div>

											<!-- Saques -->
											<div class="fin-block">
												<div class="fin-header">
													<span class="fin-title">Saques</span>
													<span class="fin-total negative"
														>-{profile.total_withdrawals ?? '0.00'}</span
													>
												</div>
												<div class="fin-entries">
													{#each getEntries(profile, 'withdrawal') as entry (entry.id)}
														<span class="chip chip-negative">-{entry.amount}</span>
													{/each}
												</div>
												<form
													method="POST"
													action="?/addEntry"
													use:enhance={handleEntrySubmit}
													class="add-entry-form"
												>
													<input type="hidden" name="profileId" value={profile.id} />
													<input type="hidden" name="type" value="withdrawal" />
													<input
														name="amount"
														type="number"
														step="0.01"
														placeholder="Remover - (Enter)"
														required
													/>
													<button
														type="submit"
														class="sr-only"
														tabindex="-1"
														aria-label="Adicionar saque"
													></button>
												</form>
											</div>

											<!-- Baus -->
											<div class="fin-block">
												<div class="fin-header">
													<span class="fin-title">Baús</span>
													<span class="fin-total positive">+{profile.total_chests ?? '0.00'}</span>
												</div>
												<div class="fin-entries">
													{#each getEntries(profile, 'chest') as entry (entry.id)}
														<span class="chip">+{entry.amount}</span>
													{/each}
												</div>
												<form
													method="POST"
													action="?/addEntry"
													use:enhance={handleEntrySubmit}
													class="add-entry-form"
												>
													<input type="hidden" name="profileId" value={profile.id} />
													<input type="hidden" name="type" value="chest" />
													<input
														name="amount"
														type="number"
														step="0.01"
														placeholder="Adicionar baú + (Enter)"
														required
													/>
													<button
														type="submit"
														class="sr-only"
														tabindex="-1"
														aria-label="Adicionar baú"
													></button>
												</form>
											</div>
										</div>

										<div class="balance-section">
											<span class="balance-label">SALDO:</span>
											<span
												class="balance-value {Number(profile.computed_balance || 0) >= 0
													? 'positive'
													: 'negative'}"
											>
												{profile.computed_balance ?? '0.00'}
											</span>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if data.hasMore || data.page > 1}
				<div class="pagination">
					{#if data.page > 1}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href="/ciclos?page={data.page - 1}" class="page-btn">Mais Recentes</a>
					{/if}
					<span class="page-info">Página {data.page}</span>
					{#if data.hasMore}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href="/ciclos?page={data.page + 1}" class="page-btn">Carregar Mais Antigos</a>
					{/if}
				</div>
			{/if}
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		background-color: #080808;
		color: #e0e0e0;
	}

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

	.app-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		border-bottom: 1px solid #2a0808;
		padding-bottom: 1rem;
	}

	.title-wrapper {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		color: #dc2626; /* Deep Red / Crimson */
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: 2px;
	}

	.module-indicator {
		font-size: 1rem;
		color: #888;
		font-weight: 600;
		letter-spacing: 1px;
	}

	.generate-btn {
		background-color: #b91c1c; /* Blood Red */
		color: #fff;
		border: none;
		padding: 0.75rem 2rem;
		font-size: 1.1rem;
		font-weight: 700;
		border-radius: 6px;
		cursor: pointer;
		transition:
			transform 0.1s,
			background-color 0.2s;
		box-shadow: 0 4px 14px 0 rgba(185, 28, 28, 0.39);
	}

	.generate-btn:hover:not(:disabled) {
		background-color: #991b1b;
		transform: translateY(-2px);
	}

	.generate-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-banner {
		background-color: #ef4444;
		color: white;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		text-align: center;
	}

	.empty-state {
		text-align: center;
		color: #666;
		padding: 4rem;
		background: #111;
		border-radius: 12px;
		border: 1px solid #222;
	}

	.cycles-stack {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.cycle-block {
		background: #111;
		border: 1px solid #222;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
	}

	.cycle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #222;
		padding-bottom: 0.75rem;
	}

	.cycle-header h3 {
		margin: 0;
		color: #ccc;
		font-size: 1.1rem;
	}

	.text-subtle {
		color: #666;
		font-size: 0.9rem;
		font-weight: normal;
	}

	.subtle-btn {
		background: transparent;
		border: 1px solid #333;
		color: #aaa;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
	}

	.subtle-btn:hover {
		color: #fff;
		border-color: #b91c1c;
		background: rgba(185, 28, 28, 0.1);
	}

	.cards-container {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.cards-container {
			grid-template-columns: 1fr 1fr;
		}
	}

	.card {
		display: flex;
		flex-direction: column;
		background-color: #161616;
		border: 1px solid #2a2a2a;
		border-radius: 8px;
		padding: 1.25rem;
		transition: border-color 0.2s;
	}

	.card:hover {
		border-color: #b91c1c;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
	}

	.card h2 {
		margin: 0;
		color: #dc2626;
		font-size: 1.2rem;
		letter-spacing: 1px;
	}

	.copy-icon {
		background: #222;
		border: 1px solid #333;
		color: #aaa;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.copy-icon:hover {
		color: #fff;
		border-color: #dc2626;
	}

	.identity-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #2a2a2a;
	}

	.field {
		display: flex;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.label {
		width: 100px;
		flex-shrink: 0;
		color: #777;
		font-size: 0.85rem;
		text-transform: uppercase;
	}

	.value {
		color: #ddd;
		font-size: 0.95rem;
	}

	.font-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		color: #aaa;
	}

	.editable input {
		flex-grow: 1;
		background: #111;
		border: 1px solid #333;
		border-radius: 4px;
		color: #fff;
		font-size: 0.95rem;
		padding: 0.4rem 0.5rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
	}

	.editable input:focus {
		border-color: #dc2626;
	}

	.financial-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.fin-block {
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
		padding: 0.75rem;
	}

	.fin-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.fin-title {
		color: #888;
		text-transform: uppercase;
		font-size: 0.8rem;
		letter-spacing: 0.5px;
	}

	.fin-total.positive {
		color: #10b981;
	}
	.fin-total.negative {
		color: #ef4444;
	}

	.fin-entries {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
		min-height: 24px;
	}

	.chip {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-family: monospace;
	}

	.chip-negative {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.add-entry-form input {
		width: 100%;
		background: #161616;
		border: 1px solid #333;
		border-radius: 4px;
		color: #fff;
		padding: 0.5rem;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.add-entry-form input:focus {
		border-color: #dc2626;
	}

	.balance-section {
		margin-top: auto;
		background: #1a0f0f;
		border: 1px solid #3a1a1a;
		border-radius: 6px;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.balance-label {
		color: #aaa;
		font-weight: 700;
		letter-spacing: 1px;
	}

	.balance-value {
		font-size: 1.5rem;
		font-weight: 800;
		font-family: monospace;
	}

	.balance-value.positive {
		color: #10b981;
	}
	.balance-value.negative {
		color: #ef4444;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #222;
	}

	.page-btn {
		background: #1a1a1a;
		border: 1px solid #333;
		color: #ccc;
		padding: 0.6rem 1.2rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.page-btn:hover {
		background: #2a2a2a;
		border-color: #555;
		color: #fff;
	}

	.page-info {
		color: #666;
		font-size: 0.9rem;
	}
</style>

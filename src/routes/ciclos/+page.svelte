<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { CycleProfile } from '$lib/modules/ciclos/domain/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	let copiedId = $state('');
	let ariaLiveMessage = $state('');

	let cycle = $derived(data.cycle);
	let mae = $derived(cycle?.profiles.find((p) => p.role === 'mae'));
	let filha = $derived(cycle?.profiles.find((p) => p.role === 'filha'));

	function copyProfile(profile: CycleProfile | undefined, id: string, label: string) {
		if (!profile) return;
		const text = `nome: ${profile.name}
senha: ${profile.generated_password}
cpf: ${profile.cpf}
numero: ${profile.number}
senha saque: ${profile.withdrawal_password}
depositos: ${profile.deposits}
saques: ${profile.withdrawals}
saldo: ${profile.balance}
baus: ${profile.chests}
saldo final: ${profile.final_balance}`;

		navigator.clipboard.writeText(text).then(() => {
			copiedId = id;
			ariaLiveMessage = `Perfil ${label} copiado para a área de transferência.`;
			setTimeout(() => {
				if (copiedId === id) {
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

	function copyAction(node: HTMLElement, params: { profile: CycleProfile | undefined, id: string, label: string }) {
		let currentParams = params;

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (['INPUT', 'LABEL', 'BUTTON'].includes(target.tagName)) return;
			copyProfile(currentParams.profile, currentParams.id, currentParams.label);
		};

		node.addEventListener('click', handleClick);

		return {
			update(newParams: { profile: CycleProfile | undefined, id: string, label: string }) {
				currentParams = newParams;
			},
			destroy() {
				node.removeEventListener('click', handleClick);
			}
		};
	}
</script>

<svelte:head>
	<title>HYDRA - CICLOS</title>
</svelte:head>

<div class="sr-only" aria-live="polite">{ariaLiveMessage}</div>

<div class="app-container">
	<header>
		<h1>HYDRA</h1>
		<div class="module-indicator">CICLOS</div>
	</header>

	<main>
		<div class="actions">
			<form method="POST" action="?/generate" use:enhance={handleFormSubmit}>
				<button class="generate-btn" type="submit" disabled={loading}>
					{loading ? 'GERANDO...' : 'GERAR DADOS'}
				</button>
			</form>
		</div>

		{#if form?.error}
			<div class="error-banner">
				{form.error}
			</div>
		{/if}

		{#if !cycle}
			<div class="empty-state">
				<p>Nenhum ciclo encontrado. Clique em "GERAR DADOS" para começar.</p>
			</div>
		{:else if mae && filha}
			<div class="cards-container">
				<!-- MÃE CARD -->
				<form
					class="card"
					method="POST"
					action="?/update"
					use:enhance
					oninput={(e) => debounceUpdate(e.currentTarget, mae!.id)}
					use:copyAction={{ profile: mae, id: mae.id, label: 'MÃE' }}
				>
					<input type="hidden" name="profileId" value={mae.id} />
					<div class="card-header">
						<h2>MÃE</h2>
						<button
							type="button"
							class="copy-icon"
							aria-label="Copiar perfil MÃE"
							onclick={(e) => {
								e.stopPropagation();
								copyProfile(mae, mae!.id, 'MÃE');
							}}
						>
							{copiedId === mae.id ? 'Copiado' : '📋'}
						</button>
					</div>

					<div class="field readonly">
						<span class="label">nome:</span>
						<span class="value">{mae.name}</span>
					</div>
					<div class="field readonly">
						<span class="label">senha:</span>
						<span class="value font-mono">{mae.generated_password}</span>
					</div>
					<div class="field readonly">
						<span class="label">cpf:</span>
						<span class="value font-mono">{mae.cpf}</span>
					</div>

					<div class="field editable">
						<label for="mae-number" class="label">numero:</label>
						<input id="mae-number" name="number" type="text" maxlength="255" value={mae.number} />
					</div>

					<div class="field readonly">
						<span class="label">senha saque:</span>
						<span class="value font-mono">{mae.withdrawal_password}</span>
					</div>

					<div class="field editable">
						<label for="mae-deposits" class="label">depositos:</label>
						<input
							id="mae-deposits"
							name="deposits"
							type="text"
							maxlength="255"
							value={mae.deposits}
						/>
					</div>
					<div class="field editable">
						<label for="mae-withdrawals" class="label">saques:</label>
						<input
							id="mae-withdrawals"
							name="withdrawals"
							type="text"
							maxlength="255"
							value={mae.withdrawals}
						/>
					</div>
					<div class="field editable">
						<label for="mae-balance" class="label">saldo:</label>
						<input
							id="mae-balance"
							name="balance"
							type="text"
							maxlength="255"
							value={mae.balance}
						/>
					</div>
					<div class="field editable">
						<label for="mae-chests" class="label">baus:</label>
						<input id="mae-chests" name="chests" type="text" maxlength="255" value={mae.chests} />
					</div>
					<div class="field editable">
						<label for="mae-final" class="label">saldo final:</label>
						<input
							id="mae-final"
							name="final_balance"
							type="text"
							maxlength="255"
							value={mae.final_balance}
						/>
					</div>
				</form>

				<!-- FILHA CARD -->
				<form
					class="card"
					method="POST"
					action="?/update"
					use:enhance
					oninput={(e) => debounceUpdate(e.currentTarget, filha!.id)}
					use:copyAction={{ profile: filha, id: filha.id, label: 'FILHA' }}
				>
					<input type="hidden" name="profileId" value={filha.id} />
					<div class="card-header">
						<h2>FILHA</h2>
						<button
							type="button"
							class="copy-icon"
							aria-label="Copiar perfil FILHA"
							onclick={(e) => {
								e.stopPropagation();
								copyProfile(filha, filha!.id, 'FILHA');
							}}
						>
							{copiedId === filha.id ? 'Copiado' : '📋'}
						</button>
					</div>

					<div class="field readonly">
						<span class="label">nome:</span>
						<span class="value">{filha.name}</span>
					</div>
					<div class="field readonly">
						<span class="label">senha:</span>
						<span class="value font-mono">{filha.generated_password}</span>
					</div>
					<div class="field readonly">
						<span class="label">cpf:</span>
						<span class="value font-mono">{filha.cpf}</span>
					</div>

					<div class="field editable">
						<label for="filha-number" class="label">numero:</label>
						<input
							id="filha-number"
							name="number"
							type="text"
							maxlength="255"
							value={filha.number}
						/>
					</div>

					<div class="field readonly">
						<span class="label">senha saque:</span>
						<span class="value font-mono">{filha.withdrawal_password}</span>
					</div>

					<div class="field editable">
						<label for="filha-deposits" class="label">depositos:</label>
						<input
							id="filha-deposits"
							name="deposits"
							type="text"
							maxlength="255"
							value={filha.deposits}
						/>
					</div>
					<div class="field editable">
						<label for="filha-withdrawals" class="label">saques:</label>
						<input
							id="filha-withdrawals"
							name="withdrawals"
							type="text"
							maxlength="255"
							value={filha.withdrawals}
						/>
					</div>
					<div class="field editable">
						<label for="filha-balance" class="label">saldo:</label>
						<input
							id="filha-balance"
							name="balance"
							type="text"
							maxlength="255"
							value={filha.balance}
						/>
					</div>
					<div class="field editable">
						<label for="filha-chests" class="label">baus:</label>
						<input
							id="filha-chests"
							name="chests"
							type="text"
							maxlength="255"
							value={filha.chests}
						/>
					</div>
					<div class="field editable">
						<label for="filha-final" class="label">saldo final:</label>
						<input
							id="filha-final"
							name="final_balance"
							type="text"
							maxlength="255"
							value={filha.final_balance}
						/>
					</div>
				</form>
			</div>
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
		background-color: #0d0d0d;
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
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid #333;
		padding-bottom: 1rem;
	}

	h1 {
		margin: 0;
		color: #10b981; /* Emerald/Teal green */
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

	.actions {
		display: flex;
		justify-content: center;
		margin-bottom: 3rem;
	}

	.generate-btn {
		background-color: #10b981;
		color: #000;
		border: none;
		padding: 1rem 3rem;
		font-size: 1.25rem;
		font-weight: 700;
		border-radius: 8px;
		cursor: pointer;
		transition:
			transform 0.1s,
			background-color 0.2s;
	}

	.generate-btn:hover:not(:disabled) {
		background-color: #059669;
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
		background: #1a1a1a;
		border-radius: 12px;
		border: 1px solid #333;
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
		display: block;
		background-color: #1a1a1a;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 1.5rem;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.card:hover {
		border-color: #10b981;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.card h2 {
		margin: 0;
		color: #10b981;
		font-size: 1.25rem;
	}

	.copy-icon {
		background: transparent;
		border: 1px solid #333;
		color: #aaa;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.copy-icon:hover {
		color: #fff;
		border-color: #10b981;
	}

	.field {
		display: flex;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.label {
		width: 120px;
		flex-shrink: 0;
		color: #888;
		font-size: 0.9rem;
	}

	.value {
		color: #fff;
		font-size: 1rem;
	}

	.font-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.editable input {
		flex-grow: 1;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #555;
		color: #fff;
		font-size: 1rem;
		padding: 0.25rem 0;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
	}

	.editable input:focus {
		border-bottom: 1px solid #10b981;
	}
</style>

<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let username = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		errorMsg = '';
		loading = true;

		try {
			const { error } = await authClient.signIn.username({
				username,
				password
			});

			if (error) {
				errorMsg = 'Invalid username or password.';
			} else {
				window.location.href = '/ciclos';
			}
		} catch (err) {
			errorMsg = 'Invalid username or password.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>HYDRA // ACCESS</title>
</svelte:head>

<div class="login-container">
	<div class="login-box">
		<div class="brand">HYDRA</div>
		<div class="subtitle">Access restricted.</div>

		<form onsubmit={handleLogin}>
			{#if errorMsg}
				<div class="error">{errorMsg}</div>
			{/if}

			<div class="input-group">
				<label for="username">USERNAME</label>
				<input
					id="username"
					name="username"
					type="text"
					bind:value={username}
					autocomplete="username"
					required
					spellcheck="false"
					disabled={loading}
				/>
			</div>

			<div class="input-group">
				<label for="password">PASSWORD</label>
				<input
					id="password"
					name="password"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					required
					disabled={loading}
				/>
			</div>

			<button type="submit" disabled={loading}>
				{loading ? 'AUTHENTICATING_' : 'LOGIN'}
			</button>
		</form>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #020202;
		color: #e4e4e7;
		font-family: 'Inter', sans-serif;
	}

	.login-box {
		width: 100%;
		max-width: 360px;
		padding: 2.5rem;
		border: 1px solid rgba(220, 38, 38, 0.15);
		background: rgba(10, 10, 10, 0.95);
		box-shadow:
			0 0 20px rgba(0, 0, 0, 0.5),
			inset 0 0 10px rgba(220, 38, 38, 0.05);
	}

	.brand {
		font-family: 'Outfit', sans-serif;
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: 0.5rem;
		color: #dc2626;
		text-align: center;
		margin-bottom: 0.2rem;
	}

	.subtitle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: #71717a;
		text-align: center;
		margin-bottom: 2.5rem;
		letter-spacing: 1px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: #a1a1aa;
		letter-spacing: 1px;
	}

	input {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 0.8rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9rem;
		transition: all 0.2s;
		outline: none;
	}

	input:focus {
		border-color: rgba(220, 38, 38, 0.5);
		background: rgba(220, 38, 38, 0.05);
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	button {
		margin-top: 1rem;
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.9rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 2px;
		cursor: pointer;
		transition: all 0.2s;
	}

	button:hover:not(:disabled) {
		background: #b91c1c;
		box-shadow: 0 0 15px rgba(220, 38, 38, 0.3);
	}

	button:disabled {
		background: #52525b;
		color: #a1a1aa;
		cursor: not-allowed;
	}

	.error {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: #ef4444;
		text-align: center;
		padding: 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}
</style>

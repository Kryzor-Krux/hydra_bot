<script lang="ts">
	import type { PageData } from './$types';
	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>HYDRA // ADMIN</title>
</svelte:head>

<div class="admin-container">
	<header>
		<h1>HYDRA // SYSTEM ADMINISTRATION</h1>
		<div class="actions">
			<a href="/ciclos" class="btn">BACK TO TERMINAL</a>
		</div>
	</header>

	<main>
		<section class="panel">
			<h2>CREATE USER</h2>
			<form method="POST" action="?/createUser" class="create-user-form">
				<div class="input-group">
					<label for="username">USERNAME</label>
					<input id="username" name="username" type="text" required spellcheck="false" />
				</div>
				<div class="input-group">
					<label for="password">PASSWORD (min 12 chars)</label>
					<input id="password" name="password" type="password" required minlength="12" />
				</div>
				<div class="input-group">
					<label for="role">ROLE</label>
					<select id="role" name="role">
						<option value="user">User</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<button type="submit" class="btn primary">CREATE USER</button>
			</form>
		</section>

		<section class="panel">
			<h2>REGISTERED USERS</h2>
			<table class="data-table">
				<thead>
					<tr>
						<th>USERNAME</th>
						<th>ROLE</th>
						<th>CREATED AT</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as user}
						<tr>
							<td>{user.username}</td>
							<td><span class="badge {user.role}">{user.role.toUpperCase()}</span></td>
							<td>{new Date(user.createdAt).toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	</main>
</div>

<style>
	.admin-container {
		min-height: 100vh;
		background-color: #020202;
		color: #e4e4e7;
		font-family: 'Inter', sans-serif;
		padding: 2rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
		border-bottom: 1px solid rgba(220, 38, 38, 0.2);
		padding-bottom: 1rem;
	}

	h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		color: #dc2626;
		font-weight: 300;
		letter-spacing: 2px;
	}

	.panel {
		background: rgba(10, 10, 10, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.create-user-form {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	input, select {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		padding: 0.5rem;
		font-family: 'JetBrains Mono', monospace;
	}

	input:focus, select:focus {
		border-color: #dc2626;
		outline: none;
	}

	h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1rem;
		margin-bottom: 1.5rem;
		color: #a1a1aa;
		letter-spacing: 1px;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
	}

	.data-table th,
	.data-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.data-table th {
		color: #71717a;
		font-weight: normal;
	}

	.badge {
		padding: 0.2rem 0.5rem;
		border-radius: 2px;
		font-size: 0.75rem;
	}

	.badge.admin {
		background: rgba(220, 38, 38, 0.2);
		color: #ef4444;
		border: 1px solid rgba(220, 38, 38, 0.5);
	}

	.badge.user {
		background: rgba(255, 255, 255, 0.05);
		color: #a1a1aa;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.btn {
		display: inline-block;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.5rem 1rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>

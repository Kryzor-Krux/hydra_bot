import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
	const dbPath = path.resolve('./data/test-e2e.db');
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath);
	}
	const walPath = dbPath + '-wal';
	if (fs.existsSync(walPath)) {
		fs.unlinkSync(walPath);
	}
	const shmPath = dbPath + '-shm';
	if (fs.existsSync(shmPath)) {
		fs.unlinkSync(shmPath);
	}
}

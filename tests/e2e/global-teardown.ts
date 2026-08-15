import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
	const dbPath = path.resolve('./data/test-e2e.db');

	const filesToRemove = [dbPath, dbPath + '-wal', dbPath + '-shm'];

	for (const file of filesToRemove) {
		if (fs.existsSync(file)) {
			try {
				fs.unlinkSync(file);
			} catch (e) {
				console.error(`Could not delete e2e database file: ${file}`, e);
			}
		}
	}
}

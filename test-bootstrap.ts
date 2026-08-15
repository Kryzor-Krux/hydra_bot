import { bootstrapAdmin } from './src/lib/server/bootstrap';
bootstrapAdmin()
	.then(() => console.log('Done'))
	.catch(console.error);

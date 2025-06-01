import { processCommands } from './commandProcessor';
import cron from 'node-cron';

// Run every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  console.log('Running command processor...');
  await processCommands();
});

console.log('Cron job scheduler started');

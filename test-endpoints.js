// Quick test script to verify backend endpoints are working
const createApp = require('./app');

const app = createApp();

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`\n🧪 Test server running on http://localhost:${PORT}`);
  console.log('\n📝 Test these endpoints:');
  console.log(`  - GET  http://localhost:${PORT}/`);
  console.log(`  - GET  http://localhost:${PORT}/health`);
  console.log(`  - GET  http://localhost:${PORT}/admin/verify/68e147a53c053e790e0ac135`);
  console.log(`  - GET  http://localhost:${PORT}/custom-layout/68e147a53c053e790e0ac135`);
  console.log(`\n✅ Press Ctrl+C to stop\n`);
});

// Diagnostic script to find the problematic route
const express = require('express');
const app = express();

const routes = [
  { name: 'auth', path: './routes/auth.js' },
  { name: 'transaction', path: './routes/transactionRoute.js' },
  { name: 'userProfile', path: './routes/userProfileRoute.js' },
  { name: 'category', path: './routes/category.js' },
  { name: 'customer', path: './routes/CustomerRoute.js' },
  { name: 'supplier', path: './routes/supplierRoute.js' },
  { name: 'inventory', path: './routes/inventoryRoute.js' },
  { name: 'reservation', path: './routes/reservationRoute.js' },
  { name: 'menu', path: './routes/menu.js' },
  { name: 'subcategory', path: './routes/subcategory.js' },
  { name: 'qr', path: './routes/QrRoutes.js' },
  { name: 'due', path: './routes/due.js' },
  { name: 'deliveryTiming', path: './routes/deliverymanagement.js' },
  { name: 'banner', path: './routes/banner.js' },
  { name: 'order', path: './routes/orderRoute.js' },
  { name: 'report', path: './routes/reportRoute.js' },
  { name: 'coupen', path: './routes/CoupenRoute.js' },
  { name: 'customLayout', path: './routes/customLayout.js' },
];

console.log('Testing routes one by one...\n');

for (const route of routes) {
  try {
    console.log(`Testing ${route.name}...`);
    const router = require(route.path);
    app.use(router);
    console.log(`✅ ${route.name} OK`);
  } catch (error) {
    console.log(`❌ ${route.name} FAILED: ${error.message}`);
    console.log(`   Stack: ${error.stack.split('\n')[0]}`);
    process.exit(1);
  }
}

// Try to listen
console.log('\nAll routes mounted successfully');
console.log('Now testing server startup...\n');

try {
  const server = app.listen(3001, () => {
    console.log('✅ Server started successfully on port 3001');
    server.close();
    process.exit(0);
  });
} catch (error) {
  console.log('❌ Server startup FAILED:', error.message);
  console.log('Stack:', error.stack);
  process.exit(1);
}

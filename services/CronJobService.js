const cron = require('node-cron');
const { sendLowStockEmailsForAllRestaurants } = require('./LowStockEmailService');

// Daily low stock check at 9:00 AM
const dailyLowStockCheck = cron.schedule('0 9 * * *', async () => {
  console.log('🕘 Running daily low stock check...');
  try {
    const result = await sendLowStockEmailsForAllRestaurants();
    console.log('✅ Daily low stock check completed:', result);
  } catch (error) {
    console.error('❌ Daily low stock check failed:', error);
  }
}, {
  scheduled: false,
  timezone: "Asia/Kolkata"
});

// Weekly low stock check every Monday at 10:00 AM
const weeklyLowStockCheck = cron.schedule('0 10 * * 1', async () => {
  console.log('📅 Running weekly low stock check...');
  try {
    const result = await sendLowStockEmailsForAllRestaurants();
    console.log('✅ Weekly low stock check completed:', result);
  } catch (error) {
    console.error('❌ Weekly low stock check failed:', error);
  }
}, {
  scheduled: false,
  timezone: "Asia/Kolkata"
});

// Test cron job - runs every minute for testing
const testLowStockCheck = cron.schedule('* * * * *', async () => {
  console.log('🧪 Running test low stock check (every minute)...');
  try {
    const result = await sendLowStockEmailsForAllRestaurants();
    console.log('✅ Test low stock check completed:', result);
  } catch (error) {
    console.error('❌ Test low stock check failed:', error);
  }
}, {
  scheduled: false,
  timezone: "Asia/Kolkata"
});

// Manual trigger function
const triggerLowStockCheck = async () => {
  console.log('🔧 Manual low stock check triggered...');
  try {
    const result = await sendLowStockEmailsForAllRestaurants();
    console.log('✅ Manual low stock check completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual low stock check failed:', error);
    throw error;
  }
};

// Start all cron jobs
const startCronJobs = () => {
  console.log('🚀 Starting cron jobs...');
  
  // Start test check (every minute for testing)
  testLowStockCheck.start();
  console.log('✅ Test low stock check scheduled (every minute)');
  
  // Start daily check
  dailyLowStockCheck.start();
  console.log('✅ Daily low stock check scheduled (9:00 AM daily)');
  
  // Start weekly check
  weeklyLowStockCheck.start();
  console.log('✅ Weekly low stock check scheduled (10:00 AM Monday)');
  
  console.log('🎯 All cron jobs started successfully');
};

// Stop all cron jobs
const stopCronJobs = () => {
  console.log('🛑 Stopping cron jobs...');
  
  testLowStockCheck.stop();
  dailyLowStockCheck.stop();
  weeklyLowStockCheck.stop();
  
  console.log('✅ All cron jobs stopped');
};

// Get cron job status
const getCronJobStatus = () => {
  return {
    testCheck: {
      running: testLowStockCheck.running,
      scheduled: testLowStockCheck.scheduled,
      nextRun: testLowStockCheck.nextDate()
    },
    dailyCheck: {
      running: dailyLowStockCheck.running,
      scheduled: dailyLowStockCheck.scheduled,
      nextRun: dailyLowStockCheck.nextDate()
    },
    weeklyCheck: {
      running: weeklyLowStockCheck.running,
      scheduled: weeklyLowStockCheck.scheduled,
      nextRun: weeklyLowStockCheck.nextDate()
    }
  };
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  triggerLowStockCheck,
  getCronJobStatus,
  testLowStockCheck,
  dailyLowStockCheck,
  weeklyLowStockCheck
};

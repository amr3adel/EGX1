import { getQuote, getHistory, getBenchmarks } from './services/dataService.js';

async function testDataService() {
  console.log("Testing dataService.js...");
  try {
    const benchmarks = await getBenchmarks();
    console.log("\nBenchmarks:");
    console.log(JSON.stringify(benchmarks, null, 2));

    console.log("\nTesting quote fetch for COMI.CA...");
    const quote = await getQuote('COMI.CA');
    console.log("Quote:", JSON.stringify(quote, null, 2));

    console.log("\nTesting history fetch for COMI.CA...");
    const history = await getHistory('COMI.CA', 1);
    console.log("History rows returned:", history.length);
    if (history.length > 0) {
      console.log("First row:", history[0]);
      console.log("Last row:", history[history.length - 1]);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("DataService test failed:", err);
    process.exit(1);
  }
}

testDataService();

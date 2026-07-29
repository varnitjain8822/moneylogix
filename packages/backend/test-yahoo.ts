import yahooFinance from 'yahoo-finance2';
async function test() {
  try {
    const symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'SBIN.NS', 'ITC.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS', 'WIPRO.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'MARUTI.NS', 'AXISBANK.NS'];
    const quotes = await yahooFinance.quote(symbols);
    console.log("Success! Quotes length:", quotes.length);
  } catch (err: any) {
    console.log("Error name:", err.name);
    console.log("Has result:", !!err.result);
    console.log("Result length:", err.result?.length);
  }
}
test();

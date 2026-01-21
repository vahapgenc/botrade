
const yf = require('yahoo-finance2');
console.log('Type of yf:', typeof yf);
console.log('Keys of yf:', Object.keys(yf));

try {
    const { YahooFinance } = yf;
    console.log('YahooFinance export:', YahooFinance);
} catch (e) {
    console.log('No YahooFinance export');
}

try {
    const instance = yf.default;
    console.log('Default export:', instance);
    console.log('Default export type:', typeof instance);
} catch (e) {
    console.log('No default export');
}

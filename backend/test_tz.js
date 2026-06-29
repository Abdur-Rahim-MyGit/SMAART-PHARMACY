const mongoose = require('mongoose');
const InventoryTransaction = require('./models/InventoryTransaction');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/pharmacy', { useNewUrlParser: true, useUnifiedTopology: true });
    const pharmacyId = 'default-pharmacy-id'; // Assuming we need to find out what pharmacyId is
    
    // Just get the last 5 transactions
    const txs = await InventoryTransaction.find().sort({ createdAt: -1 }).limit(10);
    console.log("Last 10 transactions:");
    txs.forEach(t => {
        console.log(`- ${t.transactionType}: ${t.quantityChanged} at ${t.createdAt}, local: ${new Date(t.createdAt).toLocaleString()}, UTC_date: ${new Date(t.createdAt).toISOString().split('T')[0]}`);
    });

    const dailyMovementsMap = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyMovementsMap[dateStr] = { date: dateStr, label, stockIn: 0, stockOut: 0 };
    }
    console.log("Map keys:", Object.keys(dailyMovementsMap));

    txs.forEach(t => {
        const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
        if (dailyMovementsMap[dateStr]) {
            console.log(`Matched! ${dateStr} - ${t.transactionType} ${t.quantityChanged}`);
            if (t.transactionType === 'Stock In') {
                dailyMovementsMap[dateStr].stockIn += Math.abs(t.quantityChanged);
            } else if (t.transactionType === 'Stock Out') {
                dailyMovementsMap[dateStr].stockOut += Math.abs(t.quantityChanged);
            }
        } else {
            console.log(`NO MATCH! ${dateStr} - ${t.transactionType}`);
        }
    });
    
    console.log(dailyMovementsMap);
    process.exit(0);
}
test();

import 'dotenv/config';

const API_KEY = process.env.BIRDEYE_API_KEY!;
const h = { 'X-API-KEY': API_KEY, 'x-chain': 'solana', 'Accept': 'application/json' };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  // Test wallet PnL with one of the discovered wallets
  const wallet = 'ARu4n5mFdZogZAravu7CcizaojWnS6oqka37gdLT5SZn';
  
  console.log('=== Wallet PnL Summary ===');
  const res1 = await fetch(
    `https://public-api.birdeye.so/wallet/v2/pnl/summary?wallet=${wallet}`,
    { headers: h }
  );
  const pnl = await res1.json();
  console.log(JSON.stringify(pnl, null, 2).slice(0, 2000));

  await sleep(2000);

  console.log('\n=== Wallet Net Worth ===');
  const res2 = await fetch(
    `https://public-api.birdeye.so/wallet/v2/current-net-worth?wallet=${wallet}`,
    { headers: h }
  );
  const nw = await res2.json();
  console.log(JSON.stringify(nw, null, 2).slice(0, 2000));

  await sleep(2000);

  // Token overview to check mcap field
  const token = 'Eg2ymQ2aQqjMcibnmTt8erC6Tvk9PVpJZCxvVPJz2agu'; // PUMPCADE
  console.log('\n=== Token Overview ===');
  const res3 = await fetch(
    `https://public-api.birdeye.so/defi/token_overview?address=${token}`,
    { headers: h }
  );
  const overview = await res3.json();
  console.log(JSON.stringify(overview, null, 2).slice(0, 2000));
}

main().catch(console.error);

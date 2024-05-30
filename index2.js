const fs = require('fs');
const readline = require('readline');
const { promisify } = require('util');
const crypto = require('crypto-js');
const sui = require("@mysten/sui.js");

const Ed25519Keypair = sui.Ed25519Keypair;
const JsonRpcProvider = sui.JsonRpcProvider;
const RawSigner = sui.RawSigner;
const TransactionBlock = sui.TransactionBlock;
const Connection = sui.Connection;
const request = require('request');

const contractAddress = "0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459";
const So = "0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a";
const oceanCt = "0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN";

const connection = new Connection({
  fullnode: 'https://fullnode.mainnet.sui.io',
  faucet: 'https://faucet.testnet.sui.io/gas',
});
const provider = new JsonRpcProvider(connection);

function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

function shortenKey(key) {
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}...${end}`;
}

async function getChange(key) {
    const txn = await provider.getTransactionBlock({
      digest: key,
      options: {
        showEffects: false,
        showInput: false,
        showEvents: false,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });
    let change = txn["balanceChanges"]
    const totalAmount = change
      .filter(item => item.coinType === oceanCt)
      .reduce((sum, item) => sum + parseInt(item.amount, 10), 0);
    return totalAmount/1000000000
  }

async function processWallet(key) {
    const keypair = Ed25519Keypair.deriveKeypair(key, `m/44'/784'/0'/0'/0'`);
    //console.log(`Bắt đầu đọc ví`);

    const signer = new RawSigner(keypair, provider);
    const suiAdd = keypair.getPublicKey().toSuiAddress();
    console.log(`Sui Address: ${suiAdd}`);
    const axios = require('axios');
    const TOKEN = "6815047816:AAF0LRKbD3Bw2QvpUKMpe_t2rhJd-YhxowE";
    const chatid = "-4243510908";
    try {
      const tx = new TransactionBlock();
      let a = tx.object(So);
      let d = tx.object("0x6");
      tx.moveCall({
        target: `${contractAddress}::game::claim`,
        arguments: [a, d],
        typeArguments: []
      });
      console.log('Start Claim, Waiting...');
      
      const result = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx, requestType: "WaitForLocalExecution" });
      
      await sleep(5000);
      let amount = await getChange(result["digest"]);
      const currentDate = new Date();
      const dateNow = currentDate.toISOString();
      const message = `#WaveWallet 🌊: Claim Success ${amount} OCEAN - ${suiAdd}`
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${chatid}&text=${encodeURIComponent(message)}`;
    try {
        let telegramResponse = await axios.get(url);
        
      } catch (telegramError) {
        console.error("Error sending message:", telegramError);
      }
      console.log(`\x1b[32mClaim Success\x1b[0m at: ${dateNow} - BALANCE: ${amount} - WALLET: ${suiAdd}`);
    } catch (error) {
      console.error(`\x1b[31mClaim Failed\x1b[0m - ${suiAdd}`);
    }
}

async function main() {
    const fileStream = fs.createReadStream('wallets.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const [key] = line.trim().split(','); 
        if (key) {
            await processWallet(key);
        }
    }
}

async function run() {
  while (true) {
    try {
      await main();
    } catch (error) {
      console.error('Error during execution:', error);
    }
    console.log("Next time 2h to Claim");
    const nghingoi = 2 * 60 * 60 * 1000; // 2 giờ 2 * 60 * 60 *
    await sleep(nghingoi);
  }
}

run().catch(console.error);
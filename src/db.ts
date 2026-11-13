
import Dexie, { type Table } from 'dexie';

export type Wallet = {id:string; name:string; kind:'Cash'|'Bank'|'E-Wallet'|'Custom'; openingBalance:number; color:string; icon:string; active:boolean; createdAt:string};
export type Category = {id:string; name:string; type:'income'|'expense'; color:string; icon:string; archived?:boolean};
export type Tx = {id:string; type:'income'|'expense'|'transfer'; amount:number; description:string; categoryId?:string; walletId:string; toWalletId?:string; date:string; notes?:string; createdAt:string; updatedAt:string; transferGroupId?:string};
export type Budget = {id:string; month:string; categoryId?:string; label:string; limit:number};
export type Setting = {id:'main'; userName:string; theme:'light'|'dark'; currency:'IDR'; hideBalance:boolean};
class WalletDB extends Dexie {
 wallets!:Table<Wallet,string>; categories!:Table<Category,string>; transactions!:Table<Tx,string>; budgets!:Table<Budget,string>; settings!:Table<Setting,string>;
 constructor(){super('MyWalletDB');this.version(1).stores({wallets:'id,active',categories:'id,type',transactions:'id,type,walletId,toWalletId,date,categoryId,transferGroupId',budgets:'id,month,categoryId',settings:'id'});}
}
export const db=new WalletDB();
export const id=()=>crypto.randomUUID();
export async function initDB(){
 if(await db.wallets.count()) return;
 await db.transaction('rw',db.wallets,db.categories,db.settings,async()=>{
  const defaults:[string,Wallet['kind'],string,string][]=[
   ['Tunai','Cash','#10B981','wallet'],['BCA','Bank','#2563EB','landmark'],['BRI','Bank','#0EA5E9','landmark'],['BNI','Bank','#F59E0B','landmark'],['Mandiri','Bank','#1D4ED8','landmark'],['GoPay','E-Wallet','#10B981','smartphone'],['OVO','E-Wallet','#8B5CF6','smartphone'],['DANA','E-Wallet','#0284C7','smartphone'],['ShopeePay','E-Wallet','#F97316','smartphone']];
  await db.wallets.bulkAdd(defaults.map(([name,kind,color,icon])=>({id:id(),name,kind,openingBalance:0,color,icon,active:true,createdAt:new Date().toISOString()})));
  const inc=['Gaji','Bonus','Freelance','Bisnis','Investasi','Hadiah','Penjualan','Penghasilan lainnya'];
  const exp=['Makanan & Minuman','Transportasi','Belanja','Tagihan','Kesehatan','Pendidikan','Hiburan','Kebutuhan Rumah','Cicilan','Internet & Komunikasi','Lainnya'];
  await db.categories.bulkAdd([...inc.map(name=>({id:id(),name,type:'income' as const,color:'#10B981',icon:'plus'})),...exp.map(name=>({id:id(),name,type:'expense' as const,color:'#EF4444',icon:'circle'}))]);
  await db.settings.put({id:'main',userName:'Pengguna',theme:'light',currency:'IDR',hideBalance:false});
 });
}
export async function addTransaction(input:Omit<Tx,'id'|'createdAt'|'updatedAt'>){
 const tx:Tx={...input,id:id(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 await db.transactions.add(tx);return tx;
}
export async function addTransfer(from:string,to:string,amount:number,date:string,notes=''){
 if(from===to) throw new Error('Dompet asal dan tujuan harus berbeda.');
 if(!Number.isSafeInteger(amount)||amount<=0) throw new Error('Nominal harus berupa bilangan Rupiah positif.');
 const wallets=await db.wallets.toArray(); const balance=(w:Wallet)=>w.openingBalance;
 const all=await db.transactions.toArray();
 const current=(walletId:string)=>balance(wallets.find(w=>w.id===walletId)!) + all.reduce((s,t)=>s+(t.type==='income'&&t.walletId===walletId?t.amount:0)-(t.type==='expense'&&t.walletId===walletId?t.amount:0)+(t.type==='transfer'&&t.toWalletId===walletId?t.amount:0)-(t.type==='transfer'&&t.walletId===walletId?t.amount:0),0);
 if(current(from)<amount) throw new Error('Saldo dompet asal tidak mencukupi.');
 const now=new Date().toISOString();
 // One canonical transfer record updates both wallet balances; no duplicated ledger rows.
 await db.transactions.add({id:id(),type:'transfer',amount,description:'Transfer',walletId:from,toWalletId:to,date,notes,createdAt:now,updatedAt:now});

}
export function walletBalance(wallet:Wallet,txs:Tx[]){return txs.reduce((s,t)=>s+(t.type==='income'&&t.walletId===wallet.id?t.amount:0)-(t.type==='expense'&&t.walletId===wallet.id?t.amount:0)+(t.type==='transfer'&&t.toWalletId===wallet.id?t.amount:0)-(t.type==='transfer'&&t.walletId===wallet.id?t.amount:0),wallet.openingBalance);}
export const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);

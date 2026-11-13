
import Dexie, { type Table } from 'dexie';

export type Wallet = {
  id: string;
  name: string;
  kind: 'Cash' | 'Bank' | 'E-Wallet' | 'Custom';
  openingBalance: number;
  color: string;
  icon: string;
  active: boolean;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  archived?: boolean;
};

export type Tx = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  categoryId?: string;
  walletId: string;
  toWalletId?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  transferGroupId?: string;
};

export type Budget = {
  id: string;
  month: string;
  categoryId?: string;
  label: string;
  limit: number;
};

export type Setting = {
  id: 'main';
  userName: string;
  theme: 'light' | 'dark';
  currency: 'IDR';
  hideBalance: boolean;
};

class WalletDB extends Dexie {
  wallets!: Table<Wallet, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Tx, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('MyWalletDB');

    this.version(1).stores({
      wallets: 'id,active',
      categories: 'id,type',
      transactions: 'id,type,walletId,toWalletId,date,categoryId,transferGroupId',
      budgets: 'id,month,categoryId',
      settings: 'id'
    });
  }
}

export const db = new WalletDB();
export const id = () => crypto.randomUUID();

const defaultWallets: [string, Wallet['kind'], string, string][] = [
  ['Tunai', 'Cash', '#10B981', 'wallet'],
  ['BCA', 'Bank', '#2563EB', 'landmark'],
  ['BRI', 'Bank', '#0EA5E9', 'landmark'],
  ['BNI', 'Bank', '#F59E0B', 'landmark'],
  ['Mandiri', 'Bank', '#1D4ED8', 'landmark'],
  ['GoPay', 'E-Wallet', '#10B981', 'smartphone'],
  ['OVO', 'E-Wallet', '#8B5CF6', 'smartphone'],
  ['DANA', 'E-Wallet', '#0284C7', 'smartphone'],
  ['ShopeePay', 'E-Wallet', '#F97316', 'smartphone']
];

const incomeCategories = [
  'Gaji', 'Bonus', 'Freelance', 'Bisnis',
  'Investasi', 'Hadiah', 'Penjualan', 'Penghasilan lainnya'
];

const expenseCategories = [
  'Makanan & Minuman', 'Transportasi', 'Belanja',
  'Tagihan', 'Kesehatan', 'Pendidikan', 'Hiburan',
  'Kebutuhan Rumah', 'Cicilan', 'Internet & Komunikasi', 'Lainnya'
];

export async function initDB() {
  await db.transaction(
    'rw',
    db.wallets,
    db.categories,
    db.settings,
    async () => {
      if (await db.wallets.count() === 0) {
        await db.wallets.bulkAdd(
          defaultWallets.map(([name, kind, color, icon]) => ({
            id: id(),
            name,
            kind,
            openingBalance: 0,
            color,
            icon,
            active: true,
            createdAt: new Date().toISOString()
          }))
        );
      }

      if (await db.categories.count() === 0) {
        await db.categories.bulkAdd([
          ...incomeCategories.map(name => ({
            id: id(),
            name,
            type: 'income' as const,
            color: '#10B981',
            icon: 'plus'
          })),
          ...expenseCategories.map(name => ({
            id: id(),
            name,
            type: 'expense' as const,
            color: '#EF4444',
            icon: 'circle'
          }))
        ]);
      }

      if (!(await db.settings.get('main'))) {
        await db.settings.put({
          id: 'main',
          userName: 'Pengguna',
          theme: 'light',
          currency: 'IDR',
          hideBalance: false
        });
      }
    }
  );
}

function assertAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Nominal harus berupa bilangan Rupiah positif tanpa desimal.');
  }
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Tanggal transaksi tidak valid.');
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(date.slice(0, 4)) ||
    parsed.getMonth() + 1 !== Number(date.slice(5, 7)) ||
    parsed.getDate() !== Number(date.slice(8, 10))
  ) {
    throw new Error('Tanggal transaksi tidak valid.');
  }
}

export async function addTransaction(
  input: Omit<Tx, 'id' | 'createdAt' | 'updatedAt'>
) {
  assertAmount(input.amount);
  assertDate(input.date);

  if (input.type === 'transfer') {
    throw new Error('Gunakan fungsi transfer untuk transaksi transfer.');
  }

  const now = new Date().toISOString();

  const transaction: Tx = {
    ...input,
    id: id(),
    createdAt: now,
    updatedAt: now
  };

  await db.transaction(
    'rw',
    db.wallets,
    db.transactions,
    async () => {
      const wallet = await db.wallets.get(input.walletId);

      if (!wallet) {
        throw new Error('Dompet tidak ditemukan.');
      }

      await db.transactions.add(transaction);
    }
  );

  return transaction;
}

export async function addTransfer(
  from: string,
  to: string,
  amount: number,
  date: string,
  notes = ''
) {
  assertAmount(amount);
  assertDate(date);

  if (!from || !to) {
    throw new Error('Pilih dompet asal dan tujuan.');
  }

  if (from === to) {
    throw new Error('Dompet asal dan tujuan harus berbeda.');
  }

  const now = new Date().toISOString();

  const transfer: Tx = {
    id: id(),
    type: 'transfer',
    amount,
    description: 'Transfer',
    walletId: from,
    toWalletId: to,
    date,
    notes,
    createdAt: now,
    updatedAt: now
  };

  await db.transaction(
    'rw',
    db.wallets,
    db.transactions,
    async () => {
      const source = await db.wallets.get(from);
      const destination = await db.wallets.get(to);

      if (!source || !destination) {
        throw new Error('Dompet asal atau tujuan tidak ditemukan.');
      }

      if (!source.active || !destination.active) {
        throw new Error('Transfer hanya dapat dilakukan pada dompet aktif.');
      }

      const transactions = await db.transactions.toArray();

      const currentBalance = walletBalance(source, transactions);

      if (currentBalance < amount) {
        throw new Error('Saldo dompet asal tidak mencukupi.');
      }

      await db.transactions.add(transfer);
    }
  );

  return transfer;
}

export function walletBalance(wallet: Wallet, transactions: Tx[]) {
  return transactions.reduce((sum, transaction) => {
    if (
      transaction.type === 'income' &&
      transaction.walletId === wallet.id
    ) {
      return sum + transaction.amount;
    }

    if (
      transaction.type === 'expense' &&
      transaction.walletId === wallet.id
    ) {
      return sum - transaction.amount;
    }

    if (
      transaction.type === 'transfer' &&
      transaction.toWalletId === wallet.id
    ) {
      return sum + transaction.amount;
    }

    if (
      transaction.type === 'transfer' &&
      transaction.walletId === wallet.id
    ) {
      return sum - transaction.amount;
    }

    return sum;
  }, wallet.openingBalance);
}

export const rupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);

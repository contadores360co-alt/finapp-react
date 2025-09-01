import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query } from 'firebase/firestore';
import Login from './Login';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div>
      {user ? <FinApp user={user} /> : <Login />}
    </div>
  );
};

const FinApp = ({ user }) => {
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState({ id: null, income: [], expense: [] });
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showDeleteWallet, setShowDeleteWallet] = useState(null);
  const [showDeleteCategory, setShowDeleteCategory] = useState(null);
  const [balanceView, setBalanceView] = useState('total');

  const [newTransaction, setNewTransaction] = useState({ amount: '', type: 'expense', walletId: '', categoryId: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [newWallet, setNewWallet] = useState({ name: '', balance: '' });
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' });
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '' });

  const [filters, setFilters] = useState({ walletId: '', type: '', categoryId: '', dateFrom: '', dateTo: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const collections = { wallets: setWallets, transactions: setTransactions, budgets: setBudgets };
      for (const [col, setter] of Object.entries(collections)) {
        const q = query(collection(db, "users", user.uid, col));
        const snapshot = await getDocs(q);
        setter(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }

      const catQuery = query(collection(db, "users", user.uid, "categories"));
      const catSnapshot = await getDocs(catQuery);
      if (catSnapshot.empty) {
        const defaultCategories = { 
          income: ['Salario', 'Freelance', 'Inversiones'], 
          expense: ['Comida', 'Transporte', 'Entretenimiento', 'Servicios'] 
        };
        const docRef = await addDoc(collection(db, "users", user.uid, "categories"), defaultCategories);
        setCategories({...defaultCategories, id: docRef.id});
      } else {
        const catData = catSnapshot.docs[0].data();
        const catId = catSnapshot.docs[0].id;
        setCategories({ ...catData, id: catId });
      }
    };
    fetchData();
  }, [user]);

  const addFSDoc = async (col, data) => {
    const docRef = await addDoc(collection(db, "users", user.uid, col), data);
    return { ...data, id: docRef.id };
  };

  const deleteFSDoc = async (col, id) => {
    await deleteDoc(doc(db, "users", user.uid, col, id));
  };

  const addTransaction = async () => {
    const newTrans = await addFSDoc('transactions', { ...newTransaction, amount: parseFloat(newTransaction.amount) });
    setTransactions([newTrans, ...transactions]);
    setShowAddTransaction(false);
  };

  const addWallet = async () => {
    const newW = await addFSDoc('wallets', { ...newWallet, balance: parseFloat(newWallet.balance) });
    setWallets([...wallets, newW]);
    setShowAddWallet(false);
  };

  const deleteWallet = async (walletId) => {
    await deleteFSDoc('wallets', walletId);
    setWallets(wallets.filter(w => w.id !== walletId));
    const transToDelete = transactions.filter(t => t.walletId === walletId);
    transToDelete.forEach(t => deleteFSDoc('transactions', t.id));
    setTransactions(transactions.filter(t => t.walletId !== walletId));
    setShowDeleteWallet(null);
  };

  const addCategory = async () => {
    const updatedCat = { ...categories, [newCategory.type]: [...categories[newCategory.type], newCategory.name] };
    const { id, ...catData } = updatedCat;
    const catDoc = doc(db, "users", user.uid, "categories", id);
    await updateDoc(catDoc, catData);
    setCategories(updatedCat);
    setShowAddCategory(false);
  };

  const deleteCategory = async (categoryName, categoryType) => {
    const updatedCat = { ...categories, [categoryType]: categories[categoryType].filter(c => c !== categoryName) };
    const { id, ...catData } = updatedCat;
    const catDoc = doc(db, "users", user.uid, "categories", id);
    await updateDoc(catDoc, catData);
    setCategories(updatedCat);
    setShowDeleteCategory(null);
  };

  const addBudget = async () => {
    const newB = await addFSDoc('budgets', { ...newBudget, amount: parseFloat(newBudget.amount), spent: 0, period: 'monthly' });
    setBudgets([...budgets, newB]);
    setShowAddBudget(false);
  };

  const deleteTransaction = async (id) => {
    await deleteFSDoc('transactions', id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const allCategories = [...(categories.income || []), ...(categories.expense || [])];

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.walletId && transaction.walletId !== filters.walletId) return false;
    if (filters.type && transaction.type !== filters.type) return false;
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
    if (filters.dateFrom && transaction.date < filters.dateFrom) return false;
    if (filters.dateTo && transaction.date > filters.dateTo) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const wallet = wallets.find(w => w.id === transaction.walletId);
      return (
        transaction.categoryId.toLowerCase().includes(searchLower) ||
        (transaction.note && transaction.note.toLowerCase().includes(searchLower)) ||
        (wallet && wallet.name.toLowerCase().includes(searchLower)) ||
        transaction.amount.toString().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">FinApp Personal</h1>
          <p className="text-gray-600 mt-1">Bienvenido, {user.email}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-outline btn-error">Cerrar Sesión</button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="tabs tabs-lifted">
          <a className={`tab ${activeTab === 'dashboard' ? 'tab-active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</a>
          <a className={`tab ${activeTab === 'wallets' ? 'tab-active' : ''}`} onClick={() => setActiveTab('wallets')}>Billeteras</a>
          <a className={`tab ${activeTab === 'transactions' ? 'tab-active' : ''}`} onClick={() => setActiveTab('transactions')}>Transacciones</a>
          <a className={`tab ${activeTab === 'budgets' ? 'tab-active' : ''}`} onClick={() => setActiveTab('budgets')}>Presupuestos</a>
          <a className={`tab ${activeTab === 'categories' ? 'tab-active' : ''}`} onClick={() => setActiveTab('categories')}>Categorías</a>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Resumen Financiero</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl">
                <div className="text-sm opacity-90">Total Ingresos</div>
                <div className="text-3xl font-bold mt-2">${totalIncome.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white p-6 rounded-xl">
                <div className="text-sm opacity-90">Total Gastos</div>
                <div className="text-3xl font-bold mt-2">${totalExpenses.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
                <div className="text-sm opacity-90">Saldo Total</div>
                <div className="text-3xl font-bold mt-2">${totalBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallets' && ( <div>{/* Wallets UI */}</div> )}
      {activeTab === 'transactions' && ( <div>{/* Transactions UI */}</div> )}
      {activeTab === 'budgets' && ( <div>{/* Budgets UI */}</div> )}
      {activeTab === 'categories' && ( <div>{/* Categories UI */}</div> )}

      {showAddTransaction && ( <div>{/* Add Transaction Modal */}</div> )}
      {showAddWallet && ( <div>{/* Add Wallet Modal */}</div> )}
      {showAddCategory && ( <div>{/* Add Category Modal */}</div> )}
      {showAddBudget && ( <div>{/* Add Budget Modal */}</div> )}
      {showDeleteWallet && ( <div>{/* Delete Wallet Modal */}</div> )}
      {showDeleteCategory && ( <div>{/* Delete Category Modal */}</div> )}

    </div>
  );
};

export default App;
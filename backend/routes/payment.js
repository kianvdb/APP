// backend/routes/payment.js - Stripe Payment Routes with Optimized Pricing
// Cost per generation: €0.18
// Target profit margin: 70-85%

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// OPTIMIZED PRICING STRATEGY
// Based on €0.18 cost per generation
const PRICING_TIERS = {
    'starter': {
        tokens: 3,
        price: 2.99,
        cost: 0.54,  // 3 × €0.18
        profit: 2.45, // 82% margin
        description: 'Perfect for trying out'
    },
    'popular': {
        tokens: 10,
        price: 7.99,
        cost: 1.80,  // 10 × €0.18
        profit: 6.19, // 77% margin
        description: 'Most popular choice'
    },
    'pro': {
        tokens: 25,
        price: 16.99,
        cost: 4.50,  // 25 × €0.18
        profit: 12.49, // 73% margin
        description: 'Best value per token'
    },
    'studio': {
        tokens: 60,
        price: 34.99,
        cost: 10.80, // 60 × €0.18
        profit: 24.19, // 69% margin
        description: 'For power users'
    }
};

// Admin emails get unlimited tokens
const ADMIN_EMAILS = [
    'threely.service@gmail.com',
    'admin@threely.com'
];

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Check if admin
        if (ADMIN_EMAILS.includes(user.email)) {
            user.isAdmin = true;
            user.tokens = 999999; // Unlimited display
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get user token balance and pricing tiers
router.get('/user-tokens', authenticateUser, async (req, res) => {
    try {
        res.json({
            id: req.user._id,
            email: req.user.email,
            tokens: req.user.tokens || 0,
            isAdmin: req.user.isAdmin || false,
            role: req.user.role || 'user',
            transactions: req.user.transactions || [],
            pricingTiers: PRICING_TIERS // Send pricing to frontend
        });
    } catch (error) {
        console.error('Error fetching user tokens:', error);
        res.status(500).json({ error: 'Failed to fetch token balance' });
    }
});

// Create Stripe payment intent
router.post('/create-payment-intent', authenticateUser, async (req, res) => {
    try {
        const { tierId } = req.body;
        
        // Validate tier
        if (!PRICING_TIERS[tierId]) {
            return res.status(400).json({ error: 'Invalid pricing tier' });
        }
        
        const tier = PRICING_TIERS[tierId];
        
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(tier.price * 100), // Convert to cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: req.user._id.toString(),
                userEmail: req.user.email,
                tierId: tierId,
                tokens: tier.tokens.toString()
            }
        });
        
        // Log for analytics
        console.log(`Payment intent created: ${req.user.email} - ${tierId} - €${tier.price}`);
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            amount: tier.price,
            tokens: tier.tokens
        });
        
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Stripe webhook endpoint
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        try {
            const userId = paymentIntent.metadata.userId;
            const tokens = parseInt(paymentIntent.metadata.tokens);
            const tierId = paymentIntent.metadata.tierId;
            const amount = paymentIntent.amount / 100;
            
            // Find user and update tokens
            const user = await User.findById(userId);
            if (!user) {
                console.error('User not found for payment:', userId);
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Check if payment already processed (idempotency)
            const existingTransaction = user.transactions?.find(
                t => t.stripePaymentIntentId === paymentIntent.id
            );
            
            if (existingTransaction) {
                console.log('Payment already processed:', paymentIntent.id);
                return res.json({ received: true });
            }
            
            // Update user tokens
            user.tokens = (user.tokens || 0) + tokens;
            
            // Calculate profit for analytics
            const tier = PRICING_TIERS[tierId];
            const profit = tier ? tier.profit : amount - (tokens * 0.18);
            
            // Add transaction record
            const transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: new Date(),
                type: 'purchase',
                tierId: tierId,
                tokens: tokens,
                amount: amount,
                profit: profit,
                status: 'completed',
                stripePaymentIntentId: paymentIntent.id,
                paymentMethod: paymentIntent.payment_method_types[0]
            };
            
            if (!user.transactions) {
                user.transactions = [];
            }
            user.transactions.push(transaction);
            
            // Update total spent
            user.totalSpent = (user.totalSpent || 0) + amount;
            user.lastTokenPurchase = new Date();
            
            await user.save();
            
            // Send confirmation email (implement your email service)
            // await sendPurchaseConfirmationEmail(user.email, transaction);
            
            console.log(`✅ Tokens added: ${tokens} to user ${user.email} (Profit: €${profit.toFixed(2)})`);
            
        } catch (error) {
            console.error('Error processing payment:', error);
            return res.status(500).json({ error: 'Failed to process payment' });
        }
    }
    
    // Handle failed payment
    if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        console.error('Payment failed:', {
            user: paymentIntent.metadata.userEmail,
            amount: paymentIntent.amount / 100,
            error: paymentIntent.last_payment_error?.message
        });
    }
    
    res.json({ received: true });
});

router.post('/confirm-payment', authenticateUser, async (req, res) => {
    try {
        const { paymentIntentId, tokens: requestedTokens } = req.body;
        const userId = req.user._id;

        console.log('📦 Confirm payment request:', {
            paymentIntentId,
            tokens: requestedTokens,
            userId
        });

        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('✅ Payment intent retrieved:', paymentIntent.status);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
                error: 'Payment not completed',
                status: paymentIntent.status 
            });
        }

        // Get tier info from metadata
        const tierId = paymentIntent.metadata.tierId;
        const metadataTokens = parseInt(paymentIntent.metadata.tokens);
        const finalTokens = requestedTokens || metadataTokens;

        console.log('💰 Processing tokens:', {
            metadataTokens,
            requestedTokens,
            finalTokens
        });

        // Find user - try with the new model first
        let user;
        try {
            user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
        } catch (modelError) {
            console.error('Model error, using direct MongoDB:', modelError.message);
            // Fall back to direct MongoDB if model fails
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            const collection = db.collection('users');
            
            user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
        }

        // Calculate profit (82% after Stripe's ~3% + $0.30 fee)
        const amount = paymentIntent.amount / 100; // Convert from cents
        const stripeFee = (amount * 0.029) + 0.30;
        const netAmount = amount - stripeFee;
        const profit = Math.round(netAmount * 0.82 * 100) / 100;

        // Create transaction object
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date(),
            type: 'purchase',
            tierId: tierId,
            tokens: finalTokens,
            amount: amount,
            profit: profit,
            status: 'completed',
            stripePaymentIntentId: paymentIntentId,
            paymentMethod: paymentIntent.payment_method_types[0] || 'card'
        };

        // Try to save with Mongoose first
        let updateSuccess = false;
        try {
            if (user.save) { // It's a Mongoose document
                user.transactions = user.transactions || [];
                user.transactions.push(transaction);
                user.tokens = (user.tokens || 0) + finalTokens;
                user.totalSpent = (user.totalSpent || 0) + amount;
                user.lastTokenPurchase = new Date();
                await user.save();
                updateSuccess = true;
                console.log('✅ Saved with Mongoose model');
            }
        } catch (saveError) {
            console.error('Mongoose save failed:', saveError.message);
        }

        // If Mongoose failed, use direct MongoDB update
        if (!updateSuccess) {
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            const collection = db.collection('users');
            
            const updateResult = await collection.updateOne(
                { _id: new mongoose.Types.ObjectId(userId) },
                {
                    $push: { transactions: transaction },
                    $inc: { 
                        tokens: finalTokens,
                        totalSpent: amount 
                    },
                    $set: { lastTokenPurchase: new Date() }
                }
            );

            if (updateResult.modifiedCount === 0) {
                throw new Error('Failed to update user in database');
            }
            
            console.log('✅ Updated with direct MongoDB');
            
            // Fetch updated user
            user = await collection.findOne(
                { _id: new mongoose.Types.ObjectId(userId) },
                { projection: { password: 0 } }
            );
        }

        console.log('✅ Payment confirmed successfully');
        console.log('💰 User tokens updated:', user.tokens);

        res.json({
            success: true,
            tokens: user.tokens,
            transaction: transaction,
            message: `Successfully added ${finalTokens} tokens`
        });

    } catch (error) {
        console.error('❌ Error confirming payment:', error);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            error: 'Failed to confirm payment',
            details: error.message
        });
    }
});

// Consume tokens (when generating a model)
router.post('/consume-token', authenticateUser, async (req, res) => {
    try {
        // Admins have unlimited tokens
        if (req.user.isAdmin) {
            return res.json({ 
                success: true, 
                tokensRemaining: 999999,
                isAdmin: true 
            });
        }
        
        // Check if user has tokens
        if (!req.user.tokens || req.user.tokens <= 0) {
            return res.status(402).json({ 
                error: 'Insufficient tokens',
                tokensRemaining: 0 
            });
        }
        
        // Atomic operation to consume token
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 
                $inc: { tokens: -1 },
                $push: {
                    tokenUsage: {
                        date: new Date(),
                        action: 'generation',
                        taskId: req.body.taskId
                    }
                }
            },
            { new: true }
        );
        
        res.json({
            success: true,
            tokensRemaining: user.tokens
        });
        
    } catch (error) {
        console.error('Error consuming token:', error);
        res.status(500).json({ error: 'Failed to consume token' });
    }
});

// Get transaction history
router.get('/transactions', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('transactions totalSpent');
        
        const transactions = (user.transactions || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Last 50 transactions
        
        res.json({
            transactions,
            totalSpent: user.totalSpent || 0
        });
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ADMIN ROUTES
router.post('/admin/grant-tokens', authenticateUser, async (req, res) => {
    try {
        // Check if user is admin
        if (!ADMIN_EMAILS.includes(req.user.email)) {
            return res.status(403).json({ error: 'Unauthorized - Admin only' });
        }
        
        const { userId, tokens, reason } = req.body;
        
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        targetUser.tokens = (targetUser.tokens || 0) + tokens;
        
        targetUser.transactions.push({
            id: `grant_${Date.now()}`,
            date: new Date(),
            type: 'admin_grant',
            tokens: tokens,
            amount: 0,
            reason: reason,
            grantedBy: req.user.email
        });
        
        await targetUser.save();
        
        console.log(`🎁 Admin granted ${tokens} tokens to ${targetUser.email}`);
        
        res.json({
            success: true,
            newBalance: targetUser.tokens
        });
        
    } catch (error) {
        console.error('Error granting tokens:', error);
        res.status(500).json({ error: 'Failed to grant tokens' });
    }
});

// Get analytics (admin only)
router.get('/admin/analytics', authenticateUser, async (req, res) => {
    try {
        if (!ADMIN_EMAILS.includes(req.user.email)) {
            return res.status(403).json({ error: 'Unauthorized - Admin only' });
        }
        
        // Get revenue analytics
        const users = await User.find({});
        
        const analytics = {
            totalUsers: users.length,
            payingUsers: users.filter(u => u.totalSpent > 0).length,
            totalRevenue: users.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
            totalTokensSold: users.reduce((sum, u) => {
                const purchased = u.transactions?.filter(t => t.type === 'purchase') || [];
                return sum + purchased.reduce((s, t) => s + (t.tokens || 0), 0);
            }, 0),
            averageSpendPerUser: 0,
            conversionRate: 0
        };
        
        analytics.averageSpendPerUser = analytics.payingUsers > 0 
            ? (analytics.totalRevenue / analytics.payingUsers).toFixed(2)
            : 0;
            
        analytics.conversionRate = analytics.totalUsers > 0
            ? ((analytics.payingUsers / analytics.totalUsers) * 100).toFixed(2)
            : 0;
        
        // Calculate costs and profit
        const totalGenerations = analytics.totalTokensSold;
        const totalCosts = totalGenerations * 0.18;
        const stripeFees = analytics.totalRevenue * 0.029; // 2.9% Stripe fee
        const netProfit = analytics.totalRevenue - totalCosts - stripeFees;
        
        analytics.costs = {
            generations: totalCosts.toFixed(2),
            stripeFees: stripeFees.toFixed(2),
            total: (totalCosts + stripeFees).toFixed(2)
        };
        
        analytics.profit = {
            gross: analytics.totalRevenue.toFixed(2),
            net: netProfit.toFixed(2),
            margin: ((netProfit / analytics.totalRevenue) * 100).toFixed(2) + '%'
        };
        
        res.json(analytics);
        
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// PLACEHOLDER ROUTES FOR FUTURE PAYMENT PROVIDERS

// PayPal placeholder
router.post('/paypal/create-order', authenticateUser, async (req, res) => {
    // TODO: Implement PayPal order creation
    res.status(501).json({ 
        error: 'PayPal integration coming soon',
        message: 'Please use Stripe for now'
    });
});

// Google Pay placeholder (uses Stripe Payment Request API)
router.post('/googlepay/process', authenticateUser, async (req, res) => {
    // Google Pay works through Stripe Payment Request API
    // Same as card payments but with Google Pay UI
    res.json({
        message: 'Use Stripe Payment Intent with Google Pay',
        useStripe: true
    });
});

// Apple Pay placeholder (uses Stripe Payment Request API)
router.post('/applepay/process', authenticateUser, async (req, res) => {
    // Apple Pay works through Stripe Payment Request API
    // Same as card payments but with Apple Pay UI
    res.json({
        message: 'Use Stripe Payment Intent with Apple Pay',
        useStripe: true
    });
});

module.exports = router;
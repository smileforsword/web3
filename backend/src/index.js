const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const SignatureService = require('./services/signatureService');
const EventListener = require('./services/eventListener');
const { provider } = require('./config/blockchain');
const testFlowApi = require('./routes/testFlowApi');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize signature service
const signatureService = new SignatureService(
  process.env.WEB_AUTH_PRIVATE_KEY,
  provider
);
app.locals.signatureService = signatureService;

// Routes
app.use('/api', testFlowApi);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    signer: signatureService.signerAddress,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error', message: err.message });
});

// Start server
app.listen(PORT, async () => {
  const { network, token } = require('./config/blockchain');

  console.log(`=`.repeat(60));
  console.log(`Blood8 Backend Server`);
  console.log(`=`.repeat(60));
  console.log(`Server running on port ${PORT}`);
  console.log(`Authorized signer: ${signatureService.signerAddress}`);
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Token: ${token.symbol} (${token.address})`);
  console.log(`Factory: ${network.factory}`);
  console.log(`=`.repeat(60));

  // Start event listener if enabled
  if (process.env.ENABLE_EVENT_LISTENER === 'true') {
    try {
      const factoryABI = require('../../frontend/src/contracts/abis/Factory.json');
      const roomABI = require('../../frontend/src/contracts/abis/MinimalRoom.json');
      const factoryAddress = process.env.FACTORY_ADDRESS;

      if (!factoryAddress) {
        console.warn('Warning: FACTORY_ADDRESS not set, event listener not started');
      } else {
        const eventListener = new EventListener(provider, factoryAddress, factoryABI, roomABI);
        await eventListener.start();

        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('SIGTERM received, shutting down gracefully...');
          eventListener.stop();
          process.exit(0);
        });
      }
    } catch (error) {
      console.error('Failed to start event listener:', error);
      console.log('Server will continue without event listener');
    }
  }
});

module.exports = app;

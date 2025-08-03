import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'asset-service' });
});

// Routes
app.get('/api/assets', (req, res) => {
  res.json({ message: 'Asset service running' });
});

app.listen(PORT, () => {
  console.log(`Asset service running on port ${PORT}`);
});
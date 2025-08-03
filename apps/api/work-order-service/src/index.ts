import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'work-order-service' });
});

// Routes
app.get('/api/work-orders', (req, res) => {
  res.json({ message: 'Work order service running' });
});

app.listen(PORT, () => {
  console.log(`Work order service running on port ${PORT}`);
});
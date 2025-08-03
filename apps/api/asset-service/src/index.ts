import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@emaintanance/database';
import { AssetController } from './controllers/AssetController';

const app = express();
const PORT = process.env.PORT || 3003;
const prisma = new PrismaClient();

// Initialize controllers
const assetController = new AssetController(prisma);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'asset-service' });
});

// Asset KPI Routes
app.get('/api/assets/kpi/downtime-ranking', assetController.getDowntimeRanking.bind(assetController));
app.get('/api/assets/kpi/fault-frequency', assetController.getFaultFrequencyRanking.bind(assetController));
app.get('/api/assets/kpi/maintenance-cost', assetController.getMaintenanceCostAnalysis.bind(assetController));
app.get('/api/assets/kpi/health-overview', assetController.getHealthOverview.bind(assetController));
app.get('/api/assets/kpi/performance-ranking', assetController.getPerformanceRanking.bind(assetController));
app.get('/api/assets/kpi/critical-assets', assetController.getCriticalAssets.bind(assetController));

// Legacy route
app.get('/api/assets', (req, res) => {
  res.json({ message: 'Asset service running' });
});

app.listen(PORT, () => {
  console.log(`Asset service running on port ${PORT}`);
});
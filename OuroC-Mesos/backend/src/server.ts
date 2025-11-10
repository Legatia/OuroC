/**
 * OuroC-Mesos Backend API Server
 * Handles Aleph.im write operations for the frontend
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { post } from 'aleph-sdk-ts/dist/messages/index.js';
import {
  initAlephAccount,
  storeContent,
  storeGuild,
  storeProposal,
  getAllContent,
  getAllGuilds,
  getAllProposals,
} from './aleph.js';
import type {
  ContentMetadata,
  GuildMetadata,
  ProposalMetadata,
  ApiResponse,
} from './types.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8085';

// Initialize Aleph account
let alephAccount: any;

try {
  alephAccount = initAlephAccount();
  console.log('✅ Aleph account ready');
} catch (error) {
  console.error('❌ Failed to initialize Aleph account:', error);
  console.error('⚠️  Please set ETHEREUM_PRIVATE_KEY in .env file');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    alephAccount: alephAccount?.address,
  });
});

// ==================== Content Endpoints ====================

/**
 * POST /api/content
 * Store new content on Aleph
 */
app.post('/api/content', async (req, res) => {
  try {
    const content = req.body as ContentMetadata;

    // Validation
    if (!content.id || !content.title || !content.creatorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, title, creatorWallet',
      } as ApiResponse<never>);
    }

    // Store on Aleph
    const result = await storeContent(alephAccount, content);

    res.json({
      success: true,
      data: content,
      hash: result.hash,
    } as ApiResponse<ContentMetadata>);
  } catch (error) {
    console.error('Error storing content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/content
 * Fetch all content from Aleph
 */
app.get('/api/content', async (req, res) => {
  try {
    const content = await getAllContent();

    res.json({
      success: true,
      data: content,
    } as ApiResponse<ContentMetadata[]>);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

// ==================== Guild Endpoints ====================

/**
 * POST /api/guilds
 * Store new guild on Aleph
 */
app.post('/api/guilds', async (req, res) => {
  try {
    const guild = req.body as GuildMetadata;

    // Validation
    if (!guild.id || !guild.name || !guild.treasuryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, treasuryAddress',
      } as ApiResponse<never>);
    }

    // Store on Aleph
    const result = await storeGuild(alephAccount, guild);

    res.json({
      success: true,
      data: guild,
      hash: result.hash,
    } as ApiResponse<GuildMetadata>);
  } catch (error) {
    console.error('Error storing guild:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/guilds
 * Fetch all guilds from Aleph
 */
app.get('/api/guilds', async (req, res) => {
  try {
    const guilds = await getAllGuilds();

    res.json({
      success: true,
      data: guilds,
    } as ApiResponse<GuildMetadata[]>);
  } catch (error) {
    console.error('Error fetching guilds:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

// ==================== Proposal Endpoints ====================

/**
 * POST /api/proposals
 * Store new proposal on Aleph
 */
app.post('/api/proposals', async (req, res) => {
  try {
    const proposal = req.body as ProposalMetadata;

    // Validation
    if (!proposal.id || !proposal.guildId || !proposal.title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, guildId, title',
      } as ApiResponse<never>);
    }

    // Store on Aleph
    const result = await storeProposal(alephAccount, proposal);

    res.json({
      success: true,
      data: proposal,
      hash: result.hash,
    } as ApiResponse<ProposalMetadata>);
  } catch (error) {
    console.error('Error storing proposal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/proposals
 * Fetch all proposals from Aleph
 */
app.get('/api/proposals', async (req, res) => {
  try {
    const proposals = await getAllProposals();

    res.json({
      success: true,
      data: proposals,
    } as ApiResponse<ProposalMetadata[]>);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

// ==================== Review Endpoints ====================

/**
 * POST /api/reviews
 * Store new review on Aleph
 */
app.post('/api/reviews', async (req, res) => {
  try {
    const review = req.body;

    // Validation
    if (!review.id || !review.contentId || !review.reviewerWallet || !review.rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, contentId, reviewerWallet, rating',
      } as ApiResponse<never>);
    }

    // Store on Aleph with type "OuroC-Mesos-Review"
    const result = await post.Publish({
      account: alephAccount,
      postType: 'OuroC-Mesos-Review',
      content: review,
      channel: 'OuroC-Mesos',
    });

    res.json({
      success: true,
      data: review,
      hash: result.item_hash,
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error storing review:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

// POST /api/lectures - Store a live lecture
app.post('/api/lectures', async (req, res) => {
  try {
    const lecture = req.body;

    // Validation
    if (!lecture.id || !lecture.contentId || !lecture.title || !lecture.scheduledTime || !lecture.creatorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, contentId, title, scheduledTime, creatorWallet',
      } as ApiResponse<never>);
    }

    console.log('📤 Storing live lecture:', lecture.title);

    // Store on Aleph.im
    const result = await post.Publish({
      account: alephAccount!,
      postType: 'OuroC-Mesos-Lecture',
      content: lecture,
      channel: 'OuroC-Mesos',
    });

    console.log('✅ Lecture stored on Aleph:', result.item_hash);

    res.json({
      success: true,
      data: lecture,
      hash: result.item_hash,
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error storing lecture:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<never>);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  } as ApiResponse<never>);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 OuroC-Mesos Backend Server Running');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🔑 Aleph Account: ${alephAccount?.address}`);
  console.log('\n📋 Available Endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/content');
  console.log('  GET  /api/content');
  console.log('  POST /api/guilds');
  console.log('  GET  /api/guilds');
  console.log('  POST /api/proposals');
  console.log('  GET  /api/proposals');
  console.log('  POST /api/reviews');
  console.log('  POST /api/lectures');
  console.log('\n✅ Ready to accept requests!\n');
});

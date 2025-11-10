/**
 * Simplified Aleph.im Integration (REST API Only)
 *
 * Uses backend API for write operations and Aleph REST API for read operations.
 * Backend handles Aleph SDK and signing.
 */

const ALEPH_API = 'https://api2.aleph.im';
const CHANNEL = 'OuroC-Mesos';
const BACKEND_API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface ContentMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  interval: 'weekly' | 'monthly' | 'quarterly';
  creatorWallet: string;
  creatorName: string;
  thumbnailUrl: string;
  tags?: string[];
  createdAt: number;
}

export interface GuildMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  treasuryAddress: string;
  subscriptionPrice: number;
  interval: 'weekly' | 'monthly' | 'quarterly';
  threshold: number;
  members: string[];
  logoEmoji?: string;
  tags?: string[];
  createdAt: number;
}

/**
 * Fetch all content from Aleph (public readonly)
 */
export async function getAllContent(): Promise<ContentMetadata[]> {
  try {
    const response = await fetch(
      `${ALEPH_API}/api/v0/posts.json?types=OuroC-Mesos-Content&channels=${CHANNEL}`
    );

    if (!response.ok) {
      console.warn('Failed to fetch from Aleph, returning empty array');
      return [];
    }

    const data = await response.json();
    const content = data.posts?.map((post: any) => post.content as ContentMetadata) || [];

    console.log(`✅ Loaded ${content.length} courses from Aleph`);
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    return [];
  }
}

/**
 * Fetch all guilds from Aleph (public readonly)
 */
export async function getAllGuilds(): Promise<GuildMetadata[]> {
  try {
    const response = await fetch(
      `${ALEPH_API}/api/v0/posts.json?types=OuroC-Mesos-Guild&channels=${CHANNEL}`
    );

    if (!response.ok) {
      console.warn('Failed to fetch guilds from Aleph, returning empty array');
      return [];
    }

    const data = await response.json();
    const guilds = data.posts?.map((post: any) => post.content as GuildMetadata) || [];

    console.log(`✅ Loaded ${guilds.length} guilds from Aleph`);
    return guilds;
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }
}

/**
 * Store content on Aleph via backend API
 */
export async function storeContent(content: ContentMetadata): Promise<boolean> {
  try {
    console.log('📤 Storing content via backend API...');

    const response = await fetch(`${BACKEND_API}/api/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Content stored on Aleph:', result.hash);
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Failed to store content:', error);

    // Fallback to localStorage if backend is unavailable
    console.log('⚠️ Backend unavailable, falling back to localStorage');
    try {
      const existing = JSON.parse(localStorage.getItem('aleph_content') || '[]');
      existing.push(content);
      localStorage.setItem('aleph_content', JSON.stringify(existing));
      return true;
    } catch (localError) {
      console.error('Failed to store in localStorage:', localError);
      return false;
    }
  }
}

export async function storeGuild(guild: GuildMetadata): Promise<boolean> {
  try {
    console.log('📤 Storing guild via backend API...');

    const response = await fetch(`${BACKEND_API}/api/guilds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guild),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Guild stored on Aleph:', result.hash);
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Failed to store guild:', error);

    // Fallback to localStorage if backend is unavailable
    console.log('⚠️ Backend unavailable, falling back to localStorage');
    try {
      const existing = JSON.parse(localStorage.getItem('aleph_guilds') || '[]');
      existing.push(guild);
      localStorage.setItem('aleph_guilds', JSON.stringify(existing));
      return true;
    } catch (localError) {
      console.error('Failed to store in localStorage:', localError);
      return false;
    }
  }
}

/**
 * Get from localStorage if Aleph write not working
 */
export async function getLocalContent(): Promise<ContentMetadata[]> {
  try {
    return JSON.parse(localStorage.getItem('aleph_content') || '[]');
  } catch {
    return [];
  }
}

export async function getLocalGuilds(): Promise<GuildMetadata[]> {
  try {
    return JSON.parse(localStorage.getItem('aleph_guilds') || '[]');
  } catch {
    return [];
  }
}

/**
 * Review types and functions
 */
export interface Review {
  id: string;
  contentId: string;
  reviewerWallet: string;
  reviewerName?: string;
  rating: number;
  comment: string;
  createdAt: number;
}

/**
 * Fetch all reviews for a specific content from Aleph
 */
export async function getContentReviews(contentId: string): Promise<Review[]> {
  try {
    const response = await fetch(
      `${ALEPH_API}/api/v0/posts.json?types=OuroC-Mesos-Review&channels=${CHANNEL}`
    );

    if (!response.ok) {
      console.warn('Failed to fetch reviews from Aleph, returning empty array');
      return [];
    }

    const data = await response.json();
    const allReviews = data.posts?.map((post: any) => post.content as Review) || [];

    // Filter reviews for this specific content
    const contentReviews = allReviews.filter((r: Review) => r.contentId === contentId);

    console.log(`✅ Loaded ${contentReviews.length} reviews for content ${contentId}`);
    return contentReviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Store review on Aleph via backend API
 */
export async function storeReview(review: Review): Promise<boolean> {
  try {
    console.log('📤 Storing review via backend API...');

    const response = await fetch(`${BACKEND_API}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Review stored on Aleph:', result.hash);
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Failed to store review:', error);

    // Fallback to localStorage if backend is unavailable
    console.log('⚠️ Backend unavailable, falling back to localStorage');
    try {
      const existing = JSON.parse(localStorage.getItem('aleph_reviews') || '[]');
      existing.push(review);
      localStorage.setItem('aleph_reviews', JSON.stringify(existing));
      return true;
    } catch (localError) {
      console.error('Failed to store in localStorage:', localError);
      return false;
    }
  }
}

// ===== Live Lecture Interfaces =====

export interface LiveLecture {
  id: string;
  contentId: string;
  title: string;
  description: string;
  scheduledTime: number; // Unix timestamp
  duration: number; // Duration in minutes
  streamUrl?: string; // Video stream URL (e.g., YouTube Live, Twitch, or custom RTMP)
  status: 'scheduled' | 'live' | 'ended';
  creatorWallet: string;
  creatorName: string;
  maxAttendees?: number;
  attendees: string[]; // Wallet addresses of attendees
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  lectureId: string;
  senderWallet: string;
  senderName?: string;
  message: string;
  timestamp: number;
  isQuestion?: boolean; // Mark as a question for Q&A
  isAnswered?: boolean; // For Q&A tracking
}

/**
 * Fetch all live lectures for a content
 */
export async function getContentLectures(contentId: string): Promise<LiveLecture[]> {
  try {
    const response = await fetch(
      `${ALEPH_API}/api/v0/posts.json?types=OuroC-Mesos-Lecture&channels=${CHANNEL}`
    );

    if (!response.ok) {
      throw new Error(`Aleph API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allLectures = data.posts?.map((post: any) => post.content as LiveLecture) || [];

    // Filter by contentId
    return allLectures.filter((lecture: LiveLecture) => lecture.contentId === contentId);
  } catch (error) {
    console.error('Failed to fetch lectures from Aleph:', error);

    // Fallback to localStorage
    try {
      const local = JSON.parse(localStorage.getItem('aleph_lectures') || '[]');
      return local.filter((lecture: LiveLecture) => lecture.contentId === contentId);
    } catch {
      return [];
    }
  }
}

/**
 * Fetch upcoming lectures (all scheduled lectures)
 */
export async function getUpcomingLectures(): Promise<LiveLecture[]> {
  try {
    const response = await fetch(
      `${ALEPH_API}/api/v0/posts.json?types=OuroC-Mesos-Lecture&channels=${CHANNEL}`
    );

    if (!response.ok) {
      throw new Error(`Aleph API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allLectures = data.posts?.map((post: any) => post.content as LiveLecture) || [];

    // Filter scheduled or live lectures
    return allLectures.filter((lecture: LiveLecture) =>
      lecture.status === 'scheduled' || lecture.status === 'live'
    ).sort((a, b) => a.scheduledTime - b.scheduledTime);
  } catch (error) {
    console.error('Failed to fetch upcoming lectures:', error);

    // Fallback to localStorage
    try {
      const local = JSON.parse(localStorage.getItem('aleph_lectures') || '[]');
      return local.filter((lecture: LiveLecture) =>
        lecture.status === 'scheduled' || lecture.status === 'live'
      ).sort((a: LiveLecture, b: LiveLecture) => a.scheduledTime - b.scheduledTime);
    } catch {
      return [];
    }
  }
}

/**
 * Store a live lecture
 */
export async function storeLiveLecture(lecture: LiveLecture): Promise<boolean> {
  try {
    console.log('📤 Storing live lecture via backend API...');

    const response = await fetch(`${BACKEND_API}/api/lectures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lecture),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Lecture stored on Aleph:', result.hash);
      return true;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Failed to store lecture:', error);

    // Fallback to localStorage
    console.log('⚠️ Backend unavailable, falling back to localStorage');
    try {
      const existing = JSON.parse(localStorage.getItem('aleph_lectures') || '[]');
      existing.push(lecture);
      localStorage.setItem('aleph_lectures', JSON.stringify(existing));
      return true;
    } catch (localError) {
      console.error('Failed to store in localStorage:', localError);
      return false;
    }
  }
}

/**
 * Get chat messages for a lecture (using localStorage for now)
 * In production, this would use WebSocket or real-time DB
 */
export function getChatMessages(lectureId: string): ChatMessage[] {
  try {
    const messages = JSON.parse(localStorage.getItem(`chat_${lectureId}`) || '[]');
    return messages;
  } catch {
    return [];
  }
}

/**
 * Store a chat message (using localStorage for now)
 */
export function storeChatMessage(message: ChatMessage): boolean {
  try {
    const existing = getChatMessages(message.lectureId);
    existing.push(message);
    localStorage.setItem(`chat_${message.lectureId}`, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

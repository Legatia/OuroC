import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  getContentLectures,
  LiveLecture as LiveLectureType,
  ChatMessage,
  getChatMessages,
  storeChatMessage
} from '@/lib/alephSimple';
import {
  ArrowLeft,
  Users,
  Clock,
  Send,
  Video,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

export default function LiveLecture() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [lecture, setLecture] = useState<LiveLectureType | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Load lecture and chat
  useEffect(() => {
    async function loadLecture() {
      if (!lectureId) return;

      try {
        // For now, get all lectures from localStorage
        // In production, this would fetch from Aleph API
        const storedLectures = JSON.parse(localStorage.getItem('aleph_lectures') || '[]');
        const found = storedLectures.find((l: LiveLectureType) => l.id === lectureId);

        if (found) {
          setLecture(found);

          // Load chat messages
          const chatMessages = getChatMessages(lectureId);
          setMessages(chatMessages);
        } else {
          toast({
            title: 'Lecture not found',
            description: 'This lecture does not exist or has been removed.',
            variant: 'destructive',
          });
          navigate('/community');
        }
      } catch (error) {
        console.error('Failed to load lecture:', error);
        toast({
          title: 'Error loading lecture',
          description: 'Failed to load lecture details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadLecture();
  }, [lectureId, navigate, toast]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate real-time chat updates (in production, use WebSocket)
  useEffect(() => {
    if (!lectureId) return;

    const interval = setInterval(() => {
      const chatMessages = getChatMessages(lectureId);
      setMessages(chatMessages);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [lectureId]);

  const handleSendMessage = () => {
    if (!publicKey || !lectureId || !newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lectureId,
      senderWallet: publicKey.toString(),
      senderName: undefined, // Could get from profile
      message: newMessage.trim(),
      timestamp: Date.now(),
      isQuestion,
      isAnswered: false,
    };

    const success = storeChatMessage(message);

    if (success) {
      setMessages([...messages, message]);
      setNewMessage('');
      setIsQuestion(false);
      messageInputRef.current?.focus();
    } else {
      toast({
        title: 'Failed to send message',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilStart = (scheduledTime: number) => {
    const now = Date.now();
    const diff = scheduledTime - now;

    if (diff < 0) return 'Started';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }

    return `Starts in ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Lecture not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/content/${lecture.contentId}`)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Course
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main video area */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {lecture.status === 'live' && lecture.streamUrl ? (
                <iframe
                  src={lecture.streamUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : lecture.status === 'scheduled' ? (
                <div className="text-center text-white p-8">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold mb-2">Lecture Not Started Yet</h3>
                  <p className="text-gray-300 mb-4">{getTimeUntilStart(lecture.scheduledTime)}</p>
                  <p className="text-sm text-gray-400">
                    Scheduled for {formatTime(lecture.scheduledTime)}
                  </p>
                </div>
              ) : (
                <div className="text-center text-white p-8">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold mb-2">Lecture Ended</h3>
                  <p className="text-gray-300">This lecture has concluded</p>
                </div>
              )}

              {/* Live indicator */}
              {lecture.status === 'live' && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}

              {/* Viewer count */}
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {lecture.attendees.length}
              </div>
            </div>

            <CardHeader>
              <CardTitle className="text-2xl">{lecture.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {lecture.duration} minutes
                </span>
                <span>by {lecture.creatorName}</span>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {lecture.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chat sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No messages yet. Be the first to say something!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${
                        msg.isQuestion ? 'bg-yellow-50 border-l-4 border-yellow-500 pl-2' : ''
                      } py-2`}
                    >
                      <div className="flex items-start gap-2">
                        {msg.isQuestion && <HelpCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">
                              {msg.senderName || `${msg.senderWallet.slice(0, 6)}...${msg.senderWallet.slice(-4)}`}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="isQuestion"
                    checked={isQuestion}
                    onChange={(e) => setIsQuestion(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isQuestion" className="text-sm text-muted-foreground cursor-pointer">
                    Mark as Q&A question
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={publicKey ? 'Type a message...' : 'Connect wallet to chat'}
                    disabled={!publicKey}
                    className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!publicKey || !newMessage.trim()}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

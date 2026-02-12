'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'student' | 'agent';
  content: string;
  timestamp: string;
  status: 'sent' | 'approved';
}

interface Thread {
  id: string;
  subject: string;
  preview: string;
  lastMessageAt: Date;
  messages: Message[];
  lastSender: 'student' | 'agent';
}

interface Student {
  id: string;
  name: string;
  email: string;
  currentPhase: string;
  currentTopicIndex: number;
  currentMilestone: number;
}

export default function StudentInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLoggedInStudent();
  }, []);

  useEffect(() => {
    if (student) {
      fetchMessages(student.id);
    }
  }, [student]);

  // Poll for new messages
  useEffect(() => {
    if (!student) return;
    const interval = setInterval(() => fetchMessages(student.id), 10000);
    return () => clearInterval(interval);
  }, [student]);

  async function loadLoggedInStudent() {
    try {
      // Get logged-in user from localStorage
      const storedStudentId = localStorage.getItem('studentId');
      const storedUser = localStorage.getItem('user');

      if (storedStudentId && storedUser) {
        const user = JSON.parse(storedUser);
        // Fetch full student data
        const res = await fetch('/api/students');
        const data = await res.json();
        if (data.success) {
          const foundStudent = data.data.students.find((s: Student) => s.id === storedStudentId);
          if (foundStudent) {
            setStudent(foundStudent);
          }
        }
      } else {
        // No logged in user - redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to load student:', error);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessages(studentId: string) {
    try {
      const res = await fetch(`/api/messages?studentId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        const messages: Message[] = data.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          status: msg.status,
        }));

        // Build threads by pairing student messages with agent responses
        const builtThreads = buildThreads(messages);
        setThreads(builtThreads);

        // Update selected thread
        if (selectedThread) {
          const updated = builtThreads.find(t => t.id === selectedThread.id);
          if (updated) setSelectedThread(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  function buildThreads(messages: Message[]): Thread[] {
    // Sort messages by timestamp ascending (oldest first)
    const sorted = [...messages].sort(
      (a, b) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime()
    );

    const threads: Thread[] = [];
    let currentThread: Message[] = [];
    let currentSubject = '';

    for (const msg of sorted) {
      if (msg.role === 'student') {
        // Student message - check if it starts a new thread
        const subject = extractSubject(msg.content);
        const isNewThread = subject !== currentSubject || currentThread.length === 0;

        if (isNewThread && currentThread.length > 0) {
          // Save previous thread
          threads.push(createThread(currentThread, currentSubject));
          currentThread = [];
        }

        currentSubject = subject;
        currentThread.push(msg);
      } else {
        // Agent response - add to current thread
        if (currentThread.length > 0) {
          currentThread.push(msg);
        } else {
          // Orphan agent message - create its own thread
          currentThread = [msg];
          currentSubject = extractSubject(msg.content);
        }
      }
    }

    // Don't forget the last thread
    if (currentThread.length > 0) {
      threads.push(createThread(currentThread, currentSubject));
    }

    // Sort threads by most recent message (newest first)
    threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    return threads;
  }

  function createThread(messages: Message[], subject: string): Thread {
    const lastMsg = messages[messages.length - 1];
    return {
      id: messages[0].id, // Use first message ID as thread ID
      subject: subject || 'No Subject',
      preview: extractBody(lastMsg.content).slice(0, 100),
      lastMessageAt: parseTimestamp(lastMsg.timestamp),
      messages: messages,
      lastSender: lastMsg.role,
    };
  }

  function extractSubject(content: string): string {
    if (content.startsWith('Subject:')) {
      const lines = content.split('\n');
      return lines[0].replace('Subject:', '').trim();
    }
    // For messages without subject, use first meaningful line
    const firstLine = content.split('\n').find(l => l.trim().length > 0) || '';
    if (firstLine.length <= 50) return firstLine;
    return firstLine.slice(0, 47) + '...';
  }

  function extractBody(content: string): string {
    if (content.startsWith('Subject:')) {
      const parts = content.split('\n\n');
      return parts.slice(1).join('\n\n');
    }
    return content;
  }

  function parseTimestamp(timestamp: string): Date {
    const ts = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    return new Date(ts);
  }

  function formatDate(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }

  function formatFullDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  async function sendMessage(isReply: boolean = false) {
    const body = isReply ? replyBody : composeBody;
    const subject = isReply && selectedThread ? selectedThread.subject : composeSubject;

    if (!body.trim() || !student) return;

    setIsSending(true);

    try {
      // Always include subject for proper threading
      const fullMessage = `Subject: ${subject || 'General Question'}\n\n${body}`;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          message: fullMessage,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (isReply) {
          setReplyBody('');
        } else {
          setIsComposing(false);
          setComposeSubject('');
          setComposeBody('');
        }
        await fetchMessages(student.id);
      } else {
        alert(`Failed to send message: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Vizuara Bootcamp</h1>
            <p className="text-sm text-slate-500">{student?.name || 'Student Portal'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {student?.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
            {student?.name?.charAt(0) || 'S'}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem('studentId');
              window.location.href = '/login';
            }}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-white/50 backdrop-blur-sm border-r border-slate-200/60 flex flex-col">
          <div className="p-4">
            <button
              onClick={() => {
                setIsComposing(true);
                setSelectedThread(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compose
            </button>
          </div>

          <nav className="flex-1 px-3">
            <div className="px-4 py-2.5 text-violet-700 bg-violet-100 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="font-medium">All Conversations</span>
              <span className="ml-auto text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">
                {threads.length}
              </span>
            </div>
          </nav>

          {/* Phase Status */}
          <div className="p-4 border-t border-slate-200/60">
            <div className="mb-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Current Status</div>
              <div className={`text-sm font-medium ${student?.currentPhase === 'phase1' ? 'text-blue-600' : 'text-emerald-600'}`}>
                {student?.currentPhase === 'phase1' ? 'Phase I - Video Curriculum' : 'Phase II - Research Project'}
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center">
              Messages are reviewed by Dr. Raj
            </div>
          </div>
        </aside>

        {/* Thread List */}
        <div className="w-96 bg-white/30 border-r border-slate-200/60 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-200/60">
            <h2 className="font-semibold text-slate-800">Conversations</h2>
            <p className="text-sm text-slate-500">{threads.length} thread{threads.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>No conversations yet</p>
                <p className="text-xs mt-2">Click Compose to start a conversation!</p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => {
                    setSelectedThread(thread);
                    setIsComposing(false);
                    setReplyBody('');
                  }}
                  className={`w-full p-4 text-left border-b border-slate-100 transition-all duration-200 ${
                    selectedThread?.id === thread.id ? 'bg-violet-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${
                      thread.lastSender === 'agent'
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                        : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    }`}>
                      {thread.lastSender === 'agent' ? 'RD' : student?.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${
                          thread.lastSender === 'agent' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}>
                          {thread.subject}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {thread.lastSender === 'agent' ? 'Dr. Raj: ' : 'You: '}
                        {thread.preview.slice(0, 40)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''}
                        </span>
                        {thread.lastSender === 'agent' && (
                          <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">
                            New reply
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-white/50 flex flex-col min-h-0">
          {isComposing ? (
            // Compose View
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/80">
                <h2 className="font-semibold text-slate-800">New Conversation</h2>
                <button onClick={() => setIsComposing(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4 p-4 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-16">To:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">RD</div>
                      <span className="text-sm text-slate-800">Dr. Raj Dandekar</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border-b border-slate-100">
                    <span className="text-sm text-slate-500 w-16">Subject:</span>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={e => setComposeSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400"
                    />
                  </div>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write your message..."
                    className="w-full p-4 text-slate-800 bg-transparent outline-none resize-none placeholder-slate-400 leading-relaxed min-h-[300px]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200/60 bg-white/80 flex items-center gap-3">
                <button
                  onClick={() => sendMessage(false)}
                  disabled={isSending || !composeBody.trim() || !composeSubject.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
                <button onClick={() => { setIsComposing(false); setComposeSubject(''); setComposeBody(''); }} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                  Discard
                </button>
              </div>
            </div>
          ) : selectedThread ? (
            // Thread View - Shows ALL messages in the conversation
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 border-b border-slate-200/60 bg-white/80 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-slate-800">{selectedThread.subject}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedThread.messages.length} message{selectedThread.messages.length > 1 ? 's' : ''} in this conversation
                    </p>
                  </div>
                  <button onClick={() => setSelectedThread(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {selectedThread.messages.map((message) => (
                  <div key={message.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          message.role === 'agent'
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                            : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        }`}>
                          {message.role === 'agent' ? 'RD' : student?.name?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            {message.role === 'agent' ? 'Dr. Raj Dandekar' : student?.name || 'You'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFullDate(parseTimestamp(message.timestamp))}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="prose prose-slate max-w-none prose-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 hover:text-amber-700 underline font-medium"
                              >
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {extractBody(message.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-200/60 bg-white/80 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply to this conversation
                  </div>
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full p-4 text-slate-800 bg-transparent outline-none resize-none placeholder-slate-400 min-h-[80px]"
                  />
                  <div className="p-3 border-t border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() => sendMessage(true)}
                      disabled={isSending || !replyBody.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {isSending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">Select a conversation</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Choose a conversation to view all messages, or compose a new one
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

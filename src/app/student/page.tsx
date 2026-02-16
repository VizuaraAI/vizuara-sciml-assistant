'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { playClickSound, playSendSound, playSuccessSound, playNotificationSound } from '@/lib/sounds';

interface MessageAttachment {
  filename: string;
  url: string;
  mimeType: string;
  storagePath: string;
}

interface Message {
  id: string;
  role: 'student' | 'agent';
  content: string;
  timestamp: string;
  status: 'sent' | 'approved';
  attachments?: MessageAttachment[];
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false); // Track sending state for polling

  useEffect(() => {
    loadLoggedInStudent();
  }, []);

  useEffect(() => {
    if (student) {
      fetchMessages(student.id);
    }
  }, [student]);

  // Poll for new messages - but skip if currently sending to preserve optimistic update
  useEffect(() => {
    if (!student) return;
    const interval = setInterval(() => {
      if (!isSendingRef.current) {
        fetchMessages(student.id);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [student]);

  // Poll for phase changes (auto-transition detection)
  useEffect(() => {
    if (!student) return;

    const checkPhaseChange = async () => {
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (data.success) {
          const updatedStudent = data.data.students.find((s: Student) => s.id === student.id);
          if (updatedStudent && updatedStudent.currentPhase !== student.currentPhase) {
            // Phase changed! Show notification and update
            playSuccessSound();
            setStudent(updatedStudent);

            // Show phase transition notification
            if (updatedStudent.currentPhase === 'phase2') {
              alert('🎉 Congratulations! You have been transitioned to Phase II - Research Project! The page will now refresh.');
              window.location.reload();
            }
          }
        }
      } catch (error) {
        console.error('Failed to check phase:', error);
      }
    };

    const interval = setInterval(checkPhaseChange, 15000); // Check every 15 seconds
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
          attachments: msg.attachments || [],
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

    // Group messages by subject into threads
    const threadMap = new Map<string, Message[]>();

    for (const msg of sorted) {
      const subject = extractSubject(msg.content);
      const normalizedSubject = subject.toLowerCase().trim();

      // Find existing thread with matching subject
      let foundKey: string | null = null;
      const keys = Array.from(threadMap.keys());
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase().trim() === normalizedSubject) {
          foundKey = keys[i];
          break;
        }
      }

      if (foundKey) {
        threadMap.get(foundKey)!.push(msg);
      } else {
        threadMap.set(subject, [msg]);
      }
    }

    // Convert map to thread array
    const threads: Thread[] = [];
    threadMap.forEach((msgs, subject) => {
      if (msgs.length > 0) {
        threads.push(createThread(msgs, subject));
      }
    });

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

  function parseTimestamp(timestamp: string | null | undefined): Date {
    if (!timestamp) {
      return new Date(); // Return current date if timestamp is missing
    }
    const ts = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(ts);
    // Check if date is valid, return current date if not
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
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

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    console.log('handleFileSelect called', e.target.files);
    const files = e.target.files;
    if (files && files.length > 0) {
      // IMPORTANT: Convert FileList to Array IMMEDIATELY before any async operations
      // FileList is a live reference - if we clear the input, the FileList becomes empty
      const fileArray = Array.from(files);
      console.log('Adding files:', fileArray.map(f => f.name));

      // Reset input BEFORE setState so user can select same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setAttachments(prev => {
        const newAttachments = [...prev, ...fileArray];
        console.log('New attachments state:', newAttachments.map(f => f.name));
        return newAttachments;
      });
    }
  }

  // Remove an attachment
  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(isReply: boolean = false) {
    const body = isReply ? replyBody : composeBody;
    const subject = isReply && selectedThread ? selectedThread.subject : composeSubject;

    if ((!body.trim() && attachments.length === 0) || !student) return;

    playSendSound();
    setIsSending(true);
    isSendingRef.current = true; // Pause polling during send

    try {
      // First upload any attachments (must wait for this)
      const uploadedFiles: Array<{ filename: string; publicUrl: string; mimeType: string; storagePath: string }> = [];

      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'other');
        formData.append('studentId', student.id);
        formData.append('uploaderEmail', student.email);
        formData.append('description', `Attached in thread: ${file.name}`);

        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data?.document) {
          const uploadedFile = {
            filename: uploadData.data.document.originalFilename,
            publicUrl: uploadData.data.document.publicUrl,
            mimeType: uploadData.data.document.mimeType,
            storagePath: uploadData.data.document.storagePath,
          };
          console.log('File uploaded successfully:', uploadedFile);
          uploadedFiles.push(uploadedFile);
        } else {
          console.error('File upload failed:', uploadData);
        }
      }

      // Build message content with attachment links
      let messageContent = body.trim();
      if (uploadedFiles.length > 0) {
        messageContent += '\n\n📎 Attachments:\n';
        uploadedFiles.forEach(f => {
          messageContent += `- [${f.filename}](${f.publicUrl})\n`;
        });
      }

      // Always include subject for proper threading
      const fullMessage = `Subject: ${subject || 'General Question'}\n\n${messageContent}`;

      // OPTIMISTIC UI: Add message to local state immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'student',
        content: fullMessage,
        timestamp: new Date().toISOString(),
        status: 'sent',
        attachments: uploadedFiles.map(f => ({
          filename: f.filename,
          url: f.publicUrl,
          mimeType: f.mimeType,
          storagePath: f.storagePath,
        })),
      };

      // Add to threads immediately
      const threadSubject = subject || 'General Question';
      const now = new Date();
      setThreads(prev => {
        const existingThread = prev.find(t => t.subject === threadSubject);
        if (existingThread) {
          return prev.map(t =>
            t.subject === threadSubject
              ? { ...t, messages: [...t.messages, optimisticMessage], lastMessageAt: now, lastSender: 'student' as const, preview: messageContent.substring(0, 100) }
              : t
          );
        } else {
          return [{
            id: `thread-${Date.now()}`,
            subject: threadSubject,
            lastMessageAt: now,
            messages: [optimisticMessage],
            lastSender: 'student' as const,
            preview: messageContent.substring(0, 100),
          }, ...prev];
        }
      });

      // Clear inputs immediately - user sees their message right away
      if (isReply) {
        setReplyBody('');
      } else {
        setIsComposing(false);
        setComposeSubject('');
        setComposeBody('');
      }
      setAttachments([]);
      setIsSending(false); // Stop spinner immediately

      // Fire API call in background - don't await
      fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          message: fullMessage,
          attachments: uploadedFiles,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!data.success) {
          console.error('Background send failed:', data.error);
        }
        // Resume polling and refresh to get the real message from server
        isSendingRef.current = false;
        fetchMessages(student.id);
      }).catch(err => {
        console.error('Background send error:', err);
        isSendingRef.current = false; // Resume polling even on error
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to upload attachments. Please try again.');
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#fbfbfd' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#0071e3', borderTopColor: 'transparent' }} />
          <p style={{ color: '#86868b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#fbfbfd' }}>
      {/* Hidden file input - ALWAYS rendered so ref works */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="sr-only"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.py,.js,.ts,.jsx,.tsx,.json,.csv,.png,.jpg,.jpeg,.gif,.webp,.jl,.ipynb"
      />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e5e5e7' }}>
        <div className="flex items-center gap-4">
          <img
            src="/vizuara-logo.png"
            alt="Vizuara"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Vizuara Scientific ML Bootcamp</h1>
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
        <aside className="w-64 flex flex-col" style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRight: '1px solid #e5e5e7' }}>
          <div className="p-4">
            <button
              onClick={() => {
                playClickSound();
                setIsComposing(true);
                setSelectedThread(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5" style={{ backgroundColor: '#0071e3' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compose
            </button>
          </div>

          <nav className="flex-1 px-3">
            <div className="px-4 py-2.5 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)', color: '#0071e3' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="font-medium">All Conversations</span>
              <span className="ml-auto text-xs text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#0071e3' }}>
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
        <div className="w-96 flex flex-col min-h-0" style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e5e5e7' }}>
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
                    selectedThread?.id === thread.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                      style={{ backgroundColor: thread.lastSender === 'agent' ? '#0071e3' : '#34c759' }}
                    >
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
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)', color: '#0071e3' }}>
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
        <main className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: '#ffffff' }}>
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: '#0071e3' }}>RD</div>
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
                    className="w-full p-4 text-slate-800 bg-transparent outline-none resize-none placeholder-slate-400 leading-relaxed min-h-[250px]"
                    autoFocus
                  />

                  {/* Attachments Preview in Compose */}
                  {attachments.length > 0 && (
                    <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm font-medium text-blue-700">{attachments.length} file{attachments.length > 1 ? 's' : ''} attached</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white border border-blue-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm">
                            {file.type.startsWith('image/') ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : file.type.includes('pdf') ? (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200/60 bg-white/80 flex items-center justify-between">
                <button
                  onClick={() => {
                    console.log('Attach button clicked, fileInputRef:', fileInputRef.current);
                    fileInputRef.current?.click();
                  }}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    attachments.length > 0
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attach Files
                  {attachments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                      {attachments.length}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <button onClick={() => { setIsComposing(false); setComposeSubject(''); setComposeBody(''); setAttachments([]); }} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                    Discard
                  </button>
                  <button
                    onClick={() => sendMessage(false)}
                    disabled={isSending || (!composeBody.trim() && attachments.length === 0) || !composeSubject.trim()}
                    className="px-6 py-2.5 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: '#0071e3' }}
                  >
                    {isSending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : 'Send'}
                  </button>
                </div>
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
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: message.role === 'agent' ? '#0071e3' : '#34c759' }}
                        >
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

                      {/* Display message attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Attachments ({message.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 transition-colors"
                              >
                                {attachment.mimeType.startsWith('image/') ? (
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : attachment.mimeType === 'application/pdf' ? (
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                                <span className="max-w-[200px] truncate">{attachment.filename}</span>
                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box - Modern Email Style */}
              <div className="p-4 border-t border-slate-200/60 bg-white/80 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">

                  {/* Attachments Preview - Shows above textarea when files attached */}
                  {attachments.length > 0 && (
                    <div className="px-4 pt-4 pb-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">{attachments.length} file{attachments.length > 1 ? 's' : ''} attached</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="group flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm shadow-sm hover:border-blue-300 transition-colors">
                            {file.type.startsWith('image/') ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : file.type.includes('pdf') ? (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                            <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="ml-1 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compose Area */}
                  <div className="p-4">
                    <textarea
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      placeholder="Write your reply..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 leading-relaxed min-h-[80px] text-sm"
                    />
                  </div>

                  {/* Action Bar */}
                  <div className="px-4 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Attachment Button with Badge */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                          attachments.length > 0
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Attach files (PDF, images, code, etc.)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>Attach Files</span>
                        {attachments.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {attachments.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => sendMessage(true)}
                      disabled={isSending || (!replyBody.trim() && attachments.length === 0)}
                      className="px-5 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm hover:opacity-90 transition-all"
                      style={{ backgroundColor: '#0071e3' }}
                    >
                      {isSending ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)' }}>
                  <svg className="w-10 h-10" style={{ color: '#0071e3' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

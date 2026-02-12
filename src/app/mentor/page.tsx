'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Student {
  id: string;
  name: string;
  email: string;
  currentPhase: string;
  currentTopicIndex: number;
  currentMilestone: number;
  researchTopic: string | null;
}

interface Message {
  id: string;
  role: 'student' | 'agent';
  content: string;
  subject: string;
  timestamp: string;
  status: 'sent' | 'approved' | 'draft';
  threadId: string;
}

interface Thread {
  id: string;
  subject: string;
  lastMessageAt: string;
  messages: Message[];
  hasDraft: boolean;
  draftId?: string;
}

interface Draft {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  originalMessage: string;
  aiResponse: string;
  createdAt: string;
}

export default function MentorInboxPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeView, setActiveView] = useState<'conversations' | 'drafts'>('drafts');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modal states
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showColabModal, setShowColabModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [roadmapTopic, setRoadmapTopic] = useState('');
  const [colabQuestion, setColabQuestion] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isGeneratingColab, setIsGeneratingColab] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Colab generation progress states
  const [colabProgress, setColabProgress] = useState<{
    step: number;
    message: string;
    phase: string;
  } | null>(null);
  const [colabThinking, setColabThinking] = useState<string[]>([]);

  // Roadmap generation progress states
  const [roadmapProgress, setRoadmapProgress] = useState<{
    step: number;
    message: string;
    phase: string;
  } | null>(null);
  const [roadmapThinking, setRoadmapThinking] = useState<string[]>([]);

  // Context panel states
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [contextData, setContextData] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isAcceptingRoadmap, setIsAcceptingRoadmap] = useState(false);

  // Student info panel state
  const [showStudentInfo, setShowStudentInfo] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isLoadingStudentInfo, setIsLoadingStudentInfo] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchStudents();
    fetchDrafts();
  }, []);

  // Poll for new drafts every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchDrafts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when student changes
  useEffect(() => {
    if (selectedStudent) {
      fetchMessages(selectedStudent.id);
    }
  }, [selectedStudent]);

  async function fetchStudents() {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success && data.data.students.length > 0) {
        setStudents(data.data.students);
        setSelectedStudent(data.data.students[0]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDrafts() {
    try {
      const res = await fetch('/api/drafts/all');
      const data = await res.json();
      if (data.success) {
        const formattedDrafts: Draft[] = data.data.drafts.map((d: any) => ({
          id: d.id,
          studentId: d.studentId,
          studentName: d.studentName,
          subject: extractSubject(d.originalMessage),
          originalMessage: d.originalMessage,
          aiResponse: d.aiResponse,
          createdAt: d.createdAt,
        }));
        setDrafts(formattedDrafts);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    }
  }

  async function fetchMessages(studentId: string) {
    try {
      // Fetch both sent/approved messages AND drafts for this student
      const [messagesRes, draftsRes] = await Promise.all([
        fetch(`/api/messages?studentId=${studentId}`),
        fetch(`/api/drafts?studentId=${studentId}`),
      ]);

      const messagesData = await messagesRes.json();
      const draftsData = await draftsRes.json();

      if (messagesData.success) {
        // Combine all messages (sent/approved + drafts)
        const allMessages: Message[] = [];

        // Add sent/approved messages
        messagesData.data.messages.forEach((msg: any) => {
          allMessages.push({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            subject: extractSubject(msg.content),
            timestamp: msg.timestamp,
            status: msg.status,
            threadId: '',
          });
        });

        // Add draft messages
        if (draftsData.success && draftsData.data.drafts) {
          draftsData.data.drafts.forEach((draft: any) => {
            allMessages.push({
              id: draft.id,
              role: 'agent',
              content: draft.content,
              subject: '',
              timestamp: draft.createdAt,
              status: 'draft',
              threadId: '',
            });
          });
        }

        // Build threads using chronological pairing (same as student page)
        const builtThreads = buildThreadsFromMessages(allMessages);
        setThreads(builtThreads);

        // Update selected thread if it exists
        if (selectedThread) {
          const updated = builtThreads.find(t => t.id === selectedThread.id);
          if (updated) {
            setSelectedThread(updated);
            // Update editing content if there's a draft
            const draftMsg = updated.messages.find(m => m.status === 'draft');
            if (draftMsg && !isEditing) {
              setEditingContent(extractBody(draftMsg.content));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  // Build threads by pairing student messages with agent responses chronologically
  function buildThreadsFromMessages(messages: Message[]): Thread[] {
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
        const normalizedNew = normalizeSubject(subject);
        const normalizedCurrent = normalizeSubject(currentSubject);
        const isNewThread = normalizedNew !== normalizedCurrent || currentThread.length === 0;

        if (isNewThread && currentThread.length > 0) {
          // Save previous thread
          threads.push(createThreadFromMessages(currentThread, currentSubject));
          currentThread = [];
        }

        currentSubject = subject;
        msg.subject = subject;
        currentThread.push(msg);
      } else {
        // Agent response - add to current thread
        if (currentThread.length > 0) {
          msg.subject = currentSubject;
          currentThread.push(msg);
        } else {
          // Orphan agent message - create its own thread
          currentThread = [msg];
          currentSubject = extractSubject(msg.content) || 'Response';
          msg.subject = currentSubject;
        }
      }
    }

    // Don't forget the last thread
    if (currentThread.length > 0) {
      threads.push(createThreadFromMessages(currentThread, currentSubject));
    }

    // Sort threads - drafts first, then by most recent (using proper UTC parsing)
    threads.sort((a, b) => {
      if (a.hasDraft && !b.hasDraft) return -1;
      if (!a.hasDraft && b.hasDraft) return 1;
      return parseTimestamp(b.lastMessageAt).getTime() - parseTimestamp(a.lastMessageAt).getTime();
    });

    return threads;
  }

  function createThreadFromMessages(messages: Message[], subject: string): Thread {
    const lastMsg = messages[messages.length - 1];
    const draftMsg = messages.find(m => m.status === 'draft');

    return {
      id: messages[0].id, // Use first message ID as thread ID
      subject: subject || 'No Subject',
      lastMessageAt: lastMsg.timestamp,
      messages: messages,
      hasDraft: !!draftMsg,
      draftId: draftMsg?.id,
    };
  }

  function extractSubject(content: string): string {
    if (content.startsWith('Subject:')) {
      const lines = content.split('\n');
      return lines[0].replace('Subject:', '').trim();
    }
    const firstLine = content.split('\n')[0];
    if (firstLine.length <= 60) return firstLine;
    return firstLine.slice(0, 57) + '...';
  }

  function normalizeSubject(subject: string): string {
    return subject.replace(/^(Re:\s*)+/i, '').trim().toLowerCase();
  }

  function extractBody(content: string): string {
    if (content.startsWith('Subject:')) {
      const parts = content.split('\n\n');
      return parts.slice(1).join('\n\n');
    }
    return content;
  }

  function handleSelectThread(thread: Thread) {
    setSelectedThread(thread);
    setIsEditing(false);

    // Set editing content to the draft if exists
    const draftMsg = thread.messages.find(m => m.status === 'draft');
    if (draftMsg) {
      setEditingContent(extractBody(draftMsg.content));
    } else {
      setEditingContent('');
    }
  }

  async function approveDraft(draftId: string, editedContent?: string) {
    setIsSending(true);

    try {
      const action = editedContent ? 'edit' : 'approve';

      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          draftId,
          content: editedContent,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsEditing(false);
        setSelectedThread(null);

        // Refresh data
        await Promise.all([fetchDrafts(), selectedStudent && fetchMessages(selectedStudent.id)]);
      } else {
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to approve draft:', error);
      alert('Failed to approve draft. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  async function transitionToPhase2(studentId: string) {
    if (!confirm('Are you sure you want to transition this student to Phase II? This action confirms they have completed all Phase I videos.')) return;

    setIsTransitioning(true);
    try {
      const res = await fetch('/api/students/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh the students list
        await fetchStudents();
        alert('Student successfully transitioned to Phase II!');
      } else {
        alert(`Failed to transition: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to transition student:', error);
      alert('Failed to transition student. Please try again.');
    } finally {
      setIsTransitioning(false);
    }
  }

  async function generateRoadmap() {
    if (!selectedStudent || !roadmapTopic.trim()) return;

    setIsGeneratingRoadmap(true);
    setRoadmapProgress({ step: 0, message: 'Starting...', phase: 'init' });
    setRoadmapThinking([]);

    try {
      // Use streaming endpoint
      const response = await fetch('/api/mentor/generate-roadmap-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          topic: roadmapTopic.trim(),
          durationWeeks: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completionData: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (currentEvent === 'status') {
                  setRoadmapProgress({
                    step: data.step,
                    message: data.message,
                    phase: data.phase,
                  });
                } else if (currentEvent === 'thinking') {
                  setRoadmapThinking(prev => [...prev.slice(-20), data.text]);
                } else if (currentEvent === 'complete') {
                  completionData = data;
                } else if (currentEvent === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      if (completionData?.success) {
        // Update the draft content with the roadmap message
        const roadmapContent = `\n\n---\n\nI've created a research roadmap for you:\n\n${completionData.downloadLink}`;

        if (selectedThread?.draftId) {
          // Update the draft in the database
          const newContent = `${editingContent}${roadmapContent}`;
          await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              draftId: selectedThread.draftId,
              content: newContent,
            }),
          });
          setEditingContent(newContent);
        }

        setShowRoadmapModal(false);
        setRoadmapTopic('');
        setRoadmapProgress(null);
        setRoadmapThinking([]);
        alert(`Roadmap created.\n\nDownload: ${completionData.downloadUrl}`);

        // Refresh data
        await fetchStudents();
        if (selectedStudent) {
          await fetchMessages(selectedStudent.id);
        }
      } else if (!completionData) {
        throw new Error('Stream ended without completion data');
      }
    } catch (error) {
      console.error('Failed to generate roadmap:', error);
      alert(`Failed to generate roadmap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  }

  async function generateColabNotebook() {
    if (!selectedStudent || !colabQuestion.trim()) return;

    setIsGeneratingColab(true);
    setColabProgress({ step: 0, message: 'Starting...', phase: 'init' });
    setColabThinking([]);

    try {
      // Use EventSource for streaming
      const response = await fetch('/api/mentor/generate-colab-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: colabQuestion.trim(),
          question: colabQuestion.trim(),
          studentName: selectedStudent.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completionData: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (currentEvent === 'status') {
                  setColabProgress({
                    step: data.step,
                    message: data.message,
                    phase: data.phase,
                  });
                } else if (currentEvent === 'thinking') {
                  setColabThinking(prev => [...prev.slice(-20), data.text]); // Keep last 20 tokens
                } else if (currentEvent === 'complete') {
                  completionData = data;
                } else if (currentEvent === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      if (completionData?.success) {
        // Update the draft content with the notebook link
        const colabContent = `\n\n---\n\nI've created a Google Colab code file for you:\n\n${completionData.downloadLink}`;

        if (selectedThread?.draftId) {
          // Update the draft in the database
          const newContent = `${editingContent}${colabContent}`;
          await fetch('/api/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              draftId: selectedThread.draftId,
              content: newContent,
            }),
          });
          setEditingContent(newContent);
        }

        setShowColabModal(false);
        setColabQuestion('');
        setColabProgress(null);
        setColabThinking([]);
        alert(`Colab notebook created.\n\nDownload: ${completionData.downloadUrl}`);
      } else if (!completionData) {
        throw new Error('Stream ended without completion data');
      }
    } catch (error) {
      console.error('Failed to generate notebook:', error);
      alert(`Failed to generate notebook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingColab(false);
    }
  }

  async function rejectDraft(draftId: string) {
    if (!confirm('Are you sure you want to discard this draft?')) return;

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          draftId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSelectedThread(null);
        await Promise.all([fetchDrafts(), selectedStudent && fetchMessages(selectedStudent.id)]);
      } else {
        alert(`Failed to reject: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to reject draft:', error);
    }
  }

  // Send a direct message from mentor to student
  async function sendDirectMessage() {
    if (!selectedStudent || !composeMessage.trim()) return;

    setIsSendingDirect(true);
    try {
      const res = await fetch('/api/mentor/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          content: composeMessage.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowComposeModal(false);
        setComposeMessage('');
        alert('Message sent successfully!');

        // Refresh messages
        await fetchMessages(selectedStudent.id);
      } else {
        alert(`Failed to send message: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingDirect(false);
    }
  }

  // Fetch student info
  async function fetchStudentInfo() {
    if (!selectedStudent) return;

    setIsLoadingStudentInfo(true);
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`);
      const data = await res.json();

      if (data.success) {
        setStudentInfo(data.data);
      } else {
        console.error('Failed to fetch student info:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch student info:', error);
    } finally {
      setIsLoadingStudentInfo(false);
    }
  }

  // Fetch AI context for selected student
  async function fetchContext() {
    if (!selectedStudent) return;

    setIsLoadingContext(true);
    try {
      const res = await fetch(`/api/agent/context?studentId=${selectedStudent.id}`);
      const data = await res.json();

      if (data.success) {
        setContextData(data.data);
      } else {
        console.error('Failed to fetch context:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  }

  // Accept roadmap for student
  async function acceptRoadmap() {
    if (!selectedStudent) return;

    setIsAcceptingRoadmap(true);
    try {
      const res = await fetch('/api/mentor/accept-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        // Refresh context to show updated status
        await fetchContext();
      } else {
        alert(`Failed to accept roadmap: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to accept roadmap:', error);
      alert('Failed to accept roadmap. Please try again.');
    } finally {
      setIsAcceptingRoadmap(false);
    }
  }

  // Parse timestamp as UTC
  function parseTimestamp(timestamp: string): Date {
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    return new Date(utcTimestamp);
  }

  function formatDate(timestamp: string) {
    const date = parseTimestamp(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

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

  function formatFullDate(timestamp: string) {
    const date = parseTimestamp(timestamp);
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

  // Filter threads by selected student
  const filteredThreads = selectedStudent
    ? threads
    : [];

  // Filter drafts by selected student
  const filteredDrafts = selectedStudent
    ? drafts.filter(d => d.studentId === selectedStudent.id)
    : [];

  // Count total drafts
  const totalDrafts = drafts.length;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Mentor Dashboard</h1>
            <p className="text-sm text-slate-500">Dr. Raj Dandekar</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {totalDrafts > 0 && (
            <button
              onClick={() => setActiveView('drafts')}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              {totalDrafts} draft{totalDrafts > 1 ? 's' : ''} pending review
            </button>
          )}
          {selectedStudent && (
            <>
              <button
                onClick={() => {
                  setShowStudentInfo(true);
                  fetchStudentInfo();
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Student Info
              </button>
              <button
                onClick={() => {
                  setShowContextPanel(true);
                  fetchContext();
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                AI Context
              </button>
            </>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-medium">
            RD
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Students Sidebar */}
        <aside className="w-64 bg-white/50 backdrop-blur-sm border-r border-slate-200/60 flex flex-col">
          <div className="p-4 border-b border-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Students</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {students.map(student => {
              const studentDrafts = drafts.filter(d => d.studentId === student.id);
              return (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSelectedThread(null);
                  }}
                  className={`w-full p-4 text-left border-b border-slate-100 transition-all duration-200 ${
                    selectedStudent?.id === student.id
                      ? 'bg-amber-50 border-l-4 border-l-amber-500'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium relative ${
                      student.currentPhase === 'phase1'
                        ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                        : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    }`}>
                      {student.name.charAt(0)}
                      {studentDrafts.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                          {studentDrafts.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{student.name}</p>
                      <p className="text-xs text-slate-500">
                        {student.currentPhase === 'phase1'
                          ? 'Phase I - Learning'
                          : `Phase II - M${student.currentMilestone}/5`
                        }
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread List */}
        <div className="w-96 bg-white/30 border-r border-slate-200/60 flex flex-col">
          {/* View Toggle */}
          <div className="flex border-b border-slate-200/60">
            <button
              onClick={() => {
                setActiveView('drafts');
                setSelectedThread(null);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeView === 'drafts'
                  ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {filteredDrafts.length > 0 && (
                <span className="w-5 h-5 text-xs bg-amber-500 text-white rounded-full flex items-center justify-center">
                  {filteredDrafts.length}
                </span>
              )}
              Pending Review
            </button>
            <button
              onClick={() => {
                setActiveView('conversations');
                setSelectedThread(null);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeView === 'conversations'
                  ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Conversations
            </button>
            {selectedStudent && (
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex items-center gap-1.5"
                title="Send a message directly to the student"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Compose
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeView === 'drafts' ? (
              // Drafts List
              filteredDrafts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No pending drafts</p>
                  <p className="text-xs mt-1">for {selectedStudent?.name}</p>
                </div>
              ) : (
                filteredDrafts.map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => {
                      // Find the thread for this draft
                      const thread = filteredThreads.find(t => t.draftId === draft.id);
                      if (thread) {
                        handleSelectThread(thread);
                      } else {
                        // Create a temporary thread view
                        const tempThread: Thread = {
                          id: draft.id,
                          subject: draft.subject,
                          lastMessageAt: draft.createdAt,
                          messages: [
                            {
                              id: 'original-' + draft.id,
                              role: 'student',
                              content: draft.originalMessage,
                              subject: draft.subject,
                              timestamp: draft.createdAt,
                              status: 'sent',
                              threadId: draft.id,
                            },
                            {
                              id: draft.id,
                              role: 'agent',
                              content: draft.aiResponse,
                              subject: draft.subject,
                              timestamp: draft.createdAt,
                              status: 'draft',
                              threadId: draft.id,
                            },
                          ],
                          hasDraft: true,
                          draftId: draft.id,
                        };
                        handleSelectThread(tempThread);
                      }
                    }}
                    className={`w-full p-4 text-left border-b border-slate-100 transition-all duration-200 ${
                      selectedThread?.draftId === draft.id ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                        Needs Review
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(draft.createdAt)}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm truncate">{draft.subject}</p>
                    <p className="text-xs text-slate-500 mt-1">From: {draft.studentName}</p>
                    <p className="text-xs text-slate-400 truncate mt-1">
                      {extractBody(draft.originalMessage).slice(0, 60)}...
                    </p>
                  </button>
                ))
              )
            ) : (
              // All Conversations
              filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>No conversations with {selectedStudent?.name}</p>
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`w-full p-4 text-left border-b border-slate-100 transition-all duration-200 ${
                      selectedThread?.id === thread.id ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${
                        selectedStudent?.currentPhase === 'phase1'
                          ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                          : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                      }`}>
                        {selectedStudent?.name.charAt(0) || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {thread.subject}
                          </span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(thread.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {thread.hasDraft && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                              Draft
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Main Content - Thread View */}
        <main className="flex-1 bg-white/50 flex flex-col min-h-0">
          {selectedThread ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Thread Header */}
              <div className="p-6 border-b border-slate-200/60 bg-white/80">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selectedThread.hasDraft && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          Draft Pending Approval
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl font-semibold text-slate-800">
                      {selectedThread.subject}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Conversation with {selectedStudent?.name} • {selectedThread.messages.length} message{selectedThread.messages.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages in Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {selectedThread.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`rounded-xl border shadow-sm overflow-hidden ${
                      message.status === 'draft'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Message Header */}
                    <div className={`p-4 border-b ${
                      message.status === 'draft' ? 'border-amber-200 bg-amber-100/50' : 'border-slate-100 bg-slate-50/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          message.role === 'agent'
                            ? 'bg-gradient-to-br from-slate-600 to-slate-800'
                            : selectedStudent?.currentPhase === 'phase1'
                              ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                              : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                        }`}>
                          {message.role === 'agent' ? 'RD' : selectedStudent?.name.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">
                              {message.role === 'agent' ? 'Dr. Raj Dandekar (You)' : selectedStudent?.name || 'Student'}
                            </p>
                            {message.status === 'draft' && (
                              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-medium">
                                AI Draft
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatFullDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="p-4">
                      {message.status === 'draft' && isEditing ? (
                        <textarea
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          className="w-full p-4 bg-white border border-amber-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-800 leading-relaxed min-h-[200px]"
                          placeholder="Edit the response..."
                        />
                      ) : (
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
                            {message.status === 'draft' ? editingContent || extractBody(message.content) : extractBody(message.content)}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions Toolbar - All buttons for all students */}
                    {message.status === 'draft' && (
                      <div className="px-4 py-3 border-t border-amber-100 bg-amber-50/50 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-500 mr-2">Quick Actions:</span>

                        {/* Mark Phase I Complete */}
                        <button
                          onClick={() => selectedStudent && transitionToPhase2(selectedStudent.id)}
                          disabled={isTransitioning || selectedStudent?.currentPhase === 'phase2'}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                            selectedStudent?.currentPhase === 'phase2'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isTransitioning ? 'Transitioning...' : selectedStudent?.currentPhase === 'phase2' ? 'Already Phase II' : 'Mark Phase I Complete'}
                        </button>

                        {/* Accept Roadmap */}
                        <button
                          onClick={acceptRoadmap}
                          disabled={isAcceptingRoadmap || selectedStudent?.currentPhase !== 'phase2'}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                            selectedStudent?.currentPhase !== 'phase2'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isAcceptingRoadmap ? 'Accepting...' : 'Student Accepted Roadmap'}
                        </button>

                        {/* Generate Roadmap */}
                        <button
                          onClick={() => setShowRoadmapModal(true)}
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate Roadmap
                        </button>

                        {/* Generate Colab Notebook */}
                        <button
                          onClick={() => setShowColabModal(true)}
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          Generate Colab Notebook
                        </button>
                      </div>
                    )}

                    {/* Draft Actions */}
                    {message.status === 'draft' && (
                      <div className="p-4 border-t border-amber-200 bg-amber-50 flex items-center justify-between">
                        <button
                          onClick={() => rejectDraft(message.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                        >
                          Discard
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              isEditing
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isEditing ? 'Preview' : 'Edit'}
                          </button>
                          <button
                            onClick={() => {
                              const originalContent = extractBody(message.content);
                              const hasEdits = editingContent !== originalContent;
                              approveDraft(message.id, hasEdits ? editingContent : undefined);
                            }}
                            disabled={isSending}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm"
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
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve & Send
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">
                  {activeView === 'drafts' ? 'Review AI Responses' : 'View Conversations'}
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  {activeView === 'drafts'
                    ? 'Select a pending draft to review, edit, and approve before sending to the student'
                    : 'Select a conversation thread to view the full history'
                  }
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Roadmap Generation Modal */}
      {showRoadmapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-800">Generate Research Roadmap</h3>
                  {/* Powered by Gemini Badge */}
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    Powered by Gemini
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (!isGeneratingRoadmap) {
                      setShowRoadmapModal(false);
                      setRoadmapTopic('');
                      setRoadmapProgress(null);
                      setRoadmapThinking([]);
                    }
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isGeneratingRoadmap}
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Create a detailed research roadmap PDF for {selectedStudent?.name}
              </p>
            </div>

            {/* Input Section - Hidden when generating */}
            {!isGeneratingRoadmap && (
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Research Topic
                </label>
                <input
                  type="text"
                  value={roadmapTopic}
                  onChange={(e) => setRoadmapTopic(e.target.value)}
                  placeholder="e.g., Multimodal LLMs for Healthcare"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-2">
                  This will generate a comprehensive 10-week research roadmap with milestones, deliverables, and guidance.
                </p>
              </div>
            )}

            {/* Progress Section - Shown when generating */}
            {isGeneratingRoadmap && roadmapProgress && (
              <div className="p-6 space-y-4">
                {/* Progress Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Step {roadmapProgress.step}/4: {roadmapProgress.message}
                    </span>
                    <span className="text-slate-400">{Math.round((roadmapProgress.step / 4) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                      style={{ width: `${(roadmapProgress.step / 4) * 100}%` }}
                    />
                  </div>

                  {/* Step Indicators */}
                  <div className="flex justify-between text-xs text-slate-500">
                    {['Generate', 'Parse', 'PDF', 'Save'].map((step, i) => (
                      <div
                        key={step}
                        className={`flex flex-col items-center ${
                          roadmapProgress.step > i
                            ? 'text-green-600'
                            : roadmapProgress.step === i + 1
                            ? 'text-purple-600 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                            roadmapProgress.step > i
                              ? 'bg-green-100'
                              : roadmapProgress.step === i + 1
                              ? 'bg-purple-100 animate-pulse'
                              : 'bg-slate-100'
                          }`}
                        >
                          {roadmapProgress.step > i ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thinking Tokens Display */}
                {roadmapThinking.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-slate-600">AI Thinking...</span>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 h-32 overflow-y-auto font-mono text-xs text-green-400 leading-relaxed">
                      {roadmapThinking.map((thought, i) => (
                        <span key={i} className="inline">
                          {thought}{' '}
                        </span>
                      ))}
                      <span className="animate-pulse">▊</span>
                    </div>
                  </div>
                )}

                {/* Gemini Branding Footer */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-xs text-slate-400">Generated with Gemini 2.5 Pro</span>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              {!isGeneratingRoadmap && (
                <>
                  <button
                    onClick={() => {
                      setShowRoadmapModal(false);
                      setRoadmapTopic('');
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateRoadmap}
                    disabled={!roadmapTopic.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate with Gemini
                  </button>
                </>
              )}
              {isGeneratingRoadmap && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating roadmap... Please wait</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Colab Notebook Generation Modal */}
      {showColabModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-800">Generate Colab Notebook</h3>
                  {/* Powered by Gemini Badge */}
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    Powered by Gemini
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (!isGeneratingColab) {
                      setShowColabModal(false);
                      setColabQuestion('');
                      setColabProgress(null);
                      setColabThinking([]);
                    }
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isGeneratingColab}
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Create a practical code notebook for {selectedStudent?.name}
              </p>
            </div>

            {/* Input Section - Hidden when generating */}
            {!isGeneratingColab && (
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technical Question / Topic
                </label>
                <textarea
                  value={colabQuestion}
                  onChange={(e) => setColabQuestion(e.target.value)}
                  placeholder="e.g., How does RAG work? or Explain attention mechanism in transformers"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-400 mt-2">
                  This will generate a detailed Colab notebook with working code examples and explanations.
                </p>
              </div>
            )}

            {/* Progress Section - Shown when generating */}
            {isGeneratingColab && colabProgress && (
              <div className="p-6 space-y-4">
                {/* Progress Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Step {colabProgress.step}/5: {colabProgress.message}
                    </span>
                    <span className="text-slate-400">{Math.round((colabProgress.step / 5) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                      style={{ width: `${(colabProgress.step / 5) * 100}%` }}
                    />
                  </div>

                  {/* Step Indicators */}
                  <div className="flex justify-between text-xs text-slate-500">
                    {['Analyze', 'Design', 'Generate', 'Validate', 'Build'].map((step, i) => (
                      <div
                        key={step}
                        className={`flex flex-col items-center ${
                          colabProgress.step > i
                            ? 'text-green-600'
                            : colabProgress.step === i + 1
                            ? 'text-purple-600 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                            colabProgress.step > i
                              ? 'bg-green-100'
                              : colabProgress.step === i + 1
                              ? 'bg-purple-100 animate-pulse'
                              : 'bg-slate-100'
                          }`}
                        >
                          {colabProgress.step > i ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thinking Tokens Display */}
                {colabThinking.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-slate-600">AI Thinking...</span>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 h-32 overflow-y-auto font-mono text-xs text-green-400 leading-relaxed">
                      {colabThinking.map((thought, i) => (
                        <span key={i} className="inline">
                          {thought}{' '}
                        </span>
                      ))}
                      <span className="animate-pulse">▊</span>
                    </div>
                  </div>
                )}

                {/* Gemini Branding Footer */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-xs text-slate-400">Generated with Gemini 2.5 Pro</span>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              {!isGeneratingColab && (
                <>
                  <button
                    onClick={() => {
                      setShowColabModal(false);
                      setColabQuestion('');
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateColabNotebook}
                    disabled={!colabQuestion.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate with Gemini
                  </button>
                </>
              )}
              {isGeneratingColab && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating notebook... Please wait</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Info Modal */}
      {showStudentInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                  selectedStudent?.currentPhase === 'phase1'
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                }`}>
                  {selectedStudent?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{selectedStudent?.name}</h3>
                  <p className="text-sm text-slate-500">{selectedStudent?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowStudentInfo(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isLoadingStudentInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : studentInfo ? (
                <>
                  {/* Current Phase */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Current Phase</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        studentInfo.currentPhase === 'phase1'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {studentInfo.currentPhase === 'phase1' ? 'Phase I - Learning' : 'Phase II - Research'}
                      </span>
                    </div>
                    {studentInfo.currentPhase === 'phase2' && studentInfo.currentMilestone > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Currently on Milestone {studentInfo.currentMilestone} of 5
                      </p>
                    )}
                  </div>

                  {/* Enrollment & Timeline */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Enrolled</span>
                      <span className="text-sm font-medium text-slate-800">
                        {studentInfo.enrollmentDate
                          ? new Date(studentInfo.enrollmentDate + 'Z').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Days in Current Phase</span>
                      <span className="text-sm font-medium text-slate-800">
                        {studentInfo.daysInPhase || 0} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Time Remaining</span>
                      <span className={`text-sm font-medium ${
                        studentInfo.isOverdue ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {studentInfo.isOverdue
                          ? `${studentInfo.daysRemaining} days overdue`
                          : `${studentInfo.daysRemaining} days`
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Mentorship Duration</span>
                      <span className="text-sm font-medium text-slate-800">4 months</span>
                    </div>
                  </div>

                  {/* Research Topic (Phase II) */}
                  {studentInfo.currentPhase === 'phase2' && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <span className="text-sm font-medium text-slate-600 block mb-2">Research Topic</span>
                      <p className="text-slate-800 font-medium">
                        {studentInfo.researchTopic || 'Not yet selected'}
                      </p>
                    </div>
                  )}

                  {/* Roadmap Download (Phase II) */}
                  {studentInfo.currentPhase === 'phase2' && studentInfo.roadmap && (
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-emerald-700">Research Roadmap</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          studentInfo.roadmap.accepted
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}>
                          {studentInfo.roadmap.accepted ? 'Accepted' : 'Pending Acceptance'}
                        </span>
                      </div>
                      <p className="text-sm text-emerald-700 mb-3">
                        {studentInfo.roadmap.topic}
                      </p>
                      {studentInfo.roadmap.pdfUrl && (
                        <a
                          href={studentInfo.roadmap.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Roadmap PDF
                        </a>
                      )}
                    </div>
                  )}

                  {/* No Roadmap Yet */}
                  {studentInfo.currentPhase === 'phase2' && !studentInfo.roadmap && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-amber-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium">No roadmap generated yet</span>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        Use the &quot;Generate Roadmap&quot; button in Quick Actions to create one.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No student data available</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowStudentInfo(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Context Panel Modal */}
      {showContextPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">AI Context for {selectedStudent?.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  View what information is being sent to the AI when generating responses
                </p>
              </div>
              <button
                onClick={() => setShowContextPanel(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingContext ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : contextData ? (
                <>
                  {/* Context Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Phase Card */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${contextData.phase === 'phase1' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-medium text-slate-700">Current Phase</span>
                      </div>
                      <p className="text-lg font-semibold text-slate-800">
                        {contextData.phase === 'phase1' ? 'Phase I - Learning' : 'Phase II - Research'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Day {contextData.profile?.daysInPhase} • {contextData.profile?.daysRemaining} days remaining
                      </p>
                    </div>

                    {/* Roadmap Status Card */}
                    <div className={`rounded-xl p-4 ${contextData.contextSummary?.roadmapAccepted ? 'bg-emerald-50' : contextData.contextSummary?.hasRoadmap ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${contextData.contextSummary?.roadmapAccepted ? 'bg-emerald-500' : contextData.contextSummary?.hasRoadmap ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <span className="text-sm font-medium text-slate-700">Roadmap Status</span>
                      </div>
                      <p className={`text-lg font-semibold ${contextData.contextSummary?.roadmapAccepted ? 'text-emerald-700' : contextData.contextSummary?.hasRoadmap ? 'text-amber-700' : 'text-slate-500'}`}>
                        {contextData.contextSummary?.roadmapAccepted
                          ? '✓ Accepted & In Context'
                          : contextData.contextSummary?.hasRoadmap
                          ? '⚠️ Not Yet Accepted'
                          : 'No Roadmap'}
                      </p>
                      {contextData.contextSummary?.hasRoadmap && (
                        <p className="text-xs text-slate-500 mt-1">
                          Topic: {contextData.contextSummary?.roadmapTopic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Roadmap Warning/Info */}
                  {contextData.contextSummary?.hasRoadmap && !contextData.contextSummary?.roadmapAccepted && (
                    <div className="bg-amber-100 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="font-medium text-amber-800">Roadmap Not in AI Context</p>
                          <p className="text-sm text-amber-700 mt-1">
                            The student has a roadmap, but it has NOT been marked as accepted.
                            The AI will NOT use the roadmap when generating responses until you click
                            &quot;Student Accepted Roadmap&quot; in the Quick Actions.
                          </p>
                          <button
                            onClick={acceptRoadmap}
                            disabled={isAcceptingRoadmap}
                            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                          >
                            {isAcceptingRoadmap ? 'Accepting...' : 'Accept Roadmap Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Roadmap Details */}
                  {contextData.roadmap && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="font-medium text-slate-800">Research Roadmap</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${contextData.roadmap.accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {contextData.roadmap.accepted ? 'In Context' : 'Not in Context'}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-500">Topic</span>
                          <p className="text-slate-800">{contextData.roadmap.topic}</p>
                        </div>
                        {contextData.roadmap.milestones?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-slate-500">Milestones ({contextData.roadmap.milestones.length})</span>
                            <div className="mt-2 space-y-2">
                              {contextData.roadmap.milestones.map((m: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                                    {m.number || i + 1}
                                  </span>
                                  <div>
                                    <span className="font-medium text-slate-700">{m.title}</span>
                                    <span className="text-slate-400 mx-1">•</span>
                                    <span className="text-slate-500">{m.weeks}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Memory Context */}
                  {contextData.memory?.hasProfile && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h4 className="font-medium text-slate-800">Memory Context</h4>
                      </div>
                      <div className="p-4">
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3">
                          {contextData.memory.preview}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tools Available */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h4 className="font-medium text-slate-800">Available Tools</h4>
                    </div>
                    <div className="p-4 flex flex-wrap gap-2">
                      {contextData.contextSummary?.toolsAvailable?.map((tool: string) => (
                        <span key={tool} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-mono">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt Preview */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-medium text-slate-800">System Prompt Preview</h4>
                      <span className="text-xs text-slate-500">{contextData.debugInfo?.systemPromptLength} characters</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-900 text-green-400 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {contextData.debugInfo?.systemPromptPreview}
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>No context data available</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={fetchContext}
                disabled={isLoadingContext}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${isLoadingContext ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowContextPanel(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Send Message to {selectedStudent?.name}</h3>
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setComposeMessage('');
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Send a direct message as Dr. Raj to {selectedStudent?.name}
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 mr-2">Quick Actions:</span>

              {/* Mark Phase I Complete */}
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setComposeMessage('');
                  if (selectedStudent) transitionToPhase2(selectedStudent.id);
                }}
                disabled={isTransitioning || selectedStudent?.currentPhase === 'phase2'}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  selectedStudent?.currentPhase === 'phase2'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {selectedStudent?.currentPhase === 'phase2' ? 'Already Phase II' : 'Mark Phase I Complete'}
              </button>

              {/* Accept Roadmap */}
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setComposeMessage('');
                  acceptRoadmap();
                }}
                disabled={isAcceptingRoadmap || selectedStudent?.currentPhase !== 'phase2'}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  selectedStudent?.currentPhase !== 'phase2'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isAcceptingRoadmap ? 'Accepting...' : 'Student Accepted Roadmap'}
              </button>

              {/* Generate Roadmap */}
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setComposeMessage('');
                  setShowRoadmapModal(true);
                }}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Roadmap
              </button>

              {/* Generate Colab Notebook */}
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setComposeMessage('');
                  setShowColabModal(true);
                }}
                className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Generate Colab Notebook
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Message
              </label>
              <textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-800 placeholder-slate-400 resize-none"
                rows={6}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2">
                This message will be sent directly to the student without AI generation.
              </p>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowComposeModal(false);
                  setComposeMessage('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={sendDirectMessage}
                disabled={isSendingDirect || !composeMessage.trim()}
                className="px-5 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSendingDirect ? (
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
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

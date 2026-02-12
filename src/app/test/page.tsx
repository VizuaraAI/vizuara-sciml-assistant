'use client';

import { useState, useEffect, useRef } from 'react';
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
  enrollmentDate?: string;
  phase1Start?: string;
  phase2Start?: string;
  daysInPhase?: number;
  daysRemaining?: number;
  isOverdue?: boolean;
}

interface Message {
  id: string;
  role: 'student' | 'agent' | 'system';
  content: string;
  status: 'sent' | 'pending_approval' | 'approved';
  toolCalls?: any[];
  timestamp: string;
  pdfUrl?: string; // For roadmap PDF downloads
  voiceNote?: { url: string; title: string }; // For voice note messages
}

interface DebugInfo {
  systemPrompt?: string;
  toolsAvailable?: string[];
  phase?: string;
  studentContext?: string;
  lastToolCalls?: any[];
  tokensUsed?: { input: number; output: number };
}

// PDF Download Icon Component
function PDFDownloadButton({ url, filename }: { url: string; filename?: string }) {
  return (
    <a
      href={url}
      download={filename || 'Research_Roadmap.pdf'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3 3 3-3" />
      </svg>
      <span className="font-medium">Download Research Roadmap PDF</span>
    </a>
  );
}

// Voice Note Audio Player Component
function VoiceNotePlayer({ url, title }: { url: string; title?: string }) {
  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-purple-800">Voice Message from Dr. Raj</p>
          <p className="text-xs text-purple-600">{title || 'Motivational Message'}</p>
        </div>
      </div>
      <audio controls className="w-full" preload="metadata">
        <source src={url} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

// Extract PDF URL from tool calls if present
function extractPdfUrl(toolCalls?: any[]): string | null {
  if (!toolCalls) return null;

  for (const call of toolCalls) {
    if (call.name === 'generate_roadmap' && call.result) {
      try {
        const result = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
        if (result.success && result.data?.pdfUrl) {
          return result.data.pdfUrl;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return null;
}

// Extract Voice Note URL from tool calls if present
function extractVoiceNoteUrl(toolCalls?: any[]): { url: string; title: string } | null {
  if (!toolCalls) return null;

  for (const call of toolCalls) {
    if (call.name === 'send_voice_note' && call.result) {
      try {
        const result = typeof call.result === 'string' ? JSON.parse(call.result) : call.result;
        if (result.success && result.data?.voiceNoteUrl) {
          return {
            url: result.data.voiceNoteUrl,
            title: result.data.displayName || 'Voice Message',
          };
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return null;
}

export default function TestChatPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [showDebug, setShowDebug] = useState(true);
  const [viewMode, setViewMode] = useState<'student' | 'mentor'>('mentor');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadContext(selectedStudent.id);
    }
  }, [selectedStudent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingDrafts]);

  async function fetchStudents() {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students);
        if (data.data.students.length > 0) {
          setSelectedStudent(data.data.students[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  }

  async function loadContext(studentId: string) {
    try {
      const res = await fetch(`/api/agent/context?studentId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        setDebugInfo({
          systemPrompt: data.data.debugInfo?.systemPrompt,
          toolsAvailable: data.data.debugInfo?.toolsAvailable,
          phase: data.data.phase,
          studentContext: data.data.formattedContext,
        });

        // Update selected student with timeline info
        if (data.data.profile) {
          setSelectedStudent(prev => prev ? {
            ...prev,
            daysInPhase: data.data.profile.daysInPhase,
            daysRemaining: data.data.profile.daysRemaining,
            isOverdue: data.data.profile.isOverdue,
            enrollmentDate: data.data.profile.enrollmentDate,
            phase1Start: data.data.profile.phase1Start,
            phase2Start: data.data.profile.phase2Start,
          } : null);
        }

        setMessages([]);
        setPendingDrafts([]);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  }

  async function transitionToPhase2() {
    if (!selectedStudent) return;

    if (!confirm(`Mark ${selectedStudent.name} as having completed Phase I? This will transition them to Phase II (Research Projects).`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'phase2' }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh student list and context
        await fetchStudents();
        // Update selected student
        setSelectedStudent(prev => prev ? { ...prev, currentPhase: 'phase2' } : null);
        loadContext(selectedStudent.id);
        alert(`${selectedStudent.name} has been transitioned to Phase II!`);
      } else {
        alert(`Failed to transition: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to transition student:', error);
      alert('Failed to transition student. Check console for details.');
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !selectedStudent || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'student',
      content: inputMessage,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          message: inputMessage,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Check if a PDF was generated
        const pdfUrl = extractPdfUrl(data.draft.toolCalls);
        // Check if a voice note was sent
        const voiceNote = extractVoiceNoteUrl(data.draft.toolCalls);

        const agentMessage: Message = {
          id: data.draft.id,
          role: 'agent',
          content: data.draft.content,
          status: 'pending_approval',
          toolCalls: data.draft.toolCalls,
          timestamp: data.draft.createdAt,
          pdfUrl: pdfUrl || undefined,
          voiceNote: voiceNote || undefined,
        };

        // Add to pending drafts (mentor view)
        setPendingDrafts((prev) => [...prev, agentMessage]);

        setDebugInfo((prev) => ({
          ...prev,
          lastToolCalls: data.draft.toolCalls,
          tokensUsed: data.tokensUsed,
        }));
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${data.error}`,
          status: 'sent',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        status: 'sent',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function approveDraft(draftId: string) {
    const draft = pendingDrafts.find((d) => d.id === draftId);
    if (draft) {
      // Move from pending to approved messages
      setMessages((prev) => [...prev, { ...draft, status: 'approved' }]);
      setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
    }
  }

  function rejectDraft(draftId: string) {
    setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }

  // Filter messages based on view mode
  const visibleMessages = viewMode === 'student'
    ? messages.filter((m) => m.role === 'student' || m.status === 'approved')
    : messages;

  return (
    <div className="h-screen flex bg-slate-50">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${showDebug ? 'w-2/3' : 'w-full'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-800">
              {viewMode === 'mentor' ? 'Mentor Dashboard' : 'Student Chat'}
            </h1>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setSelectedStudent(student || null);
              }}
              className="border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('student')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'student' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                Student View
              </button>
              <button
                onClick={() => setViewMode('mentor')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'mentor' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
                }`}
              >
                Mentor View
              </button>
            </div>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
          </div>
        </header>

        {/* Pending Drafts Banner (Mentor View Only) */}
        {viewMode === 'mentor' && pendingDrafts.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="font-medium">{pendingDrafts.length} draft(s) pending approval</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  message.role === 'student'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'agent'
                    ? 'bg-white border border-slate-200 shadow-sm text-slate-800'
                    : 'bg-slate-100 text-slate-500 text-sm px-4 py-2'
                }`}
              >
                <div className="prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 prose-li:my-1">
                  {message.role === 'agent' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap m-0">{message.content}</p>
                  )}
                </div>
                {/* PDF Download Button */}
                {message.role === 'agent' && message.pdfUrl && (
                  <PDFDownloadButton url={message.pdfUrl} />
                )}
                {/* Voice Note Player */}
                {message.role === 'agent' && message.voiceNote && (
                  <VoiceNotePlayer url={message.voiceNote.url} title={message.voiceNote.title} />
                )}
              </div>
            </div>
          ))}

          {/* Pending Drafts (Mentor View) */}
          {viewMode === 'mentor' && pendingDrafts.map((draft) => (
            <div key={draft.id} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-amber-50 border-2 border-amber-300 shadow-sm">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-amber-200">
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-200 text-amber-800 font-semibold">
                    DRAFT - Awaiting Your Approval
                  </span>
                  <button
                    onClick={() => approveDraft(draft.id)}
                    className="text-xs px-4 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-medium transition-colors"
                  >
                    ✓ Approve & Send
                  </button>
                  <button
                    onClick={() => rejectDraft(draft.id)}
                    className="text-xs px-4 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
                <div className="prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 prose-li:my-1 text-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {draft.content}
                  </ReactMarkdown>
                </div>
                {/* PDF Download Button for Draft */}
                {draft.pdfUrl && (
                  <PDFDownloadButton url={draft.pdfUrl} />
                )}
                {/* Voice Note Player for Draft */}
                {draft.voiceNote && (
                  <VoiceNotePlayer url={draft.voiceNote.url} title={draft.voiceNote.title} />
                )}
                {draft.toolCalls && draft.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-700">
                    Tools used: {draft.toolCalls.map((tc) => tc.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Student View: Waiting for response */}
          {viewMode === 'student' && isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-5 py-3 text-slate-500 text-sm">
                Message sent. Awaiting mentor review...
              </div>
            </div>
          )}

          {/* Mentor View: Processing */}
          {viewMode === 'mentor' && isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  <span className="ml-2 text-sm text-slate-400">Generating response...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-4">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={viewMode === 'student' ? "Send a message to Dr. Raj..." : "Send message as student..."}
              className="flex-1 border border-slate-300 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="w-1/3 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Debug Panel</h2>
          </div>

          <div className="p-4 space-y-4">
            {selectedStudent && (
              <DebugSection title="Student Info">
                <div className="text-sm space-y-2 text-slate-600">
                  <div><span className="font-medium">Name:</span> {selectedStudent.name}</div>
                  <div><span className="font-medium">Phase:</span> {selectedStudent.currentPhase === 'phase1' ? 'Phase I (Videos)' : 'Phase II (Research)'}</div>
                  {selectedStudent.currentPhase === 'phase1' ? (
                    <>
                      <div><span className="font-medium">Progress:</span> Topic {selectedStudent.currentTopicIndex} / 8</div>
                      {/* Timeline Info */}
                      {selectedStudent.daysInPhase !== undefined && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg space-y-1">
                          <div className="text-xs font-medium text-slate-500">Timeline</div>
                          <div>Days in Phase I: <span className="font-semibold">{selectedStudent.daysInPhase}</span></div>
                          <div>
                            {selectedStudent.isOverdue ? (
                              <span className="text-red-600 font-semibold">OVERDUE by {selectedStudent.daysRemaining} days</span>
                            ) : (
                              <>Days remaining: <span className="font-semibold text-emerald-600">{selectedStudent.daysRemaining}</span></>
                            )}
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${selectedStudent.isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (selectedStudent.daysInPhase || 0) / 45 * 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-400">Target: 45 days (1.5 months)</div>
                        </div>
                      )}
                      <button
                        onClick={transitionToPhase2}
                        className="mt-3 w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Mark Phase I Complete
                      </button>
                    </>
                  ) : (
                    <>
                      <div><span className="font-medium">Milestone:</span> {selectedStudent.currentMilestone} / 5</div>
                      <div><span className="font-medium">Topic:</span> {selectedStudent.researchTopic || 'Not selected'}</div>
                      {/* Timeline Info for Phase II */}
                      {selectedStudent.daysInPhase !== undefined && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg space-y-1">
                          <div className="text-xs font-medium text-slate-500">Timeline</div>
                          <div>Days in Phase II: <span className="font-semibold">{selectedStudent.daysInPhase}</span></div>
                          <div>
                            {selectedStudent.isOverdue ? (
                              <span className="text-red-600 font-semibold">OVERDUE by {selectedStudent.daysRemaining} days</span>
                            ) : (
                              <>Days remaining: <span className="font-semibold text-emerald-600">{selectedStudent.daysRemaining}</span></>
                            )}
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${selectedStudent.isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, (selectedStudent.daysInPhase || 0) / 75 * 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-400">Target: 75 days (2.5 months)</div>
                        </div>
                      )}
                      <div className="mt-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md text-center">
                        Phase I Completed
                      </div>
                    </>
                  )}
                </div>
              </DebugSection>
            )}

            {debugInfo.toolsAvailable && (
              <DebugSection title="Available Tools">
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {debugInfo.toolsAvailable.map((tool) => (
                    <div key={tool} className="font-mono bg-slate-50 px-2 py-1 rounded text-slate-600">
                      {tool}
                    </div>
                  ))}
                </div>
              </DebugSection>
            )}

            {debugInfo.lastToolCalls && debugInfo.lastToolCalls.length > 0 && (
              <DebugSection title="Last Tool Calls">
                <div className="text-xs space-y-2 max-h-48 overflow-y-auto">
                  {debugInfo.lastToolCalls.map((tc, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded">
                      <div className="font-mono font-semibold text-slate-700">{tc.name}</div>
                      <pre className="mt-1 text-slate-500 whitespace-pre-wrap">
                        {JSON.stringify(tc.input, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </DebugSection>
            )}

            {debugInfo.tokensUsed && (
              <DebugSection title="Token Usage">
                <div className="text-sm text-slate-600">
                  <div>Input: {debugInfo.tokensUsed.input.toLocaleString()}</div>
                  <div>Output: {debugInfo.tokensUsed.output.toLocaleString()}</div>
                  <div className="font-semibold mt-1 text-slate-800">
                    Total: {(debugInfo.tokensUsed.input + debugInfo.tokensUsed.output).toLocaleString()}
                  </div>
                </div>
              </DebugSection>
            )}

            {debugInfo.systemPrompt && (
              <DebugSection title="System Prompt" defaultOpen={false}>
                <pre className="text-xs whitespace-pre-wrap bg-slate-50 p-2 rounded max-h-60 overflow-y-auto text-slate-600">
                  {debugInfo.systemPrompt}
                </pre>
              </DebugSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DebugSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50 text-left text-sm font-medium flex justify-between items-center text-slate-700 hover:bg-slate-100 transition-colors"
      >
        {title}
        <span className="text-slate-400">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="p-4 border-t border-slate-200">{children}</div>}
    </div>
  );
}

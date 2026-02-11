'use client';

import { useState, useEffect, useRef } from 'react';

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
  role: 'student' | 'agent' | 'system';
  content: string;
  isDraft?: boolean;
  toolCalls?: any[];
  timestamp: string;
}

interface DebugInfo {
  systemPrompt?: string;
  toolsAvailable?: string[];
  phase?: string;
  studentContext?: string;
  lastToolCalls?: any[];
  tokensUsed?: { input: number; output: number };
}

export default function TestChatPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [showDebug, setShowDebug] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Load messages when student changes
  useEffect(() => {
    if (selectedStudent) {
      loadContext(selectedStudent.id);
    }
  }, [selectedStudent]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

        // Set initial messages from conversation (if any)
        // For now, start fresh each load
        setMessages([
          {
            id: 'system-1',
            role: 'system',
            content: `Connected as ${data.data.profile.name} (${data.data.phase === 'phase1' ? 'Phase I' : 'Phase II'})`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !selectedStudent || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'student',
      content: inputMessage,
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
        const agentMessage: Message = {
          id: data.draft.id,
          role: 'agent',
          content: data.draft.content,
          isDraft: true,
          toolCalls: data.draft.toolCalls,
          timestamp: data.draft.createdAt,
        };

        setMessages((prev) => [...prev, agentMessage]);

        // Update debug info
        setDebugInfo((prev) => ({
          ...prev,
          lastToolCalls: data.draft.toolCalls,
          tokensUsed: data.tokensUsed,
        }));
      } else {
        // Show error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${data.error}`,
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
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function approveDraft(draftId: string) {
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          draftId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === draftId ? { ...m, isDraft: false } : m))
        );
      }
    } catch (error) {
      console.error('Failed to approve draft:', error);
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${showDebug ? 'w-2/3' : 'w-full'}`}>
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">Test Chat</h1>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setSelectedStudent(student || null);
              }}
              className="border rounded px-3 py-1.5 text-sm bg-white"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'student'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'agent'
                    ? 'bg-white border shadow-sm'
                    : 'bg-gray-100 text-gray-600 text-sm'
                }`}
              >
                {message.isDraft && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">
                      DRAFT
                    </span>
                    <button
                      onClick={() => approveDraft(message.id)}
                      className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      Approve
                    </button>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                    Tools used: {message.toolCalls.map((tc) => tc.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="w-1/3 bg-white border-l overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Debug Panel</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Student Info */}
            {selectedStudent && (
              <DebugSection title="Student Info">
                <div className="text-sm space-y-1">
                  <div><strong>Name:</strong> {selectedStudent.name}</div>
                  <div><strong>Phase:</strong> {selectedStudent.currentPhase}</div>
                  {selectedStudent.currentPhase === 'phase1' ? (
                    <div><strong>Topic:</strong> {selectedStudent.currentTopicIndex} / 8</div>
                  ) : (
                    <>
                      <div><strong>Milestone:</strong> {selectedStudent.currentMilestone} / 4</div>
                      <div><strong>Topic:</strong> {selectedStudent.researchTopic || 'Not selected'}</div>
                    </>
                  )}
                </div>
              </DebugSection>
            )}

            {/* Tools Available */}
            {debugInfo.toolsAvailable && (
              <DebugSection title="Tools Available">
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {debugInfo.toolsAvailable.map((tool) => (
                    <div key={tool} className="font-mono bg-gray-50 px-2 py-1 rounded">
                      {tool}
                    </div>
                  ))}
                </div>
              </DebugSection>
            )}

            {/* Last Tool Calls */}
            {debugInfo.lastToolCalls && debugInfo.lastToolCalls.length > 0 && (
              <DebugSection title="Last Tool Calls">
                <div className="text-xs space-y-2 max-h-60 overflow-y-auto">
                  {debugInfo.lastToolCalls.map((tc, i) => (
                    <div key={i} className="bg-gray-50 p-2 rounded">
                      <div className="font-mono font-semibold">{tc.name}</div>
                      <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(tc.input, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </DebugSection>
            )}

            {/* Token Usage */}
            {debugInfo.tokensUsed && (
              <DebugSection title="Token Usage">
                <div className="text-sm">
                  <div>Input: {debugInfo.tokensUsed.input.toLocaleString()}</div>
                  <div>Output: {debugInfo.tokensUsed.output.toLocaleString()}</div>
                  <div className="font-semibold mt-1">
                    Total: {(debugInfo.tokensUsed.input + debugInfo.tokensUsed.output).toLocaleString()}
                  </div>
                </div>
              </DebugSection>
            )}

            {/* Student Context */}
            {debugInfo.studentContext && (
              <DebugSection title="Student Context">
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-60 overflow-y-auto">
                  {debugInfo.studentContext}
                </pre>
              </DebugSection>
            )}

            {/* System Prompt */}
            {debugInfo.systemPrompt && (
              <DebugSection title="System Prompt">
                <div className="relative">
                  <button
                    onClick={() => navigator.clipboard.writeText(debugInfo.systemPrompt || '')}
                    className="absolute top-0 right-0 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Copy
                  </button>
                  <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-96 overflow-y-auto">
                    {debugInfo.systemPrompt}
                  </pre>
                </div>
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-50 text-left text-sm font-medium flex justify-between items-center"
      >
        {title}
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="p-3">{children}</div>}
    </div>
  );
}

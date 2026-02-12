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
}

interface Message {
  id: string;
  role: 'student' | 'agent' | 'system' | 'welcome';
  content: string;
  status: 'sent' | 'pending_approval' | 'approved';
  toolCalls?: any[];
  timestamp: string;
}

const WELCOME_MESSAGE = `Welcome to the Generative AI Professional Bootcamp!

**Phase I (1.5 months):** Complete the video curriculum - 8 topics including LLM Foundations, Prompt Engineering, Agents, Semantic Search, RAG, and Multimodal LLMs.

**Phase II (2.5 months):** Work on your research project and publish a paper.

Let me know if you have any questions!`;

// Tools available by phase
const PHASE1_TOOLS = ['search_video_catalog', 'get_video_details', 'get_progress', 'update_progress', 'send_voice_note'];
const PHASE2_TOOLS = ['generate_roadmap', 'update_milestone', 'search_papers', 'get_progress', 'send_voice_note'];

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Derive tools from phase
  const tools = selectedStudent?.currentPhase === 'phase2' ? PHASE2_TOOLS : PHASE1_TOOLS;

  // Fetch students once on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.students.length > 0) {
          setStudents(data.data.students);
          setSelectedStudent(data.data.students[0]);
          setMessages([{
            id: 'welcome',
            role: 'welcome',
            content: WELCOME_MESSAGE,
            status: 'sent',
            timestamp: new Date().toISOString(),
          }]);
        }
      });
  }, []);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingDrafts]);

  // Handle student change
  function handleStudentChange(studentId: string) {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setMessages([{
        id: 'welcome',
        role: 'welcome',
        content: WELCOME_MESSAGE,
        status: 'sent',
        timestamp: new Date().toISOString(),
      }]);
      setPendingDrafts([]);
    }
  }

  // Send message
  async function sendMessage() {
    if (!inputMessage.trim() || !selectedStudent || isLoading) return;

    const content = inputMessage.trim();
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'student',
      content,
      status: 'sent',
      timestamp: new Date().toISOString(),
    }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, message: content }),
      });
      const data = await res.json();

      if (data.success) {
        setPendingDrafts(prev => [...prev, {
          id: data.draft.id,
          role: 'agent',
          content: data.draft.content,
          status: 'pending_approval',
          toolCalls: data.draft.toolCalls,
          timestamp: data.draft.createdAt,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${data.error}`,
          status: 'sent',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Failed to send message',
        status: 'sent',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Approve draft
  function approveDraft(id: string) {
    const draft = pendingDrafts.find(d => d.id === id);
    if (draft) {
      setMessages(prev => [...prev, { ...draft, status: 'approved' }]);
      setPendingDrafts(prev => prev.filter(d => d.id !== id));
    }
  }

  // Transition to Phase 2
  async function transitionToPhase2() {
    if (!selectedStudent || !window.confirm(`Transition ${selectedStudent.name} to Phase II?`)) return;

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'phase2' }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh
        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          setStudents(studentsData.data.students);
          const updated = studentsData.data.students.find((s: Student) => s.id === selectedStudent.id);
          if (updated) setSelectedStudent(updated);
        }
        alert('Transitioned to Phase II!');
      }
    } catch (err) {
      alert('Failed to transition');
    }
  }

  return (
    <div className="h-screen flex bg-[#0a0a0f] text-white">
      {/* Sidebar */}
      <div className="w-72 bg-[#12121a] border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-violet-400">Vizuara AI Bootcamp</h1>
        </div>

        <div className="p-4 border-b border-white/10">
          <select
            value={selectedStudent?.id || ''}
            onChange={e => handleStudentChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {students.map(s => (
              <option key={s.id} value={s.id} className="bg-[#1a1a2e]">
                {s.name} ({s.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'})
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className={`px-3 py-1 rounded text-sm inline-block ${
              selectedStudent.currentPhase === 'phase1' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {selectedStudent.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'}
            </div>
            <p className="text-sm text-white/60">
              {selectedStudent.currentPhase === 'phase1'
                ? `Topic ${selectedStudent.currentTopicIndex}/8`
                : `Milestone ${selectedStudent.currentMilestone}/5`}
            </p>
            {selectedStudent.currentPhase === 'phase1' && (
              <button
                onClick={transitionToPhase2}
                className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
              >
                Complete Phase I
              </button>
            )}
          </div>
        )}

        <div className="p-4 flex-1 overflow-auto">
          <p className="text-xs text-white/40 mb-2">Tools Available</p>
          <div className="flex flex-wrap gap-1">
            {tools.map(t => (
              <span key={t} className="px-2 py-1 bg-white/5 rounded text-xs text-white/50">
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/10 bg-[#12121a]">
          <h2 className="font-semibold">{selectedStudent?.name || 'Student'}</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map(m => {
            // Check for roadmap PDF in approved messages
            const roadmapTool = m.toolCalls?.find((t: any) => t.name === 'generate_roadmap');
            const pdfUrl = roadmapTool?.result?.data?.pdfUrl || roadmapTool?.result?.pdfUrl;

            return (
              <div key={m.id} className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  m.role === 'student' ? 'bg-violet-600' :
                  m.role === 'welcome' ? 'bg-violet-500/10 border border-violet-500/20' :
                  m.role === 'system' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                  'bg-white/5 border border-white/10'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      download
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Roadmap PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
{/* No loading indicator - messages go directly to mentor for approval */}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-[#12121a]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Mentor Panel */}
      <div className="w-96 bg-[#0d0d14] border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 bg-[#12121a]">
          <h2 className="font-semibold">Mentor - Dr. Raj</h2>
          <p className="text-xs text-white/40">Draft Approval</p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {pendingDrafts.length === 0 ? (
            <div className="text-center text-white/30 mt-10">No pending drafts</div>
          ) : (
            pendingDrafts.map(d => (
              <div key={d.id} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-amber-400">Pending</span>
                  <div className="flex gap-2">
                    <button onClick={() => approveDraft(d.id)} className="px-3 py-1 bg-green-600 rounded text-xs">
                      Approve
                    </button>
                    <button onClick={() => setPendingDrafts(prev => prev.filter(x => x.id !== d.id))} className="px-3 py-1 bg-white/10 rounded text-xs">
                      Reject
                    </button>
                  </div>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.content}</ReactMarkdown>
                </div>
                {d.toolCalls && d.toolCalls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-white/40">Tools: {d.toolCalls.map((t: any) => t.name).join(', ')}</p>
                    {d.toolCalls.map((tool: any) => {
                      const pdfUrl = tool.result?.data?.pdfUrl || tool.result?.pdfUrl;
                      if (tool.name === 'generate_roadmap' && pdfUrl) {
                        return (
                          <a
                            key={tool.id}
                            href={pdfUrl}
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Roadmap PDF
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

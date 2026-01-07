"use client";

import React, { useState, useEffect } from 'react';
import MemberButton from '@/components/MemberButton';
import RefreshButton from '@/components/RefreshButton';
import CardSkeleton from '@/components/CardSkeleton';

// --- Types ---
interface Task {
  id: string;
  title: string;
  discoveryOwners: string[]; // Discovery phase participants
  deliveryOwners: string[];  // Delivery phase participants
  category: 'Shape-up' | '실험' | 'IS팀' | 'etc';
  status?: string;
}

interface TeamMember {
  name: string;
  role: string;
  part: string;
  isHiring?: boolean;
}

interface Section {
  name: 'Shape-up' | '실험' | 'IS팀' | 'etc';
  description: string;
  color: string;
}

// --- All Team Members ---
const ALL_MEMBERS: TeamMember[] = [
  // PO
  { name: '조원우', role: 'CPO', part: 'PO' },
  { name: '송지호', role: 'PO', part: 'PO' },
  { name: '정현규', role: 'TPO', part: 'PO' },
  // UX
  { name: '고태경', role: 'Director', part: 'UX' },
  { name: '이석주', role: 'PM', part: 'UX' },
  // Engineering
  { name: '기근영', role: 'Director', part: 'Eng' },
  { name: '김동건', role: 'FE', part: 'Eng' },
  { name: '김원현', role: 'BE', part: 'Eng' },
  { name: '서승덕', role: 'FE', part: 'Eng' },
  { name: '노상기', role: 'QA', part: 'Eng' },
  { name: '전지원', role: 'Infra', part: 'Eng' },
  { name: '오제욱', role: 'Platform', part: 'Eng' },
  { name: '송재현', role: 'Platform', part: 'Eng' },
  { name: '이정원', role: 'SRE', part: 'Eng' },
  // R&D
  { name: '고동휘', role: 'Lead', part: 'R&D' },
  { name: '최진우', role: 'HCI', part: 'R&D' },
];

// --- Real-world SOT Data (Verified from Notion 2026-01-02) ---
const INITIAL_TASKS: Task[] = [
  // Shape-up (Pitches)
  {
    id: 's1', title: 'Pitch 2. V2 인증 시스템',
    discoveryOwners: ['조원우'],
    deliveryOwners: ['김원현', '서승덕', '노상기', '고태경'],
    category: 'Shape-up'
  },
  {
    id: 's2', title: 'Pitch 3. 멤버 초대 및 Space',
    discoveryOwners: ['기근영'],
    deliveryOwners: ['오제욱', '김동건', '노상기', '고태경', '이석주'],
    category: 'Shape-up'
  },
  {
    id: 's3', title: 'Pitch 8-0. v2 결제 Foundation',
    discoveryOwners: ['정현규'],
    deliveryOwners: [],
    category: 'Shape-up'
  },
  {
    id: 's4', title: 'Pitch 8-1. v2 결제 (Input)',
    discoveryOwners: ['정현규'],
    deliveryOwners: [],
    category: 'Shape-up'
  },
  {
    id: 's5', title: 'Pitch 8-2. v2 요금 집계 (Process)',
    discoveryOwners: ['정현규'],
    deliveryOwners: [],
    category: 'Shape-up'
  },
  {
    id: 's6', title: 'Pitch 8-3. v2 이용 요금 집행 (Output)',
    discoveryOwners: ['정현규'],
    deliveryOwners: [],
    category: 'Shape-up'
  },
  {
    id: 's7', title: 'R&D Mode - AI Gateway',
    discoveryOwners: ['조원우'],
    deliveryOwners: ['고동휘'],
    category: 'Shape-up'
  },

  // 실험
  {
    id: 'e1', title: '사내용 CS 챗봇 서비스 (RAG)',
    discoveryOwners: ['송지호'],
    deliveryOwners: [],
    category: '실험'
  },
  {
    id: 'e2', title: 'AI Native Memory Framework',
    discoveryOwners: ['고동휘'],
    deliveryOwners: ['최진우'],
    category: '실험'
  },
  {
    id: 'e3', title: 'PII 벤치마크 및 베이스라인 조사',
    discoveryOwners: ['조원우'],
    deliveryOwners: [],
    category: '실험'
  },

  // IS팀
  {
    id: 'i1', title: 'Inhouse Knowledge Store 설계',
    discoveryOwners: ['오제욱'],
    deliveryOwners: [],
    category: 'IS팀'
  },
  {
    id: 'i2', title: 'Opencost 자동화 (FinOps)',
    discoveryOwners: ['송재현'],
    deliveryOwners: ['송재현'],
    category: 'IS팀'
  },
  {
    id: 'i3', title: 'LLM 기반 모니터링 대응 (SRE)',
    discoveryOwners: ['이정원'],
    deliveryOwners: ['이정원'],
    category: 'IS팀'
  },
  {
    id: 'i4', title: 'Pitch 0. V2 배포 기반 마련',
    discoveryOwners: ['기근영'],
    deliveryOwners: ['전지원'],
    category: 'Shape-up' // Corrected based on new rules
  },
  {
    id: 'i5', title: '제품팀 Observability 구축',
    discoveryOwners: ['기근영'],
    deliveryOwners: [],
    category: 'IS팀'
  },

  // etc
  {
    id: 't1', title: '제품팀 GTM 기능 및 파이프라인 정의',
    discoveryOwners: ['조원우', '송지호'],
    deliveryOwners: [],
    category: 'etc'
  },
  {
    id: 't2', title: 'AX 과정 활용 가능 자산 관리',
    discoveryOwners: ['정현규'],
    deliveryOwners: [],
    category: 'etc'
  },
  {
    id: 't3', title: '내부용 자산 관리 봇 v2',
    discoveryOwners: ['고태경'],
    deliveryOwners: ['이석주'],
    category: 'etc'
  },
];

const SECTIONS: Section[] = [
  { name: 'Shape-up', description: 'Pitch 및 주요 기능 설계 프로세스', color: 'amber' },
  { name: '실험', description: '가설 검증 및 프로토타입 실험', color: 'indigo' },
  { name: 'IS팀', description: '내부 운영 도구 및 플랫폼 개발 로드맵', color: 'emerald' },
  { name: 'etc', description: '기타 백로그 및 전사 과제', color: 'pink' },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]); // Start empty
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/notion/refresh', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Refresh failed', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleMember = (name: string) => {
    setSelectedMember(prev => prev === name ? null : name);
  };

  // Helper to filter tasks by ownership in either phase
  // Logic Update: Only show tasks if there are owners (meaning phase is completed/active as per logic)
  const getPhaseTasks = (category: string, phase: 'discovery' | 'delivery') => {
    let filtered = tasks.filter(t => t.category === category);

    // Filter out items where the phase hasn't started/completed (owners list is empty)
    if (phase === 'discovery') {
      filtered = filtered.filter(t => t.discoveryOwners.length > 0);
    } else {
      filtered = filtered.filter(t => t.deliveryOwners.length > 0);
    }

    if (selectedMember) {
      if (phase === 'discovery') {
        filtered = filtered.filter(t => t.discoveryOwners.includes(selectedMember));
      } else {
        filtered = filtered.filter(t => t.deliveryOwners.includes(selectedMember));
      }
    }

    return filtered;
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-[family-name:var(--font-geist-sans)] pb-20">
      {/* Top Banner / Hero Area */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-8 mb-12">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                Product Observability
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                문제 정의부터 해결까지, 우리가 집중하고 있는 문제를 투명하게 공유합니다.<br />
                {selectedMember ? (
                  <span className="text-accent font-semibold italic">✨ {selectedMember}님이 참여한 Problem Discovery & Delivery 내역입니다.</span>
                ) : (
                  "각 문제(Problem)가 누구에 의해 정의되고(Discovery), 어떻게 해결되고 있는지(Delivery) 확인하세요."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
            </div>
          </header>

          {/* Global Member Filter Area */}
          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 scale-in-center">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 mb-4 uppercase">Team Members Filter</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_MEMBERS.map((member) => (
                <MemberButton
                  key={member.name}
                  name={member.name}
                  role={member.role}
                  part={member.part}
                  isHiring={member.isHiring}
                  isSelected={selectedMember === member.name}
                  onClick={() => toggleMember(member.name)}
                />
              ))}
            </div>
          </div>
        </div >
      </div >

      {/* Grid of Initiative Types */}
      < div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-8" >
        {
          SECTIONS.map((section) => {
            const discoveryList = getPhaseTasks(section.name, 'discovery');
            const deliveryList = getPhaseTasks(section.name, 'delivery');

            return (
              <section
                key={section.name}
                className={`
                glass p-8 relative overflow-hidden group transition-all duration-500 border-t-4
                ${section.name === 'Shape-up' ? 'border-t-amber-400' : ''}
                ${section.name === '실험' ? 'border-t-indigo-400' : ''}
                ${section.name === 'IS팀' ? 'border-t-emerald-400' : ''}
                ${section.name === 'etc' ? 'border-t-pink-400' : ''}
              `}
              >
                {/* Section Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1 tracking-tight">{section.name}</h2>
                  <p className="text-slate-400 text-sm italic">{section.description}</p>
                </div>

                {/* Content Discovery/Delivery */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Discovery Area */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 mb-3 uppercase flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      Discovery Actions
                    </h3>
                    <div className="space-y-3">
                      {isRefreshing ? <CardSkeleton /> : discoveryList.map(task => (
                        <TaskCard key={task.id} title={task.title} owners={task.discoveryOwners} />
                      ))}
                      {!isRefreshing && discoveryList.length === 0 && <EmptyPlaceholder phase="discovery" />}
                    </div>
                  </div>

                  {/* Delivery Area */}
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 mb-3 uppercase flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      Delivery Actions
                    </h3>
                    <div className="space-y-3">
                      {isRefreshing ? <CardSkeleton /> : deliveryList.map(task => (
                        <TaskCard key={task.id} title={task.title} owners={task.deliveryOwners} />
                      ))}
                      {!isRefreshing && deliveryList.length === 0 && <EmptyPlaceholder phase="delivery" />}
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        }
      </div >
    </main >
  );
}

function TaskCard({ title, owners }: { title: string; owners: string[] }) {
  return (
    <div className="p-4 bg-white/70 border border-white/50 rounded-xl shadow-sm hover:shadow-md transition-all group/card">
      <p className="text-sm font-semibold text-slate-800 leading-tight group-hover/card:text-accent transition-colors">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {owners.map(owner => (
          <span key={owner} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">{owner}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyPlaceholder({ phase }: { phase?: string }) {
  return (
    <div className="py-8 border-2 border-dashed border-slate-100 bg-slate-50/20 rounded-xl flex items-center justify-center">
      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
        {phase === 'discovery' ? 'No Discovery Actions' : (phase === 'delivery' ? 'No Delivery Actions' : 'No Items')}
      </p>
    </div>
  );
}

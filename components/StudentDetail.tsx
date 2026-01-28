import React, { useState } from 'react';
import { ArrowLeft, PlusCircle, Check, AlertTriangle, Clock, ClipboardCheck, X, Star, Calendar, History, Printer, TrendingUp, TrendingDown, BookOpen, LayoutList, User as UserIcon, Flag, Table, Trophy, Hand, Activity, UserCheck, Download } from 'lucide-react';
import { Assessment, AssessmentStatus, Skill, Student, ClassGroup, ClassDailyLog } from '../types';

interface StudentDetailProps {
  studentId: string;
  students: Student[];
  skills: Skill[];
  assessments: Assessment[];
  classes?: ClassGroup[];
  logs?: ClassDailyLog[];
  onAddAssessment?: (a: Assessment) => void;
  onBack: () => void;
}

// Tipos auxiliares definidos explicitamente
type TimelineEvent = 
  | { type: 'assessment'; date: string; assessment: Assessment; skill?: Skill }
  | { type: 'remediation_entry'; date: string }
  | { type: 'remediation_exit'; date: string };

interface SubjectGroupItem {
    skill: Skill;
    assessment: Assessment;
}

interface ReportCardData {
    total: number;
    success: number;
    cellStatus: 'success' | 'danger' | 'warning' | 'neutral';
}

const TERMS = ['1º Trimestre', '2º Trimestre', '3º Trimestre', 'Recuperação'];

declare global {
    interface Window {
        html2pdf: any;
    }
}

export const StudentDetail: React.FC<StudentDetailProps> = ({
  studentId,
  students,
  skills,
  assessments,
  classes = [],
  logs = [],
  onAddAssessment,
  onBack
}) => {
  const student = students.find(s => s.id === studentId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'subjects' | 'timeline' | 'report_card'>('subjects');
  
  // Form State
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [term, setTerm] = useState('1º Trimestre');
  const [notes, setNotes] = useState('');
  
  // Unified Fields Form State
  const [status, setStatus] = useState<AssessmentStatus>(AssessmentStatus.EM_DESENVOLVIMENTO);
  const [formParticipation, setFormParticipation] = useState<string>('');
  const [formBehavior, setFormBehavior] = useState<string>('');
  const [formExam, setFormExam] = useState<string>('');

  if (!student) return null;

  const studentClass = classes.find(c => c.id === student.classId);
  const focusSkillsIds: string[] = studentClass?.focusSkills || [];
  const studentAssessments = assessments.filter(a => a.studentId === studentId);
  
  // Calculate Highlights
  const superouCount = studentAssessments.filter(a => a.status === AssessmentStatus.SUPEROU).length;
  const isDestaque = superouCount >= 3; // Regra de negócio simples para destaque

  // Calculate Attendance for current class
  const attendancePercentage = React.useMemo(() => {
      if (!logs || logs.length === 0) return null;
      const classLogs = logs.filter(l => l.classId === student.classId);
      if (classLogs.length === 0) return null;
      const presentCount = classLogs.filter(l => l.attendance && l.attendance[student.id]).length;
      return Math.round((presentCount / classLogs.length) * 100);
  }, [logs, student]);

  // Pre-fill participation on Modal Open
  React.useEffect(() => {
      if (isModalOpen && attendancePercentage !== null && attendancePercentage !== undefined && !formParticipation) {
          // Proteção contra NaN ou valores inválidos
          const score = typeof attendancePercentage === 'number' && !isNaN(attendancePercentage) 
              ? (attendancePercentage / 10).toFixed(1) 
              : '';
          setFormParticipation(score);
      }
  }, [isModalOpen, attendancePercentage]);

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Group assessments by Subject
  const assessmentsBySubject = skills.reduce((acc, skill) => {
    const assessment = studentAssessments
        .filter(a => a.skillId === skill.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!acc[skill.subject]) acc[skill.subject] = [];
    if (assessment) acc[skill.subject].push({ skill, assessment });
    return acc;
  }, {} as Record<string, SubjectGroupItem[]>);

  // --- Logic for Report Card (Boletim) ---
  const uniqueSubjects = Array.from(new Set(skills.map(s => s.subject))).sort();
  
  const getReportCardCell = (subject: string, termName: string): ReportCardData | null => {
      const subjectSkills = skills.filter(s => s.subject === subject);
      const subjectSkillIds = subjectSkills.map(s => s.id);

      const termAssessments = studentAssessments.filter(a => 
          subjectSkillIds.includes(a.skillId) && a.term === termName
      );

      if (termAssessments.length === 0) return null;

      const total = termAssessments.length;
      const success = termAssessments.filter(a => a.status === AssessmentStatus.ATINGIU || a.status === AssessmentStatus.SUPEROU).length;
      
      let cellStatus: 'success' | 'danger' | 'warning' | 'neutral' = 'neutral';
      if (success === total) cellStatus = 'success';
      else if (success === 0) cellStatus = 'danger';
      else cellStatus = 'warning';

      return { total, success, cellStatus };
  };

  // --- Timeline Construction ---
  const timelineEvents: TimelineEvent[] = studentAssessments.map(a => ({
    type: 'assessment' as const,
    date: a.date,
    assessment: a,
    skill: skills.find(s => s.id === a.skillId)
  }));

  if (student.remediationEntryDate) {
      timelineEvents.push({ 
          type: 'remediation_entry' as const, 
          date: String(student.remediationEntryDate)
      });
  }
  if (student.remediationExitDate) {
      timelineEvents.push({ 
          type: 'remediation_exit' as const, 
          date: String(student.remediationExitDate)
      });
  }

  const sortedTimeline = [...timelineEvents].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  // --- Handlers ---
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId || !onAddAssessment) return;

    const newAssessment: Assessment = {
      id: generateId(),
      studentId,
      skillId: selectedSkillId,
      date: new Date().toISOString().split('T')[0],
      term,
      notes,
      status,
      participationScore: formParticipation ? Number(formParticipation) : undefined,
      behaviorScore: formBehavior ? Number(formBehavior) : undefined,
      examScore: formExam ? Number(formExam) : undefined
    };

    onAddAssessment(newAssessment);
    setIsModalOpen(false);
    setSelectedSkillId('');
    setStatus(AssessmentStatus.EM_DESENVOLVIMENTO);
    setTerm('1º Trimestre');
    setNotes('');
    setFormParticipation('');
    setFormBehavior('');
    setFormExam('');
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const element = document.getElementById('student-report-container');
    const opt = {
        margin: 0.5,
        filename: `Relatorio_${student.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (window.html2pdf) {
        window.html2pdf().set(opt).from(element).save();
    } else {
        alert("Erro: Biblioteca PDF não carregada. Tente recarregar a página.");
    }
  };

  const getStatusBadge = (status?: AssessmentStatus) => {
    switch (status) {
      case AssessmentStatus.SUPEROU: return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><Trophy size={12} className="text-yellow-600"/> Superou</span>;
      case AssessmentStatus.ATINGIU: return <span className="flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold"><Check size={12} /> Atingiu</span>;
      case AssessmentStatus.EM_DESENVOLVIMENTO: return <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold"><Clock size={12} /> Em Desenv.</span>;
      case AssessmentStatus.NAO_ATINGIU: return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertTriangle size={12} /> Não Atingiu</span>;
      default: return <span className="text-gray-400 text-xs">Não Avaliado</span>;
    }
  };
  
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : '-';
  const formatDateTime = (dateString: string) => {
      if (!dateString) return '-';
      const d = new Date(dateString);
      return (dateString.includes('T'))
         ? d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
         : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-[#c48b5e] transition-colors">
            <ArrowLeft size={20} className="mr-2" /> Voltar
        </button>
        <div className="flex gap-2">
            <button 
                onClick={handleDownloadPDF} 
                className="flex items-center gap-2 px-4 py-2 bg-[#c48b5e] text-white rounded-xl hover:bg-[#a0704a] transition-colors font-medium shadow-sm"
            >
                <Download size={18} /> Baixar PDF
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eaddcf] text-[#433422] rounded-xl hover:bg-[#fcf9f6] transition-colors font-medium shadow-sm">
                <Printer size={18} /> Imprimir
            </button>
        </div>
      </div>

      <div id="student-report-container">
        {/* HEADER DO ALUNO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden mb-6">
            {/* Destaque por Superação */}
            {isDestaque && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-4 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                    <Trophy size={12} className="fill-current" /> DESTAQUE ACADÊMICO
                </div>
            )}
            
            <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden border-4 shadow-sm ${isDestaque ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 'border-white bg-[#eaddcf] text-[#c48b5e]'}`}>
                {student.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover" /> : student.name.charAt(0)}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {student.name} 
                    {isDestaque && <Star size={20} className="text-yellow-400 fill-current" />}
                </h1>
                <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><UserIcon size={14} /> Matrícula: {student.registrationNumber || 'N/A'}</span>
                    <span>•</span>
                    <span>{studentClass?.name || 'Sem Turma'}</span>
                    {student.birthDate && <span>• Nasc: {formatDate(student.birthDate)}</span>}
                </div>
            </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 w-full md:w-auto mt-4 md:mt-0 pt-6 md:pt-0">
                {student.remediationEntryDate && !student.remediationExitDate ? (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-3 w-full md:w-auto">
                        <div className="bg-red-100 p-2 rounded-full text-red-600"><TrendingDown size={20} /></div>
                        <div>
                            <p className="text-xs text-red-600 font-bold uppercase tracking-wide">Em Reforço Escolar</p>
                            <p className="text-sm text-red-800 font-medium">Desde: {formatDate(student.remediationEntryDate)}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3 w-full md:w-auto opacity-70">
                        <div className="bg-gray-200 p-2 rounded-full text-gray-500"><Check size={20} /></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Situação Regular</p>
                            <p className="text-xs text-gray-400">Monitoramento Ativo</p>
                        </div>
                    </div>
                )}
                {onAddAssessment && ( // Só mostra botão se não for visualização de pai
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="flex items-center justify-center w-full md:w-auto bg-[#c48b5e] hover:bg-[#a0704a] text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm font-medium print:hidden" 
                        data-html2canvas-ignore="true"
                    >
                        <PlusCircle size={18} className="mr-2" /> Nova Avaliação
                    </button>
                )}
            </div>
        </div>

        {/* TABS DE VISUALIZAÇÃO */}
        <div className="flex gap-2 border-b border-gray-200 print:hidden overflow-x-auto mb-6" data-html2canvas-ignore="true">
            <button 
                onClick={() => setViewMode('subjects')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'subjects' ? 'border-[#c48b5e] text-[#c48b5e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutList size={16} /> Visão Detalhada
            </button>
            <button 
                onClick={() => setViewMode('report_card')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'report_card' ? 'border-[#c48b5e] text-[#c48b5e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Table size={16} /> Boletim Escolar
            </button>
            <button 
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'timeline' ? 'border-[#c48b5e] text-[#c48b5e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <History size={16} /> Histórico Completo
            </button>
        </div>

        {/* 1. VISÃO POR DISCIPLINA */}
        {viewMode === 'subjects' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {Object.keys(assessmentsBySubject).length === 0 && (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhuma avaliação registrada por disciplina.</p>
                    </div>
                )}
                
                {Object.keys(assessmentsBySubject).map((subject) => {
                const items = assessmentsBySubject[subject];
                return (
                    <div key={subject} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden break-inside-avoid page-break-inside-avoid">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#c48b5e] rounded-full"></div> {subject}
                        </div>
                        <div className="divide-y divide-gray-100">
                        {items.map(({ skill, assessment }: SubjectGroupItem) => {
                            const isFocus = focusSkillsIds.includes(skill.id);
                            return (
                            <div key={`${skill.id}-${assessment?.id}`} className="p-4 md:p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isFocus ? 'bg-[#c48b5e] text-white border-[#c48b5e]' : 'bg-indigo-50 text-[#c48b5e] border-[#eaddcf] '}`}>
                                    {skill.code}
                                    </span>
                                    {isFocus && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><Star size={8} className="fill-current" /> Foco</span>}
                                    {getStatusBadge(assessment?.status)}
                                </div>
                                <p className="text-gray-800 text-sm">{skill.description}</p>
                                
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {assessment.participationScore !== undefined && (
                                        <span className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100 font-medium">Part: {assessment.participationScore}</span>
                                    )}
                                    {assessment.behaviorScore !== undefined && (
                                        <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 font-medium">Comp: {assessment.behaviorScore}</span>
                                    )}
                                    {assessment.examScore !== undefined && (
                                        <span className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100 font-medium">Prova: {assessment.examScore}</span>
                                    )}
                                </div>

                                {assessment?.notes && (
                                    <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded inline-block border border-gray-100 italic">"{assessment.notes}"</p>
                                )}
                                </div>
                                <div className="text-right min-w-[100px]">
                                <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                    <Calendar size={12} /> {assessment ? formatDate(assessment.date) : '-'}
                                </span>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                );
                })}
            </div>
        )}

        {/* 2. BOLETIM ESCOLAR */}
        {viewMode === 'report_card' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
                    <div>
                        <h3 className="font-bold text-[#000039] text-lg">Boletim de Desempenho</h3>
                        <p className="text-xs text-gray-500">Visão consolidada por disciplina e trimestre.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Ano Letivo {new Date().getFullYear()}</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-200">
                                <th className="p-4 text-sm font-bold text-gray-600 uppercase w-1/4 border-r border-gray-100">Disciplina</th>
                                {TERMS.map(t => (
                                    <th key={t} className="p-4 text-xs font-bold text-gray-500 uppercase text-center border-r border-gray-100 last:border-0 min-w-[100px]">
                                        {t.replace(' Trimestre', 'º Tri.')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {uniqueSubjects.map(subject => (
                                <tr key={subject} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-[#433422] border-r border-gray-100">{subject}</td>
                                    {TERMS.map(t => {
                                        const data = getReportCardCell(subject, t);
                                        return (
                                            <td key={t} className="p-4 text-center border-r border-gray-100 last:border-0 align-middle">
                                                {data ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 
                                                            ${data.cellStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                            data.cellStatus === 'danger' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                            'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {Math.round((data.success / data.total) * 100)}%
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            {data.success}/{data.total} Hb.
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {uniqueSubjects.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma disciplina avaliada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* 3. HISTÓRICO COMPLETO */}
        {viewMode === 'timeline' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
                    <div>
                        <h3 className="font-bold text-[#000039] text-lg">Histórico Cronológico</h3>
                        <p className="text-xs text-gray-500">Linha do tempo de todas as ocorrências.</p>
                    </div>
                </div>

                {sortedTimeline.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <History size={32} className="mx-auto mb-2 opacity-50" />
                        <p>O aluno ainda não possui histórico registrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Evento / Habilidade</th>
                                <th className="p-4 font-semibold text-center">Status / Notas</th>
                                <th className="p-4 font-semibold">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedTimeline.map((item: TimelineEvent, idx) => {
                                if (item.type === 'assessment') {
                                    const { assessment, skill } = item;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-sm font-mono text-gray-600 whitespace-nowrap align-top">
                                                {formatDate(assessment.date)}
                                                {assessment.term && <div className="text-[10px] text-gray-400 mt-1 uppercase">{assessment.term}</div>}
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="text-sm font-bold text-[#000039]">{skill?.subject}</div>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-mono bg-gray-100 px-1 rounded mr-1">{skill?.code}</span>
                                                    {skill?.description}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center align-top">
                                                <div className="flex flex-col items-center gap-1">
                                                    {getStatusBadge(assessment.status)}
                                                    <div className="text-[10px] text-gray-500 mt-1 space-y-0.5 text-left w-full pl-2">
                                                        {assessment.participationScore !== undefined && <div>Part: <b>{assessment.participationScore}</b></div>}
                                                        {assessment.behaviorScore !== undefined && <div>Comp: <b>{assessment.behaviorScore}</b></div>}
                                                        {assessment.examScore !== undefined && <div>Prova: <b>{assessment.examScore}</b></div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 italic align-top">{assessment.notes || '-'}</td>
                                        </tr>
                                    );
                                } else if (item.type === 'remediation_entry') {
                                    return (
                                        <tr key={idx} className="bg-red-50/50 hover:bg-red-50 transition-colors border-l-4 border-red-400">
                                            <td className="p-4 text-sm font-mono text-red-700 whitespace-nowrap align-top font-bold">{formatDateTime(String(item.date))}</td>
                                            <td className="p-4 align-top">
                                                <div className="text-sm font-bold text-red-800 mb-1 flex items-center gap-2"><AlertTriangle size={14} /> Reforço Escolar</div>
                                                <div className="text-xs text-red-600">Início do ciclo de intervenção.</div>
                                            </td>
                                            <td className="p-4 text-center align-top"><span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Entrada</span></td>
                                            <td className="p-4 text-sm text-red-700 italic align-top">Encaminhado para reforço.</td>
                                        </tr>
                                    );
                                } else if (item.type === 'remediation_exit') {
                                    return (
                                        <tr key={idx} className="bg-green-50/50 hover:bg-green-50 transition-colors border-l-4 border-green-400">
                                            <td className="p-4 text-sm font-mono text-green-700 whitespace-nowrap align-top font-bold">{formatDateTime(String(item.date))}</td>
                                            <td className="p-4 align-top">
                                                <div className="text-sm font-bold text-green-800 mb-1 flex items-center gap-2"><Flag size={14} /> Reforço Escolar</div>
                                                <div className="text-xs text-green-600">Conclusão do ciclo.</div>
                                            </td>
                                            <td className="p-4 text-center align-top"><span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Saída</span></td>
                                            <td className="p-4 text-sm text-green-700 italic align-top">Objetivos atingidos.</td>
                                        </tr>
                                    );
                                }
                                return null;
                            })}
                        </tbody>
                    </table>
                )}
                <div className="hidden print:flex justify-between mt-12 px-6 pb-6 text-xs text-gray-400 border-t pt-4">
                    <div>___________________________________________<br/>Assinatura do Responsável</div>
                    <div>___________________________________________<br/>Assinatura da Coordenação</div>
                </div>
            </div>
        )}
      </div>

      {/* Modal de Avaliação - UNIFIED FORM */}
      {isModalOpen && onAddAssessment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden" data-html2canvas-ignore="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
            <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
              <h3 className="font-bold text-xl text-white flex items-center gap-2"><ClipboardCheck className="text-[#eaddcf]" /> Registrar Avaliação</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Form Content (Igual ao original) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Habilidade / Contexto</label>
                <select required value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[#000039]">
                  <option value="">Selecione...</option>
                  {skills.map(s => (<option key={s.id} value={s.id} className={focusSkillsIds.includes(s.id) ? 'font-bold text-[#c48b5e]' : ''}>{focusSkillsIds.includes(s.id) ? '★ ' : ''}{s.code} - {s.subject}</option>))}
                </select>
                {selectedSkillId && <p className="mt-2 text-xs text-gray-600 bg-[#eaddcf]/20 p-3 rounded-lg border border-[#eaddcf]">{skills.find(s => s.id === selectedSkillId)?.description}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Trimestre</label>
                <select required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[#000039]" value={term} onChange={e => setTerm(e.target.value)}>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Critérios Verticais */}
              <div className="space-y-4 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Resultado (BNCC)</label>
                        <select 
                            required 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[#000039]"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as AssessmentStatus)}
                        >
                            <option value={AssessmentStatus.NAO_ATINGIU}>Não Atingiu</option>
                            <option value={AssessmentStatus.EM_DESENVOLVIMENTO}>Em Desenv.</option>
                            <option value={AssessmentStatus.ATINGIU}>Atingiu</option>
                            <option value={AssessmentStatus.SUPEROU}>Superou</option>
                        </select>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                        <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex justify-between">
                            Participação
                            {attendancePercentage !== null && <span className="bg-white px-2 rounded border">Freq: {attendancePercentage}%</span>}
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 bg-white text-[#000039]"
                            value={formParticipation}
                            onChange={e => setFormParticipation(e.target.value)}
                            placeholder="0.0"
                        />
                  </div>

                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Comportamento (Nota)</label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white text-[#000039]"
                            value={formBehavior}
                            onChange={e => setFormBehavior(e.target.value)}
                            placeholder="0.0"
                        />
                  </div>

                  <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                        <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Prova / Trabalho (Nota)</label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-400 bg-white text-[#000039]"
                            value={formExam}
                            onChange={e => setFormExam(e.target.value)}
                            placeholder="0.0"
                        />
                  </div>
              </div>

              {(status !== AssessmentStatus.SUPEROU && status !== AssessmentStatus.ATINGIU) && (
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100"><p className="text-xs text-amber-800 flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5" />O aluno será incluído na lista de <strong>Reforço Escolar</strong>.</p></div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Observações</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white h-24 resize-none" placeholder="Detalhes..." />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5">Salvar Avaliação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
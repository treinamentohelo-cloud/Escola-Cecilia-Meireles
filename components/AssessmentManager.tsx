import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Check, Clock, AlertTriangle, Filter, Search, Trash2, ClipboardCheck, X, Calendar, User, BookOpen, Star, UserCheck, Hand, Activity, Trophy } from 'lucide-react';
import { Assessment, AssessmentStatus, ClassGroup, Skill, Student, User as UserType, ClassDailyLog } from '../types';

interface AssessmentManagerProps {
  assessments: Assessment[];
  students: Student[];
  classes: ClassGroup[];
  skills: Skill[];
  logs?: ClassDailyLog[]; // Added logs for attendance calc
  currentUser: UserType | null;
  onAddAssessment: (a: Assessment) => void;
  onDeleteAssessment?: (id: string) => void;
}

export const AssessmentManager: React.FC<AssessmentManagerProps> = ({
  assessments,
  students,
  classes,
  skills,
  logs = [],
  currentUser,
  onAddAssessment,
  onDeleteAssessment
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const canDelete = currentUser?.role !== 'professor';

  // Form State
  const [formClassId, setFormClassId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formSkillId, setFormSkillId] = useState('');
  const [formTerm, setFormTerm] = useState('1º Trimestre');
  const [formNotes, setFormNotes] = useState('');
  
  // Unified Fields
  const [formStatus, setFormStatus] = useState<AssessmentStatus>(AssessmentStatus.EM_DESENVOLVIMENTO);
  const [formParticipation, setFormParticipation] = useState<string>('');
  const [formBehavior, setFormBehavior] = useState<string>('');
  const [formExam, setFormExam] = useState<string>('');

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Calculate Attendance Percentage for the selected student in form
  const studentAttendance = useMemo(() => {
    if (!formStudentId || !formClassId) return null;
    
    // Filter logs for this class
    const classLogs = logs.filter(l => l.classId === formClassId);
    if (classLogs.length === 0) return 0;

    // Count present days
    const presentCount = classLogs.filter(l => l.attendance && l.attendance[formStudentId]).length;
    return Math.round((presentCount / classLogs.length) * 100);
  }, [formStudentId, formClassId, logs]);

  // Efeito para Automação da Nota de Participação
  useEffect(() => {
      if (studentAttendance !== null) {
          // Converte % (0-100) para nota (0-10)
          const calculatedScore = (studentAttendance / 10).toFixed(1);
          setFormParticipation(calculatedScore);
      }
  }, [studentAttendance]);

  // Filtered Lists for View
  const filteredAssessments = assessments.filter(a => {
      const student = students.find(stud => stud.id === a.studentId);
      const skill = skills.find(s => s.id === a.skillId);
      
      const matchesClass = filterClass === 'all' || student?.classId === filterClass;
      const matchesTerm = filterTerm === 'all' || a.term === filterTerm;
      const matchesSearch = searchTerm === '' || 
                            student?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            skill?.code.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesClass && matchesTerm && matchesSearch;
  });

  // Derived Lists for Form
  const studentsInSelectedClass = students.filter(s => s.classId === formClassId);

  const handleDelete = (id: string) => {
    if(onDeleteAssessment && window.confirm('Deseja excluir esta avaliação?')) {
        onDeleteAssessment(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId || !formSkillId) return;

    onAddAssessment({
        id: generateId(),
        studentId: formStudentId,
        skillId: formSkillId,
        date: new Date().toISOString().split('T')[0],
        term: formTerm,
        notes: formNotes,
        status: formStatus,
        participationScore: formParticipation ? Number(formParticipation) : undefined,
        behaviorScore: formBehavior ? Number(formBehavior) : undefined,
        examScore: formExam ? Number(formExam) : undefined
    });

    setIsModalOpen(false);
    setFormStudentId('');
    setFormStatus(AssessmentStatus.EM_DESENVOLVIMENTO);
    setFormNotes('');
    setFormParticipation('');
    setFormBehavior('');
    setFormExam('');
  };

  const getStatusBadge = (status: AssessmentStatus) => {
    switch (status) {
      case AssessmentStatus.SUPEROU:
        return (
          <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Trophy size={12} className="text-yellow-600" /> Superou
          </span>
        );
      case AssessmentStatus.ATINGIU:
        return (
            <span className="flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Check size={12} /> Atingiu
            </span>
        );
      case AssessmentStatus.EM_DESENVOLVIMENTO:
        return (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Clock size={12} /> Em Desenv.
          </span>
        );
      case AssessmentStatus.NAO_ATINGIU:
        return (
          <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <AlertTriangle size={12} /> Não Atingiu
          </span>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#000039]">Avaliações</h2>
           <p className="text-gray-500">Histórico e registro de desempenho</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
        >
          <Plus size={18} /> Nova Avaliação
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input 
                type="text"
                placeholder="Buscar por aluno ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none bg-white text-black placeholder-gray-500"
             />
         </div>
         
         <div className="flex gap-2 w-full lg:w-auto">
             <div className="w-1/2 lg:w-48 relative">
                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                 <select
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-[#000039] text-sm"
                 >
                     <option value="all">Todos Trimestres</option>
                     <option value="1º Trimestre">1º Trimestre</option>
                     <option value="2º Trimestre">2º Trimestre</option>
                     <option value="3º Trimestre">3º Trimestre</option>
                     <option value="Recuperação">Recuperação</option>
                 </select>
             </div>

             <div className="w-1/2 lg:w-48 relative">
                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                 <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-[#000039] text-sm"
                 >
                     <option value="all">Todas as Turmas</option>
                     {classes.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                 </select>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssessments.slice().reverse().map(assessment => {
            const student = students.find(s => s.id === assessment.studentId);
            const skill = skills.find(s => s.id === assessment.skillId);
            const classInfo = classes.find(c => c.id === student?.classId);
            const isSuperou = assessment.status === AssessmentStatus.SUPEROU;

            return (
                <div key={assessment.id} className={`bg-white rounded-xl shadow-sm border ${isSuperou ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-100'} hover:shadow-lg transition-all p-5 relative group flex flex-col justify-between h-full`}>
                    {/* Header: Date & Status */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                           <div className="bg-gray-50 text-gray-500 text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 w-fit mb-1">
                              <Calendar size={12} />
                              {new Date(assessment.date).toLocaleDateString('pt-BR')}
                           </div>
                           <div className="flex gap-1">
                                {assessment.term && (
                                    <span className="text-[10px] text-[#c48b5e] font-bold uppercase tracking-wider">{assessment.term}</span>
                                )}
                           </div>
                        </div>
                        {getStatusBadge(assessment.status)}
                    </div>

                    {/* Body: Student & Skill Info */}
                    <div className="mb-4">
                        <div className="flex items-center gap-3 mb-3">
                             <div className="w-10 h-10 rounded-full bg-[#eaddcf] flex items-center justify-center text-[#c48b5e] font-bold shrink-0">
                                 {student?.name.charAt(0)}
                             </div>
                             <div>
                                 <h4 className="font-bold text-[#000039] leading-tight line-clamp-1" title={student?.name}>
                                     {student?.name || 'Aluno Desconhecido'}
                                 </h4>
                                 <p className="text-xs text-gray-500">{classInfo?.name}</p>
                             </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-2">
                             <div className="flex items-center gap-2 mb-1">
                                 <BookOpen size={14} className="text-[#c48b5e]" />
                                 <span className="font-mono text-xs font-bold text-[#c48b5e] bg-[#eaddcf]/30 px-1.5 rounded">{skill?.code}</span>
                             </div>
                             <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed" title={skill?.description}>
                                 {skill?.description}
                             </p>
                        </div>

                        {/* Scores Summary */}
                        <div className="flex flex-wrap gap-2">
                            {assessment.participationScore !== undefined && (
                                <span className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100 flex items-center gap-1">
                                    <Hand size={10}/> Part: <strong>{assessment.participationScore}</strong>
                                </span>
                            )}
                            {assessment.behaviorScore !== undefined && (
                                <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-center gap-1">
                                    <UserCheck size={10}/> Comp: <strong>{assessment.behaviorScore}</strong>
                                </span>
                            )}
                            {assessment.examScore !== undefined && (
                                <span className="text-[10px] px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100 flex items-center gap-1">
                                    <Activity size={10}/> Prova: <strong>{assessment.examScore}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Footer: Delete Action */}
                    <div className="mt-auto pt-3 border-t border-gray-50 flex justify-end">
                        {onDeleteAssessment && canDelete && (
                            <button 
                                onClick={() => handleDelete(assessment.id)}
                                className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
        {filteredAssessments.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <ClipboardCheck className="text-gray-300" size={24} />
                </div>
                Nenhuma avaliação encontrada com os filtros atuais.
            </div>
        )}
      </div>

      {/* MODAL DE AVALIAÇÃO - UNIFIED FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                   <ClipboardCheck className="text-[#eaddcf]" />
                   Registrar Avaliação
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                
                {/* 1. Contexto Geral */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 ml-1">Turma</label>
                        <select
                            required
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50 text-[#000039]"
                            value={formClassId}
                            onChange={e => { setFormClassId(e.target.value); setFormStudentId(''); }}
                        >
                            <option value="">Selecione...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 ml-1">Aluno</label>
                        <select
                            required
                            disabled={!formClassId}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50 text-[#000039] disabled:bg-gray-100"
                            value={formStudentId}
                            onChange={e => setFormStudentId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {studentsInSelectedClass.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 ml-1">Habilidade BNCC</label>
                        <select
                            required
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50 text-[#000039]"
                            value={formSkillId}
                            onChange={e => setFormSkillId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {skills.map(s => (
                                <option key={s.id} value={s.id}>{s.code}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 ml-1">Trimestre</label>
                        <select
                            required
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50 text-[#000039]"
                            value={formTerm}
                            onChange={e => setFormTerm(e.target.value)}
                        >
                            <option value="1º Trimestre">1º Trimestre</option>
                            <option value="2º Trimestre">2º Trimestre</option>
                            <option value="3º Trimestre">3º Trimestre</option>
                            <option value="Recuperação">Recuperação</option>
                        </select>
                    </div>
                </div>

                {/* 2. Critérios de Avaliação (Vertical) */}
                <div className="space-y-3 pt-2">
                    
                    {/* Habilidade Status */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-2">Habilidade BNCC (Resultado)</label>
                        <select
                            required
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#000039]"
                            value={formStatus}
                            onChange={e => setFormStatus(e.target.value as AssessmentStatus)}
                        >
                           <option value={AssessmentStatus.NAO_ATINGIU}>Não Atingiu</option>
                           <option value={AssessmentStatus.EM_DESENVOLVIMENTO}>Em Desenvolvimento</option>
                           <option value={AssessmentStatus.ATINGIU}>Atingiu</option>
                           <option value={AssessmentStatus.SUPEROU}>Superou</option>
                        </select>
                    </div>

                    {/* Participação */}
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                        <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Participação (Baseada na Frequência)</span>
                            {studentAttendance !== null && <span className="text-[10px] bg-white px-2 rounded-full border border-purple-200">Freq: {studentAttendance}%</span>}
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
                        <p className="text-[10px] text-gray-400 mt-1 italic">* Valor sugerido automaticamente pelo diário.</p>
                    </div>

                    {/* Comportamento */}
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

                    {/* Prova */}
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

                <div>
                    <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 ml-1">Observações (Opcional)</label>
                    <textarea 
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent bg-gray-50 focus:bg-white text-[#000039] resize-none h-16 transition-all"
                        value={formNotes}
                        onChange={e => setFormNotes(e.target.value)}
                        placeholder="Comentários sobre o desempenho..."
                    />
                </div>

                <div className="pt-2">
                    <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5">
                    Salvar Avaliação
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
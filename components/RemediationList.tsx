import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, ClipboardList, PlusCircle, X, School, GraduationCap, UserPlus, BookOpen, Calendar, CheckSquare, Square, Trash2, Clock, Users, User as UserIcon, Save, CheckCircle2, Printer, CheckCircle, Filter, RotateCcw } from 'lucide-react';
import { Assessment, AssessmentStatus, ClassGroup, Skill, Student, User, ClassDailyLog } from '../types';

interface RemediationListProps {
  assessments: Assessment[];
  students: Student[];
  skills: Skill[];
  classes: ClassGroup[];
  users: User[];
  logs?: ClassDailyLog[];
  currentUser: User | null;
  onSelectStudent: (id: string) => void;
  onAddClass?: (c: ClassGroup) => void;
  onUpdateStudent?: (s: Student) => void;
  onAddLog?: (l: ClassDailyLog) => void;
  onDeleteLog?: (id: string) => void;
  onDeleteClass?: (id: string) => void;
}

// Tipos auxiliares para o reduce
interface RemediationItem {
    student: Student;
    skill: Skill;
    assessment: Assessment;
}

interface RemediationGroup {
    classInfo: ClassGroup;
    items: RemediationItem[];
}

export const RemediationList: React.FC<RemediationListProps> = ({
  assessments,
  students,
  skills,
  classes,
  users,
  logs = [],
  currentUser,
  onSelectStudent,
  onAddClass,
  onUpdateStudent,
  onAddLog,
  onDeleteLog,
  onDeleteClass
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'report'>('overview');
  
  // Create Class Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Enroll Student Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [studentToEnroll, setStudentToEnroll] = useState<Student | null>(null);
  const [selectedRemediationClassId, setSelectedRemediationClassId] = useState('');

  // Daily Log State
  const [selectedDailyClass, setSelectedDailyClass] = useState('');
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyContent, setDailyContent] = useState('');
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, boolean>>({});

  // Report Filter State
  const [reportFilterClass, setReportFilterClass] = useState('all');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const canDelete = currentUser?.role !== 'professor';

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Filters
  const remediationClasses = classes.filter(c => c.isRemediation);
  
  // Group by Class for Overview
  const remediationItems = assessments.filter(
    (a) => a.status === AssessmentStatus.NAO_ATINGIU || a.status === AssessmentStatus.EM_DESENVOLVIMENTO
  );
  
  // Tipagem Explícita do Reduce
  const byClass = remediationItems.reduce((acc, item) => {
    const student = students.find(s => s.id === item.studentId);
    if (!student) return acc;
    
    // Se o aluno já saiu do reforço, não mostrar na visão geral de "Alunos em Risco"
    if (student.remediationExitDate) return acc;

    const classGroup = classes.find(c => c.id === student.classId);
    if (!classGroup) return acc;
    const skill = skills.find(s => s.id === item.skillId);
    if (!skill) return acc;

    if (!acc[classGroup.id]) acc[classGroup.id] = { classInfo: classGroup, items: [] };
    
    // Evitar duplicatas
    const exists = acc[classGroup.id].items.some(i => i.student.id === student.id && i.skill.id === skill.id);
    if (!exists) {
        acc[classGroup.id].items.push({ student, skill, assessment: item });
    }
    
    return acc;
  }, {} as Record<string, RemediationGroup>);

  // --- Handlers ---

  const handleCreateRemediationClass = () => {
    if(!newClassName || !onAddClass) return;
    onAddClass({
        id: generateId(),
        name: newClassName,
        grade: 'Reforço Escolar',
        year: new Date().getFullYear(),
        shift: 'Integral',
        status: 'active',
        teacherIds: selectedTeacherId ? [selectedTeacherId] : [],
        isRemediation: true
    });
    setIsModalOpen(false);
    setNewClassName('');
    setSelectedTeacherId('');
  };

  const handleDeleteClassClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(onDeleteClass && window.confirm('ATENÇÃO: Excluir esta turma removerá o vínculo com todos os alunos matriculados nela.\n\nDeseja continuar?')) {
          onDeleteClass(id);
      }
  };

  const openEnrollModal = (student: Student) => {
    setStudentToEnroll(student);
    setIsEnrollModalOpen(true);
    setSelectedRemediationClassId('');
  };

  const handleEnrollStudent = () => {
      if (!studentToEnroll || !selectedRemediationClassId || !onUpdateStudent) return;
      onUpdateStudent({
          ...studentToEnroll,
          classId: selectedRemediationClassId,
          remediationEntryDate: new Date().toISOString()
      });
      setIsEnrollModalOpen(false);
      setStudentToEnroll(null);
      setSelectedRemediationClassId('');
  };

  const handleFinishRemediation = (student: Student) => {
      if (!onUpdateStudent) return;
      const confirmMsg = `Confirma que o aluno ${student.name} concluiu o ciclo de reforço? \n\nO aluno será removido desta lista e estará pronto para uma NOVA AVALIAÇÃO no painel geral.`;
      
      if (window.confirm(confirmMsg)) {
          onUpdateStudent({
              ...student,
              remediationExitDate: new Date().toISOString()
          });
      }
  };

  const handleSaveLog = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddLog || !selectedDailyClass || !dailyContent) return;

      onAddLog({
          id: generateId(),
          classId: selectedDailyClass,
          date: dailyDate,
          content: dailyContent,
          attendance: dailyAttendance
      });

      setDailyContent('');
      setDailyAttendance({});
      alert('Chamada e conteúdo salvos com sucesso!');
  };

  const toggleAttendance = (studentId: string) => {
      setDailyAttendance(prev => ({
          ...prev,
          [studentId]: !prev[studentId]
      }));
  };

  const handleDeleteLogClick = (id: string) => {
      if (onDeleteLog && window.confirm('Deseja excluir este registro de aula?')) {
          onDeleteLog(id);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleResetFilters = () => {
      setReportFilterClass('all');
      setReportStartDate('');
      setReportEndDate('');
  };

  // --- Render Functions ---

  const renderOverview = () => (
    <>
      <div className="flex justify-end mb-4 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
          >
              <Printer size={18} /> Imprimir Relatório
          </button>
      </div>

      {/* Cards de Turmas de Reforço Ativas */}
      {remediationClasses.length > 0 && (
          <div className="mb-8">
              <h3 className="text-lg font-bold text-[#433422] mb-4 flex items-center gap-2">
                  <School className="text-[#c48b5e]" size={20} /> Turmas de Reforço Ativas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                  {remediationClasses.map(cls => {
                      const studentCount = students.filter(s => s.classId === cls.id).length;
                      const teacherNames = cls.teacherIds?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || 'Sem professor';
                      
                      return (
                          <div 
                            key={cls.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#c48b5e] p-6 relative group hover:shadow-lg transition-all break-inside-avoid"
                          >
                              {/* Botão de Excluir */}
                              <div className="absolute top-3 right-3 flex gap-1 z-10 print:hidden">
                                  {onDeleteClass && canDelete && (
                                    <button 
                                        onClick={(e) => handleDeleteClassClick(e, cls.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Excluir Turma de Reforço"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                  )}
                              </div>

                              <div className="flex items-start justify-between mb-4 mt-1">
                                <div className="p-3 rounded-xl transition-colors bg-[#fcf9f6] text-[#c48b5e]">
                                    <School size={24} />
                                </div>
                                <div className="flex flex-col items-end mr-6"> 
                                    <span className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded mb-1 font-mono border border-gray-100">
                                    {cls.year}
                                    </span>
                                </div>
                              </div>
                              
                              <h3 className="text-xl font-bold text-[#433422] mb-1 pr-6">{cls.name}</h3>
                              <p className="text-gray-500 text-sm mb-4">Reforço Escolar</p>
                              
                              <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-lg">
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-gray-200">
                                        <UserIcon size={12} className="text-gray-400"/>
                                    </div>
                                    <span className="text-xs text-gray-600 font-medium truncate" title={teacherNames}>{teacherNames}</span>
                              </div>
                              
                              <div className="flex items-center text-gray-500 text-sm font-medium border-t border-gray-100 pt-3">
                                    <Users size={16} className="mr-2 text-[#c48b5e]" />
                                    {studentCount} Alunos Matriculados
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {remediationItems.length === 0 && Object.keys(byClass).length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-12 text-center">
            <ClipboardList className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-green-800 mb-2">Excelente!</h3>
            <p className="text-green-700">Nenhum aluno pendente para reforço no momento.</p>
          </div>
      ) : (
        Object.values(byClass).map(({ classInfo, items }) => (
          <div key={classInfo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 break-inside-avoid">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#433422] text-lg">{classInfo.name}</h3>
                  {classInfo.isRemediation && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-bold">Turma de Reforço</span>}
              </div>
              <span className="text-sm bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-600">
                {items.length} Casos
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map(({ student, skill, assessment }) => (
                <div key={`${student.id}-${assessment.id}`} className="p-6 flex flex-col lg:flex-row gap-6 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[80px]">
                      <div className="w-12 h-12 bg-[#fcf9f6] text-[#c48b5e] rounded-full flex items-center justify-center font-bold text-lg mb-2 overflow-hidden border border-[#eaddcf]">
                        {student.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover"/> : student.name.charAt(0)}
                      </div>
                      <button onClick={() => onSelectStudent(student.id)} className="text-xs text-[#c48b5e] font-medium hover:underline print:hidden">Ver Perfil</button>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#433422]">{student.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${assessment.status === AssessmentStatus.NAO_ATINGIU ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {assessment.status === AssessmentStatus.NAO_ATINGIU ? 'Não Atingiu' : 'Em Desenv.'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-600">
                        <span className="font-mono bg-gray-100 px-1 rounded mr-2 text-xs">{skill.code}</span>
                        {skill.description}
                    </div>
                    {assessment.notes && (
                        <div className="bg-red-50 text-red-800 text-sm p-3 rounded-lg border border-red-100 mt-2">
                          <strong>Diagnóstico:</strong> {assessment.notes}
                        </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center items-end min-w-[140px] gap-2 print:hidden">
                      <span className="text-xs text-gray-400">Avaliado em {new Date(assessment.date).toLocaleDateString()}</span>
                      
                      <button onClick={() => onSelectStudent(student.id)} className="w-full flex items-center justify-center gap-1 text-sm bg-[#eaddcf]/50 text-[#c48b5e] px-3 py-2 rounded-lg hover:bg-[#eaddcf] transition-colors font-medium">
                        Reavaliar <ArrowRight size={14} />
                      </button>

                      {/* Botão de Concluir Reforço */}
                      {onUpdateStudent && !student.remediationExitDate && (
                          <button 
                             onClick={() => handleFinishRemediation(student)}
                             className="w-full flex items-center justify-center gap-1 text-sm bg-[#c48b5e] border border-[#c48b5e] text-white px-3 py-2 rounded-lg hover:bg-[#a0704a] transition-colors font-bold shadow-md hover:shadow-lg"
                             title="Concluir ciclo e liberar para nova avaliação"
                          >
                             Concluir Reforço <CheckCircle size={14} />
                          </button>
                      )}

                      {!classInfo.isRemediation && onUpdateStudent && !student.remediationExitDate && (
                          <button onClick={() => openEnrollModal(student)} className="w-full flex items-center justify-center gap-1 text-sm border border-[#c48b5e] text-[#c48b5e] bg-white px-3 py-2 rounded-lg hover:bg-[#fcf9f6] transition-colors font-medium">
                            Matricular <UserPlus size={14} />
                          </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );

  const renderDailyLog = () => {
     const currentClass = classes.find(c => c.id === selectedDailyClass);
     const studentsInClass = students.filter(s => s.classId === selectedDailyClass);
     const classLogs = logs.filter(l => l.classId === selectedDailyClass).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

     return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Coluna da Esquerda: Formulário (Hidden on print) */}
             <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit print:hidden">
                 <h3 className="font-bold text-[#433422] text-lg mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                     <div className="bg-[#fcf9f6] p-2 rounded-lg text-[#c48b5e]">
                        <BookOpen size={20} /> 
                     </div>
                     Diário de Classe
                 </h3>
                 
                 <div className="mb-4">
                     <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Selecione a Turma</label>
                     <select 
                        value={selectedDailyClass} 
                        onChange={e => setSelectedDailyClass(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-[#433422] transition-all"
                     >
                         <option value="">Selecione...</option>
                         {remediationClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                 </div>

                 {selectedDailyClass && (
                     <form onSubmit={handleSaveLog} className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Data da Aula</label>
                             <input 
                                type="date" 
                                value={dailyDate} 
                                onChange={e => setDailyDate(e.target.value)} 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-[#433422] transition-all" 
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Conteúdo Ministrado</label>
                             <textarea 
                                value={dailyContent} 
                                onChange={e => setDailyContent(e.target.value)} 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-[#433422] transition-all h-28 resize-none"
                                placeholder="Descreva o que foi trabalhado..."
                                required
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Lista de Presença</label>
                             <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                                 {studentsInClass.map(s => (
                                     <div key={s.id} onClick={() => toggleAttendance(s.id)} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all border border-transparent hover:border-gray-100">
                                         {dailyAttendance[s.id] ? <CheckSquare className="text-green-500" size={20} /> : <Square className="text-gray-300" size={20} />}
                                         <span className={`text-sm font-medium ${dailyAttendance[s.id] ? 'text-[#433422]' : 'text-gray-500'}`}>{s.name}</span>
                                     </div>
                                 ))}
                                 {studentsInClass.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sem alunos nesta turma.</p>}
                             </div>
                         </div>
                         <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                             <Save size={18} /> Salvar Registro
                         </button>
                     </form>
                 )}
             </div>

             {/* Coluna da Direita: Histórico */}
             <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:col-span-3">
                 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                     <h3 className="font-bold text-gray-800">Histórico de Aulas</h3>
                     <button 
                        onClick={handlePrint}
                        className="print:hidden text-sm flex items-center gap-1 text-[#c48b5e] hover:underline"
                    >
                        <Printer size={16} /> Imprimir Diário
                    </button>
                 </div>
                 <div className="divide-y divide-gray-100">
                     {selectedDailyClass ? (
                         classLogs.length > 0 ? (
                             classLogs.map(log => {
                                 const presentStudents = students.filter(s => log.attendance?.[s.id]);
                                 const presentCount = presentStudents.length;

                                 return (
                                     <div key={log.id} className="p-5 hover:bg-gray-50 transition-colors break-inside-avoid">
                                         <div className="flex justify-between items-start mb-3">
                                             <div className="flex items-center gap-3">
                                                 <span className="bg-[#fcf9f6] text-[#c48b5e] text-sm font-bold px-3 py-1.5 rounded-lg border border-[#eaddcf] flex items-center gap-1">
                                                     <Calendar size={14} />
                                                     {new Date(log.date).toLocaleDateString()}
                                                 </span>
                                                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                                     Presença: <strong>{presentCount}</strong> / {studentsInClass.length}
                                                 </span>
                                             </div>
                                             {onDeleteLog && canDelete && (
                                                 <button onClick={() => handleDeleteLogClick(log.id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors print:hidden">
                                                     <Trash2 size={16} />
                                                 </button>
                                             )}
                                         </div>
                                         <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                             "{log.content}"
                                         </p>
                                         
                                         <div className="border-t border-gray-100 pt-3">
                                             <p className="text-xs font-bold text-[#c48b5e] mb-2 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Alunos Presentes:
                                             </p>
                                             <div className="flex flex-wrap gap-2">
                                                 {presentStudents.length > 0 ? (
                                                     presentStudents.map(s => (
                                                         <span key={s.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-md font-medium">
                                                             {s.name}
                                                         </span>
                                                     ))
                                                 ) : (
                                                     <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                        Nenhum aluno presente.
                                                     </span>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })
                         ) : (
                             <div className="p-8 text-center text-gray-400">Nenhum registro encontrado para esta turma.</div>
                         )
                     ) : (
                         <div className="p-8 text-center text-gray-400">Selecione uma turma para ver o histórico.</div>
                     )}
                 </div>
             </div>
         </div>
     );
  };

  const renderReport = () => {
      const filteredReportStudents = students.filter(s => {
          const cls = classes.find(c => c.id === s.classId);
          const isRemediationContext = cls?.isRemediation || s.remediationEntryDate;
          
          if (!isRemediationContext) return false;
          if (reportFilterClass !== 'all' && s.classId !== reportFilterClass) return false;

          if (s.remediationEntryDate) {
              const entryDate = s.remediationEntryDate.split('T')[0];
              if (reportStartDate && entryDate < reportStartDate) return false;
              if (reportEndDate && entryDate > reportEndDate) return false;
          } else if (reportStartDate || reportEndDate) {
              return false;
          }

          return true;
      });

      return (
          <>
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium border-r border-gray-200 pr-3 mr-1">
                        <Filter size={16} /> Filtros:
                    </div>
                    
                    <select 
                        value={reportFilterClass}
                        onChange={(e) => setReportFilterClass(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#433422] focus:outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50"
                    >
                        <option value="all">Todas as Turmas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">De:</span>
                        <input 
                            type="date" 
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#433422] focus:outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Até:</span>
                        <input 
                            type="date" 
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#433422] focus:outline-none focus:ring-2 focus:ring-[#c48b5e] bg-gray-50"
                        />
                    </div>

                    {(reportFilterClass !== 'all' || reportStartDate || reportEndDate) && (
                        <button 
                            onClick={handleResetFilters}
                            className="ml-auto p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Limpar Filtros"
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>

                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-[#c48b5e] text-white rounded-xl hover:bg-[#a0704a] font-bold transition-colors shadow-md shadow-[#c48b5e]/20"
                >
                    <Printer size={18} /> Imprimir
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Aluno</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Turma Atual</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Entrada</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Saída</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Permanência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredReportStudents.map(s => {
                            const entry = s.remediationEntryDate ? new Date(s.remediationEntryDate) : null;
                            const exit = s.remediationExitDate ? new Date(s.remediationExitDate) : null;
                            const cls = classes.find(c => c.id === s.classId);

                            let duration = '-';
                            if (entry) {
                                const end = exit || new Date();
                                const diffTime = Math.abs(end.getTime() - entry.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                duration = `${diffDays} dias`;
                            }

                            return (
                                <tr key={s.id}>
                                    <td className="p-4 font-medium text-[#433422]">{s.name}</td>
                                    <td className="p-4 text-sm text-gray-600">{cls?.name || '-'}</td>
                                    <td className="p-4 text-sm text-green-600 font-mono">
                                        {entry ? entry.toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4 text-sm text-red-600 font-mono">
                                        {exit ? exit.toLocaleDateString() : 'Em curso'}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} /> {duration}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredReportStudents.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum registro encontrado com os filtros selecionados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </>
      );
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-3xl font-bold text-[#433422] flex items-center gap-3">
                <AlertTriangle className="text-[#c48b5e]" />
                Gestão de Reforço
            </h2>
            <p className="text-gray-500">Acompanhamento, chamadas e relatórios.</p>
          </div>
          {onAddClass && (
             <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
             >
                <PlusCircle size={18} /> Criar Turma de Reforço
             </button>
          )}
        </div>
        
        {/* Print Header only visible when printing */}
        <div className="hidden print:block mb-8 border-b pb-4">
             <h1 className="text-2xl font-bold text-gray-900">Relatório de Reforço Escolar</h1>
             <p className="text-gray-500">Data de emissão: {new Date().toLocaleDateString()}</p>
             {(reportFilterClass !== 'all' || reportStartDate || reportEndDate) && (
                 <div className="mt-2 text-xs text-gray-400 border p-2 rounded inline-block">
                     Filtros: 
                     {reportFilterClass !== 'all' && ` Turma: ${classes.find(c => c.id === reportFilterClass)?.name} |`}
                     {reportStartDate && ` De: ${new Date(reportStartDate).toLocaleDateString()} |`}
                     {reportEndDate && ` Até: ${new Date(reportEndDate).toLocaleDateString()}`}
                 </div>
             )}
        </div>

        {/* Navigation Tabs (Hidden on print) */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-[#c48b5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Alunos em Risco
            </button>
            <button 
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white text-[#c48b5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Diário de Classe
            </button>
            <button 
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-white text-[#c48b5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Relatório de Permanência
            </button>
        </div>

        {/* Content Area */}
        <div className="mt-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'daily' && renderDailyLog()}
            {activeTab === 'report' && renderReport()}
        </div>

        {/* Modals (Create Class / Enroll) */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#eaddcf]">
                    <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                           <School className="text-[#eaddcf]" size={20} /> Nova Turma de Reforço
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Nome da Turma</label>
                            <input className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="Ex: Reforço Matemática" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                        </div>
                        <div>
                           <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Professor Responsável</label>
                           <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}>
                              <option value="">Selecione...</option>
                              {users.filter(u => u.role !== 'admin').map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                           </select>
                        </div>
                        <div className="pt-2 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleCreateRemediationClass} className="flex-1 px-4 py-3 bg-[#c48b5e] text-white rounded-xl font-bold hover:bg-[#a0704a] shadow-lg">Criar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isEnrollModalOpen && studentToEnroll && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#eaddcf]">
                    <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                           <GraduationCap className="text-white/80" size={20} /> Matricular no Reforço
                        </h3>
                        <button onClick={() => setIsEnrollModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-[#fcf9f6] p-3 rounded-lg border border-[#eaddcf] text-sm text-[#c48b5e]">
                            Você está movendo o aluno <strong>{studentToEnroll.name}</strong> para uma turma de reforço dedicada.
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Selecione a Turma de Reforço</label>
                            <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" value={selectedRemediationClassId} onChange={(e) => setSelectedRemediationClassId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {remediationClasses.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>
                        <div className="pt-2 flex gap-3">
                            <button onClick={() => setIsEnrollModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleEnrollStudent} disabled={!selectedRemediationClassId} className="flex-1 px-4 py-3 bg-[#c48b5e] text-white rounded-xl font-bold hover:bg-[#a0704a] shadow-lg disabled:opacity-50">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
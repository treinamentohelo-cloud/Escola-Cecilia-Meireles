import React, { useState, useEffect } from 'react';
import { ChevronRight, Users, GraduationCap, Plus, Camera, Calendar, Phone, User as UserIcon, Edit2, Trash2, ArrowLeft, X, Target, BookOpen, Save, CheckSquare, Square, Clock, Archive, RefreshCcw, Check, School, Search, Filter, ChevronDown, ChevronUp, Hash, ExternalLink, UserCheck, Upload, AlertTriangle, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { ClassGroup, Student, User, ClassDailyLog } from '../types';

interface ClassListProps {
  classes: ClassGroup[];
  students: Student[];
  users: User[];
  logs?: ClassDailyLog[];
  selectedClassId?: string;
  currentUser: User | null;
  onSelectClass: (id: string) => void;
  onSelectStudent: (id: string) => void;
  onAddClass: (c: ClassGroup) => void;
  onUpdateClass: (c: ClassGroup) => void;
  onDeleteClass: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: 'active' | 'inactive') => void;
  onAddStudent: (s: Student) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onToggleStudentStatus: (id: string, currentStatus: 'active' | 'inactive') => void;
  onAddLog?: (l: ClassDailyLog) => void;
  onDeleteLog?: (id: string) => void;
}

export const ClassList: React.FC<ClassListProps> = ({ 
  classes, 
  students,
  users,
  logs = [],
  selectedClassId, 
  currentUser,
  onSelectClass,
  onSelectStudent,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onToggleStatus,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onToggleStudentStatus,
  onAddLog,
  onDeleteLog
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'diary'>('students');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [studentsToTransfer, setStudentsToTransfer] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('all');

  const canDelete = currentUser?.role !== 'professor';

  // Class Form State (Updated for multi-teacher)
  const [classFormData, setClassFormData] = useState<Partial<ClassGroup>>({
    name: '',
    grade: '',
    year: new Date().getFullYear(),
    shift: 'Matutino',
    teacherIds: [], 
    status: 'active'
  });

  // Student Form State
  const [studentFormData, setStudentFormData] = useState<Partial<Student>>({
    name: '',
    avatarUrl: '',
    registrationNumber: '',
    birthDate: '',
    parentName: '',
    phone: '',
    status: 'active'
  });

  // Diary Form State
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLogContent, setNewLogContent] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  // Helper to filter classes
  const filterClasses = (list: ClassGroup[]) => {
    return list.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.grade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShift = filterShift === 'all' || c.shift === filterShift;
      return matchesSearch && matchesShift;
    });
  };

  // Filter active/inactive classes
  const regularClasses = classes.filter(c => !c.isRemediation);
  const activeClassesList = filterClasses(regularClasses.filter(c => c.status !== 'inactive'));
  const inactiveClassesList = filterClasses(regularClasses.filter(c => c.status === 'inactive'));

  const activeClass = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
  const filteredStudents = selectedClassId 
    ? students.filter(s => s.classId === selectedClassId) 
    : [];
  
  const classLogs = activeClass 
    ? logs.filter(l => l.classId === activeClass.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // --- Transfer Logic ---
  const sourceStudents = students.filter(s => s.classId === transferSourceId && s.status === 'active');

  const handleToggleTransferStudent = (studentId: string) => {
      setStudentsToTransfer(prev => 
          prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
      );
  };

  const handleSelectAllTransfer = () => {
      if (studentsToTransfer.length === sourceStudents.length) {
          setStudentsToTransfer([]);
      } else {
          setStudentsToTransfer(sourceStudents.map(s => s.id));
      }
  };

  const handleExecuteTransfer = () => {
      if (!transferTargetId || studentsToTransfer.length === 0) return;

      if (window.confirm(`Confirma a transferência de ${studentsToTransfer.length} alunos?`)) {
          studentsToTransfer.forEach(studentId => {
              const student = students.find(s => s.id === studentId);
              if (student) {
                  onUpdateStudent({ ...student, classId: transferTargetId });
              }
          });
          alert("Transferência realizada com sucesso!");
          setIsTransferModalOpen(false);
          setTransferSourceId('');
          setTransferTargetId('');
          setStudentsToTransfer([]);
      }
  };

  // --- Other Handlers ---

  const handleEditClassClick = (e: React.MouseEvent, cls: ClassGroup) => {
      e.stopPropagation();
      setEditingClassId(cls.id);
      setClassFormData({
          name: cls.name,
          grade: cls.grade,
          year: cls.year,
          shift: cls.shift,
          teacherIds: cls.teacherIds || [],
          status: cls.status
      });
      setIsClassModalOpen(true);
  };

  const handleToggleStatusClick = (e: React.MouseEvent, cls: ClassGroup) => {
      e.stopPropagation();
      const confirmMsg = cls.status === 'active' 
         ? `Deseja ARQUIVAR a turma "${cls.name}"?\n\nEla ficará oculta nas listagens principais, mas o histórico será preservado.`
         : `Deseja REATIVAR a turma "${cls.name}"?`;
      
      if(window.confirm(confirmMsg)) {
          onToggleStatus(cls.id, cls.status || 'active');
      }
  };

  const handleDeleteClassClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('ATENÇÃO: Deseja excluir PERMANENTEMENTE esta turma? Esta ação não pode ser desfeita.')) {
          onDeleteClass(id);
      }
  };

  const handleToggleStudentClick = (e: React.MouseEvent, student: Student) => {
      e.stopPropagation();
      const confirmMsg = student.status === 'active' 
        ? `Deseja INATIVAR o aluno ${student.name}?\n\nEle não aparecerá nas chamadas, mas o histórico será mantido.`
        : `Deseja REATIVAR o aluno ${student.name}?`;

      if(window.confirm(confirmMsg)) {
        onToggleStudentStatus(student.id, student.status || 'active');
      }
  }

  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const toggleTeacherSelection = (teacherId: string) => {
      setClassFormData(prev => {
          const currentIds = prev.teacherIds || [];
          if (currentIds.includes(teacherId)) {
              return { ...prev, teacherIds: currentIds.filter(id => id !== teacherId) };
          } else {
              return { ...prev, teacherIds: [...currentIds, teacherId] };
          }
      });
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.name || !classFormData.grade) return;

    const payload: ClassGroup = {
        id: editingClassId || generateId(),
        name: classFormData.name!,
        grade: classFormData.grade!,
        year: classFormData.year || new Date().getFullYear(),
        shift: classFormData.shift as 'Matutino' | 'Vespertino' | 'Integral' | 'Noturno',
        teacherIds: classFormData.teacherIds || [],
        status: classFormData.status as 'active' | 'inactive',
        isRemediation: false
    };

    if (editingClassId) {
        onUpdateClass(payload);
    } else {
        onAddClass(payload);
    }
    
    setIsClassModalOpen(false);
    setClassFormData({ name: '', grade: '', year: new Date().getFullYear(), shift: 'Matutino', teacherIds: [], status: 'active' });
    setEditingClassId(null);
  };

  // Helper para upload de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !studentFormData.name) return;

    onAddStudent({
      id: generateId(),
      classId: activeClass.id,
      name: studentFormData.name!,
      avatarUrl: studentFormData.avatarUrl,
      registrationNumber: studentFormData.registrationNumber,
      birthDate: studentFormData.birthDate,
      parentName: studentFormData.parentName,
      phone: studentFormData.phone,
      status: studentFormData.status as 'active' | 'inactive'
    });

    setIsStudentModalOpen(false);
    setStudentFormData({ name: '', avatarUrl: '', registrationNumber: '', birthDate: '', parentName: '', phone: '', status: 'active' });
  };

  const handleToggleAttendance = (studentId: string) => {
      setAttendance(prev => ({
          ...prev,
          [studentId]: !prev[studentId]
      }));
  };

  const handleSaveLog = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddLog || !activeClass || !newLogContent) return;

      onAddLog({
          id: generateId(),
          classId: activeClass.id,
          date: newLogDate,
          content: newLogContent,
          attendance: attendance
      });

      setNewLogContent('');
      setAttendance({});
      alert('Registro de aula salvo com sucesso!');
  };

  const handleDeleteLogClick = (id: string) => {
    if(onDeleteLog && window.confirm('Deseja excluir este registro?')) {
        onDeleteLog(id);
    }
  }

  // Se uma turma está selecionada, mostra a view de detalhes
  if (selectedClassId && activeClass) {
    const activeStudents = filteredStudents.filter(s => s.status !== 'inactive');
    const inactiveStudents = filteredStudents.filter(s => s.status === 'inactive');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onSelectClass('')}
            className="flex items-center text-gray-500 hover:text-[#c48b5e] transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" /> Voltar para Turmas
          </button>
          
          <div className="flex gap-2">
              <button 
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'students' ? 'bg-[#c48b5e] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                  Alunos
              </button>
              <button 
                  onClick={() => setActiveTab('diary')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'diary' ? 'bg-[#c48b5e] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
              >
                  Diário de Classe
              </button>
          </div>
        </div>

        {/* HEADER DA TURMA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-[#c48b5e] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#c48b5e]/30">
                <GraduationCap size={32} />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-[#433422]">{activeClass.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8c7e72] mt-1">
                   <span className="flex items-center gap-1"><Target size={14}/> {activeClass.grade}</span>
                   <span className="flex items-center gap-1"><Calendar size={14}/> {activeClass.year}</span>
                   <span className="flex items-center gap-1"><Clock size={14}/> {activeClass.shift}</span>
                </div>
                <div className="mt-2 text-xs flex items-center gap-1 text-[#8c7e72]">
                   <UserIcon size={12} /> 
                   <span className="font-semibold">Professores:</span>
                   {activeClass.teacherIds && activeClass.teacherIds.length > 0 ? (
                       <span>
                           {activeClass.teacherIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ')}
                       </span>
                   ) : (
                       <span className="italic text-gray-400">Não atribuído</span>
                   )}
                </div>
             </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <span className="bg-[#fcf9f6] text-[#c48b5e] px-4 py-2 rounded-xl font-bold border border-[#eaddcf] text-sm">
                {activeStudents.length} Alunos Ativos
             </span>
             {activeTab === 'students' && (
                 <button 
                    onClick={() => setIsStudentModalOpen(true)}
                    className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-medium text-sm transition-all"
                 >
                    <Plus size={16} /> Novo Aluno
                 </button>
             )}
          </div>
        </div>

        {activeTab === 'students' ? (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* ALUNOS ATIVOS - CARD COMPLETO SEMPRE VISÍVEL */}
                    {activeStudents.map(student => {
                        return (
                            <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:border-[#c48b5e] hover:shadow-md transition-all">
                                
                                {/* Header: Avatar + Nome + Status */}
                                <div className="flex items-start gap-4">
                                    {student.avatarUrl ? (
                                        <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-[#fcf9f6] text-[#c48b5e] flex items-center justify-center font-bold text-2xl border border-[#eaddcf]">
                                            {student.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-[#433422] leading-tight mb-1 line-clamp-2">{student.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {student.remediationEntryDate && !student.remediationExitDate && (
                                                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 font-medium flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Reforço
                                                </span>
                                            )}
                                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-medium">Ativo</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Body: Informações Detalhadas (Sempre Visíveis) */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-[10px] uppercase font-bold text-[#8c7e72] tracking-wider mb-0.5 flex items-center gap-1">
                                            <Hash size={10} /> Matrícula
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">{student.registrationNumber || '-'}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-[10px] uppercase font-bold text-[#8c7e72] tracking-wider mb-0.5 flex items-center gap-1">
                                            <Phone size={10} /> Contato
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">{student.phone || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] uppercase font-bold text-[#8c7e72] tracking-wider mb-0.5 flex items-center gap-1">
                                            <UserCheck size={10} /> Responsável
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700 truncate" title={student.parentName}>{student.parentName || '-'}</p>
                                    </div>
                                </div>

                                {/* Footer: Ações */}
                                <div className="flex gap-2 mt-auto pt-2">
                                    <button 
                                        onClick={() => onSelectStudent(student.id)}
                                        className="flex-1 bg-[#c48b5e] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#a0704a] transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={14} /> Ver Perfil
                                    </button>
                                    <button 
                                        onClick={(e) => handleToggleStudentClick(e, student)}
                                        className="px-3 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
                                        title="Arquivar"
                                    >
                                        <Archive size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ALUNOS INATIVOS (Visualmente diferentes e mais visíveis agora) */}
                {inactiveStudents.length > 0 && (
                    <div className="mt-10 border-t border-gray-200 pt-8">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Archive size={14} /> Arquivados ({inactiveStudents.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveStudents.map(student => (
                                <div 
                                    key={student.id} 
                                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:bg-white hover:border-[#eaddcf] transition-all flex items-center justify-between group shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-lg border border-gray-300">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-600 line-through decoration-gray-400">{student.name}</h3>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold bg-gray-200 px-1.5 py-0.5 rounded w-fit mt-0.5">Inativo</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleToggleStudentClick(e, student)}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                        title="Reativar Aluno"
                                    >
                                        <RefreshCcw size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeStudents.length === 0 && inactiveStudents.length === 0 && (
                    <div className="py-16 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="text-gray-300" size={32} />
                        </div>
                        <p className="font-medium text-gray-500">Nenhum aluno cadastrado nesta turma.</p>
                        <button onClick={() => setIsStudentModalOpen(true)} className="text-[#c48b5e] font-bold hover:underline mt-2 text-sm">
                            Cadastrar Primeiro Aluno
                        </button>
                    </div>
                )}
             </div>
        ) : (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* FORMULÁRIO DO DIÁRIO */}
                 <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                     <h3 className="font-bold text-[#000039] text-lg mb-4 flex items-center gap-2">
                         <BookOpen className="text-[#c48b5e]" size={20} /> Novo Registro
                     </h3>
                     <form onSubmit={handleSaveLog} className="space-y-4">
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
                             <input 
                                type="date"
                                required 
                                value={newLogDate}
                                onChange={e => setNewLogDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1">Conteúdo</label>
                             <textarea 
                                required
                                value={newLogContent}
                                onChange={e => setNewLogContent(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white h-32 resize-none"
                                placeholder="O que foi ensinado hoje?"
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-2">Chamada</label>
                             <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                                 {activeStudents.map(s => (
                                     <div 
                                        key={s.id} 
                                        onClick={() => handleToggleAttendance(s.id)}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                                     >
                                         {attendance[s.id] ? <CheckSquare className="text-green-500" size={20} /> : <Square className="text-gray-300" size={20} />}
                                         <span className="text-sm text-gray-700">{s.name}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <button type="submit" className="w-full bg-[#c48b5e] text-white py-3 rounded-xl font-bold hover:bg-[#a0704a] flex items-center justify-center gap-2 shadow-md">
                             <Save size={18} /> Salvar Aula
                         </button>
                     </form>
                 </div>

                 {/* HISTÓRICO DO DIÁRIO */}
                 <div className="lg:col-span-2 space-y-4">
                     {classLogs.length > 0 ? classLogs.map(log => {
                         const presentCount = activeStudents.filter(s => log.attendance?.[s.id]).length;
                         return (
                             <div key={log.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-[#eaddcf] transition-all">
                                 <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-3">
                                         <span className="bg-[#eaddcf] text-[#c48b5e] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                             <Calendar size={12} /> {new Date(log.date).toLocaleDateString()}
                                         </span>
                                         <span className="text-xs text-gray-500">
                                             Presença: <strong>{presentCount}</strong>/{activeStudents.length}
                                         </span>
                                     </div>
                                     {onDeleteLog && canDelete && (
                                         <button onClick={() => handleDeleteLogClick(log.id)} className="text-gray-400 hover:text-red-500">
                                             <Trash2 size={16} />
                                         </button>
                                     )}
                                 </div>
                                 <p className="text-gray-700 text-sm whitespace-pre-wrap">{log.content}</p>
                             </div>
                         );
                     }) : (
                         <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
                             <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                             <p>Nenhum registro de aula nesta turma.</p>
                         </div>
                     )}
                 </div>
             </div>
        )}

        {/* Modal Novo Aluno (CADASTRO COMPLETO) */}
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-5 bg-[#c48b5e] flex justify-between items-center">
                   <h3 className="font-bold text-white text-lg flex items-center gap-2"><UserIcon size={20} className="text-white/80" /> Novo Cadastro de Aluno</h3>
                   <button onClick={() => setIsStudentModalOpen(false)} className="text-white/80 hover:text-white"><X size={24}/></button>
                </div>
                <form onSubmit={handleCreateStudent} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                   
                   {/* Avatar Upload */}
                   <div className="flex flex-col items-center gap-3 mb-2">
                        <div className="w-24 h-24 bg-[#fcf9f6] rounded-full flex items-center justify-center border-2 border-dashed border-[#c48b5e]/30 overflow-hidden relative group">
                           {studentFormData.avatarUrl ? (
                               <img src={studentFormData.avatarUrl} className="w-full h-full object-cover" />
                           ) : (
                               <Camera className="text-[#c48b5e] w-8 h-8" />
                           )}
                           <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                               <Upload className="text-white" size={20} />
                               <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                           </label>
                        </div>
                        <div className="w-full text-center">
                           <label className="text-xs text-[#c48b5e] font-bold cursor-pointer hover:underline">
                               Adicionar Foto
                               <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                           </label>
                        </div>
                   </div>

                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                       <input 
                          required 
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          value={studentFormData.name}
                          onChange={e => setStudentFormData({...studentFormData, name: e.target.value})}
                          placeholder="Ex: João da Silva"
                       />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Matrícula</label>
                           <input 
                              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              value={studentFormData.registrationNumber}
                              onChange={e => setStudentFormData({...studentFormData, registrationNumber: e.target.value})}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Nascimento</label>
                           <input 
                              type="date"
                              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              value={studentFormData.birthDate}
                              onChange={e => setStudentFormData({...studentFormData, birthDate: e.target.value})}
                           />
                       </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Responsável</label>
                            <input 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={studentFormData.parentName}
                                onChange={e => setStudentFormData({...studentFormData, parentName: e.target.value})}
                                placeholder="Nome do Pai/Mãe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                            <input 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={studentFormData.phone}
                                onChange={e => setStudentFormData({...studentFormData, phone: e.target.value})}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                   </div>

                   <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-md mt-4 transition-transform hover:-translate-y-0.5">
                       Confirmar Cadastro
                   </button>
                </form>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Lista de Turmas (Cards)
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422]">Minhas Turmas</h2>
           <p className="text-[#8c7e72]">Gerenciamento de salas e alunos</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="bg-white border border-[#eaddcf] text-[#c48b5e] hover:bg-[#fcf9f6] px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all"
            >
              <ArrowRightLeft size={18} /> Transferir / Promover
            </button>
            <button 
              onClick={() => { setEditingClassId(null); setClassFormData({ name: '', grade: '', year: new Date().getFullYear(), shift: 'Matutino', teacherIds: [], status: 'active' }); setIsClassModalOpen(true); }}
              className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
            >
              <Plus size={18} /> Nova Turma
            </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#eaddcf] mb-6">
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                  type="text"
                  placeholder="Buscar por nome ou série..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none bg-white text-black placeholder-gray-500"
              />
          </div>
          <div className="w-full md:w-48 relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select 
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-[#433422]"
              >
                  <option value="all">Todos os Turnos</option>
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Integral">Integral</option>
                  <option value="Noturno">Noturno</option>
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeClassesList.map(cls => {
            const studentCount = students.filter(s => s.classId === cls.id && s.status !== 'inactive').length;
            
            return (
              <div key={cls.id} onClick={() => onSelectClass(cls.id)} className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] hover:border-[#c48b5e] hover:shadow-lg transition-all cursor-pointer group relative">
                <div className="flex items-start justify-between mb-4">
                   <div className="p-3 bg-[#fcf9f6] rounded-xl text-[#c48b5e] group-hover:bg-[#c48b5e] group-hover:text-white transition-colors">
                      <GraduationCap size={24} />
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                       <button 
                         onClick={(e) => handleEditClassClick(e, cls)} 
                         className="p-2 text-gray-400 hover:text-[#c48b5e] hover:bg-[#fcf9f6] rounded-lg"
                         title="Editar Turma"
                       >
                           <Edit2 size={16} />
                       </button>
                       <button 
                         onClick={(e) => handleToggleStatusClick(e, cls)} 
                         className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                         title="Arquivar Turma"
                       >
                           <Archive size={16} />
                       </button>
                       {canDelete && (
                         <button 
                           onClick={(e) => handleDeleteClassClick(e, cls.id)} 
                           className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                           title="Excluir Turma"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                   </div>
                </div>
                
                <h3 className="text-xl font-bold text-[#433422] mb-1">{cls.name}</h3>
                <p className="text-sm text-[#8c7e72] mb-4">{cls.grade} • {cls.shift}</p>
                
                {/* Professor List in Card */}
                <div className="flex items-center gap-2 mb-4 bg-[#fcf9f6] p-2 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-[#eaddcf]">
                        <UserIcon size={12} className="text-[#c48b5e]"/>
                    </div>
                    <div className="flex-1 overflow-hidden">
                         {cls.teacherIds && cls.teacherIds.length > 0 ? (
                             <span className="text-xs text-[#8c7e72] font-medium truncate block" title={cls.teacherIds.map(id => users.find(u => u.id === id)?.name).join(', ')}>
                                 {cls.teacherIds.map(id => users.find(u => u.id === id)?.name.split(' ')[0]).join(', ')}
                             </span>
                         ) : (
                             <span className="text-xs text-gray-400 italic">Sem professor</span>
                         )}
                    </div>
                </div>
                
                <div className="flex items-center text-[#8c7e72] text-sm font-medium border-t border-[#fcf9f6] pt-3">
                    <Users size={16} className="mr-2" />
                    {studentCount} Alunos
                </div>
              </div>
            );
        })}

        {/* INACTIVE CLASSES */}
        {inactiveClassesList.length > 0 && (
             <div className="col-span-full mt-8">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Archive size={16} /> Turmas Arquivadas
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {inactiveClassesList.map(cls => (
                         <div key={cls.id} className="bg-gray-50 p-6 rounded-xl border border-gray-200 opacity-75 hover:opacity-100 transition-all flex flex-col justify-between">
                             <div>
                                 <h3 className="text-lg font-bold text-gray-600 mb-1">{cls.name}</h3>
                                 <p className="text-xs text-gray-500 mb-2">{cls.grade} • {cls.year}</p>
                             </div>
                             <div className="flex justify-end">
                                 <button 
                                     onClick={(e) => handleToggleStatusClick(e, cls)}
                                     className="flex items-center gap-2 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-200"
                                 >
                                     <RefreshCcw size={12} /> Reativar
                                 </button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {activeClassesList.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
                <p>Nenhuma turma encontrada com os filtros selecionados.</p>
            </div>
        )}

        {/* Create Card */}
        <button 
          onClick={() => { setEditingClassId(null); setClassFormData({ name: '', grade: '', year: new Date().getFullYear(), shift: 'Matutino', teacherIds: [], status: 'active' }); setIsClassModalOpen(true); }}
          className="bg-[#fcf9f6] p-6 rounded-xl border-2 border-dashed border-[#eaddcf] flex flex-col items-center justify-center text-[#c48b5e] hover:bg-[#eaddcf]/20 hover:border-[#c48b5e] transition-all min-h-[200px] group"
        >
           <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Plus size={24} />
           </div>
           <span className="font-bold">Criar Nova Turma</span>
        </button>
      </div>

      {/* Modal Criar/Editar Turma */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                   <School className="text-[#eaddcf]" /> {editingClassId ? 'Editar Turma' : 'Nova Turma'}
                </h3>
                <button onClick={() => setIsClassModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleCreateClass} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Turma</label>
                    <input 
                       required
                       className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                       placeholder="Ex: 1º Ano A"
                       value={classFormData.name}
                       onChange={e => setClassFormData({...classFormData, name: e.target.value})}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Série / Grau</label>
                        <input 
                           required
                           className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                           placeholder="Ex: Fundamental I"
                           value={classFormData.grade}
                           onChange={e => setClassFormData({...classFormData, grade: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ano Letivo</label>
                        <input 
                           type="number"
                           required
                           className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                           value={classFormData.year}
                           onChange={e => setClassFormData({...classFormData, year: Number(e.target.value)})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Turno</label>
                    <select 
                       className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                       value={classFormData.shift}
                       onChange={e => setClassFormData({...classFormData, shift: e.target.value as any})}
                    >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Integral">Integral</option>
                        <option value="Noturno">Noturno</option>
                    </select>
                </div>

                {/* Multi-Teacher Selection */}
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professores Responsáveis</label>
                   <div className="border border-gray-300 rounded-xl p-3 max-h-40 overflow-y-auto bg-white">
                      {users.filter(u => u.role !== 'admin').map(u => (
                        <div 
                           key={u.id} 
                           onClick={() => toggleTeacherSelection(u.id)} 
                           className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors border border-transparent hover:border-gray-100"
                        >
                           <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${classFormData.teacherIds?.includes(u.id) ? 'bg-[#c48b5e] border-[#c48b5e]' : 'border-gray-300 bg-white'}`}>
                              {classFormData.teacherIds?.includes(u.id) && <Check size={14} className="text-white" />}
                           </div>
                           <span className="text-sm text-gray-900 font-medium">{u.name}</span>
                        </div>
                      ))}
                      {users.filter(u => u.role !== 'admin').length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">Nenhum professor cadastrado.</p>
                      )}
                   </div>
                   <p className="text-[10px] text-gray-400 mt-1 ml-1">* Selecione um ou mais professores para esta turma.</p>
                </div>

                <div className="pt-2">
                    <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5">
                       {editingClassId ? 'Salvar Alterações' : 'Criar Turma'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal de Transferência em Lote */}
      {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf] h-[80vh] flex flex-col">
               <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center shrink-0">
                   <h3 className="font-bold text-xl text-white flex items-center gap-2">
                      <ArrowRightLeft className="text-[#eaddcf]" size={24} /> Transferir / Promover Alunos
                   </h3>
                   <button onClick={() => setIsTransferModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                      <X size={24} />
                   </button>
               </div>
               
               <div className="p-6 flex-1 overflow-y-auto flex flex-col">
                   {/* Seleção de Origem e Destino */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase">De (Origem)</label>
                           <select 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-gray-900"
                                value={transferSourceId}
                                onChange={e => { setTransferSourceId(e.target.value); setStudentsToTransfer([]); }}
                           >
                                <option value="">Selecione a turma...</option>
                                {classes.filter(c => c.status !== 'inactive').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                       </div>
                       
                       <div className="flex items-center justify-center md:hidden">
                           <ArrowDownIcon />
                       </div>

                       <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase">Para (Destino)</label>
                           <select 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-gray-900"
                                value={transferTargetId}
                                onChange={e => setTransferTargetId(e.target.value)}
                                disabled={!transferSourceId}
                           >
                                <option value="">Selecione a turma...</option>
                                {classes.filter(c => c.status !== 'inactive' && c.id !== transferSourceId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                       </div>
                   </div>

                   {/* Lista de Seleção de Alunos */}
                   {transferSourceId && (
                       <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden">
                           <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                               <h4 className="font-bold text-gray-700 text-sm">Alunos Disponíveis ({sourceStudents.length})</h4>
                               <button 
                                    onClick={handleSelectAllTransfer}
                                    className="text-xs font-bold text-[#c48b5e] hover:underline"
                               >
                                    {studentsToTransfer.length === sourceStudents.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                               </button>
                           </div>
                           <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                               {sourceStudents.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">Nenhum aluno ativo nesta turma.</p>}
                               {sourceStudents.map(student => (
                                   <div 
                                      key={student.id} 
                                      onClick={() => handleToggleTransferStudent(student.id)}
                                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${studentsToTransfer.includes(student.id) ? 'bg-[#fcf9f6] border-[#c48b5e]' : 'border-transparent hover:bg-gray-50'}`}
                                   >
                                       <div className="flex items-center gap-3">
                                           {studentsToTransfer.includes(student.id) ? <CheckSquare className="text-[#c48b5e]" size={20}/> : <Square className="text-gray-300" size={20}/>}
                                           <span className="text-sm font-medium text-gray-700">{student.name}</span>
                                       </div>
                                       <span className="text-xs text-gray-400 font-mono">{student.registrationNumber}</span>
                                   </div>
                               ))}
                           </div>
                           <div className="p-3 bg-gray-50 border-t border-gray-200 text-right text-xs text-gray-500">
                               {studentsToTransfer.length} alunos selecionados
                           </div>
                       </div>
                   )}
               </div>

               <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
                   <button 
                        onClick={() => setIsTransferModalOpen(false)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                   >
                        Cancelar
                   </button>
                   <button 
                        onClick={handleExecuteTransfer}
                        disabled={!transferTargetId || studentsToTransfer.length === 0}
                        className="flex-1 px-4 py-3 bg-[#c48b5e] text-white rounded-xl font-bold hover:bg-[#a0704a] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                        <ArrowRight size={18} /> Confirmar Transferência
                   </button>
               </div>
            </div>
          </div>
      )}
    </div>
  );
};

const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
);
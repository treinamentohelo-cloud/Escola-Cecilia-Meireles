import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  School, 
  BookOpen, 
  AlertTriangle, 
  LogOut, 
  LayoutDashboard, 
  Loader2, 
  Users, 
  GraduationCap, 
  ClipboardCheck,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
  X
} from 'lucide-react';
import { api } from './supabaseClient'; // Agora importamos nosso cliente API customizado
import { Dashboard } from './components/Dashboard';
import { ClassList } from './components/ClassList';
import { StudentManager } from './components/StudentManager';
import { AssessmentManager } from './components/AssessmentManager';
import { RemediationList } from './components/RemediationList';
import { Login } from './components/Login';
import { SkillManager } from './components/SkillManager';
import { StudentDetail } from './components/StudentDetail';
import { UserManager } from './components/UserManager';
import { 
  ClassGroup, 
  Student, 
  Skill, 
  Assessment, 
  AssessmentStatus, 
  Page, 
  User,
  ClassDailyLog,
  Subject
} from './types';

// --- Mapeadores de Banco de Dados (Snake Case -> Camel Case) ---

const mapClassFromDB = (c: any): ClassGroup => ({
  id: c.id,
  name: c.name,
  grade: c.grade,
  year: Number(c.year),
  shift: c.shift,
  status: c.status,
  // Parse JSON string se vier como string do PHP
  teacherIds: parseJsonField(c.teacher_ids) || (c.teacher_id ? [c.teacher_id] : []),
  isRemediation: Boolean(Number(c.is_remediation)), // PHP retorna 0 ou 1
  focusSkills: parseJsonField(c.focus_skills) || []
});

const mapStudentFromDB = (s: any): Student => ({
  id: s.id,
  name: s.name,
  classId: s.class_id,
  avatarUrl: s.avatar_url,
  registrationNumber: s.registration_number,
  birthDate: s.birth_date,
  parentName: s.parent_name,
  phone: s.phone,
  status: s.status,
  remediationEntryDate: s.remediation_entry_date,
  remediationExitDate: s.remediation_exit_date
});

const mapAssessmentFromDB = (a: any): Assessment => ({
  id: a.id,
  studentId: a.student_id,
  skillId: a.skill_id,
  date: a.date,
  status: a.status as AssessmentStatus,
  term: a.term,
  notes: a.notes,
  participationScore: a.participation_score !== null ? Number(a.participation_score) : undefined,
  behaviorScore: a.behavior_score !== null ? Number(a.behavior_score) : undefined,
  examScore: a.exam_score !== null ? Number(a.exam_score) : undefined
});

const mapLogFromDB = (l: any): ClassDailyLog => ({
  id: l.id,
  classId: l.class_id,
  date: l.date,
  content: l.content,
  attendance: parseJsonField(l.attendance) || {}
});

const mapSkillFromDB = (s: any): Skill => ({
    id: s.id,
    code: s.code,
    description: s.description,
    subject: s.subject || 'Geral',
    year: s.year || '' 
});

// Helper para tratar campos JSON que podem vir como string do MySQL
function parseJsonField(field: any) {
    if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return null; }
    }
    return field;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('school_app_user'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('school_app_user');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<boolean>(false); // Connection status
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar state
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ClassDailyLog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Configuração Global
  const [schoolName, setSchoolName] = useState('Escola Olavo Bilac');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState('');

  // Check connection and fetch public settings on mount
  useEffect(() => {
    const init = async () => {
       const status = await api.checkConnection();
       setApiStatus(status);
       fetchSettings();
    };
    init();
  }, []);

  // Update document title
  useEffect(() => {
      document.title = schoolName;
  }, [schoolName]);

  const fetchSettings = async () => {
      try {
          const settings = await api.get('settings');
          if (Array.isArray(settings)) {
              const nameSetting = settings.find((s: any) => s.id === 'school_name');
              if (nameSetting) setSchoolName(nameSetting.value);
          }
      } catch (err) { console.error('Erro ao buscar configurações', err); }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [cl, st, sk, ass, us, lg, sb] = await Promise.all([
        api.get('classes'),
        api.get('students'),
        api.get('skills'),
        api.get('assessments'),
        api.get('users'),
        api.get('class_daily_logs'),
        api.get('subjects')
      ]);

      setClasses(Array.isArray(cl) ? cl.map(mapClassFromDB) : []);
      setStudents(Array.isArray(st) ? st.map(mapStudentFromDB) : []);
      setSkills(Array.isArray(sk) ? sk.map(mapSkillFromDB) : []);
      setAssessments(Array.isArray(ass) ? ass.map(mapAssessmentFromDB) : []);
      setUsers(Array.isArray(us) ? us : []); 
      setLogs(Array.isArray(lg) ? lg.map(mapLogFromDB) : []);
      
      if (Array.isArray(sb) && sb.length > 0) {
        setSubjects(sb.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      } else {
        setSubjects([
            { id: '1', name: 'Língua Portuguesa' },
            { id: '2', name: 'Matemática' },
            { id: '3', name: 'Ciências' },
            { id: '4', name: 'História' },
            { id: '5', name: 'Geografia' }
        ]);
      }
      setApiStatus(true); // Success implies online
      fetchSettings(); // Refresh settings too

    } catch (err) {
      console.error('Erro crítico ao buscar dados:', err);
      setApiStatus(false);
      // alert('Ocorreu um erro ao carregar os dados. Verifique a conexão com a API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        fetchData();
        setCurrentPage('dashboard');
    }
  }, [isAuthenticated]);

  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    const user = await api.login(email, pass);
    
    if (user) {
        if (user.status === 'inactive') {
            alert('Acesso negado: Usuário inativo. Contate o administrador.');
            return false;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('school_app_user', JSON.stringify(user));
        setCurrentPage('dashboard');
        return true;
    }

    // Admin Backdoor
    if (email === 'admin@escola.com' && pass === '123456') {
      const activeUser = { id: 'admin-fallback', name: 'Admin Master', email: 'admin@escola.com', role: 'admin' as const, status: 'active' as const };
      setCurrentUser(activeUser);
      setIsAuthenticated(true);
      localStorage.setItem('school_app_user', JSON.stringify(activeUser));
      setCurrentPage('dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('school_app_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // O put/update do SupabaseClient/API usa a chave primária
          await api.put('settings', 'school_name', { id: 'school_name', value: tempSchoolName });
          setSchoolName(tempSchoolName);
          setIsSettingsModalOpen(false);
          alert('Configurações salvas com sucesso!');
      } catch (e: any) {
          alert('Erro ao salvar configurações: ' + e.message);
      }
  };

  // --- CRUD OPERATIONS (Usando nova API) ---

  const handleAddAssessment = async (a: Assessment) => {
    try {
      await api.post('assessments', a);

      // Automação Reforço
      const student = students.find(s => s.id === a.studentId);
      if (student) {
          const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format MySQL DATETIME
          let updateData: any = {};

          if (a.status === AssessmentStatus.ATINGIU || a.status === AssessmentStatus.SUPEROU) {
              if (student.remediationEntryDate && !student.remediationExitDate) {
                  updateData = { remediationExitDate: now };
                  alert(`🎉 Saída automática do Reforço registrada!`);
              }
          }
          else if (a.status === AssessmentStatus.NAO_ATINGIU || a.status === AssessmentStatus.EM_DESENVOLVIMENTO) {
              if (!student.remediationEntryDate || student.remediationExitDate) {
                  updateData = { remediationEntryDate: now, remediationExitDate: null };
                  alert(`⚠️ Aluno adicionado ao Reforço Escolar.`);
              }
          }

          if (Object.keys(updateData).length > 0) {
              await api.put('students', student.id, updateData);
          }
      }
      await fetchData();
    } catch (e: any) { alert('Erro ao salvar: ' + e.message); }
  };

  const handleDeleteAssessment = async (id: string) => {
      try { await api.delete('assessments', id); await fetchData(); } catch(e: any) { alert('Erro: ' + e.message); }
  }

  const handleAddClass = async (c: ClassGroup) => {
    try { await api.post('classes', c); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleUpdateClass = async (c: ClassGroup) => {
      try { await api.put('classes', c.id, c); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleToggleClassStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      try { await api.put('classes', id, { status: newStatus }); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleDeleteClass = async (id: string) => {
      try { await api.delete('classes', id); await fetchData(); } catch(e: any) { alert('Erro (Verifique se há alunos vinculados): ' + e.message); }
  };

  const handleAddStudent = async (s: Student) => {
      try { await api.post('students', s); await fetchData(); } catch(e: any) { alert('Erro: ' + e.message); }
  };

  const handleUpdateStudent = async (s: Student) => {
    try { await api.put('students', s.id, s); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleToggleStudentStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      try { await api.put('students', id, { status: newStatus }); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleDeleteStudent = async (id: string) => {
      try { await api.delete('students', id); await fetchData(); } catch(e: any) { alert('Erro: ' + e.message); }
  };

  const handleAddSkill = async (s: Skill) => {
      try { await api.post('skills', s); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleUpdateSkill = async (s: Skill) => {
      try { await api.put('skills', s.id, s); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleDeleteSkill = async (id: string) => {
      try { await api.delete('skills', id); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleAddSubject = async (sub: Subject) => {
      try { await api.post('subjects', sub); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  }

  const handleAddUser = async (u: User) => {
      try { await api.post('users', u); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleUpdateUser = async (u: User) => {
      try { await api.put('users', u.id, u); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleDeleteUser = async (id: string) => {
      try {
          const linkedClasses = classes.filter(c => c.teacherIds?.includes(id));
          if (linkedClasses.length > 0) {
              const confirmSoft = window.confirm(`⚠️ Este usuário possui turmas. Deseja apenas INATIVAR?`);
              if (confirmSoft) {
                  await api.put('users', id, { status: 'inactive' });
                  await fetchData();
              }
              return;
          }
          await api.delete('users', id);
          await fetchData();
      } catch(e:any) { alert('Erro: ' + e.message); }
  };

  const handleAddLog = async (l: ClassDailyLog) => {
    try { await api.post('class_daily_logs', l); await fetchData(); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const handleDeleteLog = async (id: string) => {
      try { await api.delete('class_daily_logs', id); await fetchData(); } catch(e:any) { alert('Erro: ' + e.message); }
  }

  if (!isAuthenticated) return <Login onLogin={handleLogin} schoolName={schoolName} />;
  
  // Render Loading while fetching initial data AFTER login
  if (isLoading && isAuthenticated) return <div className="h-screen flex items-center justify-center bg-[#fdfbf7]"><Loader2 className="animate-spin text-[#c48b5e]" size={40} /></div>;

  const schoolNameParts = schoolName.split(' ');
  const schoolHighlight = schoolNameParts.length > 1 ? schoolNameParts.pop() : '';
  const schoolMain = schoolNameParts.join(' ');

  return (
    <div className="flex h-screen bg-[#fdfbf7] overflow-hidden font-sans">
      <aside className={`bg-[#f3efe9] text-[#433422] p-4 hidden md:flex flex-col border-r border-[#eaddcf] transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="flex items-center justify-between mb-8 px-1">
            <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
                <div className="bg-[#c48b5e] p-2 rounded-xl text-white shadow-md shadow-[#c48b5e]/20 shrink-0"><GraduationCap size={24} /></div>
                {isSidebarOpen && (
                  <h1 className="text-lg font-extrabold tracking-tight uppercase text-[#433422] leading-tight">
                    {schoolMain} <span className="text-[#c48b5e] block">{schoolHighlight}</span>
                  </h1>
                )}
            </div>
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="text-[#8c7e72] hover:text-[#c48b5e] p-1 rounded-lg hover:bg-[#eaddcf]/50">
                <ChevronLeft size={20} />
              </button>
            )}
        </div>
        
        {!isSidebarOpen && (
          <div className="flex justify-center mb-6">
            <button onClick={() => setIsSidebarOpen(true)} className="text-[#8c7e72] hover:text-[#c48b5e] p-2 rounded-lg hover:bg-[#eaddcf]/50">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentPage === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('dashboard')} />
          <NavItem icon={<School size={20} />} label="Turmas" active={currentPage === 'classes'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('classes')} />
          <NavItem icon={<Users size={20} />} label="Alunos" active={currentPage === 'students'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('students')} />
          <NavItem icon={<ClipboardCheck size={20} />} label="Avaliações" active={currentPage === 'assessments'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('assessments')} />
          <NavItem icon={<AlertTriangle size={20} />} label="Reforço" active={currentPage === 'remediation'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('remediation')} />
          <NavItem icon={<BookOpen size={20} />} label="BNCC" active={currentPage === 'skills'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('skills')} />
          {currentUser?.role === 'admin' && <NavItem icon={<UserIcon size={20} />} label="Equipe" active={currentPage === 'users'} collapsed={!isSidebarOpen} onClick={() => setCurrentPage('users')} />}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#eaddcf]">
            {/* Connection Status Indicator */}
            {isSidebarOpen ? (
              <div className={`flex items-center justify-between mb-4 px-2 py-1.5 rounded-lg text-xs font-bold border ${apiStatus ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                 <span className="flex items-center gap-1.5">
                    {apiStatus ? <Wifi size={12}/> : <WifiOff size={12}/>}
                    Sistema Online
                 </span>
                 <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              </div>
            ) : (
               <div className={`flex justify-center mb-4`}>
                  <div className={`w-3 h-3 rounded-full ${apiStatus ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} title={apiStatus ? "Online" : "Offline"}></div>
               </div>
            )}

            {isSidebarOpen ? (
              <div className="px-2 mb-4">
                  <p className="text-xs text-[#8c7e72] font-bold uppercase tracking-widest truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-[#c48b5e] font-medium uppercase truncate">{currentUser?.role}</p>
              </div>
            ) : (
               <div className="mb-4 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#eaddcf] flex items-center justify-center text-[#c48b5e] font-bold text-xs">
                    {currentUser?.name.charAt(0)}
                  </div>
               </div>
            )}
            
            {/* Admin Settings Button */}
            {currentUser?.role === 'admin' && (
                <button
                    onClick={() => { setTempSchoolName(schoolName); setIsSettingsModalOpen(true); }}
                    className={`w-full flex items-center ${isSidebarOpen ? 'gap-2 px-2' : 'justify-center'} text-[#8c7e72] hover:text-[#c48b5e] p-2 transition-colors text-sm font-bold mb-1`}
                    title="Configurações da Escola"
                >
                    <Settings size={isSidebarOpen ? 16 : 20} /> {isSidebarOpen && 'Configurações'}
                </button>
            )}

            <button 
              onClick={handleLogout} 
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-2 px-2' : 'justify-center'} text-[#8c7e72] hover:text-[#c48b5e] p-2 transition-colors text-sm font-bold`}
              title="Encerrar Sessão"
            >
              <LogOut size={isSidebarOpen ? 16 : 20} /> {isSidebarOpen && 'Sair'}
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-10 transition-all">
        {currentPage === 'dashboard' && <Dashboard classes={classes} students={students} assessments={assessments} skills={skills} currentUser={currentUser} onNavigateToRemediation={() => setCurrentPage('remediation')} />}
        
        {currentPage === 'classes' && <ClassList 
          classes={classes} 
          students={students} 
          users={users} 
          logs={logs}
          selectedClassId={selectedClassId || undefined} 
          currentUser={currentUser}
          onSelectClass={setSelectedClassId} 
          onSelectStudent={(id) => { setSelectedStudentId(id); setCurrentPage('student-detail'); }} 
          onAddClass={handleAddClass} 
          onUpdateClass={handleUpdateClass} 
          onDeleteClass={handleDeleteClass}
          onToggleStatus={handleToggleClassStatus} 
          onAddStudent={handleAddStudent} 
          onUpdateStudent={handleUpdateStudent} 
          onDeleteStudent={handleDeleteStudent}
          onToggleStudentStatus={handleToggleStudentStatus} 
          onAddLog={handleAddLog}
          onDeleteLog={handleDeleteLog}
        />}

        {currentPage === 'students' && <StudentManager 
          students={students} 
          classes={classes} 
          currentUser={currentUser}
          onAddStudent={handleAddStudent} 
          onUpdateStudent={handleUpdateStudent} 
          onDeleteStudent={handleDeleteStudent} 
          onToggleStatus={handleToggleStudentStatus}
          onSelectStudent={(id) => { setSelectedStudentId(id); setCurrentPage('student-detail'); }} 
        />}
        
        {currentPage === 'assessments' && <AssessmentManager 
            assessments={assessments} 
            students={students} 
            classes={classes} 
            skills={skills} 
            logs={logs}
            currentUser={currentUser} 
            onAddAssessment={handleAddAssessment} 
            onDeleteAssessment={handleDeleteAssessment} 
        />}
        {currentPage === 'remediation' && <RemediationList assessments={assessments} students={students} skills={skills} classes={classes} users={users} logs={logs} currentUser={currentUser} onSelectStudent={(id) => { setSelectedStudentId(id); setCurrentPage('student-detail'); }} onAddClass={handleAddClass} onDeleteClass={handleDeleteClass} onUpdateStudent={handleUpdateStudent} onAddLog={handleAddLog} onDeleteLog={handleDeleteLog} />}
        {currentPage === 'skills' && <SkillManager 
            skills={skills} 
            classes={classes} 
            subjects={subjects} 
            currentUser={currentUser} 
            onAddSkill={handleAddSkill} 
            onUpdateSkill={handleUpdateSkill} 
            onDeleteSkill={handleDeleteSkill} 
            onUpdateClass={handleUpdateClass} 
            onAddSubject={handleAddSubject}
        />}
        {currentPage === 'student-detail' && selectedStudentId && <StudentDetail 
            studentId={selectedStudentId} 
            students={students} 
            skills={skills} 
            assessments={assessments} 
            classes={classes} 
            logs={logs} 
            onAddAssessment={handleAddAssessment} 
            onBack={() => setCurrentPage('students')} 
        />}
        {currentPage === 'users' && <UserManager users={users} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
      </main>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
                <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Settings className="text-[#eaddcf]" size={20} /> Configurações
                    </h3>
                    <button onClick={() => setIsSettingsModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Nome da Escola</label>
                        <input 
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" 
                            placeholder="Ex: Escola Modelo" 
                            value={tempSchoolName} 
                            onChange={(e) => setTempSchoolName(e.target.value)} 
                        />
                    </div>
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-3 bg-[#c48b5e] text-white rounded-xl font-bold hover:bg-[#a0704a] shadow-lg">Salvar</button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
}

const NavItem = ({ icon, label, active, collapsed, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-4 px-4'} py-3.5 rounded-2xl transition-all duration-200 ${active ? 'bg-white text-[#c48b5e] shadow-sm border border-[#eaddcf] font-bold' : 'text-[#8c7e72] hover:text-[#433422] hover:bg-[#eaddcf]/50 font-medium'}`}
    title={collapsed ? label : undefined}
  >
    {icon} 
    {!collapsed && <span className="text-sm whitespace-nowrap">{label}</span>}
  </button>
);
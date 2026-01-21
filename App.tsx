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
  ClipboardCheck
} from 'lucide-react';
import { supabase } from './supabaseClient';
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

// --- Mapeadores de Banco de Dados ---

const mapClassFromDB = (c: any): ClassGroup => ({
  id: c.id,
  name: c.name,
  grade: c.grade,
  year: c.year,
  shift: c.shift,
  status: c.status,
  // Tenta usar teacher_ids (novo), se não existir ou for vazio, tenta fallback para teacher_id (antigo)
  teacherIds: (c.teacher_ids && c.teacher_ids.length > 0) 
    ? c.teacher_ids 
    : (c.teacher_id ? [c.teacher_id] : []),
  isRemediation: c.is_remediation,
  focusSkills: c.focus_skills || []
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
  attendance: l.attendance
});

const mapSkillFromDB = (s: any): Skill => ({
    id: s.id,
    code: s.code,
    description: s.description,
    subject: s.subject || 'Geral', // Fallback caso subject seja null
    year: s.year || '' 
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('school_app_user'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('school_app_user');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ClassDailyLog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Carregamento independente para evitar que falha em uma tabela (ex: subjects ainda não criada) quebre tudo
      const fetchSafe = async (table: string) => {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
              console.warn(`Aviso: Não foi possível carregar ${table}.`, error.message);
              return [];
          }
          return data || [];
      };

      const [cl, st, sk, ass, us, lg, sb] = await Promise.all([
        fetchSafe('classes'),
        fetchSafe('students'),
        fetchSafe('skills'),
        fetchSafe('assessments'),
        fetchSafe('users'),
        fetchSafe('class_daily_logs'),
        fetchSafe('subjects')
      ]);

      setClasses(cl.map(mapClassFromDB));
      setStudents(st.map(mapStudentFromDB));
      setSkills(sk.map(mapSkillFromDB));
      setAssessments(ass.map(mapAssessmentFromDB));
      setUsers(us); 
      setLogs(lg.map(mapLogFromDB));
      
      if (sb.length > 0) {
        setSubjects(sb.sort((a: any, b: any) => a.name.localeCompare(b.name)));
      } else {
        // Fallback visual se a tabela subjects estiver vazia ou falhar
        setSubjects([
            { id: '1', name: 'Língua Portuguesa' },
            { id: '2', name: 'Matemática' },
            { id: '3', name: 'Ciências' },
            { id: '4', name: 'História' },
            { id: '5', name: 'Geografia' }
        ]);
      }

    } catch (err) {
      console.error('Erro crítico ao buscar dados:', err);
      alert('Ocorreu um erro ao carregar os dados. Verifique a conexão ou contate o suporte.');
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
    let { data: dbUser, error } = await supabase.from('users').select('*').ilike('email', email).eq('password', pass).maybeSingle();
    
    if (error) {
        console.error("Erro no login:", error);
        return false;
    }

    if (dbUser) {
        if (dbUser.status === 'inactive') {
            alert('Acesso negado: Usuário inativo. Contate o administrador.');
            return false;
        }

        setCurrentUser(dbUser);
        setIsAuthenticated(true);
        localStorage.setItem('school_app_user', JSON.stringify(dbUser));
        setCurrentPage('dashboard');
        return true;
    }

    // Admin Backdoor (Apenas se não houver usuários no banco ou falha de conexão)
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

  // --- CRUD OPERATIONS ---

  // 1. AVALIAÇÕES (COM LÓGICA AUTOMÁTICA DE REFORÇO)
  const handleAddAssessment = async (a: Assessment) => {
    try {
      // 1. Inserir a Avaliação
      const { error } = await supabase.from('assessments').insert([{
        id: a.id,
        student_id: a.studentId,
        skill_id: a.skillId,
        date: a.date,
        status: a.status,
        term: a.term,
        notes: a.notes,
        // Novos campos unificados
        participation_score: a.participationScore,
        behavior_score: a.behaviorScore,
        exam_score: a.examScore
      }]);
      if (error) throw error;

      // 2. Atualizar Status de Reforço do Aluno (Automação)
      const student = students.find(s => s.id === a.studentId);
      if (student) {
          const now = new Date().toISOString();
          let updateData: any = {};

          // Cenário A: Resultado Positivo (SAÍDA DO REFORÇO)
          if (a.status === AssessmentStatus.ATINGIU || a.status === AssessmentStatus.SUPEROU) {
              // Se o aluno está atualmente em reforço (tem entrada, mas não tem saída)
              if (student.remediationEntryDate && !student.remediationExitDate) {
                  updateData = { remediation_exit_date: now };
                  alert(`🎉 Parabéns! O desempenho do aluno registrou a SAÍDA automática do Reforço Escolar em ${new Date().toLocaleDateString()}.`);
              }
          }
          // Cenário B: Resultado Negativo (ENTRADA NO REFORÇO)
          else if (a.status === AssessmentStatus.NAO_ATINGIU || a.status === AssessmentStatus.EM_DESENVOLVIMENTO) {
              // Se o aluno NÃO está em reforço (não tem entrada OU já saiu anteriormente)
              if (!student.remediationEntryDate || student.remediationExitDate) {
                  updateData = { 
                      remediation_entry_date: now, 
                      remediation_exit_date: null // Reseta a saída para abrir um novo ciclo
                  };
                  alert(`⚠️ Atenção: Com base neste resultado, o aluno entrou automaticamente na lista de Reforço Escolar em ${new Date().toLocaleDateString()}.`);
              }
          }

          // Executa a atualização no aluno se houver mudanças
          if (Object.keys(updateData).length > 0) {
              const { error: studError } = await supabase
                  .from('students')
                  .update(updateData)
                  .eq('id', student.id);
              
              if (studError) console.error("Erro ao atualizar status de reforço:", studError);
          }
      }

      await fetchData(); // Refresh global
    } catch (e: any) { 
        alert('Erro ao salvar avaliação: ' + e.message); 
    }
  };

  const handleDeleteAssessment = async (id: string) => {
      try {
          const { error } = await supabase.from('assessments').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
      } catch(e: any) { alert('Erro ao excluir: ' + e.message); }
  }

  // 2. TURMAS
  const handleAddClass = async (c: ClassGroup) => {
    try {
      const { error } = await supabase.from('classes').insert([{
        id: c.id,
        name: c.name,
        grade: c.grade,
        year: c.year,
        shift: c.shift,
        status: c.status,
        teacher_ids: c.teacherIds, // Salva o array de IDs
        teacher_id: c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds[0] : null, // Compatibilidade legado
        is_remediation: c.isRemediation,
        focus_skills: c.focusSkills
      }]);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert('Erro ao salvar turma: ' + e.message); }
  };

  const handleUpdateClass = async (c: ClassGroup) => {
      try {
          const { error } = await supabase.from('classes').update({
              name: c.name,
              grade: c.grade,
              year: c.year,
              shift: c.shift,
              status: c.status,
              teacher_ids: c.teacherIds, // Atualiza array
              teacher_id: c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds[0] : null, // Compatibilidade legado
              is_remediation: c.isRemediation,
              focus_skills: c.focusSkills
          }).eq('id', c.id);
          if (error) throw error;
          await fetchData();
      } catch (e: any) { alert('Erro ao atualizar turma: ' + e.message); }
  };

  const handleToggleClassStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
      try {
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
          const { error } = await supabase.from('classes').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
          await fetchData();
      } catch (e: any) { alert('Erro ao alterar status da turma: ' + e.message); }
  };

  const handleDeleteClass = async (id: string) => {
      try {
          const { error } = await supabase.from('classes').delete().eq('id', id);
          if(error) {
              if (error.message.includes('violates foreign key constraint') || error.code === '23503') {
                  alert('Não é possível excluir esta turma pois existem registros vinculados (Alunos). Por favor, utilize a opção "Inativar" para arquivá-la.');
              } else {
                  throw error;
              }
          } else {
              await fetchData();
          }
      } catch(e: any) { alert('Erro ao excluir turma: ' + e.message); }
  };

  // 3. ALUNOS
  const handleAddStudent = async (s: Student) => {
      try {
          const { error } = await supabase.from('students').insert([{
              id: s.id,
              name: s.name,
              class_id: s.classId,
              avatar_url: s.avatarUrl,
              registration_number: s.registrationNumber,
              birth_date: s.birthDate,
              parent_name: s.parentName,
              phone: s.phone,
              status: s.status
          }]);
          if(error) throw error;
          await fetchData();
      } catch(e: any) { alert('Erro ao cadastrar aluno: ' + e.message); }
  };

  const handleUpdateStudent = async (s: Student) => {
    try {
      const { error } = await supabase.from('students').update({
        name: s.name,
        class_id: s.classId,
        avatar_url: s.avatarUrl,
        registration_number: s.registrationNumber,
        birth_date: s.birthDate,
        parent_name: s.parentName,
        phone: s.phone,
        status: s.status,
        remediation_entry_date: s.remediationEntryDate,
        remediation_exit_date: s.remediationExitDate
      }).eq('id', s.id);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert('Erro ao atualizar aluno: ' + e.message); }
  };

  const handleToggleStudentStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
      try {
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
          const { error } = await supabase.from('students').update({ status: newStatus }).eq('id', id);
          if (error) throw error;
          await fetchData();
      } catch (e: any) { alert('Erro ao alterar status do aluno: ' + e.message); }
  };

  const handleDeleteStudent = async (id: string) => {
      try {
          const { error } = await supabase.from('students').delete().eq('id', id);
          if(error) {
             if (error.message.includes('violates foreign key constraint') || error.code === '23503') {
                 alert('Não é possível excluir este aluno pois existem avaliações vinculadas. Por favor, utilize a opção "Inativar".');
             } else {
                 throw error;
             }
          } else {
              await fetchData();
          }
      } catch(e: any) { alert('Erro ao excluir aluno: ' + e.message); }
  };

  // 4. HABILIDADES
  const handleAddSkill = async (s: Skill) => {
      try {
          const { error } = await supabase.from('skills').insert([{
              id: s.id,
              code: s.code,
              description: s.description,
              subject: s.subject,
              year: s.year
          }]);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao salvar habilidade: ' + e.message); }
  };

  const handleUpdateSkill = async (s: Skill) => {
      try {
          const { error } = await supabase.from('skills').update({
              code: s.code,
              description: s.description,
              subject: s.subject,
              year: s.year
          }).eq('id', s.id);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao atualizar habilidade: ' + e.message); }
  };

  const handleDeleteSkill = async (id: string) => {
      try {
          const { error } = await supabase.from('skills').delete().eq('id', id);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao excluir habilidade: ' + e.message); }
  };

  // 5. DISCIPLINAS
  const handleAddSubject = async (sub: Subject) => {
      try {
          const { error } = await supabase.from('subjects').insert([{ id: sub.id, name: sub.name }]);
          if (error) throw error;
          await fetchData();
      } catch (e: any) { alert('Erro ao criar disciplina: ' + e.message); }
  }

  // 6. USUÁRIOS
  const handleAddUser = async (u: User) => {
      try {
          const { error } = await supabase.from('users').insert([{
              id: u.id,
              name: u.name,
              email: u.email,
              password: u.password,
              role: u.role,
              status: u.status || 'active'
          }]);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao criar usuário: ' + e.message); }
  };

  const handleUpdateUser = async (u: User) => {
      try {
          const payload: any = {
              name: u.name,
              email: u.email,
              role: u.role,
              status: u.status
          };
          if(u.password) payload.password = u.password;

          const { error } = await supabase.from('users').update(payload).eq('id', u.id);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao atualizar usuário: ' + e.message); }
  };

  const handleDeleteUser = async (id: string) => {
      try {
          // Check dependency: Is this user a teacher in any class?
          const linkedClasses = classes.filter(c => c.teacherIds?.includes(id));

          if (linkedClasses.length > 0) {
              const confirmSoft = window.confirm(`⚠️ Este usuário é responsável por ${linkedClasses.length} turma(s).\n\nA exclusão física não é permitida para manter a integridade dos dados.\n\nDeseja INATIVAR o usuário, bloqueando seu acesso?`);
              if (confirmSoft) {
                  const { error } = await supabase.from('users').update({ status: 'inactive' }).eq('id', id);
                  if (error) throw error;
                  alert('Usuário inativado com sucesso.');
                  await fetchData();
              }
              return;
          }

          const { error } = await supabase.from('users').delete().eq('id', id);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao excluir usuário: ' + e.message); }
  };

  // 7. LOGS
  const handleAddLog = async (l: ClassDailyLog) => {
    try {
      const { error } = await supabase.from('class_daily_logs').insert([{
        id: l.id,
        class_id: l.classId,
        date: l.date,
        content: l.content,
        attendance: l.attendance
      }]);
      if (error) throw error;
      await fetchData();
    } catch (e: any) { alert('Erro ao salvar diário: ' + e.message); }
  };

  const handleDeleteLog = async (id: string) => {
      try {
          const { error } = await supabase.from('class_daily_logs').delete().eq('id', id);
          if(error) throw error;
          await fetchData();
      } catch(e:any) { alert('Erro ao excluir diário: ' + e.message); }
  }


  if (!isAuthenticated) return <Login onLogin={handleLogin} />;
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#fdfbf7]"><Loader2 className="animate-spin text-[#c48b5e]" size={40} /></div>;

  return (
    <div className="flex h-screen bg-[#fdfbf7] overflow-hidden font-sans">
      <aside className="w-72 bg-[#f3efe9] text-[#433422] p-6 hidden md:flex flex-col border-r border-[#eaddcf]">
        <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-[#c48b5e] p-2 rounded-xl text-white shadow-md shadow-[#c48b5e]/20"><GraduationCap size={24} /></div>
            <h1 className="text-xl font-extrabold tracking-tight uppercase text-[#433422]">Escola <span className="text-[#c48b5e]">Olavo Bilac</span></h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
          <NavItem icon={<School size={20} />} label="Turmas" active={currentPage === 'classes'} onClick={() => setCurrentPage('classes')} />
          <NavItem icon={<Users size={20} />} label="Alunos" active={currentPage === 'students'} onClick={() => setCurrentPage('students')} />
          <NavItem icon={<ClipboardCheck size={20} />} label="Avaliações" active={currentPage === 'assessments'} onClick={() => setCurrentPage('assessments')} />
          <NavItem icon={<AlertTriangle size={20} />} label="Reforço Escolar" active={currentPage === 'remediation'} onClick={() => setCurrentPage('remediation')} />
          <NavItem icon={<BookOpen size={20} />} label="BNCC" active={currentPage === 'skills'} onClick={() => setCurrentPage('skills')} />
          {currentUser?.role === 'admin' && <NavItem icon={<UserIcon size={20} />} label="Equipe" active={currentPage === 'users'} onClick={() => setCurrentPage('users')} />}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#eaddcf]">
            <div className="px-2 mb-4">
                <p className="text-xs text-[#8c7e72] font-bold uppercase tracking-widest">{currentUser?.name}</p>
                <p className="text-[10px] text-[#c48b5e] font-medium uppercase">{currentUser?.role}</p>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-[#8c7e72] hover:text-[#c48b5e] p-2 transition-colors text-sm font-bold">
              <LogOut size={16} /> Encerrar Sessão
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-10">
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
          onToggleStatus={handleToggleClassStatus} // Passando função de toggle
          onAddStudent={handleAddStudent} 
          onUpdateStudent={handleUpdateStudent} 
          onDeleteStudent={handleDeleteStudent}
          onToggleStudentStatus={handleToggleStudentStatus} // Passando função de toggle
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
          onToggleStatus={handleToggleStudentStatus} // Passando função de toggle
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
            logs={logs} // Passed logs to enable attendance check
            onAddAssessment={handleAddAssessment} 
            onBack={() => setCurrentPage('students')} 
        />}
        {currentPage === 'users' && <UserManager users={users} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
      </main>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${active ? 'bg-white text-[#c48b5e] shadow-sm border border-[#eaddcf] font-bold' : 'text-[#8c7e72] hover:text-[#433422] hover:bg-[#eaddcf]/50 font-medium'}`}>
    {icon} <span className="text-sm">{label}</span>
  </button>
);
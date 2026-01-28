import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Users, BookOpen, AlertCircle, CheckCircle, Filter, ChevronUp, ChevronDown, BarChart2, Megaphone, Calendar, TrendingUp, Activity, Briefcase, GraduationCap } from 'lucide-react';
import { Assessment, AssessmentStatus, ClassGroup, Skill, Student, User, Notice, ClassDailyLog } from '../types';

interface DashboardProps {
  classes: ClassGroup[];
  students: Student[];
  assessments: Assessment[];
  skills: Skill[];
  notices?: Notice[];
  logs?: ClassDailyLog[];
  users?: User[];
  currentUser: User | null;
  onNavigateToRemediation: () => void;
}

interface PieChartData {
    name: string;
    value: number;
    color: string;
    [key: string]: any;
}

interface BarChartData {
    name: string;
    taxa: number;
    [key: string]: any;
}

interface SubjectStats {
    subject: string;
    success: number;
    total: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  classes, 
  students, 
  assessments, 
  skills, 
  notices = [],
  logs = [],
  users = [],
  currentUser,
  onNavigateToRemediation 
}) => {
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [showCharts, setShowCharts] = useState(true); 

  // Filtros Específicos para o Gráfico de Desempenho (Diretor)
  const [chartClassFilter, setChartClassFilter] = useState('all');
  const [chartTermFilter, setChartTermFilter] = useState('all');

  const isDirector = currentUser?.role === 'diretor' || currentUser?.role === 'admin';

  // --- Common Metrics ---
  const filteredAssessments = selectedTerm === 'all' 
    ? assessments 
    : assessments.filter(a => a.term === selectedTerm);

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status !== 'inactive').length;
  const totalSkills = skills.length;
  
  // Remediation
  const remediationCases = filteredAssessments.filter(a => a.status === AssessmentStatus.NAO_ATINGIU || a.status === AssessmentStatus.EM_DESENVOLVIMENTO).length;
  const successCases = filteredAssessments.filter(a => a.status === AssessmentStatus.SUPEROU || a.status === AssessmentStatus.ATINGIU).length;

  // --- Executive Logic (Director Only) ---
  const executiveMetrics = useMemo(() => {
      if (!isDirector) return null;

      // 1. Global Attendance Rate
      let totalPresence = 0;
      let totalPossible = 0;
      logs.forEach(log => {
          const classStudents = students.filter(s => s.classId === log.classId && s.status !== 'inactive');
          totalPossible += classStudents.length;
          if (log.attendance) {
              const presentCount = classStudents.filter(s => log.attendance[s.id]).length;
              totalPresence += presentCount;
          }
      });
      const globalAttendanceRate = totalPossible > 0 ? Math.round((totalPresence / totalPossible) * 100) : 0;

      // 2. Class Comparison Data (Filtered by Chart Filters)
      const chartAssessments = chartTermFilter === 'all' 
          ? assessments 
          : assessments.filter(a => a.term === chartTermFilter);

      let classPerformanceData = classes
        .filter(c => c.status !== 'inactive')
        .map(cls => {
            const classStudentsIds = students.filter(s => s.classId === cls.id).map(s => s.id);
            const clsAssessments = chartAssessments.filter(a => classStudentsIds.includes(a.studentId));
            
            const total = clsAssessments.length;
            const success = clsAssessments.filter(a => a.status === AssessmentStatus.ATINGIU || a.status === AssessmentStatus.SUPEROU).length;
            const rate = total > 0 ? Math.round((success / total) * 100) : 0;

            return {
                id: cls.id,
                name: cls.name, 
                fullName: `${cls.name} - ${cls.grade}`,
                rate: rate,
                students: classStudentsIds.length
            };
        })
        .sort((a, b) => b.rate - a.rate); // Sort by performance

      // Apply Class Filter if selected
      if (chartClassFilter !== 'all') {
          classPerformanceData = classPerformanceData.filter(c => c.id === chartClassFilter);
      }

      // 3. Top Risk Skills (Skills with most 'NAO_ATINGIU') - Global view
      const skillRiskMap: Record<string, number> = {};
      assessments.forEach(a => {
          if (a.status === AssessmentStatus.NAO_ATINGIU) {
              skillRiskMap[a.skillId] = (skillRiskMap[a.skillId] || 0) + 1;
          }
      });
      const topRiskSkills = Object.entries(skillRiskMap)
          .sort(([,countA], [,countB]) => countB - countA)
          .slice(0, 5)
          .map(([skillId, count]) => {
              const skill = skills.find(s => s.id === skillId);
              return { code: skill?.code, desc: skill?.description, count, subject: skill?.subject };
          });

      return {
          globalAttendanceRate,
          classPerformanceData,
          topRiskSkills
      };
  }, [isDirector, logs, students, classes, assessments, skills, chartClassFilter, chartTermFilter]);


  // --- Standard Chart Data ---
  const pieData: PieChartData[] = [
    { name: 'Superou', value: filteredAssessments.filter(a => a.status === AssessmentStatus.SUPEROU).length, color: '#10B981' }, 
    { name: 'Atingiu', value: filteredAssessments.filter(a => a.status === AssessmentStatus.ATINGIU).length, color: '#06b6d4' }, 
    { name: 'Em Desenv.', value: filteredAssessments.filter(a => a.status === AssessmentStatus.EM_DESENVOLVIMENTO).length, color: '#F59E0B' }, 
    { name: 'Não Atingiu', value: filteredAssessments.filter(a => a.status === AssessmentStatus.NAO_ATINGIU).length, color: '#EF4444' }, 
  ];

  const subjectPerformance = skills.reduce((acc, skill) => {
    const skillAssessments = filteredAssessments.filter(a => a.skillId === skill.id);
    if (skillAssessments.length === 0) return acc;

    if (!acc[skill.subject]) {
      acc[skill.subject] = { subject: skill.subject, success: 0, total: 0 };
    }
    
    acc[skill.subject].total += skillAssessments.length;
    acc[skill.subject].success += skillAssessments.filter(a => a.status === AssessmentStatus.SUPEROU || a.status === AssessmentStatus.ATINGIU).length;
    return acc;
  }, {} as Record<string, SubjectStats>);

  const barData: BarChartData[] = Object.values(subjectPerformance).map((item: SubjectStats) => ({
    name: item.subject,
    taxa: Math.round((item.success / item.total) * 100)
  }));

  const recentNotices = [...notices].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  // --- RENDER DIRECTOR DASHBOARD ---
  if (isDirector && executiveMetrics) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              {/* Header Executivo - CORES PADRÃO */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#eaddcf] relative overflow-hidden">
                  <div className="relative z-10 flex justify-between items-start">
                      <div>
                          <h2 className="text-3xl font-bold mb-1 flex items-center gap-3 text-[#433422]">
                              <Briefcase className="text-[#c48b5e]" /> Painel da Diretoria
                          </h2>
                          <p className="text-[#8c7e72]">Visão estratégica e monitoramento global de desempenho.</p>
                      </div>
                      <div className="bg-[#fcf9f6] p-2 rounded-lg border border-[#eaddcf] text-[#c48b5e]">
                          <span className="block text-xs uppercase font-bold tracking-wider text-[#8c7e72]">Ano Letivo</span>
                          <span className="text-xl font-bold text-center block">{new Date().getFullYear()}</span>
                      </div>
                  </div>
              </div>

              {/* KPIs de Alto Nível - CORES PADRÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <ExecutiveCard 
                      title="Alunos Ativos" 
                      value={activeStudents} 
                      subValue={`${Math.round((activeStudents/totalStudents)*100) || 0}% do total matriculado`}
                      icon={<Users size={24} className="text-blue-500" />}
                      trend="stable"
                  />
                  <ExecutiveCard 
                      title="Frequência Global" 
                      value={`${executiveMetrics.globalAttendanceRate}%`} 
                      subValue="Média de todas as turmas"
                      icon={<Activity size={24} className={executiveMetrics.globalAttendanceRate > 85 ? "text-green-500" : "text-orange-500"} />}
                      trend={executiveMetrics.globalAttendanceRate > 85 ? "up" : "down"}
                  />
                  <ExecutiveCard 
                      title="Taxa de Aprovação" 
                      value={`${filteredAssessments.length > 0 ? Math.round((successCases / filteredAssessments.length) * 100) : 0}%`} 
                      subValue="Habilidades Consolidadas"
                      icon={<GraduationCap size={24} className="text-purple-500" />}
                      trend="up"
                  />
                  <ExecutiveCard 
                      title="Casos Críticos" 
                      value={remediationCases} 
                      subValue="Avaliações 'Não Atingiu'"
                      icon={<AlertCircle size={24} className="text-red-500" />}
                      trend="down"
                      onClick={onNavigateToRemediation}
                      actionable
                  />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Ranking de Turmas (Chart) com Filtros */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#eaddcf]">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                          <h3 className="text-lg font-bold text-[#433422] flex items-center gap-2">
                              <TrendingUp className="text-[#c48b5e]" size={20} /> Desempenho por Turma
                          </h3>
                          
                          <div className="flex gap-2">
                             {/* Filtro de Turma */}
                             <div className="relative">
                                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c48b5e]" size={14} />
                                 <select
                                    value={chartClassFilter}
                                    onChange={(e) => setChartClassFilter(e.target.value)}
                                    className="pl-9 pr-3 py-1.5 bg-[#fcf9f6] border border-[#eaddcf] rounded-lg text-sm text-[#433422] outline-none focus:ring-2 focus:ring-[#c48b5e]"
                                 >
                                    <option value="all">Todas as Turmas</option>
                                    {classes.filter(c => c.status !== 'inactive').map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                 </select>
                             </div>

                             {/* Filtro de Trimestre */}
                             <div className="relative">
                                 <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c48b5e]" size={14} />
                                 <select
                                    value={chartTermFilter}
                                    onChange={(e) => setChartTermFilter(e.target.value)}
                                    className="pl-9 pr-3 py-1.5 bg-[#fcf9f6] border border-[#eaddcf] rounded-lg text-sm text-[#433422] outline-none focus:ring-2 focus:ring-[#c48b5e]"
                                 >
                                    <option value="all">Todo o Ano</option>
                                    <option value="1º Trimestre">1º Trimestre</option>
                                    <option value="2º Trimestre">2º Trimestre</option>
                                    <option value="3º Trimestre">3º Trimestre</option>
                                 </select>
                             </div>
                           </div>
                      </div>
                      
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={executiveMetrics.classPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8c7e72', fontSize: 12}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8c7e72', fontSize: 12}} unit="%" />
                                  <Tooltip 
                                      cursor={{ fill: '#fcf9f6' }}
                                      contentStyle={{ borderRadius: '12px', border: '1px solid #eaddcf', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                  />
                                  <Bar dataKey="rate" name="Taxa de Sucesso" radius={[4, 4, 0, 0]}>
                                      {executiveMetrics.classPerformanceData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.rate > 80 ? '#10B981' : entry.rate > 60 ? '#3B82F6' : '#EF4444'} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Top Ofensores (Lista) */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-[#eaddcf] flex flex-col">
                      <h3 className="text-lg font-bold text-[#433422] mb-4 flex items-center gap-2">
                          <AlertCircle className="text-red-500" size={20} /> Pontos de Atenção
                      </h3>
                      <p className="text-xs text-[#8c7e72] mb-4">Habilidades com maior índice de "Não Atingiu".</p>
                      
                      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                          {executiveMetrics.topRiskSkills.length > 0 ? (
                              executiveMetrics.topRiskSkills.map((item, idx) => (
                                  <div key={idx} className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded font-mono">{item.code}</span>
                                          <span className="text-xs font-bold text-[#8c7e72]">{item.count} Casos</span>
                                      </div>
                                      <p className="text-xs text-[#433422] font-medium line-clamp-2" title={item.desc}>{item.desc}</p>
                                      <p className="text-[10px] text-[#8c7e72] mt-1 uppercase tracking-wide">{item.subject}</p>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-10 text-[#8c7e72]">
                                  <CheckCircle size={32} className="mx-auto mb-2 text-green-300" />
                                  <p>Sem pontos críticos detectados.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Distribuição Geral (Compacta) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaddcf]">
                       <h3 className="text-lg font-bold text-[#433422] mb-4">Distribuição de Resultados</h3>
                       <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                       </div>
                   </div>

                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaddcf]">
                       <h3 className="text-lg font-bold text-[#433422] mb-4">Mural de Avisos Recentes</h3>
                       <div className="space-y-3">
                           {recentNotices.length > 0 ? recentNotices.map(notice => (
                               <div key={notice.id} className="flex items-start gap-3 p-3 hover:bg-[#fcf9f6] rounded-xl transition-colors border border-transparent hover:border-[#eaddcf]">
                                   <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notice.type === 'urgent' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                   <div>
                                       <h4 className="text-sm font-bold text-[#433422]">{notice.title}</h4>
                                       <p className="text-xs text-[#8c7e72] line-clamp-1">{notice.content}</p>
                                       <span className="text-[10px] text-[#c48b5e]">{new Date(notice.date).toLocaleDateString()}</span>
                                   </div>
                               </div>
                           )) : (
                               <p className="text-sm text-[#8c7e72] text-center py-10">Nenhum aviso recente.</p>
                           )}
                       </div>
                   </div>
              </div>
          </div>
      );
  }

  // --- RENDER STANDARD DASHBOARD (PROFESSOR/COORD) ---
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#433422]">
            Olá, {currentUser?.name.split(' ')[0] || 'Professor(a)'}! 👋
          </h2>
          <p className="text-[#8c7e72]">
             Bem-vindo ao painel de controle pedagógico.
             {currentUser?.role === 'coordenador' && <span className="text-[#c48b5e] font-medium ml-1">(Coordenação)</span>}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <button 
             onClick={() => setShowCharts(!showCharts)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${showCharts ? 'bg-[#eaddcf]/50 text-[#c48b5e] border-[#c48b5e]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
           >
              <BarChart2 size={16} />
              {showCharts ? 'Ocultar Gráficos' : 'Mostrar Análises'}
              {showCharts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
           </button>

           <div className="w-[1px] h-8 bg-[#eaddcf] mx-1 hidden md:block"></div>

           <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c48b5e]" size={16} />
             <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#fcf9f6] border border-[#eaddcf] rounded-xl text-[#433422] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c48b5e] appearance-none cursor-pointer"
             >
                <option value="all">📊 Visão Geral (Ano)</option>
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
                <option value="Recuperação">Recuperação</option>
             </select>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <KpiCard 
          title="Total de Alunos" 
          value={totalStudents} 
          icon={<Users size={24} />} 
          color="text-[#c48b5e]"
          bg="bg-[#c48b5e]/10"
        />
        <KpiCard 
          title="Habilidades BNCC" 
          value={totalSkills} 
          icon={<BookOpen size={24} />} 
          color="text-[#8c7e72]"
          bg="bg-[#8c7e72]/10"
        />
        <KpiCard 
          title="Casos de Reforço" 
          value={remediationCases} 
          icon={<AlertCircle size={24} />} 
          color="text-orange-600"
          bg="bg-orange-100"
          onClick={onNavigateToRemediation}
          isActionable
          subtitle={selectedTerm !== 'all' ? selectedTerm : undefined}
        />
        <KpiCard 
          title="Consolidadas" 
          value={successCases} 
          icon={<CheckCircle size={24} />} 
          color="text-green-600"
          bg="bg-green-100"
          subtitle={selectedTerm !== 'all' ? selectedTerm : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {showCharts ? (
                <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] transition-all hover:shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-[#433422]">Distribuição de Desempenho</h3>
                            {selectedTerm !== 'all' && <span className="text-xs bg-[#eaddcf] text-[#433422] px-2 py-1 rounded font-bold">{selectedTerm}</span>}
                        </div>
                        
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-[#433422]">Taxa de Sucesso por Disciplina (%)</h3>
                                <p className="text-xs text-gray-500">Considera "Atingiu" e "Superou"</p>
                            </div>
                            {selectedTerm !== 'all' && <span className="text-xs bg-[#eaddcf] text-[#433422] px-2 py-1 rounded font-bold">{selectedTerm}</span>}
                        </div>
                        
                        <div className="h-64">
                            {barData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#4B5563'}} />
                                    <Tooltip 
                                        cursor={{fill: '#F3F4F6'}} 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="taxa" fill="#c48b5e" radius={[0, 4, 4, 0]} barSize={20} name="Taxa de Sucesso">
                                        {barData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.taxa > 70 ? '#10B981' : entry.taxa > 40 ? '#06b6d4' : '#F59E0B'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                                </ResponsiveContainer>
                            ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                                <BookOpen size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Sem dados suficientes neste período</p>
                            </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                    Os gráficos estão ocultos.
                </div>
            )}
          </div>

          <div className="lg:col-span-1">
             <div className="bg-white rounded-xl shadow-sm border border-[#eaddcf] h-full overflow-hidden flex flex-col">
                 <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                     <h3 className="font-bold text-[#433422] flex items-center gap-2">
                        <Megaphone size={18} className="text-[#c48b5e]" /> Mural de Avisos
                     </h3>
                     <span className="text-xs text-gray-400">{recentNotices.length} Recentes</span>
                 </div>
                 <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[500px]">
                     {recentNotices.map(notice => (
                         <div key={notice.id} className="p-3 rounded-lg border border-gray-100 hover:border-[#c48b5e] hover:bg-[#fcf9f6] transition-all group">
                             <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${notice.type === 'urgent' ? 'bg-red-100 text-red-700' : notice.type === 'event' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {notice.type === 'urgent' ? 'Urgente' : notice.type === 'event' ? 'Evento' : 'Geral'}
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(notice.date).toLocaleDateString().slice(0,5)}
                                </span>
                             </div>
                             <h4 className="font-bold text-[#433422] text-sm mb-1">{notice.title}</h4>
                             <p className="text-xs text-gray-500 line-clamp-2">{notice.content}</p>
                         </div>
                     ))}
                     {recentNotices.length === 0 && (
                         <div className="text-center py-8 text-gray-400">
                             <Megaphone size={24} className="mx-auto mb-2 opacity-30" />
                             <p className="text-xs">Nenhum aviso no momento.</p>
                         </div>
                     )}
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: string;
  bg: string;
  onClick?: () => void;
  isActionable?: boolean;
  subtitle?: string;
}> = ({ title, value, icon, color, bg, onClick, isActionable, subtitle }) => (
  <div 
    onClick={onClick}
    className={`p-6 rounded-xl shadow-sm border border-transparent bg-white flex items-center justify-between transition-all group border-[#eaddcf]
    ${isActionable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-[#c48b5e]' : ''}`}
  >
    <div>
      <p className="text-sm font-semibold text-[#8c7e72] mb-1">{title}</p>
      <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
      {subtitle && <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-xl ${bg} ${color}`}>
      {icon}
    </div>
  </div>
);

const ExecutiveCard: React.FC<{
    title: string;
    value: string | number;
    subValue: string;
    icon: React.ReactNode;
    trend: 'up' | 'down' | 'stable';
    onClick?: () => void;
    actionable?: boolean;
}> = ({ title, value, subValue, icon, trend, onClick, actionable }) => (
    <div 
        onClick={onClick}
        className={`bg-white rounded-2xl p-6 border border-[#eaddcf] shadow-sm relative overflow-hidden group transition-all ${actionable ? 'cursor-pointer hover:shadow-md hover:border-[#c48b5e]' : ''}`}
    >
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-[#8c7e72] text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-[#433422] mb-1">{value}</h3>
                <p className="text-xs text-gray-400">{subValue}</p>
            </div>
            <div className="bg-[#fcf9f6] p-3 rounded-xl border border-[#eaddcf]">
                {icon}
            </div>
        </div>
        
        {/* Trend Indicator */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            {trend === 'up' && <span className="text-green-500 flex items-center gap-1"><TrendingUp size={12}/> Tendência Positiva</span>}
            {trend === 'down' && <span className="text-red-500 flex items-center gap-1"><TrendingUp size={12} className="transform rotate-180"/> Atenção Necessária</span>}
        </div>
    </div>
);

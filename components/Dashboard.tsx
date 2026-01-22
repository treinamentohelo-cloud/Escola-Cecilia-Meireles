import React, { useState } from 'react';
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
  Legend 
} from 'recharts';
import { Users, BookOpen, AlertCircle, CheckCircle, Filter, ChevronUp, ChevronDown, BarChart2, Megaphone, Calendar } from 'lucide-react';
import { Assessment, AssessmentStatus, ClassGroup, Skill, Student, User, Notice } from '../types';

interface DashboardProps {
  classes: ClassGroup[];
  students: Student[];
  assessments: Assessment[];
  skills: Skill[];
  notices?: Notice[];
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
  currentUser,
  onNavigateToRemediation 
}) => {
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [showCharts, setShowCharts] = useState(true); // Controla a visibilidade dos gráficos

  // Filter Assessments based on Term
  const filteredAssessments = selectedTerm === 'all' 
    ? assessments 
    : assessments.filter(a => a.term === selectedTerm);

  // Metrics (Totals remain global, others are filtered)
  const totalStudents = students.length;
  const totalSkills = skills.length;
  
  // Remediation if not Superou AND not Atingiu (Based on filtered view)
  const remediationCases = filteredAssessments.filter(a => a.status === AssessmentStatus.NAO_ATINGIU || a.status === AssessmentStatus.EM_DESENVOLVIMENTO).length;
  const successCases = filteredAssessments.filter(a => a.status === AssessmentStatus.SUPEROU || a.status === AssessmentStatus.ATINGIU).length;

  // Pie Chart Data - Explicit Type
  const pieData: PieChartData[] = [
    { name: 'Superou', value: filteredAssessments.filter(a => a.status === AssessmentStatus.SUPEROU).length, color: '#10B981' }, // Verde Esmeralda
    { name: 'Atingiu', value: filteredAssessments.filter(a => a.status === AssessmentStatus.ATINGIU).length, color: '#06b6d4' }, // Ciano/Azul
    { name: 'Em Desenv.', value: filteredAssessments.filter(a => a.status === AssessmentStatus.EM_DESENVOLVIMENTO).length, color: '#F59E0B' }, // Laranja/Amber
    { name: 'Não Atingiu', value: filteredAssessments.filter(a => a.status === AssessmentStatus.NAO_ATINGIU).length, color: '#EF4444' }, // Vermelho
  ];

  // Bar Chart Data (Performance by Subject)
  const subjectPerformance = skills.reduce((acc, skill) => {
    const skillAssessments = filteredAssessments.filter(a => a.skillId === skill.id);
    if (skillAssessments.length === 0) return acc;

    if (!acc[skill.subject]) {
      acc[skill.subject] = { subject: skill.subject, success: 0, total: 0 };
    }
    
    acc[skill.subject].total += skillAssessments.length;
    // Consideramos sucesso tanto Superou quanto Atingiu
    acc[skill.subject].success += skillAssessments.filter(a => a.status === AssessmentStatus.SUPEROU || a.status === AssessmentStatus.ATINGIU).length;
    return acc;
  }, {} as Record<string, SubjectStats>);

  // Explicit Type for Bar Data
  const barData: BarChartData[] = Object.values(subjectPerformance).map((item: SubjectStats) => ({
    name: item.subject,
    taxa: Math.round((item.success / item.total) * 100)
  }));

  const recentNotices = [...notices].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#eaddcf] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#433422]">
            Olá, {currentUser?.name.split(' ')[0] || 'Professor(a)'}! 👋
          </h2>
          <p className="text-[#8c7e72]">
             Bem-vindo ao painel de controle pedagógico.
             {currentUser?.role === 'admin' && <span className="text-[#c48b5e] font-medium ml-1">(Administrador)</span>}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           {/* Botão para Mostrar/Ocultar Gráficos */}
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

      {/* KPI Cards */}
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

      {/* Main Grid: Charts + Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts (Left - 2/3 width) */}
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

          {/* Right Column: Notices Widget */}
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
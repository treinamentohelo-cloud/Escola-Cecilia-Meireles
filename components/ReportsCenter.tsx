import React, { useState, useMemo } from 'react';
import { FileText, Filter, Printer, Download, School, BookOpen, AlertTriangle, CheckCircle, BarChart3, LayoutGrid } from 'lucide-react';
import { ClassGroup, Student, Assessment, Skill, Subject, ClassDailyLog, AssessmentStatus } from '../types';

interface ReportsCenterProps {
  classes: ClassGroup[];
  students: Student[];
  assessments: Assessment[];
  skills: Skill[];
  subjects: Subject[];
  logs: ClassDailyLog[];
}

export const ReportsCenter: React.FC<ReportsCenterProps> = ({
  classes,
  students,
  assessments,
  skills,
  subjects,
  logs
}) => {
  const [reportType, setReportType] = useState<'matrix' | 'council'>('matrix');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(''); // Name of subject
  const [selectedTerm, setSelectedTerm] = useState('1º Trimestre');

  // Filtrar Dados
  const studentsInClass = useMemo(() => 
    students.filter(s => s.classId === selectedClassId && s.status === 'active').sort((a,b) => a.name.localeCompare(b.name)),
  [students, selectedClassId]);

  const filteredSkills = useMemo(() => 
    skills.filter(s => s.subject === selectedSubject), 
  [skills, selectedSubject]);

  const activeClass = classes.find(c => c.id === selectedClassId);

  // --- Funções de Cálculo ---

  const getStudentAssessmentForSkill = (studentId: string, skillId: string) => {
      // Pega a avaliação mais recente para este aluno nesta habilidade e trimestre
      return assessments.find(a => 
          a.studentId === studentId && 
          a.skillId === skillId && 
          a.term === selectedTerm
      );
  };

  const getStudentOverallStats = (studentId: string) => {
      // Estatísticas gerais do aluno (todos os tempos)
      const studentAssessments = assessments.filter(a => a.studentId === studentId);
      const total = studentAssessments.length;
      if (total === 0) return { attendance: 0, successRate: 0, remediationCount: 0 };

      const success = studentAssessments.filter(a => a.status === AssessmentStatus.ATINGIU || a.status === AssessmentStatus.SUPEROU).length;
      const remediation = studentAssessments.filter(a => a.status === AssessmentStatus.NAO_ATINGIU).length;

      // Frequência
      const classLogs = logs.filter(l => l.classId === selectedClassId);
      let attendancePct = 100;
      if (classLogs.length > 0) {
          const presentCount = classLogs.filter(l => l.attendance && l.attendance[studentId]).length;
          attendancePct = Math.round((presentCount / classLogs.length) * 100);
      }

      return {
          attendance: attendancePct,
          successRate: Math.round((success / total) * 100),
          remediationCount: remediation
      };
  };

  // --- Handlers ---
  const handlePrint = () => window.print();

  // --- Renders ---

  const renderMatrix = () => {
      if (!selectedClassId || !selectedSubject) {
          return (
              <div className="p-12 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Selecione uma turma e uma disciplina para gerar a matriz.</p>
              </div>
          );
      }

      if (filteredSkills.length === 0) {
          return <div className="p-8 text-center text-gray-500">Nenhuma habilidade cadastrada para esta disciplina.</div>;
      }

      return (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
              <table className="w-full text-left border-collapse text-sm">
                  <thead>
                      <tr>
                          <th className="p-4 bg-gray-50 border-b border-r border-gray-200 min-w-[200px] sticky left-0 z-10 font-bold text-gray-700">
                              Aluno / Habilidade
                          </th>
                          {filteredSkills.map(skill => (
                              <th key={skill.id} className="p-2 bg-gray-50 border-b border-gray-200 text-center min-w-[80px]">
                                  <div className="flex flex-col items-center" title={skill.description}>
                                      <span className="font-mono text-xs font-bold text-[#c48b5e] bg-[#fcf9f6] px-1.5 rounded border border-[#eaddcf] mb-1">{skill.code}</span>
                                      <span className="text-[10px] text-gray-400 font-normal line-clamp-2 w-24 h-8 leading-tight">{skill.description}</span>
                                  </div>
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody>
                      {studentsInClass.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 border-b border-r border-gray-100 font-medium text-gray-700 sticky left-0 bg-white hover:bg-gray-50 z-10 truncate max-w-[200px]">
                                  {student.name}
                              </td>
                              {filteredSkills.map(skill => {
                                  const assessment = getStudentAssessmentForSkill(student.id, skill.id);
                                  let cellClass = "bg-gray-50 text-gray-300"; // Não avaliado
                                  let content = "-";

                                  if (assessment) {
                                      switch (assessment.status) {
                                          case AssessmentStatus.SUPEROU:
                                              cellClass = "bg-green-500 text-white";
                                              content = "S";
                                              break;
                                          case AssessmentStatus.ATINGIU:
                                              cellClass = "bg-cyan-500 text-white";
                                              content = "A";
                                              break;
                                          case AssessmentStatus.EM_DESENVOLVIMENTO:
                                              cellClass = "bg-amber-400 text-white";
                                              content = "ED";
                                              break;
                                          case AssessmentStatus.NAO_ATINGIU:
                                              cellClass = "bg-red-500 text-white";
                                              content = "NA";
                                              break;
                                      }
                                  }

                                  return (
                                      <td key={`${student.id}-${skill.id}`} className="p-1 border-b border-gray-100 text-center">
                                          <div className={`w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-bold ${cellClass}`} title={assessment?.status}>
                                              {content}
                                          </div>
                                      </td>
                                  );
                              })}
                          </tr>
                      ))}
                  </tbody>
              </table>
              <div className="p-4 border-t border-gray-100 flex gap-4 text-xs justify-end bg-gray-50">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Superou (S)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-500 rounded"></div> Atingiu (A)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded"></div> Em Desenv. (ED)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Não Atingiu (NA)</span>
              </div>
          </div>
      );
  };

  const renderCouncil = () => {
      if (!selectedClassId) return <div className="p-8 text-center text-gray-500">Selecione uma turma para gerar a ata.</div>;

      return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-[#fcf9f6] border-b border-[#eaddcf] text-xs uppercase tracking-wider text-[#8c7e72]">
                          <th className="p-4 font-bold">Aluno</th>
                          <th className="p-4 font-bold text-center">Frequência</th>
                          <th className="p-4 font-bold text-center">Aproveitamento</th>
                          <th className="p-4 font-bold text-center">Pontos de Atenção</th>
                          <th className="p-4 font-bold text-center">Situação Sugerida</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {studentsInClass.map(student => {
                          const stats = getStudentOverallStats(student.id);
                          let statusColor = "bg-green-100 text-green-700";
                          let statusText = "Satisfatório";

                          if (stats.attendance < 75 || stats.successRate < 50) {
                              statusColor = "bg-red-100 text-red-700";
                              statusText = "Crítico";
                          } else if (stats.successRate < 70 || stats.remediationCount > 0) {
                              statusColor = "bg-amber-100 text-amber-700";
                              statusText = "Em Observação";
                          }

                          return (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-4 font-medium text-gray-700">{student.name}</td>
                                  <td className="p-4 text-center">
                                      <span className={`font-bold ${stats.attendance < 75 ? 'text-red-600' : 'text-gray-700'}`}>
                                          {stats.attendance}%
                                      </span>
                                  </td>
                                  <td className="p-4 text-center">
                                      <div className="flex flex-col items-center">
                                          <div className="w-24 bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
                                              <div className="bg-[#c48b5e] h-2 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
                                          </div>
                                          <span className="text-xs text-gray-500">{stats.successRate}% Habilidades</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-center">
                                      {stats.remediationCount > 0 ? (
                                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                              {stats.remediationCount} Reprovações
                                          </span>
                                      ) : (
                                          <span className="text-gray-300">-</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-center">
                                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${statusColor}`}>
                                          {statusText}
                                      </span>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
           <h2 className="text-3xl font-bold text-[#433422] flex items-center gap-3">
              <BarChart3 className="text-[#c48b5e]" /> Central de Relatórios
           </h2>
           <p className="text-[#8c7e72]">Conselho de Classe e Mapas de Desempenho</p>
        </div>
        <button 
            onClick={handlePrint}
            className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all font-medium"
        >
            <Printer size={20} /> Imprimir / PDF
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#eaddcf] flex flex-col md:flex-row gap-4 print:hidden">
          <div className="flex items-center gap-2 text-gray-500 font-medium border-r border-gray-200 pr-4">
              <Filter size={18} /> Filtros:
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <select 
                  value={selectedClassId} 
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none"
              >
                  <option value="">Selecione a Turma...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                  value={selectedTerm} 
                  onChange={e => setSelectedTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none"
              >
                  <option value="1º Trimestre">1º Trimestre</option>
                  <option value="2º Trimestre">2º Trimestre</option>
                  <option value="3º Trimestre">3º Trimestre</option>
                  <option value="Recuperação">Recuperação</option>
              </select>

              <select 
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none disabled:bg-gray-100"
                  disabled={reportType === 'council'}
              >
                  <option value="">Selecione a Disciplina...</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
          </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
          <button 
              onClick={() => setReportType('matrix')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${reportType === 'matrix' ? 'bg-white text-[#c48b5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <LayoutGrid size={16} /> Mapa de Habilidades
          </button>
          <button 
              onClick={() => setReportType('council')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${reportType === 'council' ? 'bg-white text-[#c48b5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <School size={16} /> Ata de Conselho
          </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 uppercase">
              {reportType === 'matrix' ? 'Mapa de Habilidades e Desempenho' : 'Ata de Resultados - Conselho de Classe'}
          </h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span><strong>Turma:</strong> {activeClass?.name || 'Todas'}</span>
              <span><strong>Trimestre:</strong> {selectedTerm}</span>
              {reportType === 'matrix' && <span><strong>Disciplina:</strong> {selectedSubject}</span>}
              <span className="ml-auto">Emissão: {new Date().toLocaleDateString()}</span>
          </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[400px]">
          {reportType === 'matrix' ? renderMatrix() : renderCouncil()}
      </div>
    </div>
  );
};
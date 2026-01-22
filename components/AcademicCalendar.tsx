import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, BookOpen, GraduationCap, X } from 'lucide-react';
import { Notice, Assessment, ClassGroup, Skill } from '../types';

interface AcademicCalendarProps {
  notices: Notice[];
  assessments: Assessment[];
  classes: ClassGroup[];
  skills: Skill[];
}

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({
  notices,
  assessments,
  classes,
  skills
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navegação do mês
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Lógica do Grid do Calendário
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Domingo

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Padding days
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  // Agrupamento de Eventos por Data
  const eventsByDate = useMemo(() => {
    const map: Record<string, { notices: Notice[], assessments: Assessment[] }> = {};

    // Mapear Avisos
    notices.forEach(notice => {
      const dateKey = notice.date; // YYYY-MM-DD
      if (!map[dateKey]) map[dateKey] = { notices: [], assessments: [] };
      map[dateKey].notices.push(notice);
    });

    // Mapear Avaliações (apenas mostra que houve avaliação no dia, agrupado por turma talvez?)
    // Para o calendário não ficar poluído, vamos contar avaliações como "Atividade Acadêmica"
    assessments.forEach(assessment => {
        const dateKey = assessment.date;
        if (!map[dateKey]) map[dateKey] = { notices: [], assessments: [] };
        map[dateKey].assessments.push(assessment);
    });

    return map;
  }, [notices, assessments]);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const getEventsForDate = (date: Date) => eventsByDate[formatDateKey(date)];

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : null;

  const getMonthName = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getWeekDayName = (dayIndex: number) => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return days[dayIndex];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Coluna Principal: Calendário */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#eaddcf] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#433422] capitalize flex items-center gap-2">
                <CalendarIcon className="text-[#c48b5e]" />
                {getMonthName(currentDate)}
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <button onClick={goToToday} className="px-4 py-1.5 text-sm font-bold text-[#c48b5e] bg-[#fcf9f6] border border-[#eaddcf] rounded-lg hover:bg-[#eaddcf] transition-colors">
                    Hoje
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {[0,1,2,3,4,5,6].map(d => (
                <div key={d} className="py-3 text-center text-sm font-bold text-[#8c7e72] uppercase tracking-wider">
                    {getWeekDayName(d)}
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {days.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="bg-[#fdfbf7]/30 border-b border-r border-gray-50" />;
                
                const dateKey = formatDateKey(date);
                const data = eventsByDate[dateKey];
                const isToday = formatDateKey(new Date()) === dateKey;
                const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;
                const hasNotices = data?.notices.length > 0;
                const hasAssessments = data?.assessments.length > 0;

                return (
                    <div 
                        key={dateKey} 
                        onClick={() => setSelectedDate(date)}
                        className={`
                            relative border-b border-r border-gray-100 p-2 cursor-pointer transition-all hover:bg-gray-50
                            ${isSelected ? 'bg-[#fcf9f6] ring-2 ring-inset ring-[#c48b5e]' : ''}
                        `}
                    >
                        <span className={`
                            text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                            ${isToday ? 'bg-[#c48b5e] text-white' : 'text-gray-700'}
                        `}>
                            {date.getDate()}
                        </span>

                        <div className="flex flex-col gap-1 overflow-hidden">
                            {hasNotices && data.notices.slice(0, 2).map((notice, i) => (
                                <div key={i} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${notice.type === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {notice.title}
                                </div>
                            ))}
                            {hasNotices && data.notices.length > 2 && (
                                <div className="text-[10px] text-gray-400 pl-1">+{data.notices.length - 2} mais</div>
                            )}
                            
                            {hasAssessments && !hasNotices && (
                                <div className="flex items-center gap-1 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                    <span className="text-[10px] text-gray-500">{data.assessments.length} Atividades</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Painel Lateral de Detalhes */}
      {selectedDate && (
          <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl border border-[#eaddcf] flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 bg-[#c48b5e] text-white flex justify-between items-start rounded-t-2xl">
                  <div>
                      <p className="text-white/80 font-medium uppercase tracking-wide text-xs">{getWeekDayName(selectedDate.getDay())}</p>
                      <h3 className="text-3xl font-bold">{selectedDate.getDate()}</h3>
                      <p className="text-white/90">{selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <X size={20} />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Seção de Avisos */}
                  <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertCircle size={14} /> Eventos & Avisos
                      </h4>
                      {selectedEvents?.notices && selectedEvents.notices.length > 0 ? (
                          <div className="space-y-3">
                              {selectedEvents.notices.map(notice => (
                                  <div key={notice.id} className={`p-4 rounded-xl border-l-4 shadow-sm ${notice.type === 'urgent' ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                                      <h5 className={`font-bold text-sm mb-1 ${notice.type === 'urgent' ? 'text-red-900' : 'text-blue-900'}`}>{notice.title}</h5>
                                      <p className="text-xs text-gray-600 line-clamp-3">{notice.content}</p>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-gray-400 italic">Nenhum evento agendado.</p>
                      )}
                  </div>

                  {/* Seção de Avaliações */}
                  <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <GraduationCap size={14} /> Atividades Acadêmicas
                      </h4>
                      {selectedEvents?.assessments && selectedEvents.assessments.length > 0 ? (
                          <div className="space-y-3">
                              {/* Agrupar avaliações por turma/habilidade para não repetir demais */}
                              {Array.from(new Set(selectedEvents.assessments.map(a => a.skillId))).map(skillId => {
                                  const skill = skills.find(s => s.id === skillId);
                                  const count = selectedEvents.assessments.filter(a => a.skillId === skillId).length;
                                  // Pegar uma turma de exemplo (primeiro aluno)
                                  const sampleStudentId = selectedEvents.assessments.find(a => a.skillId === skillId)?.studentId;
                                  // Isso é aproximado, pois assessment não tem classId direto, precisa buscar via student
                                  // Mas para visualização rápida serve.
                                  
                                  return (
                                      <div key={skillId} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                              <BookOpen size={16} />
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-gray-800">{skill?.subject}</p>
                                              <p className="text-xs text-gray-500 mb-1">{skill?.description}</p>
                                              <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500 font-bold">
                                                  {count} Registros
                                              </span>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <p className="text-sm text-gray-400 italic">Nenhuma avaliação registrada.</p>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
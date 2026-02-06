import React, { useState } from 'react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BookOpen, Sparkles, Save, Printer, Trash2, Calendar, Clock, Target, Box, FileText, CheckSquare, Square, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { LessonPlan, ClassGroup, Subject, Skill, User } from '../types';

interface LessonPlannerProps {
  plans: LessonPlan[];
  classes: ClassGroup[];
  subjects: Subject[];
  skills: Skill[];
  currentUser: User | null;
  onAddPlan: (p: LessonPlan) => void;
  onDeletePlan: (id: string) => void;
}

export const LessonPlanner: React.FC<LessonPlannerProps> = ({
  plans,
  classes,
  subjects,
  skills,
  currentUser,
  onAddPlan,
  onDeletePlan
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<LessonPlan>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    classId: '',
    subjectId: '',
    duration: '50 min',
    objectives: '',
    content: '',
    methodology: '',
    resources: '',
    evaluation: '',
    bnccSkillIds: []
  });

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleGenerateAI = async () => {
      if (!formData.title || !formData.subjectId || !formData.classId) {
          alert('Por favor, preencha o Tema, a Turma e a Disciplina antes de gerar com IA.');
          return;
      }

      // --- RECUPERAÇÃO ROBUSTA DA CHAVE DE API ---
      // Tenta obter via window (injetado no index.html) para evitar que o build substitua process.env por undefined
      let apiKey = '';
      
      // Tentativa 1: Via Window (Injeção manual no index.html)
      if (typeof window !== 'undefined' && (window as any).process && (window as any).process.env) {
          apiKey = (window as any).process.env.API_KEY;
      } 
      
      // Tentativa 2: Fallback padrão
      if (!apiKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          apiKey = process.env.API_KEY;
      }

      // Validação final
      if (!apiKey || apiKey.includes('YOUR_API_KEY') || apiKey.length < 10) {
          console.error("Debug API Key Failure. Value found:", apiKey);
          alert("Erro de Configuração: Chave de API não encontrada.\n\nCertifique-se de que o código em 'index.html' contém o script window.process com a chave correta.");
          return;
      }

      setIsGenerating(true);
      try {
          const subjectName = subjects.find(s => s.id === formData.subjectId)?.name || 'Geral';
          const className = classes.find(c => c.id === formData.classId)?.grade || 'Turma';
          
          const ai = new GoogleGenAI({ apiKey: apiKey });
          
          const prompt = `Crie um plano de aula completo e detalhado para a disciplina de ${subjectName}, turma ${className}, com o tema: "${formData.title}".`;

          const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
              objectives: { type: Type.STRING, description: "Lista de objetivos específicos da aula." },
              content: { type: Type.STRING, description: "Principais tópicos do conteúdo a ser abordado." },
              methodology: { type: Type.STRING, description: "Estratégias de ensino e passo a passo da aula." },
              resources: { type: Type.STRING, description: "Lista de materiais e recursos necessários." },
              evaluation: { type: Type.STRING, description: "Forma de avaliação da aprendizagem." },
            },
            required: ["objectives", "content", "methodology", "resources", "evaluation"],
          };

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash", // Modelo rápido e estável para JSON
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: responseSchema,
              }
          });

          const jsonText = response.text || "{}";
          // Remove potential markdown code blocks just in case
          const cleanJson = jsonText.replace(/```json\n?|\n?```/g, "").trim();
          const result = JSON.parse(cleanJson);
          
          setFormData(prev => ({
              ...prev,
              objectives: result.objectives || '',
              content: result.content || '',
              methodology: result.methodology || '',
              resources: result.resources || '',
              evaluation: result.evaluation || ''
          }));

      } catch (error: any) {
          console.error("Erro ao gerar plano:", error);
          const errorMessage = error?.message || "Erro desconhecido";
          alert(`Não foi possível gerar o plano com IA. \nErro: ${errorMessage}\n\nVerifique o console (F12) para mais detalhes.`);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.classId) return;

      onAddPlan({
          id: generateId(),
          title: formData.title!,
          date: formData.date!,
          classId: formData.classId!,
          subjectId: formData.subjectId || '',
          duration: formData.duration || '50 min',
          objectives: formData.objectives || '',
          content: formData.content || '',
          methodology: formData.methodology || '',
          resources: formData.resources || '',
          evaluation: formData.evaluation || '',
          bnccSkillIds: formData.bnccSkillIds || [],
          createdAt: new Date().toISOString()
      });

      setIsFormOpen(false);
      setFormData({
        title: '', date: new Date().toISOString().split('T')[0], classId: '', subjectId: '',
        duration: '50 min', objectives: '', content: '', methodology: '', resources: '', evaluation: '', bnccSkillIds: []
      });
  };

  const toggleSkillSelection = (skillId: string) => {
      setFormData(prev => {
          const current = prev.bnccSkillIds || [];
          if (current.includes(skillId)) {
              return { ...prev, bnccSkillIds: current.filter(id => id !== skillId) };
          }
          return { ...prev, bnccSkillIds: [...current, skillId] };
      });
  };

  const handleDelete = (id: string) => {
      if (confirm('Deseja excluir este plano de aula?')) {
          onDeletePlan(id);
      }
  };

  const handlePrint = (plan: LessonPlan) => {
      window.print();
  };

  const filteredSkills = skills.filter(s => {
      const subj = subjects.find(sub => sub.id === formData.subjectId);
      return !formData.subjectId || (subj && s.subject === subj.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
           <h2 className="text-3xl font-bold text-[#433422] flex items-center gap-3">
              <BookOpen className="text-[#c48b5e]" /> Planejador de Aulas
           </h2>
           <p className="text-[#8c7e72]">Crie e organize seus roteiros pedagógicos com auxílio de IA</p>
        </div>
        
        <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all font-medium"
        >
            <Sparkles size={20} /> Criar Novo Plano
        </button>
      </div>

      {!isFormOpen ? (
          <div className="grid grid-cols-1 gap-6">
              {plans.length === 0 && (
                  <div className="py-16 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                      <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhum plano de aula criado.</p>
                      <p className="text-sm">Clique em "Criar Novo Plano" para começar.</p>
                  </div>
              )}

              {plans.slice().reverse().map(plan => {
                  const isExpanded = expandedPlanId === plan.id;
                  const classInfo = classes.find(c => c.id === plan.classId);
                  const subjectInfo = subjects.find(s => s.id === plan.subjectId);

                  return (
                      <div key={plan.id} className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${isExpanded ? 'border-[#c48b5e] ring-1 ring-[#c48b5e]' : 'border-gray-100 hover:border-[#c48b5e]'}`}>
                          <div 
                            className="p-5 flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          >
                              <div className="flex flex-col gap-1">
                                  <h3 className="font-bold text-[#433422] text-lg">{plan.title}</h3>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(plan.date).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span className="font-medium text-[#c48b5e]">{classInfo?.name}</span>
                                      <span>•</span>
                                      <span>{subjectInfo?.name || 'Geral'}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <button onClick={(e) => { e.stopPropagation(); handlePrint(plan); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors print:hidden" title="Imprimir">
                                      <Printer size={18} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors print:hidden" title="Excluir">
                                      <Trash2 size={18} />
                                  </button>
                                  {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                              </div>
                          </div>

                          {isExpanded && (
                              <div className="p-6 space-y-6 bg-white animate-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                          <div>
                                              <h4 className="text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={14} /> Objetivos</h4>
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-[#fcf9f6] p-3 rounded-lg border border-[#eaddcf]">{plan.objectives}</p>
                                          </div>
                                          <div>
                                              <h4 className="text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-1 flex items-center gap-1"><Box size={14} /> Conteúdo</h4>
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{plan.content}</p>
                                          </div>
                                      </div>
                                      <div className="space-y-4">
                                          <div>
                                              <h4 className="text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles size={14} /> Metodologia</h4>
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{plan.methodology}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                  <h4 className="text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-1">Recursos</h4>
                                                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{plan.resources}</p>
                                              </div>
                                              <div>
                                                  <h4 className="text-xs font-bold text-[#c48b5e] uppercase tracking-wider mb-1">Avaliação</h4>
                                                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{plan.evaluation}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {plan.bnccSkillIds && plan.bnccSkillIds.length > 0 && (
                                      <div className="border-t border-gray-100 pt-4">
                                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Habilidades BNCC Trabalhadas</h4>
                                          <div className="flex flex-wrap gap-2">
                                              {plan.bnccSkillIds.map(skillId => {
                                                  const skill = skills.find(s => s.id === skillId);
                                                  return skill ? (
                                                      <span key={skillId} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 font-mono" title={skill.description}>
                                                          {skill.code}
                                                      </span>
                                                  ) : null;
                                              })}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-[#eaddcf] overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center text-white">
                  <h3 className="font-bold text-xl flex items-center gap-2"><Sparkles size={20} className="text-[#eaddcf]" /> Novo Plano de Aula</h3>
                  <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Coluna Principal: Dados e IA */}
                  <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Tema da Aula</label>
                              <input 
                                  required
                                  value={formData.title}
                                  onChange={e => setFormData({...formData, title: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white"
                                  placeholder="Ex: Ciclo da Água"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Turma</label>
                              <select 
                                  value={formData.classId}
                                  onChange={e => setFormData({...formData, classId: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white"
                              >
                                  <option value="">Selecione...</option>
                                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Disciplina</label>
                              <select 
                                  value={formData.subjectId}
                                  onChange={e => setFormData({...formData, subjectId: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white"
                              >
                                  <option value="">Selecione...</option>
                                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Data</label>
                              <input 
                                  type="date"
                                  value={formData.date}
                                  onChange={e => setFormData({...formData, date: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Duração</label>
                              <input 
                                  value={formData.duration}
                                  onChange={e => setFormData({...formData, duration: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white"
                                  placeholder="Ex: 50 min"
                              />
                          </div>
                      </div>

                      {/* AI Action Button */}
                      <div className="bg-[#fcf9f6] p-4 rounded-xl border border-[#eaddcf] flex items-center justify-between">
                          <div>
                              <h4 className="font-bold text-[#c48b5e] flex items-center gap-2"><Sparkles size={16} /> Assistente de IA</h4>
                              <p className="text-xs text-gray-500">Preencha o tema e clique para gerar sugestões.</p>
                          </div>
                          <button 
                              type="button" 
                              onClick={handleGenerateAI}
                              disabled={isGenerating}
                              className="bg-[#c48b5e] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#a0704a] transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                              {isGenerating ? 'Gerando...' : 'Gerar Roteiro'}
                          </button>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Objetivos Específicos</label>
                              <textarea 
                                  value={formData.objectives}
                                  onChange={e => setFormData({...formData, objectives: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white h-24 resize-none"
                                  placeholder="O que o aluno deve aprender..."
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Conteúdo Programático</label>
                              <textarea 
                                  value={formData.content}
                                  onChange={e => setFormData({...formData, content: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white h-24 resize-none"
                                  placeholder="Tópicos abordados..."
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1.5">Metodologia</label>
                              <textarea 
                                  value={formData.methodology}
                                  onChange={e => setFormData({...formData, methodology: e.target.value})}
                                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white h-24 resize-none"
                                  placeholder="Como a aula será conduzida..."
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Recursos</label>
                                  <textarea 
                                      value={formData.resources}
                                      onChange={e => setFormData({...formData, resources: e.target.value})}
                                      className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white h-20 resize-none"
                                      placeholder="Lousa, Datashow..."
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Avaliação</label>
                                  <textarea 
                                      value={formData.evaluation}
                                      onChange={e => setFormData({...formData, evaluation: e.target.value})}
                                      className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white h-20 resize-none"
                                      placeholder="Exercícios, Participação..."
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Coluna Lateral: Habilidades BNCC */}
                  <div className="lg:col-span-1 border-l border-gray-100 pl-8 flex flex-col h-full">
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <Target size={18} className="text-[#c48b5e]" /> Habilidades BNCC
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">Selecione as habilidades trabalhadas nesta aula.</p>
                      
                      <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[600px]">
                          {filteredSkills.map(skill => {
                              const isSelected = formData.bnccSkillIds?.includes(skill.id);
                              return (
                                  <div 
                                      key={skill.id} 
                                      onClick={() => toggleSkillSelection(skill.id)}
                                      className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-[#fcf9f6] border-[#c48b5e]' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                  >
                                      <div className="flex items-start gap-3">
                                          {isSelected ? <CheckSquare size={18} className="text-[#c48b5e] mt-0.5 shrink-0" /> : <Square size={18} className="text-gray-300 mt-0.5 shrink-0" />}
                                          <div>
                                              <span className="text-xs font-bold text-[#c48b5e] font-mono block mb-1">{skill.code}</span>
                                              <p className="text-xs text-gray-600 line-clamp-3">{skill.description}</p>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                          {filteredSkills.length === 0 && (
                              <p className="text-sm text-gray-400 text-center py-4">Selecione uma disciplina para ver as habilidades.</p>
                          )}
                      </div>

                      <div className="pt-6 mt-auto">
                          <button 
                              onClick={handleSubmit}
                              className="w-full bg-[#c48b5e] text-white py-3 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all flex items-center justify-center gap-2"
                          >
                              <Save size={20} /> Salvar Plano
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
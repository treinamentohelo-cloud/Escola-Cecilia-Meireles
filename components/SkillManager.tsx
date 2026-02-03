import React, { useState } from 'react';
import { Plus, Search, BookOpen, Edit2, Trash2, Link as LinkIcon, X, CheckSquare, Square, School, Library, Upload, AlertCircle, FileText } from 'lucide-react';
import { Skill, ClassGroup, User as UserType, Subject } from '../types';

interface SkillManagerProps {
  skills: Skill[];
  classes?: ClassGroup[];
  subjects: Subject[];
  currentUser: UserType | null;
  onAddSkill: (s: Skill) => void;
  onUpdateSkill: (s: Skill) => void;
  onDeleteSkill: (id: string) => void;
  onUpdateClass?: (c: ClassGroup) => void;
  onAddSubject: (s: Subject) => void;
}

export const SkillManager: React.FC<SkillManagerProps> = ({ 
    skills, 
    classes = [],
    subjects = [],
    currentUser,
    onAddSkill,
    onUpdateSkill,
    onDeleteSkill,
    onUpdateClass,
    onAddSubject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ 
      code: '', 
      description: '', 
      subject: '', 
      year: '' 
  });

  // Create Subject State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Batch Import State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchSubject, setBatchSubject] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<any[]>([]);

  // State for Linking Modal
  const [linkingSkill, setLinkingSkill] = useState<Skill | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const canDelete = currentUser?.role !== 'professor';

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const filteredSkills = skills.filter(s => 
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.year.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ code: '', description: '', subject: '', year: '' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData({
        code: skill.code,
        description: skill.description,
        subject: skill.subject,
        year: skill.year
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if(window.confirm('Tem certeza que deseja excluir esta habilidade?')) {
        onDeleteSkill(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) {
        alert("Selecione uma disciplina.");
        return;
    }

    const payload = {
      id: editingId || generateId(),
      ...formData
    };

    if (editingId) {
        onUpdateSkill(payload);
    } else {
        onAddSkill(payload);
    }
    
    resetForm();
  };

  // --- Subject Logic ---
  const handleCreateSubject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSubjectName.trim()) return;
      
      const newSubject: Subject = {
          id: generateId(),
          name: newSubjectName.trim()
      };
      
      onAddSubject(newSubject);
      setNewSubjectName('');
      setIsSubjectModalOpen(false);
      
      // Auto-select the new subject in the main form
      setFormData(prev => ({ ...prev, subject: newSubject.name }));
  };

  // --- Batch Import Logic ---
  const handleBatchTextChange = (text: string) => {
      setBatchText(text);
      
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const parsedItems: any[] = [];
      let currentItem: { code: string; description: string; valid: boolean } | null = null;

      // Regex flexível para capturar códigos BNCC e descrições
      // Captura: (Opcional parens) CODIGO (Opcional parens) (Opcional separador - : ou espaço) Descrição
      const skillRegex = /^\s*\(?([A-Z0-9]{4,12})\)?\s*[-|–|:]?\s*(.+)$/i;

      lines.forEach(line => {
          const match = line.match(skillRegex);
          const potentialCode = match ? match[1] : '';
          
          // Heurística: Um código válido geralmente contém pelo menos um número (ex: EF01LP01, EM13, etc)
          // Isso evita capturar palavras comuns em listas numeradas erradas ou tópicos que parecem códigos.
          const hasNumber = /\d/.test(potentialCode);

          if (match && hasNumber) {
              // Se já temos um item sendo processado, salvamos ele antes de começar o novo
              if (currentItem) {
                  parsedItems.push(currentItem);
              }
              
              // Inicia novo item
              currentItem = {
                  code: potentialCode.toUpperCase(), // Padroniza maiúsculo
                  description: match[2].trim(),
                  valid: true
              };
          } else {
              // Se não detectou um novo código, assume que é continuação da descrição do item anterior (multilinha)
              if (currentItem) {
                  currentItem.description += ' ' + line.trim();
              } else {
                  // Linha órfã que não é continuação nem novo código
                  parsedItems.push({ code: '?', description: line, valid: false });
              }
          }
      });

      // Adiciona o último item processado
      if (currentItem) {
          parsedItems.push(currentItem);
      }

      setBatchPreview(parsedItems);
  };

  const handleBatchSubmit = () => {
      if (!batchSubject || !batchYear) {
          alert('Por favor, selecione a Disciplina e o Ano para aplicar a todas as habilidades.');
          return;
      }

      const validItems = batchPreview.filter(p => p.valid);
      if (validItems.length === 0) {
          alert('Nenhuma habilidade válida identificada. Verifique o formato do texto.');
          return;
      }

      if (window.confirm(`Confirma a importação de ${validItems.length} habilidades para ${batchSubject}?`)) {
          validItems.forEach(item => {
              onAddSkill({
                  id: generateId(),
                  code: item.code,
                  description: item.description,
                  subject: batchSubject,
                  year: batchYear
              });
          });
          
          setIsBatchModalOpen(false);
          setBatchText('');
          setBatchPreview([]);
          setBatchSubject('');
          setBatchYear('');
      }
  };

  // --- Link to Class Logic ---

  const openLinkModal = (skill: Skill) => {
      setLinkingSkill(skill);
      // Find classes that have this skill in their focusSkills array
      const activeClasses = classes
        .filter(c => c.focusSkills?.includes(skill.id))
        .map(c => c.id);
      setSelectedClassIds(activeClasses);
  };

  const toggleClassSelection = (classId: string) => {
      setSelectedClassIds(prev => 
         prev.includes(classId) 
           ? prev.filter(id => id !== classId)
           : [...prev, classId]
      );
  };

  const handleSaveLinks = () => {
      if (!linkingSkill || !onUpdateClass) return;

      // Update classes that CHANGED state
      classes.forEach(cls => {
          const currentlyHasSkill = cls.focusSkills?.includes(linkingSkill.id);
          const shouldHaveSkill = selectedClassIds.includes(cls.id);

          if (currentlyHasSkill !== shouldHaveSkill) {
              let newFocusSkills = cls.focusSkills || [];
              if (shouldHaveSkill) {
                  newFocusSkills = [...newFocusSkills, linkingSkill.id];
              } else {
                  newFocusSkills = newFocusSkills.filter(id => id !== linkingSkill.id);
              }
              // Call update for this class
              onUpdateClass({ ...cls, focusSkills: newFocusSkills });
          }
      });
      
      setLinkingSkill(null);
      setSelectedClassIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422]">Habilidades BNCC</h2>
           <p className="text-[#8c7e72]">Catálogo de competências curriculares</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setIsBatchModalOpen(true)}
              className="bg-white border border-[#eaddcf] text-[#c48b5e] hover:bg-[#fcf9f6] px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all"
            >
              <Upload size={18} /> Importar em Lote
            </button>
            <button 
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
            >
              <Plus size={18} /> Cadastrar Habilidade
            </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#eaddcf] animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center gap-2 mb-6 text-[#c48b5e]">
              <BookOpen />
              <h3 className="font-bold text-xl">{editingId ? 'Editar Habilidade' : 'Nova Habilidade'}</h3>
           </div>
           
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Código BNCC</label>
                <input 
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all"
                  placeholder="Ex: EF01LP01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Ano / Série</label>
                <input 
                  required
                  value={formData.year}
                  onChange={e => setFormData({...formData, year: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all"
                  placeholder="Ex: 1º Ano"
                />
              </div>

              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-gray-700 mb-1.5">Disciplina</label>
                 <div className="flex gap-2">
                     <select 
                        required
                        value={formData.subject}
                        onChange={e => setFormData({...formData, subject: e.target.value})}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all"
                     >
                        <option value="">Selecione...</option>
                        {subjects.map(sub => (
                            <option key={sub.id} value={sub.name}>{sub.name}</option>
                        ))}
                     </select>
                     <button 
                        type="button" 
                        onClick={() => setIsSubjectModalOpen(true)}
                        className="px-3 bg-[#c48b5e] text-white rounded-xl hover:bg-[#a0704a] transition-colors"
                        title="Nova Disciplina"
                     >
                        <Plus size={20} />
                     </button>
                 </div>
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Descrição</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white transition-all resize-none h-24"
                  placeholder="Descrição detalhada da habilidade..."
                />
              </div>

              <div className="flex gap-3 md:col-span-4 justify-end mt-2">
                 <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                 <button type="submit" className="px-8 py-2.5 bg-[#c48b5e] text-white rounded-xl font-bold hover:bg-[#a0704a] shadow-md shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {/* Modal Criar Disciplina */}
      {isSubjectModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-[#433422]">Nova Disciplina</h3>
                    <button onClick={() => setIsSubjectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleCreateSubject} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Nome da Disciplina</label>
                        <input 
                            autoFocus
                            required
                            value={newSubjectName}
                            onChange={e => setNewSubjectName(e.target.value)}
                            placeholder="Ex: Robótica"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                    </div>
                    <button type="submit" className="w-full bg-[#c48b5e] text-white py-3 rounded-xl font-bold hover:bg-[#a0704a]">
                        Criar
                    </button>
                </form>
            </div>
          </div>
      )}

      {/* MODAL IMPORTAÇÃO EM LOTE */}
      {isBatchModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf] h-[90vh] flex flex-col">
               <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center shrink-0">
                   <h3 className="font-bold text-xl text-white flex items-center gap-2">
                      <Upload className="text-[#eaddcf]" size={24} /> Importar Habilidades em Lote
                   </h3>
                   <button onClick={() => setIsBatchModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                      <X size={24} />
                   </button>
               </div>
               
               <div className="p-6 flex-1 overflow-y-auto">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                       {/* Esquerda: Inputs */}
                       <div className="flex flex-col gap-4">
                           <div className="bg-[#fcf9f6] p-4 rounded-xl border border-[#eaddcf] text-sm text-[#433422] mb-2">
                               <p className="font-bold mb-1">Como usar:</p>
                               <p>1. Selecione a Disciplina e o Ano.</p>
                               <p>2. Cole a lista de habilidades abaixo.</p>
                               <p>3. O sistema reconhece automaticamente códigos como <strong>EF01LP01</strong> ou <strong>(EF01LP01)</strong>.</p>
                               <p className="text-xs text-gray-500 mt-2">Dica: Textos quebrados em várias linhas serão unidos automaticamente à habilidade anterior.</p>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-sm font-bold text-gray-700 mb-1.5">Disciplina (Aplicar a todos)</label>
                                   <select 
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-gray-900"
                                        value={batchSubject}
                                        onChange={e => setBatchSubject(e.target.value)}
                                   >
                                        <option value="">Selecione...</option>
                                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-gray-700 mb-1.5">Ano (Aplicar a todos)</label>
                                   <input 
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-gray-900"
                                        value={batchYear}
                                        onChange={e => setBatchYear(e.target.value)}
                                        placeholder="Ex: 3º Ano"
                                   />
                               </div>
                           </div>

                           <div className="flex-1 flex flex-col">
                               <label className="block text-sm font-bold text-gray-700 mb-1.5">Lista de Habilidades</label>
                               <textarea 
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-gray-900 font-mono text-sm resize-none flex-1 min-h-[300px]"
                                    placeholder="Cole aqui... Ex: (EF01LP01) Descrição..."
                                    value={batchText}
                                    onChange={e => handleBatchTextChange(e.target.value)}
                               />
                           </div>
                       </div>

                       {/* Direita: Preview */}
                       <div className="flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                           <div className="p-3 bg-gray-100 border-b border-gray-200 font-bold text-gray-600 text-sm flex justify-between">
                               <span>Pré-visualização</span>
                               <span>{batchPreview.filter(i => i.valid).length} Válidos</span>
                           </div>
                           <div className="flex-1 overflow-y-auto p-2 space-y-2">
                               {batchPreview.length === 0 && <p className="text-gray-400 text-center text-sm py-10">Cole o texto ao lado para visualizar.</p>}
                               {batchPreview.map((item, idx) => (
                                   <div key={idx} className={`p-2 rounded border text-sm flex gap-2 ${item.valid ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                                       {item.valid ? <CheckSquare size={16} className="text-green-500 shrink-0 mt-0.5"/> : <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5"/>}
                                       <div>
                                           <span className="font-bold block text-xs text-[#c48b5e]">{item.code}</span>
                                           <span className="text-gray-700">{item.description}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                           <div className="p-4 bg-white border-t border-gray-200">
                               <button 
                                    onClick={handleBatchSubmit}
                                    className="w-full bg-[#c48b5e] text-white py-3 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!batchSubject || !batchYear || batchPreview.filter(i => i.valid).length === 0}
                               >
                                    Confirmar Importação
                               </button>
                           </div>
                       </div>
                   </div>
               </div>
            </div>
          </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar habilidade por código, ano ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c48b5e] outline-none shadow-sm text-black placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map(skill => {
            const usageCount = classes.filter(c => c.focusSkills?.includes(skill.id)).length;
            
            return (
              <div key={skill.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-[#eaddcf] hover:shadow-lg transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="bg-[#fcf9f6] text-[#c48b5e] font-mono font-bold px-2 py-1 rounded text-sm w-fit border border-[#eaddcf]">
                            {skill.code}
                        </span>
                        <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wide">
                            {skill.year}
                        </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(skill)} className="p-1.5 text-gray-400 hover:text-[#c48b5e] rounded hover:bg-[#fcf9f6]">
                            <Edit2 size={16} />
                        </button>
                        {canDelete && (
                            <button onClick={() => handleDeleteClick(skill.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-gray-800 font-medium mb-4 line-clamp-3 flex-1 mt-2">
                    {skill.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center text-xs text-gray-500">
                        <BookOpen size={14} className="mr-1.5 text-[#c48b5e]" />
                        {skill.subject}
                    </div>
                    
                    {/* Link to Class Button */}
                    {onUpdateClass && (
                        <div className="flex items-center gap-2">
                             {usageCount > 0 && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold" title={`${usageCount} Turmas Focadas`}>
                                    {usageCount}
                                </span>
                             )}
                             <button 
                                onClick={() => openLinkModal(skill)}
                                className={`p-1.5 rounded-lg transition-colors ${usageCount > 0 ? 'bg-[#c48b5e] text-white' : 'bg-gray-50 text-gray-400 hover:bg-[#eaddcf] hover:text-[#c48b5e]'}`}
                                title="Vincular a Turmas"
                             >
                                <LinkIcon size={14} />
                             </button>
                        </div>
                    )}
                </div>
              </div>
            );
        })}
        {filteredSkills.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-[#c48b5e] transition-colors">
              <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Library className="text-gray-300" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-1">Nenhuma habilidade encontrada</h3>
              <p className="text-sm text-gray-400">Verifique os filtros ou cadastre uma nova habilidade.</p>
          </div>
        )}
      </div>

      {/* MODAL: VINCULAR HABILIDADE A TURMAS */}
      {linkingSkill && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
               <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                   <h3 className="font-bold text-xl text-white flex items-center gap-2">
                      <LinkIcon className="text-[#eaddcf]" /> Vincular a Turmas
                   </h3>
                   <button onClick={() => setLinkingSkill(null)} className="text-white/80 hover:text-white transition-colors">
                      <X size={24} />
                   </button>
               </div>
               
               <div className="p-6">
                   <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                       <p className="text-xs text-[#c48b5e] font-bold font-mono mb-1">{linkingSkill.code}</p>
                       <p className="text-sm text-gray-700">{linkingSkill.description}</p>
                   </div>
                   
                   <p className="text-sm font-semibold text-[#433422] mb-3">Selecione as turmas que terão esta habilidade como foco:</p>
                   
                   <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                       {classes.map(cls => {
                           const isSelected = selectedClassIds.includes(cls.id);
                           return (
                               <div 
                                  key={cls.id} 
                                  onClick={() => toggleClassSelection(cls.id)}
                                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'border-[#c48b5e] bg-[#fcf9f6]' : 'border-gray-200 hover:bg-gray-50'}`}
                               >
                                   <div className="flex items-center gap-3">
                                       <School size={16} className={isSelected ? 'text-[#c48b5e]' : 'text-gray-400'} />
                                       <span className={`text-sm font-medium ${isSelected ? 'text-[#c48b5e]' : 'text-gray-600'}`}>{cls.name}</span>
                                   </div>
                                   {isSelected ? <CheckSquare size={20} className="text-[#c48b5e]" /> : <Square size={20} className="text-gray-300" />}
                               </div>
                           );
                       })}
                       {classes.length === 0 && <p className="text-sm text-gray-400 text-center">Nenhuma turma cadastrada.</p>}
                   </div>

                   <button 
                      onClick={handleSaveLinks}
                      className="w-full bg-[#c48b5e] text-white py-3 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all"
                   >
                      Salvar Vínculos
                   </button>
               </div>
            </div>
          </div>
      )}

    </div>
  );
};
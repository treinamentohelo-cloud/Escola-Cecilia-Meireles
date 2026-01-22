import React, { useState } from 'react';
import { Folder, Upload, FileText, File, Download, Trash2, Search, Filter, X, Loader2, BookOpen, Briefcase, ClipboardList, Paperclip, CheckCircle2 } from 'lucide-react';
import { Material, Subject, User } from '../types';
import { api } from '../supabaseClient';

interface DigitalLibraryProps {
  materials: Material[];
  subjects: Subject[];
  currentUser: User | null;
  onAddMaterial: (m: Material) => void;
  onDeleteMaterial: (id: string) => void;
}

export const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ 
  materials, 
  subjects, 
  currentUser, 
  onAddMaterial, 
  onDeleteMaterial 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Material>>({
    title: '',
    description: '',
    category: 'activity',
    subjectId: '',
    fileUrl: ''
  });

  const canEdit = currentUser?.role !== 'professor' || true; // All teachers can upload for now

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const categories = [
      { id: 'planning', label: 'Planejamento', icon: <Briefcase size={18} className="text-purple-500" />, color: 'bg-purple-50 text-purple-700 border-purple-100' },
      { id: 'exam', label: 'Avaliações', icon: <ClipboardList size={18} className="text-red-500" />, color: 'bg-red-50 text-red-700 border-red-100' },
      { id: 'activity', label: 'Atividades', icon: <BookOpen size={18} className="text-blue-500" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
      { id: 'administrative', label: 'Administrativo', icon: <Folder size={18} className="text-gray-500" />, color: 'bg-gray-50 text-gray-700 border-gray-200' },
  ];

  const filteredMaterials = materials.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
      const matchSubject = subjectFilter === 'all' || m.subjectId === subjectFilter;
      return matchSearch && matchCategory && matchSubject;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          
          // Preenche o título automaticamente se estiver vazio
          if (!formData.title) {
              setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
          }

          const result = await api.upload(formDataUpload);
          if (result.success && result.url) {
              setFormData(prev => ({ ...prev, fileUrl: result.url }));
          } else {
              alert("Erro ao fazer upload.");
          }
      } catch (err) {
          console.error(err);
          alert("Erro na conexão para upload.");
      } finally {
          setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.fileUrl || !formData.category) return;

      onAddMaterial({
          id: generateId(),
          title: formData.title!,
          description: formData.description || '',
          category: formData.category as any,
          subjectId: formData.subjectId,
          fileUrl: formData.fileUrl!,
          createdAt: new Date().toISOString()
      });

      setIsModalOpen(false);
      setFormData({ title: '', description: '', category: 'activity', subjectId: '', fileUrl: '' });
  };

  const handleDelete = (id: string) => {
      if (confirm('Deseja excluir este arquivo permanentemente?')) {
          onDeleteMaterial(id);
      }
  };

  const getFileIcon = (url: string) => {
      const ext = url.split('.').pop()?.toLowerCase();
      if (['pdf'].includes(ext || '')) return <FileText size={24} className="text-red-500" />;
      if (['doc', 'docx'].includes(ext || '')) return <FileText size={24} className="text-blue-500" />;
      if (['jpg', 'jpeg', 'png'].includes(ext || '')) return <FileText size={24} className="text-green-500" />;
      return <File size={24} className="text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422] flex items-center gap-3">
              <Folder className="text-[#c48b5e]" /> Biblioteca Digital
           </h2>
           <p className="text-[#8c7e72]">Gestão de documentos e materiais didáticos</p>
        </div>
        
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
        >
            <Upload size={20} /> Novo Arquivo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#eaddcf] flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar arquivos..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none"
              />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-1/2 md:w-48">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-gray-700"
                  >
                      <option value="all">Todas Categorias</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
              </div>
              <div className="relative w-1/2 md:w-48">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-gray-700"
                  >
                      <option value="all">Todas Disciplinas</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              </div>
          </div>
      </div>

      {/* Categories Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(cat => {
              const count = materials.filter(m => m.category === cat.id).length;
              return (
                  <button 
                    key={cat.id} 
                    onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
                    className={`bg-white p-4 rounded-xl border transition-all flex items-center justify-between group ${categoryFilter === cat.id ? 'border-[#c48b5e] ring-1 ring-[#c48b5e]' : 'border-gray-100 hover:border-[#c48b5e]'}`}
                  >
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${cat.color} bg-opacity-20`}>{cat.icon}</div>
                          <div className="text-left">
                              <p className="text-xs text-gray-500 uppercase font-bold">{cat.label}</p>
                              <p className="text-lg font-bold text-gray-800">{count}</p>
                          </div>
                      </div>
                  </button>
              );
          })}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(material => {
              const cat = categories.find(c => c.id === material.category);
              const subject = subjects.find(s => s.id === material.subjectId);

              return (
                  <div key={material.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all p-5 flex flex-col group relative">
                      <div className="flex justify-between items-start mb-3">
                          <div className="p-3 bg-gray-50 rounded-xl">
                              {getFileIcon(material.fileUrl)}
                          </div>
                          <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${cat?.color}`}>
                              {cat?.label}
                          </div>
                          {canEdit && (
                              <button 
                                onClick={() => handleDelete(material.id)}
                                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                  <Trash2 size={16} />
                              </button>
                          )}
                      </div>
                      
                      <h3 className="font-bold text-[#433422] mb-1 line-clamp-1" title={material.title}>{material.title}</h3>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[2.5em]">{material.description || 'Sem descrição.'}</p>
                      
                      {subject && (
                          <div className="mb-4">
                              <span className="text-xs bg-[#fcf9f6] text-[#c48b5e] px-2 py-1 rounded border border-[#eaddcf]">
                                  {subject.name}
                              </span>
                          </div>
                      )}

                      <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">
                              {new Date(material.createdAt).toLocaleDateString()}
                          </span>
                          <a 
                            href={material.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm font-bold text-[#c48b5e] hover:underline"
                          >
                              <Download size={14} /> Baixar
                          </a>
                      </div>
                  </div>
              );
          })}
      </div>

      {filteredMaterials.length === 0 && (
          <div className="py-16 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <Folder size={32} className="mx-auto mb-3 opacity-50" />
              <p>Nenhum material encontrado.</p>
          </div>
      )}

      {/* Modal Upload */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                   <Upload className="text-[#eaddcf]" /> Novo Arquivo
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* File Drop Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 text-center hover:bg-white hover:border-[#c48b5e] transition-colors relative group">
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2 text-[#c48b5e]">
                            <Loader2 className="animate-spin" size={32} /> 
                            <span className="text-sm font-bold">Enviando arquivo...</span>
                        </div>
                    ) : formData.fileUrl ? (
                        <div className="flex flex-col items-center gap-2 text-green-600">
                            <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 size={32} /></div>
                            <span className="text-sm font-bold">Upload Concluído!</span>
                            <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); setFormData({...formData, fileUrl: ''}) }}
                                className="text-xs text-red-500 hover:underline mt-1"
                            >
                                Substituir Arquivo
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                <Paperclip className="text-[#c48b5e]" size={24} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Clique para selecionar</span>
                            <span className="text-xs text-gray-400 mt-1">PDF, Word, Excel ou Imagens</span>
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={handleFileChange}
                            />
                        </>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título do Arquivo</label>
                    <input 
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Prova de Matemática - 1º Tri"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value as any})}
                        >
                            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Disciplina</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                            value={formData.subjectId}
                            onChange={e => setFormData({...formData, subjectId: e.target.value})}
                        >
                            <option value="">Geral (Sem disciplina)</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição (Opcional)</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422] h-20 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Detalhes adicionais..."
                    />
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isUploading || !formData.fileUrl}
                        className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Salvar Material
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
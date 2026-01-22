import React, { useState } from 'react';
import { Plus, Megaphone, Calendar, Paperclip, Trash2, X, AlertCircle, FileText, CheckCircle2, Upload, Loader2, Download } from 'lucide-react';
import { Notice, User } from '../types';
import { api } from '../supabaseClient';

interface NoticeBoardProps {
  notices: Notice[];
  currentUser: User | null;
  onAddNotice: (n: Notice) => void;
  onDeleteNotice: (id: string) => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ 
  notices, 
  currentUser, 
  onAddNotice, 
  onDeleteNotice 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Notice>>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    type: 'general',
    attachmentUrl: ''
  });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'coordenador';

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          
          const result = await api.upload(formDataUpload);
          if (result.success && result.url) {
              setFormData(prev => ({ ...prev, attachmentUrl: result.url }));
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
    if (!formData.title || !formData.content) return;

    onAddNotice({
      id: generateId(),
      title: formData.title!,
      content: formData.content!,
      date: formData.date || new Date().toISOString().split('T')[0],
      type: formData.type as 'general' | 'event' | 'urgent' || 'general',
      attachmentUrl: formData.attachmentUrl
    });

    setIsModalOpen(false);
    setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0], type: 'general', attachmentUrl: '' });
  };

  const handleDelete = (id: string) => {
      if (confirm('Deseja excluir este aviso?')) {
          onDeleteNotice(id);
      }
  };

  const getTypeStyles = (type: string) => {
      switch(type) {
          case 'urgent': return 'bg-red-50 text-red-700 border-red-100';
          case 'event': return 'bg-blue-50 text-blue-700 border-blue-100';
          default: return 'bg-orange-50 text-orange-700 border-orange-100';
      }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
        case 'urgent': return 'Urgente';
        case 'event': return 'Evento';
        default: return 'Geral';
    }
};

  const sortedNotices = [...notices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422] flex items-center gap-3">
              <Megaphone className="text-[#c48b5e]" /> Mural de Avisos
           </h2>
           <p className="text-[#8c7e72]">Comunicados oficiais e circulares</p>
        </div>
        
        {canEdit && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
            >
                <Plus size={20} /> Novo Aviso
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotices.map(notice => (
              <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col overflow-hidden group">
                  <div className={`px-6 py-3 border-b flex justify-between items-center ${getTypeStyles(notice.type)}`}>
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          {notice.type === 'urgent' && <AlertCircle size={14} />}
                          {notice.type === 'event' && <Calendar size={14} />}
                          {notice.type === 'general' && <FileText size={14} />}
                          {getTypeLabel(notice.type)}
                      </span>
                      {canEdit && (
                          <button 
                            onClick={() => handleDelete(notice.id)} 
                            className="text-current opacity-60 hover:opacity-100 transition-opacity"
                          >
                              <Trash2 size={16} />
                          </button>
                      )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <Calendar size={12} /> {new Date(notice.date).toLocaleDateString()}
                          </p>
                          <h3 className="text-lg font-bold text-[#433422] leading-tight">{notice.title}</h3>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap flex-1">{notice.content}</p>
                      
                      {notice.attachmentUrl && (
                          <div className="mt-auto pt-4 border-t border-gray-50">
                              <a 
                                href={notice.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-[#c48b5e] font-bold hover:underline bg-[#fcf9f6] p-2 rounded-lg border border-[#eaddcf]"
                              >
                                  <Paperclip size={16} /> Ver Anexo
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          ))}

          {sortedNotices.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <Megaphone size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhum aviso publicado.</p>
              </div>
          )}
      </div>

      {/* MODAL CRIAR AVISO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                   <Megaphone className="text-[#eaddcf]" /> Novo Comunicado
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Título</label>
                    <input 
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Reunião de Pais"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Data</label>
                        <input 
                            type="date"
                            required
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Tipo</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422]"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                            <option value="general">Geral</option>
                            <option value="event">Evento</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Conteúdo</label>
                    <textarea 
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] bg-white text-[#433422] h-32 resize-none"
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        placeholder="Escreva o comunicado aqui..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Anexo (PDF ou Imagem)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 text-center hover:bg-white hover:border-[#c48b5e] transition-colors relative">
                        {isUploading ? (
                            <div className="flex items-center gap-2 text-[#c48b5e]">
                                <Loader2 className="animate-spin" size={20} /> Enviando...
                            </div>
                        ) : formData.attachmentUrl ? (
                            <div className="flex items-center gap-2 text-green-600 font-bold">
                                <CheckCircle2 size={20} /> Arquivo Anexado
                                <button 
                                    type="button" 
                                    onClick={(e) => { e.preventDefault(); setFormData({...formData, attachmentUrl: ''}) }}
                                    className="ml-2 text-red-500 hover:underline text-xs"
                                >
                                    Remover
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="text-gray-400 mb-2" size={24} />
                                <span className="text-sm text-gray-500">Clique para selecionar</span>
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isUploading}
                        className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                    >
                        Publicar Aviso
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
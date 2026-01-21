import React, { useState } from 'react';
import { Plus, Search, Camera, Filter, User, Calendar, Phone, Hash, Edit2, Trash2, Upload, X, Users, Archive, RefreshCcw } from 'lucide-react';
import { Student, ClassGroup, User as UserType } from '../types';

interface StudentManagerProps {
  students: Student[];
  classes: ClassGroup[];
  currentUser: UserType | null;
  onAddStudent: (s: Student) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: 'active' | 'inactive') => void;
  onSelectStudent: (id: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  classes, 
  currentUser,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onToggleStatus,
  onSelectStudent 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canDelete = currentUser?.role !== 'professor';

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    classId: '',
    avatarUrl: '',
    registrationNumber: '',
    birthDate: '',
    parentName: '',
    phone: '',
    status: 'active'
  });

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.registrationNumber && s.registrationNumber.includes(searchTerm));
    const matchesClass = filterClass === 'all' || s.classId === filterClass;
    return matchesSearch && matchesClass;
  });

  const resetForm = () => {
    setFormData({ 
        name: '', classId: '', avatarUrl: '', registrationNumber: '', 
        birthDate: '', parentName: '', phone: '', status: 'active' 
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingId(student.id);
    setFormData({
        name: student.name,
        classId: student.classId,
        avatarUrl: student.avatarUrl,
        registrationNumber: student.registrationNumber,
        birthDate: student.birthDate,
        parentName: student.parentName,
        phone: student.phone,
        status: student.status
    });
    setIsModalOpen(true);
  };

  const handleToggleStatusClick = (e: React.MouseEvent, student: Student) => {
      e.stopPropagation();
      const confirmMsg = student.status === 'active' 
        ? `Deseja INATIVAR o aluno ${student.name}?\n\nEle não aparecerá nas chamadas, mas o histórico será mantido.`
        : `Deseja REATIVAR o aluno ${student.name}?`;

      if(window.confirm(confirmMsg)) {
        onToggleStatus(student.id, student.status || 'active');
      }
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm('Tem certeza que deseja excluir PERMANENTEMENTE este aluno e todas as suas avaliações?')) {
        onDeleteStudent(id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) {
        alert("Nome e Turma são obrigatórios");
        return;
    }

    const payload: Student = {
      id: editingId || generateId(),
      name: formData.name!,
      classId: formData.classId!,
      avatarUrl: formData.avatarUrl,
      registrationNumber: formData.registrationNumber,
      birthDate: formData.birthDate,
      parentName: formData.parentName,
      phone: formData.phone,
      status: (formData.status === 'active' || formData.status === 'inactive') ? formData.status : 'active'
    };

    if (editingId) {
        onUpdateStudent(payload);
    } else {
        onAddStudent(payload);
    }

    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422]">Alunos</h2>
           <p className="text-[#8c7e72]">Gestão de matrículas e cadastros</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
        >
          <Plus size={20} /> Cadastrar Aluno
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#eaddcf]">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none bg-white text-black placeholder-gray-500"
            />
        </div>
        <div className="w-full md:w-64 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select 
               value={filterClass}
               onChange={(e) => setFilterClass(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c48b5e] outline-none appearance-none bg-white text-[#433422]"
            >
                <option value="all">Todas as Turmas</option>
                {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#eaddcf] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#fcf9f6] border-b border-[#eaddcf]">
              <th className="p-4 text-xs font-bold text-[#8c7e72] uppercase tracking-wider">Aluno</th>
              <th className="p-4 text-xs font-bold text-[#8c7e72] uppercase tracking-wider">Turma</th>
              <th className="p-4 text-xs font-bold text-[#8c7e72] uppercase tracking-wider">Contato</th>
              <th className="p-4 text-xs font-bold text-[#8c7e72] uppercase tracking-wider text-center">Status</th>
              <th className="p-4 text-xs font-bold text-[#8c7e72] uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#fcf9f6]">
            {filteredStudents.map(student => {
                const studentClass = classes.find(c => c.id === student.classId);
                const isActive = student.status !== 'inactive';
                
                return (
                  <tr 
                    key={student.id} 
                    className="hover:bg-[#eaddcf]/20 transition-colors cursor-pointer group"
                    onClick={() => onSelectStudent(student.id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.name} className={`w-10 h-10 rounded-full object-cover border border-[#eaddcf] ${!isActive ? 'grayscale opacity-50' : ''}`} />
                        ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border border-[#eaddcf] ${isActive ? 'bg-[#eaddcf] text-[#c48b5e]' : 'bg-gray-100 text-gray-400'}`}>
                            {student.name.charAt(0)}
                            </div>
                        )}
                        <div>
                          <p className={`font-medium transition-colors ${isActive ? 'text-[#433422]' : 'text-gray-400 line-through'}`}>{student.name}</p>
                          <p className="text-xs text-[#8c7e72] font-mono">Mat: {student.registrationNumber || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#8c7e72]">
                        {studentClass ? (
                            <span className="bg-[#eaddcf] text-[#c48b5e] px-2 py-1 rounded-md text-xs font-medium">
                                {studentClass.name}
                            </span>
                        ) : (
                            <span className="text-gray-400 italic">Sem turma</span>
                        )}
                    </td>
                    <td className="p-4">
                        <div className="text-sm text-[#8c7e72]">{student.parentName || '-'}</div>
                        <div className="text-xs text-[#8c7e72]">{student.phone || '-'}</div>
                    </td>
                    <td className="p-4 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${!isActive ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                         {!isActive ? 'Inativo' : 'Ativo'}
                       </span>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={(e) => handleEditClick(e, student)}
                                className="p-2 text-[#8c7e72] hover:text-[#c48b5e] hover:bg-[#eaddcf] rounded-lg transition-colors"
                                title="Editar"
                             >
                                <Edit2 size={16} />
                             </button>
                             
                             {/* Toggle Status Button */}
                             <button 
                                onClick={(e) => handleToggleStatusClick(e, student)}
                                className={`p-2 rounded-lg transition-colors ${isActive ? 'text-[#8c7e72] hover:text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                                title={isActive ? "Inativar" : "Reativar"}
                             >
                                {isActive ? <Archive size={16} /> : <RefreshCcw size={16} />}
                             </button>

                             {/* Physical Delete (Only shown if inactive, optional safety) - Hidden for Professors */}
                             {canDelete && !isActive && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, student.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir Permanentemente"
                                >
                                    <Trash2 size={16} />
                                </button>
                             )}
                        </div>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-[#8c7e72] flex flex-col items-center">
                <div className="w-12 h-12 bg-[#fcf9f6] rounded-full flex items-center justify-center mb-3">
                    <Users className="text-[#d1c5b8]" size={24} />
                </div>
                <h3 className="text-lg font-medium text-[#433422] mb-1">Nenhum aluno encontrado</h3>
                <p className="text-sm text-[#8c7e72]">Tente ajustar os filtros ou cadastre um novo aluno.</p>
            </div>
        )}
      </div>

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                   <User className="text-[#eaddcf]" />
                   {editingId ? 'Editar Aluno' : 'Novo Cadastro de Aluno'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                    <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Coluna Esquerda: Foto */}
                    <div className="flex flex-col items-center gap-3">
                         <div className="w-24 h-24 bg-[#fcf9f6] rounded-full flex items-center justify-center border-2 border-dashed border-[#c48b5e]/30 overflow-hidden relative group">
                            {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="text-[#c48b5e] w-8 h-8" />
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                <Upload className="text-white" size={20} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                         </div>
                         <div className="w-full text-center">
                            <label className="text-xs text-[#c48b5e] font-bold cursor-pointer hover:underline">
                                Alterar Foto
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                         </div>
                    </div>

                    {/* Coluna Direita: Dados Principais */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 flex items-center gap-1">
                                <User size={14} /> Nome Completo
                            </label>
                            <input 
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 flex items-center gap-1">
                                    <Hash size={14} /> Matrícula
                                </label>
                                <input 
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                    value={formData.registrationNumber}
                                    onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 flex items-center gap-1">
                                    <Calendar size={14} /> Nascimento
                                </label>
                                <input 
                                    type="date"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                    value={formData.birthDate}
                                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5">Turma</label>
                            <select 
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                value={formData.classId}
                                onChange={e => setFormData({...formData, classId: e.target.value})}
                            >
                                <option value="">Selecione a turma...</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.grade}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <h4 className="font-bold text-[#433422] mb-4 text-lg">Informações de Contato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5">Responsável Legal</label>
                            <input 
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                value={formData.parentName}
                                onChange={e => setFormData({...formData, parentName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5 flex items-center gap-1">
                                <Phone size={14} /> Telefone
                            </label>
                            <input 
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#c48b5e] mb-1.5">Status da Matrícula</label>
                            <select 
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c48b5e] focus:border-transparent transition-all text-[#433422] bg-[#fcf9f6] focus:bg-white"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                            >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5">
                    {editingId ? 'Salvar Alterações' : 'Confirmar Matrícula'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
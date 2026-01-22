import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, User as UserIcon, Key, Eye, EyeOff, X, Users, CheckCircle, XCircle } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagerProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ 
  users, 
  currentUser,
  onAddUser, 
  onUpdateUser, 
  onDeleteUser 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'professor' as UserRole,
    status: 'active' as 'active' | 'inactive'
  });

  // Helper para gerar ID seguro
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'professor', status: 'active' });
    setEditingId(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEditClick = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Password starts empty on edit (only fill to change)
      role: user.role,
      status: user.status || 'active'
    });
    setIsFormOpen(true);
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailExists = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingId);
    if (emailExists) {
      alert("Este e-mail já está sendo utilizado por outro usuário.");
      return;
    }

    if (!editingId && !formData.password) {
      alert("Senha é obrigatória para novos usuários.");
      return;
    }

    const payload: User = {
      id: editingId || generateId(),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      status: formData.status
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    if (editingId) {
      if (!formData.password) {
        const existingUser = users.find(u => u.id === editingId);
        if (existingUser) payload.password = existingUser.password;
      }
      onUpdateUser(payload);
    } else {
      onAddUser(payload);
    }
    
    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    if (id === currentUser?.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }
    onDeleteUser(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-[#433422]">Equipe Escolar</h2>
           <p className="text-[#8c7e72]">Gerenciamento de acesso e permissões (Professores e Coordenadores)</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="bg-[#c48b5e] hover:bg-[#a0704a] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 font-medium"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-[#eaddcf]">
             <div className="px-6 py-5 bg-gradient-to-r from-[#c48b5e] to-[#a0704a] flex justify-between items-center">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  {editingId ? <Edit2 size={20} className="text-[#eaddcf]" /> : <Plus size={20} className="text-[#eaddcf]" />}
                  {editingId ? 'Editar Usuário' : 'Cadastrar Usuário'}
                </h3>
                <button onClick={resetForm} className="text-white/80 hover:text-white transition-colors">
                  <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-5">
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail de Acesso</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
                    placeholder="professor@escola.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {editingId ? 'Nova Senha' : 'Senha'}
                  </label>
                  <div className="relative">
                    <Key size={18} className="absolute left-3 top-3.5 text-gray-400" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
                      placeholder={editingId ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-blue-500 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-semibold text-gray-700 mb-1.5">Função / Cargo</label>
                       <select 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                       >
                          <option value="professor">Professor(a)</option>
                          <option value="coordenador">Coordenador(a)</option>
                          <option value="admin">Administrador(a)</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status da Conta</label>
                       <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                       >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo (Bloqueado)</option>
                       </select>
                    </div>
                </div>

                <div className="pt-2 flex gap-3">
                   <button 
                     type="button" 
                     onClick={resetForm}
                     className="flex-1 bg-white border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5"
                   >
                     {editingId ? 'Salvar Alterações' : 'Criar Usuário'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c48b5e] outline-none shadow-sm transition-all text-black placeholder-gray-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Função</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-[#eaddcf]/20 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#fcf9f6] border border-[#eaddcf] flex items-center justify-center text-[#c48b5e] relative">
                      <UserIcon size={20} />
                      {user.status === 'inactive' && (
                         <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border border-white">
                            <X size={10} />
                         </div>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${user.status === 'inactive' ? 'text-gray-400 line-through' : 'text-[#433422]'}`}>{user.name}</p>
                      <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {/* Password Hint for Admin Debugging */}
                          {user.password && (
                              <span className="text-[10px] text-gray-300 cursor-help opacity-0 group-hover:opacity-100 transition-opacity" title={`Senha atual: ${user.password}`}>
                                  (Senha: {user.password})
                              </span>
                          )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
                     ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                       user.role === 'coordenador' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                       'bg-gray-50 text-gray-700 border-gray-200'}`}>
                     {user.role === 'admin' && <Shield size={10} />}
                     {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                   </span>
                </td>
                <td className="p-4 text-center">
                    {user.status === 'inactive' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                            <XCircle size={12} /> Inativo
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                            <CheckCircle size={12} /> Ativo
                        </span>
                    )}
                </td>
                <td className="p-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     <button 
                       onClick={() => handleEditClick(user)}
                       className="p-2 text-gray-400 hover:text-[#c48b5e] hover:bg-[#eaddcf] rounded-lg transition-colors"
                       title="Editar"
                     >
                       <Edit2 size={18} />
                     </button>
                     <button 
                       onClick={() => handleDeleteClick(user.id)}
                       className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                       title="Excluir ou Inativar"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
             <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                 <Users className="text-gray-300" size={24} />
             </div>
             <h3 className="text-lg font-medium text-gray-600 mb-1">Nenhum usuário encontrado</h3>
             <p className="text-sm text-gray-400">Tente ajustar a busca ou cadastre um novo membro.</p>
          </div>
        )}
      </div>
    </div>
  );
};
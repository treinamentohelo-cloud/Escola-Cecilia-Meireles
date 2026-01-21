import React, { useState } from 'react';
import { GraduationCap, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3efe9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#eaddcf] rounded-full mix-blend-multiply filter blur-[80px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#d9c4b1] rounded-full mix-blend-multiply filter blur-[80px] opacity-40"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 relative z-10 animate-in fade-in zoom-in duration-300 border border-[#eaddcf]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-5 bg-[#c48b5e] rounded-2xl shadow-lg shadow-[#c48b5e]/20 mb-6 transform hover:scale-105 transition-transform duration-300">
            <GraduationCap className="text-white" size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-[#433422] tracking-tight">ESCOLA <span className="text-[#c48b5e]">OLAVO BILAC</span></h1>
          <p className="text-[#8c7e72] mt-2 font-medium text-sm tracking-wide uppercase flex items-center justify-center gap-2">
            <span className="w-8 h-[1px] bg-[#eaddcf]"></span>
            Gestão Inteligente
            <span className="w-8 h-[1px] bg-[#eaddcf]"></span>
          </p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#c48b5e] uppercase tracking-wider ml-1">E-mail Corporativo</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#fcf9f6] border border-[#eaddcf] rounded-xl focus:ring-2 focus:ring-[#c48b5e] focus:bg-white focus:border-transparent outline-none transition-all text-[#433422] placeholder-[#d1c5b8] font-medium"
              placeholder="seu@escola.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#c48b5e] uppercase tracking-wider ml-1">Senha de Acesso</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#fcf9f6] border border-[#eaddcf] rounded-xl focus:ring-2 focus:ring-[#c48b5e] focus:bg-white focus:border-transparent outline-none transition-all text-[#433422] placeholder-[#d1c5b8] font-medium"
              placeholder="••••••••"
            />
          </div>
          <div className="pt-2">
            <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full bg-[#c48b5e] hover:bg-[#a0704a] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#c48b5e]/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            >
                {isLoading ? 'Autenticando...' : (
                    <>Acessar Plataforma <ArrowRight size={18} /></>
                )}
            </button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-[#eaddcf] text-center">
            <p className="text-xs text-[#8c7e72] font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-[#c48b5e]" /> Ambiente Seguro e Monitorado
            </p>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-[#8c7e72] text-xs font-light">
         © {new Date().getFullYear()} Escola Olavo Bilac - Tecnologia Educacional
      </div>
    </div>
  );
};
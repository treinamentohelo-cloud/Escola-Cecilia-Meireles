import React, { useState } from 'react';
import { User, Calendar, LogIn, AlertCircle, ArrowLeft, GraduationCap, Clock, Award, Megaphone, FileText, Paperclip } from 'lucide-react';
import { Student, Assessment, Skill, ClassGroup, AssessmentStatus, Notice } from '../types';
import { StudentDetail } from './StudentDetail';

interface ParentPortalProps {
    onLogin: (reg: string, birth: string) => Promise<Student | null>;
    onBack: () => void;
    students: Student[];
    assessments: Assessment[];
    skills: Skill[];
    classes: ClassGroup[];
    notices?: Notice[]; // Added notices prop
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
    onLogin,
    onBack,
    assessments,
    skills,
    classes,
    notices = []
}) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [regNumber, setRegNumber] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'grades' | 'notices'>('grades');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await onLogin(regNumber, birthDate);
        if (result) {
            setStudent(result);
        } else {
            setError('Dados não conferem. Verifique a matrícula e data de nascimento.');
        }
        setLoading(false);
    };

    const handleLogout = () => {
        setStudent(null);
        setRegNumber('');
        setBirthDate('');
        setActiveTab('grades');
    };

    if (student) {
        const sortedNotices = [...notices].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="min-h-screen bg-[#fdfbf7] p-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center gap-3">
                             <div className="bg-[#c48b5e] p-2 rounded-xl text-white"><GraduationCap /></div>
                             <h1 className="text-2xl font-bold text-[#433422]">Portal do Responsável</h1>
                         </div>
                         <button onClick={handleLogout} className="text-gray-500 hover:text-[#c48b5e] font-medium flex items-center gap-2">
                            <ArrowLeft size={18} /> Sair
                         </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-4 mb-6 border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('grades')}
                            className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'grades' ? 'border-[#c48b5e] text-[#c48b5e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Boletim & Histórico
                        </button>
                        <button 
                            onClick={() => setActiveTab('notices')}
                            className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'notices' ? 'border-[#c48b5e] text-[#c48b5e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Comunicados ({sortedNotices.length})
                        </button>
                    </div>
                    
                    {activeTab === 'grades' ? (
                        <StudentDetail 
                            studentId={student.id}
                            students={[student]} // Pass only this student
                            skills={skills}
                            assessments={assessments}
                            classes={classes}
                            onAddAssessment={() => {}} // Disabled for parents
                            onBack={() => {}} // Disabled
                        />
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                             <h2 className="text-xl font-bold text-[#433422] flex items-center gap-2 mb-4">
                                <Megaphone className="text-[#c48b5e]" /> Mural de Avisos da Escola
                             </h2>
                             {sortedNotices.length > 0 ? sortedNotices.map(notice => (
                                 <div key={notice.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow">
                                      <div className={`p-4 rounded-xl flex items-center justify-center shrink-0 h-fit ${notice.type === 'urgent' ? 'bg-red-50 text-red-500' : notice.type === 'event' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                                          {notice.type === 'urgent' ? <AlertCircle size={32} /> : notice.type === 'event' ? <Calendar size={32} /> : <FileText size={32} />}
                                      </div>
                                      <div className="flex-1">
                                           <div className="flex justify-between items-start mb-2">
                                               <h3 className="font-bold text-lg text-[#433422]">{notice.title}</h3>
                                               <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">{new Date(notice.date).toLocaleDateString()}</span>
                                           </div>
                                           <p className="text-gray-600 whitespace-pre-wrap mb-4">{notice.content}</p>
                                           {notice.attachmentUrl && (
                                               <a href={notice.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#c48b5e] font-bold hover:underline bg-[#fcf9f6] px-3 py-2 rounded-lg border border-[#eaddcf]">
                                                   <Paperclip size={16} /> Ver Anexo
                                               </a>
                                           )}
                                      </div>
                                 </div>
                             )) : (
                                 <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                     <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                                     <p>Nenhum comunicado recente.</p>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3efe9] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 border border-[#eaddcf] relative overflow-hidden">
                <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-[#c48b5e]"><ArrowLeft size={20}/></button>
                
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-[#c48b5e] rounded-full shadow-lg shadow-[#c48b5e]/20 mb-4">
                         <User className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-[#433422]">Acesso do Responsável</h1>
                    <p className="text-gray-500 text-sm mt-2">Consulte o desempenho escolar do seu filho(a).</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-[#c48b5e] uppercase tracking-wider ml-1 mb-1">Matrícula do Aluno</label>
                        <div className="relative">
                            <GraduationCap className="absolute left-3 top-3.5 text-[#c48b5e]" size={18} />
                            <input 
                                required
                                value={regNumber}
                                onChange={e => setRegNumber(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#fcf9f6] border border-[#eaddcf] rounded-xl focus:ring-2 focus:ring-[#c48b5e] focus:bg-white focus:border-transparent outline-none transition-all text-[#433422] placeholder-[#d1c5b8] font-medium"
                                placeholder="Ex: 2024001"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#c48b5e] uppercase tracking-wider ml-1 mb-1">Data de Nascimento</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-[#c48b5e]" size={18} />
                            <input 
                                required
                                type="date"
                                value={birthDate}
                                onChange={e => setBirthDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#fcf9f6] border border-[#eaddcf] rounded-xl focus:ring-2 focus:ring-[#c48b5e] focus:bg-white focus:border-transparent outline-none transition-all text-[#433422] placeholder-[#d1c5b8] font-medium"
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#c48b5e] text-white py-3.5 rounded-xl font-bold hover:bg-[#a0704a] shadow-lg shadow-[#c48b5e]/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verificando...' : <><LogIn size={18} /> Acessar Portal</>}
                    </button>
                </form>
             </div>
        </div>
    );
};
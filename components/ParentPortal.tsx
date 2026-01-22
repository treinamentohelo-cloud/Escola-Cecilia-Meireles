import React, { useState } from 'react';
import { User, Calendar, LogIn, AlertCircle, ArrowLeft, GraduationCap, Clock, Award } from 'lucide-react';
import { Student, Assessment, Skill, ClassGroup, AssessmentStatus } from '../types';
import { StudentDetail } from './StudentDetail';

interface ParentPortalProps {
    onLogin: (reg: string, birth: string) => Promise<Student | null>;
    onBack: () => void;
    students: Student[];
    assessments: Assessment[];
    skills: Skill[];
    classes: ClassGroup[];
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
    onLogin,
    onBack,
    assessments,
    skills,
    classes
}) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [regNumber, setRegNumber] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
    };

    if (student) {
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
                    {/* Reuse Student Detail but hide Action Buttons */}
                    <StudentDetail 
                        studentId={student.id}
                        students={[student]} // Pass only this student
                        skills={skills}
                        assessments={assessments}
                        classes={classes}
                        onAddAssessment={() => {}} // Disabled for parents
                        onBack={() => {}} // Disabled
                    />
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
                        {loading ? 'Verificando...' : <><LogIn size={18} /> Acessar Boletim</>}
                    </button>
                </form>
             </div>
        </div>
    );
};
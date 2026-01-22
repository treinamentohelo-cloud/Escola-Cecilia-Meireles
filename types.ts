
export enum AssessmentStatus {
  NAO_ATINGIU = 'nao_atingiu',
  EM_DESENVOLVIMENTO = 'em_desenvolvimento',
  ATINGIU = 'atingiu',
  SUPEROU = 'superou'
}

export interface Subject {
  id: string;
  name: string;
}

export interface Skill {
  id: string;
  code: string; // e.g., EF01LP01
  description: string;
  subject: string;
  year: string; // Novo campo: Ano/Série (ex: "1º Ano")
}

export interface ClassGroup {
  id: string;
  name: string; // Ex: Turma A
  grade: string; // Ex: 1º Ano Fundamental
  year: number;
  shift?: 'Matutino' | 'Vespertino' | 'Integral' | 'Noturno';
  teacherIds?: string[]; // IDs dos usuários professores (Array)
  status?: 'active' | 'inactive';
  isRemediation?: boolean; // Nova flag para turmas de reforço
  focusSkills?: string[]; // IDs das habilidades foco desta turma
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  avatarUrl?: string;
  registrationNumber?: string; // Matrícula
  birthDate?: string;
  parentName?: string; // Responsável
  phone?: string;
  status?: 'active' | 'inactive';
  remediationEntryDate?: string; // Data de entrada no reforço
  remediationExitDate?: string;  // Data de saída do reforço
}

export interface Assessment {
  id: string;
  studentId: string;
  skillId: string; // Habilidade BNCC foco desta avaliação
  date: string;
  term?: string; 
  notes?: string;
  
  // Campos Unificados
  status: AssessmentStatus; // Resultado da Habilidade BNCC
  participationScore?: number; // Nota de Participação (0-10)
  behaviorScore?: number; // Nota de Comportamento (0-10)
  examScore?: number; // Nota de Prova/Trabalho (0-10)
}

export interface ClassDailyLog {
  id: string;
  classId: string;
  date: string;
  content: string;
  attendance: Record<string, boolean>; // Map studentId -> isPresent
}

export type UserRole = 'admin' | 'coordenador' | 'professor';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional because we might not fetch it or show it
  role: UserRole;
  status?: 'active' | 'inactive';
}

export interface Setting {
    id: string; // chave (ex: 'school_name')
    value: string; // valor (ex: 'Escola Modelo')
}

export type Page = 'dashboard' | 'classes' | 'students' | 'assessments' | 'skills' | 'remediation' | 'student-detail' | 'users';
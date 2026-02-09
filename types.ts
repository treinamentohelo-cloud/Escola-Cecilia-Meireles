
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
  hasSpecificities?: boolean; // Educação Inclusiva
  specificityDescription?: string; // Detalhe (ex: TEA, TDAH)
}

export interface Assessment {
  id: string;
  studentId: string;
  skillId?: string; // Habilidade BNCC (Opcional se for avaliação geral de disciplina)
  subjectId?: string; // Disciplina (Opcional se for avaliação de habilidade específica)
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

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'general' | 'event' | 'urgent';
  attachmentUrl?: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  category: 'planning' | 'exam' | 'activity' | 'administrative';
  subjectId?: string; // Opcional: vinculado a uma disciplina
  fileUrl: string;
  createdAt: string;
}

export interface LessonPlan {
  id: string;
  title: string; // Tema da aula
  date: string; // Data prevista
  classId: string;
  subjectId: string;
  duration: string; // ex: "2 aulas de 50min"
  
  // Campos de Conteúdo
  objectives: string;
  content: string;
  methodology: string;
  resources: string;
  evaluation: string;
  
  bnccSkillIds: string[]; // IDs das habilidades vinculadas
  createdAt: string;
}

export type UserRole = 'admin' | 'diretor' | 'coordenador' | 'professor';

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

export type Page = 'dashboard' | 'classes' | 'students' | 'assessments' | 'skills' | 'remediation' | 'student-detail' | 'users' | 'parent-portal' | 'notices' | 'calendar' | 'reports' | 'library' | 'planner';

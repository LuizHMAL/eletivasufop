export type CodigoGrade = '2023_2' | '2024_1';

export interface GradeInfo {
  id: CodigoGrade;
  nome: string;
  subtitulo: string;
  total_materias: number;
  total_obrigatorias: number;
  total_eletivas: number;
}

export interface Materia {
  codigo: string;
  nome: string;
  obrigatoria: boolean;
  prerequisitos: string[];
  periodo?: number | null;
}

export interface MateriaStatus extends Materia {
  status: 'cursada' | 'disponivel' | 'bloqueada';
  prerequisitos_cumpridos: string[];
  prerequisitos_faltantes: string[];
}

export interface DisponiveisResponse {
  cursadas: string[];
  obrigatorias_disponiveis: MateriaStatus[];
  eletivas_disponiveis: MateriaStatus[];
  obrigatorias_bloqueadas: MateriaStatus[];
  eletivas_bloqueadas: MateriaStatus[];
  todas_materias: MateriaStatus[];
  total_cursadas: number;
  total_obrigatorias_disponiveis: number;
  total_eletivas_disponiveis: number;
  grade?: string;
}

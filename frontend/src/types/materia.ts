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
  total_cursadas: int;
  total_obrigatorias_disponiveis: int;
  total_eletivas_disponiveis: int;
}

export type int = number;


import React, { useMemo } from 'react';
import type { Materia, MateriaStatus, CodigoGrade } from '../types/materia';
import { expandPrerequisites, removeDependentSubjects } from '../utils/materiaGraph';
import styles from './GradePeriodos.module.css';

interface GradePeriodosProps {
  materiasStatusMap: Map<string, MateriaStatus>;
  materiasMap: Map<string, Materia>;
  cursadas: Set<string>;
  onToggleMateria: (novoSet: Set<string>) => void;
  onSelectMateriaDetalhes?: (materia: MateriaStatus) => void;
  grade?: CodigoGrade;
  onMudarGrade?: (novaGrade: CodigoGrade) => void;
}

export const GradePeriodos: React.FC<GradePeriodosProps> = ({
  materiasStatusMap,
  materiasMap,
  cursadas,
  onToggleMateria,
  onSelectMateriaDetalhes,
  grade = '2024_1',
  onMudarGrade,
}) => {
  // Agrupar matérias obrigatórias por período (1 a 10)
  const colunasPeriodos = useMemo(() => {
    const colunas: Record<number, MateriaStatus[]> = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: []
    };

    materiasStatusMap.forEach((m) => {
      if (m.obrigatoria && m.periodo && m.periodo >= 1 && m.periodo <= 10) {
        colunas[m.periodo].push(m);
      }
    });

    // Ordenar por código dentro do período
    Object.keys(colunas).forEach((p) => {
      colunas[Number(p)].sort((a, b) => a.codigo.localeCompare(b.codigo));
    });

    return colunas;
  }, [materiasStatusMap]);

  // Manipulador de clique no card
  const handleCardClick = (materia: MateriaStatus) => {
    const isCursada = cursadas.has(materia.codigo);

    if (!isCursada) {
      // Ao clicar para marcar como cursada, auto-seleciona todas as matérias das quais ela depende
      const novoSet = new Set(cursadas);
      novoSet.add(materia.codigo);
      const expandido = expandPrerequisites(novoSet, materiasMap);
      onToggleMateria(expandido);
    } else {
      // Ao desmarcar, desmarca também as matérias posteriores que dependem dela
      const atualizado = removeDependentSubjects(materia.codigo, cursadas, materiasMap);
      onToggleMateria(atualizado);
    }
  };

  // Ações rápidas
  const marcarPeriodo = (maxPeriodo: number) => {
    const codigosParaMarcar = new Set(cursadas);
    materiasStatusMap.forEach((m) => {
      if (m.obrigatoria && m.periodo && m.periodo <= maxPeriodo) {
        codigosParaMarcar.add(m.codigo);
      }
    });
    const expandido = expandPrerequisites(codigosParaMarcar, materiasMap);
    onToggleMateria(expandido);
  };

  const limparObrigatorias = () => {
    const novoSet = new Set<string>();
    // Mantém apenas eletivas que estavam cursadas
    cursadas.forEach((codigo) => {
      const mat = materiasMap.get(codigo);
      if (mat && !mat.obrigatoria) {
        novoSet.add(codigo);
      }
    });
    onToggleMateria(novoSet);
  };

  const totalObrigatorias = useMemo(() => {
    let count = 0;
    materiasMap.forEach((m) => {
      if (m.obrigatoria) count++;
    });
    return count || 1;
  }, [materiasMap]);

  const cursadasObrigatorias = useMemo(() => {
    return Array.from(cursadas).filter(
      (c) => materiasMap.get(c)?.obrigatoria
    ).length;
  }, [cursadas, materiasMap]);

  const [periodoFiltro, setPeriodoFiltro] = React.useState<number | 'todos'>('todos');

  const renderCard = (materia: MateriaStatus) => {
    const isCursada = materia.status === 'cursada';
    const isDisponivel = materia.status === 'disponivel';

    let cardClass = styles.cardBloqueada;
    if (isCursada) cardClass = styles.cardCursada;
    else if (isDisponivel) cardClass = styles.cardDisponivel;

    const prereqsTitle = materia.prerequisitos.length > 0
      ? `Pré-requisitos: ${materia.prerequisitos.join(', ')}`
      : 'Sem pré-requisitos';

    return (
      <div
        key={materia.codigo}
        className={`${styles.materiaCard} ${cardClass}`}
        onClick={() => handleCardClick(materia)}
        onContextMenu={(e) => {
          if (onSelectMateriaDetalhes) {
            e.preventDefault();
            onSelectMateriaDetalhes(materia);
          }
        }}
        title={`${materia.codigo} - ${materia.nome}\n${prereqsTitle}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(materia);
          }
        }}
      >
        {onSelectMateriaDetalhes && (
          <button
            type="button"
            className={styles.infoBtn}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMateriaDetalhes(materia);
            }}
            aria-label={`Detalhes de ${materia.codigo}`}
            title="Ver detalhes da matéria"
          >
            i
          </button>
        )}
        <div className={styles.cardCodigo}>
          {isCursada && <span className={styles.checkIcon}>✓</span>}
          <span>{materia.codigo}</span>
        </div>
        <div className={styles.cardNome}>{materia.nome}</div>
      </div>
    );
  };

  return (
    <div className={styles.gradeContainer}>
      {/* Barra de Topo padrão GradeUFOP */}
      <div className={styles.topBar}>
        <div className={styles.courseSelectorWrapper}>
          <select className={styles.courseSelect} defaultValue="ec" aria-label="Selecionar Curso">
            <option value="ec">Eng. de Computação</option>
            <option value="cc" disabled>Ciência da Computação (em breve)</option>
            <option value="si" disabled>Sistemas de Informação (em breve)</option>
          </select>

          {onMudarGrade && (
            <div className={styles.gradeSelectorWrapper}>
              <label htmlFor="gradeSelectGradePeriodos" className={styles.gradeLabel}>Currículo:</label>
              <select
                id="gradeSelectGradePeriodos"
                className={styles.gradeSelect}
                value={grade}
                onChange={(e) => onMudarGrade(e.target.value as CodigoGrade)}
                aria-label="Selecionar Grade Curricular"
              >
                <option value="2024_1">2024/1 (Novo)</option>
                <option value="2023_2">2023/2 (Antigo)</option>
              </select>
            </div>
          )}

          <span className={styles.progressText}>
            {cursadasObrigatorias} de {totalObrigatorias} obrigatórias ({Math.round((cursadasObrigatorias / totalObrigatorias) * 100)}%)
          </span>
        </div>
      </div>

      {/* Legenda e Ações Rápidas */}
      <div className={styles.actionBar}>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotCursada}`} />
            <span>Cursada</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotDisponivel}`} />
            <span>Disponível</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotBloqueada}`} />
            <span>Bloqueada</span>
          </div>
        </div>

        <div className={styles.quickActions}>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() => marcarPeriodo(1)}
            title="Marca todas as obrigatórias do 1º período"
          >
            + 1º Período
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() => marcarPeriodo(3)}
            title="Marca todas as obrigatórias até o 3º período"
          >
            + Até 3º
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={() => marcarPeriodo(5)}
            title="Marca todas as obrigatórias até o 5º período"
          >
            + Até 5º
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={limparObrigatorias}
            style={{ color: '#f87171' }}
            title="Limpar seleção das matérias obrigatórias"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Seletor de Período para Mobile */}
      <div className={styles.periodSelectorBar}>
        <span className={styles.periodSelectorLabel}>Período:</span>
        <div className={styles.periodPillsWrapper}>
          <button
            type="button"
            className={`${styles.periodPill} ${periodoFiltro === 'todos' ? styles.periodPillActive : ''}`}
            onClick={() => setPeriodoFiltro('todos')}
          >
            Todos
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.periodPill} ${periodoFiltro === p ? styles.periodPillActive : ''}`}
              onClick={() => setPeriodoFiltro(p)}
            >
              {p}º
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo: Período Único ou Grade de 10 Colunas */}
      {periodoFiltro !== 'todos' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
              {periodoFiltro}º Período ({colunasPeriodos[periodoFiltro]?.length || 0} matérias)
            </span>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={() => setPeriodoFiltro('todos')}
            >
              Ver Grade Completa
            </button>
          </div>
          <div className={styles.singlePeriodGrid}>
            {colunasPeriodos[periodoFiltro]?.map((materia) => renderCard(materia))}
          </div>
        </div>
      ) : (
        <div className={styles.gridScrollWrapper}>
          <div className={styles.swipeHint}>← Deslize para navegar pelos períodos →</div>
          <div className={styles.gridColumns}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((periodo) => (
              <div key={periodo} className={styles.column}>
                <div className={styles.columnHeader}>{periodo}</div>
                {colunasPeriodos[periodo]?.map((materia) => renderCard(materia))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

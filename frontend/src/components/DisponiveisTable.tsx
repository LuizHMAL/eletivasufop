import React, { useState, useMemo } from 'react';
import type { Materia, MateriaStatus } from '../types/materia';
import { expandPrerequisites } from '../utils/materiaGraph';
import styles from './DisponiveisTable.module.css';

interface DisponiveisTableProps {
  materiasStatusMap: Map<string, MateriaStatus>;
  materiasMap: Map<string, Materia>;
  cursadas: Set<string>;
  onToggleMateria: (novoSet: Set<string>) => void;
}

type SubFiltroDisponiveis = 'todas' | 'obrigatorias' | 'eletivas';

export const DisponiveisTable: React.FC<DisponiveisTableProps> = ({
  materiasStatusMap,
  materiasMap,
  cursadas,
  onToggleMateria,
}) => {
  const [subFiltro, setSubFiltro] = useState<SubFiltroDisponiveis>('todas');
  const [busca, setBusca] = useState('');

  // Matérias disponíveis
  const disponiveis = useMemo(() => {
    const list: MateriaStatus[] = [];
    materiasStatusMap.forEach((m) => {
      if (m.status === 'disponivel') {
        list.push(m);
      }
    });

    // Ordenar: obrigatórias primeiro (por período), depois eletivas (alfabético)
    list.sort((a, b) => {
      if (a.obrigatoria && !b.obrigatoria) return -1;
      if (!a.obrigatoria && b.obrigatoria) return 1;
      if (a.obrigatoria && b.obrigatoria) {
        return (a.periodo || 0) - (b.periodo || 0) || a.codigo.localeCompare(b.codigo);
      }
      return a.codigo.localeCompare(b.codigo);
    });

    return list;
  }, [materiasStatusMap]);

  // Contadores
  const contadores = useMemo(() => {
    const total = disponiveis.length;
    const obrigatorias = disponiveis.filter((d) => d.obrigatoria).length;
    const eletivas = total - obrigatorias;
    return { total, obrigatorias, eletivas };
  }, [disponiveis]);

  // Filtragem
  const listaFiltrada = useMemo(() => {
    let result = disponiveis;

    if (subFiltro === 'obrigatorias') {
      result = result.filter((d) => d.obrigatoria);
    } else if (subFiltro === 'eletivas') {
      result = result.filter((d) => !d.obrigatoria);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (d) => d.codigo.toLowerCase().includes(q) || d.nome.toLowerCase().includes(q)
      );
    }

    return result;
  }, [disponiveis, subFiltro, busca]);

  const handleMarcarCursada = (codigo: string) => {
    const novoSet = new Set(cursadas);
    novoSet.add(codigo);
    const expandido = expandPrerequisites(novoSet, materiasMap);
    onToggleMateria(expandido);
  };

  return (
    <div className={styles.container}>
      {/* Barra de Filtros e Busca */}
      <div className={styles.subFiltersBar}>
        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${subFiltro === 'todas' ? styles.tabBtnActive : ''}`}
            onClick={() => setSubFiltro('todas')}
          >
            Todas as Disponíveis
            <span className={styles.countBadge}>{contadores.total}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${subFiltro === 'obrigatorias' ? styles.tabBtnActive : ''}`}
            onClick={() => setSubFiltro('obrigatorias')}
          >
            Obrigatórias
            <span className={styles.countBadge}>{contadores.obrigatorias}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${subFiltro === 'eletivas' ? styles.tabBtnActive : ''}`}
            onClick={() => setSubFiltro('eletivas')}
          >
            Eletivas
            <span className={styles.countBadge}>{contadores.eletivas}</span>
          </button>
        </div>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Filtrar matérias disponíveis..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Tabela */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Tipo</th>
              <th style={{ width: '100px' }}>Código</th>
              <th>Nome da Disciplina</th>
              <th style={{ width: '90px' }}>Período</th>
              <th>Pré-requisitos Cumpridos</th>
              <th style={{ width: '160px', textAlign: 'center' }}>Ação Rápida</th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  Nenhuma disciplina disponível com os filtros atuais. Selecione mais matérias cursadas na Grade para desbloquear novas opções!
                </td>
              </tr>
            ) : (
              listaFiltrada.map((m) => (
                <tr key={m.codigo}>
                  <td>
                    {m.obrigatoria ? (
                      <span className={styles.badgeObrigatoria}>Obrigatória</span>
                    ) : (
                      <span className={styles.badgeEletiva}>Eletiva</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.codigoBadge}>{m.codigo}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.nome}</td>
                  <td>{m.periodo ? `${m.periodo}º` : '—'}</td>
                  <td>
                    {m.prerequisitos.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                        Sem pré-requisitos (Disponível desde o início)
                      </span>
                    ) : (
                      m.prerequisitos.map((pr) => {
                        const matPr = materiasMap.get(pr);
                        return (
                          <span
                            key={pr}
                            className={styles.prereqCheckTag}
                            title={matPr ? `${pr} - ${matPr.nome}` : pr}
                          >
                            ✓ {pr}
                          </span>
                        );
                      })
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleMarcarCursada(m.codigo)}
                    >
                      + Marcar Cursada
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lista em Cards para Dispositivos Móveis */}
      <div className={styles.mobileCardsList}>
        {listaFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma disciplina disponível com os filtros atuais. Selecione mais matérias cursadas na Grade para desbloquear novas opções!
          </div>
        ) : (
          listaFiltrada.map((m) => (
            <div key={m.codigo} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className={styles.codigoBadge}>{m.codigo}</span>
                  {m.obrigatoria ? (
                    <span className={styles.badgeObrigatoria}>
                      {m.periodo ? `${m.periodo}º Período` : 'Obrigatória'}
                    </span>
                  ) : (
                    <span className={styles.badgeEletiva}>Eletiva</span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.actionBtnMobile}
                  onClick={() => handleMarcarCursada(m.codigo)}
                >
                  + Cursada
                </button>
              </div>

              <div className={styles.mobileCardName}>{m.nome}</div>

              {m.prerequisitos.length > 0 && (
                <div className={styles.mobilePrereqs}>
                  {m.prerequisitos.map((pr) => {
                    const matPr = materiasMap.get(pr);
                    return (
                      <span
                        key={pr}
                        className={styles.prereqCheckTag}
                        title={matPr ? `${pr} - ${matPr.nome}` : pr}
                      >
                        ✓ {pr}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

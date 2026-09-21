import React, { useState, useMemo } from 'react';
import type { Materia, MateriaStatus } from '../types/materia';
import { expandPrerequisites, removeDependentSubjects } from '../utils/materiaGraph';
import styles from './EletivasRealizadasTable.module.css';

interface EletivasRealizadasTableProps {
  materiasStatusMap: Map<string, MateriaStatus>;
  materiasMap: Map<string, Materia>;
  cursadas: Set<string>;
  onToggleMateria: (novoSet: Set<string>) => void;
}

type FiltroEletivas = 'todas' | 'cursadas' | 'disponiveis';

export const EletivasRealizadasTable: React.FC<EletivasRealizadasTableProps> = ({
  materiasStatusMap,
  materiasMap,
  cursadas,
  onToggleMateria,
}) => {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroEletivas>('todas');

  // Filtrar apenas matérias eletivas
  const eletivas = useMemo(() => {
    const list: MateriaStatus[] = [];
    materiasStatusMap.forEach((m) => {
      if (!m.obrigatoria) {
        list.push(m);
      }
    });

    list.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return list;
  }, [materiasStatusMap]);

  // Contadores
  const totalEletivas = eletivas.length;
  const eletivasCursadas = useMemo(() => {
    return eletivas.filter((e) => cursadas.has(e.codigo)).length;
  }, [eletivas, cursadas]);

  // Filtragem da lista
  const eletivasFiltradas = useMemo(() => {
    let result = eletivas;

    if (filtro === 'cursadas') {
      result = result.filter((e) => cursadas.has(e.codigo));
    } else if (filtro === 'disponiveis') {
      result = result.filter((e) => e.status === 'disponivel');
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (e) => e.codigo.toLowerCase().includes(q) || e.nome.toLowerCase().includes(q)
      );
    }

    return result;
  }, [eletivas, filtro, busca, cursadas]);

  const handleCheckboxToggle = (materia: MateriaStatus) => {
    const isCursada = cursadas.has(materia.codigo);

    if (!isCursada) {
      // Auto-seleciona pré-requisitos da eletiva
      const novoSet = new Set(cursadas);
      novoSet.add(materia.codigo);
      const expandido = expandPrerequisites(novoSet, materiasMap);
      onToggleMateria(expandido);
    } else {
      // Desmarca a eletiva e dependentes se houver
      const atualizado = removeDependentSubjects(materia.codigo, cursadas, materiasMap);
      onToggleMateria(atualizado);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>
            <span>📚</span>
            <span>Eletivas Realizadas</span>
          </h2>
          <span className={styles.badgeCount}>
            {eletivasCursadas} de {totalEletivas} eletivas cursadas
          </span>
        </div>

        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'todas' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Todas ({totalEletivas})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'cursadas' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('cursadas')}
          >
            Realizadas ({eletivasCursadas})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'disponiveis' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('disponiveis')}
          >
            Disponíveis
          </button>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar eletiva por código ou nome (ex: CSI606, Robótica)..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {eletivasCursadas > 0 && (
          <button
            type="button"
            className={styles.filterBtn}
            style={{ color: '#ef4444' }}
            onClick={() => {
              const novoSet = new Set<string>();
              cursadas.forEach((c) => {
                if (materiasMap.get(c)?.obrigatoria) {
                  novoSet.add(c);
                }
              });
              onToggleMateria(novoSet);
            }}
          >
            Desmarcar Todas as Eletivas
          </button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>Cursada</th>
              <th style={{ width: '110px' }}>Código</th>
              <th>Nome da Disciplina Eletiva</th>
              <th>Pré-requisitos</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {eletivasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  Nenhuma disciplina eletiva encontrada para este filtro.
                </td>
              </tr>
            ) : (
              eletivasFiltradas.map((m) => {
                const isCursada = cursadas.has(m.codigo);
                return (
                  <tr key={m.codigo} className={isCursada ? styles.rowCursada : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isCursada}
                        onChange={() => handleCheckboxToggle(m)}
                        aria-label={`Marcar ${m.codigo} como cursada`}
                      />
                    </td>
                    <td>
                      <span className={styles.codigoTag}>{m.codigo}</span>
                    </td>
                    <td style={{ fontWeight: isCursada ? 600 : 400 }}>{m.nome}</td>
                    <td>
                      {m.prerequisitos.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                          Sem pré-requisito
                        </span>
                      ) : (
                        m.prerequisitos.map((pr) => {
                          const cumprido = cursadas.has(pr);
                          const matPr = materiasMap.get(pr);
                          return (
                            <span
                              key={pr}
                              className={`${styles.prereqBadge} ${
                                cumprido ? styles.prereqCumprido : styles.prereqFaltante
                              }`}
                              title={matPr ? `${pr} - ${matPr.nome} (${cumprido ? 'Cumprido' : 'Faltante'})` : pr}
                            >
                              {cumprido ? '✓ ' : '✗ '}
                              {pr}
                            </span>
                          );
                        })
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isCursada ? (
                        <span className={`${styles.statusBadge} ${styles.statusCursada}`}>
                          Cursada
                        </span>
                      ) : m.status === 'disponivel' ? (
                        <span className={`${styles.statusBadge} ${styles.statusDisponivel}`}>
                          Disponível
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.statusBloqueada}`}>
                          Bloqueada
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

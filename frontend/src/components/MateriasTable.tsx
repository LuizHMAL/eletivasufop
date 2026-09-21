import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import styles from './MateriasTable.module.css';

export interface Materia {
  codigo: string;
  nome: string;
  obrigatoria: boolean;
  prerequisitos: string[];
}

interface MateriasResponse {
  materias: Materia[];
}

export type TipoFiltro = 'todas' | 'obrigatorias' | 'eletivas';
export type CampoOrdenacao = 'codigo' | 'nome' | 'obrigatoria';

const API_BASE_URL = 'http://127.0.0.1:8000';

function normalizarTexto(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function MateriasTable() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtro e ordenação
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todas');
  const [busca, setBusca] = useState('');
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>('codigo');
  const [ordemAscendente, setOrdemAscendente] = useState(true);

  // Modal de detalhes
  const [materiaSelecionada, setMateriaSelecionada] = useState<Materia | null>(null);

  // Carregar dados da API
  const carregarMaterias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<MateriasResponse>(`${API_BASE_URL}/materias`);
      setMaterias(response.data.materias || []);
    } catch (err) {
      console.error('Erro ao buscar matérias:', err);
      // Tenta rota alternativa caso a primeira falhe
      try {
        const fallbackResponse = await axios.get<MateriasResponse>(`${API_BASE_URL}/materias/todas`);
        setMaterias(fallbackResponse.data.materias || []);
      } catch (fallbackErr) {
        console.error('Falha também no endpoint /materias/todas:', fallbackErr);
        setError('Não foi possível carregar as matérias. Certifique-se de que o backend está ativo em http://127.0.0.1:8000.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMaterias();
  }, [carregarMaterias]);

  // Contadores
  const contadores = useMemo(() => {
    const total = materias.length;
    const obrigatorias = materias.filter((m) => m.obrigatoria).length;
    const eletivas = total - obrigatorias;
    return { total, obrigatorias, eletivas };
  }, [materias]);

  // Mapa rápido de matérias por código para resolver nomes de pré-requisitos
  const mapaMaterias = useMemo(() => {
    const mapa = new Map<string, Materia>();
    materias.forEach((m) => mapa.set(m.codigo, m));
    return mapa;
  }, [materias]);

  // Filtragem e ordenação
  const materiasFiltradas = useMemo(() => {
    let lista = [...materias];

    // Filtro por tipo
    if (filtroTipo === 'obrigatorias') {
      lista = lista.filter((m) => m.obrigatoria);
    } else if (filtroTipo === 'eletivas') {
      lista = lista.filter((m) => !m.obrigatoria);
    }

    // Busca textual
    if (busca.trim()) {
      const termoNormalizado = normalizarTexto(busca.trim());
      lista = lista.filter((m) => {
        const codigoNorm = normalizarTexto(m.codigo);
        const nomeNorm = normalizarTexto(m.nome);
        const prereqNorm = m.prerequisitos.some((pr) => normalizarTexto(pr).includes(termoNormalizado));
        return codigoNorm.includes(termoNormalizado) || nomeNorm.includes(termoNormalizado) || prereqNorm;
      });
    }

    // Ordenação
    lista.sort((a, b) => {
      let resultado = 0;
      if (campoOrdenacao === 'codigo') {
        resultado = a.codigo.localeCompare(b.codigo);
      } else if (campoOrdenacao === 'nome') {
        resultado = a.nome.localeCompare(b.nome);
      } else if (campoOrdenacao === 'obrigatoria') {
        resultado = Number(b.obrigatoria) - Number(a.obrigatoria);
      }
      return ordemAscendente ? resultado : -resultado;
    });

    return lista;
  }, [materias, filtroTipo, busca, campoOrdenacao, ordemAscendente]);

  const alternarOrdenacao = (campo: CampoOrdenacao) => {
    if (campoOrdenacao === campo) {
      setOrdemAscendente(!ordemAscendente);
    } else {
      setCampoOrdenacao(campo);
      setOrdemAscendente(true);
    }
  };

  // Atalho para fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMateriaSelecionada(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.wrapper}>
      {/* Cabeçalho */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.mainTitle}>Grade Curricular de Matérias</h1>
            <p className={styles.subtitle}>
              Engenharia de Computação / Ciência da Computação — UFOP
            </p>
          </div>

          <div className={styles.statsBar}>
            <span className={styles.statBadge}>
              Total de Disciplinas: {contadores.total}
            </span>
            <span className={styles.statBadge}>
              Obrigatórias: {contadores.obrigatorias}
            </span>
            <span className={styles.statBadge}>
              Eletivas: {contadores.eletivas}
            </span>
          </div>
        </div>
      </header>

      {/* Card da Tabela */}
      <div className={styles.card}>
        {/* Barra de Filtros e Busca */}
        <div className={styles.controlsBar}>
          {/* Campo de Busca */}
          <div className={styles.searchContainer}>
            <span className={styles.searchIcon} aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Buscar por código ou nome (ex: CSI101, Cálculo)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar matéria por código ou nome"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className={styles.clearButton}
                aria-label="Limpar busca"
              >
                ×
              </button>
            )}
          </div>

          {/* Abas de Filtro */}
          <div className={styles.filterTabs} role="tablist" aria-label="Filtro de matérias">
            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'todas'}
              onClick={() => setFiltroTipo('todas')}
              className={`${styles.tabButton} ${filtroTipo === 'todas' ? styles.tabActive : ''}`}
            >
              Todas
              <span className={styles.tabBadge}>{contadores.total}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'obrigatorias'}
              onClick={() => setFiltroTipo('obrigatorias')}
              className={`${styles.tabButton} ${filtroTipo === 'obrigatorias' ? styles.tabActive : ''}`}
            >
              Obrigatórias
              <span className={styles.tabBadge}>{contadores.obrigatorias}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'eletivas'}
              onClick={() => setFiltroTipo('eletivas')}
              className={`${styles.tabButton} ${filtroTipo === 'eletivas' ? styles.tabActive : ''}`}
            >
              Eletivas
              <span className={styles.tabBadge}>{contadores.eletivas}</span>
            </button>
          </div>
        </div>

        {/* Estado de Carregamento */}
        {loading && (
          <div className={styles.centeredState}>
            <div className={styles.spinner} role="status" aria-label="Carregando..."></div>
            <p>Carregando disciplinas da API...</p>
          </div>
        )}

        {/* Estado de Erro */}
        {error && !loading && (
          <div className={styles.errorState}>
            <p><strong>Erro de Conexão:</strong> {error}</p>
            <button type="button" onClick={carregarMaterias} className={styles.retryBtn}>
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Conteúdo da Tabela */}
        {!loading && !error && (
          <>
            {materiasFiltradas.length === 0 ? (
              <div className={styles.centeredState}>
                <p>Nenhuma disciplina encontrada para os critérios selecionados.</p>
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className={styles.viewBtn}
                  >
                    Limpar pesquisa
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        onClick={() => alternarOrdenacao('codigo')}
                        className={styles.thSortable}
                        title="Clique para ordenar por código"
                      >
                        Código {campoOrdenacao === 'codigo' ? (ordemAscendente ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => alternarOrdenacao('nome')}
                        className={styles.thSortable}
                        title="Clique para ordenar por nome"
                      >
                        Nome da Disciplina {campoOrdenacao === 'nome' ? (ordemAscendente ? '▲' : '▼') : ''}
                      </th>
                      <th
                        onClick={() => alternarOrdenacao('obrigatoria')}
                        className={styles.thSortable}
                        title="Clique para ordenar por tipo"
                      >
                        Tipo {campoOrdenacao === 'obrigatoria' ? (ordemAscendente ? '▲' : '▼') : ''}
                      </th>
                      <th>Pré-requisitos</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {materiasFiltradas.map((m) => (
                      <tr
                        key={m.codigo}
                        className={styles.tableRow}
                        onClick={() => setMateriaSelecionada(m)}
                      >
                        <td>
                          <span className={styles.codigoBadge}>{m.codigo}</span>
                        </td>
                        <td>
                          <span className={styles.materiaNome}>{m.nome}</span>
                        </td>
                        <td>
                          {m.obrigatoria ? (
                            <span className={styles.badgeObrigatoria}>Obrigatória</span>
                          ) : (
                            <span className={styles.badgeEletiva}>Eletiva</span>
                          )}
                        </td>
                        <td>
                          {m.prerequisitos && m.prerequisitos.length > 0 ? (
                            <div className={styles.prereqList}>
                              {m.prerequisitos.map((pr) => {
                                const materiaPr = mapaMaterias.get(pr);
                                return (
                                  <span
                                    key={pr}
                                    className={styles.prereqTag}
                                    title={materiaPr ? `${pr} - ${materiaPr.nome}` : pr}
                                  >
                                    {pr}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className={styles.emptyPrereq}>Nenhum</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMateriaSelecionada(m);
                            }}
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rodapé da tabela */}
            <div className={styles.tableFooter}>
              <span>
                Exibindo <strong>{materiasFiltradas.length}</strong> de <strong>{contadores.total}</strong> disciplinas
              </span>
              <span>Dica: clique em uma linha para ver detalhes completos</span>
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalhes da Matéria */}
      {materiaSelecionada && (
        <div
          className={styles.modalOverlay}
          onClick={() => setMateriaSelecionada(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="modal-title" className={styles.modalTitle}>
                <span className={styles.codigoBadge}>{materiaSelecionada.codigo}</span>
                {materiaSelecionada.nome}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setMateriaSelecionada(null)}
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Classificação:</span>
                <span className={styles.detailValue}>
                  {materiaSelecionada.obrigatoria ? (
                    <span className={styles.badgeObrigatoria}>Disciplina Obrigatória</span>
                  ) : (
                    <span className={styles.badgeEletiva}>Disciplina Eletiva</span>
                  )}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Pré-requisitos ({materiaSelecionada.prerequisitos.length}):</span>
                {materiaSelecionada.prerequisitos.length > 0 ? (
                  <div className={styles.prereqList} style={{ marginTop: '0.25rem' }}>
                    {materiaSelecionada.prerequisitos.map((pr) => {
                      const mat = mapaMaterias.get(pr);
                      return (
                        <span
                          key={pr}
                          className={styles.prereqTag}
                          style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
                        >
                          <strong>{pr}</strong> {mat ? `— ${mat.nome}` : ''}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className={styles.emptyPrereq}>Esta disciplina não possui pré-requisitos cadastrados.</span>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalPrimaryBtn}
                onClick={() => setMateriaSelecionada(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default MateriasTable;


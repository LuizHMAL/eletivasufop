import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import type { Materia, MateriaStatus } from './types/materia';
import { GradePeriodos } from './components/GradePeriodos';
import { EletivasRealizadasTable } from './components/EletivasRealizadasTable';
import { DisponiveisView } from './components/DisponiveisView';
import { MateriasTable } from './components/MateriasTable';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'eletivasufop_cursadas';

export function App() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conjunto de matérias cursadas (inicializado com localStorage)
  const [cursadas, setCursadas] = useState<Set<string>>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }
    return new Set<string>();
  });

  // Modal de detalhes
  const [materiaDetalhes, setMateriaDetalhes] = useState<MateriaStatus | null>(null);

  // Aba ativa principal: 'planejador' (GradeUFOP + Eletivas + Disponíveis) vs 'grade_completa' (Tabela geral)
  const [abaPrincipal, setAbaPrincipal] = useState<'planejador' | 'catalogo'>('planejador');

  // Carregar dados iniciais da API
  const carregarMaterias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<{ materias: Materia[] }>(`${API_BASE_URL}/materias`);
      setMaterias(res.data.materias || []);
    } catch (err) {
      console.error('Erro ao carregar matérias:', err);
      setError('Não foi possível carregar as disciplinas. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMaterias();
  }, [carregarMaterias]);

  // Persistir matérias cursadas no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cursadas)));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [cursadas]);

  // Mapa rápido de matérias por código
  const materiasMap = useMemo(() => {
    const map = new Map<string, Materia>();
    materias.forEach((m) => map.set(m.codigo, m));
    return map;
  }, [materias]);

  // Mapa com o status calculado de cada disciplina (0ms de latência no cliente)
  const materiasStatusMap = useMemo(() => {
    const statusMap = new Map<string, MateriaStatus>();

    materias.forEach((m) => {
      const prereqs = m.prerequisitos || [];
      const cumpridos = prereqs.filter((pr) => cursadas.has(pr));
      const faltantes = prereqs.filter((pr) => !cursadas.has(pr));

      let status: 'cursada' | 'disponivel' | 'bloqueada';
      if (cursadas.has(m.codigo)) {
        status = 'cursada';
      } else if (faltantes.length === 0) {
        status = 'disponivel';
      } else {
        status = 'bloqueada';
      }

      statusMap.set(m.codigo, {
        ...m,
        status,
        prerequisitos_cumpridos: cumpridos,
        prerequisitos_faltantes: faltantes,
      });
    });

    return statusMap;
  }, [materias, cursadas]);

  // Sincronizar também com o backend via POST /materias/disponiveis (garante consistência de validação)
  useEffect(() => {
    if (materias.length === 0) return;
    axios
      .post(`${API_BASE_URL}/materias/disponiveis`, {
        cursadas: Array.from(cursadas),
        auto_incluir_prerequisitos: false,
      })
      .catch((err) => {
        console.warn('Sync com backend /materias/disponiveis:', err);
      });
  }, [cursadas, materias.length]);

  // Estatísticas globais
  const estatisticas = useMemo(() => {
    let cursadasObrig = 0;
    let cursadasElet = 0;
    let disponiveisObrig = 0;
    let disponiveisElet = 0;

    materiasStatusMap.forEach((m) => {
      if (m.status === 'cursada') {
        if (m.obrigatoria) cursadasObrig++;
        else cursadasElet++;
      } else if (m.status === 'disponivel') {
        if (m.obrigatoria) disponiveisObrig++;
        else disponiveisElet++;
      }
    });

    return {
      totalCursadas: cursadas.size,
      cursadasObrig,
      cursadasElet,
      disponiveisTotal: disponiveisObrig + disponiveisElet,
      disponiveisObrig,
      disponiveisElet,
    };
  }, [materiasStatusMap, cursadas]);

  const handleToggleMateria = (novoSet: Set<string>) => {
    setCursadas(novoSet);
  };

  return (
    <div className="appContainer">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="navBrand">
          <span className="brandIcon" role="img" aria-label="Universidade">🎓</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>Eletivas UFOP</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Engenharia de Computação</span>
          </div>
        </div>

        {/* Abas de Navegação Superior */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="navTabBtn"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: abaPrincipal === 'planejador' ? '#2563eb' : 'transparent',
              color: abaPrincipal === 'planejador' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setAbaPrincipal('planejador')}
          >
            Simulador de Matrícula
          </button>
          <button
            type="button"
            className="navTabBtn"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              background: abaPrincipal === 'catalogo' ? '#2563eb' : 'transparent',
              color: abaPrincipal === 'catalogo' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setAbaPrincipal('catalogo')}
          >
            Catálogo Geral de Disciplinas
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mainContent" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p>Carregando disciplinas da UFOP...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ef4444' }}>
            <p><strong>Erro:</strong> {error}</p>
            <button
              type="button"
              onClick={carregarMaterias}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1.25rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!loading && !error && abaPrincipal === 'planejador' && (
          <>
            {/* Banner de Estatísticas Resumo */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: '#14161a',
                border: '1px solid #282b33',
                borderRadius: '10px',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                <span style={{ color: '#9ca3af' }}>
                  Cursadas:{' '}
                  <strong style={{ color: '#10b981' }}>{estatisticas.totalCursadas}</strong>{' '}
                  <span style={{ fontSize: '0.8rem' }}>
                    ({estatisticas.cursadasObrig} obrigatórias + {estatisticas.cursadasElet} eletivas)
                  </span>
                </span>
                <span style={{ color: '#9ca3af' }}>
                  Disponíveis para Matrícula:{' '}
                  <strong style={{ color: '#f59e0b' }}>{estatisticas.disponiveisTotal}</strong>{' '}
                  <span style={{ fontSize: '0.8rem' }}>
                    ({estatisticas.disponiveisObrig} obrigatórias + {estatisticas.disponiveisElet} eletivas)
                  </span>
                </span>
              </div>

              {cursadas.size > 0 && (
                <button
                  type="button"
                  onClick={() => setCursadas(new Set())}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Reiniciar Seleção
                </button>
              )}
            </div>

            {/* 1. Grade UFOP de Obrigatórias (10 períodos em colunas) */}
            <section>
              <GradePeriodos
                materiasStatusMap={materiasStatusMap}
                materiasMap={materiasMap}
                cursadas={cursadas}
                onToggleMateria={handleToggleMateria}
                onSelectMateriaDetalhes={(m) => setMateriaDetalhes(m)}
              />
            </section>

            {/* 2. Tabela de Eletivas Realizadas */}
            <section>
              <EletivasRealizadasTable
                materiasStatusMap={materiasStatusMap}
                materiasMap={materiasMap}
                cursadas={cursadas}
                onToggleMateria={handleToggleMateria}
              />
            </section>

            {/* 3. Matérias e Eletivas Disponíveis (Modo Tabela & Modo Grafo) */}
            <section>
              <DisponiveisView
                materiasStatusMap={materiasStatusMap}
                materiasMap={materiasMap}
                cursadas={cursadas}
                onToggleMateria={handleToggleMateria}
              />
            </section>
          </>
        )}

        {!loading && !error && abaPrincipal === 'catalogo' && (
          <section>
            <MateriasTable />
          </section>
        )}

        {/* Modal de Detalhes da Matéria */}
        {materiaDetalhes && (
          <div
            className="modalOverlay"
            onClick={() => setMateriaDetalhes(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#14161a',
                border: '1px solid #282b33',
                borderRadius: '12px',
                maxWidth: '520px',
                width: '100%',
                padding: '1.5rem',
                color: '#ffffff',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                  <span style={{ color: '#3b82f6', marginRight: '0.5rem', fontFamily: 'monospace' }}>
                    {materiaDetalhes.codigo}
                  </span>
                  {materiaDetalhes.nome}
                </h3>
                <button
                  type="button"
                  onClick={() => setMateriaDetalhes(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <strong>Tipo:</strong>{' '}
                  {materiaDetalhes.obrigatoria ? (
                    <span style={{ color: '#60a5fa' }}>Obrigatória ({materiaDetalhes.periodo}º período)</span>
                  ) : (
                    <span style={{ color: '#fbbf24' }}>Eletiva</span>
                  )}
                </div>

                <div>
                  <strong>Situação Atual:</strong>{' '}
                  {materiaDetalhes.status === 'cursada' ? (
                    <span style={{ color: '#34d399' }}>✓ Cursada</span>
                  ) : materiaDetalhes.status === 'disponivel' ? (
                    <span style={{ color: '#f59e0b' }}>★ Disponível para Cursar</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Bloqueada (faltam pré-requisitos)</span>
                  )}
                </div>

                <div>
                  <strong>Pré-requisitos ({materiaDetalhes.prerequisitos.length}):</strong>
                  {materiaDetalhes.prerequisitos.length === 0 ? (
                    <p style={{ color: '#9ca3af', margin: '0.25rem 0 0', fontStyle: 'italic' }}>
                      Nenhum pré-requisito cadastrado.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {materiaDetalhes.prerequisitos.map((pr) => {
                        const cumprido = cursadas.has(pr);
                        const matPr = materiasMap.get(pr);
                        return (
                          <span
                            key={pr}
                            style={{
                              fontFamily: 'monospace',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              backgroundColor: cumprido ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: cumprido ? '#6ee7b7' : '#fca5a5',
                              border: `1px solid ${cumprido ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}
                            title={matPr ? `${pr} - ${matPr.nome}` : pr}
                          >
                            {cumprido ? '✓ ' : '✗ '}
                            {pr} {matPr ? `(${matPr.nome})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setMateriaDetalhes(null)}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="appFooter">
        <p>Eletivas UFOP — Sistema de Planejamento de Matrícula</p>
      </footer>
    </div>
  );
}

export default App;

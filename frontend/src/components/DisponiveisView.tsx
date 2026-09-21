import React, { useState } from 'react';
import type { Materia, MateriaStatus } from '../types/materia';
import { DisponiveisTable } from './DisponiveisTable';
import { DisponiveisGrafo } from './DisponiveisGrafo';

interface DisponiveisViewProps {
  materiasStatusMap: Map<string, MateriaStatus>;
  materiasMap: Map<string, Materia>;
  cursadas: Set<string>;
  onToggleMateria: (novoSet: Set<string>) => void;
}

type ModoVisualizacao = 'tabela' | 'grafo';

export const DisponiveisView: React.FC<DisponiveisViewProps> = ({
  materiasStatusMap,
  materiasMap,
  cursadas,
  onToggleMateria,
}) => {
  const [modo, setModo] = useState<ModoVisualizacao>('tabela');

  const totalDisponiveis = Array.from(materiasStatusMap.values()).filter(
    (m) => m.status === 'disponivel'
  ).length;

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      {/* Barra de Título e Alternador de Modo Tabela / Grafo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
            Matérias e Eletivas Disponíveis
          </h2>
          <span
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            {totalDisponiveis} prontas para cursar
          </span>
        </div>

        {/* Botões para alternar modo Tabela e Grafo */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#14161a',
            border: '1px solid #282b33',
            borderRadius: '8px',
            padding: '3px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setModo('tabela')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: modo === 'tabela' ? '#3b82f6' : 'transparent',
              color: modo === 'tabela' ? '#ffffff' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Ver em Tabela
          </button>

          <button
            type="button"
            onClick={() => setModo('grafo')}
            style={{
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: modo === 'grafo' ? '#3b82f6' : 'transparent',
              color: modo === 'grafo' ? '#ffffff' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Ver em Grafo
          </button>
        </div>
      </div>

      {/* Renderização Condicional: Tabela ou Grafo */}
      {modo === 'tabela' ? (
        <DisponiveisTable
          materiasStatusMap={materiasStatusMap}
          materiasMap={materiasMap}
          cursadas={cursadas}
          onToggleMateria={onToggleMateria}
        />
      ) : (
        <DisponiveisGrafo
          materiasStatusMap={materiasStatusMap}
          materiasMap={materiasMap}
          cursadas={cursadas}
          onToggleMateria={onToggleMateria}
        />
      )}
    </section>
  );
};

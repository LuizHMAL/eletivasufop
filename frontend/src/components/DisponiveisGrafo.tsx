import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { Materia, MateriaStatus } from '../types/materia';
import { expandPrerequisites, removeDependentSubjects } from '../utils/materiaGraph';
import styles from './DisponiveisGrafo.module.css';

interface DisponiveisGrafoProps {
  materiasStatusMap: Map<string, MateriaStatus>;
  materiasMap: Map<string, Materia>;
  cursadas: Set<string>;
  onToggleMateria: (novoSet: Set<string>) => void;
}

type GrafoFiltro = 'todas' | 'disponiveis' | 'obrigatorias' | 'eletivas';

interface NodePosition {
  codigo: string;
  materia: MateriaStatus;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  path: string;
}

export const DisponiveisGrafo: React.FC<DisponiveisGrafoProps> = ({
  materiasStatusMap,
  materiasMap,
  cursadas,
  onToggleMateria,
}) => {
  const [filtro, setFiltro] = useState<GrafoFiltro>('disponiveis');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const nodeWidth = 116;
  const nodeHeight = 44;
  const colGap = 165;
  const rowGap = 58;

  // Filtragem e cálculo de posições
  const { nodes, edges, maxCols } = useMemo(() => {
    // Determinar disciplinas a exibir
    const listaExibir: MateriaStatus[] = [];
    materiasStatusMap.forEach((m) => {
      if (filtro === 'disponiveis') {
        // Exibe as disponíveis e seus pré-requisitos imediatos para contexto visual
        if (m.status === 'disponivel' || (m.status === 'cursada' && m.prerequisitos.length > 0)) {
          listaExibir.push(m);
        }
      } else if (filtro === 'obrigatorias') {
        if (m.obrigatoria) listaExibir.push(m);
      } else if (filtro === 'eletivas') {
        if (!m.obrigatoria) listaExibir.push(m);
      } else {
        listaExibir.push(m);
      }
    });

    // Mapear coluna de cada matéria
    const colunasMap = new Map<string, number>();
    materiasStatusMap.forEach((m) => {
      if (m.periodo) {
        colunasMap.set(m.codigo, m.periodo);
      } else {
        // Para eletivas: nível = max(período dos pré-requisitos) + 1
        let maxPrPeriod = 1;
        for (const pr of m.prerequisitos) {
          const prMat = materiasStatusMap.get(pr);
          if (prMat?.periodo && prMat.periodo >= maxPrPeriod) {
            maxPrPeriod = prMat.periodo + 1;
          }
        }
        colunasMap.set(m.codigo, Math.min(maxPrPeriod, 11));
      }
    });

    // Agrupar nós por coluna
    const nodesByCol: Record<number, MateriaStatus[]> = {};
    const codigosExibir = new Set(listaExibir.map((m) => m.codigo));

    listaExibir.forEach((m) => {
      const col = colunasMap.get(m.codigo) || 1;
      if (!nodesByCol[col]) nodesByCol[col] = [];
      nodesByCol[col].push(m);
    });

    const nodesCalculados: NodePosition[] = [];
    const nodePosMap = new Map<string, { x: number; y: number }>();

    let maxColCount = 1;
    Object.keys(nodesByCol).forEach((colStr) => {
      const col = Number(colStr);
      if (col > maxColCount) maxColCount = col;
      const list = nodesByCol[col];
      list.sort((a, b) => a.codigo.localeCompare(b.codigo));

      list.forEach((m, rowIdx) => {
        const x = (col - 1) * colGap + 40;
        const y = rowIdx * rowGap + 50;
        nodesCalculados.push({
          codigo: m.codigo,
          materia: m,
          x,
          y,
          width: nodeWidth,
          height: nodeHeight,
        });
        nodePosMap.set(m.codigo, { x, y });
      });
    });

    // Construir arestas entre nós exibidos
    const edgesCalculadas: Edge[] = [];
    nodesCalculados.forEach((targetNode) => {
      for (const pr of targetNode.materia.prerequisitos) {
        if (codigosExibir.has(pr) && nodePosMap.has(pr)) {
          const sourcePos = nodePosMap.get(pr)!;
          const startX = sourcePos.x + nodeWidth;
          const startY = sourcePos.y + nodeHeight / 2;
          const endX = targetNode.x;
          const endY = targetNode.y + nodeHeight / 2;

          const dx = endX - startX;
          const control1X = startX + dx * 0.45;
          const control1Y = startY;
          const control2X = startX + dx * 0.55;
          const control2Y = endY;

          const path = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
          edgesCalculadas.push({
            id: `${pr}->${targetNode.codigo}`,
            source: pr,
            target: targetNode.codigo,
            path,
          });
        }
      }
    });

    return { nodes: nodesCalculados, edges: edgesCalculadas, maxCols: maxColCount };
  }, [materiasStatusMap, filtro]);

  // Manipulação de clique no nó do grafo
  const handleNodeClick = (codigo: string) => {
    const isCursada = cursadas.has(codigo);
    if (!isCursada) {
      const novoSet = new Set(cursadas);
      novoSet.add(codigo);
      const expandido = expandPrerequisites(novoSet, materiasMap);
      onToggleMateria(expandido);
    } else {
      const atualizado = removeDependentSubjects(codigo, cursadas, materiasMap);
      onToggleMateria(atualizado);
    }
  };

  // Eventos de Pan (arrastar)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Apenas botão esquerdo
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.2));
  };

  return (
    <div className={styles.graphContainer}>
      {/* Barra de Controles do Grafo */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'disponiveis' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('disponiveis')}
          >
            Matérias Disponíveis & Fluxo
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'obrigatorias' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('obrigatorias')}
          >
            Grafo Obrigatórias (1º a 10º)
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'eletivas' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('eletivas')}
          >
            Grafo Eletivas
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filtro === 'todas' ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Grade Completa (109 matérias)
          </button>
        </div>

        <div className={styles.zoomControls}>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => setZoom((z) => Math.min(z * 1.15, 2.2))}
            title="Aumentar Zoom"
          >
            +
          </button>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => setZoom((z) => Math.max(z * 0.85, 0.35))}
            title="Diminuir Zoom"
          >
            −
          </button>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => {
              setZoom(0.8);
              setPan({ x: 40, y: 30 });
            }}
            title="Redefinir Posição"
            style={{ fontSize: '0.75rem', width: 'auto', padding: '0 0.5rem' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas SVG Interativo */}
      <div
        className={styles.canvasWrapper}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg className={styles.svgRoot}>
          <defs>
            <marker
              id="arrowhead-default"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="#3b4252" />
            </marker>
            <marker
              id="arrowhead-gold"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="#f59e0b" />
            </marker>
            <marker
              id="arrowhead-cyan"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="#38bdf8" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Indicadores de Nível / Coluna de Período */}
            {Array.from({ length: maxCols }).map((_, i) => {
              const colNum = i + 1;
              const xPos = i * colGap + 40;
              return (
                <text
                  key={colNum}
                  x={xPos + nodeWidth / 2}
                  y={25}
                  fill="#4b5563"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {colNum <= 10 ? `${colNum}º Período` : 'Eletivas'}
                </text>
              );
            })}

            {/* Arestas (Fluxo de Dependência) */}
            {edges.map((edge) => {
              const isIncomingToHovered = hoveredNode === edge.target;
              const isOutgoingFromHovered = hoveredNode === edge.source;

              let edgeClass = styles.edgePath;
              let marker = 'url(#arrowhead-default)';

              if (hoveredNode) {
                if (isIncomingToHovered) {
                  edgeClass = `${styles.edgePath} ${styles.edgeHighlightIn}`;
                  marker = 'url(#arrowhead-gold)';
                } else if (isOutgoingFromHovered) {
                  edgeClass = `${styles.edgePath} ${styles.edgeHighlightOut}`;
                  marker = 'url(#arrowhead-cyan)';
                } else {
                  edgeClass = `${styles.edgePath} ${styles.edgeDimmed}`;
                }
              }

              return (
                <path
                  key={edge.id}
                  d={edge.path}
                  className={edgeClass}
                  markerEnd={marker}
                />
              );
            })}

            {/* Nós (Disciplinas) */}
            {nodes.map((n) => {
              const status = n.materia.status;
              let rectClass = styles.nodeBloqueada;
              if (status === 'cursada') rectClass = styles.nodeCursada;
              else if (status === 'disponivel') rectClass = styles.nodeDisponivel;

              const isHovered = hoveredNode === n.codigo;
              const nomeAbreviado =
                n.materia.nome.length > 20
                  ? `${n.materia.nome.substring(0, 18)}...`
                  : n.materia.nome;

              return (
                <g
                  key={n.codigo}
                  transform={`translate(${n.x}, ${n.y})`}
                  className={styles.nodeGroup}
                  onMouseEnter={() => setHoveredNode(n.codigo)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(n.codigo);
                  }}
                >
                  <rect
                    width={n.width}
                    height={n.height}
                    className={`${styles.nodeRect} ${rectClass} ${
                      status === 'disponivel' ? styles.badgeDisponivelGlow : ''
                    }`}
                    style={{
                      strokeWidth: isHovered ? 2.5 : undefined,
                    }}
                  />
                  <text
                    x={n.width / 2}
                    y={17}
                    className={styles.nodeTextCodigo}
                  >
                    {status === 'cursada' ? `✓ ${n.codigo}` : n.codigo}
                  </text>
                  <text
                    x={n.width / 2}
                    y={32}
                    className={styles.nodeTextNome}
                  >
                    {nomeAbreviado}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className={styles.infoOverlay}>
          Dica: Arraste para mover o grafo, use a roda do mouse para dar zoom. Clique em um nó para alternar cursada. Passe o mouse para ver os caminhos de pré-requisitos.
        </div>
      </div>
    </div>
  );
};

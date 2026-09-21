import type { Materia } from '../types/materia';

/**
 * Retorna todos os pré-requisitos (diretos e indiretos) de um conjunto de disciplinas.
 */
export function expandPrerequisites(
  selectedCodes: Set<string>,
  materiasMap: Map<string, Materia>
): Set<string> {
  const result = new Set<string>();

  function visit(code: string) {
    if (result.has(code)) return;
    const materia = materiasMap.get(code);
    if (!materia) return;
    result.add(code);
    for (const pr of materia.prerequisitos) {
      visit(pr);
    }
  }

  for (const c of selectedCodes) {
    visit(c);
  }

  return result;
}

/**
 * Ao desmarcar uma disciplina, remove todas as disciplinas que dependem direta ou indiretamente dela.
 */
export function removeDependentSubjects(
  codeToRemove: string,
  currentSelected: Set<string>,
  materiasMap: Map<string, Materia>
): Set<string> {
  const dependentsMap = buildDependentsMap(materiasMap);
  const toRemove = new Set<string>([codeToRemove]);

  function findDependents(code: string) {
    const deps = dependentsMap.get(code) || [];
    for (const dep of deps) {
      if (!toRemove.has(dep)) {
        toRemove.add(dep);
        findDependents(dep);
      }
    }
  }

  findDependents(codeToRemove);

  const updated = new Set<string>();
  for (const c of currentSelected) {
    if (!toRemove.has(c)) {
      updated.add(c);
    }
  }

  return updated;
}

/**
 * Constrói um mapa invertido: disciplina -> lista de disciplinas que a têm como pré-requisito.
 */
export function buildDependentsMap(
  materiasMap: Map<string, Materia>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [code] of materiasMap) {
    map.set(code, []);
  }

  for (const [code, mat] of materiasMap) {
    for (const pr of mat.prerequisitos) {
      if (!map.has(pr)) {
        map.set(pr, []);
      }
      map.get(pr)!.push(code);
    }
  }

  return map;
}

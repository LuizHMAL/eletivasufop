import { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './ObrigatoriasSelecionaveis.module.css';

interface Disciplina {
  nome: string;
  codigo: string;
  prerequisitos: string[];
  obrigatoria: boolean;
}

const API_URL = 'http://127.0.0.1:8000/materias/obrigatorias';

export function ObrigatoriasSelecionaveis() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    axios.get(API_URL)
      .then(response => {
        setDisciplinas(response.data.materias || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Erro ao carregar disciplinas');
        setLoading(false);
      });
  }, []);


  const handleClick = (codigo: string) => {
    axios.get(`http://127.0.0.1:8000/materia/${codigo}`)
      .then(res => {
        console.log("Detalhes:", res.data);
      })
      .catch(err => {
        console.error("Erro ao buscar matéria:", err);
      });
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.container}>
      <h2>Disciplinas</h2>

      {disciplinas.length === 0 ? (
        <p>Nenhuma disciplina encontrada.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Obrigatória</th>
            </tr>
          </thead>

          <tbody>
            {disciplinas.map((d) => (
              <tr 
                key={d.codigo} 
                onClick={() => handleClick(d.codigo)}
                style={{ cursor: 'pointer' }}
              >
                <td>{d.nome}</td>
                <td>{d.codigo}</td>
                <td>{d.obrigatoria ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
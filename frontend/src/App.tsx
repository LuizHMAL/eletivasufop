import './App.css';
import { MateriasTable } from './components/MateriasTable';

export function App() {
  return (
    <div className="appContainer">
      <header className="navbar">
        <div className="navBrand">
          <span className="brandIcon" role="img" aria-label="Universidade">🎓</span>
          <span>Eletivas UFOP</span>
        </div>

        <nav className="navLinks">
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="navLink"
            title="Acessar Swagger UI do FastAPI"
          >
            <span>Docs API</span>
            <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main className="mainContent">
        <MateriasTable />
      </main>

      <footer className="appFooter">
        <p>Eletivas UFOP — Ambiente de Desenvolvimento Monorepo (FastAPI + React TypeScript)</p>
      </footer>
    </div>
  );
}

export default App;

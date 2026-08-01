import PhaserGame from './game/PhaserGame'
import './App.css'

function App() {
  return (
    <main className="app">
      <header className="game-header">
        <div>
          <p className="eyebrow">SURVIVAL WEB GAME</p>
          <h1>Đêm Cuối Cùng</h1>
        </div>

        <span className="status">Đang phát triển</span>
      </header>

      <section className="game-panel" aria-label="Khu vực chơi Đêm Cuối Cùng">
        <PhaserGame />
      </section>

      <p className="game-note">
        Máy tính: WASD hoặc phím mũi tên • Điện thoại: nên xoay ngang màn hình.
      </p>
    </main>
  )
}

export default App

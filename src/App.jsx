import PokemonList from './features/pokemon/PokemonList';

const App = () => {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="titlePage">Pokémon Chat</h1>
      <PokemonList />
    </main>
  );
};

export default App;

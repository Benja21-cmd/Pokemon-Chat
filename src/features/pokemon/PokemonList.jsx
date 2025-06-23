import React, { useEffect, useState } from "react";

const API_KEY = "AIzaSyAW8mZmoSd9u1M3JMPfIJnhBl3zEycIH3A";

const PokemonList = () => {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [likedPokemons, setLikedPokemons] = useState(() => {
    const stored = localStorage.getItem("likedPokemons");
    return stored ? JSON.parse(stored) : [];
  });

  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    const fetchPokemons = async () => {
      try {
        const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
        const data = await res.json();

        const detailedPromises = data.results.map(async (poke) => {
          const res = await fetch(poke.url);
          return await res.json();
        });

        const detailedPokemons = await Promise.all(detailedPromises);

        setPokemonList(detailedPokemons);
        setLoading(false);
      } catch (error) {
        console.error("Error al cargar pokemones:", error);
        setLoading(false);
      }
    };

    fetchPokemons();
  }, []);

  
  useEffect(() => {
    if (isChatOpen && selectedPokemon) {
      setChatMessages([
        {
          from: "ai",
          text: `Hola! Soy ${selectedPokemon.name}. Pregúntame lo que quieras.`,
        },
      ]);
    }
  }, [isChatOpen, selectedPokemon]);

  const sendMessageToGemini = async (message, selectedPokemon) => {
    if (!selectedPokemon) return;

    const name = selectedPokemon.name;
    const abilities = selectedPokemon.abilities
      .map((a) => a.ability.name)
      .join(", ");
    const moves = selectedPokemon.moves
      .slice(0, 10)
      .map((m) => m.move.name)
      .join(", ");
    const stats = selectedPokemon.stats
      .map((s) => `${s.stat.name}: ${s.base_stat}`)
      .join(", ");

    const promptText = `
Eres ${name}, un Pokémon con las siguientes características:
Habilidades: ${abilities}
Movimientos (principales): ${moves}
Estadísticas: ${stats}

Tu tarea es actuar como este Pokémon y responder solo preguntas que estén relacionadas explícitamente contigo. 
Puedes responder preguntas sobre:

- Tus habilidades y cómo funcionan.
- Tus movimientos y sus efectos.
- Tus estadísticas (fuerza, defensa, velocidad, etc.).
- Tu tipo elemental y cómo afecta tus fortalezas y debilidades.
- Información general sobre tu especie y comportamiento.
- También puedes responder de forma amigable a saludos, halagos o comentarios casuales.

❗ Pero si el usuario hace una pregunta fuera de estos temas (como recetas, ciencia, política, matemáticas, problemas personales, otros Pokémon, etc.), **no debes responderla**. En su lugar, responde con:

"Lo siento, no puedo responder preguntas de ese tipo, por temas de mi configuración solo puedo ayudarte con información relacionada a mí como Pokémon. Por favor, hazme preguntas sobre mis habilidades, movimientos, estadísticas o tipo, con eso sí puedo ayudarte y darte toda mi informacion."

Ahora responde esta pregunta del usuario como si fueras ${name}:

${message}
    `.trim();

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error("Error Gemini:", data.error);
        return "Error en la respuesta de Gemini.";
      }

      const content = data.candidates?.[0]?.content;
      if (content && Array.isArray(content.parts)) {
        
        return content.parts.map((part) => part.text).join("");
      }

      return "No obtuve respuesta de Gemini.";
    } catch (error) {
      console.error("Error llamando a Gemini:", error);
      return "Error de conexión con Gemini.";
    }
  };

  const toggleLike = (pokemonName) => {
    let updatedLikes;

    if (likedPokemons.includes(pokemonName)) {
      updatedLikes = likedPokemons.filter((name) => name !== pokemonName);
    } else {
      updatedLikes = [...likedPokemons, pokemonName];
    }

    setLikedPokemons(updatedLikes);
    localStorage.setItem("likedPokemons", JSON.stringify(updatedLikes));
  };


  const handleTalkClick = (pokemon) => {
    setSelectedPokemon(pokemon);
    setIsChatOpen(true);
  };

  
  const sendMessage = async (message) => {
    setChatMessages((msgs) => [...msgs, { from: "user", text: message }]);

    const aiResponse = await sendMessageToGemini(message, selectedPokemon);

    setChatMessages((msgs) => [...msgs, { from: "ai", text: aiResponse }]);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput.trim());
    setUserInput("");
  };

  const filteredPokemons = pokemonList
    .filter((pokemon) =>
      pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });

  if (loading)
    return <p className="loading">Cargando Pokemones...</p>;

  return (
    <div className="container">
      {/* Filtros */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar Pokémon"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="asc">Orden A-Z</option>
          <option value="desc">Orden Z-A</option>
        </select>
      </div>

      {/* Lista de pokemones */}
      <div className="pokemon-grid">
        {filteredPokemons.map((pokemon) => (
          <div key={pokemon.id} className="pokemon-card">
            <img
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
              loading="lazy"
            />
            <h2 className="pokemon-name">{pokemon.name}</h2>
            <div className="pokemon-actions">
              <button
                className={`like-button ${
                  likedPokemons.includes(pokemon.name) ? "liked" : ""
                }`}
                onClick={() => toggleLike(pokemon.name)}
                aria-label={
                  likedPokemons.includes(pokemon.name)
                    ? "Quitar favorito"
                    : "Agregar favorito"
                }
              >
                {likedPokemons.includes(pokemon.name) ? "❤️" : "🤍"}
              </button>
              <button
                className="talk-button"
                onClick={() => handleTalkClick(pokemon)}
              >
                Hablar con este pokemon
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de chat */}
      {isChatOpen && selectedPokemon && (
        <div className="modal-backdrop">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
          >
            <button
              className="modal-close-btn"
              onClick={() => setIsChatOpen(false)}
              aria-label="Cerrar chat"
            >
              ✖️
            </button>
            <div className="w-full text-center mb-4">
              <h3
                id="modalTitle"
                className="text-xl font-bold capitalize inline-block"
              >
                {selectedPokemon.name}
              </h3>
            </div>

            {/* Historial de chat */}
            <div
              className="chat-messages"
              aria-live="polite"
              aria-relevant="additions"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-bubble ${
                    msg.from === "user" ? "user" : "ai"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input y botón para enviar */}
            <form onSubmit={handleChatSubmit} className="chat-form">
              <input
                type="text"
                className="chat-input"
                placeholder="Escribe tu mensaje..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                autoFocus
                aria-label="Mensaje de chat"
              />
              <button type="submit" className="chat-send-btn">
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokemonList;


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@yush2004',
    database: 'pokedex'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database!');
});

// Routes
// Get all Pokémon
app.get('/pokemon', (req, res) => {
    db.query('SELECT * FROM pokemon', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Add a new Pokémon
app.post('/pokemon', (req, res) => {
    const { name, type, health, attack, defense } = req.body;

    // Check if a Pokémon with the same name already exists
    const checkSql = 'SELECT * FROM pokemon WHERE name = ?';
    db.query(checkSql, [name], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Pokémon already exists
            return res.status(409).json({ error: 'A Pokémon with this name already exists.' });
        }

        // Insert the new Pokémon
        const sql = 'INSERT INTO pokemon (name, type, health, attack, defense) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, type, health, attack, defense], (err) => {
            if (err) throw err;
            res.status(201).json({ message: 'Pokémon added successfully!' });
        });
    });
});

// Update Pokémon data
app.put('/pokemon/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, health, attack, defense } = req.body;

    // Check if Pokémon with the given ID exists
    const checkSql = 'SELECT * FROM pokemon WHERE id = ?';
    db.query(checkSql, [id], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            // Pokémon not found
            return res.status(404).json({ message: 'Pokémon not found' });
        }

        // Update the Pokémon's data
        const updateSql = 'UPDATE pokemon SET name = ?, type = ?, health = ?, attack = ?, defense = ? WHERE id = ?';
        db.query(updateSql, [name, type, health, attack, defense, id], (err) => {
            if (err) throw err;

            res.status(200).json({ message: 'Pokémon updated successfully!' });
        });
    });
});

// Fight between two Pokémon
app.post('/fight', (req, res) => {
    const { pokemon1_id, pokemon2_id } = req.body;

    if (!pokemon1_id || !pokemon2_id) {
        return res.status(400).json({ message: 'Two Pokémon are required' });
    }
    const sql = 'SELECT * FROM pokemon WHERE id IN (?, ?)';
    db.query(sql, [pokemon1_id, pokemon2_id], (err, results) => {
        if (err) throw err;

        // Check if we found both Pokémon
        if (results.length < 2) {
            return res.status(404).json({ message: 'One or both Pokémon not found' });
        }

        const [pokemon1, pokemon2] = results;
        let winner = pokemon1.attack > pokemon2.attack ? pokemon1 : pokemon2;

        // Record the fight
        const insertFight = 'INSERT INTO battle_history (pokemon1_id, pokemon2_id, winner_id) VALUES (?, ?, ?)';
        db.query(insertFight, [pokemon1_id, pokemon2_id, winner.id], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error recording the fight' });
            }

            res.json({ winner });
        });
    });
});

// Get stats route
app.get('/stats', (req, res) => {
    const totalBattlesQuery = 'SELECT COUNT(*) AS totalBattles FROM battle_history';
    const totalPokemonQuery = 'SELECT COUNT(*) AS totalPokemon FROM pokemon';
    const topTrainerQuery = `
        SELECT battle_history.winner_trainer, COUNT(*) AS win_count 
        FROM battle_history 
        JOIN battles ON battles.winner_id = battle_history.winner_id 
        GROUP BY battle_history.winner_trainer 
        ORDER BY win_count DESC LIMIT 1
    `;

    db.query(totalBattlesQuery, (err, battlesResult) => {
        if (err) throw err;

        db.query(totalPokemonQuery, (err, pokemonResult) => {
            if (err) throw err;

            db.query(topTrainerQuery, (err, trainerResult) => {
                if (err) throw err;

                res.json({
                    totalBattles: battlesResult[0].totalBattles,
                    totalPokemon: pokemonResult[0].totalPokemon,
                    topTrainer: trainerResult.length ? trainerResult[0].winner_trainer : "No battles yet"
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

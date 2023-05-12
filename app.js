const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const snakeCaseToCamelCase = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,

    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//API 1 Returns a list of all the players in the player table

app.get("/players/", async (request, response) => {
  const getPlayersListQuery = `
    SELECT * FROM
    player_details;`;
  const playersListResult = await db.all(getPlayersListQuery);
  response.send(
    playersListResult.map((eachPlayer) => snakeCaseToCamelCase(eachPlayer))
  );
});

//API 2 Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const SinglePlayerDetailsQuery = `
    SELECT * FROM
        player_details
    WHERE player_id = ${playerId};`;
  const playerDetailsResult = await db.get(SinglePlayerDetailsQuery);
  response.send(snakeCaseToCamelCase(playerDetailsResult));
});

// API 3 Updates the details of a specific player based on the player ID

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerDetailsQuery = `
    UPDATE
     player_details
     SET 
        player_name = '${playerName}'
    WHERE player_id = ${playerId};`;
  await db.run(updatePlayerDetailsQuery);
  response.send("Player Details Updated");
});

//API 4 Returns the match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
    SELECT * FROM
        match_details
    WHERE match_id = ${matchId};`;
  const matchDetailsResult = await db.get(getMatchDetailsQuery);
  response.send(snakeCaseToCamelCase(matchDetailsResult));
});

//API 5 Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const matchesDetailsQuery = `
    SELECT 
        match_details.match_id,
        match_details.match,
        match_details.year
    FROM match_details
    INNER JOIN player_match_score
    ON match_details.match_id = player_match_score.match_id
    WHERE player_id = ${playerId};`;
  const matches = await db.all(matchesDetailsQuery);
  response.send(matches.map((eachMatch) => snakeCaseToCamelCase(eachMatch)));
});

// API 6 Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const playersListQuery = `
    SELECT 
        player_details.player_id,
        player_details.player_name
    FROM player_details
    INNER JOIN player_match_score
    ON player_details.player_id = player_match_score.player_id
    WHERE match_id = ${matchId};`;
  const players = await db.all(playersListQuery);
  response.send(players.map((eachPlayer) => snakeCaseToCamelCase(eachPlayer)));
});

// API 7 Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const statisticsQuery = `
    SELECT 
        player_details.player_id,
        player_details.player_name,
        SUM(player_match_score.score),
        SUM(player_match_score.fours),
        SUM(player_match_score.sixes)
    FROM player_details
    INNER JOIN player_match_score
    ON player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const playerScores = await db.get(statisticsQuery);
  response.send({
    playerId: playerScores["player_id"],
    playerName: playerScores["player_name"],
    totalScore: playerScores["SUM(player_match_score.score)"],
    totalFours: playerScores["SUM(player_match_score.fours)"],
    totalSixes: playerScores["SUM(player_match_score.sixes)"],
  });
});

module.exports = app;

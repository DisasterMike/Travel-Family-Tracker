import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "OnePaulrus2Many",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let users = [];
let errorMessage = null;

async function getUsers() {
  const getUsers = await db.query("SELECT * FROM users");
  users = getUsers.rows;
}
await getUsers();
// let currentUser = users[0];
let currentUser = {};

async function checkVisisted() {
  // const result = await db.query("SELECT country_code FROM visited_countries");
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUser.id]);

  // create an array of just country code strings instead of javaScript objects
  const countries = result.rows.map((country) => country.country_code);
  return countries;
}

app.get("/", async (req, res) => {
  await getUsers();
  if(Object.keys(currentUser).length === 0) currentUser = users[0];
  const countries = await checkVisisted();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
    error: errorMessage
  });
  // reset the error message so it doesn't show up after rendering
  errorMessage = null;
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    // check if the searched country is already in the database for the current user
    const currentSearch = await db.query("SELECT * FROM visited_countries WHERE country_code = $1 AND user_id = $2;", [countryCode, currentUser.id])
    console.log(`searched rows: ${currentSearch.rows}`);
    if(currentSearch.rows.length > 0){
      errorMessage = "That country has already been added."
      res.redirect("/");
      console.log("Already in the database");
      return;
    }
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUser.id]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      // TODO: render the page with errors
      errorMessage = "Error, couldn't insert into the database."
      res.redirect("/");
    }
  } catch (err) {
    console.log(err);
    // TODO: render the page with errors
    errorMessage = "Sorry, that country doesn't exist."
      res.redirect("/");
  }
});

app.post("/user", async (req, res) => {
  if(req.body.user){
    const userQuery = await db.query("SELECT * FROM users WHERE id = $1;", [req.body.user]);
    currentUser = userQuery.rows[0];

    res.redirect("/");
  }else{
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  try{
    const createNewUser = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *", [req.body.name, req.body.color]);

    currentUser = createNewUser.rows[0];

    res.redirect("/");
  }catch (err){
    console.log(err);
    errorMessage = "That user has already been added."
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

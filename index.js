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

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

const getUsers = await db.query("SELECT * FROM users");
users = getUsers.rows;
let currentUser = users[0];
console.log(currentUser);

async function checkVisisted() {
  // const result = await db.query("SELECT country_code FROM visited_countries");
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUser.id]);
  console.log(`found country rows: ${result.rows}`);
  // create an array of just country code strings instead of javaScript objects
  const countries = result.rows.map((country) => country.country_code);
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
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
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code) VALUES ($1)",
        [countryCode]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  const userQuery = await db.query("SELECT * FROM users WHERE id = $1;", [req.body.user]);
  currentUser = userQuery.rows[0];
  console.log(currentUser);
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUser.id]);
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

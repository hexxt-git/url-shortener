import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

if (
  !db
    .query('SELECT name FROM sqlite_master WHERE type="table" AND name="urls"')
    .get("urls")
) {
  db.run("CREATE TABLE urls (origin TEXT, short TEXT)");
  console.log("table created");
  db.run("INSERT INTO urls VALUES (?, ?)", ["https://www.youtube.com", "yt"]);
} else {
  console.log("table found");
}

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello world");
});

import zod from "zod";

const signupSchema = zod.object({
  origin: zod.string().url(),
  short: zod.string().optional(),
});

app.post("/signup", (req, res) => {
  const body = signupSchema.safeParse(req.body);

  if (body.error) {
    res.status(400).send({ error: body.error });
    return;
  }

  let shortCode: string | null = null;
  if (body.data.short) {
    shortCode = body.data.short;
  } else {
    // creating a salted hash
    shortCode = Bun.hash(body.data.origin + Math.random().toString())
      .toString(36)
      .slice(0, 6);
  }
  const existing_entry = db
    .query(`SELECT * FROM urls WHERE short=?`)
    .get(shortCode);
  if (existing_entry != null)
    res.status(400).send({ error: "url already taken" });

  db.run("INSERT INTO urls VALUES (?, ?)", [body.data.origin, shortCode]);
  res.send({
    shortCode,
    shortUrl: `${baseUrl}/${shortCode}`,
    originUrl: body.data.origin,
  });
});

app.get("/*", (req, res) => {
  const shortCode = req.url.slice(1);
  console.log(shortCode);
  const query = db
    .query(`SELECT origin FROM urls WHERE short=?`)
    .get(shortCode) as { origin: string } | null;
  if (!query) {
    res.status(404).send();
    return;
  }

  res.redirect(query.origin);
});

const baseUrl = "http://localhost:8000";
app.listen(8000, () => {
  console.log(`up on ${baseUrl}`);
});

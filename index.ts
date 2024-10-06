import { createClient } from "redis";

const db = await createClient()
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

console.log("db connected");

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.sendFile(__dirname + "/index.html");
});

import { readFileSync } from "fs";
import zod from "zod";

const signupSchema = zod.object({
  origin: zod.string().url(),
  short: zod.string().optional(),
});

app.post("/signup", async (req, res) => {
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
  const existing_entry = await db.get(shortCode);
  if (existing_entry != null)
    res.status(400).send({ error: "url already taken" });

  await db.set(shortCode, body.data.origin);
  let html = readFileSync(__dirname + "/signup.html", "utf8");
  html = html.replaceAll("{original}", body.data.origin);
  html = html.replaceAll("{shortened}", `${baseUrl}/${shortCode}`);

  res.send(html);
});

app.get("/*", async (req, res) => {
  const shortCode = req.url.slice(1);
  console.log(shortCode);
  const query = await db.get(shortCode);
  if (!query) {
    res.status(404).send();
    return;
  }

  res.redirect(query);
});

const baseUrl = "http://localhost:8000";
app.listen(8000, () => {
  console.log(`up on ${baseUrl}`);
});

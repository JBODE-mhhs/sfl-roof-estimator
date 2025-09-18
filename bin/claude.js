#!/usr/bin/env node
"use strict";

// Minimal Claude CLI for Windows/Node using Anthropic SDK
// Usage:
//   claude "Your prompt here"
//   echo "Your prompt" | claude
//   claude -m claude-3-5-sonnet-latest "Prompt"

const path = require("path");
const fs = require("fs");

// Load .env if present in current working directory
try {
  require("dotenv").config();
} catch (_) {}

let Anthropic;
try {
  Anthropic = require("@anthropic-ai/sdk");
} catch (err) {
  console.error(
    "@anthropic-ai/sdk is not installed. Install it with: npm i @anthropic-ai/sdk"
  );
  process.exit(1);
}

const DEFAULT_MODEL = "claude-3-5-sonnet-latest";

function printHelp() {
  console.log(
    [
      "Claude CLI",
      "",
      "Usage:",
      "  claude \"Your prompt here\"",
      "  echo \"Your prompt\" | claude",
      "",
      "Options:",
      "  -m, --model <name>   Model name (default: claude-3-5-sonnet-latest)",
      "  -h, --help           Show help",
      ""
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { model: DEFAULT_MODEL, prompt: null };
  const list = argv.slice(2);
  for (let i = 0; i < list.length; i++) {
    const token = list[i];
    if (token === "-h" || token === "--help") {
      args.help = true;
    } else if (token === "-m" || token === "--model") {
      i++;
      args.model = list[i];
    } else if (!args.prompt) {
      args.prompt = token;
    } else {
      // join remaining tokens into prompt
      args.prompt += " " + token;
    }
  }
  return args;
}

async function readStdin() {
  const stat = await new Promise((resolve) => fs.fstat(0, (err, s) => resolve(err ? null : s)));
  if (!stat || stat.isTTY()) return null; // no piped stdin
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

function extractText(message) {
  if (!message || !Array.isArray(message.content)) return "";
  return message.content
    .filter((c) => c && c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return printHelp();

  const stdinPrompt = await readStdin();
  const prompt = args.prompt || stdinPrompt;
  if (!prompt) {
    printHelp();
    process.exit(2);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing ANTHROPIC_API_KEY. Set it in your environment or .env file."
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: args.model || DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const text = extractText(resp);
    process.stdout.write(text + "\n");
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("Error:", message);
    if (err && err.response && err.response.data) {
      try { console.error(JSON.stringify(err.response.data, null, 2)); } catch (_) {}
    }
    process.exit(1);
  }
}

main();



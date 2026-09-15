import { writeFile } from "node:fs/promises";
const url=process.argv[2]; if(!url){console.error("Usage: npm run import:sheets -- <published Google Sheets CSV URL>");process.exit(1)}
const response=await fetch(url); if(!response.ok) throw new Error(`CSV import failed: ${response.status}`); const csv=await response.text(); if(!csv.startsWith("source,target")) throw new Error("Expected source,target CSV headers"); await writeFile("src/data/prerequisites.csv",csv); console.log("Updated src/data/prerequisites.csv");

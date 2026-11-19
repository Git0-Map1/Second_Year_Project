
require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const db = mongoose.connection.db;

    // Collection that tracks completed migrations
    const migrationCollection =
      db.collection("migrations");

    // Get all migration files
    const migrationsDir = path.join(
      __dirname,
      "../migrations"
    );

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith(".js"))
      .sort();

    for (const file of files) {
      // Check if migration already ran
      const alreadyExecuted =
        await migrationCollection.findOne({
          name: file
        });

      if (alreadyExecuted) {
        console.log(`Skipping ${file}`);
        continue;
      }

      console.log(`Running ${file}...`);

      const migration = require(
        path.join(migrationsDir, file)
      );

      // Execute migration
      await migration.up(db);

      // Save migration history only after success
      await migrationCollection.insertOne({
        name: file,
        executedAt: new Date()
      });

      console.log(`Completed ${file}`);
    }

    console.log("All migrations completed!");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
}

runMigrations();

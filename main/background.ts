import { ipcMain, app } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { Database } from "sqlite3";
import { DateTime } from "luxon";
import { ChartPointString, SQLiteRow } from "../renderer/types";

const isProd: boolean = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow("main", {
    width: 1200,
    height: 1000,
    webPreferences: {},
  });

  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on("window-all-closed", () => {
  app.quit();
});

// Listener for DropZone's process-file requests.
ipcMain.handle("process-file", async (event, { buffer, name }) => {
  // Create paths.
  const tempDir = path.join(app.getPath("temp"), "cla-val-smart-plotter");
  const fbPath = path.join(tempDir, name);
  const baseFileName = path.basename(name, path.extname(name));
  const sqlitePath = path.join(tempDir, `${baseFileName}.sqlite`);

  // If the temp folder doesn't exist, create it.
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Write the fb file to the fbPath.
  fs.writeFileSync(fbPath, Buffer.from(buffer));

  // Run the finalizer, get the return code.
  const convertProcess = spawn("./resources/uSQLiteFinalize.exe", [fbPath]);
  const code = await new Promise<number>((resolve) => {
    convertProcess.on("close", (code) => {
      resolve(code);
    });
  });

  // If code is not 0 then something went wrong.
  if (code !== 0) {
    // Delete the fb file and throw error.
    fs.unlinkSync(fbPath);
    throw new Error("File conversion failed.");
  }

  // Delete the fb file, no longer needed.
  fs.unlinkSync(fbPath);

  // Open the sqlite database.
  const db = new Database(sqlitePath, (err) => {
    if (err) console.log("Couldn't open SQLite file.");
  });

  // Set up variables for reading data from database.
  let points: ChartPointString[] = [];
  let dataCounter = 0;
  let idCounter = 0;

  // Create a promise for array of RawChartPoints.
  return new Promise<ChartPointString[]>((resolve, reject) => {
    // For each row returned by the query,
    db.each(
      "SELECT DateTimeEpochMS, AI1Eng, AI2Eng FROM logdata",
      function (_error, row: SQLiteRow) {
        // Filter out 9 of 10 datapoints (1 sample per 10 ms)
        if (dataCounter % 10 === 0) {
          // Get the timestamp.
          const utcTime = DateTime.fromMillis(row?.DateTimeEpochMS, {
            zone: "utc",
          });

          // Get the user's timezone.
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          // Convert utcTime to userTime.
          const userTime = utcTime.setZone(userTimezone);

          // Add the data to points.
          points.push({
            id: idCounter,
            timestamp: userTime.toString(),
            prsDeadman: row?.AI1Eng,
            prsFeedback: row?.AI2Eng,
          });

          // Increment the id.
          idCounter = idCounter + 1;
        }

        // Increment the data counter.
        dataCounter = dataCounter + 1;
      },
      function () {
        // Close the database.
        db.close((err) => {
          if (err) {
            console.log("Couldn't close sqlite db: ", err);
            reject(err);
          } else {
            // Delete the sqlite file, no longer needed.
            fs.unlinkSync(sqlitePath);

            // Fulfill the promised points.
            resolve(points);
          }
        });
      }
    );
  });
});

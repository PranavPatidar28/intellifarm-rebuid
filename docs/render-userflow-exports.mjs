import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const exportDir = resolve(__dirname, "exports");

mkdirSync(exportDir, { recursive: true });

const jobs = [
  {
    input: resolve(__dirname, "userflow-pitch-slide.mmd"),
    outputs: [
      resolve(exportDir, "userflow-pitch-slide.svg"),
      resolve(exportDir, "userflow-pitch-slide.png"),
    ],
    width: "1600",
    height: "900",
  },
  {
    input: resolve(__dirname, "userflow-swimlane.mmd"),
    outputs: [
      resolve(exportDir, "userflow-swimlane.svg"),
      resolve(exportDir, "userflow-swimlane.png"),
    ],
    width: "2000",
    height: "1200",
  },
];

for (const job of jobs) {
  for (const output of job.outputs) {
    const result = spawnSync(
      "npx",
      [
        "-y",
        "@mermaid-js/mermaid-cli@11.12.0",
        "-i",
        job.input,
        "-o",
        output,
        "-w",
        job.width,
        "-H",
        job.height,
        "-b",
        "#f7fbf4",
        "-s",
        "2",
      ],
      {
        stdio: "inherit",
        shell: true,
        cwd: resolve(__dirname, ".."),
      },
    );

    if (result.status !== 0) {
      throw new Error(`Failed rendering ${output}`);
    }
  }
}

console.log(`Rendered exports to ${join("docs", "exports")}`);

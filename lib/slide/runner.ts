import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";

/**
 * `slide/slide_generator.py` を subprocess で起動し、spec JSON を stdin に
 * 流し込んで .pptx を生成する薄いヘルパ。
 *
 * 実行環境:
 *   - uv が PATH に入っていること (Homebrew 経由 `brew install uv` 等)
 *   - slide/.venv が `uv sync` 済みであること
 *
 * Vercel 本番では Python を呼べないため、このモジュールは現状
 * **ローカル CLI (`scripts/generate-nonname.ts`) 専用**。API ルート化は
 * Python ランタイムの戦略決定後に別途行う。
 */

export interface RunSlideGeneratorOptions {
  /** 出力先 .pptx の絶対パス */
  outPath: string;
  /** uv 実行ディレクトリ (既定: <repo>/slide) */
  slideDir?: string;
}

const DEFAULT_SLIDE_DIR = path.resolve(process.cwd(), "slide");

export async function runSlideGenerator(
  spec: unknown,
  options: RunSlideGeneratorOptions,
): Promise<void> {
  const slideDir = options.slideDir ?? DEFAULT_SLIDE_DIR;
  const outPath = path.resolve(options.outPath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "uv",
      [
        "--directory",
        slideDir,
        "run",
        "python",
        "slide_generator.py",
        "-",
        "--out",
        outPath,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`slide_generator.py exited with code ${code ?? "null"}`),
        );
    });

    child.stdin.write(JSON.stringify(spec));
    child.stdin.end();
  });
}

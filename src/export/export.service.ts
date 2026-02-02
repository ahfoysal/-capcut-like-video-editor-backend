import { Injectable, Logger } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import * as ffmpeg from "fluent-ffmpeg";

const TEMP_DIR = path.join(process.cwd(), "temp");

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async convertWebmToMp4(webmBuffer: Buffer): Promise<Buffer> {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const inputPath = path.join(TEMP_DIR, `export-${Date.now()}.webm`);
    const outputPath = path.join(TEMP_DIR, `export-${Date.now()}.mp4`);

    try {
      fs.writeFileSync(inputPath, webmBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-c:v libx264",
            "-preset superfast",
            "-crf 23",
            "-movflags +faststart",
            "-pix_fmt yuv420p",
            "-c:a aac",
            "-b:a 128k",
            "-ar 44100",
            "-ac 2",
            "-map 0:v:0",
            "-map 0:a?0",
            "-shortest",
          ])
          .output(outputPath)
          .on("start", (cmd) => this.logger.log(`Running FFmpeg: ${cmd}`))
          .on("end", () => resolve())
          .on("error", (err) => {
            this.logger.error(`FFmpeg Error: ${err.message}`);
            reject(err);
          })
          .run();
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error("FFmpeg did not produce output file");
      }

      const mp4Buffer = fs.readFileSync(outputPath);
      return mp4Buffer;
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {
        this.logger.warn(
          `Cleanup failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}

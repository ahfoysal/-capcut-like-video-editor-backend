import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function transcodeToWebVideo(inputPath: string): Promise<{ outputPath: string; mimeType: string }> {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.web.mp4`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
        '-c:a aac',
        '-b:a 128k',
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath, mimeType: 'video/mp4' }))
      .on('error', (err) => reject(err))
      .run();
  });
}

function transcodeToWebAudio(inputPath: string): Promise<{ outputPath: string; mimeType: string }> {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.web.m4a`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .outputOptions([
        '-c:a aac',
        '-b:a 128k',
        '-ar 44100',
        '-ac 2',
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath, mimeType: 'audio/mp4' }))
      .on('error', (err) => reject(err))
      .run();
  });
}

function transcodeToWebAudioMp3(inputPath: string): Promise<{ outputPath: string; mimeType: string }> {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.web.mp3`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .outputOptions([
        '-c:a libmp3lame',
        '-b:a 128k',
        '-ar 44100',
        '-ac 2',
      ])
      .output(outputPath)
      .on('end', () => resolve({ outputPath, mimeType: 'audio/mpeg' }))
      .on('error', (err) => reject(err))
      .run();
  });
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private prisma: PrismaService) {}

  async create(file: Express.Multer.File) {
    const inputPath = path.join(UPLOADS_DIR, file.filename);
    let url = `/uploads/${file.filename}`;
    let mimeType = file.mimetype;
    let size = file.size;

    let type = 'image';
    if (file.mimetype.startsWith('video/')) {
      type = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      type = 'audio';
    }

    if (type === 'video' || type === 'audio') {
      try {
        let outputPath: string;
        let outMime: string;

        if (type === 'video') {
          const result = await transcodeToWebVideo(inputPath);
          outputPath = result.outputPath;
          outMime = result.mimeType;
        } else {
          try {
            const result = await transcodeToWebAudio(inputPath);
            outputPath = result.outputPath;
            outMime = result.mimeType;
          } catch (aacErr) {
            this.logger.warn(`AAC transcode failed, trying MP3: ${aacErr instanceof Error ? aacErr.message : String(aacErr)}`);
            const result = await transcodeToWebAudioMp3(inputPath);
            outputPath = result.outputPath;
            outMime = result.mimeType;
          }
        }

        if (!fs.existsSync(outputPath)) {
          throw new Error('Transcoded file was not created');
        }
        const stat = fs.statSync(outputPath);
        if (stat.size === 0) {
          throw new Error('Transcoded file is empty');
        }
        const outFilename = path.basename(outputPath);
        url = `/uploads/${outFilename}`;
        mimeType = outMime;
        size = stat.size;
        try {
          fs.unlinkSync(inputPath);
        } catch (_) {}
        this.logger.log(`${type} transcoded to web format: ${outFilename}`);
      } catch (err) {
        this.logger.warn(
          `Transcoding failed (original file kept). ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return this.prisma.asset.create({
      data: {
        url,
        type,
        name: file.originalname,
        size,
        mimeType,
      },
    });
  }

  findAll() {
    return this.prisma.asset.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  remove(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExportService } from './export.service';
import { Express } from 'express';
import { Response } from 'express';
import { memoryStorage } from 'multer';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['video/webm', 'video/x-matroska'];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.webm')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only WebM video files are allowed'), false);
        }
      },
    }),
  )
  async convertToMp4(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No video file provided');
    }

    const mp4Buffer = await this.exportService.convertWebmToMp4(file.buffer);
    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="export.mp4"',
      'Content-Length': mp4Buffer.length,
    });
    res.send(mp4Buffer);
  }
}

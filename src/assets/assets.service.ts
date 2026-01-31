import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  create(file: Express.Multer.File) {
    // Generate URL for the uploaded file
    const url = `/uploads/${file.filename}`;
    
    // Determine asset type based on mimetype
    let type = 'image';
    if (file.mimetype.startsWith('video/')) {
      type = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      type = 'audio';
    }

    return this.prisma.asset.create({
      data: {
        url,
        type,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
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

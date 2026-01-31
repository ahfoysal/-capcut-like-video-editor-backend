import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  create(createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: createProjectDto,
    });
  }

  findAll() {
    return this.prisma.project.findMany({
      include: { pages: true },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        pages: {
          include: { elements: true },
        },
      },
    });
  }

  update(id: string, updateProjectDto: any) {
    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  remove(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}

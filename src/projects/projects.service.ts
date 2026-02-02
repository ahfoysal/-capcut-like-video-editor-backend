import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: any) {
    const { pages, id, ...projectData } = createProjectDto;

    return this.prisma.project.create({
      data: {
        ...projectData,
        pages: {
          create: pages?.map((page: any, index: number) => ({
            id: page.id,
            name: page.name,
            backgroundColor: page.backgroundColor,
            layout: page.layout,
            gridMode: page.gridMode || false,
            gridLayout: page.gridLayout || null,
            duration: page.duration,
            order: index,
            elements: {
              create: page.elements?.map((el: any) => ({
                id: el.id,
                type: el.type,
                startTime: el.startTime,
                duration: el.duration,
                layer: el.layer || 0,
                properties: el.properties || {},
              })),
            },
          })),
        },
      },
      include: {
        pages: {
          include: { elements: true },
        },
      },
    });
  }

  findAll() {
    return this.prisma.project.findMany({
      include: {
        pages: {
          include: { elements: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        pages: {
          include: { elements: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async update(id: string, updateProjectDto: any) {
    const { pages, ...projectData } = updateProjectDto;

    return this.prisma.$transaction(async (tx) => {
      // Update basic project info
      const project = await tx.project.update({
        where: { id },
        data: projectData,
      });

      if (pages) {
        // Simple strategy: delete existing pages and elements and recreate them
        // In a production app, we would want to diff and update, but for this editor, replacement is cleaner.
        await tx.element.deleteMany({
          where: { page: { projectId: id } },
        });
        await tx.page.deleteMany({
          where: { projectId: id },
        });

        // Recreate pages and elements
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          await tx.page.create({
            data: {
              id: page.id,
              projectId: id,
              name: page.name,
              backgroundColor: page.backgroundColor,
              layout: page.layout,
              gridMode: page.gridMode || false,
              gridLayout: page.gridLayout || null,
              duration: page.duration,
              order: i,
              elements: {
                create: page.elements?.map((el: any) => ({
                  id: el.id,
                  type: el.type,
                  startTime: el.startTime,
                  duration: el.duration,
                  layer: el.layer || 0,
                  properties: el.properties || {},
                })),
              },
            },
          });
        }
      }

      return this.findOne(id);
    });
  }

  remove(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}

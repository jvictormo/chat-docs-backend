import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMeByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        documents: { select: { id: true, title: true, createdAt: true } },
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}

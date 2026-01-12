import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { SignupDto, LoginDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) { }

    async signup(dto: SignupDto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (exists) throw new ConflictException("Email already in use");

        const hash = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: { name: dto.name, email: dto.email.toLowerCase(), password: hash },
            select: { id: true, name: true, email: true, createdAt: true },
        });

        const token = await this.signToken(user.id, user.email);
        return { user, access_token: token };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (!user) throw new UnauthorizedException("Invalid credentials");

        const ok = await bcrypt.compare(dto.password, user.password);
        if (!ok) throw new UnauthorizedException("Invalid credentials");

        const token = await this.signToken(user.id, user.email.toLowerCase());
        return {
            user: { id: user.id, name: user.name, email: user.email },
            access_token: token,
        };
    }

    private async signToken(userId: string, email: string) {
        return this.jwt.signAsync(
            { sub: userId, email },
            {
                secret: this.config.get<string>('JWT_SECRET'),
                expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d') as any
            },
        );
    }
}
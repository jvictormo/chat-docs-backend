import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtGuard } from "../auth/jwt.guard";
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtGuard)
  @Get("me")
  me(@Req() req: any) {
    return this.users.getMeByEmail(req.user.email);
  }
}
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import { AuthenticatedUser, AuthResponse } from "./auth.types.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(body.email, body.password);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ): AuthenticatedUser {
    return request.user;
  }
}

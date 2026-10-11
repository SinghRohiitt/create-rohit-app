import { IsEmail, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @MinLength(12)
  @MaxLength(72)
  password!: string;
}

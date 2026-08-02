import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches, MaxLength } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ example: 'admin@homelab.local' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ format: 'password', minLength: 10 })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{10,128}$/)
  password!: string;
}

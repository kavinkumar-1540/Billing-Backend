import { ApiProperty } from '@nestjs/swagger';

export class CompanyMembershipDto {
  @ApiProperty() companyId!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() companySlug!: string;
  @ApiProperty() roleName!: string;
  @ApiProperty() roleKey!: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [CompanyMembershipDto] })
  companies!: CompanyMembershipDto[];
}

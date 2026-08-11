import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestCompanyContext } from '../auth.types';
import { RequestWithCompany } from '../guards/company-scope.guard';

export const CurrentCompany = createParamDecorator(
  (key: keyof RequestCompanyContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithCompany>();
    return key ? request.companyContext[key] : request.companyContext;
  },
);
